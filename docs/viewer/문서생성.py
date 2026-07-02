#!/usr/bin/env python3
"""viewer.html 재생성기 — 상위 docs/의 md 5종을 뷰어 템플릿(_tpl.html)에 주입한다.

원칙: 내용은 ../*.md가 원본, _tpl.html은 렌더 껍데기(스타일·렌더러). 둘 다 git에 보관.
사용법: python3 docs/viewer/문서생성.py   (어디서 실행하든 됨)
"""
import html, pathlib

here = pathlib.Path(__file__).resolve().parent   # docs/viewer
docsdir = here.parent                            # docs
DOCS = [
    ("README", "README.md",        "개요"),
    ("doc1",   "1_제품정의.md",    "1 · 제품정의"),
    ("doc2",   "2_화면과흐름.md",  "2 · 화면과흐름"),
    ("doc3",   "3_사이즈엔진.md",  "3 · 사이즈엔진"),
    ("doc4",   "4_디자인가이드.md","4 · 디자인가이드"),
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
(here / "viewer.html").write_text(out, encoding="utf-8")
print(f"wrote viewer.html ({len(out)} bytes) from _tpl.html + {len(DOCS)} md docs")
