(function () {
  'use strict';

  const missionIds = ['water', 'shield', 'comms', 'rover'];
  const imageLoadTimeout = 15_000;

  function showLoadWarning(message) {
    const warning = document.getElementById('boot-warning');
    if (!warning) return;
    const russian = document.documentElement.lang === 'ru';
    document.getElementById('boot-warning-title').textContent = russian
      ? 'Не удалось полностью загрузить игру'
      : 'The game could not finish loading';
    document.getElementById('boot-warning-message').textContent = message;
    const reloadButton = document.getElementById('boot-warning-reload');
    reloadButton.textContent = russian ? 'Перезагрузить игру' : 'Reload game';
    reloadButton.onclick = () => {
      const url = new URL(location.href);
      url.searchParams.set('reload', String(Date.now()));
      location.replace(url.href);
    };
    warning.hidden = false;
  }

  function openRoute(initial = false) {
    const route = location.hash.slice(1);
    if (route === 'story') {
      window.Lunaris.goHome();
      return;
    }
    if (missionIds.includes(route)) {
      window.LunarAcademy.openMission(route);
      return;
    }
    const pathname = location.pathname;
    const indexPage = pathname.endsWith('/') || pathname.endsWith('/index.html');
    const expeditionPage = /\/expeditions(?:-v6-1)?\.html$/.test(pathname);
    if ((initial && !route && indexPage) || route === 'academy' || expeditionPage) {
      window.Lunaris.openAcademy();
      window.LunarAcademy.startSelection();
    }
  }

  async function loadArtwork() {
    let timeout;
    try {
      await Promise.race([
        window.LunarAcademyRender.preload(),
        new Promise((resolve) => {
          timeout = setTimeout(resolve, imageLoadTimeout);
        }),
      ]);
      const status = window.LunarAcademyRender.assetStatus();
      return missionIds.every((id) => status[id] === 'ready');
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function start() {
    const russian = document.documentElement.lang === 'ru';
    const modulesLoaded =
      window.Lunaris?.version === '6.1' &&
      window.LunarAcademyPlay &&
      window.LunarAcademyRender &&
      window.LunarAcademyAssets &&
      window.LunarAcademy;
    document.documentElement.dataset.lunarisBuild = window.Lunaris?.build || 'incomplete';
    if (!modulesLoaded) {
      showLoadWarning(
        russian
          ? 'Не все игровые модули загрузились. Перезагрузи страницу. Сохранения остаются в браузере.'
          : 'Some game modules failed to load. Reload the page. Your saved progress stays in the browser.',
      );
      return;
    }
    openRoute(true);
    window.addEventListener('hashchange', () => openRoute());
    if (!(await loadArtwork())) {
      showLoadWarning(
        russian
          ? 'Не удалось загрузить изображения локаций. Перезагрузи игру.'
          : 'The location images could not load. Reload the game.',
      );
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    return start();
  }
})();
