/* Academy locations, equipment and animated characters. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2,
    views = new WeakMap(),
    plates = new Map(),
    artwork = new Map();
  const artIds = ['water', 'shield', 'comms', 'rover'];
  function sourceFor(id) {
    return root.LunarAcademyAssets?.[id] || (id === 'hub' ? null : 'assets/academy/' + id + '.svg');
  }
  function requestArtwork(id) {
    const source = sourceFor(id);
    if (!source || typeof root.Image !== 'function') return null;
    const previous = artwork.get(id);
    if (previous?.source === source) return previous;
    const entry = { source, image: new root.Image(), status: 'loading', promise: null };
    entry.promise = new Promise((resolve) => {
      entry.image.onload = () => {
        entry.status = 'ready';
        resolve(true);
      };
      entry.image.onerror = () => {
        entry.status = 'error';
        resolve(false);
      };
    });
    artwork.set(id, entry);
    entry.image.decoding = 'async';
    entry.image.src = source;
    return entry;
  }
  function preload() {
    return Promise.all(artIds.map((id) => requestArtwork(id)?.promise || Promise.resolve(false)));
  }
  function assetStatus() {
    const result = {};
    for (const id of artIds) result[id] = requestArtwork(id)?.status || 'unavailable';
    result.hub = requestArtwork(sourceFor('hub') ? 'hub' : 'comms')?.status || 'unavailable';
    return result;
  }
  function environment(c, id) {
    const entry = requestArtwork(id === 'hub' && !sourceFor('hub') ? 'comms' : id);
    if (entry?.status === 'ready' && entry.image.width && entry.image.height) {
      const image = entry.image,
        scale = Math.max(1000 / image.width, 600 / image.height),
        sw = 1000 / scale,
        sh = 600 / scale;
      c.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, 0, 0, 1000, 600);
      r(c, 0, 0, 1000, 600, id === 'hub' ? '#04111b45' : '#04111b16');
      // A reserved trim gives the live instruments a consistent exposure over the plate.
      r(
        c,
        0,
        0,
        1000,
        53,
        g(c, 0, 0, 0, 53, [
          [0, '#03101be8'],
          [1, '#03101b00'],
        ]),
      );
      return true;
    }
    c.drawImage(background(id), 0, 0);
    return false;
  }
  const palette = {
    hub: '#f4bc78',
    water: '#83d9e1',
    shield: '#bacd9c',
    comms: '#a9bde9',
    rover: '#d9b58b',
  };
  const noise = (i) => {
    const n = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return n - Math.floor(n);
  };
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  function r(c, x, y, w, h, color, radius = 0, stroke) {
    c.beginPath();
    if (radius) c.roundRect(x, y, w, h, radius);
    else c.rect(x, y, w, h);
    if (color) {
      c.fillStyle = color;
      c.fill();
    }
    if (stroke) {
      c.strokeStyle = stroke;
      c.lineWidth = 1;
      c.stroke();
    }
  }
  function e(c, x, y, rx, ry, color, stroke) {
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, TAU);
    if (color) {
      c.fillStyle = color;
      c.fill();
    }
    if (stroke) {
      c.strokeStyle = stroke;
      c.lineWidth = 1;
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
  function text(c, value, x, y, size = 11, color = '#afc5d0', align = 'center', weight = 600) {
    c.font = `${weight} ${size}px "Segoe UI",Arial,sans-serif`;
    c.fillStyle = color;
    c.textAlign = align;
    c.textBaseline = 'alphabetic';
    c.fillText(String(value ?? ''), x, y);
  }
  function g(c, x, y, x2, y2, stops) {
    const n = c.createLinearGradient(x, y, x2, y2);
    stops.forEach(([p, color]) => n.addColorStop(p, color));
    return n;
  }
  function glow(c, x, y, size, color) {
    const n = c.createRadialGradient(x, y, 0, x, y, size);
    n.addColorStop(0, color);
    n.addColorStop(1, 'transparent');
    r(c, x - size, y - size, size * 2, size * 2, n);
  }
  function bolts(c, x, y, w, h) {
    for (const [a, b] of [
      [x + 6, y + 6],
      [x + w - 6, y + 6],
      [x + 6, y + h - 6],
      [x + w - 6, y + h - 6],
    ]) {
      e(c, a, b, 1.4, 1.4, '#718a96');
      line(
        c,
        [
          [a - 1, b],
          [a + 1, b],
        ],
        '#142c3e',
      );
    }
  }
  function tinyEarth(c, x, y, rad) {
    glow(c, x, y, rad * 1.6, '#79c6f222');
    e(
      c,
      x,
      y,
      rad,
      rad,
      g(c, x - rad, y - rad, x + rad, y + rad, [
        [0, '#9fd1dc'],
        [0.25, '#3d91b0'],
        [0.7, '#194768'],
        [1, '#071d35'],
      ]),
      '#82b5cb66',
    );
    c.save();
    c.beginPath();
    c.arc(x, y, rad, 0, TAU);
    c.clip();
    for (let i = 0; i < 6; i++) {
      const px = x + (noise(i + 1) - 0.5) * rad * 1.5,
        py = y + (noise(i + 90) - 0.5) * rad * 1.6;
      e(c, px, py, rad * (0.15 + noise(i + 3) * 0.17), rad * 0.12, '#93b9a6');
    }
    for (let i = 0; i < 5; i++)
      line(
        c,
        [
          [x - rad * 0.6 + noise(i) * rad * 0.3, y - rad * 0.7 + i * rad * 0.3],
          [x + noise(i + 4) * rad * 0.7, y - rad * 0.65 + i * rad * 0.3],
        ],
        '#e4ecec75',
        rad * 0.04,
      );
    c.restore();
  }
  function skyWindow(c, x, y, w, h) {
    r(c, x - 4, y - 4, w + 8, h + 8, '#314b5e', 9, '#617c88');
    r(
      c,
      x,
      y,
      w,
      h,
      g(c, x, y, x, y + h, [
        [0, '#030c18'],
        [1, '#1c3147'],
      ]),
      6,
      '#0e1d2b',
    );
    c.save();
    c.beginPath();
    c.roundRect(x, y, w, h, 6);
    c.clip();
    for (let i = 0; i < 50; i++)
      e(
        c,
        x + noise(i + 700) * w,
        y + noise(i + 400) * h,
        noise(i) > 0.88 ? 1 : 0.5,
        noise(i) > 0.88 ? 1 : 0.5,
        '#c0d6e28a',
      );
    c.fillStyle = '#3d5266';
    c.beginPath();
    c.moveTo(x, y + h);
    for (let i = 0; i <= w; i += 15) c.lineTo(x + i, y + h - 10 - noise(i + 42) * 14);
    c.lineTo(x + w, y + h);
    c.fill();
    tinyEarth(c, x + w * 0.78, y + h * 0.35, Math.min(h * 0.22, w * 0.08));
    c.restore();
    for (let i = 1; i < 4; i++) r(c, x + (w * i) / 4 - 2, y, 4, h, '#405b6d');
    line(
      c,
      [
        [x + 8, y + 3],
        [x + w - 8, y + 3],
      ],
      '#99c4ca55',
      2,
    );
  }
  function background(id) {
    if (plates.has(id)) return plates.get(id);
    const n = root.document.createElement('canvas');
    n.width = 1000;
    n.height = 600;
    const c = n.getContext('2d'),
      accent = palette[id] || palette.hub;
    if (id === 'rover') {
      r(
        c,
        0,
        0,
        1000,
        600,
        g(c, 0, 0, 1000, 600, [
          [0, '#142238'],
          [0.2, '#263b51'],
          [1, '#3b5264'],
        ]),
      );
      for (let i = 0; i < 100; i++) {
        const x = noise(i + 337) * 1000,
          y = 65 + noise(i + 610) * 520;
        const rr = 3 + noise(i + 950) * 16;
        e(c, x, y + 3, rr * 1.3, rr * 0.5, '#182e4166');
        e(c, x, y, rr, rr * 0.4, undefined, '#a3b3b322');
        e(c, x, y + 1, rr * 0.82, rr * 0.28, '#263c4d55');
      }
      for (let i = 0; i < 85; i++) {
        const x = noise(i + 31) * 1000,
          y = 75 + noise(i + 40) * 490;
        r(c, x, y, 2 + noise(i + 91) * 4, 1, '#afc2c12a', 1);
      }
      c.save();
      c.globalAlpha = 0.2;
      c.setLineDash([5, 9]);
      line(
        c,
        [
          [109, 500],
          [345, 500],
          [345, 306],
          [879, 306],
        ],
        '#efdbb0',
        1.5,
      );
      c.restore();
      r(c, 48, 366, 137, 116, '#0b1b2c', 12, '#7f98a3');
      r(
        c,
        55,
        372,
        123,
        103,
        g(c, 55, 372, 170, 475, [
          [0, '#7c939b'],
          [0.15, '#3a5c6e'],
          [1, '#203d53'],
        ]),
        9,
        '#a6b8be',
      );
      r(c, 73, 387, 88, 72, '#102c40', 7, '#94b9c2');
      r(c, 82, 395, 70, 54, '#345b69', 5);
      r(c, 87, 398, 60, 3, '#ade9d5', 1);
      r(c, 139, 420, 5, 15, '#9fe2ce', 2);
      // Low horizon rim and Earth remain above the walkable expedition area.
      r(c, 0, 0, 1000, 58, '#050d17');
      for (let i = 0; i < 55; i++)
        e(c, noise(i + 2) * 1000, noise(i + 117) * 45, 0.5, 0.5, '#bfdae58a');
      tinyEarth(c, 878, 31, 19);
      line(
        c,
        [
          [0, 66],
          [1000, 66],
        ],
        '#8497a92a',
        1,
      );
      plates.set(id, n);
      return n;
    }
    r(
      c,
      0,
      0,
      1000,
      600,
      g(c, 0, 0, 1000, 600, [
        [0, '#08121d'],
        [1, '#112638'],
      ]),
    );
    r(c, 18, 42, 964, 538, '#050c14', 22, '#334c5f');
    r(
      c,
      27,
      49,
      946,
      522,
      g(c, 0, 50, 0, 570, [
        [0, '#5b7180'],
        [0.03, '#213847'],
        [0.9, '#142d3d'],
        [1, '#516b7a'],
      ]),
      17,
      '#81929a',
    );
    r(c, 39, 69, 922, 486, '#142b39', 9, '#68818e');
    for (let y = 76; y < 552; y += 29)
      for (let x = 45; x < 957; x += 29) {
        r(c, x, y, 28, 28, noise(x * 7 + y) > 0.6 ? '#203845' : '#1c3341');
        line(
          c,
          [
            [x + 2, y + 2],
            [x + 26, y + 2],
          ],
          '#7c98a014',
        );
      }
    for (const x of [31, 963])
      for (let y = 84; y < 541; y += 52) {
        r(c, x, y, 6, 27, '#68818d', 2);
        r(c, x + 1, y + 3, 2, 18, '#a9b7b841', 1);
      }
    line(
      c,
      [
        [58, 84],
        [942, 84],
      ],
      accent + '77',
      2,
    );
    line(
      c,
      [
        [58, 542],
        [942, 542],
      ],
      '#95c8cb44',
      2,
    );
    for (const x of [60, 900]) {
      r(c, x, 518, 38, 16, '#0a1d2c', 3, '#476271');
      for (let i = 0; i < 5; i++)
        line(
          c,
          [
            [x + 5 + i * 6, 522],
            [x + 5 + i * 6, 530],
          ],
          '#6c8592',
        );
    }
    skyWindow(c, 380, 67, 240, 64);
    for (const x of [64, 868]) {
      r(c, x, 66, 68, 17, '#1a3040', 3, '#567180');
      for (let i = 0; i < 6; i++) r(c, x + 7 + i * 9, 72, 5, 5, i === 0 ? accent : '#587987', 1);
    }
    // Flush service channels are part of the floor, rather than collision geometry.
    for (const y of [280, 390]) {
      line(
        c,
        [
          [62, y],
          [938, y],
        ],
        '#071c2a',
        12,
      );
      line(
        c,
        [
          [62, y - 2],
          [938, y - 2],
        ],
        '#3b6070',
        2,
      );
      for (let x = 78; x < 936; x += 38) r(c, x, y - 5, 12, 10, '#203b4b', 2, '#4c6873');
    }
    r(c, 430, 556, 140, 16, '#253f50', 3, '#78939d');
    for (let x = 437; x < 565; x += 12)
      line(
        c,
        [
          [x, 560],
          [x + 7, 568],
        ],
        '#a99b76',
        2,
      );
    // Department markings deliberately remain light and out of the playable path.
    c.save();
    c.globalAlpha = 0.18;
    line(
      c,
      [
        [470, 335],
        [530, 335],
      ],
      accent,
      2,
    );
    line(
      c,
      [
        [500, 305],
        [500, 365],
      ],
      accent,
      2,
    );
    e(c, 500, 335, 48, 48, undefined, accent);
    c.restore();
    if (id === 'water') {
      for (const x of [71, 925]) {
        line(
          c,
          [
            [x, 110],
            [x, 476],
          ],
          '#597f88',
          10,
        );
        line(
          c,
          [
            [x - 2, 110],
            [x - 2, 476],
          ],
          '#aed1d04c',
          2,
        );
      }
      r(c, 66, 492, 868, 8, '#355b68', 3);
    }
    if (id === 'shield') {
      for (const x of [68, 922]) {
        r(c, x, 133, 12, 329, '#415763', 3, '#79949a');
        for (let y = 150; y < 450; y += 28)
          line(
            c,
            [
              [x + 2, y],
              [x + 10, y + 12],
            ],
            '#bca471',
            3,
          );
      }
    }
    if (id === 'comms') {
      line(
        c,
        [
          [74, 518],
          [924, 518],
          [924, 103],
        ],
        '#394c65',
        5,
      );
      line(
        c,
        [
          [74, 515],
          [922, 515],
          [922, 103],
        ],
        '#b89b663d',
        1,
      );
    }
    if (id === 'rover') {
      r(c, 210, 270, 580, 240, '#233b48', 12, '#536c78');
      for (let x = 233; x < 785; x += 40)
        line(
          c,
          [
            [x, 286],
            [x, 493],
          ],
          '#52687544',
        );
      r(c, 391, 343, 218, 95, '#0d2231', 9, '#526e7b');
    }
    plates.set(id, n);
    return n;
  }
  function chassis(c, x, y, w, h, accent) {
    e(c, x + 7, y + h + 9, w * 0.61, 13, '#0000005c');
    r(c, x - w / 2 + 5, y + 7, w, h, '#07131dd9', 8);
    r(
      c,
      x - w / 2,
      y,
      w,
      h,
      g(c, x - w / 2, y, x + w / 2, y + h, [
        [0, '#9aaab0'],
        [0.035, '#506773'],
        [0.13, '#2d4656'],
        [0.82, '#152a3a'],
        [0.96, '#5d7786'],
        [1, '#a6b7b8'],
      ]),
      8,
      '#bac6c780',
    );
    r(
      c,
      x - w / 2 + 5,
      y + 7,
      w - 10,
      h - 14,
      g(c, x, y, x, y + h, [
        [0, '#10202e'],
        [0.7, '#223d4b'],
        [1, '#0d2332'],
      ]),
      5,
      '#5e7785',
    );
    r(c, x - w / 2 + 9, y + 3, w - 18, 2, accent, 1);
    line(
      c,
      [
        [x - w / 2 + 8, y + 9],
        [x + w / 2 - 8, y + 9],
      ],
      '#dce9e52e',
      1,
    );
    for (const xx of [x - w / 2 + 3, x + w / 2 - 8])
      r(
        c,
        xx,
        y + 17,
        5,
        h - 35,
        g(c, xx, y, xx + 5, y, [
          [0, '#172b38'],
          [0.5, '#809ba5'],
          [1, '#263d4d'],
        ]),
        2,
      );
    bolts(c, x - w / 2, y, w, h);
    for (let i = 0; i < 3; i++)
      r(c, x + w / 2 - 26 + i * 5, y + h - 9, 3, 2, i === 0 ? accent : '#304958', 1);
  }
  function screen(c, x, y, w, h, accent, time = 0) {
    r(c, x, y, w, h, '#061522', 4, '#6c8998');
    r(c, x + 4, y + 4, w - 8, h - 8, '#102e3c', 2);
    for (let i = 0; i < 3; i++) {
      const yy = y + 9 + i * 6;
      line(
        c,
        [
          [x + 7, yy],
          [x + 13, yy],
          [x + 17, yy - 2],
          [x + 21, yy + 2],
          [x + w - 8, yy],
        ],
        accent,
        0.8,
      );
    }
    r(c, x + 7, y + h - 8, w - 14, 2, accent + '66', 1);
  }
  function waterTank(c, x, y, clean, time, small = false) {
    const w = small ? 35 : 58,
      h = small ? 63 : 83;
    r(
      c,
      x - w / 2,
      y,
      w,
      h,
      g(c, x - w / 2, y, x + w / 2, y, [
        [0, '#253f50'],
        [0.13, '#a3bbc2'],
        [0.26, '#4e8396'],
        [0.64, '#17384c'],
        [0.9, '#557f91'],
        [1, '#abc0c5'],
      ]),
      w * 0.25,
      '#bdd3d6',
    );
    r(c, x - w / 2 + 7, y + 13, w - 14, h - 26, '#081e2e', 5, '#8eb4bf');
    r(
      c,
      x - w / 2 + 9,
      y + 25,
      w - 18,
      h - 40,
      g(c, x, y + 25, x, y + h - 15, [
        [0, clean ? '#83e1e9' : '#8e9e88'],
        [0.3, clean ? '#2d9db9' : '#657d6d'],
        [1, clean ? '#154d71' : '#314f4b'],
      ]),
      4,
    );
    e(c, x, y + 26, (w - 18) / 2, 2, clean ? '#b2f2ecaa' : '#bac0a577');
    line(
      c,
      [
        [x - w / 2 + 12, y + 29],
        [x - w / 2 + 12, y + h - 22],
      ],
      '#e8fff2a0',
      2,
    );
    line(
      c,
      [
        [x + w / 2 - 13, y + 31],
        [x + w / 2 - 13, y + h - 25],
      ],
      '#d8edee2d',
      1,
    );
    for (let i = 0; i < 5; i++)
      e(
        c,
        x + (noise(i + 31) - 0.5) * (w - 22),
        y + h - 20 - ((time * 8 + i * 12) % (h - 44)),
        1.2,
        1.5,
        clean ? '#d1fff4aa' : '#b3c3b077',
      );
    for (const yy of [y + 8, y + h - 13])
      r(
        c,
        x - w / 2 - 3,
        yy,
        w + 6,
        6,
        g(c, x - w / 2, yy, x + w / 2, yy, [
          [0, '#3b5364'],
          [0.35, '#99aeb4'],
          [1, '#3c586b'],
        ]),
        2,
        '#9fb9be',
      );
    r(c, x - 9, y - 5, 18, 7, '#819aa3', 2);
    if (clean) glow(c, x, y + h * 0.6, w * 0.6, '#74d9dd10');
  }
  function waterEquipment(c, s, scene, time) {
    const x = s.x,
      y = s.y - 100,
      id = s.id,
      done = (scene.completed || []).includes(id);
    chassis(c, x, y, 106, 79, done ? '#b7f6d6' : '#8bdde0');
    if (id === 'collect') {
      waterTank(c, x - 19, y + 14, false, time, true);
      r(c, x + 11, y + 17, 24, 40, '#243c49', 4, '#7b929b');
      for (let i = 0; i < 3; i++) {
        const py = y + 24 + ((time * 13 + i * 14) % 34);
        e(c, x + 23, py, 2, 3, '#9adce0');
      }
      line(
        c,
        [
          [x + 28, y + 5],
          [x + 28, y + 15],
        ],
        '#a5bfc5',
        5,
      );
    } else if (id === 'prefilter') {
      for (let i = 0; i < 3; i++) {
        r(c, x - 37 + i * 27, y + 17, 20, 44, '#9ba89a', 7, '#c1cbb9');
        for (let j = 0; j < 6; j++)
          line(
            c,
            [
              [x - 34 + i * 27, y + 24 + j * 5],
              [x - 20 + i * 27, y + 24 + j * 5],
            ],
            '#4b6a68',
            1,
          );
      }
      line(
        c,
        [
          [x - 43, y + 36],
          [x + 43, y + 36],
        ],
        '#8acdd166',
        2,
      );
    } else if (id === 'purify') {
      r(c, x - 39, y + 16, 78, 46, '#21354d', 5, '#7d9cb0');
      for (let i = 0; i < 5; i++) {
        const px = x - 28 + i * 14;
        r(c, px, y + 20, 6, 36, '#7a9fb7', 3);
        r(c, px + 2, y + 24, 2, 28, '#b9c8fa', 1);
      }
      glow(c, x, y + 39, 40, '#b2b9ff24');
    } else if (id === 'test') {
      screen(c, x - 39, y + 14, 49, 40, '#9cebd3', time);
      for (let i = 0; i < 2; i++) {
        r(c, x + 16 + i * 13, y + 24, 8, 28, '#769aa8', 3, '#b5d8d8');
        r(c, x + 18 + i * 13, y + 36, 4, 13, i ? '#a3ddbb' : '#8acddb', 1);
      }
      r(c, x - 29, y + 60, 58, 6, '#879b9e', 2);
    } else {
      waterTank(c, x, y + 2, true, time, false);
      r(c, x - 39, y + 34, 14, 21, '#273e4e', 3, '#7899a7');
      r(c, x + 25, y + 34, 14, 21, '#273e4e', 3, '#7899a7');
    }
    if (done) {
      glow(c, x, y + 10, 45, '#a3f2ce16');
      text(c, '✓', x + 39, y + 18, 13, '#b3f9d9');
    }
  }
  function materialArt(c, id, x, y) {
    if (id === 'water') {
      waterTank(c, x, y - 40, true, 0, true);
      return;
    }
    if (id === 'regolith') {
      for (let i = 0; i < 9; i++) {
        const px = x + (noise(i + 73) - 0.5) * 61,
          py = y - 18 + noise(i + 91) * 24;
        c.fillStyle = ['#80909c', '#657583', '#a4acaa'][i % 3];
        c.beginPath();
        c.moveTo(px - 9, py + 5);
        c.lineTo(px - 7, py - 6);
        c.lineTo(px + 4, py - 10);
        c.lineTo(px + 11, py);
        c.lineTo(px + 7, py + 7);
        c.closePath();
        c.fill();
      }
      return;
    }
    for (let i = 0; i < 4; i++) {
      const xx = x - 29 + i * 4,
        yy = y - 23 + i * 8;
      r(
        c,
        xx,
        yy,
        55,
        15,
        id === 'polymer'
          ? g(c, xx, yy, xx, yy + 15, [
              [0, '#c7dab9'],
              [1, '#6f9b8d'],
            ])
          : g(c, xx, yy, xx + 55, yy + 15, [
              [0, '#c3d0d5'],
              [0.35, '#6d8999'],
              [0.55, '#b8cbd3'],
              [1, '#3d566b'],
            ]),
        3,
        '#b6c6c655',
      );
      line(
        c,
        [
          [xx + 6, yy + 4],
          [xx + 49, yy + 4],
        ],
        '#e8f5e955',
      );
    }
  }
  function shieldEquipment(c, s, scene, time) {
    const x = s.x,
      y = s.y - 100;
    if (s.id === 'shelter') {
      e(c, x + 3, y + 92, 119, 17, '#00000035');
      r(c, x - 111, y - 13, 222, 111, '#536d7c', 13, '#9aafb5');
      r(
        c,
        x - 102,
        y - 7,
        204,
        98,
        g(c, x, y, x, y + 98, [
          [0, '#314f62'],
          [1, '#152e40'],
        ]),
        10,
        '#8199a5',
      );
      r(c, x - 75, y + 1, 150, 83, '#122737', 7, '#496d7e');
      r(c, x - 40, y + 13, 80, 61, '#294655', 6);
      e(c, x, y + 42, 18, 17, '#859b9e');
      e(c, x, y + 42, 12, 10, '#294a5b');
      for (let i = 0; i < 2; i++) {
        const installed = (scene.installed || scene.data?.materials || [])[i],
          xx = x - 103 + i * 181;
        r(
          c,
          xx,
          y - 3,
          25,
          91,
          installed ? '#8b9f9b' : '#2a4353',
          4,
          installed ? '#b8d5c2' : '#536c7c',
        );
        if (installed) {
          const col =
            installed === 'water'
              ? '#80c4d2'
              : installed === 'polymer'
                ? '#a3caa8'
                : installed === 'regolith'
                  ? '#939f9f'
                  : '#bac8cb';
          r(c, xx + 4, y + 5, 17, 73, col, 2);
          for (let j = 0; j < 4; j++)
            line(
              c,
              [
                [xx + 5, y + 15 + j * 17],
                [xx + 19, y + 15 + j * 17],
              ],
              '#25435166',
            );
        }
      }
      line(
        c,
        [
          [x - 76, y + 83],
          [x + 76, y + 83],
        ],
        '#94ddc6',
        3,
      );
      text(c, 'SHELTER / 07', x, y - 23, 10, '#b6c5b1');
      return;
    }
    chassis(c, x, y, 106, 78, palette.shield);
    r(c, x - 44, y + 13, 88, 49, '#263e4b', 4, '#647a83');
    materialArt(c, s.id, x, y + 50);
    r(c, x - 45, y + 65, 90, 7, '#61746b', 2);
    for (const xx of [x - 38, x + 34]) r(c, xx, y + 14, 4, 48, '#82948e', 1);
  }
  function commsEquipment(c, s, scene, time) {
    const x = s.x,
      y = s.y - 100,
      id = s.id,
      done = (scene.completed || []).includes(id);
    if (id === 'antenna') {
      e(c, x + 5, y + 95, 70, 12, '#00000038');
      line(
        c,
        [
          [x, y + 93],
          [x, y + 24],
        ],
        '#8ba0ad',
        8,
      );
      line(
        c,
        [
          [x, y + 70],
          [x - 27, y + 91],
        ],
        '#657f91',
        6,
      );
      line(
        c,
        [
          [x, y + 70],
          [x + 27, y + 91],
        ],
        '#657f91',
        6,
      );
      r(c, x - 39, y + 89, 78, 7, '#617a8a', 3, '#9baeb6');
      c.save();
      c.translate(x, y + 20);
      c.rotate(-0.38 + Math.sin(time * 0.5) * 0.015);
      c.beginPath();
      c.ellipse(0, 0, 57, 12, 0, 0, Math.PI);
      c.quadraticCurveTo(0, 53, -57, 0);
      c.fillStyle = g(c, -50, 0, 50, 35, [
        [0, '#d4ddda'],
        [0.5, '#829dab'],
        [1, '#4e6a80'],
      ]);
      c.fill();
      c.strokeStyle = '#c2d2d7';
      c.lineWidth = 2;
      c.stroke();
      line(
        c,
        [
          [0, 18],
          [0, -29],
        ],
        '#bccdd3',
        3,
      );
      e(c, 0, -32, 5, 3, '#f6bc75');
      line(
        c,
        [
          [-45, 4],
          [0, 28],
          [45, 4],
        ],
        '#546e823b',
        1,
      );
      c.restore();
      c.save();
      c.strokeStyle = '#a4cfe8';
      c.globalAlpha = 0.3;
      for (let i = 0; i < 2; i++) {
        const rr = 15 + ((time * 10 + i * 17) % 40);
        c.beginPath();
        c.arc(x, y - 13, rr, -2.6, -1.4);
        c.stroke();
      }
      c.restore();
      return;
    }
    chassis(c, x, y, id === 'timing' ? 141 : 110, 79, done ? '#aae4c8' : palette.comms);
    if (id === 'power') {
      for (let i = 0; i < 3; i++) {
        r(c, x - 38, y + 16 + i * 15, 50, 10, '#344e62', 3);
        r(c, x - 34, y + 19 + i * 15, 42, 3, done ? '#8ce4b9' : '#9b7b60', 1);
      }
      r(c, x + 20, y + 17, 16, 43, '#213b4b', 3, '#78929d');
      line(
        c,
        [
          [x + 28, y + done * 16 + 20],
          [x + 28, y + 39],
        ],
        done ? '#9ae6c5' : '#e2b575',
        5,
      );
    } else if (id === 'timing') {
      screen(c, x - 60, y + 13, 120, 46, '#9bc7e4', time);
      tinyEarth(c, x - 36, y + 34, 11);
      e(c, x + 34, y + 34, 7, 7, '#9dacb5');
      line(
        c,
        [
          [x - 22, y + 34],
          [x + 22, y + 34],
        ],
        '#6e9ab3',
        1,
      );
      const dot = (time * 0.45) % 2;
      const dx = dot < 1 ? -22 + dot * 44 : 22 - (dot - 1) * 44;
      e(c, x + dx, y + 34, 2.4, 2.4, '#b4f6df');
      text(c, 't = 2d / c', x, y + 70, 8, '#afc6d5');
    } else {
      screen(c, x - 42, y + 14, 84, 46, '#b2d7ec', time);
      for (let i = 0; i < 3; i++) {
        const rr = 7 + i * 5;
        c.beginPath();
        c.arc(x - 9, y + 35, rr, -0.8, 0.8);
        c.strokeStyle = '#b0d9ef';
        c.stroke();
      }
      for (let i = 0; i < 3; i++)
        r(c, x + 19, y + 22 + i * 9, 12, 3, done ? '#9de5bb' : '#8caac0', 1);
    }
  }
  function rover(c, x, y, time, scale = 1) {
    c.save();
    c.translate(x, y);
    c.scale(scale, scale);
    e(c, 4, 19, 46, 10, '#00000038');
    for (const xx of [-31, 24])
      for (const yy of [-5, 19]) {
        r(c, xx, yy, 13, 18, '#12212e', 4, '#6c8293');
        for (let i = 0; i < 3; i++)
          line(
            c,
            [
              [xx + 3, yy + 3 + i * 5],
              [xx + 10, yy + 3 + i * 5],
            ],
            '#4e6779',
            2,
          );
      }
    r(
      c,
      -27,
      -10,
      54,
      42,
      g(c, 0, -10, 0, 32, [
        [0, '#c9b082'],
        [1, '#746958'],
      ]),
      7,
      '#d8c5a3',
    );
    r(c, -19, -4, 38, 19, '#24465d', 4, '#a7b8b7');
    for (let i = 0; i < 4; i++)
      line(
        c,
        [
          [-16 + i * 9, -2],
          [-16 + i * 9, 12],
        ],
        '#668a9e',
        1,
      );
    r(c, -8, -25, 16, 17, '#859dab', 3);
    r(c, -13, -31, 26, 10, '#d1d8d3', 3, '#718998');
    e(c, -5, -27, 3, 3, '#1a3b50');
    e(c, 5, -27, 3, 3, '#1a3b50');
    line(
      c,
      [
        [22, -8],
        [32, -24],
        [35, -36],
      ],
      '#acbbc2',
      2,
    );
    e(c, 35, -37, 2, 2, '#a7f1d6');
    c.restore();
  }
  function roverEquipment(c, s, scene, time) {
    const x = s.x,
      y = s.y - 75;
    if (s.id === 'rover') {
      e(c, x, s.y - 4, 57, 16, undefined, '#9faea25c');
      r(c, x - 50, s.y - 16, 100, 3, '#cdb98d44', 1);
      if (!scene.driving) rover(c, x, s.y - 32, time, 1.22);
      return;
    }
    if (s.id === 'kit' || s.id === 'boots') {
      e(c, x + 2, y + 59, 47, 10, '#12263966');
      r(
        c,
        x - 39,
        y + 19,
        78,
        36,
        g(c, x, y, x, y + 60, [
          [0, '#9b8e71'],
          [1, '#5f645e'],
        ]),
        6,
        '#c9ba96',
      );
      r(c, x - 32, y + 23, 64, 22, '#263f4e', 3);
      r(c, x - 12, y + 11, 24, 10, undefined, 3, '#c2b28f');
      r(c, x - 7, y + 19, 14, 36, '#b99b69', 1);
      line(
        c,
        [
          [x - 24, y + 30],
          [x - 18, y + 37],
          [x - 12, y + 29],
        ],
        '#a9bec0',
        3,
      );
      line(
        c,
        [
          [x + 17, y + 30],
          [x + 26, y + 37],
        ],
        '#a9bec0',
        3,
      );
      return;
    }
    if (s.id === 'sample') {
      if (scene.sample || scene.rover?.sample) {
        e(c, x, s.y - 26, 25, 11, undefined, '#8fbcba88');
        text(c, '✓', x, s.y - 22, 13, '#b7efd5');
        return;
      }
      e(c, x, s.y - 28, 52, 24, '#142d4355');
      e(c, x, s.y - 30, 42, 19, undefined, '#8099b05a');
      for (let i = 0; i < 7; i++) {
        const xx = x + (noise(i + 2) - 0.5) * 45,
          yy = s.y - 27 + (noise(i + 7) - 0.5) * 18;
        c.fillStyle = i % 2 ? '#a5d0d6' : '#6ca2ba';
        c.beginPath();
        c.moveTo(xx - 5, yy + 5);
        c.lineTo(xx - 4, yy - 9);
        c.lineTo(xx + 2, yy - 15 - noise(i + 4) * 4);
        c.lineTo(xx + 7, yy - 2);
        c.lineTo(xx + 4, yy + 7);
        c.closePath();
        c.fill();
        line(
          c,
          [
            [xx - 1, yy - 10],
            [xx, yy + 3],
          ],
          '#d7ecea99',
          1,
        );
      }
      glow(c, x, s.y - 31, 43, '#a4e0e224');
      return;
    }
    // A floor beacon marks the return hatch already drawn on the terrain plate.
    line(
      c,
      [
        [x - 23, s.y - 7],
        [x + 23, s.y - 7],
      ],
      '#b7e4c4',
      2,
    );
    text(c, 'BASE', x, s.y - 22, 9, '#b4ded0');
  }
  function portalGlyph(c, id, x, y, col) {
    if (id === 'water') {
      text(c, 'H₂O', x, y + 6, 16, col);
      return;
    }
    if (id === 'shield') {
      c.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * TAU - Math.PI / 2,
          px = x + Math.cos(angle) * 9,
          py = y + Math.sin(angle) * 9;
        i ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.closePath();
      c.strokeStyle = col;
      c.lineWidth = 1.6;
      c.stroke();
      return;
    }
    if (id === 'comms') {
      line(
        c,
        [
          [x - 12, y - 4],
          [x + 11, y - 4],
          [x + 6, y - 8],
        ],
        col,
        1.5,
      );
      line(
        c,
        [
          [x + 12, y + 4],
          [x - 11, y + 4],
          [x - 6, y + 8],
        ],
        col,
        1.5,
      );
      return;
    }
    r(c, x - 11, y - 5, 22, 11, undefined, 3, col);
    e(c, x - 7, y + 8, 3, 3, col);
    e(c, x + 7, y + 8, 3, 3, col);
    line(
      c,
      [
        [x - 2, y - 5],
        [x - 2, y - 10],
        [x + 7, y - 10],
      ],
      col,
      1.5,
    );
  }
  function hubEquipment(c, s, scene, time) {
    const col = palette[s.id] || palette.hub,
      x = s.x,
      y = s.y - 112;
    e(c, x + 7, y + 110, 105, 17, '#00000058');
    r(c, x - 94, y + 8, 188, 96, '#071723', 13, '#93a7b2');
    r(
      c,
      x - 86,
      y + 15,
      172,
      82,
      g(c, x, y, x, y + 100, [
        [0, '#7b8e97'],
        [0.09, '#354e5e'],
        [0.8, '#162e40'],
        [1, '#5b7788'],
      ]),
      9,
      '#adc0c3',
    );
    const preview = requestArtwork(s.id);
    if (preview?.status === 'ready') {
      c.save();
      c.beginPath();
      c.roundRect(x - 77, y + 23, 154, 65, 4);
      c.clip();
      const image = preview.image,
        z = Math.max(154 / image.width, 65 / image.height),
        sw = 154 / z,
        sh = 65 / z;
      c.drawImage(
        image,
        (image.width - sw) / 2,
        (image.height - sh) / 2,
        sw,
        sh,
        x - 77,
        y + 23,
        154,
        65,
      );
      r(c, x - 77, y + 23, 154, 65, '#03101c20');
      c.restore();
    } else
      for (let i = 0; i < 2; i++) r(c, x - 77 + i * 79, y + 23, 75, 65, '#182e3f', 4, '#557183');
    line(
      c,
      [
        [x, y + 20],
        [x, y + 91],
      ],
      col + '77',
      2,
    );
    r(c, x - 65, y + 8, 130, 3, col, 1);
    r(c, x - 29, y + 42, 58, 25, '#071723dc', 4, '#b6d1cf55');
    portalGlyph(c, s.id, x, y + 54, col);
    for (const xx of [x - 70, x + 62]) r(c, xx, y + 36, 6, 29, col + '88', 2);
    if (scene.progress?.[s.id]) text(c, '✓', x + 68, y + 30, 14, '#b8f4d0');
  }

  function stationMarker(c, s, scene, time) {
    const near = scene.nearId === s.id,
      target = scene.targetId === s.id,
      done = (scene.completed || []).includes(s.id),
      color = near ? '#ffce8b' : done ? '#99dfbd' : target ? '#a4ecd4' : '#7795a6';
    c.save();
    c.globalAlpha = near ? 0.9 : target ? 0.65 : 0.35;
    e(c, s.x, s.y, near ? 30 : 24, near ? 12 : 9, undefined, color);
    e(c, s.x, s.y, near ? 21 : 16, near ? 8 : 6, color + '11');
    if (target) {
      const yy = s.y - 13 - Math.sin(time * 3) * 2;
      line(
        c,
        [
          [s.x - 4, yy - 4],
          [s.x, yy],
          [s.x + 4, yy - 4],
        ],
        color,
        1.5,
      );
    }
    c.restore();
  }
  function astronaut(c, p, carrying, time) {
    const x = p.x,
      y = p.y,
      moving = !!p.moving,
      step = moving ? Math.sin(time * 13) : 0,
      bob = moving ? Math.abs(step) * 1.3 : Math.sin(time * 1.5) * 0.3,
      face = p.facing === 3 ? -1 : 1;
    c.save();
    c.translate(x, y - bob);
    e(c, 4, 10, 15, 5, '#00000045');
    r(c, -15, -23, 24, 27, '#5c7584', 5, '#b9c8c9');
    r(c, -16, -17, 5, 17, '#d5ac79', 2);
    for (const [xx, phase] of [
      [-9, 1],
      [2, -1],
    ]) {
      r(c, xx, 2, 8, 12 + step * phase * 2, '#bccbd0', 3);
      r(c, xx - 1, 12 + step * phase * 2, 10, 5, '#3f5667', 2);
    }
    r(
      c,
      -11,
      -22,
      23,
      29,
      g(c, -11, -22, 12, 7, [
        [0, '#f7efe0'],
        [0.5, '#d9e4e2'],
        [1, '#9eb5c0'],
      ]),
      7,
      '#e3eae4',
    );
    r(c, -11, 1, 23, 4, '#536f7c', 1);
    r(c, -5, -15, 12, 11, '#254656', 3);
    r(c, -2, -12, 6, 2, '#9bf4d4', 1);
    e(c, 5, -6, 1, 1, '#e8bb78');
    for (const [xx, phase] of [
      [-13, 1],
      [12, -1],
    ]) {
      c.save();
      c.translate(xx, -17);
      c.rotate(carrying ? phase * -0.48 : step * phase * 0.18);
      r(c, -3, 0, 6, 19, xx < 0 ? '#aec2c9' : '#e2e8df', 3);
      r(c, -3, 14, 6, 6, '#5b7482', 2);
      c.restore();
    }
    e(
      c,
      0,
      -30,
      14,
      14,
      g(c, -14, -44, 14, -15, [
        [0, '#fff8e6'],
        [0.6, '#d8e2dd'],
        [1, '#839fab'],
      ]),
      '#edf1e6',
    );
    e(
      c,
      face * 2,
      -30,
      10.5,
      9,
      g(c, -10, -40, 10, -21, [
        [0, '#dbc28d'],
        [0.2, '#857148'],
        [0.45, '#12384b'],
        [1, '#466c76'],
      ]),
      '#bba577',
    );
    line(
      c,
      [
        [-7, -34],
        [1, -37],
        [9, -33],
      ],
      '#f5eed48a',
      2.2,
    );
    line(
      c,
      [
        [-6, -25],
        [9, -28],
      ],
      '#94d1d670',
      1.5,
    );
    r(c, -6, -44, 13, 2, '#ecc285', 1);
    line(
      c,
      [
        [10, -42],
        [13, -49],
      ],
      '#a4bbc3',
      1.4,
    );
    e(c, 13, -50, 1.7, 1.7, '#a1edd9');
    if (carrying) {
      r(c, -16, -7, 32, 24, '#546f7a', 4, '#b5c6c4');
      r(
        c,
        -12,
        -4,
        24,
        18,
        carrying === 'water'
          ? '#5d9dad'
          : carrying === 'sample'
            ? '#9dbfc1'
            : carrying === 'regolith'
              ? '#8c9a9d'
              : carrying === 'polymer'
                ? '#96b595'
                : '#a5b2b5',
        2,
      );
      r(c, -3, -6, 6, 21, '#c8ad75', 1);
    }
    c.restore();
  }
  function pix(c, x, y, time) {
    c.save();
    c.translate(x, y + Math.sin(time * 2.3) * 2.5);
    e(c, 0, 13, 10, 3, '#00000035');
    glow(c, 0, 6, 18, '#8ce5d51a');
    line(
      c,
      [
        [-12, -4],
        [-16, -1],
        [-16, 5],
      ],
      '#ae8d5b',
      2,
    );
    line(
      c,
      [
        [12, -4],
        [16, -1],
        [16, 5],
      ],
      '#ae8d5b',
      2,
    );
    r(
      c,
      -12,
      -12,
      24,
      20,
      g(c, 0, -12, 0, 8, [
        [0, '#f3cc89'],
        [1, '#ba8c51'],
      ]),
      6,
      '#f9deb0',
    );
    r(c, -9, -8, 18, 10, '#102b3e', 3);
    e(c, -4, -3, 2, 2, '#a4f7de');
    e(c, 4, -3, 2, 2, '#a4f7de');
    line(
      c,
      [
        [0, -12],
        [0, -18],
      ],
      '#a9c0c5',
      1,
    );
    e(c, 0, -19, 1.6, 1.6, '#b3f4dc');
    r(c, -4, 9, 8, 3, '#5b7884', 1);
    c.restore();
  }
  function roverTerrain(c, scene, time) {
    if (!scene.rover || !scene.rover.active) return;
    const map = scene.rover.map || scene.map;
    if (!Array.isArray(map)) return;
    const cell = 45,
      ox = 290,
      oy = 145;
    for (let y = 0; y < map.length; y++)
      for (let x = 0; x < map[y].length; x++) {
        const value = map[y][x],
          xx = ox + x * cell,
          yy = oy + y * cell;
        r(
          c,
          xx,
          yy,
          cell - 2,
          cell - 2,
          value === '#' ? '#354a5e' : x >= 4 && y <= 2 ? '#42475b' : '#43596b',
          2,
        );
        if (value === '#')
          e(c, xx + cell * 0.5, yy + cell * 0.55, cell * 0.3, cell * 0.19, '#7e8c98');
      }
    rover(
      c,
      ox + scene.rover.x * cell + cell * 0.5,
      oy + scene.rover.y * cell + cell * 0.5,
      time,
      0.7,
    );
  }
  function challengeDetails(scene) {
    try {
      return (scene.challenge && root.LunarAcademyPlay?.challengeState?.(scene)) || null;
    } catch {
      return null;
    }
  }
  function liveEquipment(c, s, scene, time) {
    const challenge = scene.challenge,
      details = challengeDetails(scene),
      solved = scene.solvedChallenges || [];
    const mapping = { purify: 'flow', shelter: 'shield', antenna: 'signal', sample: 'drill' },
      key = mapping[s.id];
    if (!key) return;
    const active = challenge?.id === key,
      done = solved.includes(key),
      x = s.x,
      y = s.y - 100;
    if (active || done) {
      glow(c, x, y + 37, 75, done ? '#8cf1c51b' : '#ffbe7224');
      e(c, x, s.y - 2, 37, 13, undefined, done ? '#a4edc2aa' : '#ffce8b99');
    }
    if (key === 'flow') {
      const value = details?.flow ?? (done ? 24 : 0),
        target = details?.target ?? 24;
      r(c, x - 33, y + 13, 66, 15, '#051521', 3, '#86aab466');
      text(
        c,
        active ? value + ' / ' + target : done ? 'FLOW ✓' : 'FLOW',
        x,
        y + 24,
        8,
        active ? '#ffd096' : '#a5e3de',
      );
      if (active)
        for (let i = 0; i < 4; i++) {
          const px = x - 28 + ((time * 32 + i * 17) % 56);
          e(c, px, y + 66, 2, 1.5, '#a4edf2');
        }
    }
    if (key === 'shield') {
      const targets = details?.targets || [1, 2, 3, 6, 7, 8, 11, 12, 13];
      c.save();
      c.globalAlpha = active ? 0.7 : done ? 0.6 : 0.18;
      for (let index = 0; index < 15; index++) {
        const col = index % 5,
          row = Math.floor(index / 5);
        r(
          c,
          x - 33 + col * 13.5,
          y + 18 + row * 14,
          11,
          11,
          targets.includes(index) ? (done ? '#a8ddbd' : '#d8aa76') : '#233f51',
          2,
          '#b9d4cb33',
        );
      }
      c.restore();
      if (active || done) {
        c.save();
        c.globalAlpha = done ? 0.2 : 0.45;
        for (let i = 0; i < 9; i++) {
          const px = x - 145 + ((time * 48 + i * 37) % 290),
            py = y - 18 - (i % 3) * 12;
          line(
            c,
            [
              [px, py],
              [px + 9, py + 4],
            ],
            done ? '#8ae7b6' : '#e9b073',
            1.3,
          );
        }
        c.restore();
      }
    }
    if (key === 'signal') {
      const quality = details?.quality ?? (done ? 100 : 0);
      r(c, x - 28, y + 67, 56, 16, '#081925', 3, '#a4c5d055');
      text(c, quality + '%', x, y + 79, 9, quality >= 90 ? '#a8ecc9' : '#efc28f');
      if (active || done) {
        c.save();
        c.strokeStyle = done ? '#a4f2cc' : '#e6bd83';
        c.globalAlpha = 0.55;
        for (let i = 0; i < 3; i++) {
          const rr = 22 + ((time * 18 + i * 18) % 58);
          c.beginPath();
          c.arc(x, y - 10, rr, -2.45, -0.95);
          c.stroke();
        }
        c.restore();
      }
    }
    if (key === 'drill') {
      if (active) {
        const heat = Math.max(0, Math.min(1, (details?.heat || 0) / (details?.heatLimit || 60)));
        line(
          c,
          [
            [x - 37, s.y - 13],
            [x + 37, s.y - 13],
          ],
          '#a8dae955',
          1,
        );
        const scan = x - 34 + (Math.sin(time * 2) * 0.5 + 0.5) * 68;
        line(
          c,
          [
            [scan, s.y - 67],
            [scan, s.y - 8],
          ],
          '#a9f1dc77',
          1,
        );
        r(c, x - 28, s.y - 76, 56, 12, '#061725', 3, '#7ea7b766');
        r(c, x - 25, s.y - 73, 50 * heat, 6, heat > 0.75 ? '#f4a06b' : '#91dcd0', 2);
      }
      if (done) text(c, 'CORE ✓', x, s.y - 64, 8, '#b5efd4');
    }
    if (
      scene.effect?.kind === 'challenge-success' &&
      (scene.effect.id === s.id || scene.effect.id === key)
    ) {
      const age = scene.effect.age || 0,
        progress = clamp(age / (scene.effect.duration || 1.2), 0, 1);
      c.save();
      c.globalAlpha = 1 - progress;
      c.strokeStyle = '#c0f7d3';
      c.lineWidth = 1.6;
      c.beginPath();
      c.ellipse(x, s.y - 16, 20 + progress * 48, 8 + progress * 17, 0, 0, TAU);
      c.stroke();
      for (let i = 0; i < 7; i++) {
        const angle = (i / 7) * TAU;
        e(
          c,
          x + Math.cos(angle) * (18 + progress * 35),
          s.y - 38 + Math.sin(angle) * (10 + progress * 15),
          1.6,
          1.6,
          '#c6ffe2',
        );
      }
      c.restore();
    }
  }
  function lunarObstacles(c, scene) {
    const obstacles = scene.obstacles || root.LunarAcademyPlay?.obstacles || [];
    if (scene.id !== 'rover' || !Array.isArray(obstacles)) return;
    for (const obstacle of obstacles) {
      const x = obstacle.x,
        y = obstacle.y,
        w = obstacle.w || obstacle.width || 40,
        h = obstacle.h || obstacle.height || 30;
      e(c, x + w * 0.58, y + h * 0.83, w * 0.7, h * 0.3, '#02091270');
      c.fillStyle = g(c, x, y, x + w, y + h, [
        [0, '#9fa5a7'],
        [0.2, '#73797e'],
        [0.65, '#444d59'],
        [1, '#272f39'],
      ]);
      c.beginPath();
      c.moveTo(x + w * 0.02, y + h * 0.68);
      c.lineTo(x + w * 0.13, y + h * 0.18);
      c.lineTo(x + w * 0.51, y);
      c.lineTo(x + w * 0.9, y + h * 0.2);
      c.lineTo(x + w, y + h * 0.72);
      c.lineTo(x + w * 0.69, y + h);
      c.lineTo(x + w * 0.24, y + h * 0.91);
      c.closePath();
      c.fill();
      c.save();
      c.clip();
      for (let i = 0; i < 65; i++) {
        const px = x + noise(i + x) * w,
          py = y + noise(i + y + 71) * h;
        e(
          c,
          px,
          py,
          0.4 + noise(i + 7) * 1.4,
          0.4 + noise(i + 17),
          i % 2 ? '#d0d4cc24' : '#18252d45',
        );
      }
      c.fillStyle = '#b9beb020';
      c.beginPath();
      c.moveTo(x + w * 0.14, y + h * 0.2);
      c.lineTo(x + w * 0.51, y + h * 0.04);
      c.lineTo(x + w * 0.62, y + h * 0.62);
      c.lineTo(x + w * 0.26, y + h * 0.83);
      c.closePath();
      c.fill();
      c.restore();
      line(
        c,
        [
          [x + w * 0.14, y + h * 0.2],
          [x + w * 0.51, y + h * 0.04],
          [x + w * 0.83, y + h * 0.24],
        ],
        '#d4d8ca66',
        1,
      );
      line(
        c,
        [
          [x + w * 0.51, y + h * 0.09],
          [x + w * 0.62, y + h * 0.62],
          [x + w * 0.26, y + h * 0.83],
        ],
        '#15212b70',
        1,
      );
    }
  }
  function paint(canvas, scene, time = 0, lang = 'ru') {
    if (!canvas || !scene) return;
    if (root.matchMedia?.('(prefers-reduced-motion: reduce)').matches) time = 0;
    const bounds = canvas.getBoundingClientRect(),
      w = bounds.width || 1000,
      h = bounds.height || 600,
      dpr = Math.min(root.devicePixelRatio || 1, 2),
      id = scene.id || scene.level || 'hub';
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const c = canvas.getContext('2d');
    if (!c) return;
    const follow = w < 700 || h < 360,
      pilot = scene.player || { x: 500, y: 340 },
      z = follow ? Math.max(w / 1000, h / 600, 0.72) : Math.min(w / 1000, h / 600),
      ox = follow ? clamp(w / 2 - pilot.x * z, Math.min(0, w - 1000 * z), 0) : (w - 1000 * z) / 2,
      oy = follow ? clamp(h / 2 - pilot.y * z, Math.min(0, h - 600 * z), 0) : (h - 600 * z) / 2;
    views.set(canvas, { z, ox, oy });
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    r(c, 0, 0, w, h, '#07111b');
    c.save();
    c.translate(ox, oy);
    c.scale(z, z);
    c.imageSmoothingEnabled = true;
    const generated = environment(c, id);
    const titles = {
      hub: ['НАУЧНЫЙ МОДУЛЬ', 'SCIENCE DECK'],
      water: ['ЦИКЛ ВОДЫ', 'WATER RECOVERY'],
      shield: ['ЗАЩИТА СТАНЦИИ', 'SHIELD ENGINEERING'],
      comms: ['ОБСЕРВАТОРИЯ СВЯЗИ', 'COMMUNICATIONS'],
      rover: ['ПОЛЕВАЯ ЭКСПЕДИЦИЯ', 'FIELD EXPEDITION'],
    };
    const title = titles[id] || titles.hub;
    text(
      c,
      'LUNARIS / ' + title[lang === 'en' ? 1 : 0],
      48,
      30,
      10,
      palette[id] || palette.hub,
      'left',
    );
    text(c, 'PARSEC STUDIO', 952, 30, 8, '#7c95a6', 'right', 400);
    if (id === 'water') {
      const points = (scene.stations || []).map((s) => [s.x, s.y - 34]);
      if (points.length > 1) {
        line(c, points, '#071e2e', 10);
        line(c, points, '#477b87', 5);
        line(c, points, '#a1d5d830', 1.5);
        for (let i = 0; i < points.length - 1; i++) {
          const [a, b] = [points[i], points[i + 1]],
            p = (time * 0.15 + i * 0.19) % 1;
          e(c, a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p, 3, 2, '#bcebec99');
        }
      }
    }
    const stations = [...(scene.stations || [])].sort((a, b) => a.y - b.y),
      drawStation = (s) => {
        const painter =
          id === 'hub'
            ? hubEquipment
            : id === 'water'
              ? waterEquipment
              : id === 'shield'
                ? shieldEquipment
                : id === 'comms'
                  ? commsEquipment
                  : roverEquipment;
        painter(c, s, scene, time);
        liveEquipment(c, s, scene, time);
        const label = typeof s.label === 'object' ? s.label[lang] || s.label.en : s.label;
        const labelY = s.id === 'shelter' ? s.y - 149 : s.y - 113;
        c.save();
        c.shadowColor = '#020711';
        c.shadowBlur = 4;
        text(
          c,
          label || s.id,
          s.x,
          labelY,
          10,
          (scene.completed || []).includes(s.id) ? '#cff2de' : '#d7e3e7',
        );
        c.restore();
      };
    roverTerrain(c, scene, time);
    if (id === 'rover') {
      c.save();
      c.globalAlpha = 0.24;
      c.setLineDash([5, 8]);
      line(
        c,
        [
          [600, 74],
          [600, 290],
          [965, 290],
        ],
        '#d2cdb3',
        1,
      );
      text(c, lang === 'en' ? 'COLD SHADE' : 'ХОЛОДНАЯ ТЕНЬ', 780, 279, 7.5, '#d7dedb');
      c.restore();
    }
    if (scene.path?.length) {
      c.save();
      c.setLineDash([3, 8]);
      line(
        c,
        [[scene.player.x, scene.player.y], ...scene.path.map((p) => [p.x, p.y])],
        '#b8e8df72',
        1.6,
      );
      c.restore();
      const end = scene.path.at(-1);
      e(c, end.x, end.y, 5, 2.5, undefined, '#d1f7e6bb');
    }
    lunarObstacles(c, scene);
    for (const s of stations) stationMarker(c, s, scene, time);
    const p = scene.player || { x: 500, y: 340, facing: 1 };
    if (p.moving && time) {
      for (let i = 0; i < 4; i++) {
        const off = i * 11;
        e(
          c,
          p.x + (p.facing === 3 ? 1 : -1) * off,
          p.y + 10 + (i % 2 ? 3 : -3),
          1.5,
          2.5,
          '#9db2b21f',
        );
      }
    }
    const drawHero = () => {
      pix(c, clamp(p.x - 38, 57, 945), p.y - 18, time);
      if (id === 'rover' && scene.driving) {
        if (p.moving)
          for (let i = 0; i < 7; i++) {
            const age = (time * 3 + i * 0.17) % 1,
              dx = (p.facing === 3 ? 1 : -1) * (17 + age * 36);
            e(c, p.x + dx, p.y + 5 + (i % 2 ? 8 : -8), 3 + age * 4, 1.3 + age, '#bdc6be19');
          }
        rover(c, p.x, p.y - 7, time, 1.25);
        e(c, p.x, p.y - 34, 8, 8, '#d8e1d9');
        e(c, p.x + 1, p.y - 34, 5.5, 5, '#234658');
        if (scene.sample || scene.carrying === 'ice') {
          r(c, p.x - 18, p.y + 12, 23, 15, '#9db8b9', 3, '#c5d6d1');
          r(c, p.x - 14, p.y + 14, 15, 9, '#407386', 2);
        }
      } else astronaut(c, p, scene.carrying, time);
    };
    let heroDrawn = false;
    for (const s of stations) {
      if (!heroDrawn && p.y < s.y - 7) {
        drawHero();
        heroDrawn = true;
      }
      drawStation(s);
    }
    if (!heroDrawn) drawHero();
    const nearby = (scene.stations || []).find((s) => s.id === scene.nearId);
    if (nearby) {
      const label =
        typeof nearby.label === 'object' ? nearby.label[lang] || nearby.label.en : nearby.label;
      const hint = (lang === 'en' ? 'E / ' : 'E / ') + (label || nearby.id);
      c.font = '600 9px "Segoe UI",Arial,sans-serif';
      const tw = Math.min(230, c.measureText(hint).width + 24),
        xx = clamp(p.x - tw / 2, 45, 955 - tw),
        yy = clamp(p.y + 28, 88, 534);
      r(c, xx, yy, tw, 25, '#173d34ed', 4, '#a6e7c36e');
      text(c, hint, xx + tw / 2, yy + 16, 9, '#d0f4df');
    }
    const shade = c.createRadialGradient(500, 300, 200, 500, 300, 620);
    shade.addColorStop(0, '#00000000');
    shade.addColorStop(1, generated ? '#0209142e' : '#02091466');
    r(c, 0, 0, 1000, 600, shade);
    c.restore();
    const target = (scene.stations || []).find((s) => s.id === scene.targetId);
    if (target) {
      const tx = target.x * z + ox,
        ty = target.y * z + oy;
      if (tx < 20 || ty < 24 || tx > w - 20 || ty > h - 28) {
        const dx = tx - w / 2,
          dy = ty - h / 2,
          ratio = Math.min(
            (w / 2 - 24) / Math.max(1, Math.abs(dx)),
            (h / 2 - 30) / Math.max(1, Math.abs(dy)),
          ),
          ax = w / 2 + dx * ratio,
          ay = h / 2 + dy * ratio;
        c.save();
        c.translate(ax, ay);
        e(c, 0, 0, 14, 14, '#102b2ddc', '#a5e6c26b');
        c.rotate(Math.atan2(dy, dx));
        c.fillStyle = '#bbf1d6';
        c.beginPath();
        c.moveTo(7, 0);
        c.lineTo(-4, -5);
        c.lineTo(-1, 0);
        c.lineTo(-4, 5);
        c.closePath();
        c.fill();
        c.restore();
      }
    }
    if (generated) {
      c.save();
      c.font = '700 10px Arial, sans-serif';
      const caption = 'SI-GENERATED ENVIRONMENT';
      const labelWidth = c.measureText(caption).width + 18;
      c.fillStyle = '#07111bf0';
      c.fillRect(w - labelWidth - 8, h - 29, labelWidth, 22);
      c.fillStyle = '#ffffff';
      c.textAlign = 'left';
      c.fillText(caption, w - labelWidth + 1, h - 14);
      c.restore();
    }
  }
  function toWorld(canvas, clientX, clientY) {
    const bounds = canvas.getBoundingClientRect(),
      v = views.get(canvas) || {
        z: Math.min(bounds.width / 1000, bounds.height / 600) || 1,
        ox: 0,
        oy: 0,
      };
    return { x: (clientX - bounds.left - v.ox) / v.z, y: (clientY - bounds.top - v.oy) / v.z };
  }
  root.LunarAcademyRender = Object.freeze({
    paint,
    toWorld,
    preload,
    assetStatus,
    width: 1000,
    height: 600,
  });
  preload();
})(typeof window !== 'undefined' ? window : globalThis);
