/**
 * 카테고리(옷 종류)와 부위(part) 모델.
 *
 * 설계 원칙(CLAUDE.md #6, build.md Phase0·§4-0):
 *  - 진단은 카테고리 단위. 역산은 신체 부위를 넘지 못한다(상의→어깨·가슴, 하의→허리·엉덩이).
 *  - `category`를 1급 축으로 두되 단방향 잠금 금지: 5종을 모두 표현하고, 데이터·작동은 상의(TOP)부터.
 *  - 부위 집합은 카테고리에 종속(상의의 어깨 ≠ 하의의 밑위).
 *  - 부위마다 "둘레/너비/길이"가 달라 의류↔인체 변환·여유 계산 규칙이 갈린다(§7-0).
 *    이 메타를 부위 정의에 박아 두어야 normalize/규칙이 부위별로 올바르게 동작한다.
 */

export type Category = "TOP" | "BOTTOM" | "OUTER" | "DRESS" | "SKIRT";

/**
 * 부위의 측정 성격. 의류 실측치를 인체 치수와 비교하는 방식이 갈린다.
 *  - circumference(둘레): 의류는 보통 '단면(flat)'으로 적힌다 → 둘레 = 단면 ×2 환산 후 인체 둘레와 비교. 여유(ease) 개념 성립.
 *  - width(너비): 어깨처럼 평면 너비. 의류 단면 ≈ 인체 너비, ×2 안 함. 직접 비교(여유는 너비차).
 *  - length(길이): 소매·총장·기장. 둘레 아님 → 여유 아님. 인체 길이 대비 차이(기장감)로만 해석.
 */
export type Comparison = "circumference" | "width" | "length";

/**
 * 인체 치수 축. 여유(ease) 계산 시 의류 부위를 어떤 인체 둘레/너비/길이와 맞댈지.
 * 사이즈코리아 표준체형 데이터의 항목명과 매핑된다(추후 store 단계에서 연결).
 */
export type BodyDimension =
  | "shoulderWidth" // 어깨너비
  | "chestCircumference" // 가슴둘레
  | "waistCircumference" // 허리둘레
  | "hipCircumference" // 엉덩이둘레
  | "thighCircumference" // 허벅지둘레
  | "armLength" // 팔길이
  | "height" // 키(총장·기장 참조용)
  | "riseReference"; // 밑위 참조(하의)

export interface PartDef {
  /** 부위 코드. (category, part) 가 규칙 테이블·실측 스키마의 키가 된다. */
  key: string;
  /** 표시용 한글명 */
  label: string;
  comparison: Comparison;
  /** 여유 계산 시 맞댈 인체 치수. length 부위는 참조용(엄밀 여유 아님). */
  body: BodyDimension;
}

/**
 * 카테고리별 부위 집합.
 * 상의만 데이터·작동 대상. 나머지는 부위 설계만(작동은 후속) — build.md Phase1-1(부위 설계).
 * 출처: build.md §1-1(상의=어깨·가슴·소매·배·총장 / 하의=허리·엉덩이·허벅지·밑위·기장).
 */
export const CATEGORY_PARTS: Record<Category, PartDef[]> = {
  TOP: [
    { key: "shoulder", label: "어깨", comparison: "width", body: "shoulderWidth" },
    { key: "chest", label: "가슴", comparison: "circumference", body: "chestCircumference" },
    { key: "belly", label: "배", comparison: "circumference", body: "waistCircumference" },
    { key: "sleeve", label: "소매", comparison: "length", body: "armLength" },
    { key: "length", label: "총장", comparison: "length", body: "height" },
  ],
  BOTTOM: [
    { key: "waist", label: "허리", comparison: "circumference", body: "waistCircumference" },
    { key: "hip", label: "엉덩이", comparison: "circumference", body: "hipCircumference" },
    { key: "thigh", label: "허벅지", comparison: "circumference", body: "thighCircumference" },
    { key: "rise", label: "밑위", comparison: "length", body: "riseReference" },
    { key: "length", label: "기장", comparison: "length", body: "height" },
  ],
  // 아래 3종은 부위 설계만 — 데이터·작동은 후속(스키마 잠금 금지 목적의 자리).
  OUTER: [
    { key: "shoulder", label: "어깨", comparison: "width", body: "shoulderWidth" },
    { key: "chest", label: "가슴", comparison: "circumference", body: "chestCircumference" },
    { key: "sleeve", label: "소매", comparison: "length", body: "armLength" },
    { key: "length", label: "총장", comparison: "length", body: "height" },
  ],
  DRESS: [
    { key: "shoulder", label: "어깨", comparison: "width", body: "shoulderWidth" },
    { key: "chest", label: "가슴", comparison: "circumference", body: "chestCircumference" },
    { key: "waist", label: "허리", comparison: "circumference", body: "waistCircumference" },
    { key: "hip", label: "엉덩이", comparison: "circumference", body: "hipCircumference" },
    { key: "length", label: "총장", comparison: "length", body: "height" },
  ],
  SKIRT: [
    { key: "waist", label: "허리", comparison: "circumference", body: "waistCircumference" },
    { key: "hip", label: "엉덩이", comparison: "circumference", body: "hipCircumference" },
    { key: "length", label: "기장", comparison: "length", body: "height" },
  ],
};

