/**
 * 규칙 ③: 주관 평가 ↔ cm 여유 매핑 (build.md §4-0).
 *
 * 사용자 입력("큼/여유/딱맞음/불편")을 cm 여유 구간으로 변환한다.
 * ⚠ 이 매핑은 (category, part)별로 다르다 — 어깨의 '여유'와 가슴의 '여유'는 cm 폭이 다르다.
 *    그래서 테이블 키를 `${category}:${part}` 로 둔다.
 *
 * 아래 값은 전부 **초기 가설값**이다. FeedbackLog가 쌓이면 보정한다(킬 메트릭이 판정).
 * length 부위(소매·총장·기장)는 '여유'가 아니라 '기장감'이라 이 표에 넣지 않는다(별도 축).
 */

import type { Category } from "../schema/category.js";
import type { FitRating } from "../schema/fitrating.js";

// FitRating·라벨은 스키마 층으로 이동(엔진·데이터·설문이 같은 어휘 공유). 재노출로 기존 소비자 유지.
export type { FitRating } from "../schema/fitrating.js";
export { FIT_RATING_LABEL } from "../schema/fitrating.js";

/**
 * 부위별 여유 경계(cm). 의미:
 *   ease <= tightMax            → TIGHT
 *   tightMax <  ease <= snugMax → SNUG
 *   snugMax  <  ease <= bigMin  → RELAXED
 *   ease >  bigMin              → BIG
 */
export interface EaseBands {
  tightMax: number;
  snugMax: number;
  bigMin: number;
}

/**
 * (category:part) → 여유 경계. 가설값.
 * 둘레(가슴·배)는 둘레 기준 cm(단면의 2배 스케일)이라 폭이 넓고,
 * 너비(어깨)는 절반 스케일이라 폭이 좁다 — 이 차이가 '부위마다 다르다'의 실체.
 */
export const EASE_BANDS: Record<string, EaseBands> = {
  // 상의 — 둘레 부위(둘레 cm 기준)
  "TOP:chest": { tightMax: 2, snugMax: 8, bigMin: 16 },
  "TOP:belly": { tightMax: 0, snugMax: 8, bigMin: 18 },
  // 상의 — 너비 부위(어깨너비 cm 기준, 폭이 좁다)
  "TOP:shoulder": { tightMax: 0, snugMax: 1.5, bigMin: 4 },
  // 하의 — 둘레 부위(가설값). 허리는 여유 허용폭이 좁고, 엉덩이·허벅지는 넓다.
  //   부위 설계·목업용 초기 밴드 — 킬 메트릭/피드백 전엔 미검증(작동은 상의 우선, CLAUDE.md #6).
  "BOTTOM:waist": { tightMax: 0, snugMax: 4, bigMin: 10 },
  "BOTTOM:hip": { tightMax: 0, snugMax: 6, bigMin: 14 },
  "BOTTOM:thigh": { tightMax: 0, snugMax: 5, bigMin: 12 },
};

export function easeBandsKey(category: Category, partKey: string): string {
  return `${category}:${partKey}`;
}

export function easeBandsOf(category: Category, partKey: string): EaseBands | undefined {
  return EASE_BANDS[easeBandsKey(category, partKey)];
}

/** 여유(cm) → 주관 등급. 검증·결과 표시용. 매핑 없으면 undefined. */
export function easeToRating(category: Category, partKey: string, easeCm: number): FitRating | undefined {
  const b = easeBandsOf(category, partKey);
  if (!b) return undefined;
  if (easeCm <= b.tightMax) return "TIGHT";
  if (easeCm <= b.snugMax) return "SNUG";
  if (easeCm <= b.bigMin) return "RELAXED";
  return "BIG";
}

/**
 * 주관 등급 → 여유(cm) 구간 [min, max]. 역산(Phase 2)의 입력.
 * 양 끝 등급은 한쪽이 열려 있어 ±Infinity로 표기.
 */
export function ratingToEaseRange(
  category: Category,
  partKey: string,
  rating: FitRating,
): { min: number; max: number } | undefined {
  const b = easeBandsOf(category, partKey);
  if (!b) return undefined;
  switch (rating) {
    case "TIGHT":
      return { min: -Infinity, max: b.tightMax };
    case "SNUG":
      return { min: b.tightMax, max: b.snugMax };
    case "RELAXED":
      return { min: b.snugMax, max: b.bigMin };
    case "BIG":
      return { min: b.bigMin, max: Infinity };
  }
}

/** 역산용 점 추정: 등급 구간의 대표값(중앙). 열린 끝은 경계에서 한 폭만큼 외삽. */
export function ratingToEasePoint(category: Category, partKey: string, rating: FitRating): number | undefined {
  const r = ratingToEaseRange(category, partKey, rating);
  const b = easeBandsOf(category, partKey);
  if (!r || !b) return undefined;
  const span = b.bigMin - b.tightMax; // 중간 두 구간의 대략 폭
  if (r.min === -Infinity) return b.tightMax - span / 2;
  if (r.max === Infinity) return b.bigMin + span / 2;
  return (r.min + r.max) / 2;
}
