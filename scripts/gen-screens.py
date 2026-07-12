#!/usr/bin/env python3
"""화면 현황판 생성기 — web/*.html + git + 얇은 상태소스 → docs/화면-현황.md.

목적: 화면을 추가/수정할 때 전체 진행상황을 한눈에. '사실 층'(누가·언제 건드렸나·JS 연결·
      고아/막다른길)은 코드+git에서 전자동으로 뽑고, '의도 층'(상태·비고)만 얇은 손소스에서 병합.
      → 커밋·연결·IA는 항상 진실, 상태만 PR 때 한 줄 갱신하면 됨(안 낡음).

사용법: npm run screens  (= python3 scripts/gen-screens.py)
소스:   docs/화면-현황.source.json (상태·비고·kind만 손관리. 없으면 빈 값으로 진행)
산출:   docs/화면-현황.md (생성물 — 손대지 말 것)
"""
import json, pathlib, re, subprocess, unicodedata

def nfc(s): return unicodedata.normalize("NFC", s or "")

repo = pathlib.Path(__file__).resolve().parents[1]
web = repo / "web"
src_path = repo / "docs" / "화면-현황.source.json"
out = repo / "docs" / "화면-현황.md"

# 경로 소유 규칙(CLAUDE.md): 마크업(*.html)=디자이너 · 로직(js/**)=개발.
OWNER_MARKUP, OWNER_JS = "🎨디자이너", "💻개발"

# kind: 화면 성격 — IA 플래그(고아/막다른길) 억제·드리프트 판정에 사용.
#   app=진단/허브 흐름 · pro=공급자 · info=정보/정책(js 없어도 정상) · util=유틸(플래그 제외)
def load_source():
    if not src_path.exists():
        return {}
    return json.loads(src_path.read_text(encoding="utf-8"))

def git_last(paths):
    """주어진 파일들의 최근 커밋 (해시|저자|날짜). 없으면 ('','','')."""
    existing = [str(p.relative_to(repo)) for p in paths if p.exists()]
    if not existing:
        return ("", "", "")
    try:
        r = subprocess.run(["git", "-C", str(repo), "log", "-1",
                            "--format=%h|%an|%ad", "--date=short", "--", *existing],
                           capture_output=True, text=True, check=True)
        line = r.stdout.strip()
        if not line:
            return ("", "", "")
        h, a, d = (line.split("|") + ["", "", ""])[:3]
        return (h, a, d)
    except Exception:
        return ("", "", "")

def title_of(html_text):
    m = re.search(r"<title>([^<]*)</title>", html_text)
    return nfc(m.group(1).strip()) if m else ""

def out_links(html_text):
    """이 화면이 이동하는 .html 대상(쿼리·해시 제거, self 제외)."""
    targets = set()
    for m in re.finditer(r"([a-z0-9_-]+)\.html", html_text):
        targets.add(m.group(1))
    return targets

def scan_data(text):
    """화면이 읽고/쓰는 상태 키(sessionStorage/localStorage) + fetch 데이터소스.
    화면 확정 시 이 계약이 DB 스키마의 입력이 됨(현재는 sessionStorage 임시저장)."""
    # 끝이 '.'이면 동적 키 결합(getItem('fitting.'+x)) → `prefix*`로 정직 표기.
    def norm(k): return (k + "*") if k.endswith((".", "-", "_")) else k
    reads = {norm(k) for k in re.findall(r"(?:session|local)Storage\.getItem\(\s*['\"]([^'\"]+)", text)}
    writes = {norm(k) for k in re.findall(r"(?:session|local)Storage\.setItem\(\s*['\"]([^'\"]+)", text)}
    fetches = set(re.findall(r"fetch\(\s*['\"]([^'\"?]+)", text))
    return sorted(reads), sorted(writes), sorted(fetches)

# 대응 JS까지 포함해 git·연결 판정
def js_stem(stem):
    return web / "js" / f"{stem}.js"

source = load_source()
htmls = sorted(list(web.glob("*.html")) + list((web / "expert").glob("*.html")),
               key=lambda p: p.name)   # 사용자 앱(web/) + 전문가 앱(web/expert/)

