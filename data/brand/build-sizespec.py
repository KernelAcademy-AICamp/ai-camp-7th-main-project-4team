#!/usr/bin/env python3
"""A축 garmentCm 시드 빌더 — raw/*.csv (브랜드 사이즈표) → web/data/garments.json.

원본: data/brand/raw/브랜드별 사이즈 수집 - {긴팔,반팔}.csv (수동 수집, 자사몰 사이즈표).
CSV 열: 브랜드,fit,성별,product,size,총장,어깨너비,가슴단면,소매길이,비고
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
# 핏 표기 → 표준 5단계(fitLine). 릴렉스·루즈=loose, 스탠다드=regular.
FITLINE = {
    "슬림핏": "slim", "레귤러핏": "regular", "스탠다드핏": "regular",
    "릴렉스핏": "loose", "루즈핏": "loose", "오버핏": "oversize",
}
GENDER = {"남성": "male", "여성": "female", "공용": "unisex"}
# CSV 열 → 부위 key (category TOP). 값은 flat 원본.
COLS = {"총장": "length", "어깨너비": "shoulder", "가슴단면": "chest", "소매길이": "sleeve"}

FILES = {"긴팔": "long_sleeve", "반팔": "short_sleeve"}


def num(s):
    m = re.search(r"-?\d+(\.\d+)?", s or "")
    return float(m.group(0)) if m else None


specs, skipped = [], 0
for f in sorted(raw.glob("*.csv")):
    subtype = next((v for k, v in FILES.items() if k in nfc(f.name)), None)
    if not subtype:
        continue
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
        for col, key in COLS.items():
            v = num(row.get(col))
            if v is not None:
                garment[key] = v
        if "chest" not in garment:          # 최소 가슴은 있어야 역산 의미
            skipped += 1
            continue
        specs.append({
            "brandId": bid, "brandName": brand, "category": "TOP",
            "fitLine": fit, "gender": g, "subtype": subtype,
            "sizeLabel": size, "garmentCm": garment,
            "product": (row.get("product") or "").strip(),
        })

doc = {
    "$meta": {
        "purpose": "A축 garmentCm 시드 — 착용경험 역산(규칙①②③)·추천 사이즈 실계산의 재료.",
        "schemaRef": "web/js/engine.js — garmentCm 계약(chest·shoulder·sleeve·length, flat)",
        "source": "브랜드 자사몰 사이즈표 수동 수집",
        "collectedAt": "2026-07-03",
        "category": "TOP",
        "note": "값은 사이즈표 '단면(flat) 원본' 그대로. 둘레=단면×2 환산·여유 계산은 규칙 모듈이 조회 시 수행.",
        "parts": {"chest": "가슴단면(circumference,flat→×2)", "shoulder": "어깨너비(width)",
                  "sleeve": "소매길이(length)", "length": "총장(length)"},
        "fitLineMap": FITLINE, "brandIdMap": BRAND_ID,
        "provenance": {"method": "manual", "confidence": 0.9},
    },
    "specs": specs,
}
out.write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"wrote {out.relative_to(repo)} — {len(specs)} specs (skipped {skipped})")
