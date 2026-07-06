/**
 * 규칙 ①: 인체 치수 ↔ 의류 치수 변환 (build.md §4-0).
 *
 * 사이즈코리아 = 인체 치수(둘레/너비/길이). 브랜드 실측 = 의류 치수(보통 '단면/평면').
 * 둘레 부위는 `의류 둘레 = 단면 ×2`로 환산해야 인체 둘레와 비교 가능.
 * 단, 모든 게 ×2는 아니다 — 어깨(너비)·소매/총장(길이)은 ×2 하지 않는다(부위의 comparison으로 분기).
 */

import type { PartDef } from "../schema/category.js";

/** 의류 단면(flat) → 둘레 환산. */
export function flatToCircumference(flatCm: number): number {
  return flatCm * 2;
}

/**
 * 부위의 의류 실측치를 '인체 치수와 같은 축'의 값으로 환산한다.
 *  - circumference: 단면 ×2 (둘레로)
 *  - width / length: 그대로 (이미 인체와 같은 축)
 * 반환값은 인체 치수와 직접 비교/여유 계산이 가능한 단위.
 */
export function garmentToBodyAxis(part: PartDef, garmentCm: number): number {
  switch (part.comparison) {
    case "circumference":
      return flatToCircumference(garmentCm);
    case "width":
    case "length":
      return garmentCm;
  }
}
