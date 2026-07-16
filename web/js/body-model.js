/* ==========================================================================
   body-model.js — 0벌 기초신체 추정기 (첫 실(實)엔진 조각)
   ---
   docs/6_사이즈엔진.md §1.6. 착용경험이 없을 때 (성별·키·몸무게·나이)만으로
   부위 cm를 회귀식으로 추정한다. 목업이 아니라 사이즈코리아 8차 실측 기반 실계산.

     부위 cm = a·키 + b·몸무게 + c·나이 + intercept        (body-base-model.json)
     백분위 = 그 값이 모집단 어디쯤인지                    (body-distribution.json)

   출처: 국가기술표준원 사이즈코리아 제8차(2020~24). 데이터=web/data/*.json.
   한계: 0벌 기본값(부위당 ±rmse). 착용경험 역산이 그 위를 덮어써 좁히는 게 목표(§3-[2]).
   ========================================================================== */
(function (global) {
  "use strict";

  var BASE = null, DIST = null;

  /** web/data의 시드 JSON을 한 번 로드(서버·Vercel에서 fetch). file://면 실패→호출부가 폴백. */
  function load() {
    if (BASE && DIST) return Promise.resolve(true);
    return Promise.all([
      fetch("data/body-base-model.json").then(function (r) { return r.json(); }),
      fetch("data/body-distribution.json").then(function (r) { return r.json(); })
    ]).then(function (a) { BASE = a[0]; DIST = a[1]; return true; });
  }

  /** 서버(node) 주입 — fetch 없이 시드 JSON을 직접 넣는다. /api에서 require로 로드. */
  function seed(base, dist) { BASE = base; DIST = dist; return true; }

  /** '173cm 이하'·'72kg'·'200cm 이상' → 숫자. 첫 정수/실수만 뽑는다. */
  function num(s) {
    if (typeof s === "number") return s;
    var m = String(s || "").match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : NaN;
  }

  /** '20대'→25, '10대'→15, '60대 이상'→65. 연령대를 대표 나이(중앙)로. */
  function ageYears(s) {
    if (typeof s === "number") return s;
    var d = num(s);
    return isNaN(d) ? 30 : d + 5; // 20대=20~29의 대략 중앙 ≈ 25
  }

  /** 표준정규 CDF(Abramowitz–Stegun 근사) → 백분위(%). */
  function pctFromZ(z) {
    var t = 1 / (1 + 0.2316419 * Math.abs(z));
    var d = 0.3989423 * Math.exp(-z * z / 2);
    var p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    p = z > 0 ? 1 - p : p;
    return Math.max(1, Math.min(99, Math.round(p * 100)));
  }

  /** 사용자에게 보여줄 핵심 부위(라벨은 쉬운 말). base-model 키 → 표시명. */
  var SHOW = [
    { key: "chestFull", name: "가슴둘레" },
    { key: "waist",     name: "허리둘레" },
    { key: "hip",       name: "엉덩이둘레" },
    { key: "shoulder",  name: "어깨너비" },
    { key: "arm",       name: "팔길이" },
    { key: "upperArm",  name: "위팔둘레" }
  ];

  /**
   * 회귀 추정. basic={gender,age,height,weight} (문자열 허용).
   * → { ready, sex, input:{h,w,age}, parts:[{key,name,cm,rmse,pct,r2}] }
   */
  function estimate(basic) {
    basic = basic || {};
    var sex = basic.gender === "male" ? "male" : "female";
    var h = num(basic.height), w = num(basic.weight), a = ageYears(basic.age);
    if (!BASE || isNaN(h) || isNaN(w)) return { ready: false };

    var coef = BASE[sex] || {}, dist = (DIST && DIST[sex]) || {};
    var parts = SHOW.map(function (s) {
      var c = coef[s.key]; if (!c) return null;
      var cm = c.a_height * h + c.b_weight * w + c.c_age * a + c.intercept;
      var out = { key: s.key, name: s.name, cm: Math.round(cm * 10) / 10, rmse: c.rmse_cm, r2: c.r2, pct: null };
      var dp = dist[s.key];
      if (dp && dp.sd) out.pct = pctFromZ((cm - dp.mean) / dp.sd);
      return out;
    }).filter(Boolean);

    return { ready: true, sex: sex, input: { h: h, w: w, age: a }, parts: parts };
  }

  // 임의 cm → 성별 내 백분위(%). 착용경험 역산으로 덮어쓴 부위의 측정 표시에 사용.
  function pctOf(sex, key, cm) {
    var dp = ((DIST && DIST[sex]) || {})[key];
    if (!dp || !dp.sd || cm == null) return null;
    return pctFromZ((cm - dp.mean) / dp.sd);
  }

  global.BodyModel = { load: load, seed: seed, estimate: estimate, pctOf: pctOf, _num: num, _age: ageYears };
})(typeof window !== "undefined" ? window : this);
