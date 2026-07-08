/* ==========================================================================
   engine.js — 착용경험 역산 규칙 ①②③ + 브랜드 추천 사이즈 실계산
   ---
   ★ 사이즈 엔진의 유일 구현(single source of truth).
     · 규칙 명세(정본)  : docs/6_사이즈엔진.md  ← 밴드 값·규칙 서술은 여기가 원본
     · 데이터 계약(형)   : engine/schema/*.ts   ← 타입 참조용(빌드/실행 안 함)
     · 회귀 안전망       : engine/test.js       ← `npm test`(무의존성 node)
     예전 engine/rules/*.ts(중복 구현)는 제거됨 — 규칙은 이 파일 한 곳에서만 고친다.
   ---
   garments.json(A축 garmentCm)으로 "몸 → 브랜드별 맞는 사이즈"를 결정론적 계산.
   목업(engine-mock buildRecs)을 대체한다. 서술(캐릭터)만 여전히 목업/LLM.
   브라우저는 <script>로, node는 require()로 같은 파일을 로드(global=window|module.exports).

   규칙:
     ① convert : 의류 단면 → 인체 축 (둘레=단면×2, 너비/길이=그대로)
     ② ease    : 여유 = 의류환산 − 인체
     ③ subjective : 여유(cm) ↔ 등급(끼임/딱맞음/여유/큼) — EASE_BANDS
   ========================================================================== */
