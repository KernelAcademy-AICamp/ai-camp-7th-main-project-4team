#!/usr/bin/env python3
"""B축 잔차공분산 빌더 — data/body/clean/통합_직접측정.csv → web/data/body-correlation.json.

용도: 착용경험으로 '관측된' 부위(앵커)로 '미관측' 둘레부위를 조건부 추정하기 위한 재료.
방법: 각 둘레부위를 body-base-model.json의 회귀(키·몸무게·나이)로 예측한 잔차를 구하고,
      성별별 잔차공분산 Σ를 낸다. 엔진은 Σ_UO Σ_OO^-1 로 관측앵커 잔차→미관측부위 잔차를 예측.
      ※ 회귀계수는 body-base-model.json 것을 그대로 써 엔진의 μ(회귀예측)와 잔차 정의를 일치시킨다.

검증(scratch LOO, 5-fold): 배↔허리 남31%·여15%, 여성 상↔하교차 10~15% RMSE↓. 그 외 둘레는 1~7%
      (키·몸무게가 공통변량 대부분을 이미 잡음) → 조건부는 임계 이하라도 원리적·무해(회귀로 수렴).

세로축(어깨·팔·등길이·다리길이·밑위)은 둘레와 잔차상관 약함(0.2~0.5) → 제외. 둘레부위만.
출처표기 의무 — 사이즈코리아 제8차 인체치수조사(2020~2024) / 국가기술표준원.
사용법: python3 data/body/build-correlation.py
"""
import csv, json, math, pathlib
import numpy as np

here = pathlib.Path(__file__).resolve().parent          # data/body
repo = here.parent.parent
clean = here / "clean"
outdir = repo / "web" / "data"

COHORT = "1-2차"        # body-base-model.json과 동일 코호트(잔차 정의 일치)
MISSING = 900.0

# 조건부 추정 대상 = 둘레부위. key -> 통합CSV 열. (세로/프레임축 제외)
GIRTH = {
    "chestFull": "젖가슴둘레", "chestUpper": "가슴둘레", "waist": "허리둘레",
    "hip": "엉덩이둘레", "upperArm": "편위팔둘레", "thigh": "넙다리둘레",
    "belly": "배둘레", "underbust": "젖가슴아래둘레(여)", "neck": "목둘레",
    "armhole": "겨드랑둘레", "calf": "장딴지둘레",
}

base = json.load(open(outdir / "body-base-model.json", encoding="utf-8"))

def num(x):
    try:
        v = float(x); return None if v >= MISSING else v
    except (ValueError, TypeError):
        return None

def build(sex):
    coefs = base[sex]
    parts = [k for k in GIRTH if k in coefs]           # 성별에 있는 둘레부위(남=underbust 제외)
    rows = []
    with open(clean / "통합_직접측정.csv", encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            if COHORT and r.get("cohort") != COHORT:
                continue
            if (r.get("성별") == "M") != (sex == "male"):
                continue
            h, w, a = num(r.get("키")), num(r.get("몸무게")), num(r.get("나이"))
            if None in (h, w, a):
                continue
            vals = {p: num(r.get(GIRTH[p])) for p in parts}
            if any(v is None for v in vals.values()):   # 잔차공분산 = 공동 완전관측만
                continue
            resid = []
            for p in parts:
                c = coefs[p]
                pred = c["a_height"]*h + c["b_weight"]*w + c["c_age"]*a + c["intercept"]
                resid.append(vals[p] - pred)
            rows.append(resid)
    R = np.array(rows)
    cov = np.cov(R, rowvar=False)                        # 잔차공분산 (엔진이 Σ로 사용)
    return parts, cov, len(rows)

out = {
    "_meta": {
        "source": "사이즈코리아 제8차 인체치수조사(2020~2024)",
        "attribution": "국가기술표준원 사이즈코리아",
        "cohort": COHORT,
        "method": "residual covariance after body-base-model OLS(height,weight,age); girth parts only",
        "role": "관측앵커→미관측둘레 조건부추정(Σ_UO Σ_OO^-1). 엔진 FitEngine.seedCorrelation()가 소비.",
        "note": "회귀계수는 body-base-model.json과 동일 — 잔차정의 일치. 세로/프레임축 제외.",
    },
    "parts": {}, "cov": {},
}
for sex in ("male", "female"):
    parts, cov, n = build(sex)
    out["parts"][sex] = parts
    out["cov"][sex] = [[round(x, 4) for x in row] for row in cov.tolist()]
    out["_meta"].setdefault("n", {})[sex] = n

json.dump(out, open(outdir / "body-correlation.json", "w", encoding="utf-8"),
          ensure_ascii=False, indent=2)
print("wrote web/data/body-correlation.json")
for sex in ("male", "female"):
    print(f"  {sex}: {len(out['parts'][sex])} parts, n={out['_meta']['n'][sex]}")
