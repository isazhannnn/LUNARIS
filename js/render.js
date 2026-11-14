/* LUNARIS — original procedural Canvas artwork. No network assets required. */
(function (root) {
  'use strict';
  const W = root.LunarWorld,
    TAU = Math.PI * 2;
  const noise = (i) => {
    const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return v - Math.floor(v);
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const motion = () => !root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  function rect(c, x, y, w, h, fill, r = 0, stroke) {
    c.beginPath();
    if (r) c.roundRect(x, y, w, h, r);
    else c.rect(x, y, w, h);
    if (fill) {
      c.fillStyle = fill;
      c.fill();
    }
    if (stroke) {
      c.strokeStyle = stroke;
      c.stroke();
    }
  }
  function ellipse(c, x, y, rx, ry, fill, stroke) {
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, TAU);
    if (fill) {
      c.fillStyle = fill;
      c.fill();
    }
    if (stroke) {
      c.strokeStyle = stroke;
      c.stroke();
    }
  }
  function line(c, points, color, width = 1) {
    c.beginPath();
    points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.strokeStyle = color;
    c.lineWidth = width;
    c.stroke();
  }
  function label(c, text, x, y, size = 11, color = '#9baebe', align = 'center') {
    c.font = `600 ${size}px "Segoe UI",Arial,sans-serif`;
    c.textAlign = align;
    c.textBaseline = 'alphabetic';
    c.fillStyle = color;
    c.fillText(text, x, y);
  }
  function gradient(c, x, y, x2, y2, stops) {
    const g = c.createLinearGradient(x, y, x2, y2);
    stops.forEach(([p, color]) => g.addColorStop(p, color));
    return g;
  }
  function glow(c, x, y, r, color) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'transparent');
    rect(c, x - r, y - r, r * 2, r * 2, g);
  }
  function bolts(c, x, y, w, h) {
    for (const [a, b] of [
      [x + 7, y + 7],
      [x + w - 7, y + 7],
      [x + 7, y + h - 7],
      [x + w - 7, y + h - 7],
    ])
      ellipse(c, a, b, 1.5, 1.5, '#78909b');
  }
  function astronaut(c, x, y, time, moving = false, facing = 1, scale = 1) {
    const step = moving ? Math.sin(time * 12) : 0,
      bob = moving ? Math.abs(step) * 1.2 : Math.sin(time * 1.4) * 0.35,
      side = facing === 3 ? -1 : 1;
    c.save();
    c.translate(x, y);
    c.scale(scale, scale);
    c.lineJoin = 'round';
    c.lineCap = 'round';
    ellipse(c, 5, 10, 14, 5, '#00000038');
    c.translate(0, -bob);
    rect(c, -12, -21, 22, 23, '#677988', 5, '#c6d1d2');
    rect(c, -13, -16, 4, 14, '#ecb585', 2);
    rect(c, -8, 1, 7, 11 + step * 2, '#a7b9c4', 3);
    rect(c, 2, 1, 7, 11 - step * 2, '#e5e9e5', 3);
    rect(c, -9, 9 + step * 2, 9, 5, '#384b5c', 2);
    rect(c, 1, 9 - step * 2, 10, 5, '#384b5c', 2);
    line(
      c,
      [
        [-5, 4],
        [-5, 8 + step * 2],
      ],
      '#718994',
      2,
    );
    line(
      c,
      [
        [5, 4],
        [5, 8 - step * 2],
      ],
      '#718994',
      2,
    );
    rect(
      c,
      -9,
      -19,
      19,
      24,
      gradient(c, -9, -19, 10, 5, [
        [0, '#f6eee1'],
        [0.5, '#d6e1e3'],
        [1, '#91a8b7'],
      ]),
      6,
      '#e0e7e6',
    );
    rect(c, -9, -2, 19, 4, '#536c7b', 1);
    rect(c, -4, -13, 10, 9, '#294857', 2);
    rect(c, -1, -11, 4, 2, '#85f8d4', 1);
    ellipse(c, 4, -7, 1, 1, '#f5bd75');
    c.save();
    c.translate(-10, -15);
    c.rotate(step * 0.18);
    rect(c, -4, 0, 5, 17, '#a9bec7', 3);
    rect(c, -4, 12, 5, 5, '#536d7b', 2);
    c.restore();
    c.save();
    c.translate(10, -15);
    c.rotate(-step * 0.18);
    rect(c, 0, 0, 5, 17, '#e8e7dc', 3);
    rect(c, 0, 12, 5, 5, '#536d7b', 2);
    c.restore();
    ellipse(
      c,
      0,
      -25,
      12,
      12,
      gradient(c, -12, -35, 12, -15, [
        [0, '#fff9ec'],
        [0.6, '#d5e0de'],
        [1, '#859eaf'],
      ]),
      '#e9f0ee',
    );
    ellipse(
      c,
      side * 2,
      -26,
      9,
      7.5,
      gradient(c, -8, -33, 9, -18, [
        [0, '#dbb974'],
        [0.18, '#79643d'],
        [0.48, '#17394a'],
        [1, '#3e6570'],
      ]),
      '#b8a373',
    );
    c.save();
    c.beginPath();
    c.ellipse(side * 2, -26, 9, 7.5, 0, 0, TAU);
    c.clip();
    line(
      c,
      [
        [-8, -29],
        [2, -31],
        [8, -28],
      ],
      '#f7eed580',
      2.5,
    );
    line(
      c,
      [
        [-5, -22],
        [8, -24],
      ],
      '#7bced46b',
      1.5,
    );
    c.restore();
    ellipse(c, -11, -26, 2.3, 4, '#718c9b');
    ellipse(c, 11, -26, 2.3, 4, '#c4d2d2');
    rect(c, -6, -37, 12, 2, '#e8bc79', 1);
    line(
      c,
      [
        [9, -35],
        [11, -43],
      ],
      '#a6bdc6',
      1.3,
    );
    ellipse(c, 11, -44, 1.5, 1.5, '#8ef5d7');
    c.restore();
  }
  function robot(c, x, y, time) {
    c.save();
    c.translate(x, y + Math.sin(time * 2.2) * 3);
    ellipse(c, 0, 16, 10, 3, '#00000028');
    glow(c, 0, 5, 19, '#8cfbe323');
    line(
      c,
      [
        [-13, -6],
        [-17, -2],
        [-17, 4],
      ],
      '#b99d6b',
      2,
    );
    line(
      c,
      [
        [13, -6],
        [17, -2],
        [17, 4],
      ],
      '#b99d6b',
      2,
    );
    rect(
      c,
      -13,
      -13,
      26,
      20,
      gradient(c, 0, -13, 0, 7, [
        [0, '#f7d6a0'],
        [1, '#be9561'],
      ]),
      7,
      '#f9e1b4',
    );
    rect(c, -10, -9, 20, 10, '#162c3e', 4);
    ellipse(c, -4, -4, 2, 2, '#9dffe5');
    ellipse(c, 4, -4, 2, 2, '#9dffe5');
    rect(c, -4, 8, 8, 3, '#677d8c', 1);
    ellipse(c, 0, 12, 3, 1.6, '#9af6e4');
    line(
      c,
      [
        [0, -13],
        [0, -19],
      ],
      '#b8cbd0',
    );
    ellipse(c, 0, -20, 1.8, 1.8, '#b2ffed');
    c.restore();
  }
  function crate(c, x, y, w, h) {
    rect(c, x + 4, y + 6, w, h, '#00000035', 4);
    rect(
      c,
      x,
      y,
      w,
      h,
      gradient(c, x, y, x + w, y + h, [
        [0, '#657985'],
        [1, '#344957'],
      ]),
      4,
      '#82929b',
    );
    rect(c, x + 6, y + 6, w - 12, h - 12, '#344a57', 2, '#74848d');
    rect(c, x + w * 0.43, y + 2, w * 0.14, h - 4, '#b99b69', 1);
    bolts(c, x, y, w, h);
  }
  function consoleArt(c, x, y, w, h, active, time = 0) {
    rect(
      c,
      x,
      y,
      w,
      h,
      gradient(c, x, y, x, y + h, [
        [0, '#617a88'],
        [1, '#354f60'],
      ]),
      5,
      '#8ba5af',
    );
    rect(c, x + 4, y + 4, w - 8, h - 13, '#0a1a29', 3);
    rect(c, x + 8, y + 8, w * 0.48, h - 24, active ? '#143f45' : '#3f302a', 2);
    if (active)
      for (let i = 0; i < 5; i++) {
        const by = y + 12 + i * 4;
        line(
          c,
          [
            [x + 10, by],
            [x + 15, by],
            [x + 18, by - 2],
            [x + 21, by + 2],
            [x + 25, by],
            [x + w * 0.47, by],
          ],
          '#6cd4bc',
          0.8,
        );
      }
    for (let i = 0; i < 4; i++)
      rect(
        c,
        x + w * 0.67,
        y + 8 + i * 6,
        Math.max(5, w * 0.19),
        2,
        active ? ((Math.floor(time * 2) + i) % 5 === 0 ? '#e7c07a' : '#81d6c0') : '#b98a68',
        1,
      );
    rect(c, x + 8, y + h - 7, w - 16, 2, '#91a4af', 1);
  }
  function machines(c, s, time) {
    for (const o of W.machines) {
      const { x, y, w, h, type } = o;
      rect(c, x + 7, y + 7, w, h, '#00000038', 5);
      if (type === 'console') consoleArt(c, x, y, w, h, s.grid, time);
      if (type === 'generator') {
        rect(
          c,
          x,
          y,
          w,
          h,
          gradient(c, x, y, x + w, y + h, [
            [0, '#607382'],
            [1, '#243c4d'],
          ]),
          7,
          '#96a6ad',
        );
        rect(c, x + 8, y + 8, w - 16, h - 16, '#142b3b', 4);
        bolts(c, x, y, w, h);
        for (let i = 0; i < 4; i++) {
          const by = y + 13 + i * 18;
          rect(c, x + 13, by, w - 26, 11, '#284657', 3);
          rect(c, x + 17, by + 3, w - 34, 4, s.grid ? '#80edc8' : '#bd7f59', 2);
          if (s.grid)
            rect(c, x + 17 + ((time * 18 + i * 8) % (w - 37)), by + 3, 3, 4, '#e4fff1', 1);
        }
        label(c, 'PWR', x + w / 2, y + h - 3, 6, '#93a7b1');
        if (s.grid) glow(c, x + w / 2, y + h / 2, 65, '#83f5d41a');
      }
      if (type === 'tanks')
        for (let i = 0; i < 3; i++) {
          const tx = x + i * 25;
          rect(
            c,
            tx,
            y + 4,
            20,
            h - 6,
            gradient(c, tx, y, tx + 20, y, [
              [0, '#466a7b'],
              [0.3, '#a7cbd0'],
              [0.6, '#6e9cab'],
              [1, '#39586e'],
            ]),
            9,
            '#9ab5bf',
          );
          rect(c, tx - 1, y + 23, 22, 6, '#395265', 2);
          rect(c, tx - 1, y + h - 22, 22, 6, '#395265', 2);
          rect(c, tx + 4, y + 35, 12, 25, '#173948', 3);
          const level = s.life ? 19 : 7;
          rect(c, tx + 6, y + 58 - level, 8, level, s.life ? '#7be5d1' : '#ba906b', 2);
          if (s.life)
            ellipse(
              c,
              tx + 10 + Math.sin(time + i) * 2,
              y + 51 - ((time * 6 + i * 5) % 15),
              1,
              1,
              '#d0fff2',
            );
          ellipse(c, tx + 10, y + 9, 2, 2, s.life ? '#9ef3dc' : '#c98c68');
        }
      if (type === 'plants') {
        rect(c, x, y, w, h, '#3a5e61', 4, '#7fa09c');
        rect(c, x + 4, y + 4, w - 8, h - 8, '#102b30', 3);
        for (let i = 0; i < 9; i++) {
          const px = x + 12 + i * 24,
            py = y + h - 9;
          rect(c, px - 5, py - 7, 16, 8, '#66766b', 2);
          line(
            c,
            [
              [px + 3, py - 5],
              [px + 3, py - 20],
            ],
            '#8fbd80',
            2,
          );
          for (let j = 0; j < 3; j++) {
            const sway = Math.sin(time * 0.6 + i + j) * 0.6;
            ellipse(
              c,
              px + (j % 2 ? 7 : -1) + sway,
              py - 12 - j * 4,
              5,
              2.4,
              s.crops > 45 ? ['#81b995', '#a8d6a5', '#6aaf91'][j] : '#9c9f77',
            );
          }
        }
        rect(c, x + 3, y, w - 6, 2, '#ccb5e1', 1);
        glow(c, x + w / 2, y + 7, w * 0.5, '#c1b0e412');
      }
      if (type === 'box') crate(c, x, y, w, h);
      if (type === 'shield')
        for (let i = 0; i < 3; i++) {
          if (s.shielding === 'water') {
            rect(c, x, y + i * 42, w, 36, '#466474', 4, '#7ca7b6');
            rect(
              c,
              x + 5,
              y + i * 42 + 5,
              w - 10,
              25,
              gradient(c, x, y, x + w, y, [
                [0, '#5aa9b6'],
                [1, '#304f68'],
              ]),
              3,
            );
            line(
              c,
              [
                [x + 10, y + i * 42 + 9],
                [x + 10, y + i * 42 + 26],
              ],
              '#aad6d9',
              2,
            );
          } else crate(c, x, y + i * 42, w, 35);
        }
      if (type === 'suits') {
        rect(c, x, y, w, h, '#1b3444', 4, '#6b8996');
        line(
          c,
          [
            [x + 8, y + 7],
            [x + w - 8, y + 7],
          ],
          '#82c6c2',
          2,
        );
        // Empty suit storage, rather than extra people: this really is the last astronaut.
        rect(c, x + w / 2 - 10, y + 22, 20, 22, '#7b919d', 5);
        ellipse(c, x + w / 2, y + 17, 11, 9, '#9eafb4');
        ellipse(c, x + w / 2, y + 17, 7, 5, '#2d485c');
        rect(c, x + w / 2 - 9, y + 42, 6, 12, '#617c8d', 2);
        rect(c, x + w / 2 + 3, y + 42, 6, 12, '#617c8d', 2);
        label(c, 'EVA', x + w / 2, y + h - 3, 6, '#8ca4b0');
      }
    }
  }
  function marker(c, o, target, time) {
    c.save();
    const pulse = 0.5 + 0.5 * Math.sin(time * 2.5),
      color = target ? '#a2f7db' : '#668691';
    if (target) glow(c, o.x, o.y, 42, '#8dffda18');
    ellipse(c, o.x, o.y + 4, target ? 24 : 17, target ? 11 : 8, undefined, color);
    c.globalAlpha = target ? 0.35 : 0.18;
    ellipse(c, o.x, o.y + 4, 29 + pulse * 4, 14 + pulse * 2, undefined, color);
    c.globalAlpha = 1;
    line(
      c,
      [
        [o.x - 4, o.y + 4],
        [o.x + 4, o.y + 4],
      ],
      color,
    );
    line(
      c,
      [
        [o.x, o.y],
        [o.x, o.y + 8],
      ],
      color,
    );
    if (target) {
      const y = o.y - 42 + Math.sin(time * 2.5) * 2;
      c.fillStyle = '#a2f7db';
      c.beginPath();
      c.moveTo(o.x, y + 7);
      c.lineTo(o.x - 5, y);
      c.lineTo(o.x + 5, y);
      c.closePath();
      c.fill();
    }
    c.restore();
  }
  let basePlate = null,
    surfacePlate = null;
  function newCanvas(w, h) {
    const n = document.createElement('canvas');
    n.width = w;
    n.height = h;
    return n;
  }
  function starfield(c, w, h, time, count = 130) {
    for (let i = 0; i < count; i++) {
      const x = noise(i + 3) * w,
        y = noise(i + 230) * h,
        r = i % 19 === 0 ? 1.1 : 0.55;
      c.globalAlpha =
        0.2 + noise(i + 9) * 0.5 + (i % 6 === 0 ? Math.sin(time * 0.5 + i) * 0.12 : 0);
      ellipse(c, x, y, r, r, '#d9e5ed');
    }
    c.globalAlpha = 1;
  }
  function earth(c, x, y, r, time = 0) {
    glow(c, x, y, r * 1.3, '#6eaeed21');
    c.save();
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    c.clip();
    ellipse(
      c,
      x,
      y,
      r,
      r,
      gradient(c, x - r, y - r, x + r, y + r, [
        [0, '#70bfd1'],
        [0.3, '#337f9e'],
        [0.7, '#153e66'],
        [1, '#071c35'],
      ]),
    );
    c.fillStyle = '#80b9a4';
    for (let k = 0; k < 6; k++) {
      c.beginPath();
      const cx = x - r * 0.55 + noise(k + 72) * r * 1.1,
        cy = y - r * 0.7 + noise(k + 93) * r * 1.35;
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * TAU,
          rad = r * (0.09 + noise(k * 20 + i + 200) * 0.18),
          px = cx + Math.cos(a) * rad,
          py = cy + Math.sin(a) * rad;
        i ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.closePath();
      c.fill();
    }
    // Broken, curved cloud clusters leave blue ocean visible between weather systems.
    // Their irregular spacing avoids the parallel bands of a gas giant.
    c.save();
    c.lineCap = 'round';
    for (let i = 0; i < 15; i++) {
      const cx = x + (noise(i + 92) - 0.5) * r * 1.75,
        cy = y + (noise(i + 317) - 0.5) * r * 1.65;
      const length = r * (0.12 + noise(i + 611) * 0.29),
        curl = (noise(i + 104) - 0.5) * r * 0.23;
      c.beginPath();
      c.moveTo(cx - length * 0.5, cy + curl * 0.3);
      c.bezierCurveTo(
        cx - length * 0.15,
        cy - r * 0.035,
        cx + length * 0.1,
        cy + curl,
        cx + length * 0.5,
        cy + curl * 0.55,
      );
      c.strokeStyle = `rgba(234,242,235,${0.42 + noise(i + 218) * 0.29})`;
      c.lineWidth = r * (0.018 + noise(i + 515) * 0.025);
      c.stroke();
      if (i % 3 === 0) {
        c.beginPath();
        c.moveTo(cx - length * 0.2, cy + curl * 0.3 + r * 0.055);
        c.quadraticCurveTo(
          cx + length * 0.1,
          cy + curl + r * 0.065,
          cx + length * 0.3,
          cy + curl * 0.5 + r * 0.04,
        );
        c.strokeStyle = '#e7f3ef66';
        c.lineWidth = r * 0.014;
        c.stroke();
      }
    }
    // Two soft spirals suggest large ocean systems, with a small polar ice cap.
    c.strokeStyle = '#eef4e7a6';
    c.lineWidth = r * 0.025;
    for (const [sx, sy, rr] of [
      [x - r * 0.34, y + r * 0.18, r * 0.13],
      [x + r * 0.21, y - r * 0.31, r * 0.1],
    ]) {
      c.beginPath();
      c.ellipse(sx, sy, rr, rr * 0.6, -0.45, 0.25, Math.PI * 1.72);
      c.stroke();
    }
    ellipse(c, x - r * 0.15, y - r * 0.93, r * 0.36, r * 0.085, '#dfece3aa');
    c.restore();
    const shade = gradient(c, x - r, y, x + r, y, [
      [0, '#000b1b00'],
      [0.38, '#000a1b00'],
      [0.85, '#000916c0'],
      [1, '#000818f0'],
    ]);
    rect(c, x - r, y - r, r * 2, r * 2, shade);
    c.restore();
    ellipse(c, x, y, r, r, undefined, '#91c5d04d');
  }
  function buildBase() {
    const n = newCanvas(1200, 780),
      c = n.getContext('2d');
    rect(
      c,
      0,
      0,
      1200,
      780,
      gradient(c, 0, 0, 1200, 780, [
        [0, '#091522'],
        [1, '#122535'],
      ]),
    );
    starfield(c, 1200, 780, 0, 85);
    for (const x of [48, 1152]) {
      rect(c, x, 90, 5, 630, '#2a4050', 2);
      for (let y = 120; y < 700; y += 80) rect(c, x - 2, y, 9, 5, '#587080', 1);
    }
    rect(c, 65, 361, 1070, 89, '#060f1b', 12);
    rect(
      c,
      72,
      368,
      1056,
      75,
      gradient(c, 0, 368, 0, 443, [
        [0, '#3e5866'],
        [0.15, '#203746'],
        [0.85, '#1b3242'],
        [1, '#49616d'],
      ]),
      5,
    );
    for (let x = 82; x < 1120; x += 32) {
      line(
        c,
        [
          [x, 376],
          [x, 433],
        ],
        '#48637344',
      );
      rect(c, x + 3, 402, 23, 1, '#718b9622');
    }
    line(
      c,
      [
        [85, 375],
        [1115, 375],
      ],
      '#89c1bd54',
      2,
    );
    line(
      c,
      [
        [85, 436],
        [1115, 436],
      ],
      '#89c1bd54',
      2,
    );
    for (const r of W.rooms) {
      rect(c, r.x - 6, r.y + 4, r.w + 20, r.h + 20, '#00000040', 15);
      rect(c, r.x - 7, r.y - 8, r.w + 14, r.h + 16, '#06111e', 13, '#2e485b');
      rect(
        c,
        r.x,
        r.y,
        r.w,
        r.h,
        gradient(c, r.x, r.y, r.x + r.w, r.y + r.h, [
          [0, '#5b7381'],
          [0.04, '#243d4e'],
          [0.9, '#142c3d'],
          [1, '#496372'],
        ]),
        9,
        '#728996',
      );
      rect(c, r.x + 9, r.y + 14, r.w - 18, r.h - 27, '#142b3b', 4, '#536d7d');
      c.save();
      c.beginPath();
      c.roundRect(r.x + 10, r.y + 15, r.w - 20, r.h - 29, 4);
      c.clip();
      for (let y = r.y + 20; y < r.y + r.h; y += 26)
        for (let x = r.x + 12; x < r.x + r.w; x += 26) {
          rect(c, x, y, 25, 25, noise(x * 3 + y) > 0.6 ? '#213a48' : '#1b3342');
          line(
            c,
            [
              [x + 1, y + 1],
              [x + 24, y + 1],
            ],
            '#78919c12',
          );
        }
      c.restore();
      rect(c, r.x + 16, r.y + 7, r.w - 32, 3, r.color, 1);
      rect(c, r.x + 20, r.y + r.h - 10, r.w - 40, 2, '#6c879744', 1);
      for (let y = r.y + 33; y < r.y + r.h - 20; y += 36) {
        rect(c, r.x + 4, y, 4, 16, '#79909a', 1);
        rect(c, r.x + r.w - 8, y, 4, 16, '#79909a', 1);
      }
      for (const x of [r.x + 30, r.x + r.w - 53]) {
        rect(c, x, r.y + r.h - 29, 24, 9, '#0d2231', 2);
        for (let k = 0; k < 4; k++)
          line(
            c,
            [
              [x + 4 + k * 5, r.y + r.h - 27],
              [x + 4 + k * 5, r.y + r.h - 22],
            ],
            '#536d7b',
          );
      }
    }
    for (const x of [190, 570, 950])
      for (const y of [320, 430]) {
        rect(c, x - 5, y, 70, 65, '#617a86', 4);
        rect(c, x, y, 60, 65, '#294454', 2);
        for (let i = 0; i < 5; i++)
          line(
            c,
            [
              [x + 5, y + 8 + i * 12],
              [x + 55, y + 8 + i * 12],
            ],
            '#62808b55',
          );
        rect(c, x + 1, y + 2, 3, 60, '#88baaf66');
        rect(c, x + 56, y + 2, 3, 60, '#88baaf66');
      }
    for (const [x, y] of [
      [300, 620],
      [274, 620],
    ]) {
      rect(c, x, y, 18, 25, '#4e6979', 3, '#728e9b');
      rect(c, x + 3, y + 4, 12, 4, '#9ab3b7', 1);
    }
    rect(c, 190, 514, 49, 31, '#203c4c', 3, '#6c8192');
    rect(c, 194, 518, 41, 23, '#42526a', 1);
    ellipse(c, 211, 527, 8, 8, '#638d95');
    line(
      c,
      [
        [198, 536],
        [207, 527],
        [219, 532],
        [231, 523],
      ],
      '#a6b8b5',
      2,
    );
    return n;
  }
  function base(c, s, time, t) {
    if (!basePlate) basePlate = buildBase();
    c.drawImage(basePlate, 0, 0);
    for (const [i, r] of W.rooms.entries()) {
      const on = s.grid || r.id === 'command';
      glow(c, r.x + r.w / 2, r.y + 29, 105, on ? r.color + '13' : '#e6b27609');
      label(
        c,
        '0' + (i + 1) + '  /  ' + t('room_' + r.id).toUpperCase(),
        r.x + 16,
        r.y - 18,
        10,
        r.color,
        'left',
      );
      rect(c, r.x + 18, r.y + 19, 30, 4, on ? r.color : '#af8060', 1);
      rect(c, r.x + r.w - 43, r.y + 20, 25, 2, on ? '#a0d5d0' : '#6b6159', 1);
    }
    machines(c, s, time);
    for (const x of [190, 570, 950])
      for (const y of [320, 430]) {
        rect(c, x - 2, y + 23, 4, 20, s.grid ? '#8ee6cb' : '#bd9467', 1);
        rect(c, x + 58, y + 23, 4, 20, s.grid ? '#8ee6cb' : '#bd9467', 1);
      }
    for (const o of W.terminals) marker(c, o, o.id === W.target(s).id, time);
  }
  function crater(c, x, y, r, flatten = 0.45) {
    ellipse(c, x + 3, y + 5, r * 1.04, r * flatten, '#111b2847');
    ellipse(
      c,
      x,
      y,
      r,
      r * flatten,
      gradient(c, x, y - r * flatten, x, y + r * flatten, [
        [0, '#576576'],
        [0.3, '#243445'],
        [0.78, '#39495b'],
        [1, '#82909b'],
      ]),
    );
    ellipse(c, x + 2, y - 1, r * 0.82, r * flatten * 0.75, '#2d3c4e66');
    c.beginPath();
    c.ellipse(x, y, r, r * flatten, 0, 0.1, Math.PI * 0.94);
    c.strokeStyle = '#a4a8ac55';
    c.lineWidth = 1.4;
    c.stroke();
  }
  function buildSurface() {
    const n = newCanvas(1200, 780),
      c = n.getContext('2d');
    rect(
      c,
      0,
      0,
      1200,
      780,
      gradient(c, 0, 0, 800, 780, [
        [0, '#4f5c6c'],
        [0.45, '#3a485a'],
        [1, '#293b4e'],
      ]),
    );
    for (let i = 0; i < 50; i++)
      crater(
        c,
        noise(i + 27) * 1200,
        noise(i + 450) * 780,
        4 + noise(i + 40) * 35,
        0.36 + noise(i + 420) * 0.2,
      );
    for (let i = 0; i < 1300; i++)
      ellipse(
        c,
        noise(i + 16) * 1200,
        noise(i + 500) * 780,
        0.4 + noise(i + 100) * 1.8,
        0.3 + noise(i + 1),
        noise(i) > 0.5 ? '#c5c7bf25' : '#0d20322b',
      );
    for (const r of W.rocks) {
      c.fillStyle = '#12213370';
      c.beginPath();
      c.moveTo(r.x + 14, r.y + r.h - 4);
      c.lineTo(r.x + r.w - 4, r.y + r.h);
      c.lineTo(r.x + r.w + 42, r.y + r.h + 28);
      c.lineTo(r.x + 42, r.y + r.h + 23);
      c.closePath();
      c.fill();
      c.fillStyle = gradient(c, r.x, r.y, r.x + r.w, r.y + r.h, [
        [0, '#88939d'],
        [0.4, '#657384'],
        [1, '#344658'],
      ]);
      c.beginPath();
      c.moveTo(r.x + 5, r.y + r.h * 0.4);
      c.lineTo(r.x + r.w * 0.2, r.y + 4);
      c.lineTo(r.x + r.w * 0.68, r.y);
      c.lineTo(r.x + r.w - 3, r.y + r.h * 0.4);
      c.lineTo(r.x + r.w - 6, r.y + r.h - 3);
      c.lineTo(r.x + r.w * 0.18, r.y + r.h);
      c.lineTo(r.x, r.y + r.h * 0.72);
      c.closePath();
      c.fill();
      line(
        c,
        [
          [r.x + 5, r.y + r.h * 0.4],
          [r.x + r.w * 0.52, r.y + r.h * 0.3],
          [r.x + r.w * 0.68, r.y],
        ],
        '#b9bebd55',
        1.3,
      );
      line(
        c,
        [
          [r.x + r.w * 0.52, r.y + r.h * 0.3],
          [r.x + r.w * 0.6, r.y + r.h],
        ],
        '#273b4b77',
        1.6,
      );
    }
    const cable = [
      [250, 580],
      [290, 580],
      [290, 675],
      [740, 675],
      [740, 320],
      [970, 320],
    ];
    line(c, cable, '#142a3b', 7);
    line(c, cable, '#a79476', 2.2);
    for (let x = 290; x < 730; x += 48) rect(c, x, 671, 6, 8, '#71818b', 1);
    return n;
  }
  function solar(c, x, y, active, time = 0) {
    rect(c, x + 26, y + 22, 7, 42, '#748a99', 2);
    rect(c, x + 125, y + 22, 7, 42, '#748a99', 2);
    rect(c, x + 8, y + 55, 142, 5, '#152a3a66', 2);
    rect(c, x - 4, y - 4, 164, 57, '#8aa3b3', 3, '#b2c4ca');
    rect(
      c,
      x,
      y,
      156,
      49,
      gradient(c, x, y, x + 156, y + 49, [
        [0, active ? '#235274' : '#253d58'],
        [0.5, active ? '#3b6c8c' : '#1b3049'],
        [1, '#112e47'],
      ]),
      1,
    );
    for (let i = 0; i < 8; i++)
      for (let j = 0; j < 3; j++) {
        rect(c, x + 2 + i * 19.4, y + 2 + j * 16, 17.4, 13.5, '#2b55733b', 1, '#8db6c13d');
        line(
          c,
          [
            [x + 5 + i * 19.4, y + 4 + j * 16],
            [x + 17 + i * 19.4, y + 4 + j * 16],
          ],
          '#bad3dd35',
        );
      }
    line(
      c,
      [
        [x + 2, y + 1],
        [x + 153, y + 1],
      ],
      '#d2e5e8',
      1,
    );
    ellipse(c, x + 155, y + 54, 2, 2, active ? '#95f6d7' : '#dcb381');
    if (active) glow(c, x + 154, y + 52, 15, '#8bf6d537');
  }
  function dish(c, x, y, time = 0, active = false) {
    c.save();
    c.translate(x, y);
    ellipse(c, 15, 12, 40, 10, '#0a21314d');
    line(
      c,
      [
        [-19, 10],
        [0, -62],
        [21, 10],
      ],
      '#91a7b1',
      7,
    );
    line(
      c,
      [
        [-19, 10],
        [0, -62],
        [21, 10],
      ],
      '#5b7386',
      3,
    );
    rect(c, -29, 8, 60, 8, '#607c8c', 3, '#a0b2bc');
    c.translate(0, -65);
    c.rotate(-0.4 + (active ? Math.sin(time * 0.35) * 0.035 : 0));
    c.fillStyle = gradient(c, -45, -15, 45, 15, [
      [0, '#e6e4d7'],
      [0.45, '#b8c8cd'],
      [1, '#718c9f'],
    ]);
    c.beginPath();
    c.moveTo(-47, -7);
    c.quadraticCurveTo(0, 50, 47, -7);
    c.lineTo(42, -11);
    c.quadraticCurveTo(0, 20, -42, -11);
    c.closePath();
    c.fill();
    line(
      c,
      [
        [-43, -9],
        [43, -9],
      ],
      '#e7e7df',
      2,
    );
    line(
      c,
      [
        [-34, -8],
        [0, -42],
        [33, -8],
      ],
      '#aabec6',
      1.5,
    );
    rect(c, -4, -47, 8, 12, '#dfc28b', 2);
    ellipse(c, 0, -48, 3, 1.8, active ? '#97f5db' : '#dbc191');
    c.restore();
    if (active)
      for (let i = 0; i < 3; i++) {
        const r = 18 + ((time * 14 + i * 22) % 65);
        c.beginPath();
        c.arc(x + 17, y - 105, r, -1.8, -0.65);
        c.strokeStyle = `rgba(156,243,220,${0.38 * (1 - r / 90)})`;
        c.lineWidth = 1.2;
        c.stroke();
      }
  }
  function surface(c, s, time, t) {
    if (!surfacePlate) surfacePlate = buildSurface();
    c.drawImage(surfacePlate, 0, 0);
    // This is a suit instrument overlay. Dust on the airless Moon does not blow as weather.
    for (const [j, h] of W.hazards.entries()) {
      const pulse = 0.5 + 0.5 * Math.sin(time * 1.7 + j);
      c.save();
      c.translate(h.x, h.y);
      c.scale(h.rx, h.ry);
      ellipse(c, 0, 0, 1, 1, '#e6b77b0c');
      c.setLineDash([0.06, 0.08]);
      c.lineWidth = 0.012;
      ellipse(c, 0, 0, 0.97, 0.97, undefined, '#e7bd7e50');
      c.setLineDash([]);
      c.restore();
      for (let i = 0; i < 14; i++) {
        const a = noise(i + j * 50) * TAU,
          rad = Math.sqrt(noise(i + 70)) * 0.85;
        ellipse(
          c,
          h.x + Math.cos(a) * h.rx * rad,
          h.y + Math.sin(a) * h.ry * rad + Math.sin(time * 1.2 + i) * 1.5,
          1,
          1,
          `rgba(255,207,137,${0.15 + pulse * 0.25})`,
        );
      }
    }
    rect(c, 93, 497, 171, 137, '#102b3b55', 10);
    rect(
      c,
      86,
      488,
      170,
      129,
      gradient(c, 86, 488, 256, 617, [
        [0, '#a0adb4'],
        [0.4, '#617f90'],
        [1, '#324e64'],
      ]),
      9,
      '#c1cacc',
    );
    rect(c, 100, 501, 142, 104, '#1c394b', 5, '#87a6ad');
    rect(c, 116, 513, 109, 82, '#304f5d', 5, '#678c98');
    rect(c, 123, 519, 96, 5, '#8ff1d1', 2);
    rect(c, 127, 533, 86, 50, '#163445', 4, '#567986');
    label(c, '07', 170, 565, 25, '#8baeb7');
    label(c, 'LUNARIS', 170, 600, 7, '#c4d3d8');
    solar(c, 540, 416, s.solar, time);
    solar(c, 540, 520, s.solar, time);
    dish(c, 970, 247, time, !!s.comms);
    for (const o of W.surface) {
      marker(c, o, o.id === W.target(s).id, time);
      label(c, t('room_' + o.id).toUpperCase(), o.x, o.y + 35, 9, '#d6e2e7');
    }
  }
  function environmentalHazard(c, s, time) {
    const S = root.LunarSim,
      h = S.hazardState?.(s),
      en = document.documentElement?.lang === 'en';
    if (!h || s.world !== 'surface' || h.phase === 'calm') return;
    if (h.kind === 'micrometeorites' && h.zone) {
      const { x, y, r } = h.zone,
        pulse = 0.5 + 0.5 * Math.sin(time * 3);
      glow(c, x, y, r * 1.3, h.phase === 'active' ? '#ffad6433' : '#ffb86917');
      c.save();
      c.setLineDash([8, 7]);
      c.lineWidth = 1.8;
      ellipse(c, x, y, r, r, undefined, `rgba(255,192,117,${0.4 + pulse * 0.3})`);
      c.setLineDash([]);
      c.restore();
      label(
        c,
        h.phase === 'warning'
          ? en
            ? '!  IMPACT ZONE'
            : '!  ЗОНА УДАРОВ'
          : en
            ? '!  IMPACTS'
            : '!  МИКРОМЕТЕОРИТЫ',
        x,
        y - r - 11,
        9,
        '#ffce8f',
      );
      if (h.phase === 'active')
        for (let i = 0; i < 9; i++) {
          const age = (time * 1.1 + noise(i + 75)) % 1,
            a = noise(i + 600) * TAU,
            rad = Math.sqrt(noise(i + 13)) * r * 0.85,
            px = x + Math.cos(a) * rad,
            py = y + Math.sin(a) * rad;
          if (age < 0.45) {
            const k = age / 0.45;
            line(
              c,
              [
                [px - 40 * (1 - k), py - 90 * (1 - k)],
                [px - 32 * (1 - k), py - 72 * (1 - k)],
              ],
              '#ffe3ae99',
              1.3,
            );
          } else {
            const k = (age - 0.45) / 0.55;
            c.save();
            c.globalAlpha = (1 - k) * 0.65;
            ellipse(c, px, py, 3 + k * 15, 1 + k * 7, undefined, '#ffd5a4');
            c.restore();
          }
        }
    }
    if (h.kind === 'radiation') {
      for (const shelter of S.radiationShelters || []) {
        if (shelter.r) {
          glow(c, shelter.x, shelter.y, shelter.r, '#8cf3d318');
          ellipse(c, shelter.x, shelter.y, shelter.r, shelter.r, undefined, '#8adcc650');
        } else if (shelter.w)
          rect(c, shelter.x, shelter.y, shelter.w, shelter.h, '#82e9d30c', 3, '#8adcc644');
      }
      if (h.phase === 'active') {
        for (let i = 0; i < 24; i++) {
          const x = ((noise(i + 117) * 1300 + time * 14) % 1300) - 50,
            y = noise(i + 19) * 780;
          line(
            c,
            [
              [x, y],
              [x + 4, y + 1.4],
            ],
            '#f6c69445',
            0.8,
          );
        }
      } // particles are a dosimeter visualization, not atmospheric effects
    }
  }
  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.camera = { x: 0, y: 0, zoom: 1 };
      this.lastWorld = null;
      this.lastPlayer = null;
      this.lastTime = 0;
      this.footprints = [];
      this.lastStep = null;
    }
    paint(s, time, t, moving, path = [], scanner = { active: false, age: 0 }) {
      const b = this.canvas.getBoundingClientRect(),
        dpr = Math.min(root.devicePixelRatio || 1, 2),
        w = b.width,
        h = b.height;
      if (!w || !h) return;
      if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
        this.canvas.width = Math.round(w * dpr);
        this.canvas.height = Math.round(h * dpr);
      }
      const c = this.ctx;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.imageSmoothingEnabled = true;
      rect(c, 0, 0, w, h, '#091725');
      const z = clamp(Math.min(w / 760, h / 385), 0.74, 1.4),
        viewW = w / z,
        viewH = h / z,
        cx = viewW >= 1200 ? (1200 - viewW) / 2 : clamp(s.player.x - viewW / 2, 0, 1200 - viewW),
        cy = viewH >= 780 ? (780 - viewH) / 2 : clamp(s.player.y - viewH / 2, 0, 780 - viewH);
      const teleport =
          !this.lastPlayer ||
          s.world !== this.lastWorld ||
          Math.hypot(s.player.x - this.lastPlayer.x, s.player.y - this.lastPlayer.y) > 150,
        dt = this.lastTime ? clamp(time - this.lastTime, 0, 0.08) : 0.04;
      if (teleport || !motion() || this.camera.zoom !== z) this.camera = { x: cx, y: cy, zoom: z };
      else {
        const blend = 1 - Math.exp(-dt * 9);
        this.camera.x += (cx - this.camera.x) * blend;
        this.camera.y += (cy - this.camera.y) * blend;
      }
      if (teleport) {
        this.footprints = [];
        this.lastStep = null;
      }
      this.lastPlayer = { ...s.player };
      this.lastWorld = s.world;
      this.lastTime = time;
      c.save();
      c.scale(z, z);
      c.translate(-this.camera.x, -this.camera.y);
      (s.world === 'base' ? base : surface)(c, s, time, t);
      environmentalHazard(c, s, time);
      if (
        moving &&
        (!this.lastStep ||
          Math.hypot(s.player.x - this.lastStep.x, s.player.y - this.lastStep.y) > 13)
      ) {
        this.footprints.push({
          x: s.player.x,
          y: s.player.y,
          side: this.footprints.length % 2 ? 1 : -1,
          age: time,
        });
        this.lastStep = { x: s.player.x, y: s.player.y };
        if (this.footprints.length > 65) this.footprints.shift();
      }
      for (const f of this.footprints) {
        const opacity = s.world === 'surface' ? 0.3 : Math.max(0, 0.12 - (time - f.age) * 0.02);
        if (opacity > 0) {
          c.globalAlpha = opacity;
          ellipse(
            c,
            f.x + f.side * 4,
            f.y + 8,
            2.5,
            4,
            s.world === 'surface' ? '#071a2d' : '#b9dfd7',
          );
        }
      }
      c.globalAlpha = 1;
      if (path.length) {
        c.save();
        c.setLineDash([3, 7]);
        line(c, [[s.player.x, s.player.y], ...path.map((p) => [p.x, p.y])], '#adf3df7a', 1.3);
        c.setLineDash([]);
        const p = path[path.length - 1];
        ellipse(c, p.x, p.y, 8, 4, undefined, '#adf3df');
        c.restore();
      }
      if (scanner.active) {
        c.save();
        const radius = (Math.max(0, scanner.age) * 125) % 640;
        c.lineWidth = 1.5;
        ellipse(c, s.player.x, s.player.y, radius, radius, undefined, '#94ffe379');
        glow(c, s.player.x, s.player.y, 80, '#85f5d70d');
        for (const d of root.LunarSim.discoveries.filter(
          (x) => x.world === s.world && !(s.discoveries || []).includes(x.id),
        )) {
          glow(c, d.x, d.y, 30, '#ffce8840');
          rect(c, d.x - 10, d.y - 10, 20, 20, '#d9b77812', 3, '#e5c485');
          label(c, '◇', d.x, d.y + 5, 17, '#ffe0a2');
        }
        c.restore();
      }
      robot(c, s.player.x - 30, s.player.y - 17, time);
      astronaut(c, s.player.x, s.player.y, time, moving, s.player.facing, 1.3);
      if (s.world === 'base' && !s.grid) {
        rect(c, 0, 0, 1200, 780, '#06112020');
        glow(c, s.player.x, s.player.y, 145, '#ffdc9f11');
      }
      c.restore();
      const danger = root.LunarSim.stormPressure(s);
      if (danger >= 65) {
        const a = ((danger - 60) / 100) * (0.12 + 0.05 * (1 + Math.sin(time * 3)));
        rect(c, 0, 0, w, 3, `rgba(249,149,110,${a + 0.16})`);
        rect(c, 0, h - 3, w, 3, `rgba(249,149,110,${a + 0.16})`);
      }
      const hzd = root.LunarSim.hazardState?.(s);
      if (hzd?.kind === 'radiation' && hzd.phase === 'active' && s.world === 'surface') {
        const tint = c.createLinearGradient(0, 0, w, h);
        tint.addColorStop(0, hzd.sheltered ? '#83dfb611' : '#f2b96c1c');
        tint.addColorStop(0.5, 'transparent');
        tint.addColorStop(1, hzd.sheltered ? '#83dfb611' : '#e5a77518');
        rect(c, 0, 0, w, h, tint);
      }
      const g = c.createRadialGradient(
        w / 2,
        h / 2,
        Math.min(w, h) * 0.28,
        w / 2,
        h / 2,
        Math.max(w, h) * 0.75,
      );
      g.addColorStop(0, 'transparent');
      g.addColorStop(1, '#020b1d66');
      rect(c, 0, 0, w, h, g);
      if (w > 850 && h > 350) {
        const mx = w - 156,
          my = 17;
        rect(c, mx, my, 138, 98, '#091a29d9', 8, '#8aaab331');
        label(c, 'LOCAL NAV', mx + 11, my + 14, 7, '#9bb6c0', 'left');
        c.save();
        c.translate(mx + 5, my + 20);
        c.scale(128 / 1200, 72 / 780);
        for (const f of s.world === 'base' ? W.floors : W.rocks)
          rect(c, f.x, f.y, f.w, f.h, '#486675');
        const o = W.target(s);
        ellipse(c, o.x, o.y, 20, 20, '#ebc896');
        ellipse(c, s.player.x, s.player.y, 19, 19, '#acffe3');
        c.restore();
      }
      const o = W.target(s),
        tx = (o.x - this.camera.x) * z,
        ty = (o.y - this.camera.y) * z;
      if (tx < 25 || tx > w - 25 || ty < 55 || ty > h - 65) {
        const a = Math.atan2(ty - h / 2, tx - w / 2),
          rx = Math.max(20, w / 2 - 35),
          ry = Math.max(20, h / 2 - 45),
          r = Math.min(
            rx / Math.max(0.001, Math.abs(Math.cos(a))),
            ry / Math.max(0.001, Math.abs(Math.sin(a))),
          );
        c.save();
        c.translate(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r);
        ellipse(c, 0, 0, 14, 14, '#0e2737cf', '#a9efd760');
        c.rotate(a);
        c.fillStyle = '#b8f7df';
        c.beginPath();
        c.moveTo(6, 0);
        c.lineTo(-4, -4);
        c.lineTo(-2, 0);
        c.lineTo(-4, 4);
        c.closePath();
        c.fill();
        c.restore();
      }
    }
    toWorld(x, y) {
      const b = this.canvas.getBoundingClientRect();
      return {
        x: (x - b.left) / this.camera.zoom + this.camera.x,
        y: (y - b.top) / this.camera.zoom + this.camera.y,
      };
    }
    map(canvas, s, t) {
      canvas.width = 1200;
      canvas.height = 780;
      const c = canvas.getContext('2d');
      (s.world === 'base' ? base : surface)(c, s, 0, t);
      environmentalHazard(c, s, 0);
      glow(c, s.player.x, s.player.y, 35, '#a0ffe44d');
      astronaut(c, s.player.x, s.player.y, 0, false, s.player.facing, 1.7);
    }
  }
  function mountain(c, w, h, baseline, amplitude, color, seed) {
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(0, h);
    for (let x = 0; x <= w + 30; x += 25)
      c.lineTo(
        x,
        baseline + Math.sin(x * 0.006 + seed) * amplitude * 0.4 + noise(x + seed) * amplitude,
      );
    c.lineTo(w, h);
    c.closePath();
    c.fill();
  }
  function cover(canvas, time) {
    const c = canvas.getContext('2d'),
      w = 1440,
      h = 1000;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    c.setTransform(1, 0, 0, 1, 0, 0);
    rect(
      c,
      0,
      0,
      w,
      h,
      gradient(c, 0, 0, 0, h, [
        [0, '#050c19'],
        [0.5, '#12243a'],
        [1, '#3c4b5d'],
      ]),
    );
    starfield(c, w, h * 0.65, time, 180);
    glow(c, 1080, 294, 290, '#6aa0c619');
    earth(c, 1120, 208, 98, time);
    c.save();
    c.strokeStyle = '#94b9c00a';
    c.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      c.beginPath();
      c.ellipse(1140, 730, 440 + i * 31, 110 + i * 19, -0.12, Math.PI * 0.95, TAU * 1.12);
      c.stroke();
    }
    c.restore();
    mountain(c, w, h, 523, 88, '#1a2b40', 410);
    mountain(c, w, h, 582, 110, '#263a4e', 76);
    mountain(c, w, h, 702, 91, '#3b4e61', 21);
    line(
      c,
      [
        [0, 632],
        [180, 617],
        [280, 634],
        [410, 607],
        [535, 624],
        [610, 595],
        [740, 616],
        [850, 591],
        [1000, 624],
        [1130, 606],
        [1280, 641],
        [1440, 615],
      ],
      '#87969f25',
      1.4,
    );
    for (let i = 0; i < 150; i++)
      ellipse(
        c,
        noise(i + 100) * w,
        730 + noise(i + 2200) * 265,
        1 + noise(i) * 7,
        0.4 + noise(i + 14) * 1.8,
        '#111f3049',
      );
    for (let i = 0; i < 7; i++)
      crater(
        c,
        280 + noise(i + 22) * 1100,
        775 + noise(i + 47) * 200,
        11 + noise(i + 8) * 38,
        0.28,
      );
    c.save();
    c.translate(678, 655);
    c.scale(1.11, 1.11);
    for (let j = 0; j < 3; j++) {
      const x = j * 154,
        y = j === 1 ? -8 : 0;
      ellipse(c, x + 80, y + 131, 102, 17, '#12223566');
      rect(
        c,
        x,
        y,
        146,
        114,
        gradient(c, x, y, x, y + 114, [
          [0, '#b6c3c8'],
          [0.12, '#788f9d'],
          [0.65, '#3b596e'],
          [1, '#233e52'],
        ]),
        19,
        '#9fb1b9',
      );
      rect(c, x + 7, y + 11, 132, 83, '#192f42', 12, '#869ca8');
      rect(
        c,
        x + 11,
        y + 15,
        124,
        74,
        gradient(c, x, y, x, y + 90, [
          [0, '#233c50'],
          [1, j === 1 ? '#526861' : '#314e5e'],
        ]),
        9,
      );
      rect(c, x + 12, y + 21, 122, 2, j === 1 ? '#c4d4a0' : '#b9e6dc', 1);
      for (let rib = 0; rib < 3; rib++) {
        rect(c, x + 10 + rib * 59, y + 5, 7, 103, '#8b9faa', 2);
        line(
          c,
          [
            [x + 12 + rib * 59, y + 8],
            [x + 12 + rib * 59, y + 101],
          ],
          '#c4d2d3',
          1,
        );
      }
      if (j === 0) consoleArt(c, x + 25, y + 37, 88, 40, true, time);
      if (j === 1) {
        for (let n = 0; n < 5; n++) {
          const px = x + 23 + n * 23;
          rect(c, px, y + 58, 17, 15, '#62776d', 2);
          line(
            c,
            [
              [px + 8, y + 62],
              [px + 8, y + 35],
            ],
            '#a5c19a',
            2,
          );
          ellipse(c, px + 4, y + 45, 7, 3, '#83b997');
          ellipse(c, px + 12, y + 38, 7, 3, '#b4d1a5');
        }
        glow(c, x + 70, y + 45, 80, '#bdc9941a');
      }
      if (j === 2) {
        for (let n = 0; n < 3; n++) crate(c, x + 21 + n * 36, y + 49, 29, 28);
        label(c, '07', x + 74, y + 40, 13, '#a3b8bf');
      }
      for (const lx of [x + 23, x + 117]) {
        line(
          c,
          [
            [lx, y + 111],
            [lx - 5, y + 134],
          ],
          '#91a6b1',
          6,
        );
        rect(c, lx - 12, y + 133, 18, 4, '#597286', 2);
      }
      if (j < 2) {
        rect(c, x + 143, y + 45, 15, 42, '#98acb7', 3);
        rect(c, x + 145, y + 50, 11, 32, '#3b586c', 2);
      }
    }
    dish(c, 508, 47, time, true);
    solar(c, -180, 83, true, time);
    line(
      c,
      [
        [-172, 145],
        [-172, 165],
        [443, 165],
        [443, 91],
      ],
      '#c3ae84',
      1.5,
    );
    rect(c, 24, -26, 51, 26, '#8ca3b0', 4);
    rect(c, 30, -21, 39, 15, '#2f4c61', 2);
    line(
      c,
      [
        [2, 8],
        [2, -48],
      ],
      '#b9c9cd',
      2,
    );
    rect(c, 3, -48, 36, 18, '#98dfc9', 1);
    rect(c, 3, -48, 12, 18, '#e1e7d7', 1);
    c.restore();
    const ax = 1112,
      ay = 916;
    ellipse(c, ax + 35, ay + 9, 75, 11, '#10213366');
    for (let i = 0; i < 14; i++)
      ellipse(c, ax - 8 - i * 12 + (i % 2 ? 4 : -4), ay + 12 + i * 1.2, 2, 4, '#1a2c4066');
    astronaut(c, ax, ay, time, false, 3, 3.4);
    robot(c, ax - 68, ay - 20, time);
    glow(c, ax - 50, ay - 49, 95, '#96e8e80a');
    rect(
      c,
      0,
      0,
      w,
      h,
      gradient(c, 0, 0, w, 0, [
        [0, '#09131ff5'],
        [0.3, '#09131fe3'],
        [0.52, '#09131f79'],
        [0.72, '#09131f08'],
        [1, '#09131f00'],
      ]),
    );
    rect(
      c,
      0,
      h - 200,
      w,
      200,
      gradient(c, 0, h - 200, 0, h, [
        [0, '#09131f00'],
        [1, '#09131fbb'],
      ]),
    );
  }
  root.LunarRender = { Renderer, cover };
})(window);
