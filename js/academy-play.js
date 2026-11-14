/* Physical academy missions. Serializable state and deterministic rules, no DOM. */
(function (root) {
  'use strict';
  const WATER = ['collect', 'prefilter', 'purify', 'test', 'store'];
  const MATERIALS = {
    water: { mass: 4, shield: 4 },
    polymer: { mass: 3, shield: 4 },
    regolith: { mass: 5, shield: 6 },
    aluminium: { mass: 2, shield: 2 },
  };
  const names = {
    collect: ['Конденсат', 'Condensate'],
    prefilter: ['Грубый фильтр', 'Pre-filter'],
    purify: ['Очиститель', 'Purifier'],
    test: ['Анализатор', 'Quality test'],
    store: ['Чистый резервуар', 'Clean reservoir'],
    water: ['Водяные панели', 'Water panels'],
    polymer: ['Полимер', 'Polymer'],
    regolith: ['Лунный грунт', 'Regolith'],
    aluminium: ['Алюминий', 'Aluminium'],
    shelter: ['Сборка укрытия', 'Shelter assembly'],
    power: ['Питание антенны', 'Antenna power'],
    timing: ['Расчёт задержки', 'Timing console'],
    antenna: ['Передатчик', 'Transmitter'],
    receiver: ['Приёмник', 'Receiver'],
    kit: ['Набор пробоотбора', 'Sampling tools'],
    rover: ['Ровер', 'Rover'],
    sample: ['Ледяной образец', 'Ice sample'],
    base: ['Шлюз базы', 'Base airlock'],
  };
  const station = (id, x, y, kind = id) => ({
    id,
    x,
    y,
    kind,
    label: { ru: names[id]?.[0] || id, en: names[id]?.[1] || id },
  });
  function fresh(id, variant = {}) {
    let stations = [],
      player = { x: 140, y: 480, facing: 1, moving: false };
    if (id === 'hub') {
      player = { x: 500, y: 340, facing: 1, moving: false };
      stations = [
        station('water', 230, 210, 'door'),
        station('shield', 750, 210, 'door'),
        station('comms', 230, 430, 'door'),
        station('rover', 750, 430, 'door'),
      ];
      const titles = {
        water: ['Водная лаборатория', 'Water laboratory'],
        shield: ['Грузовой отсек', 'Cargo shelter'],
        comms: ['Центр связи', 'Communication lab'],
        rover: ['Полярная экспедиция', 'Polar expedition'],
      };
      for (const s of stations) s.label = { ru: titles[s.id][0], en: titles[s.id][1] };
    }
    if (id === 'water') {
      const slots = [
          [130, 190],
          [360, 170],
          [620, 180],
          [850, 300],
          [620, 480],
        ],
        kinds = {
          collect: 'tank',
          prefilter: 'filter',
          purify: 'purifier',
          test: 'analyser',
          store: 'reservoir',
        },
        order =
          Array.isArray(variant.waterOrder) && variant.waterOrder.length === 5
            ? variant.waterOrder
            : WATER;
      stations = order.map((key, i) => station(key, slots[i][0], slots[i][1], kinds[key]));
    }
    if (id === 'shield')
      stations = [
        station('water', 140, 190, 'material'),
        station('polymer', 370, 170, 'material'),
        station('regolith', 630, 170, 'material'),
        station('aluminium', 860, 190, 'material'),
        station('shelter', 500, 440, 'shelter'),
      ];
    if (id === 'comms')
      stations = [
        station('power', 160, 200, 'generator'),
        station('timing', 500, 180, 'console'),
        station('antenna', 820, 220, 'antenna'),
        station('receiver', 720, 470, 'receiver'),
      ];
    if (id === 'rover') {
      const sample = variant.sample || { x: 7, y: 1 };
      stations = [
        station('kit', 180, 420, 'tools'),
        station('rover', 330, 450, 'rover'),
        station('sample', 390 + sample.x * 60, 110 + sample.y * 65, 'sample'),
        station('base', 120, 480, 'hatch'),
      ];
    }
    if (!stations.length) throw new RangeError('Unknown academy world');
    const obstacles =
      id === 'rover'
        ? [
            { x: 440, y: 300, w: 95, h: 62 },
            { x: 630, y: 365, w: 90, h: 65 },
          ]
        : [];
    return {
      version: 2,
      id,
      level: id,
      player,
      stations,
      variant,
      completed: [],
      installed: [],
      carrying: null,
      status: 'welcome',
      success: false,
      failed: false,
      driving: false,
      sample: false,
      battery: 40,
      travelled: 0,
      replyRemaining: 0,
      effect: null,
      destination: null,
      path: [],
      obstacles,
      challenge: null,
      solvedChallenges: [],
    };
  }
  function canWalk(x, y) {
    return Number.isFinite(x) && Number.isFinite(y) && x >= 35 && x <= 965 && y >= 80 && y <= 555;
  }
  function canMove(s, x, y) {
    return (
      canWalk(x, y) &&
      !(s.obstacles || []).some(
        (o) => x > o.x - 12 && x < o.x + o.w + 12 && y > o.y - 12 && y < o.y + o.h + 12,
      )
    );
  }
  function findRoute(s, point) {
    if (!point || !canMove(s, point.x, point.y)) return [];
    if (!s.obstacles?.length) return [{ x: point.x, y: point.y }];
    const cell = 25,
      cols = 40,
      start = { x: Math.floor(s.player.x / cell), y: Math.floor(s.player.y / cell) },
      end = { x: Math.floor(point.x / cell), y: Math.floor(point.y / cell) },
      key = (x, y) => y * cols + x,
      first = key(start.x, start.y),
      last = key(end.x, end.y),
      queue = [first],
      came = new Map([[first, -1]]);
    for (let head = 0; head < queue.length; head++) {
      const n = queue[head];
      if (n === last) break;
      const x = n % cols,
        y = Math.floor(n / cols);
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ]) {
        const nx = x + dx,
          ny = y + dy,
          id = key(nx, ny),
          xx = nx * cell + cell / 2,
          yy = ny * cell + cell / 2;
        if (nx < 0 || nx >= 40 || ny < 0 || ny >= 24 || came.has(id) || !canMove(s, xx, yy))
          continue;
        if (
          dx &&
          dy &&
          (!canMove(s, x * cell + cell / 2, yy) || !canMove(s, xx, y * cell + cell / 2))
        )
          continue;
        came.set(id, n);
        queue.push(id);
      }
    }
    if (!came.has(last)) return [];
    const path = [];
    for (let n = last; n !== first; n = came.get(n))
      path.push({ x: (n % cols) * cell + cell / 2, y: Math.floor(n / cols) * cell + cell / 2 });
    path.reverse();
    path.push({ x: point.x, y: point.y });
    return path;
  }
  function nearest(s) {
    let found = null,
      distance = 76;
    for (const t of s.stations) {
      const d = Math.hypot(t.x - s.player.x, t.y - s.player.y);
      if (d < distance) {
        distance = d;
        found = t;
      }
    }
    return found;
  }
  function target(s) {
    if (s.id === 'hub') return null;
    let id;
    if (s.id === 'water') id = WATER[s.completed.length];
    if (s.id === 'shield')
      id = s.carrying ? 'shelter' : s.installed.length === 2 ? 'shelter' : null;
    if (s.id === 'comms')
      id = !s.completed.includes('power')
        ? 'power'
        : !s.completed.includes('timing')
          ? 'timing'
          : !s.completed.includes('antenna')
            ? 'antenna'
            : 'receiver';
    if (s.id === 'rover')
      id = !s.completed.includes('kit')
        ? 'kit'
        : !s.driving
          ? 'rover'
          : !s.sample
            ? 'sample'
            : 'base';
    return s.stations.find((t) => t.id === id) || null;
  }
  function shieldResult(s) {
    const mass = s.installed.reduce((v, id) => v + MATERIALS[id].mass, 0),
      shield = s.installed.reduce((v, id) => v + MATERIALS[id].shield, 0);
    return {
      mass,
      shield,
      ok:
        s.installed.length === 2 &&
        mass <= (s.variant.shield?.maxMass ?? 8) &&
        shield >= (s.variant.shield?.minProtection ?? 8),
    };
  }
  function navigate(s, point) {
    if (!point || !canMove(s, point.x, point.y)) return s;
    const path = findRoute(s, point);
    if (!path.length) return { ...s, status: 'route_blocked' };
    return { ...s, destination: { x: point.x, y: point.y }, path };
  }
  function move(s, dx, dy, dt) {
    dt = Math.max(0, Math.min(Number(dt) || 0, 0.05));
    let next = { ...s, player: { ...s.player, moving: false } };
    if (s.effect) {
      const age = s.effect.age + dt;
      next.effect = age < s.effect.duration ? { ...s.effect, age } : null;
    }
    if (s.replyRemaining > 0) next.replyRemaining = Math.max(0, s.replyRemaining - dt);
    if (s.success || s.failed) return next;
    if (dx || dy) {
      next.destination = null;
      next.path = [];
    } else if (s.destination) {
      const point = s.path?.[0] || s.destination;
      dx = point.x - s.player.x;
      dy = point.y - s.player.y;
      if (Math.hypot(dx, dy) < 5) {
        next.path = (s.path || []).slice(1);
        if (!next.path.length) next.destination = null;
        return next;
      }
    }
    const length = Math.hypot(dx, dy);
    if (!length) return next;
    const speed = s.driving ? 205 : 160,
      distance = Math.min(speed * dt, length < 2 ? speed * dt : length);
    let x = Math.max(35, Math.min(965, s.player.x + (dx / length) * distance)),
      y = Math.max(80, Math.min(555, s.player.y + (dy / length) * distance));
    if (!canMove(s, x, s.player.y)) x = s.player.x;
    if (!canMove(s, x, y)) y = s.player.y;
    next.player = {
      x,
      y,
      facing: Math.abs(dx) > 0.03 ? (dx > 0 ? 1 : 3) : s.player.facing,
      moving: Math.hypot(x - s.player.x, y - s.player.y) > 0.01,
    };
    if (!next.player.moving && (dx || dy)) next.status = 'rock_blocked';
    if (s.destination && Math.hypot(s.destination.x - x, s.destination.y - y) < 6) {
      next.destination = null;
      next.path = [];
    }
    if (s.id === 'rover' && s.driving) {
      const travelled = Math.hypot(x - s.player.x, y - s.player.y),
        shade = x > 600 && y < 290 ? 1.45 : 1;
      next.travelled += travelled;
      next.battery = Math.max(0, s.battery - (travelled / 52) * shade);
      if (next.battery === 0) {
        next.failed = true;
        next.status = 'rover_empty';
        next.destination = null;
        next.path = [];
      }
    }
    return next;
  }
  function interact(s) {
    if (s.success || s.failed) return { ok: false, scene: s, event: null };
    if (s.challenge)
      return { ok: true, scene: s, event: { type: 'challenge', id: s.challenge.id } };
    const near = nearest(s);
    if (!near) return { ok: false, scene: { ...s, status: 'move_near' }, event: null };
    const n = {
        ...s,
        completed: [...s.completed],
        installed: [...s.installed],
        destination: null,
        effect: { id: near.id, kind: 'interact', age: 0, duration: 1.2 },
      },
      id = near.id;
    if (s.id === 'hub') return { ok: true, scene: n, event: { type: 'launch', id } };
    if (s.id === 'water') {
      if (id !== WATER[s.completed.length]) {
        n.status = s.completed.includes(id) ? 'water_done' : 'water_order';
        return { ok: false, scene: n, event: { type: 'explain', id: WATER[s.completed.length] } };
      }
      if (id === 'purify' && !(s.solvedChallenges || []).includes('flow'))
        return openChallenge(n, 'flow');
      n.completed.push(id);
      n.carrying =
        id === 'store'
          ? null
          : ['water_dirty', 'water_filtered', 'water_pure', 'water_tested'][n.completed.length - 1];
      n.status = 'water_' + id;
      n.success = n.completed.length === 5;
    }
    if (s.id === 'shield') {
      if (id === 'shelter') {
        if (s.carrying) {
          if (s.installed.length === 2) {
            n.status = 'shield_full';
            return { ok: false, scene: n, event: null };
          }
          n.installed.push(s.carrying);
          n.carrying = null;
          n.status = 'shield_installed';
          if (n.installed.length === 2) {
            const r = shieldResult(n);
            n.status = r.ok
              ? 'shield_coverage'
              : r.mass > (s.variant.shield?.maxMass ?? 8)
                ? 'shield_heavy'
                : 'shield_weak';
            if (r.ok) return openChallenge(n, 'shield');
          }
        } else if (n.installed.length) {
          n.carrying = n.installed.pop();
          n.status = 'shield_removed';
        } else n.status = 'shield_pick';
      } else if (s.carrying === id) {
        n.carrying = null;
        n.status = 'shield_returned';
      } else if (s.carrying) {
        n.status = 'hands_full';
        return { ok: false, scene: n, event: null };
      } else if (s.installed.includes(id)) {
        n.status = 'shield_duplicate';
        return { ok: false, scene: n, event: null };
      } else {
        n.carrying = id;
        n.status = 'shield_carry';
      }
    }
    if (s.id === 'comms') {
      if (id === 'power') {
        if (!n.completed.includes(id)) n.completed.push(id);
        n.status = 'comms_power';
      }
      if (id === 'timing') {
        if (!n.completed.includes('power')) {
          n.status = 'comms_needpower';
          return { ok: false, scene: n, event: null };
        }
        n.status = 'comms_calculate';
        return { ok: true, scene: n, event: { type: 'timing' } };
      }
      if (id === 'antenna') {
        if (!n.completed.includes('timing')) {
          n.status = 'comms_needtiming';
          return { ok: false, scene: n, event: null };
        }
        if (!(s.solvedChallenges || []).includes('signal')) return openChallenge(n, 'signal');
        if (!n.completed.includes(id)) {
          n.completed.push(id);
          n.replyRemaining = s.variant.roundTrip || 2.6;
        }
        n.status = 'comms_sent';
      }
      if (id === 'receiver') {
        if (!n.completed.includes('antenna')) {
          n.status = 'comms_needsignal';
          return { ok: false, scene: n, event: null };
        }
        if (n.replyRemaining > 0) {
          n.status = 'comms_wait';
          return { ok: false, scene: n, event: null };
        }
        n.completed.push(id);
        n.status = 'comms_received';
        n.success = true;
      }
    }
    if (s.id === 'rover') {
      if (id === 'kit') {
        if (!n.completed.includes('kit')) {
          n.completed.push('kit');
          n.carrying = 'toolkit';
        }
        n.status = 'rover_tools';
      }
      if (id === 'rover') {
        if (!n.completed.includes('kit')) {
          n.status = 'rover_needkit';
          return { ok: false, scene: n, event: null };
        }
        n.driving = true;
        n.carrying = null;
        if (!n.completed.includes('rover')) n.completed.push('rover');
        n.status = 'rover_driving';
      }
      if (id === 'sample') {
        if (!n.driving) {
          n.status = 'rover_needvehicle';
          return { ok: false, scene: n, event: null };
        }
        if (!(s.solvedChallenges || []).includes('drill')) return openChallenge(n, 'drill');
        n.sample = true;
        n.carrying = 'ice';
        if (!n.completed.includes(id)) n.completed.push(id);
        n.status = 'rover_sample';
      }
      if (id === 'base') {
        if (!n.sample) {
          n.status = 'rover_needsample';
          return { ok: false, scene: n, event: null };
        }
        n.driving = false;
        n.carrying = null;
        n.success = true;
        n.completed.push(id);
        n.status = 'rover_returned';
      }
    }
    return { ok: true, scene: n, event: n.success ? { type: 'success' } : null };
  }
  function setTiming(s, value) {
    if (
      s.id !== 'comms' ||
      !s.completed.includes('power') ||
      !Number.isFinite(value) ||
      Math.abs(value - (s.variant.roundTrip || 2.6)) > 0.06
    )
      return { ok: false, scene: { ...s, status: 'comms_wrongtiming' } };
    const completed = s.completed.includes('timing')
      ? [...s.completed]
      : [...s.completed, 'timing'];
    return {
      ok: true,
      scene: {
        ...s,
        completed,
        status: 'comms_timed',
        seconds: value,
        effect: { id: 'timing', kind: 'success', age: 0, duration: 1.4 },
      },
    };
  }
  function challengeSpec(s, id) {
    const seed = (Number.isInteger(s.variant?.seed) ? s.variant.seed : 0x4c554e41) >>> 0;
    if (id === 'flow') {
      const a = 1 + (seed % 3),
        b = 2 + ((seed >>> 3) % 3);
      return { id, target: a * 2 + b * 3, maxUnits: a + b, rates: [2, 3], values: [0, 0] };
    }
    if (id === 'shield') {
      const solutions = [
          [0, 0, 4, 1],
          [5, 0, 4, 1],
          [10, 0, 4, 1],
          [0, 1, 7, 0],
        ],
        solution = solutions[seed % solutions.length],
        targets = [
          ...panelCells(solution[0], solution[1]),
          ...panelCells(solution[2], solution[3]),
        ];
      return { id, targets, values: [0, 0, 0, 0] };
    }
    if (id === 'signal')
      return { id, target: [4 + (seed % 9), ((seed >>> 4) % 12) * 30], values: [1, 270] };
    if (id === 'drill')
      return {
        id,
        iceDepth: 2 + (seed % 61) / 10,
        hardness: 2 + ((seed >>> 6) % 5),
        heatLimit: 60,
        values: [1, 80],
      };
    throw new RangeError('Unknown challenge');
  }
  function panelCells(anchor, rotation) {
    const x = anchor % 5,
      y = Math.floor(anchor / 5),
      cells = [];
    for (let i = 0; i < 3; i++) {
      const nx = x + (rotation ? 0 : i),
        ny = y + (rotation ? i : 0);
      if (nx >= 5 || ny >= 3) return [];
      cells.push(ny * 5 + nx);
    }
    return cells;
  }
  function openChallenge(s, id) {
    return {
      ok: true,
      scene: {
        ...s,
        challenge: challengeSpec(s, id),
        status: 'challenge_' + id,
        destination: null,
        path: [],
      },
      event: { type: 'challenge', id },
    };
  }
  const challengeLimits = {
    flow: [
      [0, 6],
      [0, 6],
    ],
    shield: [
      [0, 14],
      [0, 1],
      [0, 14],
      [0, 1],
    ],
    signal: [
      [0, 20],
      [0, 360],
    ],
    drill: [
      [0, 10],
      [0, 100],
    ],
  };

  function setChallenge(scene, values) {
    const challenge = scene.challenge;
    const limits = challengeLimits[challenge?.id];
    if (
      !challenge ||
      !limits ||
      !Array.isArray(values) ||
      values.length !== challenge.values.length ||
      !values.every(Number.isFinite)
    )
      return { ok: false, scene };

    const outsideLimits = values.some(
      (value, index) => value < limits[index][0] || value > limits[index][1],
    );
    const requiresIntegers = challenge.id === 'flow' || challenge.id === 'shield';
    if (outsideLimits || (requiresIntegers && values.some((value) => !Number.isInteger(value))))
      return { ok: false, scene };

    return {
      ok: true,
      scene: {
        ...scene,
        challenge: { ...challenge, values: [...values] },
        status: 'challenge_' + challenge.id,
      },
    };
  }
  function challengeState(scene) {
    const challenge = scene?.challenge;
    if (!challenge) return null;
    const [first, second, third, fourth] = challenge.values;
    if (challenge.id === 'flow') {
      const flow = first * 2 + second * 3;
      const units = first + second;
      return {
        ...challenge,
        flow,
        units,
        ok: flow === challenge.target && units <= challenge.maxUnits,
      };
    }
    if (challenge.id === 'shield') {
      const pieces = [panelCells(first, second), panelCells(third, fourth)];
      const coveredCells = pieces.flat();
      const ok =
        coveredCells.length === 6 &&
        new Set(coveredCells).size === 6 &&
        challenge.targets.every((cell) => coveredCells.includes(cell));
      return { ...challenge, pieces, ok };
    }
    if (challenge.id === 'signal') {
      const [frequency, phase] = challenge.values;
      const phaseError = Math.abs(((phase - challenge.target[1] + 540) % 360) - 180);
      const frequencyError = Math.abs(frequency - challenge.target[0]);
      const quality = Math.max(0, Math.round(100 - frequencyError * 12 - phaseError / 6));
      return { ...challenge, quality, ok: quality >= 97 };
    }
    const [depth, drillSpeed] = challenge.values;
    const signal = Math.round(100 * Math.exp(-Math.pow((depth - challenge.iceDepth) / 0.35, 2)));
    const heat = Math.round(drillSpeed * (1 + challenge.hardness / 10));
    return {
      ...challenge,
      signal,
      heat,
      ok: signal >= 94 && heat <= challenge.heatLimit && drillSpeed >= 15,
    };
  }
  function cancelChallenge(s) {
    return { ...s, challenge: null, status: 'challenge_paused' };
  }
  function submitChallenge(s) {
    const c = challengeState(s);
    if (!c) return { ok: false, scene: s, event: null };
    if (!c.ok)
      return {
        ok: false,
        scene: {
          ...s,
          status: 'challenge_error',
          challenge: { ...s.challenge, attempts: (s.challenge.attempts || 0) + 1 },
        },
        event: null,
      };
    const n = {
      ...s,
      challenge: null,
      solvedChallenges: [...new Set([...(s.solvedChallenges || []), c.id])],
      completed: [...s.completed],
      effect: { id: c.id, kind: 'challenge-success', age: 0, duration: 2.4 },
    };
    if (c.id === 'flow') {
      n.completed.push('purify');
      n.carrying = 'water_pure';
      n.status = 'water_purify';
    }
    if (c.id === 'shield') {
      n.success = true;
      n.status = 'shield_ready';
    }
    if (c.id === 'signal') {
      n.completed.push('antenna');
      n.replyRemaining = s.variant.roundTrip || 2.6;
      n.status = 'comms_sent';
    }
    if (c.id === 'drill') {
      n.sample = true;
      n.carrying = 'ice';
      n.completed.push('sample');
      n.status = 'rover_sample';
    }
    return {
      ok: true,
      scene: n,
      event: n.success ? { type: 'success' } : { type: 'challenge-success', id: c.id },
    };
  }
  const api = {
    fresh,
    canWalk,
    canMove,
    findRoute,
    nearest,
    target,
    shieldResult,
    navigate,
    move,
    interact,
    setTiming,
    challengeSpec,
    challengeState,
    setChallenge,
    submitChallenge,
    cancelChallenge,
    panelCells,
    materials: MATERIALS,
    waterSteps: WATER,
  };
  root.LunarAcademyPlay = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
