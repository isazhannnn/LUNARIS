(function () {
  'use strict';
  const S = window.LunarSim,
    W = window.LunarWorld,
    R = window.LunarRender;
  const $ = (id) => document.getElementById(id);
  const SAVE = 'lunaris.save.v1',
    LANG = 'lunaris.language',
    SOUND = 'lunaris.sound';
  const resourceKeys = ['energy', 'air', 'water', 'crops'];
  const colors = { energy: '#8af3d3', air: '#85ccf6', water: '#aaaefe', crops: '#c0dd8f' };
  const browserLang = 'en';
  let lang = ['ru', 'en'].includes(read(LANG)) ? read(LANG) : browserLang,
    sound = read(SOUND) === 'on';
  let saved = loadSave(),
    state = null,
    screen = 'home',
    modalView = null,
    returnFocus = null;
  let keys = new Set(),
    touches = new Map(),
    route = [],
    lastTime = 0,
    paintTime = 0,
    saveTime = 0,
    hudTime = 0;
  let toastTimer = 0,
    audio = null,
    lowSuitWarned = false,
    saveWarningShown = false,
    dustWarned = false,
    scanUntil = 0,
    scanStart = 0;
  let circuit = [],
    airValues = [1, 1, 1],
    radioValues = [20, 75];
  let stick = { x: 0, y: 0, id: null },
    touchRun = false,
    portraitAllowed = false,
    lastEvent = '',
    sidebarKey = '',
    lastChapter = -1;
  let speechUntil = 0,
    speechText = '',
    speechContext = '',
    speechNext = 0,
    speechGlyphTime = 0,
    speechToneTime = 0,
    speechCount = 0,
    pendingSpeech = null,
    dialogueDismissed = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new R.Renderer($('world'));
  const t = (key) => window.LunarText[key]?.[lang === 'ru' ? 0 : 1] ?? key;
  const content = () => window.LunarContent[lang];
  function el(tag, className = '', text) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function button(text, fn, className = 'secondary', id) {
    const b = el('button', className, text);
    b.type = 'button';
    if (id) b.id = id;
    b.addEventListener('click', fn);
    return b;
  }
  function read(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  function write(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
  function loadSave() {
    try {
      const raw = read(SAVE);
      if (!raw || raw.length > 2000000) return null;
      const value = JSON.parse(raw);
      return S.validSave(value) ? value : null;
    } catch {
      return null;
    }
  }
  function save() {
    if (!state) return;
    saved = S.copy(state);
    if (!write(SAVE, JSON.stringify(state)) && !saveWarningShown) {
      saveWarningShown = true;
      toast(t('savedError'));
    }
    $('continue').hidden = false;
  }
  function toast(message) {
    clearTimeout(toastTimer);
    $('toast').textContent = message;
    $('toast').hidden = false;
    toastTimer = setTimeout(() => ($('toast').hidden = true), 3500);
  }
  function beep(kind = 'click') {
    if (!sound) return;
    try {
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const o = audio.createOscillator(),
        g = audio.createGain(),
        now = audio.currentTime;
      o.type = 'sine';
      o.frequency.setValueAtTime(kind === 'error' ? 150 : kind === 'success' ? 640 : 420, now);
      o.frequency.exponentialRampToValueAtTime(kind === 'success' ? 960 : 230, now + 0.14);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.055, now + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      o.connect(g);
      g.connect(audio.destination);
      o.start();
      o.stop(now + 0.2);
    } catch {
      /* Audio is optional; a blocked audio context must not stop a mission. */
    }
  }
  function pixTone() {
    if (!sound) return;
    try {
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const now = audio.currentTime,
        osc = audio.createOscillator(),
        gain = audio.createGain();
      osc.type = 'square';
      const notes = [370, 554, 740, 440, 660, 330, 880];
      osc.frequency.setValueAtTime(notes[speechCount++ % notes.length], now);
      osc.frequency.setValueAtTime(notes[(speechCount + 2) % notes.length], now + 0.035);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.014, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start();
      osc.stop(now + 0.09);
    } catch {}
  }
  function speak(message, context = 'hint', force = false) {
    if (!message || !['game', 'academy'].includes(screen)) return;
    if (modalView) {
      pendingSpeech = { message, context };
      return;
    }
    const now = performance.now();
    if (!force && now < speechNext) return;
    speechContext = context;
    speechText = message;
    speechUntil = now + Math.min(15000, 5500 + message.length * 38);
    speechNext = now + 3500;
    dialogueDismissed = false;
    $('pix-subtitle').textContent = message;
    $('pix-dialogue').classList.add('visible');
    $('pix-diagnose').hidden = screen !== 'game' || !S.sabotageCase?.(state);
    $('pix-diagnose').textContent = lang === 'ru' ? '△ Проверить систему' : '△ Run diagnostics';
  }
  function animateSpeech(ms) {
    const speaking =
      ['game', 'academy'].includes(screen) &&
      !modalView &&
      $('rotate-prompt').hidden &&
      ms < speechUntil &&
      !dialogueDismissed;
    $('pix-dialogue').classList.toggle('visible', speaking);
    if (!speaking) return;
    if (ms - speechGlyphTime > 120) {
      speechGlyphTime = ms;
      const glyphs = '▘▝▞▚▟▙▛▜▐▌▀▄░▒▓';
      let words = '';
      for (let i = 0; i < 13; i++)
        words +=
          glyphs[(Math.floor(ms / 120) * 7 + i * 11) % glyphs.length] +
          (i === 3 || i === 8 ? ' ' : '');
      $('pix-glyphs').textContent = words;
    }
    if (ms - speechToneTime > 170) {
      speechToneTime = ms;
      pixTone();
    }
  }
  function clearInput() {
    keys.clear();
    touches.clear();
    route = [];
    stick = { x: 0, y: 0, id: null };
    touchRun = false;
    $('joystick-knob').style.transform = 'translate(-50%,-50%)';
    $('joystick').classList.remove('held');
    $('touch-run').setAttribute('aria-pressed', 'false');
    document.querySelectorAll('[data-dir]').forEach((b) => b.classList.remove('held'));
  }
  function isTouchDevice() {
    return navigator.maxTouchPoints > 0 || matchMedia('(pointer:coarse)').matches;
  }
  function updateOrientation() {
    const blocked =
      ['game', 'academy'].includes(screen) &&
      isTouchDevice() &&
      innerHeight > innerWidth &&
      !portraitAllowed;
    $('rotate-prompt').hidden = !blocked;
    if (blocked) clearInput();
    document.body.classList.toggle('touch-device', isTouchDevice());
  }
  function prepareDisplay() {
    if (!isTouchDevice()) return;
    const request = document.documentElement.requestFullscreen?.({ navigationUI: 'hide' });
    if (request?.then)
      request.then(() => window.screen.orientation?.lock?.('landscape')).catch(() => {});
    else {
      try {
        window.screen.orientation?.lock?.('landscape')?.catch(() => {});
      } catch {}
    }
    updateOrientation();
  }
  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
      return;
    }
    const request = document.documentElement.requestFullscreen?.({ navigationUI: 'hide' });
    if (request?.then)
      request
        .then(() => {
          if (isTouchDevice()) return window.screen.orientation?.lock?.('landscape');
        })
        .catch(() =>
          toast(
            lang === 'ru'
              ? 'Поверни устройство горизонтально для широкого обзора.'
              : 'Rotate your device for a wider view.',
          ),
        );
    else
      toast(
        lang === 'ru'
          ? 'Поверни устройство горизонтально для широкого обзора.'
          : 'Rotate your device for a wider view.',
      );
  }
  function translate() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-t]').forEach((n) => (n.textContent = t(n.dataset.t)));
    $('language').textContent = lang === 'ru' ? 'EN' : 'RU';
    $('language').setAttribute(
      'aria-label',
      lang === 'ru' ? 'Switch to English' : 'Переключить на русский',
    );
    $('sound').setAttribute('aria-label', t(sound ? 'soundOn' : 'soundOff'));
    $('sound').setAttribute('aria-pressed', String(sound));
    $('sound').querySelector('span').textContent = t(sound ? 'soundOn' : 'soundOff');
    $('lab').setAttribute('aria-label', t('labTitle'));
    $('help').setAttribute('aria-label', t('how'));
    $('pause').setAttribute('aria-label', t('pause'));
    $('hint').setAttribute('aria-label', t('hint'));
    $('modal-close').setAttribute('aria-label', t('close'));
    const dirs =
      lang === 'ru' ? ['Вверх', 'Влево', 'Вниз', 'Вправо'] : ['Up', 'Left', 'Down', 'Right'];
    document
      .querySelectorAll('[data-dir]')
      .forEach((b, i) => b.setAttribute('aria-label', dirs[i]));
    $('world').setAttribute(
      'aria-label',
      lang === 'ru'
        ? 'Карта игры: WASD или стрелки — движение, E — действие.'
        : 'Game map: WASD or arrows to move, E to interact.',
    );
    $('chapters').replaceChildren(
      ...content().chapters.map((c, i) => {
        const n = el('div', 'preview');
        n.append(el('span', '', String(i + 1).padStart(2, '0')), el('strong', '', c[0]));
        return n;
      }),
    );
    if (state) updateHUD();
    if (screen === 'ending') renderEnding();
    if (modalView) modalView();
    window.LunarAcademy?.translate();
    if (speechText && screen === 'game') {
      speechText =
        content().storyLogs?.[state?.chapter]?.body || content().chapters[state?.chapter || 0][1];
      $('pix-subtitle').textContent = speechText;
    }
    sidebarKey = '';
    updateOrientation();
    $('fullscreen').setAttribute('aria-label', t('fullscreen'));
    $('fullscreen').title = 'F · ' + t('fullscreen');
    $('navigate-mobile').setAttribute('aria-label', t('navigate'));
    $('joystick').setAttribute(
      'aria-label',
      lang === 'ru' ? 'Сенсорный джойстик' : 'Touch joystick',
    );
    $('touch-run').setAttribute('aria-label', lang === 'ru' ? 'Быстрое движение' : 'Move faster');
    $('pix-dialogue-close').setAttribute('aria-label', t('close'));
    $('pix-talk')?.setAttribute('aria-label', lang === 'ru' ? 'Поговорить с PIX' : 'Talk to PIX');
  }
  function toggleLanguage() {
    lang = lang === 'ru' ? 'en' : 'ru';
    pendingSpeech = null;
    speechUntil = 0;
    write(LANG, lang);
    translate();
  }
  function showScreen(name) {
    screen = name;
    for (const id of ['home', 'game', 'academy', 'ending']) $(id).hidden = id !== name;
    document.body.dataset.screen = name;
    clearInput();
    window.scrollTo(0, 0);
    if (name === 'game') {
      $('world').focus({ preventScroll: true });
      updateHUD();
    }
    if (name !== 'game') {
      $('pix-dialogue').classList.remove('visible');
      speechUntil = 0;
    }
    updateOrientation();
  }
  function modal(title, body, buttons = [], kicker = t('briefing')) {
    const wasOpen = !$('modal').hidden;
    if (!wasOpen) returnFocus = document.activeElement;
    clearInput();
    $('modal-title').textContent = title;
    $('modal-kicker').textContent = kicker;
    $('modal-body').replaceChildren(...(Array.isArray(body) ? body : [body]));
    $('modal-buttons').replaceChildren(...buttons);
    $('modal').hidden = false;
    document.body.style.overflow = 'hidden';
    for (const id of ['home', 'game', 'academy', 'ending']) $(id).inert = true;
    document.querySelector('.topbar').inert = true;
    $('modal-language').textContent = lang === 'ru' ? 'EN' : 'RU';
    document.querySelector('.modal-panel').scrollTop = 0;
    if (!wasOpen) requestAnimationFrame(() => $('modal-close').focus({ preventScroll: true }));
  }
  function open(view) {
    modalView = view;
    view();
  }
  function closeModal() {
    $('modal').hidden = true;
    modalView = null;
    document.body.style.overflow = '';
    clearInput();
    for (const id of ['home', 'game', 'academy', 'ending']) $(id).inert = false;
    document.querySelector('.topbar').inert = false;
    if (returnFocus?.isConnected && !returnFocus.closest('[hidden]'))
      returnFocus.focus({ preventScroll: true });
    else if (screen === 'game') $('world').focus({ preventScroll: true });
    if (screen === 'game' && state) {
      const next = pendingSpeech;
      pendingSpeech = null;
      speak(
        next?.message ||
          content().storyLogs?.[state.chapter]?.body ||
          content().chapters[state.chapter][1],
        next?.context || 'chapter',
        true,
      );
    }
  }
  function info(titleKey, messageKey) {
    open(() =>
      modal(t(titleKey), el('p', '', t(messageKey)), [button(t('close'), closeModal, 'primary')]),
    );
  }
  function start() {
    const mode = document.querySelector('input[name=mode]:checked').value;
    const run = () => {
      prepareDisplay();
      closeModal();
      state = S.fresh(mode);
      lowSuitWarned = false;
      dustWarned = false;
      scanUntil = 0;
      lastChapter = -1;
      sidebarKey = '';
      showScreen('game');
      save();
      briefing();
      beep('success');
    };
    if (saved && !saved.ended)
      open(() =>
        modal(t('confirmNew'), el('p', '', t('confirmText')), [
          button(t('cancel'), closeModal),
          button(t('start'), run, 'primary'),
        ]),
      );
    else run();
  }
  function continueGame() {
    if (!saved) return;
    prepareDisplay();
    state = S.copy(saved);
    sidebarKey = '';
    if (!W.canStand(state.world, state.player.x, state.player.y))
      state.player =
        state.world === 'base' ? { x: 220, y: 595, facing: 1 } : { x: 180, y: 570, facing: 1 };
    lowSuitWarned = false;
    dustWarned = false;
    scanUntil = 0;
    showScreen(state.ended ? 'ending' : 'game');
    if (state.ended) renderEnding();
    else
      speak(
        content().storyLogs?.[state.chapter]?.body || content().chapters[state.chapter][1],
        'chapter',
        true,
      );
  }
  function briefing() {
    open(() => {
      const c = content().chapters[state.chapter],
        n = el('div'),
        log = content().storyLogs?.[state.chapter];
      n.append(
        el('span', 'brief-count', String(state.chapter + 1).padStart(2, '0')),
        el('p', '', c[1]),
        el('div', 'note', c[2]),
      );
      if (log) {
        const card = el('div', 'brief-transmission');
        card.append(el('small', '', log.speaker + ' / ' + log.time), el('p', '', log.body));
        n.append(card);
      }
      modal(c[0], n, [button(t('begin'), closeModal, 'primary', 'brief-begin')]);
    });
  }
  function updateMissionPanel() {
    const key = lang + state.chapter + state.world + state.solar + state.comms;
    if (sidebarKey !== key) {
      sidebarKey = key;
      $('mission-timeline').replaceChildren(
        ...content().chapters.map((c, i) => {
          const row = el(
            'div',
            'mission-step' +
              (i === state.chapter ? ' current' : i < state.chapter ? ' complete' : ''),
          );
          row.append(
            el('span', '', i < state.chapter ? '✓' : String(i + 1).padStart(2, '0')),
            el('strong', '', c[0]),
          );
          return row;
        }),
      );
      const log = content().storyLogs?.[state.chapter];
      $('log-speaker').textContent = log?.speaker || 'PIX / MISSION LOG';
      $('log-title').textContent = log?.title || content().chapters[state.chapter][0];
      $('log-body').textContent = log?.body || content().chapters[state.chapter][1];
      $('log-time').textContent = log?.time || 'SOL 07';
      $('science-fact').textContent = log?.science || content().notes[state.chapter]?.[1] || '';
    }
    const target = W.target(state);
    $('target-distance').textContent =
      Math.round(Math.hypot(target.x - state.player.x, target.y - state.player.y)) + ' m';
    const sabotage = S.sabotageCase?.(state);
    $('sabotage').hidden = !sabotage;
    $('sabotage').textContent =
      lang === 'ru' ? '△ Обнаружен саботаж · диагностика' : '△ Sabotage detected · diagnose';
    if ($('sabotage-quick')) {
      $('sabotage-quick').hidden = !sabotage;
      $('sabotage-quick').setAttribute(
        'aria-label',
        lang === 'ru' ? 'Проверить саботаж' : 'Diagnose sabotage',
      );
    }
    if (lastChapter !== state.chapter) {
      lastChapter = state.chapter;
      $('objective-row')?.classList.remove('chapter-reveal');
      document
        .querySelector('.objective-row')
        .animate?.([{ background: '#886337' }, { background: '#121923' }], { duration: 900 });
    }
  }
  function navigateToTarget() {
    if (screen !== 'game' || modalView || !state || state.ended) return;
    const target = W.target(state),
      path = W.path(state.world, state.player, target);
    if (W.nearest(state)?.id === target.id) {
      interact();
      return;
    }
    if (path.length) {
      route = path;
      beep();
      toast((lang === 'ru' ? 'Маршрут: ' : 'Route: ') + t('room_' + target.id));
    } else
      toast(
        lang === 'ru'
          ? 'Подойди ближе к проходу или выбери точку на карте.'
          : 'Move closer to a passage or choose a point on the map.',
      );
  }
  function updateEventHUD() {
    const event = S.hazardState?.(state),
      box = $('event-alert');
    if (!event || event.kind === 'calm' || state.world !== 'surface') {
      box.hidden = true;
      lastEvent = '';
      return;
    }
    const safe = event.kind === 'micrometeorites' ? !event.exposed : event.sheltered;
    box.hidden = false;
    box.className = 'event-alert ' + event.phase + (safe ? ' sheltered' : '');
    const ru = lang === 'ru',
      name =
        event.kind === 'micrometeorites'
          ? ru
            ? 'МИКРОМЕТЕОРИТЫ'
            : 'MICROMETEORITES'
          : ru
            ? 'РАДИАЦИОННЫЙ ИМПУЛЬС'
            : 'RADIATION PULSE';
    box.textContent =
      (event.phase === 'warning' ? '△ ' : '⚠ ') +
      name +
      ' · ' +
      Math.ceil(event.remaining) +
      ' s' +
      (safe
        ? event.kind === 'micrometeorites'
          ? ru
            ? ' · ВНЕ ЗОНЫ'
            : ' · OUTSIDE ZONE'
          : ru
            ? ' · В УКРЫТИИ'
            : ' · SHELTERED'
        : event.kind === 'micrometeorites'
          ? ru
            ? ' · покинь отмеченный круг'
            : ' · leave the marked circle'
          : ru
            ? ' · к шлюзу или за скалу'
            : ' · hatch / rock cover');
    const key = event.kind + event.phase + event.cycle;
    if (key !== lastEvent) {
      lastEvent = key;
      beep('error');
      if (event.phase === 'warning')
        toast(
          ru
            ? 'PIX: отмечаю опасную область. Найди укрытие; пауза останавливает событие.'
            : 'PIX: marking the danger area. Find cover; pausing freezes the event.',
        );
    }
  }
  function updateHUD() {
    if (!state) return;
    for (const k of resourceKeys) {
      const n = $('resource-' + k);
      n.querySelector('span').textContent = t(k);
      n.querySelector('strong').textContent = Math.round(state[k]);
      n.querySelector('i').style.width = state[k] + '%';
      n.classList.toggle('low', state[k] < 25);
    }
    const c = content().chapters[state.chapter];
    $('chapter-number').textContent = String(state.chapter + 1).padStart(2, '0');
    $('chapter-name').textContent = c[0];
    $('objective').textContent = c[2];
    $('chapter-dots').replaceChildren(
      ...content().chapters.map((_, i) =>
        el('i', i === state.chapter ? 'active' : i < state.chapter ? 'past' : ''),
      ),
    );
    $('research-count').textContent =
      '◇ ' + (state.discoveries || []).length + '/' + S.discoveries.length;
    $('research-count').title = t('scanProgress');
    $('storm-alert').hidden = S.stormPressure(state) < 70;
    $('storm-alert').textContent = t('scanStorm');
    const dusty = state.world === 'surface' && W.hazardAt(state.player.x, state.player.y);
    $('eva-alert').hidden = !dusty;
    $('eva-alert').textContent = t('scanDust');
    $('remaining').textContent = Math.max(0, state.limit - state.turn);
    $('countdown-fill').style.width =
      Math.max(0, (100 * (state.limit - state.turn)) / state.limit) + '%';
    $('location-name').textContent = t(state.world === 'base' ? 'station' : 'surface');
    $('suit').hidden = state.world !== 'surface';
    $('suit').textContent = t('suit') + ' ' + Math.ceil(state.suit);
    $('pix-text').textContent =
      state.world === 'surface' && state.suit < 25
        ? t('suitWarning')
        : state.limit - state.turn <= 3
          ? t('turnWarning')
          : state.chapter === 0
            ? t('pixStart')
            : c[2];
    updateNearby();
    updateMissionPanel();
    updateEventHUD();
  }
  function updateNearby() {
    if (!state) return;
    const near = W.nearest(state);
    $('action').classList.toggle('ready', !!near);
    $('nearby').textContent = near ? t('room_' + near.id) + ' · E' : '';
    $('action').querySelector('span').textContent = near ? t('room_' + near.id) : t('action');
  }
  function forecast(action) {
    const r = S.apply(state, action);
    if (!r.ok) return el('div', 'forecast', t('waterNeeded'));
    const n = el('div', 'forecast');
    n.append(el('span', '', t('forecast')));
    for (const k of resourceKeys) {
      const s = el('span', '', t(k) + ' ');
      s.append(el('b', '', String(r.state[k])));
      n.append(s);
    }
    n.title = t('passive');
    return n;
  }
  function choice(action, titleKey, descKey) {
    const b = button('', () => perform(action), 'choice', 'choose-' + action);
    b.append(el('strong', '', t(titleKey)), el('p', '', t(descKey)), forecast(action));
    b.disabled = !S.allowed(state, action);
    return b;
  }
  function perform(action) {
    const r = S.apply(state, action);
    if (!r.ok) {
      beep('error');
      return;
    }
    closeModal();
    state = r.state;
    route = [];
    updateHUD();
    save();
    beep('success');
    if (state.ended) {
      finish();
      return;
    }
    if (state.chapter !== r.previousChapter) briefing();
    else toast(t('act_' + action));
  }
  // The scanner is an optional fourth puzzle. It exposes scientific clues and
  // rewards exploration without spending mission decisions or calling an API.
  function simulationChoices() {
    if (!state) return [];
    if (state.chapter === 0) return ['power', 'wait'];
    if (state.chapter === 1) return ['air', 'wait'];
    if (state.chapter === 2) return ['grow', 'seeds'];
    if (state.chapter === 3)
      return state.world === 'surface'
        ? state.comms
          ? ['enter', 'wait']
          : state.solar
            ? ['antenna', 'wait']
            : ['solar', 'wait']
        : ['beacon', 'wait'];
    return state.shielding ? ['seal', 'wait'] : ['waterShield', 'cargoShield'];
  }
  function simulate(action) {
    let s = S.copy(state),
      r = S.apply(s, action);
    if (!r.ok) return null;
    s = r.state;
    for (let i = 1; i < 3 && !s.ended; i++) {
      r = S.apply(s, 'wait');
      if (!r.ok) break;
      s = r.state;
    }
    return s;
  }
  function decisionLab() {
    if (screen !== 'game' || !state || state.ended) return;
    open(() => {
      const body = [el('p', '', t('labSubtitle'))],
        grid = el('div', 'lab-grid');
      const keyFor = {
        power: 'connect',
        air: 'airStart',
        grow: 'growTitle',
        seeds: 'seedsTitle',
        exit: 'exit',
        enter: 'enter',
        solar: 'solarRepair',
        antenna: 'send',
        beacon: 'beacon',
        waterShield: 'waterTitle',
        cargoShield: 'cargoTitle',
        seal: 'seal',
        wait: 'wait',
      };
      for (const action of simulationChoices()) {
        const projected = simulate(action),
          card = el('div', 'lab-card');
        card.append(
          el('small', '', t('labPreview')),
          el('h3', '', t(keyFor[action] || 'labPreview')),
        );
        if (!projected) {
          card.append(el('p', '', t('labUnavailable')));
          grid.append(card);
          continue;
        }
        const rows = el('div', 'lab-values');
        for (const k of resourceKeys) {
          const change = projected[k] - state[k];
          const v = el('div', 'lab-value');
          v.append(
            el('span', '', t(k)),
            el('strong', '', String(Math.round(projected[k]))),
            el('small', change > 0 ? '+' + Math.round(change) : String(Math.round(change))),
          );
          rows.append(v);
        }
        card.append(rows, el('p', 'lab-turns', t('labOutcome')));
        if (projected.ended) card.append(el('p', 'lab-danger', t('labWarning')));
        grid.append(card);
      }
      body.push(grid, el('p', 'note', t('labTip')));
      modal(t('labTitle'), body, [button(t('close'), closeModal, 'primary')]);
    });
  }
  function scienceScan() {
    if (screen !== 'game' || !state || state.ended || modalView) return;
    const pending = S.discoveries.filter(
      (d) => d.world === state.world && !(state.discoveries || []).includes(d.id),
    );
    if (!pending.length) {
      toast(t('scanNoSignal'));
      return;
    }
    const near = pending
      .map((d) => ({ d, dist: Math.hypot(d.x - state.player.x, d.y - state.player.y) }))
      .sort((a, b) => a.dist - b.dist)[0];
    scanStart = performance.now() / 1000;
    scanUntil = scanStart + 7;
    beep('click');
    if (near.dist <= 105) {
      scanTarget = near.d;
      open(renderScanner);
      return;
    }
    const dx = near.d.x - state.player.x,
      dy = near.d.y - state.player.y;
    const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'E' : 'W') : dy > 0 ? 'S' : 'N';
    toast(t('scanBearing') + ' · ' + Math.round(near.dist / 10) * 10 + 'm · ' + dir);
  }
  let scanTarget = null,
    scanValue = 10;
  function renderScanner() {
    if (!scanTarget) return;
    const freq = scanTarget.frequency;
    scanValue = 10;
    const desc = el('p', '', t('scanIntro'));
    const spectrum = el('div', 'scanner-spectrum');
    spectrum.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 41; i++) {
      const bar = el('i');
      bar.style.height = 7 + S.spectrum(i * 2.5, freq) * 0.5 + 'px';
      spectrum.append(bar);
    }
    const strength = el('div', 'scanner-strength'),
      strengthLabel = el('strong', '', t('scanStrength') + ': '),
      strengthValue = el('b', '', String(S.spectrum(scanValue, freq)) + '%');
    strength.append(strengthLabel, strengthValue);
    const range = el('input', 'scan-range');
    range.type = 'range';
    range.min = 0;
    range.max = 100;
    range.step = 1;
    range.value = scanValue;
    range.setAttribute('aria-label', t('scanFrequency'));
    const current = el('output', 'scan-number', String(scanValue));
    range.addEventListener('input', () => {
      scanValue = Number(range.value);
      current.textContent = scanValue;
      strengthValue.textContent = S.spectrum(scanValue, freq) + '%';
    });
    const row = el('div', 'scan-range-row');
    row.append(el('span', '', t('scanFrequency')), current);
    const errorLine = el('div', 'error');
    errorLine.id = 'puzzle-error';
    errorLine.setAttribute('role', 'status');
    const labelMap = {
      airtrace: 'scanAirName',
      irrigation: 'scanWaterName',
      regolith: 'scanRockName',
    };
    modal(
      t('scanTitle'),
      [
        el('div', 'scanner-target', t(labelMap[scanTarget.id])),
        desc,
        spectrum,
        strength,
        row,
        range,
        errorLine,
      ],
      [
        button(
          t('scanSubmit'),
          () => {
            if (S.spectrum(scanValue, freq) < 90) {
              error(t('scanWrong'));
              return;
            }
            const result = S.collect(state, scanTarget.id);
            if (!result.ok) {
              closeModal();
              return;
            }
            state = result.state;
            closeModal();
            updateHUD();
            save();
            beep('success');
            const infoKeys = {
              airtrace: ['scanAirName', 'scanAirDesc'],
              irrigation: ['scanWaterName', 'scanWaterDesc'],
              regolith: ['scanRockName', 'scanRockDesc'],
            };
            const [title, description] = infoKeys[scanTarget.id];
            open(() =>
              modal(
                t(title),
                [el('p', '', t(description)), el('div', 'note', t('scanComplete'))],
                [button(t('close'), closeModal, 'primary')],
                t('scanLog'),
              ),
            );
          },
          'primary',
          'scan-submit',
        ),
      ],
      t('scanLog'),
    );
  }
  function error(text) {
    $('puzzle-error').textContent = text;
    pendingSpeech = { message: text, context: 'error' };
    beep('error');
  }
  function tileSvg(mask) {
    let lines = '';
    for (const [bit, x, y] of [
      [1, 32, 1],
      [2, 63, 32],
      [4, 32, 63],
      [8, 1, 32],
    ])
      if (mask & bit) lines += `<path d="M32 32L${x} ${y}"/>`;
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><g stroke="#8af3d3" stroke-width="7" stroke-linecap="square" fill="none">${lines}</g><rect x="26" y="26" width="12" height="12" fill="#d6fff0"/></svg>`;
  }
  function openCircuit() {
    circuit = [...(S.missionPuzzle?.(state, 'circuit')?.tiles || S.puzzle)];
    open(renderCircuit);
  }
  function renderCircuit() {
    const desc = el('p', '', t('circuitDesc')),
      labels = el('div', 'circuit-labels');
    labels.append(el('span', '', t('battery') + ' →'), el('span', '', '→ ' + t('baseLabel')));
    const grid = el('div', 'circuit'),
      status = el('div', 'circuit-state'),
      err = el('div', 'error');
    err.id = 'puzzle-error';
    err.setAttribute('role', 'status');
    const refresh = () => {
      const ok = S.connected(circuit);
      status.textContent = t(ok ? 'connected' : 'disconnected');
      status.classList.toggle('good', ok);
    };
    circuit.forEach((value, i) => {
      const b = button(
        '',
        () => {
          circuit[i] = S.rotate(circuit[i]);
          b.innerHTML = tileSvg(circuit[i]);
          refresh();
          beep();
        },
        'tile',
      );
      b.dataset.tile = i;
      b.setAttribute('aria-label', t('rotate') + ' ' + (i + 1));
      b.innerHTML = tileSvg(value);
      grid.append(b);
    });
    refresh();
    const hint = button(t('hint'), () => toast(t('circuitHint')), 'mini-hint');
    modal(
      t('circuitTitle'),
      [
        desc,
        labels,
        grid,
        status,
        hint,
        el(
          'div',
          'puzzle-learning',
          lang === 'ru'
            ? 'Цепь работает, когда путь от источника до потребителя непрерывен. Поворачивай блоки и следи за совпадением контактов: это модель замкнутой электрической цепи.'
            : 'A circuit works when an unbroken path joins the source to the load. Rotate tiles to align their contacts: this models a closed electrical circuit.',
        ),
        forecast('power'),
        err,
      ],
      [
        button(
          t('connect'),
          () => (S.connected(circuit) ? perform('power') : error(t('circuitError'))),
          'primary',
          'circuit-submit',
        ),
      ],
    );
  }
  function openAir() {
    airValues = [1, 1, 1];
    open(renderAir);
  }
  function renderAir() {
    const puzzle = S.missionPuzzle?.(state, 'air') || {
      target: [2, 3, 1],
      budget: 6,
      unitPower: [1, 1, 1],
      requiredPower: [2, 3, 1],
    };
    const rows = [],
      total = el('div', 'allocation-total');
    total.append(el('span', '', t('used')), el('strong'));
    const refresh = () =>
      (total.lastElementChild.textContent = airValues.reduce((a, b) => a + b, 0) + ' / 6');
    ['oxygen', 'scrub', 'cooling'].forEach((key, i) => {
      const row = el('div', 'allocation'),
        label = el('div', 'allocation-label', t(key));
      label.append(
        el(
          'small',
          '',
          state.puzzleSeed === undefined
            ? t('minimum') + ' ' + puzzle.target[i]
            : (lang === 'ru' ? 'Нужно ' : 'Required ') +
                puzzle.requiredPower[i] +
                ' kW · ' +
                (lang === 'ru' ? 'блок даёт ' : 'per block ') +
                puzzle.unitPower[i] +
                ' kW',
        ),
      );
      const steps = el('div', 'stepper'),
        out = el('output', '', airValues[i]);
      out.id = 'air-value-' + i;
      const minus = button(
        '−',
        () => {
          airValues[i] = Math.max(0, airValues[i] - 1);
          out.textContent = airValues[i];
          refresh();
        },
        '',
        `air-minus-${i}`,
      );
      const plus = button(
        '+',
        () => {
          airValues[i] = Math.min(4, airValues[i] + 1);
          out.textContent = airValues[i];
          refresh();
        },
        '',
        `air-plus-${i}`,
      );
      minus.setAttribute('aria-label', t(key) + ' −');
      plus.setAttribute('aria-label', t(key) + ' +');
      steps.append(minus, out, plus);
      row.append(label, steps);
      rows.push(row);
    });
    refresh();
    const err = el('div', 'error');
    err.id = 'puzzle-error';
    err.setAttribute('role', 'status');
    modal(
      t('airTitle'),
      [
        el(
          'p',
          '',
          lang === 'ru'
            ? 'У станции 6 блоков мощности. Рассчитай, сколько блоков нужно каждой системе, используя показания ниже. Это упрощённая учебная установка.'
            : 'The station has 6 power blocks. Use the readings below to calculate how many each system needs. This is a simplified teaching model.',
        ),
        ...rows,
        total,
        el(
          'div',
          'puzzle-learning',
          lang === 'ru'
            ? 'Число блоков = нужная мощность ÷ мощность одного блока. Рассчитай потребность каждой системы и уложись в общий бюджет 6 блоков. Данные меняются в новой миссии.'
            : 'Blocks needed = required power ÷ power per block. Calculate each system’s demand within the shared budget of 6 blocks. New missions use different data.',
        ),
        forecast('air'),
        err,
      ],
      [
        button(
          t('airStart'),
          () =>
            S.validAir(...airValues, puzzle.target)
              ? perform('air')
              : error(
                  lang === 'ru'
                    ? 'Проверь деление для каждой системы и сумму блоков. Воздуху, очистке и охлаждению должно хватить мощности.'
                    : 'Check each division and the total block count. Oxygen, scrubbing, and cooling all need enough power.',
                ),
          'primary',
          'air-submit',
        ),
      ],
    );
  }
  function openRadio() {
    radioValues = [...(S.missionPuzzle?.(state, 'radio')?.initial || [20, 75])];
    open(renderRadio);
  }
  function renderRadio() {
    const puzzle = S.missionPuzzle?.(state, 'radio') || {
      target: [62, 48],
      reference: [70, 60],
      offset: [8, 12],
    };
    const visual = el('div', 'radio-visual'),
      quality = el('div', 'quality');
    quality.id = 'radio-quality';
    const update = () => {
      const q = S.signal(...radioValues, puzzle.target);
      quality.textContent = t('quality') + ': ' + q + ' / 100';
      const a = [],
        b = [];
      for (let x = 0; x <= 480; x += 4) {
        a.push(x + ',' + (44 + Math.sin(x * 0.045) * 23));
        b.push(
          x +
            ',' +
            (44 +
              Math.sin(
                x * (0.045 + (radioValues[1] - puzzle.target[1]) * 0.0003) +
                  (radioValues[0] - puzzle.target[0]) * 0.04,
              ) *
                23),
        );
      }
      visual.innerHTML = `<svg viewBox="0 0 480 88" aria-hidden="true"><path d="M0 44H480" stroke="#2b4d61"/><polyline points="${a.join(' ')}" fill="none" stroke="#91b5ca" stroke-width="2"/><polyline points="${b.join(' ')}" fill="none" stroke="#8af3d3" stroke-width="2"/></svg>`;
    };
    const ranges = ['direction', 'channel'].map((key, i) => {
      const label = el('label', 'range'),
        line = el('span', '', t(key)),
        out = el('b', '', radioValues[i]),
        input = el('input');
      input.type = 'range';
      input.min = 0;
      input.max = 100;
      input.step = 1;
      input.value = radioValues[i];
      input.id = 'radio-' + i;
      input.setAttribute('aria-label', t(key));
      line.append(out);
      input.addEventListener('input', () => {
        radioValues[i] = Number(input.value);
        out.textContent = input.value;
        update();
      });
      label.append(line, input);
      return label;
    });
    update();
    const err = el('div', 'error');
    err.id = 'puzzle-error';
    err.setAttribute('role', 'status');
    const data = el('div', 'puzzle-data');
    ['direction', 'channel'].forEach((key, i) =>
      data.append(el('span', '', t(key) + ': ' + puzzle.reference[i] + ' − ' + puzzle.offset[i])),
    );
    modal(
      t('radioTitle'),
      [
        el('p', '', t('radioDesc')),
        data,
        visual,
        quality,
        ...ranges,
        el(
          'div',
          'puzzle-learning',
          lang === 'ru'
            ? 'Для каждого регулятора вычти поправку из опорного значения. Когда волны совпадают, качество связи растёт. Шкалы условные: это учебная модель настройки сигнала.'
            : 'For each control, subtract the correction from its reference value. Matching waves improve signal quality. These scales are simplified for learning.',
        ),
        button(
          t('hint'),
          () =>
            toast(
              lang === 'ru'
                ? 'Рассчитай два выражения над графиком, затем совмести волны.'
                : 'Calculate the two expressions above the graph, then align the waves.',
            ),
          'mini-hint',
        ),
        forecast('antenna'),
        err,
      ],
      [
        button(
          t('send'),
          () =>
            S.signal(...radioValues, puzzle.target) >= 90
              ? perform('antenna')
              : error(t('radioError')),
          'primary',
          'radio-submit',
        ),
      ],
    );
  }
  function sabotageDiagnosis() {
    if (!state || state.ended) return;
    const diagnostic = S.sabotageCase?.(state);
    if (!diagnostic) return;
    open(() => {
      const d = S.sabotageCase(state, diagnostic.id);
      if (!d) {
        closeModal();
        return;
      }
      const ru = lang === 'ru',
        air = d.id === 'air';
      const story = air
        ? ru
          ? 'PIX нашёл подменённые команды клапана. Датчик показывает общий поток, но часть воздуха уходит по обходному контуру. Вычисли поток, который действительно достигает жилого модуля.'
          : 'PIX found altered valve commands. The sensor reports total flow, but some air is diverted. Calculate the flow that actually reaches the habitat.'
        : ru
          ? 'В журнале питания появилась чужая команда: контроллер занижает доступную мощность. Проверь показания вольтметра и амперметра, чтобы восстановить правильную калибровку.'
          : 'An unauthorized command changed the power controller’s calibration. Check the voltage and current readings to restore the correct power value.';
      const data = el('div', 'puzzle-data');
      data.append(
        el(
          'span',
          '',
          (air ? (ru ? 'Подача: ' : 'Supply: ') : ru ? 'Напряжение: ' : 'Voltage: ') +
            d.a +
            (air ? ' L/min' : ' V'),
        ),
        el(
          'span',
          '',
          (air ? (ru ? 'Обход: ' : 'Diverted: ') : ru ? 'Ток: ' : 'Current: ') +
            d.b +
            (air ? ' L/min' : ' A'),
        ),
      );
      const err = el('div', 'error');
      err.id = 'puzzle-error';
      err.setAttribute('role', 'status');
      const choices = d.options.map((value, index) =>
        button(
          String(value) + (air ? ' L/min' : ' W'),
          () => {
            const result = S.resolveSabotage(state, d.id, index);
            if (result.correct) {
              state = result.state;
              save();
              updateHUD();
              closeModal();
              speak(
                (ru ? 'Саботаж устранён. ' : 'Sabotage repaired. ') +
                  d.a +
                  (air ? ' − ' : ' × ') +
                  d.b +
                  ' = ' +
                  d.result +
                  '. ' +
                  (ru
                    ? 'Отлично: ты проверил показания, а не доверился повреждённому датчику.'
                    : 'Good work: you checked the evidence against the faulty sensor.'),
                'sabotage',
                true,
              );
              toast((ru ? 'Система восстановлена · +6 ' : 'System restored · +6 ') + t(d.reward));
            } else
              error(
                air
                  ? ru
                    ? 'Вычти обходной поток из общего: полезный поток = подача − потери.'
                    : 'Subtract diverted flow from the total: useful flow = supply − loss.'
                  : ru
                    ? 'Мощность P = U × I. Умножь напряжение в вольтах на силу тока в амперах.'
                    : 'Power P = U × I. Multiply volts by amperes to find watts.',
              );
          },
          'choice',
        ),
      );
      modal(
        ru
          ? 'Следы саботажа / ' + (air ? 'клапан воздуха' : 'контроллер питания')
          : 'Sabotage trace / ' + (air ? 'air valve' : 'power controller'),
        [
          el('p', '', story),
          data,
          el(
            'div',
            'puzzle-learning',
            air
              ? ru
                ? 'Баланс потока: полезный поток = общий поток − потери.'
                : 'Flow balance: useful flow = total flow − loss.'
              : ru
                ? 'Электрическая мощность: P = U × I. Вольты × амперы = ватты.'
                : 'Electrical power: P = U × I. Volts × amperes = watts.',
          ),
          ...choices,
          err,
        ],
        [],
        ru ? 'PIX / ПРОВЕРКА ДАННЫХ' : 'PIX / DATA CHECK',
      );
    });
  }
  function talkToPix() {
    if (!state || state.ended) return;
    open(() => {
      const ru = lang === 'ru',
        log = content().storyLogs?.[state.chapter],
        answer = (text) => {
          closeModal();
          speak(text, 'conversation', true);
        };
      const choices = [
        button(
          ru ? '⌖ Что сейчас делать?' : '⌖ What should I do now?',
          () => answer(content().chapters[state.chapter][1]),
          'choice',
        ),
        button(
          ru ? '✦ Объясни научный принцип' : '✦ Explain the science',
          () => answer((log?.science || '') + '. ' + content().notes[state.chapter][1]),
          'choice',
        ),
        button(
          ru ? '△ Как пережить опасности?' : '△ How do I survive hazards?',
          () =>
            answer(
              ru
                ? 'Следи за предупреждениями. При микрометеоритах покинь отмеченный круг; при радиации найди подсвеченное укрытие за скалой или у шлюза. Запас скафандра тратится быстрее в заряженной пыли и при быстром шаге.'
                : 'Watch the warnings. Leave the marked circle for micrometeorites; find highlighted cover near rocks or the hatch for radiation. Charged dust and faster movement consume more suit reserve.',
            ),
          'choice',
        ),
      ];
      if (S.sabotageCase?.(state))
        choices.push(
          button(
            ru ? '⚒ Проверим следы саботажа' : '⚒ Investigate the sabotage',
            sabotageDiagnosis,
            'choice',
          ),
        );
      modal(
        ru ? 'PIX на связи' : 'PIX is listening',
        [
          el(
            'p',
            '',
            ru
              ? 'Выбери тему. PIX ответит на своём языке; перевод появится в субтитрах. Электронный голос можно включить кнопкой ♪.'
              : 'Choose a topic. PIX replies in its own language, translated in subtitles. Enable its electronic voice with ♪.',
          ),
          ...choices,
        ],
        [button(t('close'), closeModal)],
        'PIX / 07',
      );
    });
  }
  function interact() {
    if (screen !== 'game' || !state || state.ended || modalView) return;
    const near = W.nearest(state);
    if (!near) {
      toast(t('moveNear'));
      return;
    }
    beep();
    switch (near.id) {
      case 'power':
        return state.chapter === 0 ? openCircuit() : info('room_power', 'done');
      case 'air':
        return state.chapter === 1 ? openAir() : info('room_air', state.life ? 'done' : 'locked');
      case 'garden':
        return state.chapter === 2
          ? open(() =>
              modal(t('gardenTitle'), [
                el('p', '', t('gardenDesc')),
                choice('grow', 'growTitle', 'growDesc'),
                choice('seeds', 'seedsTitle', 'seedsDesc'),
              ]),
            )
          : info('room_garden', state.garden ? 'done' : 'locked');
      case 'airlock':
        return state.chapter >= 3
          ? open(() =>
              modal(
                t('airlockTitle'),
                [el('p', '', t('airlockDesc')), forecast('exit')],
                [button(t('exit'), () => perform('exit'), 'primary', 'exit-submit')],
              ),
            )
          : info('airlockTitle', 'locked');
      case 'hatch':
        return open(() =>
          modal(
            t('room_hatch'),
            [el('p', '', t('hatchDesc')), forecast('enter')],
            [button(t('enter'), () => perform('enter'), 'primary', 'enter-submit')],
          ),
        );
      case 'solar':
        return !state.solar
          ? open(() =>
              modal(
                t('solarTitle'),
                [el('p', '', t('solarDesc')), forecast('solar')],
                [button(t('solarRepair'), () => perform('solar'), 'primary', 'solar-submit')],
              ),
            )
          : info('solarTitle', 'done');
      case 'antenna':
        return !state.comms ? openRadio() : info('radioTitle', 'done');
      case 'command':
        return openCommand();
      case 'shelter':
        return openShelter();
    }
  }
  function openCommand() {
    open(() => {
      const body = [
          el('p', '', t('commandDesc')),
          el('div', 'note', content().chapters[state.chapter][2]),
        ],
        buttons = [];
      if (S.allowed(state, 'beacon')) {
        body.push(forecast('beacon'));
        buttons.push(button(t('beacon'), () => perform('beacon'), 'primary', 'beacon-submit'));
      }
      buttons.push(
        button(t('wait'), () => {
          open(() => {
            modal(
              t('wait'),
              [el('p', '', t('waitDesc')), forecast('wait')],
              [
                button(t('cancel'), closeModal),
                button(t('wait'), () => perform('wait'), 'primary', 'wait-submit'),
              ],
            );
          });
        }),
      );
      modal(t('commandTitle'), body, buttons);
    });
  }
  function openShelter() {
    if (state.chapter !== 4) {
      info('room_shelter', 'locked');
      return;
    }
    open(() => {
      if (!state.shielding)
        modal(t('shieldTitle'), [
          el('p', '', t('shieldDesc')),
          choice('waterShield', 'waterTitle', 'waterDesc'),
          choice('cargoShield', 'cargoTitle', 'cargoDesc'),
        ]);
      else
        modal(
          t('sealTitle'),
          [
            el('p', '', t('sealDesc')),
            el('div', 'note', t('shield') + ': ' + state.shield + ' / 100'),
            forecast('seal'),
          ],
          [button(t('seal'), () => perform('seal'), 'primary', 'seal-submit')],
        );
    });
  }
  function help() {
    open(() => {
      const intro = el(
        'p',
        '',
        lang === 'ru'
          ? 'Ты — Алекс, инженер станции. Восстанови питание, воздух и связь, сохрани оранжерею и подготовь укрытие. PIX объясняет принципы и переводит свою речь субтитрами.'
          : 'You are Alex, the station engineer. Restore power, air, and communications, preserve the greenhouse, and prepare shelter. PIX explains the science through translated subtitles.',
      );
      const rows =
        lang === 'ru'
          ? [
              ['WASD / ↑←↓→', 'Движение · Shift — быстрее'],
              ['E / ПРОБЕЛ', 'Действие рядом с оборудованием'],
              ['N / ↗', 'Маршрут к текущей цели'],
              ['Q · M · J', 'Сканер · карта · журнал'],
              ['L · X', 'Симулятор решений · диагностика саботажа'],
              ['F · Esc / P', 'Полный экран · пауза'],
            ]
          : [
              ['WASD / ↑←↓→', 'Move · hold Shift to move faster'],
              ['E / SPACE', 'Interact near equipment'],
              ['N / ↗', 'Route to the current objective'],
              ['Q · M · J', 'Scanner · map · journal'],
              ['L · X', 'Decision simulator · sabotage diagnostics'],
              ['F · Esc / P', 'Fullscreen · pause'],
            ];
      const list = el('div', 'help-controls');
      for (const [key, label] of rows) {
        const row = el('div');
        row.append(el('kbd', '', key), el('span', '', label));
        list.append(row);
      }
      modal(
        t('howTitle'),
        [
          intro,
          list,
          el(
            'div',
            'note',
            lang === 'ru'
              ? 'Телефон: левый джойстик — движение, » — быстрый шаг; кнопки внизу — инструменты и действие. Нажатие на свободный пол строит маршрут. Новая миссия меняет задания; сохранение оставляет прежние условия. Чтение, подсказки и ошибки не расходуют ходы. Снаружи расходуется запас скафандра; пауза останавливает время.'
              : 'Phone: move with the left joystick; » toggles faster movement. Use the bottom buttons for tools and actions. Tap free floor space to set a route. New missions change the puzzles; saved missions keep them. Reading, hints, and mistakes cost no turns. Suit reserve drains outside; pause freezes time.',
          ),
        ],
        [button(t('close'), closeModal, 'primary')],
      );
    });
  }
  function sources() {
    open(() => {
      const list = el('ul', 'source-list');
      for (const [name, url] of window.LunarSources) {
        const li = el('li'),
          a = el('a', '', name);
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        li.append(a);
        list.append(li);
      }
      const archive = el('section', 'archive');
      archive.append(el('h3', '', t('archiveTitle')), el('p', '', t('archiveText')));
      for (const [key, url] of [
        ['archiveLink', 'https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30677/1'],
        ['periodLink', 'https://ccmc.gsfc.nasa.gov/TP/2024-05-TP-02/'],
      ]) {
        const a = el('a', '', t(key));
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        archive.append(a);
      }
      modal(
        t('sourceTitle'),
        [
          el('p', '', t('sourceIntro')),
          archive,
          list,
          el('p', 'credit', t('sourceDate')),
          el('p', 'credit', t('credit')),
        ],
        [button(t('close'), closeModal, 'primary')],
      );
    });
  }
  function journal() {
    if (!state) return;
    open(() => {
      const body = [];
      for (const log of (content().storyLogs || []).slice(0, state.chapter + 1)) {
        const card = el('section', 'brief-transmission');
        card.append(
          el('small', '', log.speaker + ' / ' + log.time),
          el('h3', '', log.title),
          el('p', '', log.body),
        );
        body.push(card);
      }
      content()
        .notes.slice(0, state.chapter + 1)
        .forEach(([title, desc]) => {
          const n = el('section', 'journal-entry');
          n.append(el('h3', '', title), el('p', '', desc));
          body.push(n);
        });
      body.push(el('h3', '', t('scanLog')));
      const discovered = state.discoveries || [];
      if (!discovered.length) body.push(el('p', '', t('scanNoSignal')));
      const descriptions = {
        airtrace: ['scanAirName', 'scanAirDesc'],
        irrigation: ['scanWaterName', 'scanWaterDesc'],
        regolith: ['scanRockName', 'scanRockDesc'],
      };
      for (const id of discovered) {
        const [a, b] = descriptions[id];
        const card = el('section', 'journal-entry');
        card.append(el('h3', '', t(a)), el('p', '', t(b)));
        body.push(card);
      }
      body.push(el('h3', '', t('decisions')));
      if (!state.trace.length) body.push(el('p', '', t('noDecisions')));
      for (const row of state.trace) {
        const n = el('div', 'trace-mini');
        n.append(
          el('span', '', String(row.turn).padStart(2, '0')),
          el('div', '', t('act_' + row.action)),
        );
        body.push(n);
      }
      modal(t('journalTitle'), body, [
        button(t('sources'), sources),
        button(t('close'), closeModal, 'primary'),
      ]);
    });
  }
  function showMap() {
    if (!state) return;
    open(() => {
      const canvas = el('canvas', 'map-canvas');
      canvas.id = 'map-canvas';
      canvas.setAttribute('aria-label', t('mapTitle'));
      modal(
        t(state.world === 'base' ? 'mapTitle' : 'surfaceMap'),
        [el('p', '', t('mapTip')), canvas],
        [button(t('close'), closeModal, 'primary')],
      );
      renderer.map(canvas, state, t);
      canvas.addEventListener('click', (e) => {
        const b = canvas.getBoundingClientRect(),
          point = {
            x: ((e.clientX - b.left) / b.width) * 1200,
            y: ((e.clientY - b.top) / b.height) * 780,
          };
        const path = W.path(state.world, state.player, point);
        if (path.length) {
          closeModal();
          route = path;
        }
      });
    });
  }
  function pause() {
    if (screen !== 'game' || !state || state.ended) return;
    open(() => {
      const buttons = [
        button(t('resume'), closeModal, 'primary', 'resume-button'),
        button(t('labTitle'), decisionLab),
        button(t('journal'), journal),
        button(t('sources'), sources),
      ];
      if (state.history.length) buttons.push(button(t('rewind'), undo));
      buttons.push(
        button(t('menu'), () => {
          save();
          closeModal();
          showScreen('home');
        }),
      );
      modal(t('pause'), el('p', '', t('autoPause')), buttons);
    });
  }
  function undo() {
    const previous = S.rewind(state);
    if (!previous) return;
    closeModal();
    state = previous;
    showScreen('game');
    save();
    lowSuitWarned = false;
    beep();
  }
  function finish() {
    closeModal();
    save();
    showScreen('ending');
    renderEnding();
    beep(state.ending === 'lastSignal' ? 'success' : 'click');
  }
  function chart(selected) {
    const rows = [{ turn: 0, energy: 80, air: 72, water: 70, crops: 70 }, ...state.trace],
      max = Math.max(1, state.turn),
      width = 700,
      height = 180;
    const x = (turn) => 40 + (turn / max) * 640,
      y = (value) => 150 - (value / 100) * 130;
    let svg =
      '<svg class="chart" viewBox="0 0 700 180" role="img" aria-label="' + t('replayTitle') + '">';
    for (const value of [0, 25, 50, 75, 100])
      svg += `<path d="M40 ${y(value)}H680" stroke="#2e4a5b"/><text x="28" y="${y(value) + 4}" text-anchor="end" fill="#b3c9d6" font-size="10">${value}</text>`;
    for (const k of resourceKeys) {
      const points = rows.map((r) => x(r.turn) + ',' + y(r[k])).join(' ');
      svg += `<polyline points="${points}" fill="none" stroke="${colors[k]}" stroke-width="2.4"/>`;
    }
    if (selected >= 0 && state.trace[selected]) {
      const row = state.trace[selected];
      svg += `<path d="M${x(row.turn)} 15V155" stroke="#d5e9ea" stroke-dasharray="3 4"/>`;
      for (const k of resourceKeys)
        svg += `<circle cx="${x(row.turn)}" cy="${y(row[k])}" r="4" fill="${colors[k]}"/>`;
    }
    svg += `<text x="40" y="172" fill="#b3c9d6" font-size="10">0</text><text x="680" y="172" text-anchor="end" fill="#b3c9d6" font-size="10">${state.turn} ${t('turn')}</text></svg>`;
    return svg;
  }
  function renderEnding() {
    if (!state) return;
    const data = content().endings[state.ending] ?? content().endings.stormUnprepared;
    const success = ['lastSignal', 'seedKeepers', 'safeHarbor'].includes(state.ending),
      top = el('div', 'ending-top'),
      intro = el('div');
    intro.append(
      el('p', 'eyebrow', t('debrief') + ' / ' + t(success ? 'protected' : 'aborted')),
      el('h1', '', data[0]),
      el('p', '', data[1]),
    );
    top.append(el('div', 'emblem' + (success ? '' : ' failed'), success ? '✓' : '!'), intro);
    const summary = el('div', 'summary');
    for (const k of ['energy', 'air', 'shield', 'signal']) {
      const n = el('div');
      n.append(el('span', '', t(k)), el('strong', '', state[k] + ' / 100'));
      summary.append(n);
    }
    const sc = S.score(state),
      award = el('section', 'mission-award');
    const rank =
      sc.stars === 3
        ? sc.discoveries === 3
          ? 'rankScientist'
          : 'rankCommander'
        : sc.stars === 2
          ? 'rankPilot'
          : 'rankRookie';
    const medal = el('div', 'medal', '★'.repeat(sc.stars) + '☆'.repeat(3 - sc.stars));
    const awardText = el('div', 'award-copy');
    awardText.append(
      el('small', '', t('missionScore')),
      el('h2', '', sc.points + ' / 100 · ' + t(rank)),
      el('p', '', t('researchBadge') + ': ' + sc.discoveries + ' / ' + S.discoveries.length),
    );
    award.append(medal, awardText);
    const replay = el('section', 'replay'),
      graph = el('div'),
      legend = el('div', 'legend'),
      list = el('div', 'decision-list'),
      detail = el('div', 'detail');
    graph.id = 'replay-graph';
    for (const k of resourceKeys) {
      const n = el('span'),
        i = el('i');
      i.style.background = colors[k];
      n.append(i, document.createTextNode(t(k)));
      legend.append(n);
    }
    const select = (index) => {
      graph.innerHTML = chart(index);
      list
        .querySelectorAll('button')
        .forEach((b, i) => b.classList.toggle('selected', i === index));
      const row = state.trace[index];
      detail.textContent = row
        ? resourceKeys.map((k) => t(k) + ': ' + row[k]).join(' · ')
        : t('noDecisions');
    };
    state.trace.forEach((row, i) => {
      const b = button('', () => select(i), 'decision');
      b.append(
        el('span', '', String(row.turn).padStart(2, '0')),
        el('strong', '', t('act_' + row.action)),
        el('small', '', row.energy + ' / ' + row.air + ' / ' + row.water + ' / ' + row.crops),
      );
      list.append(b);
    });
    replay.append(
      el('h2', '', t('replayTitle')),
      el('p', '', t('replayDesc')),
      graph,
      legend,
      list,
      detail,
    );
    select(state.trace.length - 1);
    const buttons = el('div', 'end-buttons');
    buttons.append(
      button(
        t('playAgain'),
        () => {
          showScreen('home');
          start();
        },
        'primary',
        'play-again',
      ),
    );
    if (state.history.length)
      buttons.append(button(t('rewind'), undo, 'secondary', 'rewind-button'));
    buttons.append(
      button(t('export'), exportLog),
      button(lang === 'ru' ? 'Научная академия' : 'Science Academy', () => {
        showScreen('academy');
        window.LunarAcademy?.startSelection();
      }),
      button(t('menu'), () => showScreen('home')),
    );
    $('ending').replaceChildren(
      top,
      summary,
      award,
      replay,
      buttons,
      el('p', 'ending-footer', t('report')),
    );
  }
  function exportLog() {
    const log = {
      game: 'LUNARIS: The Last Signal',
      version: 1,
      model: 'fictional educational simulation',
      language: lang,
      mode: state.mode,
      ending: state.ending,
      discoveries: state.discoveries || [],
      score: S.score(state),
      trace: state.trace,
      source: 'https://ccmc.gsfc.nasa.gov/TP/2024-05-TP-02/',
    };
    const url = URL.createObjectURL(
        new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' }),
      ),
      a = el('a');
    a.href = url;
    a.download = 'LUNARIS-mission-log.json';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function updateMovement(dt) {
    let dx =
      (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) -
      (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) +
      stick.x;
    let dy =
      (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) -
      (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) +
      stick.y;
    for (const d of touches.values()) {
      if (d === 'up') dy--;
      if (d === 'down') dy++;
      if (d === 'left') dx--;
      if (d === 'right') dx++;
    }
    const running = keys.has('ShiftLeft') || keys.has('ShiftRight') || touchRun;
    let distance = (state.world === 'surface' ? 150 : 168) * (running ? 1.4 : 1) * dt;
    state.player.running = running;
    if (dx || dy) route = [];
    else if (route.length) {
      const p = route[0],
        x = p.x - state.player.x,
        y = p.y - state.player.y,
        d = Math.hypot(x, y);
      if (d < distance + 0.5) {
        if (W.canStand(state.world, p.x, p.y)) {
          state.player.x = p.x;
          state.player.y = p.y;
        }
        route.shift();
        return true;
      }
      dx = x;
      dy = y;
    }
    if (!dx && !dy) return false;
    const length = Math.hypot(dx, dy);
    dx = (dx / length) * distance;
    dy = (dy / length) * distance;
    const previous = { ...state.player };
    if (W.canStand(state.world, state.player.x + dx, state.player.y)) state.player.x += dx;
    if (W.canStand(state.world, state.player.x, state.player.y + dy)) state.player.y += dy;
    if (dx > 0.1) state.player.facing = 1;
    else if (dx < -0.1) state.player.facing = 3;
    const moved = Math.hypot(previous.x - state.player.x, previous.y - state.player.y) > 0.01;
    if (!moved) route = [];
    return moved;
  }
  function frame(ms) {
    const dt = lastTime ? Math.min((ms - lastTime) / 1000, 0.05) : 0;
    lastTime = ms;
    let moved = false;
    if (
      screen === 'game' &&
      state &&
      !state.ended &&
      !modalView &&
      !document.hidden &&
      $('rotate-prompt').hidden
    ) {
      moved = updateMovement(dt);
      const hazard = state.world === 'surface' && W.hazardAt(state.player.x, state.player.y);
      S.advanceEVA?.(state, dt);
      const event = S.hazardState?.(state);
      S.drainSuit(
        state,
        dt,
        (hazard ? 2.4 : 1) * (event?.multiplier || 1) * (moved && state.player.running ? 1.18 : 1),
      );
      if (hazard && !dustWarned) {
        toast(t('scanDust'));
        beep('error');
        dustWarned = true;
      }
      if (!hazard) dustWarned = false;
      if (state.ended) finish();
      else if (state.world === 'surface' && state.suit < 25 && !lowSuitWarned) {
        lowSuitWarned = true;
        toast(t('suitWarning'));
        beep('error');
      }
      if (ms - hudTime > 150) {
        updateHUD();
        hudTime = ms;
      }
      if (ms - saveTime > 4000) {
        save();
        saveTime = ms;
      }
    }
    if (ms - paintTime > 16 && !document.hidden) {
      const time = reducedMotion ? 0 : ms / 1000;
      if (screen === 'home') R.cover($('cover'), time);
      else if (screen === 'game' && state)
        renderer.paint(state, time, t, moved, route, {
          active: scanUntil > ms / 1000,
          age: ms / 1000 - scanStart,
        });
      paintTime = ms;
    }
    requestAnimationFrame(frame);
    animateSpeech(ms);
  }
  // Dialog controls and input are deliberately kept separate from the mission model.
  const modalActions = el('div', 'modal-actions'),
    modalLanguage = button('', toggleLanguage, 'language', 'modal-language');
  $('modal-close').before(modalActions);
  modalActions.append(modalLanguage, $('modal-close'));
  for (const k of resourceKeys) {
    const n = el('div', 'resource');
    n.dataset.key = k;
    n.id = 'resource-' + k;
    const top = el('div', 'resource-top');
    top.append(el('span', '', t(k)), el('strong', '', 0));
    const meter = el('div', 'meter');
    meter.append(el('i'));
    n.append(top, meter);
    $('resources').append(n);
  }
  $('language').onclick = toggleLanguage;
  $('modal-close').onclick = closeModal;
  $('fullscreen').onclick = toggleFullscreen;
  $('rotate-fullscreen').onclick = toggleFullscreen;
  $('sabotage').onclick = sabotageDiagnosis;
  $('pix-diagnose').onclick = sabotageDiagnosis;
  const sabotageQuick = button('△', sabotageDiagnosis, '', 'sabotage-quick');
  sabotageQuick.hidden = true;
  $('lab').after(sabotageQuick);
  const oldFace = document.querySelector('.pix-face'),
    pixTalk = button('▰', talkToPix, 'pix-face', 'pix-talk');
  oldFace.replaceWith(pixTalk);
  $('pix-dialogue-close').onclick = () => {
    dialogueDismissed = true;
    $('pix-dialogue').classList.remove('visible');
  };
  $('rotate-continue').onclick = () => {
    portraitAllowed = true;
    updateOrientation();
  };
  $('navigate').onclick = navigateToTarget;
  $('navigate-mobile').onclick = navigateToTarget;
  $('sound').onclick = () => {
    sound = !sound;
    write(SOUND, sound ? 'on' : 'off');
    translate();
    beep();
  };
  $('start').onclick = start;
  $('continue').onclick = continueGame;
  $('help').onclick = help;
  $('home-help').onclick = help;
  $('home-sources').onclick = sources;
  $('pause').onclick = pause;
  $('journal').onclick = journal;
  $('map').onclick = showMap;
  $('scan').onclick = scienceScan;
  $('action').onclick = interact;
  $('hint').onclick = () => {
    if (state) speak(content().chapters[state.chapter][1], 'hint', true);
  };
  $('lab').onclick = decisionLab;
  $('brand').onclick = () => {
    if (screen === 'game') pause();
    else {
      closeModal();
      showScreen('home');
    }
  };
  $('world').addEventListener('pointerdown', (e) => {
    if (modalView || screen !== 'game' || e.button > 0) return;
    e.preventDefault();
    $('world').focus({ preventScroll: true });
    const p = renderer.toWorld(e.clientX, e.clientY);
    route = W.path(state.world, state.player, p);
  });
  const stickEl = $('joystick');
  function moveStick(e) {
    if (stick.id !== e.pointerId) return;
    const rect = stickEl.getBoundingClientRect(),
      radius = rect.width * 0.33;
    const x = e.clientX - rect.left - rect.width / 2,
      y = e.clientY - rect.top - rect.height / 2,
      length = Math.hypot(x, y),
      scale = length > radius ? radius / length : 1;
    stick.x = length < 8 ? 0 : (x * scale) / radius;
    stick.y = length < 8 ? 0 : (y * scale) / radius;
    $('joystick-knob').style.transform =
      'translate(calc(-50% + ' + x * scale + 'px),calc(-50% + ' + y * scale + 'px))';
    route = [];
  }
  stickEl.addEventListener('pointerdown', (e) => {
    if (modalView || screen !== 'game') return;
    e.preventDefault();
    stick.id = e.pointerId;
    stickEl.setPointerCapture(e.pointerId);
    stickEl.classList.add('held');
    moveStick(e);
  });
  stickEl.addEventListener('pointermove', moveStick);
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
    stickEl.addEventListener(type, (e) => {
      if (stick.id !== e.pointerId) return;
      stick = { x: 0, y: 0, id: null };
      stickEl.classList.remove('held');
      $('joystick-knob').style.transform = 'translate(-50%,-50%)';
    });
  stickEl.addEventListener('contextmenu', (e) => e.preventDefault());
  $('touch-run').addEventListener('pointerdown', (e) => {
    if (modalView) return;
    e.preventDefault();
    touchRun = !touchRun;
    $('touch-run').setAttribute('aria-pressed', String(touchRun));
  });
  for (const b of document.querySelectorAll('[data-dir]')) {
    b.addEventListener('pointerdown', (e) => {
      if (modalView || screen !== 'game') return;
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      touches.set(e.pointerId, b.dataset.dir);
      b.classList.add('held');
      route = [];
    });
    const release = (e) => {
      touches.delete(e.pointerId);
      b.classList.remove('held');
    };
    b.addEventListener('pointerup', release);
    b.addEventListener('pointercancel', release);
    b.addEventListener('lostpointercapture', release);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  document.addEventListener('keydown', (e) => {
    if (modalView) {
      if (e.code === 'Escape') {
        e.preventDefault();
        closeModal();
        return;
      }
      if (e.code === 'Tab') {
        const focus = [
            ...$('modal').querySelectorAll('button:not(:disabled),a[href],input'),
          ].filter((n) => n.getClientRects().length),
          first = focus[0],
          last = focus.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
      return;
    }
    if (screen !== 'game') return;
    if (['ShiftLeft', 'ShiftRight'].includes(e.code)) {
      e.preventDefault();
      keys.add(e.code);
      return;
    }
    if (
      ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(
        e.code,
      )
    ) {
      e.preventDefault();
      keys.add(e.code);
      return;
    }
    if (e.repeat) return;
    if (e.code === 'KeyE' || e.code === 'Space') {
      e.preventDefault();
      interact();
    } else if (e.code === 'Escape' || e.code === 'KeyP') pause();
    else if (e.code === 'KeyJ') journal();
    else if (e.code === 'KeyM') showMap();
    else if (e.code === 'KeyQ') scienceScan();
    else if (e.code === 'KeyL') decisionLab();
    else if (e.code === 'KeyN') navigateToTarget();
    else if (e.code === 'KeyF') toggleFullscreen();
    else if (e.code === 'KeyX') sabotageDiagnosis();
  });
  document.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => {
    clearInput();
    if (screen === 'game' && !modalView) pause();
  });
  document.addEventListener('visibilitychange', () => {
    clearInput();
    if (document.hidden && screen === 'game') {
      save();
      if (!modalView) pause();
    }
  });
  window.addEventListener('pagehide', save);
  window.addEventListener('resize', updateOrientation);
  document.addEventListener('fullscreenchange', updateOrientation);
  $('continue').hidden = !saved;
  translate();
  requestAnimationFrame(frame);
  // Read-only diagnostics let the included tests inspect progress without adding a cheat mode.
  window.Lunaris = Object.freeze({
    version: '6.1',
    build: '6.1-studio-cleanup',
    openAcademy: () => showScreen('academy'),
    goHome: () => showScreen('home'),
    requestGameDisplay: prepareDisplay,
    say: (message) => speak(message, 'academy', true),
    getState: () => (state ? S.copy(state) : null),
    getScreen: () => screen,
  });
})();