# 1차 스캔: 화면별 사실 수집 + 링크 그래프
screens = []
outgoing = {}
for f in htmls:
    stem = f.stem
    text = f.read_text(encoding="utf-8", errors="ignore")
    meta = source.get(stem, {})
    jsf = js_stem(stem)
    js_exists = jsf.exists()
    js_ref = bool(re.search(r'src="[^"]*js/' + re.escape(stem) + r'\.js', text))
    js_wired = js_exists and js_ref
    relpath = str(f.relative_to(web))   # web 기준 경로(pro.html 또는 expert/pro.html)
    h, a, d = git_last([f, jsf])
    # 이동 대상은 HTML 정적 링크 + JS 이동(location.href 등) 둘 다 스캔 — JS 이동을 놓치면 오탐 고아 발생.
    js_text = jsf.read_text(encoding="utf-8", errors="ignore") if js_exists else ""
    links = out_links(text + "\n" + js_text) - {stem}
    reads, writes, fetches = scan_data(text + "\n" + js_text)
    outgoing[stem] = links
    screens.append({
        "stem": stem, "relpath": relpath,
        "title": title_of(text),
        "name": meta.get("name") or title_of(text) or stem,
        "kind": meta.get("kind", "app"),
        "status": meta.get("status", ""),
        "note": meta.get("note", ""),
        "js_exists": js_exists, "js_ref": js_ref, "js_wired": js_wired,
        "commit": h, "author": a, "date": d,
        "links": links,
        "reads": reads, "writes": writes, "fetches": fetches,
    })

# 2차: 들어오는 링크(고아 판정)
incoming = {s["stem"]: 0 for s in screens}
known = set(incoming)
for stem, links in outgoing.items():
    for t in links:
        if t in incoming:
            incoming[t] += 1

# 플래그 계산
ENTRY = "index"   # 랜딩/허브 = 외부 진입점이라 고아 아님
for s in screens:
    stem, kind = s["stem"], s["kind"]
    flags = []
    if kind != "util":
        if incoming[stem] == 0 and stem != ENTRY:
            flags.append("🕳️고아(들어오는 링크 없음)")
        if not s["links"]:
            flags.append("🚧막다른길(나가는 링크 없음)")
    # 드리프트: 완료/실연결이라면서 JS 미연결(정보/정책 kind는 js 불필요라 제외)
    if kind in ("app", "pro") and s["status"] in ("완료", "실연결", "구현") and not s["js_wired"]:
        if s["js_exists"] and not s["js_ref"]:
            flags.append("⚠️JS 파일 있으나 미참조")
        elif not s["js_exists"]:
            flags.append("⚠️상태=" + s["status"] + "인데 JS 없음")
    s["flags"] = flags

# 렌더
def owner_of(s):
    return f"{OWNER_MARKUP}+{OWNER_JS}" if s["js_exists"] else OWNER_MARKUP

def js_cell(s):
    if s["js_wired"]: return "✅ " + s["stem"] + ".js"
    if s["js_exists"] and not s["js_ref"]: return "⚠️ 미참조"
    if not s["js_exists"]: return "— (없음)"
    return "?"

STATUS_ICON = {"완료": "🟢완료", "실연결": "🟢실연결", "구현": "🟡구현",
               "시안": "🟠시안", "보류": "⚪보류", "": "⬜미기재"}

lines = []
lines.append("# 핏팅 — 화면 현황판")
lines.append("")
lines.append("> ⚙️ **생성물 — 손대지 마세요.** `npm run screens`로 재생성됩니다(scripts/gen-screens.py).")
lines.append("> 사실 층(소유·최근커밋·JS연결·IA플래그)은 코드+git에서 자동, **상태·비고만** `docs/화면-현황.source.json`에서 손관리.")
lines.append("> 화면 목록·URL의 기획 정본(SSOT)은 [2_정보구조.md](2_정보구조.md), 화면별 요소는 [4_화면정의.md](4_화면정의.md).")
lines.append("")

# 요약
by_status = {}
for s in screens:
    by_status[s["status"] or "미기재"] = by_status.get(s["status"] or "미기재", 0) + 1
flagged = [s for s in screens if s["flags"]]
lines.append(f"**화면 {len(screens)}개** · 상태 " +
             " · ".join(f"{k} {v}" for k, v in sorted(by_status.items())) +
             f" · ⚑ 이슈 {len(flagged)}개")
lines.append("")

# 본표
lines.append("| 화면 | 파일 | 소유 | 상태 | JS 연결 | 최근 변경 | 이슈 |")
lines.append("|---|---|---|---|---|---|---|")
for s in screens:
    chg = f"`{s['commit']}` {s['author']} · {s['date']}" if s["commit"] else "—"
    issues = "<br>".join(s["flags"]) if s["flags"] else "—"
    lines.append(f"| {s['name']} | [{s['relpath']}](../web/{s['relpath']}) | {owner_of(s)} "
                 f"| {STATUS_ICON.get(s['status'], s['status'])} | {js_cell(s)} | {chg} | {issues} |")
lines.append("")

# 비고(손소스)
notes = [s for s in screens if s["note"]]
if notes:
    lines.append("## 비고")
    for s in notes:
        lines.append(f"- **{s['name']}** — {s['note']}")
    lines.append("")

# 이슈 모음
if flagged:
    lines.append("## ⚑ 확인 필요")
    for s in flagged:
        lines.append(f"- **{s['name']}** ({s['stem']}.html): " + " · ".join(s["flags"]))
    lines.append("")

