"""Refresh the '이 페이지 글로 읽기' transcripts from a Google Slides native JSON export (get_presentation)."""
import argparse
import json
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--workshop', choices=[1, 2], type=int, default=1)
parser.add_argument('--presentation', required=True, type=Path)
args = parser.parse_args()
portal = Path(__file__).resolve().parents[1]
manifest = portal / ('content/practice-pages.mjs' if args.workshop == 1 else 'content/practice-pages-ws2.mjs')
export_name = f'ws{args.workshop}Practice'
source = manifest.read_text(encoding='utf-8')
pages = json.loads(source.split(f'export const {export_name} = ', 1)[1].rstrip().removesuffix(';'))
deck = json.loads(args.presentation.read_text(encoding='utf-8'))
deck = deck.get('structuredContent', deck)
slides = {s['objectId']: s for s in deck['slides']}
if any(page['id'] not in slides for page in pages.values()):
    raise ValueError('과제 페이지 ID를 원본에서 찾지 못했습니다. 연결을 먼저 확인하세요.')
text = lambda e: ''.join(t.get('textRun', {}).get('content', '') for t in e.get('shape', {}).get('text', {}).get('textElements', [])).strip()
for page in pages.values():
    elements = slides[page['id']].get('pageElements', [])
    title = next((text(e) for e in elements if e['objectId'].endswith('_base_2')), page['title'])
    body = [text(e) for e in elements if '_base_' not in e['objectId'] and text(e)]
    page.update(title=title, text='\n'.join(body))
manifest.write_text("// 과제 페이지의 '이 페이지 글로 읽기' 내용(Google Slides 원본의 글). 갱신 방법: portal/README.md\nexport const " + export_name + " = " + json.dumps(pages, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8', newline='\n')
print(f'과제 페이지 {len(pages)}장 글 갱신 완료')
