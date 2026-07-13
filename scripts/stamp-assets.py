#!/usr/bin/env python3
"""에셋 캐시버스트 스탬프 — web/*.html의 로컬 CSS <link>·JS <script>에 ?v=<내용해시>를 찍는다.

왜: 외부 CSS·JS는 캐시 대상이라 수정해도 옛 버전이 남을 수 있음. 파일 내용 해시를 버전으로 박으면
    파일이 바뀔 때만 URL이 바뀌어(자동 무효화), 안 바뀌면 그대로(불필요한 재다운 없음). 손 버전관리 불필요.
사용법: npm run stamp-assets  (CSS·JS 수정 후 실행 — 커밋 전 권장. pre-commit 훅이 자동 실행)
대상: web/에 실제 존재하는 .css·.js만. CDN(jsdelivr 등 http)·없는 파일은 스킵.
"""
import hashlib, pathlib, re, sys

repo = pathlib.Path(__file__).resolve().parents[1]
web = repo / "web"
PRINT_CHANGED = "--print-changed" in sys.argv   # 훅용: 바뀐 html 경로만 stdout(정확한 스테이징)

# 로컬 에셋 경로(web 기준) → 짧은 해시(8) 캐시
_cache = {}
def asset_hash(rel):
    if rel in _cache:
        return _cache[rel]
    p = web / rel
    h = hashlib.sha256(p.read_bytes()).hexdigest()[:8] if p.exists() else None
    _cache[rel] = h
    return h

# <link href="css/x.css"> · <script src="js/x.js"> (기존 ?v= 있으면 교체)
ASSET_RE = re.compile(r'(href|src)="([^"]+?\.(?:css|js))(\?v=[0-9a-f]+)?"')

changed_files, stamped = [], 0
for html in sorted(web.glob("*.html")):
    text = html.read_text(encoding="utf-8")
    def repl(m):
        global stamped
        attr, rel = m.group(1), m.group(2)
        if "://" in rel:                   # CDN 등 절대 URL은 스킵
            return m.group(0)
        h = asset_hash(rel)                # rel = web 기준 경로(css/x.css·js/x.js)
        if not h:                          # web/에 없는 파일은 스킵
            return m.group(0)
        stamped += 1
        return f'{attr}="{rel}?v={h}"'
    new = ASSET_RE.sub(repl, text)
    if new != text:
        html.write_text(new, encoding="utf-8")
        changed_files.append(html.name)

if PRINT_CHANGED:
    for name in changed_files:                # 훅이 정확히 이 파일만 git add
        print(f"web/{name}")
else:
    print(f"stamped {stamped}개 에셋 링크(css+js) · 갱신된 HTML {len(changed_files)}개"
          + (f": {', '.join(changed_files)}" if changed_files else " (변경 없음)"))
