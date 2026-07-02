/* ==========================================================================
   survey.js — 진단 입력(M1) · 착용경험 4층 설문 생성
   ---
   sangmin/src/lib/schema/category.ts + wearexperience.ts의 프로토타입 미러.
   부위를 하드코딩하지 않고 카테고리에서 파생한다(원칙 6). 값(value)은 스키마 상수와 동일:
     fit  = FitRating  TIGHT|SNUG|RELAXED|BIG
     flag = PainVerdict TIGHT|OK
     pref = LengthPref  SHORT|GOOD|LONG
   Phase D에서 실제 스키마(schema/*.ts) import로 대체.
   ⚠️ 기반=상의+하의(둘 다 작동). 파생(아우터·원피스·치마)은 needs 충족 시 선호핏만.
   ========================================================================== */
(function (global) {
  "use strict";

  // category.ts CATEGORY_PARTS 미러 (comparison: c=둘레, w=너비, l=길이)
  var PARTS = {
    TOP:    [["shoulder","어깨","w"],["chest","가슴","c"],["belly","배","c"],["sleeve","소매","l"],["length","총장","l"]],
    BOTTOM: [["waist","허리","c"],["hip","엉덩이","c"],["thigh","허벅지","c"],["rise","밑위","l"],["length","기장","l"]],
    OUTER:  [["shoulder","어깨","w"],["chest","가슴","c"],["sleeve","소매","l"],["length","총장","l"]],
    DRESS:  [["shoulder","어깨","w"],["chest","가슴","c"],["waist","허리","c"],["hip","엉덩이","c"],["length","총장","l"]],
    SKIRT:  [["waist","허리","c"],["hip","엉덩이","c"],["length","기장","l"]]
  };
  // category.ts PAIN_FLAGS 미러 (미표기∩페인 — A학습 전용)
  var PAIN = {
    TOP:    [["arm","팔(소매통)"],["neck","목"]],
    BOTTOM: [["calf","종아리"]],
    OUTER:  [["arm","팔(소매통)"],["neck","목/칼라"],["armhole","암홀"]],
    DRESS:  [["arm","팔"],["neck","목"],["ratio","상하 비율"]],
    SKIRT:  [["hem","밑단"]]
  };
  // 메타: 기반/파생, 채우는 영역, 필요한 영역
  var META = {
    TOP:    { kind:"base",    provides:"upper", label:"상의", active:true },
    BOTTOM: { kind:"base",    provides:"lower", label:"하의", active:true },
    OUTER:  { kind:"derived", needs:["upper"],          label:"아우터", active:false },
    DRESS:  { kind:"derived", needs:["upper","lower"],  label:"원피스", active:false },
    SKIRT:  { kind:"derived", needs:["lower"],          label:"치마",   active:false }
  };

  var FIT_OPTS    = [["TIGHT","끼임"],["SNUG","딱맞음"],["RELAXED","여유"],["BIG","큼"]];
  var PAIN_OPTS   = [["TIGHT","꼈어요"],["OK","괜찮았어요"]];
  var LENGTH_OPTS = [["SHORT","짧음"],["GOOD","딱 좋음"],["LONG","긺"]];

  var SLEEVE_CATS = ["TOP","OUTER","DRESS"], LEG_CATS = ["BOTTOM"];

  function accuracyParts(cat){ return PARTS[cat].filter(function(p){ return p[2] !== "l"; }); }
  function lengthParts(cat){ return PARTS[cat].filter(function(p){ return p[2] === "l"; }); }

  /**
   * 카테고리 → 4층 설문 그룹 (buildCategorySurvey 미러).
   * opts.sleeveType: long|short|sleeveless / opts.legLength: long|short → ②③ 조건화.
   */
  function buildSurvey(cat, opts) {
    opts = opts || {};
    var hasSleeve = SLEEVE_CATS.indexOf(cat) >= 0, hasLeg = LEG_CATS.indexOf(cat) >= 0;
    var st = opts.sleeveType || "long", lg = opts.legLength || "long";

    var fit = accuracyParts(cat).map(function(p){ return { key:p[0], label:p[1], options:FIT_OPTS, def:"SNUG" }; });

    var flag = (PAIN[cat] || [])
      .filter(function(f){ return !(f[0]==="arm" && hasSleeve && st==="sleeveless"); })
      .filter(function(f){ return !(f[0]==="calf" && hasLeg && lg==="short"); })
      .map(function(f){ return { key:f[0], label:f[1], options:PAIN_OPTS, def:"OK" }; });

    var pref = lengthParts(cat)
      .filter(function(p){ return !(p[0]==="sleeve" && hasSleeve && st!=="long"); })
      .map(function(p){ return { key:p[0], label:p[1], options:LENGTH_OPTS, def:"GOOD" }; });

    return { fit:fit, flag:flag, pref:pref }; // open(자유서술)은 UI가 항상 1행 추가
  }

  global.FittingSurvey = {
    PARTS: PARTS, META: META,
    buildSurvey: buildSurvey,
    hasSleeve: function(c){ return SLEEVE_CATS.indexOf(c)>=0; },
    hasLeg: function(c){ return LEG_CATS.indexOf(c)>=0; }
  };
})(typeof window !== "undefined" ? window : this);
