/**
 * 규칙 ②: 여유분(ease) 계산 (build.md §4-0).
 *
 *   여유 = (의류 둘레/너비 환산값) − (인체 둘레/너비)
 *
 * 핏라인(슬림/레귤러/루즈)의 정체가 곧 이 여유값이다.
 * length 부위(소매·총장·기장)는 '여유'가 아니라 '기장감'이라 별도 함수로 다룬다.
 */

import type { PartDef } from "../schema/category.js";
import { garmentToBodyAxis } from "./convert.js";

/**
 * circumference/width 부위의 여유(cm). 양수=옷이 더 큼(여유), 음수=옷이 더 작음(쪼임).
 * length 부위에 부르면 의류-인체 길이차를 반환하지만 의미는 '여유'가 아니라 '기장차'이니
 * 호출부에서 part.comparison === 'length' 여부로 해석을 갈라야 한다.
 */
export function ease(part: PartDef, garmentCm: number, bodyCm: number): number {
  return garmentToBodyAxis(part, garmentCm) - bodyCm;
}

/**
 * 역으로: 의류 치수와 '경험한 여유'로 인체 치수를 역산.
 *   인체 = 의류환산 − 여유
 * 착용 경험 역산(Phase 2)의 산술 토대. circumference/width 부위에만 의미.
 */
export function bodyFromEase(part: PartDef, garmentCm: number, easeCm: number): number {
  return garmentToBodyAxis(part, garmentCm) - easeCm;
}
