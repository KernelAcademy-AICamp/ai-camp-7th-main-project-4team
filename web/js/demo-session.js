/* demo-session.js — 데모 사용자 '김도현(진단 완료)' 세션 시드.
   왜: My·프로필·결과카드는 index.js의 하드코딩 페르소나 USER(김도현·STR)를 쓰는데,
       Fit(judge)·result는 실제 세션(fitting.basic/dx)을 읽어서 '진단 안 한 사용자'로 보였다.
       두 화면에도 같은 김도현을 심어 하나의 사용자로 통일한다.
   안전: 이미 세션에 진단 데이터가 있으면(=진짜 진단 플로우 진행 중) 손대지 않는다(없을 때만 시드).
   USER(index.js:201)와 값이 일치해야 한다 — 페르소나 바꾸면 여기도 같이 바꿀 것. */
(function () {
  var BASIC = { gender: "male", age: 33, height: 172, weight: 68 };   // = index.js USER
  try {
    if (!sessionStorage.getItem("fitting.basic")) {
      sessionStorage.setItem("fitting.basic", JSON.stringify(BASIC));
    }
    if (!sessionStorage.getItem("fitting.dx")) {
      sessionStorage.setItem("fitting.dx", JSON.stringify({ basic: BASIC, prefs: {}, experiences: [] }));
    }
  } catch (e) {}
})();
