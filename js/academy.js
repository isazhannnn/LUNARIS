/* LUNARIS SCIENCE ACADEMY: four self-contained educational levels.
 * Educational numbers are illustrative except the documented ~1.3 s lunar signal time.
 * No external packages, API calls, accounts or user tracking.
 */
(function (root) {
  'use strict';
  const WATER = ['collect', 'prefilter', 'purify', 'test', 'store'];
  const SHIELD = {
    water: { mass: 4, shield: 4 },
    polymer: { mass: 3, shield: 4 },
    regolith: { mass: 5, shield: 6 },
    aluminium: { mass: 2, shield: 2 },
  };
  const roverMap = [
    '.........',
    '..##...S.',
    '..#..#...',
    '...#.....',
    '.#...##..',
    '...#.....',
    'B........',
  ];
  const R = {
    waterValid: (a) => Array.isArray(a) && a.join('|') === WATER.join('|'),
    shieldResult: (items, scenario = {}) => {
      if (
        !Array.isArray(items) ||
        items.length > 2 ||
        new Set(items).size !== items.length ||
        items.some((x) => !SHIELD[x])
      )
        return { ok: false, mass: 0, shield: 0 };
      const mass = items.reduce((s, x) => s + SHIELD[x].mass, 0),
        shield = items.reduce((s, x) => s + SHIELD[x].shield, 0);
      return {
        ok:
          items.length === 2 &&
          mass <= (scenario.maxMass ?? 8) &&
          shield >= (scenario.minProtection ?? 8),
        mass,
        shield,
      };
    },
    commValid: (x, target = 2.6) => Number.isFinite(x) && Math.abs(x - target) <= 0.06,
    roverMap,
    canStep: (x, y) => x >= 0 && x < 9 && y >= 0 && y < 7 && roverMap[y][x] !== '#',
    roverMove: (s, dx, dy) => {
      const x = s.x + dx,
        y = s.y + dy;
      if (Math.abs(dx) + Math.abs(dy) !== 1 || !R.canStep(x, y) || s.battery <= 0)
        return { ...s, moved: false };
      const cost = x >= 4 && y <= 2 ? 2 : 1;
      if (s.battery < cost) return { ...s, moved: false };
      return { ...s, x, y, battery: s.battery - cost, moved: true };
    },
    roverWin: (s) => s.x === 0 && s.y === 6 && s.sample === true && s.battery >= 0,
  };
  // Energy-aware return estimate: each destination cell has the same cost as a real move.
  R.returnCost = (start) => {
    if (!start || !R.canStep(start.x, start.y)) return Infinity;
    const queue = [{ x: start.x, y: start.y, cost: 0 }],
      best = new Map([[start.x + ',' + start.y, 0]]);
    while (queue.length) {
      queue.sort((a, b) => a.cost - b.cost);
      const p = queue.shift();
      if (p.cost !== best.get(p.x + ',' + p.y)) continue;
      if (p.x === 0 && p.y === 6) return p.cost;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const x = p.x + dx,
          y = p.y + dy;
        if (!R.canStep(x, y)) continue;
        const cost = p.cost + (x >= 4 && y <= 2 ? 2 : 1),
          key = x + ',' + y;
        if (cost < (best.get(key) ?? Infinity)) {
          best.set(key, cost);
          queue.push({ x, y, cost });
        }
      }
    }
    return Infinity;
  };
  // A seed makes a particular practice mission reproducible. Language changes never reroll it.
  R.makeVariant = (id, seed) => {
    let n = seed >>> 0 || 1;
    n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
    n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
    n = (n ^ (n >>> 16)) >>> 0;
    const next = () => {
      n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
      return n / 4294967296;
    };
    const shuffle = (a) => {
      a = [...a];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
    const variants = [
      { maxMass: 7, minProtection: 8 },
      { maxMass: 8, minProtection: 10 },
      { maxMass: 6, minProtection: 6 },
      { maxMass: 7, minProtection: 7 },
    ];
    const shield = variants[Math.floor(next() * variants.length)];
    const distance = [360000, 375000, 390000, 405000][Math.floor(next() * 4)];
    const spots = [
      { x: 7, y: 1 },
      { x: 5, y: 0 },
      { x: 8, y: 3 },
      { x: 4, y: 3 },
      { x: 6, y: 4 },
    ].filter((p) => R.returnCost(p) <= 18);
    return {
      id,
      seed: seed >>> 0,
      answerOrder: shuffle([0, 1, 2]),
      quizIndex: Math.floor(next() * 3),
      waterOrder: shuffle(WATER),
      waterSource: Math.floor(next() * 3),
      shield,
      distance,
      roundTrip: Math.round(((2 * distance) / 300000) * 10) / 10,
      sample: spots[Math.floor(next() * spots.length)],
    };
  };
  root.LunarAcademyRules = R;
  if (typeof module !== 'undefined' && module.exports) module.exports = R;
  if (!root.document) return;
  const $ = (id) => document.getElementById(id);
  const levels = ['water', 'shield', 'comms', 'rover'];
  const lesson = {
    water: {
      icon: '◉',
      source:
        'https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/',
      ru: {
        title: 'Замкнутый цикл воды',
        desc: 'Преврати использованную воду в безопасную для экипажа. Составь правильный порядок очистки.',
        fact: 'NASA исследует и применяет системы возврата воды. На МКС воду получают из конденсата и других сточных вод, затем очищают и проверяют качество.',
        question: 'Зачем проверять качество после очистки?',
        answers: [
          'Чтобы вода выглядела голубой',
          'Чтобы убедиться, что она безопасна',
          'Чтобы увеличить давление',
        ],
        correct: 1,
        steps: {
          collect: 'Собрать конденсат',
          prefilter: 'Убрать крупные примеси',
          purify: 'Очистить воду',
          test: 'Проверить качество',
          store: 'Направить в резервуар',
        },
        success: 'Вода прошла все этапы. Теперь насос может снабжать экипаж!',
        hint: 'Сначала собери воду, затем удаляй примеси, очищай, проверяй и сохраняй.',
      },
      en: {
        title: 'Closed-loop water',
        desc: 'Turn used water into safe water for the crew. Put the treatment steps in order.',
        fact: 'NASA develops water recovery systems. On the ISS, water is reclaimed from humidity condensate and other wastewater, then treated and checked for quality.',
        question: 'Why test the water after treatment?',
        answers: ['To make it look blue', 'To check that it is safe', 'To increase pressure'],
        correct: 1,
        steps: {
          collect: 'Collect condensation',
          prefilter: 'Remove large particles',
          purify: 'Purify water',
          test: 'Test its quality',
          store: 'Store clean water',
        },
        success: 'Water passed every step. The crew can now use the recycled supply!',
        hint: 'Collect, pre-filter, purify, test, and then store.',
      },
    },
    shield: {
      icon: '⬡',
      source:
        'https://www.nasa.gov/science-research/heliophysics/real-martians-how-to-protect-astronauts-from-space-radiation-on-mars/',
      ru: {
        title: 'Умное укрытие',
        desc: 'Выбери ДВА защитных материала. Защита ≥ 8, масса ≤ 8 условных единиц.',
        fact: 'Вода и материалы с высоким содержанием водорода могут снижать воздействие части космической радиации. Настоящая защита зависит от вида частиц, толщины и конструкции.',
        question: 'Почему нельзя просто добавить бесконечно толстые стены?',
        answers: [
          'Масса и ресурсы ограничены',
          'В космосе нет силы тяжести',
          'Стены притягивают Солнце',
        ],
        correct: 0,
        materials: {
          water: 'Вода',
          polymer: 'Полимер',
          regolith: 'Лунный грунт',
          aluminium: 'Алюминий',
        },
        success: 'Ты собрал укрытие с достаточной защитой и допустимой массой!',
        hint: 'Используй два материала. Некоторые варианты с высокой защитой слишком тяжёлые.',
      },
      en: {
        title: 'Smart storm shelter',
        desc: 'Pick TWO shield materials. Protection ≥ 8; mass ≤ 8 game units.',
        fact: 'Water and hydrogen-rich materials can protect against some space radiation. Real shielding depends on particle type, material thickness, and structure.',
        question: 'Why not build infinitely thick shielding?',
        answers: [
          'Mass and resources are limited',
          'There is no gravity in space',
          'Walls attract the Sun',
        ],
        correct: 0,
        materials: {
          water: 'Water',
          polymer: 'Polymer',
          regolith: 'Regolith',
          aluminium: 'Aluminium',
        },
        success: 'Your shelter has enough protection without exceeding the mass budget!',
        hint: 'Pick two materials. Some strong combinations are too heavy.',
      },
    },
    comms: {
      icon: '◈',
      source:
        'https://science.nasa.gov/mission/webb/science-overview/science-explainers/how-does-webb-see-back-in-time/',
      ru: {
        title: 'Ответ с Земли',
        desc: 'Радиосигнал не мгновенный. Выставь минимальное примерное время «Луна → Земля → Луна».',
        fact: 'Свет и радиоволны идут от Земли до Луны примерно 1,3 секунды в одну сторону. Чтобы получить ответ, потребуется примерно 2,6 секунды только на путь сигнала.',
        question: 'Почему ответ с Земли приходит с задержкой?',
        answers: [
          'У радио есть масса',
          'Свету нужно время на путь',
          'Лунный воздух тормозит Wi-Fi',
        ],
        correct: 1,
        success: 'Верно! Для обмена сигналами необходимо учитывать время движения света.',
        hint: 'Около 1,3 секунды в одну сторону. Ответ проходит путь дважды.',
      },
      en: {
        title: 'Message from Earth',
        desc: 'Radio signals are not instant. Set the approximate minimum Moon → Earth → Moon travel time.',
        fact: 'Light and radio signals travel from Earth to the Moon in about 1.3 seconds one way. A round trip takes roughly 2.6 seconds of travel time alone.',
        question: 'Why does a reply from Earth take time?',
        answers: ['Radio has mass', 'Light needs time to travel', 'Lunar air slows down Wi-Fi'],
        correct: 1,
        success: 'Correct! Space communication must account for light-travel time.',
        hint: 'About 1.3 seconds one way. A reply travels both ways.',
      },
    },
    rover: {
      icon: 'R',
      source: 'https://science.nasa.gov/moon/moon-water-and-ices/',
      ru: {
        title: 'Ледяной кратер',
        desc: 'Проведи ровер к отметке S, собери образец и вернись на базу B. В теневых зонах батарея тратится быстрее.',
        fact: 'В некоторых постоянно затенённых областях у лунных полюсов обнаружен водяной лёд. Роботам важно планировать маршруты с учётом энергии и опасностей.',
        question: 'Почему в глубоком полярном кратере может сохраняться лёд?',
        answers: [
          'Солнечный свет туда почти не попадает',
          'Там всегда идёт дождь',
          'Лёд создают радиоволны',
        ],
        correct: 0,
        success: 'Ровер вернулся с образцом. У миссии есть новые данные о лунных ресурсах!',
        hint: 'Тёмные клетки в верхней правой части карты расходуют больше энергии. Избегай ненужных поворотов.',
      },
      en: {
        title: 'Ice crater rover',
        desc: 'Drive to S, collect a sample, then return to base B. Shaded zones drain more battery.',
        fact: 'Water ice has been found in some permanently shadowed regions near the lunar poles. Robotic missions need to plan routes around power and terrain limits.',
        question: 'Why can ice survive in deep polar craters?',
        answers: [
          'Sunlight rarely reaches them',
          'It rains there every day',
          'Radio waves make ice',
        ],
        correct: 0,
        success: 'The rover returned with its sample. The mission gained valuable lunar data!',
        hint: 'Darker cells on the upper-right cost more energy. Avoid detours.',
      },
    },
  };
  const ui = {
    ru: {
      tag: 'КОСМИЧЕСКАЯ АКАДЕМИЯ',
      title: 'Научные миссии',
      intro:
        'Четыре дополнительных игровых уровня. Сначала экспериментируй, затем ответь на короткий вопрос и узнай настоящее объяснение NASA.',
      back: 'К главному меню',
      play: 'Запустить уровень',
      done: 'Завершено',
      new: 'Не пройдено',
      completed: 'пройдено',
      level: 'УРОВЕНЬ',
      ready: 'Проверить',
      reset: 'Сбросить',
      hint: 'Подсказка PIX',
      next: 'Другой уровень',
      incorrect: 'Пока неверно. Попробуй ещё раз.',
      solved: 'Эксперимент выполнен!',
      learn: 'Почему это работает',
      quiz: 'Проверь знания',
      check: 'Ответить',
      again: 'Попробовать ещё раз',
      all: 'К выбору миссий',
      source: 'Научный источник NASA',
      gameValues:
        'Баллы защиты, масса и батарея — условные учебные единицы; не инженерные измерения.',
      select: 'Выбери шаг',
      remove: 'Убрать',
      chosen: 'Порядок',
      mass: 'Масса',
      protection: 'Защита',
      commVal: 'Время ответа',
      battery: 'Батарея',
      sample: 'Образец',
      collect: 'Взять образец',
      roverHelp: 'Стрелки / WASD / кнопки ниже. Двигайся по клеткам, избегай камней.',
      win: 'Уровень пройден!',
      progress: 'Значки исследователя сохраняются в браузере.',
      animation: 'Анимированная учебная модель',
      checkQuiz: 'Выбери ответ.',
      correct: 'Правильно! Знание закреплено.',
      wrongQuiz: 'Не совсем. Обрати внимание на объяснение и попробуй ещё.',
    },
    en: {
      tag: 'SPACE SCIENCE ACADEMY',
      title: 'Science missions',
      intro:
        'Four bonus playable levels. Experiment first, answer a short question, then discover the real NASA science behind it.',
      back: 'Main menu',
      play: 'Start level',
      done: 'Completed',
      new: 'Not completed',
      completed: 'completed',
      level: 'LEVEL',
      ready: 'Check result',
      reset: 'Reset',
      hint: 'PIX hint',
      next: 'Another level',
      incorrect: 'Not yet. Try again.',
      solved: 'Experiment complete!',
      learn: 'Why it works',
      quiz: 'Knowledge check',
      check: 'Submit answer',
      again: 'Try again',
      all: 'Choose missions',
      source: 'NASA science source',
      gameValues:
        'Shield, mass and battery points are educational game units, not engineering measurements.',
      select: 'Choose a step',
      remove: 'Remove',
      chosen: 'Sequence',
      mass: 'Mass',
      protection: 'Protection',
      commVal: 'Round-trip time',
      battery: 'Battery',
      sample: 'Sample',
      collect: 'Collect sample',
      roverHelp: 'Arrow keys / WASD / buttons below. Move on the grid; avoid rocks.',
      win: 'Level complete!',
      progress: 'Explorer badges are stored locally in this browser.',
      animation: 'Animated learning model',
      checkQuiz: 'Choose an answer.',
      correct: 'Correct! Knowledge unlocked.',
      wrongQuiz: 'Not quite. Read the explanation and try again.',
    },
  };
  const coaching = {
    water: {
      ru: {
        subject: 'БИОЛОГИЯ / СИСТЕМЫ',
        scenario:
          'На «Лунарисе» нет водопровода с Земли. Помоги PIX вернуть воду в общий запас — в правильном порядке.',
        why: [
          'Цвет не показывает наличие растворённых примесей или микробов. Нужна проверка качества.',
          'Да. Даже прозрачную воду проверяют: внешний вид не гарантирует безопасность.',
          'Очистка и проверка решают задачу качества. Давление регулирует насос.',
        ],
        stepWhy: {
          collect: 'Сначала нужен источник: собираем использованную воду.',
          prefilter: 'Крупные частицы убирают до более тонкой очистки.',
          purify: 'Теперь удаляем примеси, оставшиеся после предварительной фильтрации.',
          test: 'Проверка подтверждает результат очистки.',
          store: 'В резервуар направляют проверенную воду.',
        },
      },
      en: {
        subject: 'BIOLOGY / SYSTEMS',
        scenario:
          'Lunaris has no water pipe from Earth. Help PIX return water to the shared supply in the right order.',
        why: [
          'Colour cannot reveal dissolved contaminants or microbes. Quality needs testing.',
          'Yes. Clear water still needs testing: appearance does not guarantee safety.',
          'Treatment and testing address water quality. A pump regulates pressure.',
        ],
        stepWhy: {
          collect: 'First we need a source: collect used water.',
          prefilter: 'Remove large particles before finer treatment.',
          purify: 'Now remove contaminants left after pre-filtering.',
          test: 'Testing checks that treatment worked.',
          store: 'Only tested water goes into the clean supply.',
        },
      },
    },
    shield: {
      ru: {
        subject: 'ФИЗИКА / ОПТИМИЗАЦИЯ',
        scenario:
          'В грузовом отсеке ограничено место и запас материалов. Найди защиту, которая вписывается в бюджет миссии.',
        why: [
          'Да. Защитное решение должно учитывать доступную массу и материалы.',
          'Сила тяжести есть и на Луне, и в космосе. Здесь выбор ограничивает масса материалов.',
          'Материалы не притягивают Солнце. Толщину ограничивают ресурсы и конструкция.',
        ],
      },
      en: {
        subject: 'PHYSICS / OPTIMISATION',
        scenario:
          'The cargo bay has limited space and materials. Find protection that fits the mission budget.',
        why: [
          'Yes. A practical shield must fit the available mass and material budget.',
          'Gravity exists on the Moon and in space. Here, material mass limits the design.',
          'Walls do not attract the Sun. Resources and structure limit their thickness.',
        ],
      },
    },
    comms: {
      ru: {
        subject: 'ФИЗИКА / МАТЕМАТИКА',
        scenario:
          'Алекс отправил сообщение. Сколько минимум ждать ответа, если Земля ответит сразу? Посчитай путь туда и обратно.',
        why: [
          'Радиоволны — электромагнитное излучение. Задержку здесь определяет время распространения.',
          'Верно. Сигнал проходит расстояние со скоростью света: около 1,3 с туда и столько же обратно.',
          'На Луне почти нет атмосферы. Такая задержка связана с расстоянием, а не с воздухом.',
        ],
      },
      en: {
        subject: 'PHYSICS / MATHS',
        scenario:
          'Alex sent a message. How soon could an instant reply arrive? Count both the outward and return journeys.',
        why: [
          'Radio waves are electromagnetic radiation. The delay here comes from travel time.',
          'Correct. The signal travels at light speed: about 1.3 seconds each way.',
          'The Moon has almost no atmosphere. This delay comes from distance, not air.',
        ],
      },
    },
    rover: {
      ru: {
        subject: 'ГЕОГРАФИЯ / ПЛАНИРОВАНИЕ',
        scenario:
          'Образец нужен ботанику, но ровер должен вернуться. Сравни запас батареи с ценой обратного маршрута.',
        why: [
          'Верно. В постоянной тени может сохраняться достаточно низкая температура для льда.',
          'На Луне не идут земные дожди: у неё почти нет атмосферы. Лёд сохраняется в очень холодных затенённых местах.',
          'Радиосвязь передаёт данные. Сохранение льда связано с холодом и отсутствием прямого солнечного света.',
        ],
      },
      en: {
        subject: 'GEOGRAPHY / PLANNING',
        scenario:
          'The botanist needs a sample, but the rover must return. Compare battery reserve with the cost of the trip home.',
        why: [
          'Correct. Permanent shade can keep temperatures low enough to preserve ice.',
          'The Moon has no Earth-like rain: it has almost no atmosphere. Ice can survive in very cold shadowed places.',
          'Radio carries information. Ice survives because of cold conditions and a lack of direct sunlight.',
        ],
      },
    },
  };
  const questionBanks = {
    water: {
      ru: [
        {
          question: 'Почему крупные частицы удаляют до тонкой очистки?',
          answers: [
            'Чтобы снизить нагрузку на следующие ступени',
            'Чтобы вода исчезла',
            'Чтобы увеличить солёность',
          ],
          correct: 0,
          why: [
            'Верно. Предварительная фильтрация помогает следующим ступеням обработки.',
            'Очистка возвращает воду в запас, а не уничтожает её. Сначала убирают крупные примеси.',
            'Цель предварительной фильтрации — убрать крупные частицы, а не добавить соли.',
          ],
        },
        {
          question: 'Какой запас подходит для резервуара чистой воды?',
          answers: [
            'Любая прозрачная вода',
            'Вода после очистки и проверки',
            'Неочищенный конденсат',
          ],
          correct: 1,
          why: [
            'Прозрачность не гарантирует безопасность. Нужны очистка и проверка.',
            'Верно. Качество проверяют до передачи воды в чистый резервуар.',
            'Конденсат — источник для обработки. Сам по себе он ещё не прошёл все этапы.',
          ],
        },
      ],
      en: [
        {
          question: 'Why remove large particles before finer treatment?',
          answers: [
            'To reduce the load on later stages',
            'To make the water disappear',
            'To increase salinity',
          ],
          correct: 0,
          why: [
            'Correct. Pre-filtering helps the later treatment stages.',
            'Treatment recovers water; it does not destroy it. Large particles are removed first.',
            'Pre-filtering removes large particles rather than adding salt.',
          ],
        },
        {
          question: 'Which water belongs in the clean-water tank?',
          answers: [
            'Any water that looks clear',
            'Water that was treated and tested',
            'Untreated condensation',
          ],
          correct: 1,
          why: [
            'Clarity does not guarantee safety. Treatment and testing are needed.',
            'Correct. Quality is tested before water enters the clean supply.',
            'Condensation is a source for treatment. It has not yet completed all the stages.',
          ],
        },
      ],
    },
    shield: {
      ru: [
        {
          question: 'Защита достаточна, но масса выше лимита. Что сделать?',
          answers: [
            'Игнорировать лимит',
            'Сравнить более лёгкие сочетания',
            'Убрать все защитные материалы',
          ],
          correct: 1,
          why: [
            'Решение должно выполнять оба условия: защиту и ограничение массы.',
            'Верно. Ищи сочетание, которое удовлетворяет обоим ограничениям.',
            'Без материала защита станет недостаточной. Лучше сравнить другие сочетания.',
          ],
        },
        {
          question: 'Что показывают баллы защиты в этой игре?',
          answers: [
            'Точную дозу радиации',
            'Абсолютную безопасность',
            'Упрощённое сравнение игровых вариантов',
          ],
          correct: 2,
          why: [
            'Реальная доза зависит от частиц, материала, толщины и других условий. Баллы условны.',
            'Укрытие снижает риск, но не создаёт абсолютную безопасность.',
            'Верно. Это учебная модель; настоящий расчёт защиты гораздо сложнее.',
          ],
        },
      ],
      en: [
        {
          question: 'Protection is enough, but mass is over budget. What next?',
          answers: ['Ignore the budget', 'Compare lighter combinations', 'Remove all shielding'],
          correct: 1,
          why: [
            'The design must meet both conditions: protection and mass.',
            'Correct. Find a combination that meets both limits.',
            'Without material, protection is too low. Compare other combinations instead.',
          ],
        },
        {
          question: 'What do the protection points in this game represent?',
          answers: [
            'An exact radiation dose',
            'Absolute safety',
            'A simplified comparison of game options',
          ],
          correct: 2,
          why: [
            'A real dose depends on particles, thickness, materials and other conditions. These points are fictional.',
            'A shelter reduces risk; it does not guarantee absolute safety.',
            'Correct. This is a teaching model. Real shielding analysis is much more complex.',
          ],
        },
      ],
    },
    comms: {
      ru: [
        {
          question:
            'Если время сигнала в одну сторону равно 1,2 с, сколько займёт путь туда и обратно?',
          answers: ['0,6 с', '1,2 с', '2,4 с'],
          correct: 2,
          why: [
            'Половина времени не учитывает обратный путь. Нужно сложить два одинаковых пути.',
            '1,2 с — только одна сторона. Ответ должен пройти путь обратно.',
            'Верно: 1,2 + 1,2 = 2,4 с, без учёта ожидания ответа.',
          ],
        },
        {
          question: 'Расстояние увеличилось, скорость сигнала прежняя. Как изменится задержка?',
          answers: ['Увеличится', 'Исчезнет', 'Уменьшится'],
          correct: 0,
          why: [
            'Верно. При той же скорости на больший путь нужно больше времени.',
            'Радиосигналу всё равно нужно время на путь.',
            'При прежней скорости большее расстояние требует больше времени.',
          ],
        },
      ],
      en: [
        {
          question: 'A signal takes 1.2 s one way. How long is the round trip?',
          answers: ['0.6 s', '1.2 s', '2.4 s'],
          correct: 2,
          why: [
            'Halving the time leaves out the return journey. Add both journeys instead.',
            '1.2 s is only one direction. The reply must travel back.',
            'Correct: 1.2 + 1.2 = 2.4 s, excluding any wait before the reply.',
          ],
        },
        {
          question: 'Distance grows, but signal speed stays the same. What happens to delay?',
          answers: ['It increases', 'It disappears', 'It decreases'],
          correct: 0,
          why: [
            'Correct. At the same speed, a longer journey takes more time.',
            'The radio signal still needs time to travel.',
            'At the same speed, greater distance requires more time.',
          ],
        },
      ],
    },
    rover: {
      ru: [
        {
          question: 'До базы нужно 8 энергии, в батарее 7. Что говорит планировщик?',
          answers: ['Запаса хватит', 'Обратный путь не обеспечен', 'Ровер мгновенно зарядится'],
          correct: 1,
          why: [
            '7 меньше 8. Нужен другой план или перезапуск учебного маршрута.',
            'Верно. При планировании важно оставить заряд на возвращение.',
            'В этой модели заряд не восстанавливается сам. Сравни запас с ценой пути.',
          ],
        },
        {
          question: 'Зачем оценивать путь обратно ещё до сбора образца?',
          answers: [
            'Чтобы не потратить весь заряд по дороге к цели',
            'Чтобы камни исчезли',
            'Чтобы образец стал легче',
          ],
          correct: 0,
          why: [
            'Верно. Достичь цели недостаточно: нужно доставить данные на базу.',
            'Планирование не убирает препятствия, а помогает обойти их.',
            'В этой модели планирование сохраняет энергию, а не меняет массу образца.',
          ],
        },
      ],
      en: [
        {
          question: 'The trip home costs 8 energy; the battery has 7. What does the planner show?',
          answers: [
            'Enough power remains',
            'The return trip is not covered',
            'The rover will instantly recharge',
          ],
          correct: 1,
          why: [
            '7 is less than 8. A different plan or practice restart is needed.',
            'Correct. A route plan must reserve enough power for the journey home.',
            'In this model, power does not refill by itself. Compare the reserve with the route cost.',
          ],
        },
        {
          question: 'Why plan the return before collecting a sample?',
          answers: [
            'To avoid spending all the power reaching the target',
            'To make rocks disappear',
            'To make the sample lighter',
          ],
          correct: 0,
          why: [
            'Correct. Reaching the target is not enough: the data must get home.',
            'Planning does not remove rocks; it helps you route around them.',
            'Here, route planning saves energy rather than changing sample mass.',
          ],
        },
      ],
    },
  };
  const KEY = 'lunaris.academy.v3';
  let progress = {};
  try {
    const p = JSON.parse(localStorage.getItem(KEY));
    if (p && typeof p === 'object' && !Array.isArray(p)) progress = p;
  } catch {}
  let lang = 'ru',
    active = null,
    phase = 'select',
    data = null,
    selectedAnswer = null,
    frame = 0,
    variant = null,
    variantSeed = (Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0,
    reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const P = root.LunarAcademyPlay;
  let scene = null,
    playKeys = new Set(),
    playStick = { x: 0, y: 0, id: null },
    lastPlayTime = 0,
    playFinishTimer = 0,
    consoleOpen = false,
    playMessage = '',
    playMessageKey = 'welcome',
    playPaused = false,
    playBlurred = false,
    playHUDStamp = 0;
  const doc = (tag, cls = '', text) => {
    const a = document.createElement(tag);
    if (cls) a.className = cls;
    if (text !== undefined) a.textContent = text;
    return a;
  };
  const b = (text, cb, cls = 'secondary') => {
    const x = doc('button', cls, text);
    x.type = 'button';
    x.addEventListener('click', cb);
    return x;
  };
  const words = () => ui[lang];
  const l = () => lesson[active][lang];
  const coach = () => coaching[active][lang];
  const quiz = () =>
    variant.quizIndex
      ? questionBanks[active][lang][variant.quizIndex - 1]
      : { question: l().question, answers: l().answers, correct: l().correct, why: coach().why };
  const shell = () => $('academy-stage');
  function academyTitle(sub) {
    $('academy-title').textContent = sub || words().title;
    $('academy-counter').textContent =
      levels.filter((x) => progress[x]).length + ' / 4 ' + words().completed;
  }
  function resetState(id, renew = false) {
    if (renew || !variant || variant.id !== id) {
      const previous = variant,
        signature = (v) =>
          !v
            ? ''
            : id === 'shield'
              ? JSON.stringify(v.shield)
              : id === 'comms'
                ? String(v.distance)
                : id === 'rover'
                  ? JSON.stringify(v.sample)
                  : v.waterSource + '|' + v.waterOrder.join('|');
      for (let i = 0; i < 32; i++) {
        variantSeed = (variantSeed + 2654435761) >>> 0;
        variant = R.makeVariant(id, variantSeed);
        if (previous?.id !== id || signature(previous) !== signature(variant)) break;
      }
    }
    if (id === 'water') data = { sequence: [] };
    if (id === 'shield') data = { materials: [] };
    if (id === 'comms') data = { seconds: 1.0 };
    if (id === 'rover') data = { x: 0, y: 6, battery: 40, sample: false, moves: 0 };
    selectedAnswer = null;
  }
  function selectScreen() {
    clearPlayInput();
    playPaused = false;
    playFinishTimer = 0;
    active = null;
    phase = 'select';
    scene = P?.fresh('hub') || null;
    consoleOpen = false;
    playMessage = '';
    playMessageKey = 'welcome';
    $('academy').classList.toggle('is-playing', !!P);
    academyTitle();
    const panel = shell();
    panel.replaceChildren();
    if (!P) {
      panel.append(
        doc(
          'div',
          'academy-load-error',
          lang === 'ru'
            ? 'Не удалось загрузить игровые модули LUNARIS V6. Обнови страницу или открой новую однофайловую версию.'
            : 'LUNARIS V6 game modules did not load. Reload the page or open the new standalone edition.',
        ),
      );
      return;
    }
    const cards = doc('div', 'academy-cards academy-expedition-grid');
    const expeditionCopy = {
      water: {
        ru: [
          'КЛАПАНЫ / ВОДНЫЙ КОНТУР',
          'Настрой два клапана, очисти пробу и доставь воду в резервуар.',
        ],
        en: [
          'VALVES / WATER RECOVERY',
          'Balance two valves, process the sample, and return clean water to storage.',
        ],
      },
      shield: {
        ru: [
          'МАТЕРИАЛЫ / СБОРКА ЗАЩИТЫ',
          'Перенеси материалы к укрытию и закрой открытые секции поворачиваемыми панелями.',
        ],
        en: [
          'MATERIALS / SHIELD ASSEMBLY',
          'Carry materials to the shelter and fit rotating panels over exposed sections.',
        ],
      },
      comms: {
        ru: [
          'ЧАСТОТА / ФАЗА СИГНАЛА',
          'Восстанови питание, настрой передатчик и дождись настоящего возвращения сигнала.',
        ],
        en: [
          'FREQUENCY / SIGNAL PHASE',
          'Restore power, tune the transmitter, and wait for the signal to return.',
        ],
      },
      rover: {
        ru: [
          'РОВЕР / ДОБЫЧА ЛЬДА',
          'Объедь камни, найди ледяной слой и добудь образец без перегрева бура.',
        ],
        en: [
          'ROVER / ICE SAMPLING',
          'Navigate around rocks, locate the ice layer, and drill without overheating.',
        ],
      },
    };
    for (const [i, id] of levels.entries()) {
      const d = lesson[id][lang],
        copy = expeditionCopy[id][lang],
        card = doc('article', 'academy-card academy-expedition-card');
      card.dataset.mission = id;
      const cover = doc('div', 'academy-expedition-cover'),
        image = doc('img', 'academy-mission-card-art');
      image.src = root.LunarAcademyAssets[id];
      image.alt = lang === 'ru' ? 'Игровая локация: ' + d.title : 'Playable location: ' + d.title;
      image.loading = 'eager';
      image.decoding = 'async';
      image.width = 1000;
      image.height = 600;
      cover.append(
        image,
        doc('span', 'academy-expedition-coordinate', '0' + (i + 6) + ' / LUNARIS'),
        doc(
          'span',
          'academy-expedition-live',
          lang === 'ru' ? 'ИГРОВАЯ ЛОКАЦИЯ' : 'PLAYABLE LOCATION',
        ),
      );
      const body = doc('div', 'academy-expedition-body');
      body.append(
        doc('p', 'academy-subject', copy[0]),
        doc('h3', '', d.title),
        doc('p', 'academy-expedition-description', copy[1]),
      );
      const row = doc('div', 'academy-card-footer');
      row.append(
        doc(
          'span',
          'academy-status ' + (progress[id] ? 'pass' : ''),
          progress[id] ? '★ ' + words().done : lang === 'ru' ? 'АЛЕКС + PIX' : 'ALEX + PIX',
        ),
        b(
          (lang === 'ru' ? 'Войти в локацию' : 'Enter location') + ' ↗',
          () => startLevel(id),
          'academy-launch',
        ),
      );
      body.append(row);
      card.append(cover, body);
      cards.append(card);
    }
    if (P) {
      panel.append(playground());
      const launcher = doc('section', 'academy-expedition-launcher');
      launcher.setAttribute(
        'aria-label',
        lang === 'ru' ? 'Четыре игровые экспедиции' : 'Four playable expeditions',
      );
      const heading = doc('header', 'academy-expedition-heading');
      heading.append(
        doc(
          'span',
          '',
          lang === 'ru' ? 'ЧЕТЫРЕ ЭКСПЕДИЦИИ / PARSEC STUDIO' : 'FOUR EXPEDITIONS / PARSEC STUDIO',
        ),
        doc('h2', '', lang === 'ru' ? 'Выбери следующую локацию' : 'Choose your next location'),
        doc(
          'p',
          '',
          lang === 'ru'
            ? 'Пройди к двери в хабе или войди в локацию ниже. Внутри ты управляешь Алексом и работаешь с оборудованием.'
            : 'Walk to a door in the hub or enter a location below. Inside, you control Alex and operate the equipment.',
        ),
      );
      launcher.append(heading, cards);
      panel.append(launcher, doc('p', 'academy-foot', words().progress));
      updatePlayHUD();
    } else
      panel.append(
        doc(
          'p',
          'academy-load-error',
          lang === 'ru'
            ? 'Загрузка игровых модулей не завершена. Обнови страницу.'
            : 'Game modules did not finish loading. Reload the page.',
        ),
      );
  }
  function startLevel(id) {
    if (!P) {
      selectScreen();
      return;
    }
    root.Lunaris.requestGameDisplay?.();
    clearPlayInput();
    playPaused = false;
    playFinishTimer = 0;
    active = id;
    phase = 'experiment';
    resetState(id, true);
    scene = P.fresh(id, variant);
    consoleOpen = false;
    playMessage = '';
    playMessageKey = 'welcome';
    drawLevel();
    root.Lunaris.say?.(statusText());
  }
  function openMission(id) {
    if (!levels.includes(id) || !P) return false;
    root.Lunaris.openAcademy();
    startLevel(id);
    return true;
  }
  function levelLayout() {
    const panel = shell();
    panel.replaceChildren();
    academyTitle(l().title);
    const head = doc('div', 'academy-level-header');
    head.append(
      doc(
        'div',
        'academy-level-index',
        'V6 / 0' + (levels.indexOf(active) + 6) + ' / PARSEC STUDIO',
      ),
      b('← ' + words().all, selectScreen, 'academy-small'),
    );
    const lead = doc(
      'p',
      'academy-record-intro',
      lang === 'ru'
        ? 'Полевое задание выполнено. Сохрани открытие: разбери результат и проверь, что помогло станции.'
        : 'Field work complete. Record your discovery: review the result and check what helped the station.',
    );
    const phases = doc('div', 'academy-learning-meter');
    phases.setAttribute('aria-label', lang === 'ru' ? 'Этапы миссии' : 'Mission stages');
    const names =
      lang === 'ru'
        ? ['Эксперимент', 'Объяснение', 'Проверка']
        : ['Experiment', 'Discover', 'Knowledge'];
    for (let i = 0; i < 3; i++) {
      const label = doc('span', '', i + 1 + ' · ' + names[i]);
      const current = phase === 'experiment' ? 0 : phase === 'science' ? 1 : 2;
      label.classList.toggle('on', i === current);
      label.classList.toggle('complete', i < current || phase === 'complete');
      phases.append(label);
    }
    const visual = doc('figure', 'academy-illustration academy-record-scene');
    const canvas = doc('canvas');
    canvas.id = 'academy-visual';
    canvas.width = 1000;
    canvas.height = 600;
    canvas.dataset.scene = active;
    canvas.setAttribute(
      'aria-label',
      (lang === 'ru' ? 'Локация после выполнения задания: ' : 'Completed mission location: ') +
        l().title,
    );
    visual.append(
      canvas,
      doc(
        'figcaption',
        '',
        lang === 'ru' ? 'ЖУРНАЛ ЭКСПЕДИЦИИ · ' + l().title : 'EXPEDITION RECORD · ' + l().title,
      ),
    );
    const work = doc('div', 'academy-work');
    work.id = 'academy-work';
    panel.append(head, phases, lead, visual, work);
    return work;
  }
  function hintBox(work) {
    work.append(
      b(
        '✦ ' + words().hint,
        () => {
          const tip = $('academy-hint');
          tip.textContent =
            active === 'comms'
              ? lang === 'ru'
                ? 'Время = расстояние / скорость. Ответ проходит путь дважды: 2 × расстояние / 300 000.'
                : 'Time = distance / speed. A reply travels both ways: 2 × distance / 300,000.'
              : l().hint;
          tip.hidden = !tip.hidden;
        },
        'academy-small',
      ),
      doc('p', 'academy-hint'),
    );
    work.lastElementChild.id = 'academy-hint';
    work.lastElementChild.hidden = true;
  }
  function message(work) {
    const m = doc('p', 'academy-message');
    m.id = 'academy-message';
    m.setAttribute('role', 'status');
    work.append(m);
    return m;
  }
  function fail(detail) {
    const m = $('academy-message');
    if (m) m.textContent = typeof detail === 'string' ? detail : words().incorrect;
  }
  function success() {
    phase = 'science';
    drawLevel();
  }
  function drawLevel() {
    if (!active) return;
    if (!P) {
      selectScreen();
      return;
    }
    $('academy').classList.toggle('is-playing', phase === 'experiment');
    if (phase === 'experiment') {
      drawPlayable();
      return;
    }
    const work = levelLayout();
    if (phase === 'science') return scienceView(work);
    if (phase === 'quiz') return quizView(work);
    if (phase === 'complete') return completeView(work);
    if (active === 'water') waterView(work);
    if (active === 'shield') shieldView(work);
    if (active === 'comms') commsView(work);
    if (active === 'rover') roverView(work);
  }
  const playCopy = {
    welcome: [
      'Я рядом, Алекс. Иди к подсвеченному оборудованию. Подойди и нажми E или кнопку действия.',
      'I’m here, Alex. Walk to the highlighted equipment and press E or the action button.',
    ],
    move_near: [
      'Подойди ближе к оборудованию. Нажми на пол, чтобы выбрать путь.',
      'Move closer to the equipment. Tap the floor to choose a route.',
    ],
    water_done: [
      'Этот этап уже выполнен. Перенеси пробу к следующей установке.',
      'This step is complete. Carry the sample to the next machine.',
    ],
    water_order: [
      'Сначала нужен предыдущий этап. Загрязнения удаляют до проверки; в резервуар идёт только проверенная вода.',
      'Complete the earlier step first. Treatment comes before testing; only tested water enters storage.',
    ],
    shield_pick: [
      'Возьми материал со склада, принеси к укрытию и установи. Сравни массу и защиту.',
      'Pick a material from a rack, carry it to the shelter, and install it. Compare mass and protection.',
    ],
    shield_carry: [
      'Материал в руках. Принеси его к площадке укрытия.',
      'Material loaded. Carry it to the shelter platform.',
    ],
    shield_installed: [
      'Панель установлена. Добавь второй материал, учитывая общий бюджет.',
      'Panel installed. Add a second material within the shared budget.',
    ],
    shield_removed: [
      'Снял последнюю панель. Верни её на свой склад, затем возьми замену.',
      'Last panel removed. Return it to its rack, then choose a replacement.',
    ],
    shield_returned: [
      'Материал возвращён на склад. Теперь руки свободны.',
      'Material returned to the rack. Your hands are free.',
    ],
    shield_full: [
      'Два места уже заняты. Освободи руки на складе, затем сними последнюю панель у укрытия.',
      'Both slots are filled. Return the carried material, then remove the last panel at the shelter.',
    ],
    shield_heavy: [
      'Защиты хватает, но масса превышает лимит. У укрытия можно снять последнюю панель и заменить её.',
      'Protection is sufficient, but mass exceeds the limit. Remove the last panel at the shelter and replace it.',
    ],
    shield_weak: [
      'Масса подходит, но защиты мало. Замени последнюю панель на более эффективную.',
      'Mass fits, but protection is too low. Replace the last panel with a stronger material.',
    ],
    shield_duplicate: [
      'Нужны два разных материала. Эта панель уже установлена.',
      'Use two different materials. This panel is already installed.',
    ],
    hands_full: [
      'Руки заняты. Отнеси груз к укрытию или верни его на свой склад.',
      'Your hands are full. Deliver the material or return it to its rack.',
    ],
    shield_ready: [
      'Укрытие собрано. Защита и масса соответствуют условиям!',
      'Shelter assembled. Protection and mass both meet the requirements!',
    ],
    comms_power: [
      'Питание включено. Иди к расчётному терминалу: t = 2d / c.',
      'Power restored. Walk to the timing console: t = 2d / c.',
    ],
    comms_needpower: [
      'Сначала включи питание антенны у генератора.',
      'First restore antenna power at the generator.',
    ],
    comms_calculate: [
      'Посчитай путь туда и обратно. Данные миссии — на панели терминала.',
      'Count the outward and return journeys. Read the mission data on the console.',
    ],
    comms_wrongtiming: [
      'Умножь расстояние на 2, раздели на 300 000 и округли до десятых секунды.',
      'Double the distance, divide by 300,000, and round to one decimal second.',
    ],
    comms_timed: [
      'Расчёт принят. Подойди к антенне и отправь сигнал.',
      'Timing accepted. Walk to the antenna and transmit.',
    ],
    comms_needtiming: [
      'Сначала рассчитай задержку на терминале.',
      'Calculate the delay at the timing console first.',
    ],
    comms_sent: [
      'Сигнал ушёл. Теперь иди к приёмнику — ответу нужно время на путь.',
      'Signal sent. Walk to the receiver; the reply needs time to travel.',
    ],
    comms_needsignal: [
      'Сначала отправь сообщение с антенны.',
      'Transmit the message at the antenna first.',
    ],
    comms_wait: [
      'Ответ ещё в пути. Свет имеет конечную скорость.',
      'The reply is still travelling. Light has a finite speed.',
    ],
    comms_received: [
      'Сигнал получен. Ты восстановил связь и проверил расчёт!',
      'Reply received. You restored the link and checked your calculation!',
    ],
    rover_tools: [
      'Инструменты собраны. Принеси их к роверу и займи место пилота.',
      'Tools collected. Bring them to the rover and board it.',
    ],
    rover_needkit: ['Сначала возьми набор пробоотбора.', 'Collect the sampling tools first.'],
    rover_driving: [
      'Ровер готов. Езжай к образцу, сохраняя энергию на возвращение. В тени расход выше.',
      'Rover ready. Drive to the sample and reserve power for the return. Shade costs extra energy.',
    ],
    rover_needvehicle: [
      'Образец нужно доставить ровером. Сначала подготовь и займи ровер.',
      'The sample needs rover transport. Prepare and board the rover first.',
    ],
    rover_sample: [
      'Образец закреплён. Возвращайся к шлюзу базы.',
      'Sample secured. Return to the base airlock.',
    ],
    rover_needsample: [
      'Сначала добудь образец. Затем вернись к этому шлюзу.',
      'Collect the sample first, then return to this airlock.',
    ],
    rover_returned: [
      'Образец доставлен, энергии хватило. Экспедиция завершена!',
      'Sample delivered with power to spare. Expedition complete!',
    ],
    rover_empty: [
      'Запас энергии закончился. Перезапусти экспедицию и выбери более короткий путь.',
      'Power is empty. Restart the expedition and plan a shorter route.',
    ],
  };
  function clearPlayInput() {
    playKeys.clear();
    playStick = { x: 0, y: 0, id: null };
    if (scene) {
      scene.destination = null;
      scene.path = [];
    }
    const knob = $('academy-stick-knob');
    if (knob) knob.style.transform = 'translate(-50%,-50%)';
  }
  function statusText() {
    if (!scene) return '';
    if (scene.challenge)
      return lang === 'ru'
        ? 'Оборудование готово. Настрой приборы на игровом пульте.'
        : 'Equipment is ready. Adjust the instruments on the control panel.';
    if (scene.status === 'rock_blocked')
      return lang === 'ru'
        ? 'Скала перекрывает путь. Объедь её или нажми на свободный грунт: навигатор найдёт обход.'
        : 'A rock blocks the route. Drive around it or tap clear terrain for a detour.';
    if (scene.status === 'challenge_paused')
      return lang === 'ru'
        ? 'Пульт закрыт. Подойди к установке, чтобы продолжить настройку.'
        : 'Panel closed. Return to the equipment to continue.';
    if (active === 'water' && scene.status.startsWith('water_')) {
      const key = scene.status.slice(6);
      if (coach().stepWhy[key]) return coach().stepWhy[key];
    }
    return (
      playCopy[scene.status]?.[lang === 'ru' ? 0 : 1] || playCopy.welcome[lang === 'ru' ? 0 : 1]
    );
  }
  function objectiveText() {
    if (!scene) return '';
    const ru = lang === 'ru',
      t = P.target(scene);
    if (scene.id === 'hub')
      return ru
        ? 'Выбери лабораторию: подойди к двери и нажми E.'
        : 'Choose a laboratory: walk to its door and press E.';
    if (scene.success)
      return ru
        ? 'Миссия выполнена! Сохраняю результаты…'
        : 'Mission complete! Recording the results…';
    if (scene.id === 'shield') {
      const r = P.shieldResult(scene),
        v = variant.shield;
      return (
        (ru ? 'Собери укрытие: ' : 'Build a shelter: ') +
        (ru ? 'масса ' : 'mass ') +
        r.mass +
        '/' +
        v.maxMass +
        ' · ' +
        (ru ? 'защита ' : 'protection ') +
        r.shield +
        '/' +
        v.minProtection
      );
    }
    if (scene.id === 'rover')
      return (
        (ru ? 'Экспедиция · энергия ' : 'Expedition · power ') +
        Math.ceil(scene.battery) +
        '/40 · ' +
        (t?.label[lang] || '')
      );
    return (ru ? 'Цель: ' : 'Objective: ') + (t?.label[lang] || '');
  }
  function inventoryText() {
    const ru = lang === 'ru';
    if (!scene) return '';
    if (scene.id === 'shield')
      return scene.carrying
        ? (ru ? 'Груз: ' : 'Carrying: ') + l().materials[scene.carrying]
        : (ru ? 'Панели: ' : 'Panels: ') + scene.installed.map((k) => l().materials[k]).join(' + ');
    if (scene.id === 'water')
      return (
        (ru ? 'Цикл воды: ' : 'Water cycle: ') +
        scene.completed.length +
        '/5 · ' +
        (scene.carrying
          ? ru
            ? 'Проба в руках'
            : 'Sample carried'
          : ru
            ? 'Свободные руки'
            : 'Hands free')
      );
    if (scene.id === 'comms')
      return (
        (ru ? 'Дистанция: ' : 'Distance: ') +
        variant.distance.toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US') +
        ' km · ' +
        (scene.replyRemaining > 0
          ? (ru ? 'Ответ через ' : 'Reply in ') + scene.replyRemaining.toFixed(1) + ' s'
          : ru
            ? 't = 2d / c'
            : 't = 2d / c')
      );
    if (scene.id === 'rover') {
      const home = scene.stations.find((t) => t.id === 'base'),
        cost = Math.ceil(Math.hypot(scene.player.x - home.x, scene.player.y - home.y) / 52);
      return (
        (scene.sample ? (ru ? 'Образец ✓' : 'Sample ✓') : ru ? 'Образец —' : 'Sample —') +
        ' · ' +
        (ru ? 'до базы минимум ' : 'home requires at least ') +
        cost
      );
    }
    return ru
      ? 'Алекс + PIX · Научный комплекс Parsec Studio'
      : 'Alex + PIX · Parsec Studio science complex';
  }
  function playground() {
    const wrapper = doc('div', 'academy-game-world'),
      world = doc('section', 'academy-playground'),
      canvas = doc('canvas');
    canvas.id = 'academy-play-canvas';
    canvas.width = 1000;
    canvas.height = 600;
    canvas.tabIndex = 0;
    canvas.setAttribute(
      'aria-label',
      lang === 'ru'
        ? 'Игровая лаборатория. WASD или стрелки — движение; E — действие.'
        : 'Playable laboratory. WASD or arrows move; E interacts.',
    );
    const hud = doc('div', 'academy-game-hud'),
      objective = doc('strong');
    objective.id = 'academy-objective';
    const near = doc('span');
    near.id = 'academy-nearby';
    hud.append(objective, near);
    const inventory = doc('div', 'academy-game-inventory');
    inventory.id = 'academy-inventory';
    const controls = doc('div', 'academy-game-controls'),
      stick = doc('div', 'academy-joystick');
    stick.id = 'academy-joystick';
    stick.setAttribute('role', 'group');
    stick.setAttribute('aria-label', lang === 'ru' ? 'Джойстик' : 'Joystick');
    const knob = doc('span', 'academy-stick-knob');
    knob.id = 'academy-stick-knob';
    stick.append(knob);
    const action = b('', physicalInteract, 'primary');
    action.id = 'academy-interact';
    const help = doc(
      'span',
      'academy-control-help',
      lang === 'ru' ? 'WASD / стрелки · E — действие' : 'WASD / arrows · E — interact',
    );
    controls.append(help, action);
    world.append(canvas, hud, inventory, stick);
    wrapper.append(world, controls);
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button > 0 || consoleOpen) return;
      e.preventDefault();
      canvas.focus({ preventScroll: true });
      let point;
      if (root.LunarAcademyRender?.toWorld)
        point = root.LunarAcademyRender.toWorld(canvas, e.clientX, e.clientY);
      else {
        const r = canvas.getBoundingClientRect();
        point = {
          x: ((e.clientX - r.x) / r.width) * 1000,
          y: ((e.clientY - r.y) / r.height) * 600,
        };
      }
      scene = P.navigate(scene, point);
    });
    const moveStick = (e) => {
      if (playStick.id !== e.pointerId) return;
      const r = stick.getBoundingClientRect(),
        radius = r.width * 0.33,
        x = e.clientX - r.left - r.width / 2,
        y = e.clientY - r.top - r.height / 2,
        len = Math.hypot(x, y),
        scale = len > radius ? radius / len : 1;
      playStick.x = len < 8 ? 0 : (x * scale) / radius;
      playStick.y = len < 8 ? 0 : (y * scale) / radius;
      knob.style.transform =
        'translate(calc(-50% + ' + x * scale + 'px),calc(-50% + ' + y * scale + 'px))';
      if (scene) scene.destination = null;
    };
    stick.addEventListener('pointerdown', (e) => {
      if (consoleOpen) return;
      e.preventDefault();
      playStick.id = e.pointerId;
      stick.setPointerCapture(e.pointerId);
      moveStick(e);
    });
    stick.addEventListener('pointermove', moveStick);
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'])
      stick.addEventListener(event, (e) => {
        if (playStick.id === e.pointerId) {
          playStick = { x: 0, y: 0, id: null };
          knob.style.transform = 'translate(-50%,-50%)';
        }
      });
    stick.addEventListener('contextmenu', (e) => e.preventDefault());
    return wrapper;
  }
  function drawPlayable() {
    clearPlayInput();
    if (!scene || scene.id !== active) scene = P.fresh(active, variant);
    academyTitle(l().title);
    const panel = shell();
    panel.replaceChildren();
    const head = doc('div', 'academy-level-header');
    head.append(
      doc(
        'span',
        'academy-level-index',
        'V6 / 0' + (levels.indexOf(active) + 6) + ' / PARSEC STUDIO',
      ),
      b('← ' + words().all, selectScreen, 'academy-small'),
    );
    const work = doc('section', 'academy-gamework');
    work.id = 'academy-work';
    const line = doc('div', 'academy-game-pix');
    line.append(doc('b', '', 'PIX ░▒▓'));
    const textLine = doc('p');
    textLine.id = 'academy-message';
    textLine.setAttribute('role', 'status');
    line.append(textLine);
    const task = doc('div', 'academy-task');
    task.id = 'academy-task';
    const actions = doc('div', 'academy-game-utility');
    const reset = b(
      words().reset,
      () => {
        resetState(active);
        scene = P.fresh(active, variant);
        playFinishTimer = 0;
        consoleOpen = false;
        drawLevel();
      },
      'academy-small',
    );
    reset.id = 'academy-reset';
    const hint = b(
      '✦ ' + words().hint,
      () => {
        scene.status = active === 'shield' ? 'shield_pick' : 'welcome';
        const target = P.target(scene);
        playMessage =
          active === 'water'
            ? l().hint
            : active === 'comms'
              ? lang === 'ru'
                ? 'Время ответа = 2 × расстояние / 300 000. Сначала включи питание, затем рассчитай задержку.'
                : 'Reply time = 2 × distance / 300,000. Restore power, then calculate the delay.'
              : active === 'rover'
                ? l().hint
                : l().hint;
        updatePlayHUD();
      },
      'academy-small',
    );
    hint.id = 'academy-hint-button';
    actions.append(
      reset,
      hint,
      doc(
        'span',
        'academy-game-keyhelp',
        lang === 'ru'
          ? 'WASD / стрелки · E / пробел · нажми на пол для пути'
          : 'WASD / arrows · E / Space · tap floor to walk',
      ),
    );
    work.append(line, task, actions);
    panel.append(head, playground(), work);
    if (consoleOpen) {
      if (scene.challenge) openGameChallenge();
      else openTimingConsole();
    } else updatePlayHUD();
  }
  function updatePlayHUD() {
    if (!scene) return;
    const nearest = P.nearest(scene),
      target = P.target(scene);
    scene.targetId = target?.id || null;
    scene.nearId = nearest?.id || null;
    scene.objective = objectiveText();
    scene.statusText = playMessage || statusText();
    scene.data = data;
    if ($('academy-objective')) $('academy-objective').textContent = scene.objective;
    if ($('academy-inventory')) $('academy-inventory').textContent = inventoryText();
    const material = active === 'shield' && nearest ? P.materials[nearest.id] : null;
    const nearLabel = nearest
      ? nearest.label[lang] +
        (material
          ? ' · ' +
            (lang === 'ru' ? 'масса ' : 'mass ') +
            material.mass +
            ' / ' +
            (lang === 'ru' ? 'защита ' : 'shield ') +
            material.shield
          : '')
      : '';
    if ($('academy-nearby'))
      $('academy-nearby').textContent = playPaused
        ? lang === 'ru'
          ? 'Пауза · Esc / P'
          : 'Paused · Esc / P'
        : nearest
          ? nearLabel + ' · E'
          : lang === 'ru'
            ? 'Подойди к оборудованию'
            : 'Walk to equipment';
    if ($('academy-interact')) {
      $('academy-interact').textContent = nearest
        ? nearest.label[lang] + ' ↗'
        : lang === 'ru'
          ? 'Действие · E'
          : 'Interact · E';
      $('academy-interact').disabled =
        !nearest || scene.success || scene.failed || consoleOpen || playPaused;
    }
    if ($('academy-message')) $('academy-message').textContent = scene.statusText;
    if ($('academy-task') && !consoleOpen) {
      const p = $('academy-task');
      p.replaceChildren();
      if (active === 'shield') {
        for (const [id, item] of Object.entries(P.materials)) {
          const card = doc(
            'span',
            'academy-material-data',
            (l().materials[id] || id) +
              ' · ' +
              (lang === 'ru' ? 'масса ' : 'mass ') +
              item.mass +
              ' / ' +
              (lang === 'ru' ? 'защита ' : 'shield ') +
              item.shield,
          );
          card.classList.toggle('on', scene.installed.includes(id));
          p.append(card);
        }
      } else if (active === 'water')
        p.textContent =
          lang === 'ru'
            ? 'Собери → отфильтруй → очисти → проверь → сохрани'
            : 'Collect → pre-filter → purify → test → store';
      else if (active === 'comms') p.textContent = 't = 2 × ' + variant.distance + ' / 300000 s';
      else if (active === 'rover')
        p.textContent =
          lang === 'ru'
            ? 'В тёмной области расход выше. Короткий путь туда должен оставлять энергию на обратный путь.'
            : 'Dark terrain costs extra energy. Reserve enough power to bring the sample home.';
    }
  }
  function syncPlayData() {
    if (!scene || !active) return;
    if (active === 'water') data.sequence = [...scene.completed];
    if (active === 'shield') data.materials = [...scene.installed];
    if (active === 'rover') {
      data.battery = Math.round(scene.battery);
      data.sample = scene.sample;
      data.x = scene.success ? 0 : Math.round((scene.player.x - 35) / 110);
      data.y = scene.success ? 6 : Math.round((scene.player.y - 80) / 75);
    }
  }
  function physicalInteract() {
    if (!scene || consoleOpen || scene.success || scene.failed || playPaused) return;
    const result = P.interact(scene);
    scene = result.scene;
    playMessage = '';
    syncPlayData();
    if (result.event?.type === 'launch') {
      startLevel(result.event.id);
      return;
    }
    if (result.event?.type === 'timing') {
      openTimingConsole();
      return;
    }
    if (result.event?.type === 'challenge') {
      openGameChallenge();
      return;
    }
    root.Lunaris.say?.(statusText());
    if (scene.success) {
      clearPlayInput();
      playFinishTimer = 1.1;
    }
    updatePlayHUD();
  }
  function openTimingConsole() {
    clearPlayInput();
    consoleOpen = true;
    const host = $('academy-task');
    host.replaceChildren();
    const panel = doc('div', 'academy-console');
    panel.id = 'academy-console';
    panel.append(
      doc('strong', '', lang === 'ru' ? 'Терминал задержки сигнала' : 'Signal timing console'),
      doc(
        'p',
        '',
        lang === 'ru'
          ? 'Радиосигнал должен пройти путь до Земли и обратно. Рассчитай t = 2d / c.'
          : 'The signal travels to Earth and back. Calculate t = 2d / c.',
      ),
    );
    const label = doc(
        'label',
        'academy-range-label',
        lang === 'ru' ? 'Время ответа' : 'Round-trip time',
      ),
      out = doc('output', '', data.seconds.toFixed(1) + ' s'),
      input = doc('input', 'academy-range');
    input.type = 'range';
    input.min = '.5';
    input.max = '5';
    input.step = '.1';
    input.value = data.seconds;
    input.id = 'academy-timing-range';
    input.setAttribute('aria-label', words().commVal);
    label.append(out);
    input.oninput = () => {
      data.seconds = Number(input.value);
      out.textContent = data.seconds.toFixed(1) + ' s';
    };
    panel.append(label, input);
    const submit = b(
      lang === 'ru' ? 'Калибровать' : 'Calibrate',
      () => {
        const r = P.setTiming(scene, data.seconds);
        scene = r.scene;
        playMessage = '';
        if (r.ok) {
          consoleOpen = false;
          host.replaceChildren();
          updatePlayHUD();
        } else updatePlayHUD();
      },
      'primary',
    );
    submit.id = 'academy-timing-submit';
    const close = b(
      lang === 'ru' ? 'Отойти от терминала' : 'Leave console',
      () => {
        consoleOpen = false;
        host.replaceChildren();
        updatePlayHUD();
      },
      'academy-small',
    );
    panel.append(submit, close);
    host.append(panel);
    updatePlayHUD();
  }
  let challengePanel = 0;
  function challengeWords(id) {
    const ru = lang === 'ru';
    return {
      flow: [
        ru ? 'Стабилизируй водный контур' : 'Stabilize the water loop',
        ru
          ? 'Два клапана подают по 2 и 3 единицы потока за шаг. Настрой нужный поток, используя не больше доступного числа шагов.'
          : 'The two valves deliver 2 and 3 flow units per step. Reach the required flow without exceeding the shared step budget.',
      ],
      shield: [
        ru ? 'Закрой уязвимые секции' : 'Cover the exposed sections',
        ru
          ? 'Выбери панель A или B. Нажми на клетку для её крепления и поверни при необходимости. Две панели должны закрыть все шесть светящихся секций без наложений.'
          : 'Select panel A or B. Tap a cell to anchor it and rotate if needed. Cover all six glowing sections without overlapping the panels.',
      ],
      signal: [
        ru ? 'Захвати опорную волну' : 'Lock onto the reference wave',
        ru
          ? 'Совмести частоту и фазу янтарной волны с голубой опорной волной. Качество захвата должно быть не ниже 97%. Шкалы — учебная модель.'
          : 'Match the amber wave’s frequency and phase to the blue reference. Reach at least 97% lock quality. These scales are a learning model.',
      ],
      drill: [
        ru ? 'Найди ледяную жилу' : 'Find the ice seam',
        ru
          ? 'Перемещай сканер по глубине до сильного эха. Затем выбери скорость бура: сигнал не ниже 94%, нагрев не выше 60, скорость не ниже 15.'
          : 'Move the depth scanner to the strongest echo. Then choose drill speed: signal at least 94%, heat no more than 60, speed at least 15.',
      ],
    }[id];
  }
  function closeGameChallenge() {
    consoleOpen = false;
    scene = P.cancelChallenge(scene);
    $('academy-challenge')?.remove();
    clearPlayInput();
    updatePlayHUD();
    $('academy-play-canvas')?.focus({ preventScroll: true });
  }
  function setGameChallenge(values) {
    const result = P.setChallenge(scene, values);
    if (result.ok) scene = result.scene;
    updateGameChallenge();
  }
  function openGameChallenge() {
    if (!scene?.challenge) return;
    clearPlayInput();
    consoleOpen = true;
    $('academy-challenge')?.remove();
    const c = P.challengeState(scene),
      words = challengeWords(c.id),
      panel = doc('section', 'academy-challenge');
    panel.id = 'academy-challenge';
    panel.dataset.kind = c.id;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', words[0]);
    const head = doc('header', 'academy-challenge-head');
    head.append(
      doc('div', 'academy-challenge-kicker', 'PIX / FIELD ENGINEERING'),
      doc('h3', '', words[0]),
    );
    const close = b('×', closeGameChallenge, 'academy-challenge-close');
    close.id = 'academy-challenge-close';
    close.setAttribute('aria-label', lang === 'ru' ? 'Закрыть пульт' : 'Close panel');
    head.append(close);
    panel.append(head, doc('p', 'academy-challenge-intro', words[1]));
    const canvas = doc('canvas', 'academy-challenge-visual');
    canvas.id = 'academy-challenge-visual';
    canvas.width = 560;
    canvas.height = c.id === 'shield' ? 200 : 180;
    canvas.setAttribute('aria-label', words[0]);
    panel.append(canvas);
    const readout = doc('p', 'academy-challenge-readout');
    readout.id = 'academy-challenge-readout';
    readout.setAttribute('aria-live', 'polite');
    panel.append(readout);
    const controls = doc('div', 'academy-challenge-controls');
    if (c.id === 'flow') {
      ['A / ×2', 'B / ×3'].forEach((title, i) => {
        const row = doc('div', 'academy-valve-control'),
          value = doc('output');
        value.id = 'academy-challenge-value-' + i;
        row.append(
          doc('strong', '', title),
          b(
            '−',
            () => {
              const values = [...scene.challenge.values];
              values[i] = Math.max(0, values[i] - 1);
              setGameChallenge(values);
            },
            'academy-challenge-step',
          ),
          value,
          b(
            '+',
            () => {
              const values = [...scene.challenge.values];
              values[i] = Math.min(6, values[i] + 1);
              setGameChallenge(values);
            },
            'academy-challenge-step',
          ),
        );
        controls.append(row);
      });
    } else if (c.id === 'shield') {
      const choices = doc('div', 'academy-panel-choices');
      ['A', 'B'].forEach((name, i) => {
        const choice = b(
          name + ' · ' + (l().materials[scene.installed[i]] || ''),
          () => {
            challengePanel = i;
            updateGameChallenge();
          },
          'academy-panel-choice',
        );
        choice.id = 'academy-panel-choice-' + i;
        choices.append(choice);
      });
      controls.append(
        choices,
        b(
          lang === 'ru' ? '↻ Повернуть панель' : '↻ Rotate panel',
          () => {
            const values = [...scene.challenge.values];
            values[challengePanel * 2 + 1] = 1 - values[challengePanel * 2 + 1];
            setGameChallenge(values);
          },
          'academy-challenge-rotate',
        ),
      );
      canvas.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const rect = canvas.getBoundingClientRect(),
          x = ((event.clientX - rect.left) / rect.width) * 560,
          y = ((event.clientY - rect.top) / rect.height) * 200,
          col = Math.floor((x - 151) / 48),
          row = Math.floor((y - 23) / 48);
        if (col >= 0 && col < 5 && row >= 0 && row < 3) {
          const values = [...scene.challenge.values];
          values[challengePanel * 2] = row * 5 + col;
          setGameChallenge(values);
        }
      });
    } else {
      const ranges =
        c.id === 'signal'
          ? [
              [lang === 'ru' ? 'Частота' : 'Frequency', 0, 20, 0.1],
              [lang === 'ru' ? 'Фаза' : 'Phase', 0, 360, 15],
            ]
          : [
              [lang === 'ru' ? 'Глубина' : 'Depth', 0, 10, 0.1],
              [lang === 'ru' ? 'Скорость бура' : 'Drill speed', 0, 100, 5],
            ];
      ranges.forEach(([title, min, max, step], i) => {
        const label = doc('label', 'academy-challenge-range'),
          line = doc('span', '', title),
          out = doc('output'),
          input = doc('input');
        out.id = 'academy-challenge-value-' + i;
        line.append(out);
        input.id = 'academy-challenge-input-' + i;
        input.type = 'range';
        input.min = min;
        input.max = max;
        input.step = step;
        input.value = c.values[i];
        input.setAttribute('aria-label', title);
        input.oninput = () => {
          const values = [...scene.challenge.values];
          values[i] = Number(input.value);
          setGameChallenge(values);
        };
        label.append(line, input);
        controls.append(label);
      });
    }
    panel.append(controls);
    const error = doc('p', 'academy-challenge-error');
    error.id = 'academy-challenge-error';
    error.setAttribute('role', 'status');
    panel.append(error);
    const submit = b(
      lang === 'ru' ? 'Применить настройку' : 'Apply configuration',
      () => {
        const result = P.submitChallenge(scene);
        scene = result.scene;
        if (!result.ok) {
          $('academy-challenge-error').textContent =
            lang === 'ru'
              ? 'Пока не подходит. Сверь показания и ограничения; попытка не расходует ресурсы.'
              : 'Not ready yet. Check the readings and constraints; trying costs no resources.';
          updateGameChallenge();
          return;
        }
        consoleOpen = false;
        panel.remove();
        syncPlayData();
        updatePlayHUD();
        root.Lunaris.say?.(statusText());
        if (scene.success) {
          clearPlayInput();
          playFinishTimer = 1.3;
        }
      },
      'primary',
    );
    submit.id = 'academy-challenge-submit';
    panel.append(submit);
    document.querySelector('.academy-playground')?.append(panel);
    updateGameChallenge();
  }
  function updateGameChallenge() {
    const c = P.challengeState(scene);
    if (!c || !$('academy-challenge')) return;
    const ru = lang === 'ru';
    c.values.forEach((value, i) => {
      const output = $('academy-challenge-value-' + i);
      if (output)
        output.textContent =
          String(Math.round(value * 10) / 10) +
          (c.id === 'drill' && i === 0 ? ' m' : c.id === 'signal' && i === 1 ? '°' : '');
    });
    let text = '';
    if (c.id === 'flow')
      text =
        (ru ? 'ПОТОК ' : 'FLOW ') +
        c.flow +
        ' / ' +
        c.target +
        ' · ' +
        (ru ? 'ШАГИ ' : 'STEPS ') +
        c.units +
        ' / ' +
        c.maxUnits;
    if (c.id === 'shield') {
      text = ru
        ? 'Янтарные точки — секции без защиты. Голубой и зелёный — панели.'
        : 'Amber dots are exposed sections. Blue and green are your panels.';
      for (let i = 0; i < 2; i++) {
        const choice = $('academy-panel-choice-' + i);
        choice?.classList.toggle('selected', challengePanel === i);
        choice?.setAttribute('aria-pressed', String(challengePanel === i));
      }
    }
    if (c.id === 'signal')
      text = (ru ? 'КАЧЕСТВО ЗАХВАТА ' : 'LOCK QUALITY ') + c.quality + '% / 97%';
    if (c.id === 'drill')
      text =
        (ru ? 'СИГНАЛ ' : 'SIGNAL ') +
        c.signal +
        '% · ' +
        (ru ? 'НАГРЕВ ' : 'HEAT ') +
        c.heat +
        ' / 60';
    $('academy-challenge-readout').textContent = text;
    $('academy-challenge-readout').classList.toggle('ready', c.ok);
    $('academy-challenge-submit').classList.toggle('ready', c.ok);
    drawChallenge(reduced ? 0 : performance.now() / 1000);
  }
  function drawChallenge(time) {
    const canvas = $('academy-challenge-visual'),
      c = P.challengeState(scene);
    if (!canvas || !c) return;
    const g = canvas.getContext('2d'),
      w = 560,
      h = canvas.height;
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#081520';
    g.fillRect(0, 0, w, h);
    g.font = '11px Consolas,monospace';
    g.textAlign = 'left';
    if (c.id === 'flow') {
      for (let i = 0; i < 2; i++) {
        const y = 47 + i * 63;
        g.strokeStyle = i ? '#9ad6b5' : '#83bedb';
        g.lineWidth = 13;
        g.beginPath();
        g.moveTo(30, y);
        g.lineTo(285, y);
        g.lineTo(330, 80);
        g.lineTo(520, 80);
        g.stroke();
        g.fillStyle = '#dbe9e9';
        g.fillText((i ? 'B ×3' : 'A ×2') + '  ' + c.values[i], 35, y - 20);
        for (let j = 0; j < c.values[i]; j++) {
          const x = 35 + ((time * 70 + j * 45) % 260);
          g.fillStyle = '#e6efce';
          g.beginPath();
          g.arc(x, y, 3, 0, 7);
          g.fill();
        }
      }
      g.fillStyle = '#243a49';
      g.fillRect(30, 148, 490, 13);
      g.fillStyle = c.ok ? '#9ae7bc' : '#ffba69';
      g.fillRect(30, 148, Math.min(490, (c.flow / Math.max(c.target + 6, 1)) * 490), 13);
      const tx = 30 + (c.target / (c.target + 6)) * 490;
      g.strokeStyle = '#ffffff';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(tx, 140);
      g.lineTo(tx, 169);
      g.stroke();
    } else if (c.id === 'shield') {
      for (let i = 0; i < 15; i++) {
        const x = 151 + (i % 5) * 48,
          y = 23 + Math.floor(i / 5) * 48;
        g.fillStyle = '#1b3041';
        g.fillRect(x, y, 44, 44);
        g.strokeStyle = '#4a6170';
        g.strokeRect(x + 0.5, y + 0.5, 44, 44);
        if (c.targets.includes(i)) {
          g.fillStyle = '#ffc16d';
          g.beginPath();
          g.arc(x + 22, y + 22, 7, 0, 7);
          g.fill();
        }
      }
      c.pieces.forEach((cells, i) => {
        g.fillStyle = i ? '#90ddb47d' : '#83bff18f';
        for (const index of cells) {
          const x = 151 + (index % 5) * 48,
            y = 23 + Math.floor(index / 5) * 48;
          g.fillRect(x + 3, y + 3, 38, 38);
          if (challengePanel === i) {
            g.strokeStyle = '#edf5e6';
            g.lineWidth = 2;
            g.strokeRect(x + 4, y + 4, 36, 36);
          }
        }
      });
      g.fillStyle = '#98b8ca';
      g.fillText('A', 84, 66);
      g.fillStyle = '#9addbb';
      g.fillText('B', 84, 120);
    } else if (c.id === 'signal') {
      g.strokeStyle = '#284252';
      g.lineWidth = 1;
      for (let x = 20; x < 550; x += 25) {
        g.beginPath();
        g.moveTo(x, 15);
        g.lineTo(x, h - 15);
        g.stroke();
      }
      for (const [values, color] of [
        [c.target, '#8dcede'],
        [c.values, '#ffbc6b'],
      ]) {
        g.strokeStyle = color;
        g.lineWidth = 2.5;
        g.beginPath();
        for (let x = 20; x <= 540; x++) {
          const y =
            90 +
            Math.sin(
              ((x - 20) / 520) * values[0] * Math.PI * 2 + (values[1] / 180) * Math.PI + time * 0.7,
            ) *
              48;
          if (x === 20) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.stroke();
      }
    } else {
      g.strokeStyle = '#81c7dd';
      g.lineWidth = 2;
      g.beginPath();
      for (let x = 25; x < 535; x++) {
        const depth = ((x - 25) / 510) * 10,
          y =
            130 -
            95 * Math.exp(-Math.pow((depth - c.iceDepth) / 0.35, 2)) -
            8 * Math.exp(-Math.pow((depth - 1.2) / 0.7, 2));
        if (x === 25) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
      const x = 25 + (c.values[0] / 10) * 510;
      g.strokeStyle = '#ffbe6c';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x, 18);
      g.lineTo(x, 138);
      g.stroke();
      g.fillStyle = '#203746';
      g.fillRect(25, 152, 510, 12);
      g.fillStyle = c.heat > 60 ? '#ee826a' : '#9adeb8';
      g.fillRect(25, 152, Math.min(510, (c.heat / 140) * 510), 12);
      g.fillStyle = '#c5dce4';
      g.fillText('0 m', 25, 145);
      g.fillText('10 m', 505, 145);
    }
  }
  function fallbackPlay(canvas, time) {
    const c = canvas.getContext('2d');
    c.clearRect(0, 0, 1000, 600);
    c.fillStyle = '#162735';
    c.fillRect(0, 0, 1000, 600);
    for (const s of scene.stations) {
      c.fillStyle = s.id === scene.targetId ? '#a7783e' : '#365263';
      c.fillRect(s.x - 35, s.y - 70, 70, 50);
      c.fillStyle = '#e0e9e8';
      c.font = '13px sans-serif';
      c.textAlign = 'center';
      c.fillText(s.label[lang], s.x, s.y - 83);
    }
    c.fillStyle = '#e8d7ad';
    c.beginPath();
    c.arc(scene.player.x, scene.player.y - 14, 17, 0, 7);
    c.fill();
    c.fillRect(scene.player.x - 13, scene.player.y - 2, 26, 30);
    c.fillStyle = '#193e50';
    c.fillRect(scene.player.x - 11, scene.player.y - 23, 22, 13);
    c.fillStyle = '#e0b16f';
    c.fillRect(scene.player.x - 43, scene.player.y - 9, 21, 18);
  }
  function waterView(work) {
    const sequence = doc('div', 'academy-flow');
    sequence.append(doc('h3', '', words().chosen + ' (' + data.sequence.length + '/5)'));
    const slots = doc('div', 'academy-step-slots');
    for (let i = 0; i < 5; i++) {
      const key = data.sequence[i];
      slots.append(
        b(
          key ? i + 1 + '. ' + l().steps[key] : '＋',
          () => {
            if (key) {
              data.sequence.splice(i, 1);
              drawLevel();
            }
          },
          'academy-step ' + (key ? 'filled' : ''),
        ),
      );
    }
    sequence.append(slots);
    const source =
      lang === 'ru'
        ? [
            'Источник: конденсат из жилого отсека.',
            'Источник: вода после использования в станции.',
            'Источник: резерв воды из неисправного бака.',
          ]
        : [
            'Source: habitat condensation.',
            'Source: used station water.',
            'Source: reserve water from a damaged tank.',
          ];
    work.append(doc('p', 'academy-live-model', source[variant.waterSource]));
    const options = doc('div', 'academy-options');
    for (const key of variant.waterOrder) {
      if (data.sequence.includes(key)) continue;
      options.append(
        b(
          l().steps[key],
          () => {
            data.sequence.push(key);
            drawLevel();
          },
          'academy-option',
        ),
      );
    }
    work.append(sequence, options);
    if (data.sequence.length) {
      const key = data.sequence[data.sequence.length - 1];
      work.append(doc('p', 'academy-explanation', coach().stepWhy[key]));
    }
    const actions = doc('div', 'academy-actions');
    actions.append(
      b(words().reset, () => {
        resetState('water');
        drawLevel();
      }),
      b(
        words().ready,
        () => {
          if (R.waterValid(data.sequence)) {
            success();
            return;
          }
          const mismatch = WATER.findIndex((key, i) => data.sequence[i] !== key);
          fail(
            (lang === 'ru' ? 'Проверь шаг ' : 'Check step ') +
              (mismatch + 1) +
              '. ' +
              coach().stepWhy[WATER[mismatch]],
          );
        },
        'primary',
      ),
    );
    work.append(actions);
    hintBox(work);
    message(work);
  }
  function shieldView(work) {
    const label = doc(
        'p',
        'academy-subtitle',
        words().select + ': ' + data.materials.length + '/2',
      ),
      grid = doc('div', 'academy-materials');
    for (const [key, item] of Object.entries(SHIELD)) {
      const box = b(
        '',
        () => {
          const i = data.materials.indexOf(key);
          if (i >= 0) data.materials.splice(i, 1);
          else if (data.materials.length < 2) data.materials.push(key);
          drawLevel();
        },
        'academy-material ' + (data.materials.includes(key) ? 'on' : ''),
      );
      box.setAttribute('aria-pressed', String(data.materials.includes(key)));
      box.append(
        doc('strong', '', l().materials[key]),
        doc(
          'small',
          '',
          words().mass + ' ' + item.mass + ' · ' + words().protection + ' ' + item.shield,
        ),
      );
      grid.append(box);
    }
    const r = R.shieldResult(data.materials, variant.shield);
    work.append(
      label,
      grid,
      doc(
        'p',
        'academy-subtitle',
        words().mass +
          ': ' +
          r.mass +
          '/' +
          variant.shield.maxMass +
          ' · ' +
          words().protection +
          ': ' +
          r.shield +
          '/' +
          variant.shield.minProtection,
      ),
    );
    const bars = doc('div', 'academy-live-model');
    for (const [name, value, target] of [
      [words().mass, r.mass, variant.shield.maxMass],
      [words().protection, r.shield, variant.shield.minProtection],
    ]) {
      const line = doc('label', '', name + ' '),
        meter = doc('meter');
      meter.min = 0;
      meter.max = 12;
      meter.value = value;
      meter.setAttribute('aria-label', name);
      line.append(meter, doc('span', '', String(value) + ' / ' + target));
      bars.append(line);
    }
    work.append(bars);
    const actions = doc('div', 'academy-actions');
    actions.append(
      b(words().reset, () => {
        resetState('shield');
        drawLevel();
      }),
      b(
        words().ready,
        () => {
          if (r.ok) {
            success();
            return;
          }
          fail(
            data.materials.length < 2
              ? lang === 'ru'
                ? 'Выбери два разных материала.'
                : 'Choose two different materials.'
              : r.mass > variant.shield.maxMass
                ? lang === 'ru'
                  ? 'Масса превышает бюджет. Замени один материал более лёгким.'
                  : 'The mass exceeds the budget. Try a lighter material.'
                : lang === 'ru'
                  ? 'Масса подходит, но защиты мало. Сравни защиту материалов и замени один из них.'
                  : 'The mass fits, but protection is too low. Compare materials and replace one.',
          );
        },
        'primary',
      ),
    );
    work.append(actions);
    hintBox(work);
    message(work);
  }
  function commsView(work) {
    const label = doc('label', 'academy-range-label', words().commVal + ' '),
      out = doc('output', '', data.seconds.toFixed(1) + ' s');
    label.append(out);
    const input = doc('input', 'academy-range');
    input.type = 'range';
    input.min = '.5';
    input.max = '5';
    input.step = '.1';
    input.value = data.seconds;
    input.setAttribute('aria-label', words().commVal);
    const given =
      lang === 'ru'
        ? 'Условие: расстояние ' +
          variant.distance.toLocaleString('ru-RU') +
          ' км; скорость сигнала ≈ 300 000 км/с.'
        : 'Given: distance ' +
          variant.distance.toLocaleString('en-US') +
          ' km; signal speed ≈ 300,000 km/s.';
    work.append(doc('p', 'academy-scenario', given));
    const formula = doc('p', 'academy-live-model', 't = 2 × ' + variant.distance + ' / 300000');
    formula.setAttribute('aria-live', 'polite');
    input.addEventListener('input', () => {
      data.seconds = +input.value;
      out.textContent = data.seconds.toFixed(1) + ' s';
      formula.textContent =
        't = 2 × ' + variant.distance + ' / 300000 → ' + data.seconds.toFixed(1) + ' s';
    });
    work.append(label, input, doc('p', 'academy-subtitle', '🌍  ⇄  🌙'), formula);
    const actions = doc('div', 'academy-actions');
    actions.append(
      b(words().reset, () => {
        resetState('comms');
        drawLevel();
      }),
      b(
        words().ready,
        () =>
          R.commValid(data.seconds, variant.roundTrip)
            ? success()
            : fail(
                lang === 'ru'
                  ? 'Учти обе стороны пути: умножь расстояние на 2, раздели на 300 000 и округли до десятых.'
                  : 'Count both directions: double the distance, divide by 300,000 and round to one decimal place.',
              ),
        'primary',
      ),
    );
    work.append(actions);
    hintBox(work);
    message(work);
  }
  function roverView(work) {
    const hud = doc('div', 'academy-rover-hud');
    hud.id = 'academy-rover-hud';
    hud.textContent =
      words().battery +
      ': ' +
      data.battery +
      ' / 40   ·   ' +
      words().sample +
      ': ' +
      (data.sample ? '✓' : '—');
    const instructions = doc('p', 'academy-subtitle', words().roverHelp);
    const pad = doc('div', 'academy-rover-controls');
    for (const [icon, dx, dy] of [
      ['◀', -1, 0],
      ['▲', 0, -1],
      ['▼', 0, 1],
      ['▶', 1, 0],
    ])
      pad.append(b(icon, () => moveRover(dx, dy), 'academy-rover-button'));
    work.append(hud, instructions, pad);
    const returnCost = R.returnCost(data),
      reserve = data.battery - returnCost;
    const estimate = doc(
      'p',
      'academy-live-model',
      lang === 'ru'
        ? 'До базы: минимум ' + returnCost + ' энергии · резерв после возвращения: ' + reserve
        : 'Return trip: at least ' + returnCost + ' energy · reserve on arrival: ' + reserve,
    );
    estimate.classList.toggle('low', reserve < 4);
    work.append(estimate);
    const actions = doc('div', 'academy-actions');
    actions.append(
      b(words().reset, () => {
        resetState('rover');
        drawLevel();
      }),
      b(
        words().collect,
        () => {
          if (data.x === variant.sample.x && data.y === variant.sample.y && !data.sample) {
            data.sample = true;
            drawLevel();
          } else
            fail(
              lang === 'ru'
                ? 'Для сбора образца подъедь к клетке S.'
                : 'Drive to cell S to collect the sample.',
            );
        },
        'primary',
      ),
      b(
        words().ready,
        () =>
          R.roverWin(data)
            ? success()
            : fail(
                lang === 'ru'
                  ? 'Нужны образец и возвращение в клетку базы B.'
                  : 'Collect the sample and return to base B.',
              ),
        'primary',
      ),
    );
    work.append(actions);
    hintBox(work);
    message(work);
  }
  function moveRover(dx, dy) {
    if (active !== 'rover' || phase !== 'experiment') return;
    const result = R.roverMove(data, dx, dy);
    if (result.moved) {
      data = result;
      data.moves++;
      drawLevel();
      if (data.battery === 0 && !R.roverWin(data)) {
        $('academy-message').textContent =
          lang === 'ru'
            ? 'Батарея пуста. Начни маршрут заново.'
            : 'Battery empty. Reset your route.';
      }
    } else
      fail(
        lang === 'ru'
          ? 'Путь закрыт или не хватает заряда. Выбери соседнюю свободную клетку.'
          : 'The path is blocked or power is too low. Choose a free adjacent cell.',
      );
  }
  function scienceView(work) {
    const badge = doc('div', 'academy-success', '✓ ' + words().solved),
      title = doc('h3', '', words().learn),
      body = doc('p', 'academy-fact', l().fact);
    const link = doc('a', 'academy-nasa', words().source + ' ↗');
    link.href = lesson[active].source;
    link.rel = 'noopener noreferrer';
    link.target = '_blank';
    work.append(badge, title, body, link, doc('p', 'academy-note', words().gameValues));
    work.append(
      b(
        words().quiz + ' →',
        () => {
          phase = 'quiz';
          drawLevel();
        },
        'primary',
      ),
    );
  }
  function quizView(work) {
    const q = quiz();
    work.append(doc('h3', '', words().quiz), doc('p', 'academy-fact', q.question));
    const choices = doc('div', 'academy-quiz');
    variant.answerOrder.forEach((i) => {
      const answer = q.answers[i],
        choice = b(
          answer,
          () => {
            selectedAnswer = i;
            work.querySelectorAll('.academy-quiz button').forEach((x) => {
              const selected = Number(x.dataset.answer) === i;
              x.classList.toggle('on', selected);
              x.setAttribute('aria-pressed', String(selected));
            });
            const note = $('academy-message');
            if (note) note.textContent = '';
          },
          'academy-quiz-choice',
        );
      choice.dataset.answer = String(i);
      choice.setAttribute('aria-pressed', String(selectedAnswer === i));
      choice.classList.toggle('on', selectedAnswer === i);
      choices.append(choice);
    });
    work.append(choices);
    const messageEl = message(work);
    work.append(
      b(
        words().check,
        () => {
          if (selectedAnswer === null) {
            messageEl.textContent = words().checkQuiz;
            return;
          }
          if (selectedAnswer !== q.correct) {
            messageEl.textContent = q.why[selectedAnswer];
            return;
          }
          progress[active] = true;
          try {
            localStorage.setItem(KEY, JSON.stringify(progress));
          } catch {}
          phase = 'complete';
          drawLevel();
        },
        'primary',
      ),
    );
  }
  function completeView(work) {
    const q = quiz();
    work.append(
      doc('div', 'academy-success', '★ ' + words().win),
      doc('h3', '', l().title),
      doc('p', 'academy-fact', l().success),
      doc('p', 'academy-explanation', q.why[q.correct]),
      doc('p', 'academy-fact', l().fact),
    );
    const row = doc('div', 'academy-actions');
    row.append(
      b(words().again, () => startLevel(active)),
      b(words().next + ' →', selectScreen, 'primary'),
    );
    work.append(row);
  }
  function renderScene(ms) {
    if ($('academy').hidden) return;
    const canvas = $('academy-visual');
    if (!canvas) return;
    if (scene && root.LunarAcademyRender?.paint) {
      root.LunarAcademyRender.paint(canvas, scene, reduced ? 0 : ms * 0.001, lang);
      return;
    }
    const g = canvas.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = '#0b1722';
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = '#d6bd99';
    g.font = '16px sans-serif';
    g.fillText(
      lang === 'ru' ? 'Игровая локация загружается…' : 'Loading the mission location…',
      35,
      55,
    );
  }
  function animate(ms) {
    const dt = lastPlayTime ? Math.min((ms - lastPlayTime) / 1000, 0.05) : 0;
    lastPlayTime = ms;
    if (!$('academy').hidden) {
      if (P && scene && (phase === 'experiment' || phase === 'select')) {
        const rotated = !$('rotate-prompt') || $('rotate-prompt').hidden;
        if (!document.hidden && !playPaused && !playBlurred && !consoleOpen && rotated) {
          const dx =
              (playKeys.has('KeyD') || playKeys.has('ArrowRight') ? 1 : 0) -
              (playKeys.has('KeyA') || playKeys.has('ArrowLeft') ? 1 : 0) +
              playStick.x,
            dy =
              (playKeys.has('KeyS') || playKeys.has('ArrowDown') ? 1 : 0) -
              (playKeys.has('KeyW') || playKeys.has('ArrowUp') ? 1 : 0) +
              playStick.y;
          scene = P.move(scene, dx, dy, dt);
          syncPlayData();
          if (playFinishTimer > 0) {
            playFinishTimer -= dt;
            if (playFinishTimer <= 0) {
              success();
              requestAnimationFrame(animate);
              return;
            }
          }
        }
        if (ms - playHUDStamp > 100) {
          updatePlayHUD();
          playHUDStamp = ms;
        }
        const canvas = $('academy-play-canvas');
        if (canvas) {
          if (root.LunarAcademyRender?.paint)
            root.LunarAcademyRender.paint(canvas, scene, reduced ? 0 : ms / 1000, lang);
          else fallbackPlay(canvas, reduced ? 0 : ms / 1000);
        }
        if (consoleOpen && scene.challenge) drawChallenge(reduced ? 0 : ms / 1000);
      } else renderScene(ms);
    }
    requestAnimationFrame(animate);
  }
  function init() {
    $('academy-open').onclick = () => {
      root.Lunaris.requestGameDisplay?.();
      root.Lunaris.openAcademy();
      selectScreen();
    };
    $('academy-back').onclick = () => {
      clearPlayInput();
      root.Lunaris.goHome();
    };
    document.addEventListener('keydown', (e) => {
      if (P && !$('academy').hidden && scene && (phase === 'experiment' || phase === 'select')) {
        if (
          document.activeElement?.matches('input,textarea,select') &&
          !['Escape', 'KeyP'].includes(e.code)
        )
          return;
        if (
          [
            'KeyW',
            'KeyA',
            'KeyS',
            'KeyD',
            'ArrowUp',
            'ArrowLeft',
            'ArrowDown',
            'ArrowRight',
          ].includes(e.code)
        ) {
          e.preventDefault();
          if (!consoleOpen && !playPaused) playKeys.add(e.code);
          return;
        }
        if (e.repeat) return;
        if (e.code === 'KeyE' || e.code === 'Space') {
          e.preventDefault();
          physicalInteract();
          return;
        }
        if (e.code === 'Escape' || e.code === 'KeyP') {
          e.preventDefault();
          clearPlayInput();
          if (consoleOpen) {
            if (scene.challenge) closeGameChallenge();
            else {
              consoleOpen = false;
              $('academy-task')?.replaceChildren();
            }
          } else playPaused = !playPaused;
          if ($('academy-nearby') && playPaused)
            $('academy-nearby').textContent =
              lang === 'ru' ? 'Пауза · Esc / P' : 'Paused · Esc / P';
          $('academy-play-canvas')?.classList.toggle('paused', playPaused);
          updatePlayHUD();
          return;
        }
        return;
      }
      if (
        $('academy').hidden ||
        active !== 'rover' ||
        phase !== 'experiment' ||
        document.activeElement?.matches('input,textarea,select')
      )
        return;
      const moves = {
        ArrowLeft: [-1, 0],
        KeyA: [-1, 0],
        ArrowRight: [1, 0],
        KeyD: [1, 0],
        ArrowUp: [0, -1],
        KeyW: [0, -1],
        ArrowDown: [0, 1],
        KeyS: [0, 1],
      };
      if (moves[e.code]) {
        e.preventDefault();
        if (!e.repeat) moveRover(...moves[e.code]);
      }
    });
    document.addEventListener('keyup', (e) => playKeys.delete(e.code));
    window.addEventListener('blur', () => {
      clearPlayInput();
      playBlurred = true;
    });
    window.addEventListener('focus', () => {
      playBlurred = false;
    });
    document.addEventListener('visibilitychange', () => {
      clearPlayInput();
    });
    root.LunarAcademy = {
      translate() {
        lang = document.documentElement.lang === 'en' ? 'en' : 'ru';
        playMessage = '';
        $('academy-back').textContent = '← ' + words().back;
        if (active) drawLevel();
        else selectScreen();
      },
      startSelection: selectScreen,
      openMission,
      progress: () => ({ ...progress }),
      getState: () => ({
        active,
        phase,
        data: data ? JSON.parse(JSON.stringify(data)) : null,
        variant: variant ? JSON.parse(JSON.stringify(variant)) : null,
        scene: scene ? JSON.parse(JSON.stringify(scene)) : null,
        consoleOpen,
        paused: playPaused,
      }),
    };
    root.LunarAcademy.translate();
    requestAnimationFrame(animate);
  }
  init();
})(typeof window !== 'undefined' ? window : globalThis);
