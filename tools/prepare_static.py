"""Build cache-safe static files using only Python's standard library.

Every runtime WebP, CSS file and JavaScript file receives a content fingerprint.
Image references are rewritten before their containing CSS/JS is fingerprinted.
Original source paths stay unchanged; dist also gets latest stable-name copies.
"""
from pathlib import Path
import hashlib
import importlib.util
import json
import os
import posixpath
import re
import tempfile
from urllib.parse import unquote, urlsplit, urlunsplit

QUOTED_ASSET = re.compile(r"(?P<q>['\"])(?P<url>(?:\./)?assets/[^'\"\r\n]+\.(?:webp|svg)(?:[?#][^'\"\r\n]*)?)(?P=q)", re.IGNORECASE)
CSS_URL = re.compile(r"url\(\s*(?P<q>['\"]?)(?P<url>[^)'\"\s]+)(?P=q)\s*\)", re.IGNORECASE)
HTML_RESOURCE = re.compile(r"(?P<attr>\b(?:src|href)\s*=\s*)(?P<q>['\"])(?P<url>[^'\"]+)(?P=q)", re.IGNORECASE)

def source_path(root, uri):
    """Resolve a relative URI and reject paths outside the selected project."""
    parsed = urlsplit(uri)
    if parsed.scheme or parsed.netloc or not parsed.path:
        return None
    relative = unquote(parsed.path).replace('\\', '/')
    if relative.startswith('/'):
        relative = relative[1:]
    path = (root / relative).resolve()
    if not path.is_relative_to(root):
        raise ValueError(f'Resource escapes project: {uri}')
    return path

def write_atomic(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(prefix='.' + path.name + '-', suffix='.tmp', dir=path.parent, delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(payload)
        os.replace(temporary, path)
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()

def fingerprint(relative, payload):
    path = Path(relative)
    digest = hashlib.sha256(payload).hexdigest()[:12]
    return (path.parent / f'{path.stem}.{digest}{path.suffix}').as_posix()

def rewrite_uri(uri, manifest, base=''):
    parsed = urlsplit(uri)
    if parsed.scheme or parsed.netloc or not parsed.path:
        return uri
    key = posixpath.normpath(posixpath.join(base, unquote(parsed.path))).lstrip('/')
    if key not in manifest:
        return uri
    replacement = manifest[key]
    if base:
        replacement = posixpath.relpath(replacement, base)
    return urlunsplit(('', '', replacement, parsed.query, parsed.fragment))

def prepare(root, target=None, bundled=False):
    root = Path(root).resolve()
    target = Path(target).resolve() if target is not None else root / 'dist'
    if target == root:
        raise ValueError('Static output must not overwrite the project root')
    target.mkdir(parents=True, exist_ok=True)
    manifest = {}
    digests = {}

    def emit(relative, payload):
        hashed = fingerprint(relative, payload)
        manifest[relative] = hashed
        digests[relative] = hashlib.sha256(payload).hexdigest()
        write_atomic(target / hashed, payload)
        write_atomic(target / relative, payload)

    # Original PNG masters are documentation/source assets, never runtime files.
    assets = root / 'assets'
    if assets.is_dir():
        for asset in sorted(assets.rglob('*')):
            if not asset.is_file() or asset.suffix.lower() not in ('.webp', '.svg'):
                continue
            relative = asset.relative_to(root)
            if 'masters' not in relative.parts:
                emit(relative.as_posix(), asset.read_bytes())

    def rewrite_asset(match):
        original = match.group('url')
        path = source_path(root, original)
        if path is None or not path.is_file():
            raise FileNotFoundError(f'Missing runtime image: {original}')
        key = path.relative_to(root).as_posix()
        if key not in manifest:
            raise ValueError(f'Runtime image is excluded from the static build: {original}')
        return match.group('q') + rewrite_uri(original, manifest) + match.group('q')

    for folder, extension in (('css', '*.css'), ('js', '*.js')):
        directory = root / folder
        if not directory.is_dir():
            continue
        for file in sorted(directory.rglob(extension)):
            relative = file.relative_to(root).as_posix()
            text = file.read_text(encoding='utf-8')
            if folder == 'js':
                text = QUOTED_ASSET.sub(rewrite_asset, text)
            else:
                base = posixpath.dirname(relative)
                text = CSS_URL.sub(lambda match: 'url(' + match.group('q') + rewrite_uri(match.group('url'), manifest, base) + match.group('q') + ')', text)
            emit(relative, text.encode('utf-8'))

    html = (root / 'index.html').read_text(encoding='utf-8')
    html = HTML_RESOURCE.sub(lambda match: match.group('attr') + match.group('q') + rewrite_uri(match.group('url'), manifest) + match.group('q'), html)
    marker = re.search(r'<meta\b[^>]*\bname\s*=\s*[\'\"]lunaris-build[\'\"][^>]*\bcontent\s*=\s*[\'\"]([^\'\"]+)', html, re.IGNORECASE)
    content_hash = hashlib.sha256((html + json.dumps(digests, sort_keys=True)).encode('utf-8')).hexdigest()
    release = {
        'version': '6.1' if bundled else '6.0',
        'build': marker.group(1) if marker else '6.0-' + content_hash[:12],
        'contentHash': content_hash,
        'entrypoint': 'index.html' if bundled else 'play-v6.html',
        'delivery': 'self-contained' if bundled else 'modules',
        'manifest': manifest,
    }
    encoded = html.encode('utf-8')
    if bundled:
        # Production HTML is one atomic release: CSS, code and art travel together.
        # Keep the module edition only for diagnostics and regression checks.
        write_atomic(target / 'modules.html', encoded)
        spec = importlib.util.spec_from_file_location('lunaris_standalone', Path(__file__).with_name('build_standalone.py'))
        standalone = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(standalone)
        output = standalone.build(root, target / 'LUNARIS-Play.html')
        encoded = output.read_bytes()
        release['contentHash'] = hashlib.sha256(encoded).hexdigest()
        write_atomic(target / 'expeditions-v6-1.html', encoded)
        write_atomic(target / 'expeditions.html', encoded)
    write_atomic(target / 'index.html', encoded)
    write_atomic(target / 'play-v6.html', encoded)
    write_atomic(target / 'release.json', (json.dumps(release, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
    current_files = set(manifest.values())
    for file in target.rglob('*'):
        if not file.is_file() or not re.search(r'\.[a-f0-9]{12}\.', file.name):
            continue
        relative = file.relative_to(target).as_posix()
        original = re.sub(r'\.[a-f0-9]{12}(?=\.[^.]+$)', '', relative)
        if original in manifest and relative not in current_files:
            if not file.resolve().is_relative_to(target):
                raise ValueError(f'Build artifact escapes target: {file}')
            file.unlink()
    return release

if __name__ == '__main__':
    result = prepare(Path(__file__).resolve().parents[1], bundled=True)
    print(f"Prepared dist/: {len(result['manifest'])} fingerprinted resources; build {result['build']}")
