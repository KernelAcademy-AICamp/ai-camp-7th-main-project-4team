/* demo-session.js — 데모 사용자 '김도현(진단 완료)' 세션 시드.
   왜: My·프로필·결과카드는 index.js의 하드코딩 페르소나 USER(김도현·STR)를 쓰는데,
       Fit(judge)·result는 실제 세션(fitting.basic/dx)을 읽어서 '진단 안 한 사용자'로 보였다.
       두 화면에도 같은 김도현을 심어 하나의 사용자로 통일한다.
   안전: 이미 세션에 진단 데이터가 있으면(=진짜 진단 플로우 진행 중) 손대지 않는다(없을 때만 시드).
   USER(index.js:201)와 값이 일치해야 한다 — 페르소나 바꾸면 여기도 같이 바꿀 것. */
(function () {
  // ★ proto(데모)에서만 시드한다. api 모드에서 심으면 result.js가 그 목업을 /api/diagnose로
  //   전송해 **실제 DB에 가짜 진단 행이 쌓인다**(킬메트릭인 진단 수까지 오염). 실제로 그렇게 됐고,
  //   탈퇴 후에도 '진단 기록이 되살아난 것처럼' 보이던 원인이었다(매번 새로 심겨 새로 저장된 것).
  //   api에서 진단을 안 한 사용자는 정직하게 '진단 없음'으로 보여야 한다.
  if (window.FDATA ? window.FDATA.mode === "api" : window.FITTING_MODE === "api") return;

  // age는 '30대' 같은 **연령대 문자열**이다(diag-basic.js AGE = index.js AGE_BANDS).
  // 예전엔 숫자 33을 심어, 연령대로 바뀐 뒤에도 프로필·내려받기에 '연령대 33'으로 새어 나왔다.
  var BASIC = { gender: "male", age: "30대", height: 172, weight: 68 };   // = index.js USER
  try {
    if (!sessionStorage.getItem("fitting.basic")) {
      sessionStorage.setItem("fitting.basic", JSON.stringify(BASIC));
    }
    if (!sessionStorage.getItem("fitting.dx")) {
      sessionStorage.setItem("fitting.dx", JSON.stringify({ basic: BASIC, prefs: {}, experiences: [] }));
    }
  } catch (e) {}
})();
