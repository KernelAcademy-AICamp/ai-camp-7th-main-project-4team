/**
 * 규칙 모듈 스모크 데모 (Phase 0). `npm run demo` 로 실행.
 * 목적: 변환·여유·주관매핑이 맞물려 '착용 경험 → 인체 역산 → 다른 사이즈 투영'의
 *       산술 왕복이 성립하는지 눈으로 확인. (정식 엔진은 Phase 2)
 */

import { partDef } from "../../schema/index.js";
import { ease, bodyFromEase } from "./ease.js";
import { ratingToEasePoint, easeToRating, FIT_RATING_LABEL } from "./subjective.js";

const chest = partDef("TOP", "chest")!;

// 1) 가설 시드: 어떤 상의 M의 가슴 단면 52cm (→ 둘레 104cm).
const garmentM_flat = 52;

// 2) 사용자가 그 옷의 가슴을 '딱맞음(SNUG)'으로 평가.
const easePoint = ratingToEasePoint("TOP", "chest", "SNUG")!;
console.log(`가슴 '딱맞음' 대표 여유 = ${easePoint}cm (둘레 기준)`);

// 3) 역산: 인체 가슴둘레 ≈ 의류둘레 − 여유
const bodyChest = bodyFromEase(chest, garmentM_flat, easePoint);
console.log(`역산된 인체 가슴둘레 ≈ ${bodyChest}cm`);

// 4) 투영: 다른 사이즈(L, 단면 55 → 둘레 110)에 이 체형을 대보면?
const garmentL_flat = 55;
const easeOnL = ease(chest, garmentL_flat, bodyChest);
const ratingOnL = easeToRating("TOP", "chest", easeOnL);
console.log(
  `이 체형이 L(단면 ${garmentL_flat})을 입으면 여유 ${easeOnL}cm → '${ratingOnL ? FIT_RATING_LABEL[ratingOnL] : "?"}'`,
);

console.log("\nOK — 규칙 왕복 성립. (값은 전부 가설값, 피드백으로 보정)");
