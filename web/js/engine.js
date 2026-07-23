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
    "TOP:waist":    { tight: 0, snug: 8, big: 18 },   // 상의 허리(핏 상의) — belly와 동일 가설값. 표에 있을 때만 판정.
    "BOTTOM:waist": { tight: 0, snug: 4, big: 10 },
    "BOTTOM:hip":   { tight: 0, snug: 6, big: 14 },
    "BOTTOM:thigh": { tight: 0, snug: 5, big: 12 },
  };
  // 부위 비교 성격(category.ts comparison): 둘레=circ(×2), 너비/길이=그대로.
  var CMP = { chest: "circ", belly: "circ", shoulder: "width", sleeve: "len", length: "len",
              waist: "circ", hip: "circ", thigh: "circ", rise: "len", hem: "width" };
  // 카테고리별 역산 가능 부위(garmentCm에 있고 밴드가 있는 둘레/너비 부위)
  var CAT_PARTS = { TOP: ["chest", "shoulder"], BOTTOM: ["waist", "hip", "thigh"] };
  // 보조 부위: 표에 있을 때만 판정에 씀(없어도 미표기로 캐묻지 않음). 제공된 데이터 최대 활용.
  var CAT_PARTS_OPT = { TOP: ["waist"], BOTTOM: [] };

  // ── 총장(세로축) 판정 — 둘레와 성격이 다른 '스타일축' ─────────────────────────
  //   여유 = 옷 총장 − 몸 등길이(뒷목~허리) = "허리 아래로 내려오는 길이"(cm).
  //   끼임/딱맞음(둘레)이 아니라 크롭·적절·롱으로 등급. 감점(judgeScore) 대신 별도 정보 라인으로만 반영.
  //   경계값=가설값(garments.json TOP 총장 실측 분포로 보정, docs/6 §3-length). 하의 기장은 후속.
  //   상의: 여유=옷총장−등길이(뒷목~허리). 하의: 여유=옷총장(outseam)−다리가쪽길이(허리옆~바닥).
  var LEN_BANDS = { TOP: { crop: 15, fit: 36, long: 44 }, BOTTOM: { crop: -14, fit: 3, long: 9 } };
  var LEN_PILL = { CROP: { ko: "크롭", warn: true }, FIT: { ko: "적절", warn: false },
                   LONG: { ko: "롱", warn: false }, XLONG: { ko: "많이 긺", warn: false } };
  // 총장 여유(cm) → 등급. 밴드 없으면 null(판정 안 함).
  function lengthRating(ease, category) {
    var b = LEN_BANDS[category || "TOP"]; if (!b) return null;
    return ease <= b.crop ? "CROP" : ease <= b.fit ? "FIT" : ease <= b.long ? "LONG" : "XLONG";
  }
  // 한 사이즈의 총장 판정. garmentLen=옷 총장, bodyLen=몸 등길이 추정, err=등길이 rmse(cm).
  //   len 축이라 ×2 없음(옷 총장 그대로). 오차구간이 등급 경계(크롭·롱)를 물면 borderline.
  function judgeLength(garmentLen, bodyLen, category, err) {
    if (garmentLen == null || bodyLen == null) return null;
    var e = garmentLen - bodyLen, lvl = lengthRating(e, category); if (!lvl) return null;
    var b = LEN_BANDS[category || "TOP"], p = LEN_PILL[lvl];
    var out = { part: "length", ko: "총장", easeCm: Math.round(e * 10) / 10,
                level: lvl, fit: p.ko, warn: p.warn };
    if (err != null && err > 0 && b) {
      out.easeLo = Math.round((e - err) * 10) / 10;
      out.easeHi = Math.round((e + err) * 10) / 10;
      out.borderline = (lvl === "FIT") && ((e - err) <= b.crop || (e + err) > b.long);
    }
    return out;
  }

  // 밑위(rise) — 하의 세로축, 취향 지배적이라 '등급 점수' 없이 소프트 표시만.
  //   여유 = 옷 밑위 − 몸 밑위(허리높이−샅높이) → 로우/미드/하이. 크게 짧으면 낌 경고(short).
  //   ⚠️ 옷 앞밑위(곡선)와 몸 밑위(수직)는 프레임이 달라 계통 오차 가능 — 경계값=가설값, 절대 등급 아님.
  var RISE_BAND = { low: -3, high: 5, shortWarn: -6 };
  function judgeRise(garmentRise, bodyRise, err) {
    if (garmentRise == null || bodyRise == null) return null;
    var e = garmentRise - bodyRise;
    var lvl = e <= RISE_BAND.low ? "LOW" : e >= RISE_BAND.high ? "HIGH" : "MID";
    var out = { part: "rise", ko: "밑위", easeCm: Math.round(e * 10) / 10, level: lvl,
                fit: lvl === "LOW" ? "로우라이즈" : lvl === "HIGH" ? "하이라이즈" : "미드라이즈",
                short: e <= RISE_BAND.shortWarn, shortMaybe: false, warn: e <= RISE_BAND.shortWarn };
    // 몸밑위 추정은 r²가 가장 낮은 축(±2cm 안팎) — 오차를 실어 경계 근처를 단정하지 않는다(judgeLength와 동일 원칙).
    if (err != null && err > 0) {
      out.easeLo = Math.round((e - err) * 10) / 10;   // 몸밑위가 큰 쪽 = 더 끼는 쪽
      out.easeHi = Math.round((e + err) * 10) / 10;
      // 등급 경계(로우/하이)를 오차구간이 물면 '아슬'
      out.borderline = ((e - err) <= RISE_BAND.low && RISE_BAND.low < (e + err))
                    || ((e - err) < RISE_BAND.high && RISE_BAND.high <= (e + err));
      // 낌 경고: 최선의 경우까지 짧아야 '확실', 오차구간에만 걸치면 '그럴 수 있음'으로 완화
      out.short = (e + err) <= RISE_BAND.shortWarn;
      out.shortMaybe = !out.short && (e - err) <= RISE_BAND.shortWarn;
      out.warn = out.short || out.shortMaybe;
    }
    return out;
  }

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
  // 부위 한글명(판정 문구용)
  var PART_KO = { chest: "가슴", shoulder: "어깨", belly: "배", waist: "허리", hip: "엉덩이", thigh: "허벅지", sleeve: "소매", length: "총장", rise: "밑위", hem: "밑단" };
  // 조사 이/가 — 마지막 글자 받침 유무로. (가슴이 / 어깨가)
  function josa(word) {
    var c = String(word).charCodeAt(String(word).length - 1);
    var batchim = c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0;
    return word + (batchim ? "이" : "가");
  }
  // ③일반화: 여유(cm) → 등급. chestRating을 임의 부위로 확장(밴드 없으면 null).
  function easeToRating(part, e, category) {
    var b = BANDS[(category || "TOP") + ":" + part];
    if (!b) return null;
    return e <= b.tight ? "TIGHT" : e <= b.snug ? "SNUG" : e <= b.big ? "RELAXED" : "BIG";
  }
  // 선호 fitLine이 없을 때 브랜드가 가진 것 중 이 순서로 대체
  var FITLINE_FALLBACK = ["regular", "slim", "loose", "oversize"];
  // A축 편차 경고(anchor-brands translationVariance)
  var VARIANCE = { hm: "사이즈 편차 큼", zara: "유럽핏 편차 큼" };
  var TARGET_CHEST_EASE = 5; // 가슴 여유 목표(cm) — SNUG 중앙. 사이즈는 이 근처를 겨눔.

  // 상의 핏 감점(원점): 이상 여유에서 벗어난 정도. 가슴(이상 5cm)+어깨(이상 ~1cm).
  function penaltyTop(ce, se) {
    var chestDev = Math.abs(ce - TARGET_CHEST_EASE);
    var shDev;
    if (se == null || se >= 900) shDev = 0;         // 어깨 데이터 없음 → 감점 안 함
    else if (se < 0) shDev = (-se) * 1.8 + 1;       // 어깨 끼임 = 큰 감점
    else shDev = Math.max(0, Math.abs(se - 1) - 1); // 어깨 여유 1cm 근처는 관대
    return chestDev * 5.5 + shDev * 7;
  }
  // 핏 지수(35~100%): 추천용. 하한 35 — 브랜드 내 '최선의 사이즈'라 항상 뭔가는 보여줌.
  //   ⚠️ 판정(judge)은 이 하한을 쓰지 않는다(judgeScore) — "어떤 사이즈도 안 맞음"을 말해야 하므로.
  function scoreFit(ce, se) {
    return Math.max(35, Math.min(99, Math.round(100 - penaltyTop(ce, se))));
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
  // 하의 핏 감점(원점): 허리 이상편차 + 엉덩이·허벅지 끼임. 여유(≥0)는 관대, 끼임(<0)은 큰 감점.
  function penaltyBottom(we, he, te) {
    var wDev = Math.abs(we - TARGET_WAIST_EASE);
    var hDev = he >= 900 ? 0 : he < 0 ? -he * 1.6 + 1 : Math.max(0, Math.abs(he - 3) - 3);
    var tDev = te >= 900 ? 0 : te < 0 ? -te * 1.4 + 1 : Math.max(0, Math.abs(te - 2.5) - 3);
    return wDev * 4 + hDev * 3.5 + tDev * 2.5;
  }
  // 핏 지수(35~100%): 추천용 하한 35(judge는 미사용 — judgeScore 참조).
  function scoreFitBottom(we, he, te) {
    return Math.max(35, Math.min(99, Math.round(100 - penaltyBottom(we, he, te))));
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

  /* ── 단일 상품 판정 (judge) ──────────────────────────────────────────────
     추천(recommend)이 "이 브랜드에서 몇 사이즈?"라면, 판정은 "내가 고른 이 상품, 나한테 맞나?".
     사용자가 상품을 특정(브랜드·상품·핏)한 뒤 그 상품의 전 사이즈를 몸에 대본다.
     recommend와 다른 두 가지:
       (1) 점수 하한이 없다(judgeScore) — "어떤 사이즈도 안 맞음"을 말할 수 있어야 신뢰됨.
       (2) 부위별 추정오차(±rmse)를 받아, 오차구간이 끼임 경계를 물면 borderline로 표시.
     specRows = 한 상품(같은 브랜드·핏)의 사이즈 행들. 같은 사이즈 라벨 중복은 평균.
     opts.errors = { chest, shoulder, ... } 인체 추정 rmse(cm). opts.category 강제(빈 specRows 대비). */

  // 부위 판정: 여유 + 등급 + (오차가 있으면) 끼임경계 걸침(borderline).
  //   banded=하의 허리 밴딩(신축) — 추천(recommendBottom)과 같은 완화 기준(waistRating)을 판정에도 적용.
  function judgePart(part, flatCm, bodyCm, category, err, banded) {
    var e = ease(part, flatCm, bodyCm);
    var bandedWaist = (category === "BOTTOM" && part === "waist" && !!banded);
    var rating = bandedWaist ? waistRating(e, true) : easeToRating(part, e, category);
    var pill = PILL[rating] || { ko: "-", warn: false };
    var out = { part: part, ko: PART_KO[part] || part, easeCm: Math.round(e * 10) / 10,
                rating: rating, fit: pill.ko, warn: pill.warn };
    var b = BANDS[(category || "TOP") + ":" + part];
    if (err != null && err > 0 && b) {
      // 인체 추정이 ±err → 여유(=의류축−인체)도 ±err 흔들림. 몸이 큰 쪽(e−err)이 끼임 경계를 넘으면 위험.
      var tight = bandedWaist ? b.tight - 4 : b.tight;   // 밴딩은 신축이라 끼임 경계가 내려간다
      out.easeLo = Math.round((e - err) * 10) / 10;
      out.easeHi = Math.round((e + err) * 10) / 10;
      out.borderline = rating !== "TIGHT" && (e - err) <= tight && tight < (e + err);
    }
    return out;
  }

  // 판정 점수(0~100, 하한 없음). 핵심 부위(가슴·허리) 없으면 null.
  function judgeScore(category, partEase) {
    var pen;
    if (category === "BOTTOM") {
      if (partEase.waist == null) return null;
      pen = penaltyBottom(partEase.waist, partEase.hip == null ? 999 : partEase.hip,
                                          partEase.thigh == null ? 999 : partEase.thigh);
    } else {
      if (partEase.chest == null) return null;
      pen = penaltyTop(partEase.chest, partEase.shoulder == null ? 999 : partEase.shoulder);
    }
    // 보조 부위(상의 허리 등)가 표에 있으면 추가 감점 — 핵심보다 약하게. 없으면 영향 없음.
    (CAT_PARTS_OPT[category] || []).forEach(function (p) {
      var e = partEase[p]; if (e == null) return;
      var b = BANDS[category + ":" + p]; if (!b) return;
      var ideal = (b.tight + b.snug) / 2;
      var dev = e < b.tight ? (b.tight - e) * 1.8 + 1 : Math.max(0, Math.abs(e - ideal) - (b.snug - b.tight) / 2);
      pen += dev * 3;
    });
    return Math.max(0, Math.min(100, Math.round(100 - pen)));
  }

  // 한 사이즈의 종합 판정 라벨 + 병목 부위.
  //   우선순위: 끼임 > 아슬(오차경계) > 주요부위(가슴/허리) 여유·큼 > 보조부위만 큼 > 잘맞음.
  //   "잘 맞아요"는 주요부위가 딱맞고 다른 데도 크지 않을 때만 — 여유/넉넉을 잘맞음으로 뭉개지 않는다.
  function sizeVerdict(partJ, category) {
    partJ = partJ || [];
    // 부정 신호(끼임·아슬)는 측정된 부위만으로도 유효한 경고 → 먼저 본다.
    var tight = partJ.filter(function (p) { return p.rating === "TIGHT"; });
    if (tight.length) return { label: "TIGHT", ko: josa(tight[0].ko) + " 껴요", part: tight[0].part };
    var border = partJ.filter(function (p) { return p.borderline; });
    if (border.length) return { label: "BORDERLINE", ko: josa(border[0].ko) + " 아슬해요", part: border[0].part };

    var primaryKey = (CAT_PARTS[category || "TOP"] || [])[0];   // chest / waist
    var primary = partJ.filter(function (p) { return p.part === primaryKey; })[0];
    // 핵심 부위(가슴/허리) 측정이 없으면 긍정 판정을 내지 않는다.
    //   표에 치수가 없거나 내 몸 값이 없는데 '잘 맞아요'로 귀결되던 문제(근거 없는 단정) 차단.
    if (!primary) return { label: "UNKNOWN", ko: "판정할 수 없어요", part: primaryKey || null, unknown: true };
    if (primary && primary.rating === "BIG") return { label: "BIG", ko: "전체적으로 커요", part: primaryKey };
    if (primary && primary.rating === "RELAXED") return { label: "RELAXED", ko: "여유 있게 맞아요", part: primaryKey };

    // 주요부위는 딱맞음(또는 미측정) — 보조부위만 큰지 확인
    var loose = partJ.filter(function (p) { return p.part !== primaryKey && (p.rating === "BIG" || p.rating === "RELAXED"); });
    if (loose.length) return { label: "OK_LOOSE", ko: josa(loose[0].ko) + " 조금 여유로워요", part: loose[0].part };
    return { label: "OK", ko: "잘 맞아요", part: null };
  }

  function judge(bodyVec, specRows, opts) {
    opts = opts || {};
    var errors = opts.errors || {};
    specRows = (specRows || []).filter(function (s) { return s && s.garmentCm; });
    var cat = opts.category || (specRows.length ? specRows[0].category : "TOP");
    var parts = CAT_PARTS[cat] || [];
    var optParts = CAT_PARTS_OPT[cat] || [];       // 표에 있을 때만 판정하는 보조 부위
    var allParts = parts.concat(optParts);
    // 하의 허리 밴딩(신축) — opts 우선, 없으면 표 행의 waistband 표기. 추천과 같은 완화 기준을 판정에도 쓴다.
    var banded = opts.waistband != null ? !!opts.waistband
               : specRows.some(function (s) { return s.waistband; });

    // 사이즈 라벨별 그룹(중복 제품은 부위별 평균)
    var bySize = {};
    specRows.forEach(function (s) {
      if (s.category !== cat) return;
      var g = bySize[s.sizeLabel] || (bySize[s.sizeLabel] =
        { sizeLabel: s.sizeLabel, sizeOrder: (s.sizeOrder != null ? s.sizeOrder : 0), acc: {} });
      allParts.forEach(function (p) {
        var v = s.garmentCm[p];
        if (v != null) (g.acc[p] = g.acc[p] || []).push(v);
      });
      if (s.garmentCm.length != null) (g.acc.length = g.acc.length || []).push(s.garmentCm.length);  // 총장/기장(세로축)
      if (s.garmentCm.rise != null) (g.acc.rise = g.acc.rise || []).push(s.garmentCm.rise);          // 밑위(하의)
    });
    function avg(a) { return a.reduce(function (x, y) { return x + y; }, 0) / a.length; }

    var sizes = Object.keys(bySize).map(function (k) {
      var g = bySize[k], partJ = [], missing = [], partEase = {};
      parts.forEach(function (p) {                                         // 핵심 부위 — 없으면 미표기로 표시
        if (!g.acc[p] || !g.acc[p].length) { missing.push(p); return; }   // 브랜드가 표기 안 함
        if (bodyVec[p] == null) { missing.push(p); return; }              // 내 몸 치수 없음
        var pj = judgePart(p, avg(g.acc[p]), bodyVec[p], cat, errors[p], banded);
        partJ.push(pj); partEase[p] = pj.easeCm;
      });
      optParts.forEach(function (p) {                                      // 보조 부위 — 있을 때만, 없어도 안 캐물음
        if (!g.acc[p] || !g.acc[p].length || bodyVec[p] == null) return;
        var pj = judgePart(p, avg(g.acc[p]), bodyVec[p], cat, errors[p], banded);
        partJ.push(pj); partEase[p] = pj.easeCm;
      });
      // 세로축(별도·소프트 정보, 점수 미반영) — 총장/기장(bodyVec.length) + 하의 밑위(bodyVec.rise).
      var lengthJ = (g.acc.length && g.acc.length.length && bodyVec.length != null)
        ? judgeLength(avg(g.acc.length), bodyVec.length, cat, errors.length) : null;
      var riseJ = (cat === "BOTTOM" && g.acc.rise && g.acc.rise.length && bodyVec.rise != null)
        ? judgeRise(avg(g.acc.rise), bodyVec.rise, errors.rise) : null;
      return { sizeLabel: g.sizeLabel, sizeOrder: g.sizeOrder, parts: partJ, length: lengthJ, rise: riseJ,
               missing: missing, fitScore: judgeScore(cat, partEase), verdict: sizeVerdict(partJ, cat) };
    });
    sizes.sort(function (a, b) { return a.sizeOrder - b.sizeOrder; });

    // 추천 사이즈: 끼임 없는 것 중 최고 점수, 없으면 전체 최고.
    var clean = sizes.filter(function (s) { return !s.parts.some(function (p) { return p.rating === "TIGHT"; }); });
    var ranked = (clean.length ? clean : sizes).slice()
      .sort(function (a, b) { return (b.fitScore || 0) - (a.fitScore || 0); });
    var pick = ranked[0] || null;

    return { category: cat, sizes: sizes,
             pick: pick ? pick.sizeLabel : null,
             pickVerdict: pick ? pick.verdict : null,
             pickLength: pick ? pick.length : null,   // 추천 사이즈의 총장/기장 판정(소프트 정보)
             pickRise: pick ? pick.rise : null,       // 추천 사이즈의 밑위(하의) 판정(소프트 정보)
             // anyJudged=핵심 부위를 실제로 잰 사이즈가 하나라도 있나. false면 '안 맞음'이 아니라 '판정 불가'.
             anyJudged: sizes.some(function (s) { return s.verdict && !s.verdict.unknown; }),
             anyFit: clean.length > 0 };
  }

  global.FitEngine = {
    recommend: recommend, recommendBottom: recommendBottom, judge: judge,
    ease: ease, chestRating: chestRating, easeToRating: easeToRating,
    ratingToEase: ratingToEase, bodyFromExperiences: bodyFromExperiences,
    judgeLength: judgeLength, lengthRating: lengthRating, judgeRise: judgeRise,
    bands: BANDS, lenBands: LEN_BANDS, catParts: CAT_PARTS, partKo: PART_KO, _real: true
  };
})(typeof window !== "undefined" ? window : this);
