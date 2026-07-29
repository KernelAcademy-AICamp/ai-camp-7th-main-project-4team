/* demo-session.js — 데모 사용자 '김도현(진단 완료)' 세션 시드.
   왜: My·프로필·결과카드는 index.js의 하드코딩 페르소나 USER(김도현·STR)를 쓰는데,
       Fit(judge)·result는 실제 세션(fitting.basic/dx)을 읽어서 '진단 안 한 사용자'로 보였다.
       두 화면에도 같은 김도현을 심어 하나의 사용자로 통일한다.
   안전: 이미 세션에 진단 데이터가 있으면(=진짜 진단 플로우 진행 중) 손대지 않는다(없을 때만 시드).
   USER(index.js:201)와 값이 일치해야 한다 — 페르소나 바꾸면 여기도 같이 바꿀 것. */
(function () {
  var SEED = "fitting.demoSeed";   // 내가 심은 값이라는 표식 — 진짜 진단과 구분하는 유일한 근거
  var isApi = window.FDATA ? window.FDATA.mode === "api" : window.FITTING_MODE === "api";

  // ★ proto(데모)에서만 시드한다. api 모드에서 심으면 result.js가 그 목업을 /api/diagnose로
  //   전송해 **실제 DB에 가짜 진단 행이 쌓인다**(킬메트릭인 진단 수까지 오염).
  //   ※ '안 심는다'만으로는 부족했다. 같은 탭이 앞서 proto로 열렸으면 시드가 sessionStorage에
  //     남아 있고, api로 전환해도 result.js는 basic만 보고 진짜 진단으로 취급해 그대로 POST한다.
  //     실제로 그 경로로 DB에 가짜 12건이 들어갔고, 로그인 시 claim으로 계정에까지 귀속됐다.
  //     그래서 api에서는 **내가 남긴 흔적을 치우고** 시작한다. 표식이 없으면 남의 데이터이므로 안 건드린다.
  if (isApi) {
    try {
      if (sessionStorage.getItem(SEED)) {
        ["fitting.basic", "fitting.dx", "fitting.dxtype", "fitting.dxRun", "fitting.done", SEED]
          .forEach(function (k) { sessionStorage.removeItem(k); });
      }
    } catch (e) {}
    return;
  }

  // age는 '30대' 같은 **연령대 문자열**이다(diag-basic.js AGE = index.js AGE_BANDS).
  // 예전엔 숫자 33을 심어, 연령대로 바뀐 뒤에도 프로필·내려받기에 '연령대 33'으로 새어 나왔다.
  var BASIC = { gender: "male", age: "30대", height: 172, weight: 68 };   // = index.js USER
  try {
    var seeded = false;
    if (!sessionStorage.getItem("fitting.basic")) {
      sessionStorage.setItem("fitting.basic", JSON.stringify(BASIC)); seeded = true;
    }
    if (!sessionStorage.getItem("fitting.dx")) {
      sessionStorage.setItem("fitting.dx", JSON.stringify({ basic: BASIC, prefs: {}, experiences: [] })); seeded = true;
    }
    if (seeded) sessionStorage.setItem(SEED, "1");
  } catch (e) {}
})();
