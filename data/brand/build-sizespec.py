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
    "노스페이스": "northface", "자라": "zara",
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


# 하의 실루엣(silhouette) — 상품명에서 파싱. fitLine(여유축)과 직교하는 '형태축'.
#   6종: skinny·slim·straight·tapered·wide·bootcut. 바지는 같은 허리여도 실루엣별 허벅지·밑단이 크게 달라
#   역산·매칭의 1차 키다(fitLine 여유축만으론 스트레이트·테이퍼드·와이드가 뭉개짐).
#   특수 표기: 세미/리얼와이드·벌룬·배기→wide, 커브드→slim, 크링클=소재라 실루엣 무시(다른 토큰/폴백).
SILHOUETTE = [   # (토큰, 실루엣) — 위에서부터 우선 매칭(더 구체적인 걸 먼저)
    ("부츠컷", "bootcut"), ("부츠 컷", "bootcut"), ("bootcut", "bootcut"),
    ("스키니", "skinny"), ("skinny", "skinny"),
    ("세미와이드", "wide"), ("세미 와이드", "wide"), ("리얼와이드", "wide"),
    ("와이드", "wide"), ("wide", "wide"), ("벌룬", "wide"), ("배기", "wide"),
    ("테이퍼", "tapered"), ("taper", "tapered"),
    ("스트레이트", "straight"), ("straight", "straight"),
    ("커브드", "slim"), ("슬림", "slim"), ("slim", "slim"),
]
_SIL_FROM_FIT = {"skinny": "skinny", "slim": "slim", "regular": "straight",
                 "loose": "wide", "oversize": "wide"}
# 정규화 컬럼(수기 정본) 유효값 — 있으면 원본 fit 재파싱보다 우선.
FITLINE_ENUM = {"skinny", "slim", "regular", "loose", "oversize"}
SIL_ENUM = {"skinny", "slim", "straight", "tapered", "wide", "bootcut"}
# 하의 fit(여유축) 매핑 실패 시 실루엣에서 근사 — 엔진은 하의 매칭에 fit을 쓰지 않으므로 표시/보조용.
_FIT_FROM_SIL = {"skinny": "slim", "slim": "slim", "straight": "regular",
                 "tapered": "regular", "wide": "loose", "bootcut": "regular"}


def silhouette_of(product, fitline):
    """상품명에서 하의 실루엣 6종 추출. 없으면 fitLine(여유)에서 근사 폴백."""
    p = nfc(product or "")
    for tok, sil in SILHOUETTE:
        if tok in p:
            return sil
    return _SIL_FROM_FIT.get(fitline, "straight")


# ── 사이즈 라벨 정규화 ────────────────────────────────────────────────
# 엔진은 sizeLabel 정확일치(engine.js)라 원본은 보존하되, 사용자에게 보여줄 재인 라벨과
#   물리체계 태그·정렬키를 파생한다. 하의는 한 셀에 인치·cm·코드가 공존할 수 있어
#   (uniqlo 28-42 & 73-105, 탑텐 M(28)/M(630)) flow가 sizeSystem으로 그룹핑해 제시한다.
_LETTER_ORDER = {"XXS": -2, "XS": -1, "S": 0, "M": 1, "L": 2,
                 "XL": 3, "XXL": 4, "3XL": 5, "4XL": 6, "5XL": 7}
_LETTER_ALIAS = {"2XL": "XXL", "XXXL": "3XL", "XXXXL": "4XL", "XXXXXL": "5XL"}
_W_LETTER = {"WS": 0, "WM": 1, "WL": 2}   # 여성 라인 레터(northface unisex)


def size_norm(label):
    """sizeLabel → (system, canonical, order). 원본 파괴 없이 표시·정렬용 파생만.
    system: letter(레터)·inch(허리 소수)·cm(허리 대수)·code(탑텐 라인코드→레터)·range(합사이즈)."""
    s = nfc(label or "").strip()
    if not s:
        return ("letter", s, 99.0)
    if s.upper() in _W_LETTER:                          # 노스페이스 여성 라인
        return ("letter", s.upper(), float(_W_LETTER[s.upper()]))
    if "-" in s and re.search(r"[A-Za-z]", s):          # 레인지(자라 상의 S-M·L-XL)
        os_ = [_LETTER_ORDER.get(_LETTER_ALIAS.get(p.strip().upper(), p.strip().upper()))
               for p in s.split("-")]
        os_ = [o for o in os_ if o is not None]
        return ("range", s, (sum(os_) / len(os_)) if os_ else 50.0)
    m = re.match(r"^([A-Za-z0-9]+)\((\d+)\)$", s)        # 탑텐 복합 X(nn)
    if m:
        inner = int(m.group(2))
        if inner < 100:                                 # 인치 라벨 라인 → 숫자 표시
            return ("inch", str(inner), float(inner))
        can = _LETTER_ALIAS.get(m.group(1).upper(), m.group(1).upper())  # 코드 라인 → 레터로 인지
        return ("code", can, float(_LETTER_ORDER.get(can, 50)))
    if re.fullmatch(r"\d+", s):                          # 순수 숫자(하의): ≥50=cm, <50=인치
        v = int(s)
        return ("cm", str(v), float(v)) if v >= 50 else ("inch", str(v), float(v))
    up = s.upper()                                       # 순수 레터
    can = _LETTER_ALIAS.get(up, up)
    if can in _LETTER_ORDER:
        return ("letter", can, float(_LETTER_ORDER[can]))
    return ("letter", s, 90.0)                           # 미지 라벨 보존


