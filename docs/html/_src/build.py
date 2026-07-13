#!/usr/bin/env python3
"""통합문서.html 재생성기 — docs/의 md 문서를 뷰어 템플릿(_tpl.html)에 주입한다.

원칙: 내용은 docs/*.md가 원본, _tpl.html은 렌더 껍데기(스타일·렌더러). 둘 다 git에 보관.
도구(_tpl.html·build.py)는 docs/html/_src/, 산출물(통합문서.html)은 docs/html/.
사용법:
  python3 docs/html/_src/build.py          # docs/html/통합문서.html 생성
  python3 docs/html/_src/build.py --web     # + web/docs.html 로도 복사(Vercel 배포에 일시 포함, git 미추적)
"""
import html, pathlib, sys

here = pathlib.Path(__file__).resolve().parent   # docs/html/_src
outdir = here.parent                             # docs/html (산출물 위치)
docsdir = outdir.parent                          # docs
repo = docsdir.parent                            # repo root
DOCS = [
    ("README",    "README.md",          "개요"),
    ("doc0",      "0_용어집.md",         "0 · 용어집"),
    ("doc1",      "1_제품정의.md",       "1 · 제품정의"),
    ("doc2",      "2_정보구조.md",       "2 · 정보구조"),
    ("doc3",      "3_사용자플로우.md",   "3 · 사용자플로우"),
    ("doc4",      "4_화면정의.md",       "4 · 화면정의"),
    ("docsys",    "시스템-화면정의서.md", "· 시스템 화면정의서"),
    ("doc5",      "5_정책·데이터.md",    "5 · 정책·데이터"),
    ("doc6",      "6_사이즈엔진.md",     "6 · 사이즈엔진"),
    ("doc7",      "7_전문가매칭.md",     "7 · 전문가매칭"),
    ("doc8",      "8_디자인가이드.md",   "8 · 디자인가이드"),
    ("decisions", "의사결정기록.md",     "의사결정기록"),
]

blocks = []
for did, fn, label in DOCS:
    txt = (docsdir / fn).read_text(encoding="utf-8").replace("</script>", "<\\/script>")
    blocks.append(
        f'<script type="text/markdown" data-doc="{did}" '
        f'data-file="{html.escape(fn)}" data-label="{html.escape(label)}">\n{txt}\n</script>'
    )

tpl = (here / "_tpl.html").read_text(encoding="utf-8")
out = tpl.replace("__DOCS__", "\n".join(blocks))
(outdir / "통합문서.html").write_text(out, encoding="utf-8")
print(f"wrote 통합문서.html ({len(out)} bytes) from _tpl.html + {len(DOCS)} md docs")

if "--web" in sys.argv:
    web_copy = repo / "web" / "docs.html"
    web_copy.write_text(out, encoding="utf-8")
    print(f"copied → {web_copy.relative_to(repo)} (Vercel 배포 시 /docs.html 로 노출 · git 미추적)")