# 데이터 계약 — 화면이 곧 데이터. 화면 확정 시 이 표가 DB 스키마의 입력이 된다(브리지).
data_rows = [s for s in screens if s["reads"] or s["writes"] or s["fetches"]]
if data_rows:
    lines.append("## 🔌 화면 × 데이터 계약 (DB 설계 입력)")
    lines.append("> 각 화면이 읽고/쓰는 상태 키·데이터 소스(JS 자동 스캔). **화면이 확정되면 이 계약이 DB 스키마의 입력**이 됩니다 — 현재는 `sessionStorage` 임시저장(→ 영속화 대상).")
    lines.append("")
    lines.append("| 화면 | 읽음 in | 씀 out | fetch 소스 |")
    lines.append("|---|---|---|---|")
    for s in data_rows:
        r = ", ".join(f"`{k}`" for k in s["reads"]) or "—"
        w = ", ".join(f"`{k}`" for k in s["writes"]) or "—"
        fe = ", ".join(f"`{k}`" for k in s["fetches"]) or "—"
        lines.append(f"| {s['name']} | {r} | {w} | {fe} |")
    lines.append("")
    # 상태 키별 생산자·소비자 — proto 스키마(엔티티 후보) 역인덱스.
    keys = {}
    for s in screens:
        for k in s["writes"]:
            keys.setdefault(k, {"w": [], "r": []})["w"].append(s["stem"])
        for k in s["reads"]:
            keys.setdefault(k, {"w": [], "r": []})["r"].append(s["stem"])
    lines.append("### 상태 키별 생산자·소비자 (proto 스키마)")
    lines.append("> 키 하나 = DB 엔티티/레코드 후보. 생산(씀)·소비(읽음) 화면이 스키마 경계·소유를 가늠하게 함.")
    lines.append("")
    lines.append("| 상태 키 | 씀(생산) | 읽음(소비) |")
    lines.append("|---|---|---|")
    for k in sorted(keys):
        w = ", ".join(sorted(set(keys[k]["w"]))) or "—"
        r = ", ".join(sorted(set(keys[k]["r"]))) or "—"
        lines.append(f"| `{k}` | {w} | {r} |")
    lines.append("")

# 이동 그래프(참고)
lines.append("## 화면 이동(나가는 링크)")
for s in screens:
    if s["kind"] == "util":
        continue
    tgt = ", ".join(sorted(t for t in s["links"] if t in known)) or "(없음)"
    lines.append(f"- **{s['stem']}** → {tgt}")
lines.append("")

out.write_text("\n".join(lines), encoding="utf-8")

# README 마커 구간 자동 주입 — 앞면에서 바로 확인. 전체(소유·비고·그래프)는 docs/화면-현황.md.
def readme_block():
    b = []
    b.append("<!-- 자동 생성 — 손대지 마세요. `npm run screens`로 갱신됩니다. -->")
    b.append(f"**화면 {len(screens)}개** · " +
             " · ".join(f"{STATUS_ICON.get(k, k)} {v}" for k, v in sorted(by_status.items())) +
             f" · ⚑ 이슈 {len(flagged)}개 · 전체·비고·이동그래프 → [docs/화면-현황.md](docs/화면-현황.md)")
    b.append("")
    b.append("| 화면 | 상태 | JS | 최근 변경 | 이슈 |")
    b.append("|---|---|---|---|---|")
    for s in screens:
        js = "✅" if s["js_wired"] else ("⚠️" if s["js_exists"] else "—")
        chg = f"`{s['commit']}` {s['author']}·{s['date']}" if s["commit"] else "—"
        iss = "<br>".join(s["flags"]) if s["flags"] else "—"
        b.append(f"| {s['name']} | {STATUS_ICON.get(s['status'], s['status'])} | {js} | {chg} | {iss} |")
    return "\n".join(b)

readme = repo / "README.md"
START, END = "<!-- SCREENS:START -->", "<!-- SCREENS:END -->"
injected = False
if readme.exists():
    txt = readme.read_text(encoding="utf-8")
    if START in txt and END in txt:
        txt = re.sub(re.escape(START) + r".*?" + re.escape(END),
                     START + "\n" + readme_block() + "\n" + END, txt, flags=re.S)
        readme.write_text(txt, encoding="utf-8")
        injected = True

print(f"wrote {out.relative_to(repo)} — 화면 {len(screens)}개, 이슈 {len(flagged)}개"
      + (" · README 갱신" if injected else " · README 마커 없음(주입 생략)"))
if not src_path.exists():
    print(f"  ⚠️ 상태소스 없음: {src_path.relative_to(repo)} 를 만들면 상태·비고가 채워집니다.")