specs, skipped = [], 0
anchor_bids = set()      # isAnchor=true 브랜드(브랜드 단위 진실) — 착용경험 입력 대상 = 앵커.
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
        g = GENDER.get(nfc(row.get("성별")).strip())
        size = (row.get("size") or "").strip()
        # fitLine(여유축): 정규화여유 컬럼(수기 정본, 상의) 우선 → 없으면 원본 fit 매핑.
        norm_fit = nfc(row.get("정규화여유")).strip()
        fit = norm_fit if norm_fit in FITLINE_ENUM else FITLINE.get(nfc(row.get("fit")).strip())
        # 하의 실루엣(형태축·1차 매칭키): 정규화실루엣 컬럼(수기 정본) 우선 → 상품명 파싱 폴백.
        sil = None
        if category == "BOTTOM":
            nsil = nfc(row.get("정규화실루엣")).strip()
            sil = nsil if nsil in SIL_ENUM else silhouette_of(row.get("product"), fit)
            if not fit:                     # 하의 fit이 자유서술이라 매핑 실패 시 실루엣에서 근사(엔진 매칭 미사용)
                fit = _FIT_FROM_SIL.get(sil, "regular")
        if not (bid and fit and g and size):
            skipped += 1
            continue
        if nfc(row.get("isAnchor")).strip().lower() == "true":  # 앵커=브랜드 단위(컬럼 없는 반팔은 아래서 상속)
            anchor_bids.add(bid)
        garment = {}
        for col, key in cols.items():
            v = num(row.get(col))
            if v is not None:
                garment[key] = v
        if keypart not in garment:          # 최소 기준부위 없으면 제외
            skipped += 1
            continue
        sys_, can, order = size_norm(size)
        spec = {
            "brandId": bid, "brandName": brand, "category": category,
            "fitLine": fit, "gender": g, "subtype": subtype,
            "sizeLabel": size, "garmentCm": garment,
            "sizeSystem": sys_, "sizeCanonical": can, "sizeOrder": order,
            "product": (row.get("product") or "").strip(),
        }
        if category == "BOTTOM":
            spec["waistband"] = waistband_of(row.get("product"))  # 허리 밴딩(수용범위·역산에 영향)
            spec["silhouette"] = sil                               # 형태축(1차 매칭키)
        specs.append(spec)

cats = sorted(set(s["category"] for s in specs))
# 앵커 순서 = 커버리지(spec 수) 내림차순 → 수집 많은 브랜드가 앞(데이터 기반, 하드코딩 순서 없음).
_bcount = {}
for s in specs:
    _bcount[s["brandId"]] = _bcount.get(s["brandId"], 0) + 1
anchor_brands = sorted(anchor_bids, key=lambda b: (-_bcount.get(b, 0), b))
doc = {
    "$meta": {
        "purpose": "A축 garmentCm 시드 — 착용경험 역산(규칙①②③)·추천 사이즈 실계산의 재료.",
        "anchorBrands": anchor_brands,   # 착용경험 입력 대상(오프라인 시착 편의+garment실측 역산). UI 브랜드 드롭다운의 소스.
        "schemaRef": "web/js/engine.js — garmentCm 계약(부위별 단면 flat)",
        "source": "브랜드 자사몰 사이즈표 수동 수집",
        "collectedAt": "2026-07-07",
        "categories": cats,
        "note": "값은 사이즈표 '단면(flat) 원본' 그대로. 둘레=단면×2 환산·여유 계산은 규칙 모듈이 조회 시 수행. "
                "BOTTOM.waistband=밴딩 유형(hidden/side/full/partial/null) — 허리 수용범위·역산 신뢰도에 영향. "
                "BOTTOM.silhouette=형태축(skinny/slim/straight/tapered/wide/bootcut) — 수집단 `정규화실루엣` 컬럼 우선"
                "(없으면 상품명 파싱 폴백), 역산·매칭의 1차 키(fitLine 여유축과 직교). "
                "fitLine=상의 `정규화여유` 컬럼 우선. waistband는 아직 product명 추출이라 부분 커버. "
                "sizeSystem/sizeCanonical/sizeOrder=sizeLabel 원본에서 파생한 표시·정렬용(원본 불변, "
                "엔진은 sizeLabel만 매칭). sizeSystem=letter/inch/cm/code/range — 한 셀에 여러 체계가 "
                "공존하면(uniqlo 인치+cm, 탑텐 M(28)/M(630)) flow가 체계별로 그룹핑해 재인 가능하게 제시.",
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
print(f"  anchorBrands({len(anchor_brands)}): {anchor_brands}")
