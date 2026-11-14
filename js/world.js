(function (root) {
  'use strict';
  const rooms = [
    { id: 'power', x: 70, y: 100, w: 300, h: 240, color: '#edbd79' },
    { id: 'air', x: 450, y: 100, w: 300, h: 240, color: '#83dbe9' },
    { id: 'garden', x: 830, y: 100, w: 300, h: 240, color: '#b4de99' },
    { id: 'command', x: 70, y: 470, w: 300, h: 220, color: '#adbdf7' },
    { id: 'shelter', x: 450, y: 470, w: 300, h: 220, color: '#d0b6e9' },
    { id: 'airlock', x: 830, y: 470, w: 300, h: 220, color: '#edbd79' },
  ];
  const floors = rooms.map((r) => ({ x: r.x + 10, y: r.y + 14, w: r.w - 20, h: r.h - 24 }));
  floors.push({ x: 80, y: 370, w: 1040, h: 70 });
  for (const x of [190, 570, 950]) {
    floors.push({ x, y: 320, w: 60, h: 65 });
    floors.push({ x, y: 430, w: 60, h: 70 });
  }
  const machines = [
    { x: 110, y: 140, w: 75, h: 95, type: 'generator' },
    { x: 250, y: 140, w: 80, h: 48, type: 'console' },
    { x: 485, y: 140, w: 74, h: 95, type: 'tanks' },
    { x: 650, y: 140, w: 60, h: 48, type: 'console' },
    { x: 862, y: 145, w: 226, h: 53, type: 'plants' },
    { x: 862, y: 255, w: 226, h: 38, type: 'plants' },
    { x: 100, y: 510, w: 80, h: 45, type: 'console' },
    { x: 103, y: 603, w: 46, h: 50, type: 'box' },
    { x: 485, y: 505, w: 55, h: 135, type: 'shield' },
    { x: 661, y: 505, w: 55, h: 135, type: 'shield' },
    { x: 864, y: 500, w: 50, h: 65, type: 'suits' },
    { x: 1025, y: 500, w: 55, h: 65, type: 'suits' },
  ];
  const terminals = [
    { id: 'power', x: 286, y: 222 },
    { id: 'air', x: 680, y: 222 },
    { id: 'garden', x: 981, y: 234 },
    { id: 'command', x: 220, y: 573 },
    { id: 'shelter', x: 600, y: 570 },
    { id: 'airlock', x: 965, y: 582 },
  ];
  const surface = [
    { id: 'hatch', x: 180, y: 540 },
    { id: 'solar', x: 620, y: 490 },
    { id: 'antenna', x: 970, y: 300 },
  ];
  const rocks = [
    { x: 350, y: 385, w: 95, h: 72 },
    { x: 765, y: 475, w: 105, h: 74 },
    { x: 485, y: 220, w: 120, h: 75 },
    { x: 180, y: 220, w: 90, h: 60 },
    { x: 920, y: 585, w: 95, h: 60 },
    { x: 680, y: 190, w: 95, h: 75 },
    { x: 530, y: 360, w: 180, h: 82 },
    { x: 930, y: 160, w: 100, h: 80 },
  ];
  // EVA hazard patches: charged dust consumes suit endurance faster.
  const hazards = [
    { x: 420, y: 510, rx: 90, ry: 100 },
    { x: 870, y: 410, rx: 92, ry: 87 },
  ];
  function hazardAt(x, y) {
    return hazards.some((h) => Math.pow((x - h.x) / h.rx, 2) + Math.pow((y - h.y) / h.ry, 2) < 1);
  }
  const inside = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  function canStand(world, x, y, r = 9) {
    if (x < 35 || y < 120 || x > 1165 || y > 730) return false;
    const corners = [
      [x - r, y - r],
      [x + r, y - r],
      [x - r, y + r],
      [x + r, y + r],
    ];
    const objects = world === 'base' ? machines : rocks;
    return (
      (world !== 'base' || corners.every(([a, b]) => floors.some((f) => inside(f, a, b)))) &&
      !objects.some((o) => x + r > o.x && x - r < o.x + o.w && y + r > o.y && y - r < o.y + o.h)
    );
  }
  function nearest(s) {
    let best = 76,
      found = null;
    for (const o of s.world === 'base' ? terminals : surface) {
      let d = Math.hypot(o.x - s.player.x, o.y - s.player.y);
      if (d < best) {
        best = d;
        found = o;
      }
    }
    return found;
  }
  function target(s) {
    if (s.chapter < 3) return terminals[s.chapter];
    if (s.world === 'surface') return s.comms ? surface[0] : !s.solar ? surface[1] : surface[2];
    return s.chapter === 3 ? terminals[5] : terminals[4];
  }
  function guidance(s) {
    const objective = target(s),
      dx = objective.x - s.player.x,
      dy = objective.y - s.player.y;
    const angle = Math.atan2(dy, dx),
      directions = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
    return {
      id: objective.id,
      x: objective.x,
      y: objective.y,
      distance: Math.round(Math.hypot(dx, dy)),
      bearing: directions[(Math.round(angle / (Math.PI / 4)) + 8) % 8],
      angle,
      near: Math.hypot(dx, dy) < 76,
    };
  }
  function path(world, start, end) {
    const cols = 60,
      cell = 20,
      key = (x, y) => y * cols + x;
    const first = key(Math.floor(start.x / cell), Math.floor(start.y / cell)),
      last = key(Math.floor(end.x / cell), Math.floor(end.y / cell));
    const queue = [first],
      came = new Map([[first, -1]]);
    for (let head = 0; head < queue.length && queue.length < 2400; head++) {
      const id = queue[head];
      if (id === last) break;
      const x = id % cols,
        y = Math.floor(id / cols);
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx,
          ny = y + dy,
          n = key(nx, ny);
        if (
          nx < 0 ||
          ny < 0 ||
          nx >= cols ||
          ny >= 39 ||
          came.has(n) ||
          !canStand(world, nx * cell + 10, ny * cell + 10)
        )
          continue;
        came.set(n, id);
        queue.push(n);
      }
    }
    if (!came.has(last)) return [];
    const result = [];
    for (let n = last; n !== first; n = came.get(n))
      result.push({ x: (n % cols) * cell + 10, y: Math.floor(n / cols) * cell + 10 });
    return result.reverse();
  }
  const api = {
    rooms,
    floors,
    machines,
    terminals,
    surface,
    rocks,
    hazards,
    hazardAt,
    canStand,
    nearest,
    target,
    guidance,
    path,
    inside,
  };
  root.LunarWorld = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
