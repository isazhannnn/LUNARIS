/* Story simulation and mission rules. */
(function (root) {
  'use strict';
  const copy = (x) => JSON.parse(JSON.stringify(x));
  const clamp = (x, a = 0, b = 100) => Math.max(a, Math.min(b, x));
  // Optional engineering investigations. Values are fictional and explicitly game-only.
  const discoveries = [
    { id: 'airtrace', world: 'base', x: 578, y: 283, frequency: 31, reward: 'air', points: 9 },
    {
      id: 'irrigation',
      world: 'base',
      x: 1100,
      y: 225,
      frequency: 68,
      reward: 'water',
      points: 12,
    },
    {
      id: 'regolith',
      world: 'surface',
      x: 798,
      y: 347,
      frequency: 84,
      reward: 'shield',
      points: 10,
    },
  ];
  function stormPressure(s) {
    return clamp(Math.round((s.turn / s.limit) * 100));
  }
  // A deliberately scaled training timeline, not a space-weather forecast.
  // Only advance this clock while a player is actively outside. Each event has
  // a visible warning and increases suit consumption rather than inflicting an
  // unavoidable, instant loss. The ordinary mission decision budget is unchanged.
  const meteorZones = [
    { x: 420, y: 510, r: 86 },
    { x: 870, y: 410, r: 82 },
    { x: 735, y: 635, r: 72 },
  ];
  const radiationShelters = [
    { x: 180, y: 540, r: 95, kind: 'hatch' },
    { x: 300, y: 450, w: 145, h: 64, kind: 'rock' },
    { x: 435, y: 282, w: 165, h: 60, kind: 'rock' },
    { x: 715, y: 540, w: 150, h: 62, kind: 'rock' },
    { x: 630, y: 255, w: 140, h: 62, kind: 'rock' },
  ];
  function isSheltered(s) {
    if (s.world !== 'surface') return true;
    const p = s.player;
    return radiationShelters.some((a) =>
      a.r !== undefined
        ? Math.hypot(p.x - a.x, p.y - a.y) <= a.r
        : p.x >= a.x && p.x <= a.x + a.w && p.y >= a.y && p.y <= a.y + a.h,
    );
  }
  function hazardState(s) {
    const elapsed = Number.isFinite(s.evaTime) ? Math.max(0, s.evaTime) : 0;
    const cycle = Math.floor(elapsed / 96),
      clock = elapsed % 96,
      sheltered = isSheltered(s);
    const calm = {
      kind: 'calm',
      phase: 'calm',
      remaining: Math.ceil(clock < 20 ? 20 - clock : clock < 54 ? 54 - clock : 116 - clock),
      cycle,
      zone: null,
      multiplier: 1,
      sheltered,
      exposed: false,
    };
    if (s.world !== 'surface' || s.ended) return { ...calm, remaining: 0 };
    let kind,
      phase,
      until,
      zone = null;
    if (clock >= 20 && clock < 34) {
      kind = 'micrometeorites';
      phase = clock < 28 ? 'warning' : 'active';
      until = clock < 28 ? 28 : 34;
      zone = meteorZones[cycle % meteorZones.length];
    } else if (clock >= 54 && clock < 78) {
      kind = 'radiation';
      phase = clock < 64 ? 'warning' : 'active';
      until = clock < 64 ? 64 : 78;
    } else return calm;
    const exposed =
      kind === 'micrometeorites'
        ? Math.hypot(s.player.x - zone.x, s.player.y - zone.y) <= zone.r
        : !sheltered;
    return {
      kind,
      phase,
      remaining: Math.ceil(until - clock),
      cycle,
      zone: zone ? { ...zone } : null,
      multiplier: phase === 'active' && exposed ? (kind === 'radiation' ? 1.65 : 1.9) : 1,
      sheltered,
      exposed,
    };
  }
  function advanceEVA(s, dt) {
    if (s.world === 'surface' && !s.ended && Number.isFinite(dt) && dt > 0)
      s.evaTime = Math.min(
        10000000,
        (Number.isFinite(s.evaTime) ? Math.max(0, s.evaTime) : 0) + dt,
      );
    return hazardState(s);
  }
  function spectrum(value, frequency) {
    return Math.round(100 * Math.exp(-Math.pow((value - frequency) / 9, 2)));
  }
  function collect(state, id) {
    const d = discoveries.find((x) => x.id === id);
    if (
      !d ||
      state.ended ||
      state.world !== d.world ||
      (state.discoveries || []).includes(id) ||
      Math.hypot(state.player.x - d.x, state.player.y - d.y) > 105
    )
      return { ok: false, state };
    const s = copy(state);
    s.history.push(snapshot(state));
    s.discoveries ??= [];
    s.discoveries.push(id);
    if (d.reward !== 'shield') s[d.reward] = clamp(s[d.reward] + d.points);
    else {
      s.researchShield = true;
      if (s.shielding) s.shield = clamp(s.shield + 10);
    }
    s.trace.push({
      action: 'scan_' + id,
      turn: s.turn,
      energy: s.energy,
      air: s.air,
      water: s.water,
      crops: s.crops,
      shield: s.shield,
      signal: s.signal,
    });
    return { ok: true, state: s, discovery: d };
  }
  function score(s) {
    const success = ['lastSignal', 'seedKeepers', 'safeHarbor'].includes(s.ending);
    const res = (s.energy + s.air + s.water + s.crops) / 4;
    const points = Math.round(
      clamp(
        (success ? 45 : 8) +
          res * 0.28 +
          (s.discoveries || []).length * 8 +
          (s.signal >= 80 ? 5 : 0) -
          Math.max(0, s.turn - 11) * 1.5,
      ),
    );
    return {
      points,
      stars: success ? (points >= 80 ? 3 : points >= 60 ? 2 : 1) : 0,
      discoveries: (s.discoveries || []).length,
    };
  }

  let previousPuzzleSeed = 0;
  function newPuzzleSeed() {
    let seed = 0;
    try {
      const values = new Uint32Array(1);
      root.crypto.getRandomValues(values);
      seed = values[0];
    } catch {
      seed = Math.floor(Math.random() * 4294967295) + 1;
    }
    if (!seed || seed === previousPuzzleSeed) seed = (previousPuzzleSeed + 2654435761) >>> 0 || 1;
    previousPuzzleSeed = seed;
    return seed;
  }
  function fresh(mode = 'mission', puzzleSeed = newPuzzleSeed()) {
    return {
      version: 1,
      mode,
      chapter: 0,
      turn: 0,
      limit: mode === 'explore' ? 22 : 14,
      energy: 80,
      air: 72,
      water: 70,
      crops: 70,
      shield: 0,
      signal: 0,
      suit: 100,
      evaTime: 0,
      puzzleSeed,
      grid: false,
      life: false,
      garden: null,
      solar: false,
      comms: null,
      shielding: null,
      world: 'base',
      player: { x: 220, y: 595, facing: 1 },
      ended: false,
      ending: null,
      discoveries: [],
      researchShield: false,
      trace: [],
      history: [],
    };
  }
  function snapshot(s) {
    const r = copy(s);
    delete r.history;
    return r;
  }
  function allowed(s, a) {
    if (s.ended) return false;
    switch (a) {
      case 'power':
        return s.chapter === 0;
      case 'air':
        return s.chapter === 1;
      case 'grow':
      case 'seeds':
        return s.chapter === 2;
      case 'exit':
        return s.chapter >= 3 && s.world === 'base';
      case 'enter':
        return s.world === 'surface';
      case 'solar':
        return s.world === 'surface' && !s.solar;
      case 'antenna':
        return s.world === 'surface' && !s.comms;
      case 'beacon':
        return s.chapter === 3 && s.world === 'base';
      case 'waterShield':
        return s.chapter === 4 && !s.shielding && s.world === 'base' && s.water >= 22;
      case 'cargoShield':
        return s.chapter === 4 && !s.shielding && s.world === 'base';
      case 'seal':
        return s.chapter === 4 && !!s.shielding && s.world === 'base';
      case 'wait':
        return true;
      default:
        return false;
    }
  }
  function tick(s, sheltered = false) {
    s.turn++;
    const generation = !sheltered && s.solar ? 9 : 0;
    const load = sheltered ? 3 : 3 + (s.life ? 2 : 0) + (s.garden === 'grow' ? 3 : 0);
    s.energy = clamp(s.energy + generation - load);
    s.air = clamp(s.air + (sheltered ? -2 : s.life && s.energy > 0 ? 4 : -7));
    s.water = clamp(s.water - (s.life ? 1 : 0) - (!sheltered && s.garden === 'grow' ? 2 : 0));
    s.crops = clamp(
      s.crops + (sheltered ? -3 : s.garden === 'grow' && s.water > 0 && s.energy > 0 ? 1 : -2),
    );
  }
  function apply(state, action) {
    if (!allowed(state, action)) return { ok: false, state };
    const s = copy(state);
    s.history.push(snapshot(state));
    switch (action) {
      case 'power':
        s.grid = true;
        s.energy = clamp(s.energy + 10);
        s.chapter = 1;
        break;
      case 'air':
        s.life = true;
        s.energy -= 5;
        s.chapter = 2;
        break;
      case 'grow':
        s.garden = 'grow';
        s.energy -= 4;
        s.water -= 10;
        s.crops = clamp(s.crops + 18);
        s.chapter = 3;
        break;
      case 'seeds':
        s.garden = 'seeds';
        s.energy--;
        s.crops = clamp(s.crops - 35);
        s.chapter = 3;
        break;
      case 'exit':
        s.world = 'surface';
        s.suit = 100;
        s.player = { x: 180, y: 570, facing: 1 };
        break;
      case 'enter':
        s.world = 'base';
        s.player = { x: 965, y: 590, facing: 3 };
        break;
      case 'solar':
        s.solar = true;
        s.energy -= 6;
        break;
      case 'antenna':
        s.comms = 'earth';
        s.signal = 100;
        s.energy -= 8;
        s.chapter = 4;
        break;
      case 'beacon':
        s.comms = 'beacon';
        s.signal = 35;
        s.energy -= 2;
        s.chapter = 4;
        break;
      case 'waterShield':
        s.shielding = 'water';
        s.shield = 88 + (s.researchShield ? 10 : 0);
        s.water -= 18;
        break;
      case 'cargoShield':
        s.shielding = 'cargo';
        s.shield = 67 + (s.researchShield ? 10 : 0);
        s.crops = clamp(s.crops - 12);
        break;
    }
    const sheltered = action === 'seal';
    if (sheltered) for (let i = 0; i < 3; i++) tick(s, true);
    else tick(s);
    let fail =
      s.energy <= 0
        ? 'powerLost'
        : s.air <= 0
          ? 'airLost'
          : s.water <= 0
            ? 'waterLost'
            : !sheltered && s.turn >= s.limit
              ? s.world === 'surface'
                ? 'stormOutside'
                : 'stormUnprepared'
              : null;
    if (fail) {
      s.ended = true;
      s.ending = fail;
    } else if (sheltered) {
      s.ended = true;
      s.ending = s.signal >= 80 ? (s.crops >= 50 ? 'lastSignal' : 'seedKeepers') : 'safeHarbor';
    }
    s.trace.push({
      action,
      turn: s.turn,
      energy: s.energy,
      air: s.air,
      water: s.water,
      crops: s.crops,
      shield: s.shield,
      signal: s.signal,
    });
    return { ok: true, state: s, previousChapter: state.chapter };
  }
  function rewind(s) {
    if (!s.history.length) return null;
    const history = copy(s.history);
    return { ...history.pop(), history };
  }
  function drainSuit(s, dt, hazardMultiplier = 1) {
    if (s.world !== 'surface' || s.ended) return;
    s.suit = clamp(s.suit - dt * (s.mode === 'explore' ? 0.22 : 0.42) * hazardMultiplier);
    if (!s.suit) {
      s.ended = true;
      s.ending = 'suitLost';
    }
  }
  function rotate(mask) {
    return ((mask << 1) & 15) | (mask >> 3);
  }
  function connected(tiles) {
    if (tiles.length !== 12 || !(tiles[0] & 8)) return false;
    const q = [0],
      seen = new Set(q),
      dirs = [
        [0, -1, 1, 4],
        [1, 0, 2, 8],
        [0, 1, 4, 1],
        [-1, 0, 8, 2],
      ];
    for (let head = 0; head < q.length; head++) {
      const i = q[head],
        x = i % 4,
        y = Math.floor(i / 4);
      if (i === 3 && tiles[i] & 2) return true;
      for (const [dx, dy, bit, opp] of dirs) {
        const nx = x + dx,
          ny = y + dy,
          n = ny * 4 + nx;
        if (
          nx < 0 ||
          nx >= 4 ||
          ny < 0 ||
          ny >= 3 ||
          !(tiles[i] & bit) ||
          !(tiles[n] & opp) ||
          seen.has(n)
        )
          continue;
        seen.add(n);
        q.push(n);
      }
    }
    return false;
  }
  const solution = [10, 12, 5, 6, 6, 3, 10, 9, 9, 5, 3, 10];
  const puzzle = solution.map((v, i) => {
    for (let n = 0; n < (i % 3) + 1; n++) v = rotate(v);
    return v;
  });
  const validAir = (a, b, c, target = [2, 3, 1]) =>
    [a, b, c].every(Number.isInteger) &&
    [a, b, c].every((value, i) => value >= target[i]) &&
    a + b + c <= 6;
  const signal = (a, b, target = [62, 48]) =>
    Number.isFinite(a) && Number.isFinite(b)
      ? Math.round(clamp(100 - Math.abs(a - target[0]) * 1.8 - Math.abs(b - target[1]) * 2))
      : 0;
  // A seed belongs to a mission: reopening a puzzle or reloading a saved mission
  // keeps its answer, while a fresh mission gets a new equipment configuration.
  function missionPuzzle(s, kind) {
    const legacy =
      !Number.isInteger(s?.puzzleSeed) || s.puzzleSeed < 1 || s.puzzleSeed > 4294967295;
    if (legacy) {
      if (kind === 'circuit') return { tiles: [...puzzle], solution: [...solution] };
      if (kind === 'air')
        return { target: [2, 3, 1], budget: 6, unitPower: [2, 2, 2], requiredPower: [4, 6, 2] };
      if (kind === 'radio')
        return { target: [62, 48], initial: [20, 75], reference: [100, 90], offset: [38, 42] };
      throw new RangeError('Unknown mission puzzle: ' + kind);
    }
    let value =
      (s.puzzleSeed ^ ({ circuit: 0x19e3779b, air: 0xa341316c, radio: 0xc8013ea4 }[kind] || 0)) >>>
      0;
    const random = () => {
      value = (value + 0x6d2b79f5) >>> 0;
      let n = value;
      n = Math.imul(n ^ (n >>> 15), n | 1);
      n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
      return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
    };
    const integer = (min, max) => min + Math.floor(random() * (max - min + 1));
    if (kind === 'circuit') {
      const tiles = solution.map((mask) => {
        for (let n = integer(0, 3); n > 0; n--) mask = rotate(mask);
        return mask;
      });
      // The inlet always begins disconnected; every tile is still a rotation of
      // a tile in a known connected solution, so generation cannot trap a player.
      tiles[0] = 5;
      return { tiles, solution: [...solution] };
    }
    if (kind === 'air') {
      const targets = [
        [1, 1, 4],
        [1, 2, 3],
        [1, 3, 2],
        [1, 4, 1],
        [2, 1, 3],
        [2, 2, 2],
        [2, 3, 1],
        [3, 1, 2],
        [3, 2, 1],
        [4, 1, 1],
      ];
      const target = [...targets[integer(0, targets.length - 1)]],
        unitPower = target.map(() => integer(2, 5));
      return {
        target,
        budget: 6,
        unitPower,
        requiredPower: target.map((n, i) => n * unitPower[i]),
      };
    }
    if (kind === 'radio') {
      const target = [integer(35, 75), integer(25, 65)],
        reference = [integer(80, 99), integer(70, 89)];
      return {
        target,
        initial: [integer(10, 25), integer(80, 95)],
        reference,
        offset: reference.map((n, i) => n - target[i]),
      };
    }
    throw new RangeError('Unknown mission puzzle: ' + kind);
  }
  // Optional sabotage diagnostics teach arithmetic through equipment telemetry.
  // They never block the main route, spend a decision, or penalize a wrong try.
  function sabotageCase(s, id) {
    if (!s || s.ended) return null;
    const resolved = s.sabotageResolved || [];
    id ??= ['air', 'power'].find(
      (key) => !resolved.includes(key) && s.chapter >= (key === 'air' ? 2 : 4),
    );
    if (
      !['air', 'power'].includes(id) ||
      resolved.includes(id) ||
      s.chapter < (id === 'air' ? 2 : 4)
    )
      return null;
    const seed = (Number.isInteger(s.puzzleSeed) ? s.puzzleSeed : 73) >>> 0;
    const a = id === 'air' ? 18 + (seed % 13) : 6 + (seed % 10);
    const b = id === 'air' ? 3 + (Math.floor(seed / 13) % 7) : 2 + (Math.floor(seed / 10) % 4);
    const result = id === 'air' ? a - b : a * b;
    const options = id === 'air' ? [result, a + b, result - 1] : [result, a + b, result + b];
    const shift = (seed >>> 4) % 3;
    for (let n = 0; n < shift; n++) options.push(options.shift());
    return {
      id,
      chapter: id === 'air' ? 2 : 4,
      a,
      b,
      result,
      options,
      correctIndex: options.indexOf(result),
      reward: id === 'air' ? 'air' : 'energy',
      amount: 6,
      operation: id === 'air' ? 'subtract' : 'multiply',
    };
  }
  function resolveSabotage(state, id, answerIndex) {
    const diagnostic = sabotageCase(state, id);
    if (
      !diagnostic ||
      !Number.isInteger(answerIndex) ||
      answerIndex < 0 ||
      answerIndex >= diagnostic.options.length
    )
      return { ok: false, state, correct: false };
    if (answerIndex !== diagnostic.correctIndex) return { ok: true, state, correct: false };
    const s = copy(state);
    s.history.push(snapshot(state));
    s.sabotageResolved ??= [];
    s.sabotageResolved.push(id);
    s[diagnostic.reward] = clamp(s[diagnostic.reward] + diagnostic.amount);
    return { ok: true, state: s, correct: true, diagnostic };
  }
  function validSave(s, nested = false) {
    if (
      !s ||
      s.version !== 1 ||
      !['mission', 'explore'].includes(s.mode) ||
      !['base', 'surface'].includes(s.world)
    )
      return false;
    if (
      !Number.isInteger(s.chapter) ||
      s.chapter < 0 ||
      s.chapter > 4 ||
      !Number.isInteger(s.turn) ||
      s.turn < 0 ||
      s.turn > 100
    )
      return false;
    if (s.limit !== (s.mode === 'explore' ? 22 : 14)) return false;
    for (const k of ['energy', 'air', 'water', 'crops', 'shield', 'signal', 'suit'])
      if (!Number.isFinite(s[k]) || s[k] < 0 || s[k] > 100) return false;
    for (const k of ['grid', 'life', 'solar', 'ended']) if (typeof s[k] !== 'boolean') return false;
    if (
      !s.player ||
      !Number.isFinite(s.player.x) ||
      !Number.isFinite(s.player.y) ||
      s.player.x < 0 ||
      s.player.x > 1200 ||
      s.player.y < 0 ||
      s.player.y > 780
    )
      return false;
    if (!Array.isArray(s.trace) || s.trace.length > 100) return false;
    if (
      s.discoveries !== undefined &&
      (!Array.isArray(s.discoveries) ||
        s.discoveries.length > discoveries.length ||
        new Set(s.discoveries).size !== s.discoveries.length ||
        s.discoveries.some((id) => !discoveries.some((d) => d.id === id)))
    )
      return false;
    if (s.researchShield !== undefined && typeof s.researchShield !== 'boolean') return false;
    if (
      s.evaTime !== undefined &&
      (!Number.isFinite(s.evaTime) || s.evaTime < 0 || s.evaTime > 10000000)
    )
      return false;
    if (
      s.puzzleSeed !== undefined &&
      (!Number.isInteger(s.puzzleSeed) || s.puzzleSeed < 1 || s.puzzleSeed > 4294967295)
    )
      return false;
    if (
      s.sabotageResolved !== undefined &&
      (!Array.isArray(s.sabotageResolved) ||
        s.sabotageResolved.length > 2 ||
        new Set(s.sabotageResolved).size !== s.sabotageResolved.length ||
        s.sabotageResolved.some((id) => !['air', 'power'].includes(id)))
    )
      return false;
    if (
      !nested &&
      (!Array.isArray(s.history) ||
        s.history.length > 100 ||
        !s.history.every((x) => validSave(x, true)))
    )
      return false;
    return true;
  }
  const api = {
    fresh,
    allowed,
    apply,
    tick,
    rewind,
    drainSuit,
    rotate,
    connected,
    solution,
    puzzle,
    validAir,
    signal,
    validSave,
    copy,
    clamp,
    discoveries,
    stormPressure,
    spectrum,
    collect,
    score,
    advanceEVA,
    hazardState,
    isSheltered,
    meteorZones,
    radiationShelters,
    missionPuzzle,
    sabotageCase,
    resolveSabotage,
  };
  root.LunarSim = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
