#!/usr/bin/env python3
"""B축 인체 시드 빌더 — data/body/clean/*.csv → web/data/{body-base-model,body-distribution,archetypes}.json.

세 산출물:
  ① body-base-model.json  0벌 회귀 추정기. 부위 cm = a·키 + b·몸무게 + c·나이 + intercept (성별별 OLS).
  ② body-distribution.json 성별×부위 mean/sd/p5·p50·p95 (신뢰도·스펙트럼 위치용).
  ③ archetypes.json        표준체형 38 + 비만체형 32 = 70종 실측 라벨(역산 후 nearest-archetype).

입력: data/body/clean/통합_직접측정.csv (6,106명, cm/kg 정규화) · 표준체형.csv · 비만체형.csv
방법: ①② 는 COHORT 코호트, 부위별 완전관측, 결측코드(≥900) 제거. numpy OLS.
사용법: python3 data/body/build-bodyseed.py
출처표기 의무 — 사이즈코리아 제8차 인체치수조사(2020~2024) / 국가기술표준원.

주의: 현재 산출물은 1-2차 코호트만으로 만들어졌다(어깨가쪽사이길이가 3차 미측정이라).
      COHORT를 바꾸거나 통합본(6,106명) 전체로 재생성하면 표본↑ — 단 기존 web/data와 값이 달라진다.
"""
import csv, json, math, pathlib

here = pathlib.Path(__file__).resolve().parent          # data/body
repo = here.parent.parent                                # repo root
clean = here / "clean"
outdir = repo / "web" / "data"

COHORT = "1-2차"        # 현재 산출물의 코호트. 통합본으로 넓히려면 None(전체)로.
MISSING = 900.0         # 결측코드(999.9 등) 임계 — 이 값 이상은 결측 처리

SRC = "사이즈코리아 제8차 인체치수조사(2020~2024)"
ATTR = "국가기술표준원 사이즈코리아"
NOTE = "length mm→cm 변환, 999.9 등 결측코드 제거"

# 부위 정의: key, 통합CSV 열(source), 표시 label, bodyDimension. 순서 = 산출물 순서.
PARTS = [
    ("chestFull",  "젖가슴둘레",      "젖가슴둘레",       "chestCircumference"),
    ("chestUpper", "가슴둘레",        "가슴둘레",         "chestCircumferenceUpper"),
    ("waist",      "허리둘레",        "허리둘레",         "waistCircumference"),
    ("hip",        "엉덩이둘레",      "엉덩이둘레",       "hipCircumference"),
    ("shoulder",   "어깨가쪽사이길이", "어깨가쪽사이길이", "shoulderWidth"),
    ("arm",        "팔길이",          "팔길이",           "armLength"),
    ("upperArm",   "편위팔둘레",      "위팔둘레",         "upperArmCircumference"),
    # 세로 축(총장 판정용) — 등길이(뒷목~허리). 상의 총장 적절선의 몸쪽 기준.
    ("backLength", "등길이",          "등길이",           "backLength"),
    # 하의 세로 축 — 다리가쪽길이(허리옆~바닥, 총장=outseam 기준) + 몸밑위(허리높이−샅높이, 밑위 기준).
    ("legOuter",   "다리가쪽길이",    "다리가쪽길이",     "outerLegLength"),
    ("bodyRise",   "몸밑위",          "몸밑위(허리높이−샅높이)", "bodyRise"),
]
FEATURES = ["키", "몸무게", "나이"]


def load_integrated():
    """통합_직접측정.csv → 성별별 float 레코드 리스트(코호트 필터)."""
    rows = {"M": [], "F": []}
    with open(clean / "통합_직접측정.csv", encoding="utf-8-sig", newline="") as f:
        for r in csv.DictReader(f):
            if COHORT and r.get("cohort") != COHORT:
                continue
            g = r.get("성별")
            if g not in ("M", "F"):
                continue
            # 파생: 몸밑위 = 허리높이 − 샅높이(수직 샅~허리). 밑위(rise) 판정의 몸쪽 기준.
            try:
                wh, ch = float(r.get("허리높이", "")), float(r.get("샅높이", ""))
                r["몸밑위"] = ("" if (wh >= MISSING or ch >= MISSING) else str(round(wh - ch, 1)))
            except (ValueError, TypeError):
                r["몸밑위"] = ""
            rows[g].append(r)
    return rows


def num(r, col):
    """결측코드·빈칸 → None, 그 외 float."""
    v = r.get(col, "")
    if v is None or v == "":
        return None
    try:
        x = float(v)
    except ValueError:
        return None
    return None if x >= MISSING else x


def ols(rows, ycol):
    """부위별 완전관측(y + 키·몸무게·나이)에 OLS. → (a,b,c,intercept,r2,rmse,n) 또는 None."""
    Y, X = [], []
    for r in rows:
        y = num(r, ycol)
        feats = [num(r, c) for c in FEATURES]
        if y is None or any(v is None for v in feats):
            continue
        Y.append(y)
        X.append(feats + [1.0])
    n = len(Y)
    if n < 2:
        return None
    import numpy as np
    A = np.array(X); y = np.array(Y)
    beta, *_ = np.linalg.lstsq(A, y, rcond=None)
    pred = A @ beta
    res = y - pred
    ss_res = float((res ** 2).sum())
    ss_tot = float(((y - y.mean()) ** 2).sum())
    r2 = 1 - ss_res / ss_tot if ss_tot else 0.0
    rmse = math.sqrt(ss_res / n)
    return beta[0], beta[1], beta[2], beta[3], r2, rmse, n


