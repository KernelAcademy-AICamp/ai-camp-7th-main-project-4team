#!/usr/bin/env python3
"""CSS 캐시버스트 스탬프 — web/*.html의 로컬 CSS <link>에 ?v=<내용해시>를 찍는다.

왜: 외부 CSS는 캐시 대상이라 수정해도 옛 버전이 남을 수 있음. 파일 내용 해시를 버전으로 박으면
    CSS가 바뀔 때만 URL이 바뀌어(자동 무효화), 안 바뀌면 그대로(불필요한 재다운 없음). 손 버전관리 불필요.
사용법: npm run stamp-css  (CSS 수정 후 실행 — 커밋 전 권장. 미변경 CSS는 건드리지 않음)
대상: web/에 실제 존재하는 .css만. CDN(jsdelivr 등 http)·없는 파일은 스킵.
"""
import hashlib, pathlib, re, sys

repo = pathlib.Path(__file__).resolve().parents[1]
web = repo / "web"
cssdir = web / "css"                             # CSS는 web/css/ 폴더
PRINT_CHANGED = "--print-changed" in sys.argv   # 훅용: 바뀐 html 경로만 stdout(정확한 스테이징)

# CSS 파일 내용 → 짧은 해시(8) 캐시
_cache = {}
def css_hash(name):
    if name in _cache:
        return _cache[name]
    p = cssdir / name
    h = hashlib.sha256(p.read_bytes()).hexdigest()[:8] if p.exists() else None
    _cache[name] = h
    return h

LINK_RE = re.compile(r'href="([^"]+?\.css)(\?v=[0-9a-f]+)?"')

changed_files, stamped = [], 0
for html in sorted(web.glob("*.html")):
    text = html.read_text(encoding="utf-8")
    def repl(m):
        global stamped
        href, _old = m.group(1), m.group(2)
        if "://" in href:                 # CDN 등 절대 URL은 스킵
            return m.group(0)
        name = href.split("/")[-1]
        h = css_hash(name)
        if not h:                          # web/에 없는 파일은 스킵
            return m.group(0)
        stamped += 1
        return f'href="{href}?v={h}"'
    new = LINK_RE.sub(repl, text)
    if new != text:
        html.write_text(new, encoding="utf-8")
        changed_files.append(html.name)

if PRINT_CHANGED:
    for name in changed_files:                # 훅이 정확히 이 파일만 git add
        print(f"web/{name}")
else:
    print(f"stamped {stamped}개 CSS 링크 · 갱신된 HTML {len(changed_files)}개"
          + (f": {', '.join(changed_files)}" if changed_files else " (변경 없음)"))
