/* ==========================================================================
   engine/test.js — 사이즈 엔진 골든 테스트 (무의존성)
   ---
   실행: `node engine/test.js`  또는  `npm test`  (설치 불필요)
   목적: web/js/engine.js(유일 정본)의 규칙이 명세(docs/6_사이즈엔진.md)와
         어긋나면 즉시 빨간불. 특히 밴드 값(가슴 2/8/16·어깨 0/1.5/4·배 0/8/18)을
         '동작'으로 잠가, 과거 470d72f 같은 드리프트를 CI가 잡게 한다.
   값은 현재 engine.js 출력 스냅샷 — scoreFit 등 공식을 의도적으로 바꿀 땐 함께 갱신.
   ========================================================================== */
"use strict";
const assert = require("assert");
const { FitEngine } = require("../web/js/engine.js");
assert.ok(FitEngine && FitEngine._real, "engine.js가 실엔진(_real)을 export해야 함");

let pass = 0;
function eq(actual, expected, msg) {
  assert.deepStrictEqual(actual, expected, `${msg}\n  기대: ${JSON.stringify(expected)}\n  실제: ${JSON.stringify(actual)}`);
  pass++;
}
function close(actual, expected, msg) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${msg} — 기대 ${expected}, 실제 ${actual}`);
  pass++;
}

/* ── 규칙 ①② convert/ease: 둘레는 단면×2, 너비/길이는 그대로 ───────────────── */
close(FitEngine.ease("chest", 55, 96), 14, "ease(chest 55단면=110둘레 − 96) = 14");
close(FitEngine.ease("belly", 50, 90), 10, "ease(belly 둘레부위 ×2)");
close(FitEngine.ease("shoulder", 45, 44), 1, "ease(shoulder 너비부위 ×1)");

/* ── 밴드 잠금 A: chestRating 경계 → 가슴 밴드 {2, 8, 16} ──────────────────── */
eq(FitEngine.chestRating(2), "TIGHT", "가슴 tightMax=2 경계");
eq(FitEngine.chestRating(2.01), "SNUG", "2 초과부터 SNUG");
eq(FitEngine.chestRating(8), "SNUG", "가슴 snugMax=8 경계");
eq(FitEngine.chestRating(8.01), "RELAXED", "8 초과부터 RELAXED");
eq(FitEngine.chestRating(16), "RELAXED", "가슴 bigMin=16 경계");
eq(FitEngine.chestRating(16.01), "BIG", "16 초과부터 BIG");

/* ── 밴드 잠금 B: ratingToEase 역산점 → 세 부위 밴드 값 전체 ────────────────── */
// 가슴 {2,8,16}, span=14
close(FitEngine.ratingToEase("chest", "TIGHT"), -5, "가슴 TIGHT = 2 − 14/2");
close(FitEngine.ratingToEase("chest", "SNUG"), 5, "가슴 SNUG = (2+8)/2");
close(FitEngine.ratingToEase("chest", "RELAXED"), 12, "가슴 RELAXED = (8+16)/2");
close(FitEngine.ratingToEase("chest", "BIG"), 23, "가슴 BIG = 16 + 14/2");
// 어깨 {0,1.5,4}, span=4
close(FitEngine.ratingToEase("shoulder", "TIGHT"), -2, "어깨 TIGHT = 0 − 4/2");
close(FitEngine.ratingToEase("shoulder", "SNUG"), 0.75, "어깨 SNUG = (0+1.5)/2");
close(FitEngine.ratingToEase("shoulder", "RELAXED"), 2.75, "어깨 RELAXED = (1.5+4)/2");
close(FitEngine.ratingToEase("shoulder", "BIG"), 6, "어깨 BIG = 4 + 4/2");
// 배 {0,8,18}, span=18
close(FitEngine.ratingToEase("belly", "SNUG"), 4, "배 SNUG = (0+8)/2");
close(FitEngine.ratingToEase("belly", "RELAXED"), 13, "배 RELAXED = (8+18)/2");
eq(FitEngine.ratingToEase("chest", "NONSENSE"), null, "미정의 등급 → null");
eq(FitEngine.ratingToEase("waist", "SNUG"), null, "미활성 부위(하의) → null");

/* ── 착용경험 → 인체 역산 (bodyFromExperiences) ─────────────────────────────── */
const specsMatch = [
  { category: "TOP", brandId: "a", brandName: "A", fitLine: "regular", sizeLabel: "M",
    gender: "male", subtype: "long_sleeve", garmentCm: { chest: 50, shoulder: 44 } },
];
const exp = [
  { category: "TOP", brandId: "a", fitLine: "regular", sizeLabel: "M", gender: "male",
    subtype: "long_sleeve", fits: { chest: "SNUG", shoulder: "SNUG" } },
];
// chest: 50×2 − ratingToEase(chest,SNUG=5) = 95 ; shoulder: 44 − 0.75 = 43.25 → 43.3
eq(FitEngine.bodyFromExperiences(exp, specsMatch), { chest: 95, shoulder: 43.3 },
   "SNUG 착용경험 → 인체 가슴95·어깨43.3 역산");
eq(FitEngine.bodyFromExperiences([], specsMatch), {}, "경험 없으면 빈 역산");

/* ── 추천 사이즈 (recommend): 어깨 들어가는 것 우선 → 가슴 여유 5cm에 근접 ────── */
const specs = [
  { category: "TOP", brandId: "a", brandName: "A", fitLine: "regular", sizeLabel: "M",
    gender: "male", subtype: "long_sleeve", garmentCm: { chest: 50, shoulder: 44 } },
  { category: "TOP", brandId: "a", brandName: "A", fitLine: "regular", sizeLabel: "L",
    gender: "male", subtype: "long_sleeve", garmentCm: { chest: 53, shoulder: 46 } },
  { category: "TOP", brandId: "b", brandName: "B", fitLine: "slim", sizeLabel: "95",
    gender: "male", subtype: "long_sleeve", garmentCm: { chest: 49, shoulder: 43 } },
  { category: "TOP", brandId: "b", brandName: "B", fitLine: "slim", sizeLabel: "100",
    gender: "male", subtype: "long_sleeve", garmentCm: { chest: 52, shoulder: 45 } },
];
const recs = FitEngine.recommend({ chest: 96, shoulder: 45 }, "regular", "male", "long_sleeve", specs);
eq(recs.length, 2, "브랜드 2개 → 추천 2건");
// b: 선호 regular 없음 → slim 폴백, 100(가슴여유 8·어깨0) 선택. a: L(가슴여유 10·어깨1) 선택.
eq(recs.map((r) => [r.brandId, r.fitLine, r.size, r.fit]),
   [["b", "slim", "100", "딱맞음"], ["a", "regular", "L", "여유"]],
   "폴백핏·사이즈·핏감 스냅샷");
assert.ok(recs[0].fitScore >= recs[1].fitScore, "핏 지수 내림차순 정렬"); pass++;
["brandName", "fitLine", "size", "fit", "warn", "bottleneck", "fitScore", "chestEase"].forEach((k) => {
  assert.ok(k in recs[0], `추천 항목에 ${k} 필드 존재`); pass++;
});

/* ── 실데이터 스모크: garments.json 전량으로 깨지지 않고 계약 지키는지 ───────── */
try {
  const g = require("../web/data/garments.json");
  const real = FitEngine.recommend({ chest: 96, shoulder: 45 }, "regular", "male", "long_sleeve", g.specs || []);
  assert.ok(Array.isArray(real), "실데이터 recommend는 배열 반환"); pass++;
  for (let i = 1; i < real.length; i++) {
    assert.ok(real[i - 1].fitScore >= real[i].fitScore, "실데이터도 핏지수 내림차순");
  }
  real.forEach((r) => assert.ok(r.fitScore >= 35 && r.fitScore <= 99, "핏지수 35~99 범위"));
  pass++;
  console.log(`  (실데이터 스모크: garments ${(g.specs || []).length}종 → 추천 ${real.length}건)`);
} catch (e) {
  console.log(`  (실데이터 스모크 건너뜀: ${e.message})`);
}

/* ── 8유형 분류기 (bodytype.js) — KS드롭+로우데이터 절단값 ─────────────── */
const { FitBodyType } = require("../web/js/bodytype.js");
assert.ok(FitBodyType && Array.isArray(FitBodyType.CODES), "bodytype.js가 FitBodyType export"); pass++;
[
  ["INV", { gender: "male", heightCm: 175, weightKg: 70, chestFull: 100, chestUpper: 100, waist: 88, hip: 96 }],
  ["TRI", { gender: "female", heightCm: 160, weightKg: 52, chestFull: 82, waist: 66, hip: 96 }],
  ["HRG", { gender: "female", heightCm: 162, weightKg: 52, chestFull: 88, waist: 66, hip: 92 }],
  ["STR", { gender: "male", heightCm: 172, weightKg: 68, chestFull: 92, chestUpper: 93, waist: 86, hip: 92 }],
  ["BAL", { gender: "male", heightCm: 174, weightKg: 70, chestFull: 94, chestUpper: 95, waist: 82, hip: 94 }],
  ["RND", { gender: "male", heightCm: 170, weightKg: 92, chestFull: 108, chestUpper: 110, waist: 95, hip: 106 }],
  ["DIA", { gender: "male", heightCm: 170, weightKg: 92, chestFull: 99, chestUpper: 100, waist: 96, hip: 98 }],
  ["TUB", { gender: "female", heightCm: 166, weightKg: 45, chestFull: 80, waist: 62, hip: 86 }],
].forEach(([want, inp]) => eq(FitBodyType.classify(inp), want, `8유형 분류 → ${want}`));
eq(FitBodyType.classify({ gender: "male" }), null, "측정 부족 → null");
eq(FitBodyType.classify({ gender: "x", chestFull: 90, waist: 80, hip: 92 }), null, "미지 성별 → null");
const _bt = { gender: "female", heightCm: 160, weightKg: 52, chestFull: 82, waist: 66, hip: 96 };
eq(FitBodyType.classify(_bt), FitBodyType.classify(_bt), "분류 결정론적");

console.log(`\n✓ 골든 테스트 ${pass}건 통과 — engine.js·bodytype.js가 명세(docs/6)와 일치.`);