def stats(rows, col):
    """부위별 완전관측(그 열만)에 mean/sd/p5·p50·p95. → dict 또는 None."""
    import numpy as np
    vals = [v for v in (num(r, col) for r in rows) if v is not None]
    if not vals:
        return None
    a = np.array(vals)
    return {
        "mean": round(float(a.mean()), 1),
        "sd": round(float(a.std(ddof=1)), 1),
        "p5": round(float(np.percentile(a, 5)), 1),
        "p50": round(float(np.percentile(a, 50)), 1),
        "p95": round(float(np.percentile(a, 95)), 1),
        "n": len(vals),
    }


def build_base_model(data):
    doc = {"_meta": {
        "source": SRC, "attribution": ATTR, "unit": "cm/kg", "note": NOTE,
        "model": "part_cm = a·키 + b·몸무게 + c·나이 + intercept",
        "features": ["height_cm", "weight_kg", "age_years"],
    }}
    for g, gk in (("M", "male"), ("F", "female")):
        doc[gk] = {}
        for key, col, label, dim in PARTS:
            res = ols(data[g], col)
            if res is None:
                continue
            a, b, c, ic, r2, rmse, n = res
            doc[gk][key] = {
                "label": label, "bodyDimension": dim,
                "a_height": round(a, 4), "b_weight": round(b, 4), "c_age": round(c, 4),
                "intercept": round(ic, 3), "r2": round(r2, 3), "rmse_cm": round(rmse, 2), "n": n,
            }
    return doc


def build_distribution(data):
    doc = {"_meta": {"source": SRC, "attribution": ATTR, "unit": "cm/kg", "note": NOTE}}
    dist_cols = [(k, c, l) for k, c, l, _ in PARTS] + [("height", "키", "키"), ("weight", "몸무게", "몸무게")]
    for g, gk in (("M", "male"), ("F", "female")):
        doc[gk] = {}
        for key, col, label in dist_cols:
            s = stats(data[g], col)
            if s is None:
                continue
            doc[gk][key] = {"label": label, **s}
    return doc


# ── archetypes ────────────────────────────────────────────────────────────
GENDER = {"남성": "male", "여성": "female"}

# 표준체형: (코드접두 열 → 출력 key). 몸무게는 kg 원본, 나머지는 mm→cm(/10).
STD_MAP = [
    ("(102)키", "키"), ("(132)몸무게", "몸무게"), ("(208)가슴둘레", "가슴둘레"),
    ("(209)젖가슴둘레", "젖가슴둘레"), ("(211)허리둘레", "허리둘레"), ("(213)엉덩이둘레", "엉덩이둘레"),
    ("(317)어깨너비", "어깨너비"), ("(228)어깨사이길이", "어깨사이길이"), ("(240)위팔둘레", "위팔둘레"),
    ("(236)팔길이", "팔길이"), ("(223)등길이", "등길이"), ("(206)목둘레", "목둘레"),
]
# 비만체형: (CSV 열 → 출력 key). 몸무게 kg 원본, 나머지 mm→cm.
OB_MAP = [
    ("몸무게 (kg)", "몸무게"), ("허리둘레 (mm)", "허리둘레"),
    ("넙다리 중간둘레(mm)", "넙다리중간둘레"), ("겨드랑둘레 (mm)", "겨드랑둘레"),
    ("어깨사이길이(mm)", "어깨사이길이"),
]


def to_cm(col, raw):
    """빈값·미측정(''·'-') → None(키 생략). 몸무게 kg 원본, 나머지 mm→cm(/10)."""
    if raw is None or str(raw).strip() in ("", "-"):
        return None
    try:
        v = float(raw)
    except ValueError:
        return None
    return v if "몸무게" in col else round(v / 10, 1)


def measure(row, mapping):
    """빈값은 키에서 생략(원본: 여성 목둘레 등 미측정 항목 제외)."""
    out = {}
    for col, key in mapping:
        v = to_cm(col, row.get(col))
        if v is not None:
            out[key] = v
    return out


def build_archetypes():
    doc = {"_meta": {
        "source": SRC, "attribution": ATTR, "unit": "cm/kg", "note": NOTE,
        "role": "체형 캐릭터 라벨(역산 후 nearest-archetype 분류용)",
    }, "standard": [], "obese": []}

    with open(clean / "표준체형.csv", encoding="utf-8-sig", newline="") as f:
        for r in csv.DictReader(f):
            # 방어 가드: 성별↔연령이 뒤바뀐 행 교정. (과거 50대 블록 결함은 소스 CSV에서
            # 고쳤으나, 원본 재import로 다시 섞여 들어올 때를 대비해 남겨둠 — 정상 행엔 무영향)
            sex, age = r["성별"], r["연령"]
            if sex not in GENDER and age in GENDER:
                sex, age = age, sex
            doc["standard"].append({
                "gender": GENDER[sex], "ageBand": age, "type": r["체형명"],
                "measurements_cm": measure(r, STD_MAP),
            })

    with open(clean / "비만체형.csv", encoding="utf-8-sig", newline="") as f:
        for r in csv.DictReader(f):
            doc["obese"].append({
                "gender": GENDER[r["c0"]], "type": r["c1"], "description": r["c2"], "ageBand": r["c3"],
                "measurements_cm": measure(r, OB_MAP),
            })
    return doc


def write(name, doc):
    p = outdir / name
    p.write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {p.relative_to(repo)}")


def main():
    data = load_integrated()
    write("body-base-model.json", build_base_model(data))
    write("body-distribution.json", build_distribution(data))
    write("archetypes.json", build_archetypes())
    print(f"cohort={COHORT} · 남 {len(data['M'])}행 · 여 {len(data['F'])}행")


if __name__ == "__main__":
    main()
