"""Rebuild the offline edition, including generated runtime WebP artwork."""
from pathlib import Path
import base64
import os
import re
import tempfile
from urllib.parse import unquote, urlsplit

ATTRIBUTE = re.compile(r"([\w:-]+)\s*=\s*(['\"])(.*?)\2", re.DOTALL)
QUOTED_ASSET = re.compile(r"(?P<q>['\"])(?P<url>(?:\./)?assets/[^'\"\r\n]+\.(?:webp|svg)(?:[?#][^'\"\r\n]*)?)(?P=q)", re.IGNORECASE)
CSS_URL = re.compile(r"url\(\s*(?P<q>['\"]?)(?P<url>[^)'\"\s]+)(?P=q)\s*\)", re.IGNORECASE)

def local_path(root, uri, base=None):
    parsed = urlsplit(uri)
    if parsed.scheme or parsed.netloc or not parsed.path:
        return None
    path = ((base or root) / unquote(parsed.path).lstrip('/')).resolve()
    if not path.is_relative_to(root):
        raise ValueError(f'Resource escapes project: {uri}')
    return path

def image_uri(root, uri, base=None):
    path = local_path(root, uri, base)
    if path is None or path.suffix.lower() not in ('.webp', '.svg'):
        return uri
    if not path.is_file():
        raise FileNotFoundError(f'Missing offline image: {uri}')
    if 'masters' in path.relative_to(root).parts:
        raise ValueError('Original image masters are not runtime assets')
    mime = 'image/svg+xml' if path.suffix.lower() == '.svg' else 'image/webp'
    return 'data:' + mime + ';base64,' + base64.b64encode(path.read_bytes()).decode('ascii')

def build(root, output=None):
    root = Path(root).resolve()
    output = Path(output).resolve() if output is not None else root / 'LUNARIS-Play.html'
    html = (root / 'index.html').read_text(encoding='utf-8')

    def include_style(match):
        tag = match.group(0)
        attributes = {key.lower(): value for key, _, value in ATTRIBUTE.findall(tag)}
        if attributes.get('rel', '').lower() != 'stylesheet' or 'href' not in attributes:
            return tag
        path = local_path(root, attributes['href'])
        if path is None:
            return tag
        css = path.read_text(encoding='utf-8')
        css = CSS_URL.sub(lambda item: 'url(' + item.group('q') + image_uri(root, item.group('url'), path.parent) + item.group('q') + ')', css)
        return '<style>\n' + re.sub(r'</style', r'<\\/style', css, flags=re.IGNORECASE) + '\n</style>'

    html = re.sub(r'<link\b[^>]*>', include_style, html, flags=re.IGNORECASE)
    scripts = []

    def include_script(match):
        tag = match.group(0)
        opening = tag[:tag.find('>') + 1]
        attributes = {key.lower(): value for key, _, value in ATTRIBUTE.findall(opening)}
        if 'src' not in attributes or not re.search(r'\sdefer(?:\s|=|>)', opening, re.IGNORECASE):
            return tag
        path = local_path(root, attributes['src'])
        if path is None:
            return tag
        source = path.read_text(encoding='utf-8')
        source = QUOTED_ASSET.sub(lambda item: item.group('q') + image_uri(root, item.group('url')) + item.group('q'), source)
        # An HTML parser recognizes a closing script tag even inside a JS string.
        scripts.append(re.sub(r'</script', r'<\\/script', source, flags=re.IGNORECASE))
        return ''

    html = re.sub(r'<script\b[^>]*>.*?</script\s*>', include_script, html, flags=re.IGNORECASE | re.DOTALL)
    if not re.search(r'</body\s*>', html, re.IGNORECASE):
        raise ValueError('The source page has no closing body tag')
    payload = '\n'.join('<script>\n' + source + '\n</script>' for source in scripts) + '\n'
    html = re.sub(r'</body\s*>', lambda _: payload + '</body>', html, count=1, flags=re.IGNORECASE)
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(prefix='.' + output.name + '-', suffix='.tmp', dir=output.parent, delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(html.encode('utf-8'))
        os.replace(temporary, output)
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()
    return output

if __name__ == '__main__':
    result = build(Path(__file__).resolve().parents[1])
    print(f'Wrote {result.name} ({result.stat().st_size:,} bytes, runtime artwork embedded)')