/** MVP 실제 작동 카테고리. 상의가 킬 메트릭을 통과한 뒤 하나씩 푼다. */
export const ACTIVE_CATEGORIES: readonly Category[] = ["TOP"];

export function partsOf(category: Category): PartDef[] {
  return CATEGORY_PARTS[category];
}

export function partDef(category: Category, partKey: string): PartDef | undefined {
  return CATEGORY_PARTS[category].find((p) => p.key === partKey);
}

/**
 * ② 병목 플래그 부위 — 미표기 ∩ 페인 (CLAUDE.md 성장형 엔진).
 * CATEGORY_PARTS(주 부위)와 별개다: 브랜드가 실측을 잘 안 적어 **B 역산은 못 하나**,
 * "낌/안 낌" 경험으로 **A(브랜드 실측)를 검열추정**한다. 상품정보가 안 주는데 구매를 가르는 부위.
 * **확장 레지스트리** — 개방 인테이크에서 반복되는 페인이 여기로 승격된다(규칙 4 단방향 잠금 금지).
 */
export interface PainFlagDef {
  key: string;
  label: string;
  /** 대응 인체 둘레(있으면). garmentCm이 없어 역산은 안 하나 A추정 prior로 참조. */
  body?: BodyDimension;
  note?: string;
}

export const PAIN_FLAGS: Record<Category, PainFlagDef[]> = {
  TOP: [
    { key: "arm", label: "팔(소매통)", note: "위팔둘레 — 근육형에서 어깨·가슴과 독립적으로 낌" },
    { key: "neck", label: "목", note: "목둘레 — 셔츠 칼라 등에서 조임" },
  ],
  BOTTOM: [
    { key: "calf", label: "종아리", note: "장딴지둘레 — 스키니·부츠컷에서 낌" },
  ],
  // 파생 카테고리도 A학습(브랜드 페인 지도)은 유효 — 체형 역산만 안 함.
  OUTER: [
    { key: "arm", label: "팔(소매통)", note: "이너 껴입어 더 예민" },
    { key: "neck", label: "목/칼라" },
    { key: "armhole", label: "암홀(레이어링 여유)", note: "아우터 고유 페인 — 이너 입고 맞는지" },
  ],
  DRESS: [
    { key: "arm", label: "팔(소매통)" },
    { key: "neck", label: "목" },
    { key: "ratio", label: "상하 비율", note: "가슴은 맞는데 허리가 뜨는 등 한 벌 비율 불일치" },
  ],
  SKIRT: [
    { key: "hem", label: "밑단", note: "펜슬·타이트에서 보행 제약" },
  ],
};

/** ① 역산 주 부위 = 길이축 제외(둘레·너비만). 값(여유) → 인체 역산 가능. */
export function accuracyParts(category: Category): PartDef[] {
  return CATEGORY_PARTS[category].filter((p) => p.comparison !== "length");
}

/** ③ 기장 선호 부위 = 길이축(체형 아님 — 취향·키). */
export function lengthParts(category: Category): PartDef[] {
  return CATEGORY_PARTS[category].filter((p) => p.comparison === "length");
}

/** ② 병목 플래그. */
export function painFlags(category: Category): PainFlagDef[] {
  return PAIN_FLAGS[category];
}
