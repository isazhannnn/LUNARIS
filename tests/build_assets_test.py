"""Regression tests for cache-safe deployment and truly offline artwork."""
from pathlib import Path
import base64
import hashlib
import importlib.util
import json
import re
import tempfile
import unittest
from urllib.parse import urlsplit

PROJECT = Path(__file__).resolve().parents[1]

def load_tool(name):
    spec = importlib.util.spec_from_file_location(name, PROJECT / 'tools' / (name + '.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

STATIC = load_tool('prepare_static')
STANDALONE = load_tool('build_standalone')

class BuildAssetsTest(unittest.TestCase):
    def setUp(self):
        scratch = PROJECT / 'test-results'
        scratch.mkdir(exist_ok=True)
        self.temporary = tempfile.TemporaryDirectory(prefix='lunaris-build-test-', dir=scratch)
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name).resolve()
        for directory in ('js', 'css', 'assets/academy/masters'):
            (self.root / directory).mkdir(parents=True, exist_ok=True)
        self.images = {}
        for name in ('water', 'shield', 'comms', 'rover'):
            # The builder preserves bytes; actual image decoding has separate QA.
            self.images[name] = b'RIFF' + name.encode() + b'WEBP fixture\x00\xff'
            (self.root / f'assets/academy/{name}.webp').write_bytes(self.images[name])
        (self.root / 'assets/academy/masters/water.png').write_bytes(b'original master must not ship')
        (self.root / 'js/academy-assets.js').write_text(
            "window.LunarAcademyAssets={" + ','.join(f"{name}:'assets/academy/{name}.webp'" for name in self.images) + '};\n', encoding='utf-8')
        self.marker = r'''window.marker = "line\nnext"; window.closing = "</script>";'''
        (self.root / 'js/game.js').write_text(self.marker, encoding='utf-8')
        (self.root / 'css/game.css').write_text(".world{background:url('../assets/academy/water.webp')}\n", encoding='utf-8')
        (self.root / 'index.html').write_text('''<!doctype html><html><head>
<meta name="lunaris-build" content="6.0-test-build">
<link rel="stylesheet" href="css/game.css">
<script defer src="js/academy-assets.js?previous=5"></script>
<script defer src="js/game.js"></script>
</head><body><canvas id="world"></canvas></body></html>''', encoding='utf-8')

    def test_every_html_reference_is_fingerprinted_and_exists(self):
        release = STATIC.prepare(self.root)
        target = self.root / 'dist'
        html = (target / 'index.html').read_text(encoding='utf-8')
        references = re.findall(r'(?:src|href)="([^"]+)"', html)
        self.assertEqual(len(references), 3)
        for uri in references:
            relative = urlsplit(uri).path
            self.assertRegex(relative, r'\.[a-f0-9]{12}\.(?:js|css)$')
            self.assertTrue((target / relative).is_file(), uri)
        for original, relative in release['manifest'].items():
            data = (target / relative).read_bytes()
            self.assertIn(hashlib.sha256(data).hexdigest()[:12], relative)
            self.assertEqual(data, (target / original).read_bytes())

    def test_old_build_artifacts_are_removed_but_unmanaged_files_remain(self):
        first = STATIC.prepare(self.root)
        target = self.root / 'dist'
        unmanaged = target / 'manual.123456abcdef.js'
        unmanaged.write_text('keep me', encoding='utf-8')
        (self.root / 'js/game.js').write_text('window.marker = "new";', encoding='utf-8')
        second = STATIC.prepare(self.root)
        self.assertFalse((target / first['manifest']['js/game.js']).exists())
        self.assertTrue((target / second['manifest']['js/game.js']).exists())
        self.assertEqual(unmanaged.read_text(encoding='utf-8'), 'keep me')

    def test_four_maps_are_rewritten_before_script_fingerprinting(self):
        release = STATIC.prepare(self.root)
        target = self.root / 'dist'
        script = (target / release['manifest']['js/academy-assets.js']).read_text(encoding='utf-8')
        for name in self.images:
            original = f'assets/academy/{name}.webp'
            self.assertIn(release['manifest'][original], script)
            self.assertNotIn("'" + original + "'", script)
        css = (target / release['manifest']['css/game.css']).read_text(encoding='utf-8')
        self.assertIn('../' + release['manifest']['assets/academy/water.webp'], css)
        self.assertFalse((target / 'assets/academy/masters').exists())

    def test_marked_svg_artwork_is_fingerprinted_and_embedded_offline(self):
        svg = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><text y="8">SI-GENERATED ARTWORK</text></svg>'
        (self.root / 'assets/academy/water.svg').write_text(svg, encoding='utf-8')
        script = self.root / 'js/academy-assets.js'
        script.write_text(script.read_text(encoding='utf-8').replace('water.webp','water.svg'),encoding='utf-8')
        release = STATIC.prepare(self.root, bundled=True)
        self.assertIn('assets/academy/water.svg', release['manifest'])
        html = (self.root / 'dist/index.html').read_text(encoding='utf-8')
        encoded = base64.b64encode(svg.encode('utf-8')).decode('ascii')
        self.assertIn('data:image/svg+xml;base64,' + encoded, html)

    def test_changed_map_invalidates_dependent_script_and_css(self):
        first = STATIC.prepare(self.root)
        (self.root / 'assets/academy/water.webp').write_bytes(self.images['water'] + b'updated')
        second = STATIC.prepare(self.root)
        for path in ('assets/academy/water.webp', 'js/academy-assets.js', 'css/game.css'):
            self.assertNotEqual(first['manifest'][path], second['manifest'][path])
        self.assertEqual(first['manifest']['js/game.js'], second['manifest']['js/game.js'])
        self.assertNotEqual(first['contentHash'], second['contentHash'])

    def test_release_and_fresh_entrypoint_agree(self):
        release = STATIC.prepare(self.root)
        target = self.root / 'dist'
        self.assertEqual(release['version'], '6.0')
        self.assertEqual(release['build'], '6.0-test-build')
        self.assertEqual(json.loads((target / 'release.json').read_text(encoding='utf-8')), release)
        self.assertEqual((target / 'index.html').read_bytes(), (target / 'play-v6.html').read_bytes())

    def test_standalone_embeds_maps_and_preserves_js_escaping(self):
        html = STANDALONE.build(self.root).read_text(encoding='utf-8')
        self.assertNotIn('<script defer src=', html)
        self.assertNotIn('<link rel="stylesheet"', html)
        self.assertNotIn("'assets/academy/", html)
        self.assertGreater(html.index('window.LunarAcademyAssets'), html.index('<canvas id="world">'))
        uris = re.findall(r'data:image/webp;base64,([A-Za-z0-9+/=]+)', html)
        self.assertEqual(len(uris), 5)  # four JS maps and water reused in CSS
        self.assertEqual(set(map(base64.b64decode, uris)), set(self.images.values()))
        self.assertIn(r'"line\nnext"', html)
        self.assertIn(r'"<\/script>"', html)
        self.assertNotIn(r'"</script>"', html)

    def test_missing_runtime_image_fails_instead_of_silent_fallback(self):
        (self.root / 'assets/academy/water.webp').unlink()
        with self.assertRaises(FileNotFoundError):
            STATIC.prepare(self.root)
        with self.assertRaises(FileNotFoundError):
            STANDALONE.build(self.root)

    def test_production_entrypoint_is_one_atomic_release(self):
        release = STATIC.prepare(self.root, bundled=True)
        target = self.root / 'dist'
        html = (target / 'index.html').read_text(encoding='utf-8')
        self.assertEqual(release['delivery'], 'self-contained')
        self.assertEqual(release['entrypoint'], 'index.html')
        self.assertNotIn('<script defer src=', html)
        self.assertNotIn('<link rel="stylesheet"', html)
        self.assertIn('data:image/webp;base64,', html)
        self.assertEqual(hashlib.sha256(html.encode('utf-8')).hexdigest(), release['contentHash'])
        self.assertEqual((target / 'index.html').read_bytes(), (target / 'expeditions-v6-1.html').read_bytes())
        self.assertIn('<script defer src=', (target / 'modules.html').read_text(encoding='utf-8'))

if __name__ == '__main__':
    unittest.main(verbosity=2)
