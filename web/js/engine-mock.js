/* ==========================================================================
   engine-mock.js — 엔진 계약(M2)의 목업 어댑터
   ---
   diagnose() 계약(카드/recs/tier)을 충족하는 어댑터. UI는 이 계약만 호출한다.
   실계산 엔진(convert/ease/subjective + 역산)은 web/js/engine.js(FitEngine)에 있고,
   여기 buildCard/buildRecs 등 수치·서술 매핑은 목업(placeholder)이다.

   계약:
     FittingEngine.diagnose({ basic, prefs, experiences }) →
       { card, recs, confidenceTier }
     FittingEngine.mapToBodyType(card) → 8유형 code (STR|TRI|...|TUB)  // Phase C 정식 테이블의 스텁
   ========================================================================== */
(function (global) {
  "use strict";

  // 8유형 코드 — data/bodytypes.json과 동일 축(카드 표현용).
  var CODES = ["STR", "TRI", "INV", "HRG", "BAL", "DIA", "RND", "TUB"];

  /**
   * [스텁] 체형카드(upper×lower) → 8유형 code.
   * ⚠️ Phase C 정식 매핑 테이블 자리. 지금은 fit 신호로 그럴듯한 유형을 결정론적으로 고른다.
   * 실제로는 upper(어깨·가슴·배) × lower(허리·엉덩이·허벅지) 조합 → 전신 8유형 매핑 필요(서비스구조-뼈대 §6).
   */
  function mapToBodyType(card) {
    var u = card.upper || {}, l = card.lower || {};
    var shoulder = u.shoulder && u.shoulder.width; // 넓음/보통/좁음
    var drop = l.waist_hip_drop;                   // 큼/보통/작음
    var belly = u.belly;                           // 여유필요/표준
    if (shoulder === "넓음" && drop !== "큼") return "INV"; // 어깨넓고 힙좁음 = V라인
    if (shoulder !== "넓음" && drop === "큼") return "TRI"; // 어깨좁고 하체볼륨 = A라인
    if (drop === "큼" && shoulder === "넓음") return "HRG"; // 균형+허리잘록 = X라인
    if (belly === "여유필요") return "DIA";                 // 중동 볼륨 = 다이아
    if (u.chest_ease === "표준" && !drop) return "STR";     // 직선
    return "BAL";                                          // 기본 = 밸런스
  }

  /** 신뢰도 티어: 0벌 low / 1벌 mid / 2벌+ high (screens.md 신뢰도 3단계). */
  function tierOf(n) { return n <= 0 ? "low" : n === 1 ? "mid" : "high"; }

  /**
   * [스텁] 회귀 체형(키·몸무게 → 부위 백분위) → 8유형 code (0벌 저신뢰 카드용).
   * ⚠️ 키·몸무게만으론 V/A/X(어깨·힙 실루엣) 구분이 불가 — 부위 백분위 차는 사실상 BMI를
   *    재인코딩할 뿐이다. 그래서 여기선 **볼륨(BMI) 축**만 정직하게 매핑한다:
   *    가는 일자(TUB) → 직선(STR) → 밸런스(BAL) → 둥근(RND).
   *    V/A/X/다이아는 착용경험(fit 신호)이 있어야 나오며 mapToBodyType가 담당한다.
   *   pct = { shoulder, chest, waist, hip }  (0~100, 성별 내 백분위)
   */
  function bodyTypeFromMeasure(pct) {
    pct = pct || {};
    var vals = [pct.shoulder, pct.chest, pct.waist, pct.hip].filter(function (v) { return v != null; });
    if (vals.length < 2) return null; // 데이터 부족 → 호출측 폴백
    var overall = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length; // ≈ BMI 백분위
    if (overall >= 80) return "RND";  // 볼륨 큼 = 부드러운 둥근
    if (overall >= 55) return "BAL";  // 표준
    if (overall >= 32) return "STR";  // 슬림·직선
    return "TUB";                     // 매우 슬림 = 가는 일자
  }

  /**
   * [목업] 착용경험 fits → 체형카드 upper/lower 요약.
   * 실엔진은 여유(ease)=의류실측−인체 역산으로 채운다(reverse-inference §2~3). 여기선 신호를 직역.
   */
  function buildCard(input) {
    var exps = input.experiences || [];
    var byCat = function (cat) { return exps.filter(function (e) { return e.category === cat; }); };
    var tops = byCat("TOP"), bottoms = byCat("BOTTOM");

    // 대표 신호 뽑기(여러 벌이면 마지막 값 — 목업). 실제는 교차검증·평균.
    function pick(list, layer, key) {
      for (var i = list.length - 1; i >= 0; i--) {
        var v = list[i][layer] && list[i][layer][key];
        if (v) return v;
      }
      return null;
    }
    var upper = tops.length ? {
      shoulder: { width: pick(tops, "fits", "shoulder") === "BIG" ? "넓음" : "보통", slope: "보통" },
      chest_ease: "표준",
      belly: pick(tops, "fits", "belly") === "TIGHT" ? "여유필요" : "표준",
      armhole_need: pick(tops, "painFlags", "arm") === "TIGHT" ? "큼" : "보통",
      arm_length: "표준",
      confidence: tops.length >= 2 ? 0.82 : 0.6
    } : null;
    var lower = bottoms.length ? {
      waist_hip_drop: pick(bottoms, "fits", "hip") === "TIGHT" ? "큼" : "보통",
      thigh: pick(bottoms, "fits", "thigh") === "TIGHT" ? "발달" : "표준",
      front_rise: null,
      back_rise_need: "보통",
      confidence: bottoms.length >= 2 ? 0.78 : 0.58
    } : null;

    return {
      card_id: "mock-card",
      effective_date: input.effectiveDate || null, // 스냅샷 레벨에서 태그(원칙 7). 호출자가 주입.
      weight_version: (input.basic && input.basic.weightKg) || null,
      upper: upper,
      lower: lower,
      completeness: { upper: !!upper, lower: !!lower },
      character: null // ← 실제로는 LLM 한 줄. 목업은 UI에서 유형 프로필로 대체.
    };
  }

  /**
   * [목업] 브랜드별 추천 사이즈. 실엔진은 A축 garmentCm × 병목 판정(reverse-inference §4~5).
   * garmentCm 시드가 비어있어(모듈화 §3) 지금은 canned. 값=placeholder.
   */
  function buildRecs(input) {
    var pref = (input.prefs && input.prefs.TOP) || "regular";
    var up = { skinny: -1, slim: 0, regular: 0, loose: 1, oversize: 1 }[pref] || 0;
    var base = ["S", "M", "L"];
    function shift(s) { var i = base.indexOf(s); return base[Math.max(0, Math.min(2, i + up))] || s; }
    return [
      { brandId: "uniqlo", brandName: "유니클로", category: "TOP", size: shift("M"), confidence: 0.8, bottleneck: "가슴", warnings: [] },
      { brandId: "cos", brandName: "COS", category: "TOP", size: shift("S"), confidence: 0.7, bottleneck: "어깨", warnings: ["여유 빠듯할 수 있어요"] },
      { brandId: "zara", brandName: "ZARA", category: "TOP", size: shift("L"), confidence: 0.62, bottleneck: "품", warnings: ["유럽핏 편차 큼"] }
    ];
  }

  /** 엔진 계약 진입점. */
  function diagnose(input) {
    input = input || {};
    var card = buildCard(input);
    var recs = buildRecs(input);
    return {
      card: card,
      recs: recs,
      confidenceTier: tierOf((input.experiences || []).length),
      bodyType: mapToBodyType(card) // 편의: 카드 렌더에 바로 쓰도록 동봉
    };
  }

  global.FittingEngine = {
    diagnose: diagnose,
    mapToBodyType: mapToBodyType,
    bodyTypeFromMeasure: bodyTypeFromMeasure,
    CODES: CODES,
    _isMock: true
  };
})(typeof window !== "undefined" ? window : this);
