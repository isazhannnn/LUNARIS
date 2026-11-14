const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../js/boot.js'), 'utf8');

async function boot(pathname, hash = '', options = {}) {
  const calls = [];
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) elements.set(id, { hidden: true, textContent: '' });
    return elements.get(id);
  };
  const context = {
    location: { pathname, hash, href: 'https://example.test' + pathname + hash },
    document: {
      readyState: 'complete',
      documentElement: { lang: 'en', dataset: {} },
      getElementById: element,
    },
    URL,
    setTimeout,
    clearTimeout,
    window: {
      addEventListener() {},
      Lunaris: {
        version: '6.1',
        build: '6.1',
        openAcademy() {},
        goHome() {
          calls.push('story');
        },
      },
      LunarAcademyPlay: {},
      LunarAcademyAssets: {},
      LunarAcademyRender: {
        preload: () =>
          options.rejectArtwork ? Promise.reject(new Error('offline')) : Promise.resolve(),
        assetStatus: () =>
          Object.fromEntries(
            ['water', 'shield', 'comms', 'rover'].map((id) => [
              id,
              options.missingArtwork ? 'error' : 'ready',
            ]),
          ),
      },
      LunarAcademy: {
        startSelection() {
          calls.push('hub');
        },
        openMission(id) {
          calls.push(id);
        },
      },
    },
  };
  if (options.missingModule) delete context.window.LunarAcademyPlay;
  await vm.runInNewContext(source, context);
  return { calls, warning: element('boot-warning') };
}

(async () => {
  let passed = 0;
  for (const pathname of [
    '/',
    '/index.html',
    '/lunaris/',
    '/lunaris/index.html',
    '/school/games/lunaris/',
  ]) {
    const result = await boot(pathname);
    assert.deepEqual(result.calls, ['story'], pathname);
    assert.equal(result.warning.hidden, true);
    passed++;
  }
  for (const id of ['water', 'shield', 'comms', 'rover']) {
    assert.deepEqual((await boot('/lunaris/', '#' + id)).calls, [id]);
    passed++;
  }
  assert.deepEqual((await boot('/lunaris/', '#story')).calls, ['story']);
  assert.deepEqual((await boot('/lunaris/', '#academy')).calls, ['hub']);
  assert.deepEqual((await boot('/expeditions-v6-1.html')).calls, ['hub']);
  assert.equal((await boot('/lunaris/', '', { missingModule: true })).warning.hidden, false);
  assert.equal((await boot('/lunaris/', '', { missingArtwork: true })).warning.hidden, false);
  assert.equal((await boot('/lunaris/', '', { rejectArtwork: true })).warning.hidden, false);
  passed += 6;
  console.log(`PASS ${passed} startup routes and module/artwork failure checks`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