(function (global) {
  "use strict";

  // ③ 부위별 여유 경계(cm) — EASE_BANDS(docs/6 §3). 하의는 가설값(실피드백으로 튜닝).
  var BANDS = {
    "TOP:chest":    { tight: 2, snug: 8, big: 16 },
    "TOP:shoulder": { tight: 0, snug: 1.5, big: 4 },
    "TOP:belly":    { tight: 0, snug: 8, big: 18 },
    "BOTTOM:waist": { tight: 0, snug: 4, big: 10 },
    "BOTTOM:hip":   { tight: 0, snug: 6, big: 14 },
    "BOTTOM:thigh": { tight: 0, snug: 5, big: 12 },
  };
  // 부위 비교 성격(category.ts comparison): 둘레=circ(×2), 너비/길이=그대로.
  var CMP = { chest: "circ", belly: "circ", shoulder: "width", sleeve: "len", length: "len",
              waist: "circ", hip: "circ", thigh: "circ", rise: "len", hem: "width" };
  // 카테고리별 역산 가능 부위(garmentCm에 있고 밴드가 있는 둘레/너비 부위)
  var CAT_PARTS = { TOP: ["chest", "shoulder"], BOTTOM: ["waist", "hip", "thigh"] };

  // ① 의류 단면(flat) → 인체 축
  function toBodyAxis(part, flatCm) { return CMP[part] === "circ" ? flatCm * 2 : flatCm; }
  // ② 여유 = 의류환산 − 인체
  function ease(part, flatCm, bodyCm) { return toBodyAxis(part, flatCm) - bodyCm; }
  // ③ 가슴 여유(cm) → 등급
  function chestRating(e) {
    var b = BANDS["TOP:chest"];
    return e <= b.tight ? "TIGHT" : e <= b.snug ? "SNUG" : e <= b.big ? "RELAXED" : "BIG";
  }
  // ③역: 등급 → 여유(ease) 대표점 (chestRating의 역). 정본 subjective.ts#ratingToEasePoint 미러:
  //   중간 두 등급=구간 중앙, 열린 끝(TIGHT·BIG)=경계에서 한 폭(span=big−tight)의 절반만큼 외삽.
  function ratingToEase(part, rating, category) {
    var b = BANDS[(category || "TOP") + ":" + part];
    if (!b) return null;
    var span = b.big - b.tight;
    if (rating === "TIGHT") return b.tight - span / 2;
    if (rating === "SNUG") return (b.tight + b.snug) / 2;
    if (rating === "RELAXED") return (b.snug + b.big) / 2;
    if (rating === "BIG") return b.big + span / 2;
    return null;
  }
  // 규칙④~⑧: 착용경험 → 부위별 인체 치수 역산.
  //   body = 의류축(단면×2 등) − ratingToEase(등급). 같은(브랜드·핏·사이즈) 제품 여럿=평균, 여러 경험=부위별 평균.
  //   카테고리별 역산 부위(CAT_PARTS): TOP=chest·shoulder / BOTTOM=waist·hip·thigh.
  function bodyFromExperiences(experiences, specs) {
    var acc = {};
    (experiences || []).forEach(function (e) {
      var parts = CAT_PARTS[e.category];
      if (!parts || !e.fits) return;
      var m = (specs || []).filter(function (s) {
        if (s.category !== e.category || s.brandId !== e.brandId) return false;
        if (s.sizeLabel !== e.sizeLabel) return false;
        if (!(s.gender === e.gender || s.gender === "unisex")) return false;
        if (e.subtype && s.subtype !== e.subtype) return false;
        // 형태 매칭: 하의는 silhouette(형태축)이 1차 키 — 같은 허리여도 실루엣별 허벅지·밑단이 달라
        //   fitLine(여유축)만으론 스트레이트·테이퍼드·와이드가 뭉개짐. 실루엣 없으면 fitLine 폴백.
        if (e.category === "BOTTOM" && e.silhouette) return s.silhouette === e.silhouette;
        return s.fitLine === e.fitLine;
      });
      if (!m.length) return;
      parts.forEach(function (part) {
        var rating = e.fits[part]; if (!rating) return;
        // 밴딩 바지는 허리가 신축이라 역산 신뢰 불가 → 허리 스킵(회귀값 폴백). 허벅지·엉덩이는 전부 유효.
        //  판정: 사용자 응답(e.waistband: 'banded'=있음 / 'none'=없음) 우선. '모름'/미응답이면 매칭 그룹의 밴딩 여부로 추정.
        if (part === "waist") {
          var banded = e.waistband === "banded" ? true
            : e.waistband === "none" ? false
            : m.some(function (s) { return s.waistband; });
          if (banded) return;
        }
        var flats = m.map(function (s) { return s.garmentCm[part]; }).filter(function (v) { return v != null; });
        if (!flats.length) return;
        var flat = flats.reduce(function (a, b) { return a + b; }, 0) / flats.length;
        var easePt = ratingToEase(part, rating, e.category); if (easePt == null) return;
        (acc[part] = acc[part] || []).push(toBodyAxis(part, flat) - easePt);
      });
    });
    var out = {};
    Object.keys(acc).forEach(function (k) {
      if (acc[k].length) out[k] = Math.round((acc[k].reduce(function (a, b) { return a + b; }, 0) / acc[k].length) * 10) / 10;
    });
    return out; // TOP:{chest?,shoulder?} / BOTTOM:{waist?,hip?,thigh?}
  }

  var PILL = { TIGHT: { ko: "끼임", warn: true }, SNUG: { ko: "딱맞음", warn: false },
               RELAXED: { ko: "여유", warn: false }, BIG: { ko: "넉넉", warn: false } };
  // 선호 fitLine이 없을 때 브랜드가 가진 것 중 이 순서로 대체
  var FITLINE_FALLBACK = ["regular", "slim", "loose", "oversize"];
  // A축 편차 경고(anchor-brands translationVariance)
  var VARIANCE = { hm: "사이즈 편차 큼", zara: "유럽핏 편차 큼" };
  var TARGET_CHEST_EASE = 5; // 가슴 여유 목표(cm) — SNUG 중앙. 사이즈는 이 근처를 겨눔.

  // 핏 지수(0~100%): 이상 여유에서 벗어난 정도로 감점. 가슴(이상 5cm)+어깨(이상 ~1cm).
  function scoreFit(ce, se) {
    var chestDev = Math.abs(ce - TARGET_CHEST_EASE);
    var shDev;
    if (se == null || se >= 900) shDev = 0;         // 어깨 데이터 없음 → 감점 안 함
    else if (se < 0) shDev = (-se) * 1.8 + 1;       // 어깨 끼임 = 큰 감점
    else shDev = Math.max(0, Math.abs(se - 1) - 1); // 어깨 여유 1cm 근처는 관대
    var penalty = chestDev * 5.5 + shDev * 7;
    return Math.max(35, Math.min(99, Math.round(100 - penalty)));
  }

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
        fitScore: scoreFit(pick.ce, pick.se),
      });
    });

    // 핏 지수 높은 순 → 편차 브랜드는 뒤로(동점 시)
    recs.sort(function (a, b) {
      return (b.fitScore - a.fitScore) || ((a.variance ? 1 : 0) - (b.variance ? 1 : 0));
    });
    return recs;
  }

  /* ── 하의 추천 (recommendBottom) ─────────────────────────────────────────────
     상의(recommend)와 축이 다름: 실루엣(형태)로 후보를 좁히고, 허리를 사이즈 게이트로,
     엉덩이·허벅지 수용을 확인한다. bodyVec={waist,hip,thigh}, prefSil=선호 실루엣. */
  var TARGET_WAIST_EASE = 2; // 허리 여유 목표(cm) — BOTTOM:waist SNUG 중앙
  var SIL_FALLBACK = ["straight", "slim", "tapered", "wide", "skinny", "bootcut"];

  // 허리 여유 → 등급. 밴딩이면 신축이라 끼임을 완화(음수 여유도 어느 정도 수용).
  function waistRating(e, waistband) {
    var b = BANDS["BOTTOM:waist"], lo = waistband ? b.tight - 4 : b.tight;
    return e <= lo ? "TIGHT" : e <= b.snug ? "SNUG" : e <= b.big ? "RELAXED" : "BIG";
  }
  // 핏 지수: 허리 이상편차 + 엉덩이·허벅지 끼임 감점. 여유(≥0)는 관대, 끼임(<0)은 큰 감점.
  function scoreFitBottom(we, he, te) {
    var wDev = Math.abs(we - TARGET_WAIST_EASE);
    var hDev = he >= 900 ? 0 : he < 0 ? -he * 1.6 + 1 : Math.max(0, Math.abs(he - 3) - 3);
    var tDev = te >= 900 ? 0 : te < 0 ? -te * 1.4 + 1 : Math.max(0, Math.abs(te - 2.5) - 3);
    return Math.max(35, Math.min(99, Math.round(100 - (wDev * 4 + hDev * 3.5 + tDev * 2.5))));
  }

  function recommendBottom(bodyVec, prefSil, gender, subtype, specs) {
    var byBrand = {};
    (specs || []).forEach(function (s) {
      if (s.category !== "BOTTOM") return;
      if (!(s.gender === gender || s.gender === "unisex")) return;
      if (subtype && s.subtype !== subtype) return;
      (byBrand[s.brandId] = byBrand[s.brandId] || []).push(s);
    });

    var recs = [];
    Object.keys(byBrand).forEach(function (bid) {
      var list = byBrand[bid];
      var haveSil = {}; list.forEach(function (s) { haveSil[s.silhouette] = 1; });
      var sil = haveSil[prefSil] ? prefSil : SIL_FALLBACK.filter(function (f) { return haveSil[f]; })[0];
      if (!sil) return;

      var bySize = {};
      list.forEach(function (s) {
        if (s.silhouette !== sil || s.garmentCm.waist == null) return;
        var e = bySize[s.sizeLabel] || (bySize[s.sizeLabel] = { size: s.sizeLabel, waist: [], hip: [], thigh: [], waistband: s.waistband });
        e.waist.push(s.garmentCm.waist);
        if (s.garmentCm.hip != null) e.hip.push(s.garmentCm.hip);
        if (s.garmentCm.thigh != null) e.thigh.push(s.garmentCm.thigh);
      });
      function avg(a) { return a.reduce(function (x, y) { return x + y; }, 0) / a.length; }
      var scored = Object.keys(bySize).map(function (k) {
        var e = bySize[k];
        return { size: k, waistband: e.waistband,
          we: ease("waist", avg(e.waist), bodyVec.waist),
          he: e.hip.length && bodyVec.hip ? ease("hip", avg(e.hip), bodyVec.hip) : 999,
          te: e.thigh.length && bodyVec.thigh ? ease("thigh", avg(e.thigh), bodyVec.thigh) : 999 };
      });
      if (!scored.length) return;

      // 엉덩이·허벅지가 들어가는(여유≥0) 사이즈 우선, 그 안에서 허리 여유가 목표에 가장 가까운 것
      var okp = scored.filter(function (x) { return x.he >= 0 && x.te >= 0; });
      var pool = okp.length ? okp : scored;
      pool.sort(function (a, b) { return Math.abs(a.we - TARGET_WAIST_EASE) - Math.abs(b.we - TARGET_WAIST_EASE); });
      var pick = pool[0];
      var pill = PILL[waistRating(pick.we, pick.waistband)];
      var bottleneck = (pick.he < BANDS["BOTTOM:hip"].snug && pick.he < 900) ? "엉덩이"
        : (pick.te < BANDS["BOTTOM:thigh"].snug && pick.te < 900) ? "허벅지" : "허리";

      recs.push({
        brandId: bid, brandName: list[0].brandName, fitLine: sil, silhouette: sil, size: pick.size,
        fit: pill.ko, warn: pill.warn, bottleneck: bottleneck, variance: VARIANCE[bid] || null,
        waistEase: Math.round(pick.we * 10) / 10, fitScore: scoreFitBottom(pick.we, pick.he, pick.te),
      });
    });

    recs.sort(function (a, b) {
      return (b.fitScore - a.fitScore) || ((a.variance ? 1 : 0) - (b.variance ? 1 : 0));
    });
    return recs;
  }

  global.FitEngine = {
    recommend: recommend, recommendBottom: recommendBottom, ease: ease, chestRating: chestRating,
    ratingToEase: ratingToEase, bodyFromExperiences: bodyFromExperiences, _real: true
  };
})(typeof window !== "undefined" ? window : this);
