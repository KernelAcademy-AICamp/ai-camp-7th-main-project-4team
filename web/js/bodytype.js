/* ==========================================================================
   bodytype.js — 8유형 체형 분류기 (역산/추정 몸 → 8유형 코드)
   ---
   docs/6_사이즈엔진.md §6 "8유형↔엔진 매핑"의 실구현. engine-mock의 스텁 대체.
   방법: 국가표준 KS K 0050(남)·K 0051(여) 드롭치 분류 + 사이즈코리아 8차
         로우데이터(6,106명) 백분위로 절단값 확정(둘이 서로 일치 확인).
     · BW드롭 = 가슴(남)/젖가슴(여) − 허리   → 허리 잘록도
     · HB드롭 = 엉덩이 − 젖가슴               → 상하 밸런스
     · BMI(키·몸무게)                        → 볼륨(둥근/튜브/배볼륨)
   8유형: STR사각 · TRI삼각 · INV역삼각 · HRG모래시계 · BAL표준 · DIA다이아 · RND둥근 · TUB튜브
   ---
   ⚠️ 절단값은 로우데이터 분위수 기반 초기값 — 실사용 피드백으로 튜닝(킬 메트릭).
   node·브라우저 공용(global = window|module.exports).
   ========================================================================== */
(function (global) {
  "use strict";

  // 성별 절단값 — 사이즈코리아 8차 로우데이터 tertile(≈KS 확정값). bustPart=BW드롭에 쓸 부위.
  var CUT = {
    male:   { bustPart: "chestUpper", bwLo: 9.5, bwHi: 15.5, hbLo: -2.3, hbHi: 1.5, bmiRnd: 28.0, bmiTub: 20.5 },
    female: { bustPart: "chestFull",  bwLo: 7.4, bwHi: 11.1, hbLo: 2.5,  hbHi: 8.5, bmiRnd: 27.0, bmiTub: 19.5 },
  };

  var CODES = ["STR", "TRI", "INV", "HRG", "BAL", "DIA", "RND", "TUB"];

  /**
   * 8유형 분류.
   *   input: { gender('male'|'female'), heightCm, weightKg,
   *            chestFull(젖가슴둘레), chestUpper(가슴둘레), waist(허리둘레), hip(엉덩이둘레) }
   *   → 8유형 코드(string) 또는 null(데이터 부족).
   * 값은 인체 둘레(cm). 역산/회귀 어느 쪽이든 몸 치수면 됨.
   */
  function classify(input) {
    input = input || {};
    var c = CUT[input.gender];
    if (!c) return null;
    var bust = input[c.bustPart];
    if (bust == null && input.chestFull != null) bust = input.chestFull; // 폴백
    var waist = input.waist, hip = input.hip, chestFull = input.chestFull;
    if (bust == null || waist == null || hip == null || chestFull == null) return null;

    var bw = bust - waist;        // 허리 잘록도
    var hb = hip - chestFull;     // 상하 밸런스(엉덩이 − 젖가슴)

    // 볼륨 축(BMI) — 키·몸무게 있을 때만. 극단만 특수화(중간은 실루엣으로).
    if (input.heightCm && input.weightKg) {
      var bmi = input.weightKg / Math.pow(input.heightCm / 100, 2);
      if (bmi >= c.bmiRnd) return bw <= c.bwLo ? "DIA" : "RND"; // 고볼륨: 허리굵으면 배볼륨(다이아), 아니면 둥근
      if (bmi <= c.bmiTub) return "TUB";                        // 저볼륨 = 튜브
    }

    // 실루엣 축(중간 볼륨)
    if (hb >= c.hbHi) return "TRI";  // 하체 볼륨 = 삼각(A라인)
    if (hb <= c.hbLo) return "INV";  // 상체 우위 = 역삼각(V라인)
    if (bw >= c.bwHi) return "HRG";  // 허리 잘록 = 모래시계(X라인)
    if (bw <= c.bwLo) return "STR";  // 직선/굵은허리 = 사각
    return "BAL";                    // 표준
  }

  global.FitBodyType = { classify: classify, CODES: CODES, _cut: CUT };
})(typeof window !== "undefined" ? window : this);
