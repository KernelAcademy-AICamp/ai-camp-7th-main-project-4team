#!/usr/bin/env python3
"""A축 garmentCm 시드 빌더 — raw/*.csv (브랜드 사이즈표) → web/data/garments.json.

원본: data/brand/raw/브랜드별 사이즈 수집 - {긴팔,반팔,바지}.csv (수동 수집, 자사몰 사이즈표).
CSV 열(상의): 브랜드,fit,성별,product,size,총장,어깨너비,가슴단면,소매길이,비고
CSV 열(하의): 브랜드,fit,성별,product,size,총장,허리단면,엉덩이단면,허벅지단면,밑위,밑단단면,비고
스키마: garmentCm 계약(web/js/engine.js) — 값은 '단면(flat) 원본 그대로' 저장(×2·여유는 규칙 모듈이).
사용법: python3 data/brand/build-sizespec.py
"""
import csv, json, pathlib, re, unicodedata

def nfc(s):
    return unicodedata.normalize("NFC", s or "")

here = pathlib.Path(__file__).resolve().parent          # data/brand
repo = here.parents[1]                                   # repo root
raw = here / "raw"
out = repo / "web" / "data" / "garments.json"

BRAND_ID = {
    "유니클로": "uniqlo", "무신사스탠다드": "musinsa-standard", "나이키": "nike",
    "스파오": "spao", "H&M": "hm", "에잇세컨즈": "8seconds", "탑텐": "topten",
    "노스페이스": "northface",
}
# 브랜드 원본 핏 표기 → 표준 5단계(fitLine). 상의는 '핏' 접미, 하의는 스타일명이 섞임.
#   와이드·세미와이드·루즈·릴랙스=loose, 리얼와이드=oversize, 스트레이트·테이퍼드·크링클·커브드=regular.
FITLINE = {
    # 상의(핏 접미)
    "슬림핏": "slim", "레귤러핏": "regular", "스탠다드핏": "regular",
    "릴렉스핏": "loose", "루즈핏": "loose", "오버핏": "oversize",
    # 하의·공통(접미 없음)
    "슬림": "slim",
    "레귤러": "regular", "스트레이트": "regular", "테이퍼드": "regular",
    "크링클": "regular", "커브드": "regular",
    "세미와이드": "loose", "와이드": "loose", "와이드핏": "loose", "루즈": "loose", "릴랙스": "loose",
    "리얼와이드": "oversize",
}
GENDER = {"남성": "male", "여성": "female", "공용": "unisex"}

# 파일명 키워드 → (category, subtype)
FILES = {
    "긴팔": ("TOP", "long_sleeve"),
    "반팔": ("TOP", "short_sleeve"),
    "바지": ("BOTTOM", "long_pants"),
}
# 카테고리별 CSV 열 → 부위 key (값은 flat 원본)
COLS = {
    "TOP":    {"총장": "length", "어깨너비": "shoulder", "가슴단면": "chest", "소매길이": "sleeve"},
    "BOTTOM": {"총장": "length", "허리단면": "waist", "엉덩이단면": "hip",
               "허벅지단면": "thigh", "밑위": "rise", "밑단단면": "hem"},
}
# 카테고리별 최소 필수 부위(없으면 skip — 역산 의미 없음)
KEYPART = {"TOP": "chest", "BOTTOM": "waist"}


def num(s):
    m = re.search(r"-?\d+(\.\d+)?", s or "")
    return float(m.group(0)) if m else None


def waistband_of(product):
    """product명에서 허리 밴딩 유형 추출(수집 임시). 허리 수용범위·역산 신뢰도에 영향.
    ⚠️ product명 의존 = 부분 커버(대부분 히든밴딩만 표기, 나머지는 불명). 정식은 수집단 `밴딩` 컬럼."""
    p = nfc(product or "")
    if "풀밴딩" in p or "전체밴딩" in p:
        return "full"
    if "사이드" in p and "밴" in p:
        return "side"
    if "히든" in p and "밴" in p:
        return "hidden"
    if "밴딩" in p or "밴드" in p:
        return "partial"   # 밴딩 있으나 유형 불명
    return None            # 미표기(고정인지 불명)


specs, skipped = [], 0
for f in sorted(raw.glob("*.csv")):
    cs = next(((cat, sub) for k, (cat, sub) in FILES.items() if k in nfc(f.name)), None)
    if not cs:
        continue
    category, subtype = cs
    cols, keypart = COLS[category], KEYPART[category]
    for row in csv.DictReader(open(f, encoding="utf-8-sig")):
        brand = nfc(row.get("브랜드")).strip()
        if brand in ("", "브랜드"):        # 빈/중복 헤더행
            skipped += 1
            continue
        bid = BRAND_ID.get(brand)
        fit = FITLINE.get(nfc(row.get("fit")).strip())
        g = GENDER.get(nfc(row.get("성별")).strip())
        size = (row.get("size") or "").strip()
        if not (bid and fit and g and size):
            skipped += 1
            continue
        garment = {}
        for col, key in cols.items():
            v = num(row.get(col))
            if v is not None:
                garment[key] = v
        if keypart not in garment:          # 최소 기준부위 없으면 제외
            skipped += 1
            continue
        spec = {
            "brandId": bid, "brandName": brand, "category": category,
            "fitLine": fit, "gender": g, "subtype": subtype,
            "sizeLabel": size, "garmentCm": garment,
            "product": (row.get("product") or "").strip(),
        }
        if category == "BOTTOM":
            spec["waistband"] = waistband_of(row.get("product"))  # 허리 밴딩(수용범위·역산에 영향)
        specs.append(spec)

cats = sorted(set(s["category"] for s in specs))
doc = {
    "$meta": {
        "purpose": "A축 garmentCm 시드 — 착용경험 역산(규칙①②③)·추천 사이즈 실계산의 재료.",
        "schemaRef": "web/js/engine.js — garmentCm 계약(부위별 단면 flat)",
        "source": "브랜드 자사몰 사이즈표 수동 수집",
        "collectedAt": "2026-07-07",
        "categories": cats,
        "note": "값은 사이즈표 '단면(flat) 원본' 그대로. 둘레=단면×2 환산·여유 계산은 규칙 모듈이 조회 시 수행. "
                "BOTTOM.waistband=밴딩 유형(hidden/side/full/partial/null) — 허리 수용범위·역산 신뢰도에 영향. "
                "현재 product명 추출이라 부분 커버(대부분 히든밴딩만) — 정식은 수집단 `밴딩` 컬럼 필요.",
        "parts": {
            "TOP": {"chest": "가슴단면(circ,flat→×2)", "shoulder": "어깨너비(width)",
                    "sleeve": "소매길이(len)", "length": "총장(len)"},
            "BOTTOM": {"waist": "허리단면(circ,flat→×2)", "hip": "엉덩이단면(circ,flat→×2)",
                       "thigh": "허벅지단면(circ,flat→×2)", "rise": "밑위(len)",
                       "length": "총장(len)", "hem": "밑단단면(width)"},
        },
        "fitLineMap": FITLINE, "brandIdMap": BRAND_ID,
        "provenance": {"method": "manual", "confidence": 0.9},
    },
    "specs": specs,
}
out.write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding="utf-8")
by = {c: sum(1 for s in specs if s["category"] == c) for c in cats}
print(f"wrote {out.relative_to(repo)} — {len(specs)} specs {by} (skipped {skipped})")
