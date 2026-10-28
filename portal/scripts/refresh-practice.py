"""Refresh the bounded lesson previews from a Google Slides PDF + native JSON export."""
import argparse
import json
import subprocess
import tempfile
from pathlib import Path
from PIL import Image
from pypdf import PdfReader

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--pdf', required=True, type=Path)
parser.add_argument('--presentation', required=True, type=Path)
parser.add_argument('--pdftoppm', default='pdftoppm')
args = parser.parse_args()
portal = Path(__file__).resolve().parents[1]
manifest = portal / 'content/practice-pages.mjs'
source = manifest.read_text(encoding='utf-8')
pages = json.loads(source.split('export const ws1Practice = ', 1)[1].rstrip().removesuffix(';'))
deck = json.loads(args.presentation.read_text(encoding='utf-8'))
deck = deck.get('structuredContent', deck)
slides = deck['slides']
if len(PdfReader(args.pdf).pages) != len(slides):
    raise ValueError('PDF와 JSON의 페이지 수가 다릅니다. 같은 버전으로 다시 내보내세요.')
positions = {s['objectId']: (i + 1, s) for i, s in enumerate(slides)}
if any(page['id'] not in positions for page in pages.values()):
    raise ValueError('과제 페이지 ID를 원본에서 찾지 못했습니다. 연결을 먼저 확인하세요.')
with tempfile.TemporaryDirectory(prefix='.practice-preview-', dir=portal) as tmp:
    assert Path(tmp).resolve().is_relative_to(portal)
    for key, page in pages.items():
        number, slide = positions[page['id']]
        prefix = str(Path(tmp) / key)
        subprocess.run([args.pdftoppm, '-f', str(number), '-l', str(number), '-singlefile', '-scale-to', '1600', '-png', str(args.pdf.resolve()), prefix], check=True)
        target = portal / 'public' / page['image'].lstrip('/')
        if not target.resolve().is_relative_to((portal / 'public/images/practice').resolve()):
            raise ValueError('이미지 경로가 과제 자료 폴더 밖입니다.')
        target.parent.mkdir(parents=True, exist_ok=True)
        with Image.open(prefix + '.png') as image:
            image.save(target, quality=91)
        text = lambda e: ''.join(t.get('textRun', {}).get('content', '') for t in e.get('shape', {}).get('text', {}).get('textElements', [])).strip()
        elements = slide.get('pageElements', [])
        title = next((text(e) for e in elements if e['objectId'].endswith('_base_2')), page['title'])
        body = [text(e) for e in elements if '_base_' not in e['objectId'] and text(e)]
        page.update(number=number, title=title, text='\n'.join(body))
manifest.write_text('// Google Slides의 과제 페이지에서 내보낸 미리보기. 갱신 방법: portal/README.md\nexport const ws1Practice = ' + json.dumps(pages, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
print(f'과제 페이지 {len(pages)}장 갱신 완료')
