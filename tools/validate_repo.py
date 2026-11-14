from pathlib import Path
from urllib.parse import urlsplit,unquote
import json,re,xml.etree.ElementTree as ET

root=Path(__file__).resolve().parents[1]
errors=[];checked=0
for document in root.rglob('*.md'):
    if any(p in ('dist','test-results','.git') for p in document.relative_to(root).parts):continue
    for link in re.findall(r'\]\(([^)]+)\)',document.read_text(encoding='utf-8')):
        uri=urlsplit(link)
        if uri.scheme or uri.netloc or not uri.path:continue
        target=(document.parent/unquote(uri.path)).resolve()
        checked+=1
        if not target.is_relative_to(root) or not target.exists():errors.append(f'{document.name}: {link}')
ns={'svg':'http://www.w3.org/2000/svg'}
for name in ['water','shield','comms','rover']:
    svg=ET.parse(root/f'assets/academy/{name}.svg')
    labels=' '.join(''.join(t.itertext()) for t in svg.findall('.//svg:text',ns))
    if 'SI-GENERATED ARTWORK' not in labels:errors.append(name+' has no visible mark')
metadata=json.loads((root/'PROJECT_METADATA.json').read_text(encoding='utf-8'))
assert metadata['creator']=='Parsec Studio'
assert metadata['release_date']=='2026-11-14'
for name in ['index.html','LUNARIS-Play.html']:
    text=(root/name).read_text(encoding='utf-8')
    assert 'si-code-assistance' in text and 'si-artwork' in text
    assert 'Parsec Studio' in text
assert (root/'demo/LUNARIS-Demo.pdf').stat().st_size<25*1024*1024
if errors:raise SystemExit('\n'.join(errors))
print(f'PASS {checked} local documentation links, four marked environments, credits, metadata and demo size')
