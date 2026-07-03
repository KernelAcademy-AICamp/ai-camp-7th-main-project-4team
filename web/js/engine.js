/* ==========================================================================
   engine.js — 착용경험 역산 규칙 ①②③ + 브랜드 추천 사이즈 실계산
   ---
   docs/3_사이즈엔진.md §3. sangmin/src/lib/engine/rules(convert·ease·subjective)의
   JS 이관 + garments.json(A축 garmentCm)으로 "몸 → 브랜드별 맞는 사이즈"를 결정론적 계산.
   목업(engine-mock buildRecs)을 대체한다. 서술(캐릭터)만 여전히 목업/LLM.

   규칙:
     ① convert : 의류 단면 → 인체 축 (둘레=단면×2, 너비/길이=그대로)
     ② ease    : 여유 = 의류환산 − 인체
     ③ subjective : 여유(cm) ↔ 등급(끼임/딱맞음/여유/큼) — EASE_BANDS
   ========================================================================== */
(function (global) {
  "use strict";

  // ③ 부위별 여유 경계(cm) — subjective.ts EASE_BANDS. 상의만 활성.
  var BANDS = {
    "TOP:chest":    { tight: 2, snug: 8, big: 16 },
    "TOP:shoulder": { tight: 0, snug: 1.5, big: 4 },
    "TOP:belly":    { tight: 0, snug: 8, big: 18 },
  };
  // 부위 비교 성격(category.ts comparison): 둘레=circ(×2), 너비/길이=그대로.
  var CMP = { chest: "circ", belly: "circ", shoulder: "width", sleeve: "len", length: "len" };

  // ① 의류 단면(flat) → 인체 축
  function toBodyAxis(part, flatCm) { return CMP[part] === "circ" ? flatCm * 2 : flatCm; }
  // ② 여유 = 의류환산 − 인체
  function ease(part, flatCm, bodyCm) { return toBodyAxis(part, flatCm) - bodyCm; }
  // ③ 가슴 여유(cm) → 등급
  function chestRating(e) {
    var b = BANDS["TOP:chest"];
    return e <= b.tight ? "TIGHT" : e <= b.snug ? "SNUG" : e <= b.big ? "RELAXED" : "BIG";
  }

  var PILL = { TIGHT: { ko: "끼임", warn: true }, SNUG: { ko: "딱맞음", warn: false },
               RELAXED: { ko: "여유", warn: false }, BIG: { ko: "넉넉", warn: false } };
  // 선호 fitLine이 없을 때 브랜드가 가진 것 중 이 순서로 대체
  var FITLINE_FALLBACK = ["regular", "slim", "loose", "oversize"];
  // A축 편차 경고(anchor-brands translationVariance)
  var VARIANCE = { hm: "사이즈 편차 큼", zara: "유럽핏 편차 큼" };
  var TARGET_CHEST_EASE = 5; // 가슴 여유 목표(cm) — SNUG 중앙. 사이즈는 이 근처를 겨눔.

  /**
   * 추천 사이즈 계산.
   *   bodyVec: { chest, shoulder }  (cm, BodyModel 역산/회귀)
   *   prefFit: 선호 fitLine ("slim"|"regular"|"loose"|"oversize"|...)
   *   gender : "male"|"female"
   *   subtype: "long_sleeve"|"short_sleeve"
   *   specs  : garments.json.specs
   * → [{ brandName, fitLine, size, fit, warn, bottleneck, variance, chestEase }]
   */
  function recommend(bodyVec, prefFit, gender, subtype, specs) {
    var byBrand = {};
    specs.forEach(function (s) {
      if (s.category !== "TOP") return;
      if (!(s.gender === gender || s.gender === "unisex")) return;
      if (subtype && s.subtype !== subtype) return;
      (byBrand[s.brandId] = byBrand[s.brandId] || []).push(s);
    });

    var recs = [];
    Object.keys(byBrand).forEach(function (bid) {
      var list = byBrand[bid];
      var haveFit = {}; list.forEach(function (s) { haveFit[s.fitLine] = 1; });
      var fl = haveFit[prefFit] ? prefFit
             : FITLINE_FALLBACK.filter(function (f) { return haveFit[f]; })[0];
      if (!fl) return;

      // 같은 (브랜드·핏·사이즈)에 제품이 여럿 → 사이즈 라벨별 단면 평균으로 대표값.
      var bySize = {};
      list.forEach(function (s) {
        if (s.fitLine !== fl || s.garmentCm.chest == null) return;
        var e = bySize[s.sizeLabel] || (bySize[s.sizeLabel] = { size: s.sizeLabel, chest: [], shoulder: [] });
        e.chest.push(s.garmentCm.chest);
        if (s.garmentCm.shoulder != null) e.shoulder.push(s.garmentCm.shoulder);
      });
      function avg(a) { return a.reduce(function (x, y) { return x + y; }, 0) / a.length; }
      var scored = Object.keys(bySize).map(function (k) {
        var e = bySize[k];
        var ce = ease("chest", avg(e.chest), bodyVec.chest);
        var se = e.shoulder.length && bodyVec.shoulder ? ease("shoulder", avg(e.shoulder), bodyVec.shoulder) : 999;
        return { size: k, ce: ce, se: se };
      });
      if (!scored.length) return;

      // 어깨가 들어가는(여유≥0) 사이즈 우선, 그 안에서 가슴 여유가 목표에 가장 가까운 것
      var ok = scored.filter(function (x) { return x.se >= 0; });
      var pool = ok.length ? ok : scored;
      pool.sort(function (a, b) { return Math.abs(a.ce - TARGET_CHEST_EASE) - Math.abs(b.ce - TARGET_CHEST_EASE); });
      var pick = pool[0];
      var pill = PILL[chestRating(pick.ce)];
      var bottleneck = pick.se < BANDS["TOP:shoulder"].snug ? "어깨" : "가슴";

      recs.push({
        brandId: bid, brandName: list[0].brandName, fitLine: fl, size: pick.size,
        fit: pill.ko, warn: pill.warn, bottleneck: bottleneck,
        variance: VARIANCE[bid] || null, chestEase: Math.round(pick.ce * 10) / 10,
      });
    });

    // 딱맞음 우선 → 편차 브랜드는 뒤로
    var rank = { "딱맞음": 0, "여유": 1, "넉넉": 2, "끼임": 3 };
    recs.sort(function (a, b) {
      return (rank[a.fit] - rank[b.fit]) || ((a.variance ? 1 : 0) - (b.variance ? 1 : 0));
    });
    return recs;
  }

  global.FitEngine = { recommend: recommend, ease: ease, chestRating: chestRating, _real: true };
})(typeof window !== "undefined" ? window : this);
