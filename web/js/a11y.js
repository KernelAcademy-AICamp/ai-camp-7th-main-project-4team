/* a11y.js — 클릭만 되는 요소를 키보드로도 쓰게 만드는 공용 보정. 소유: 개발자(web/js/**).

   배경: onclick이 달린 div/span이 화면 전체에 149곳인데 tabindex·role은 0곳이었다.
        마우스 없이는 진단 성별 선택도, 관리자 탭 전환도, 로그아웃도 못 한다.
   방식: 디자이너 소유 마크업을 149곳 고치는 대신 런타임에 보정한다.
        ① 네이티브 대화형이 아닌데 onclick이 달린 요소 → tabindex=0 · role=button 부여
        ② Enter/Space → click 위임(Space는 페이지 스크롤 방지)
        ③ 나중에 렌더되는 요소(관리자 표 등)도 MutationObserver로 같은 보정
   원칙: 이미 tabindex나 role이 지정된 요소는 손대지 않는다 — 의도된 의미(tab·checkbox 등)를
        button으로 덮어쓰면 스크린리더에 더 나쁘다. 그런 요소는 마크업에서 다뤄야 한다.
   한계: 의미가 '버튼'이 아닌 것(탭·체크박스)의 정확한 role, <label> 연결은 마크업 몫. */
(function () {
  "use strict";

  // 이미 키보드로 조작 가능한 네이티브 요소 — 브라우저 기본 동작을 건드리지 않는다.
  var NATIVE = 'button,a[href],input,select,textarea,summary,label,[contenteditable="true"]';

  function isNative(el) {
    return !!(el.matches && el.matches(NATIVE));
  }

  function needsFix(el) {
    if (!el || el.nodeType !== 1 || !el.hasAttribute) return false;
    if (!el.hasAttribute('onclick')) return false;
    if (isNative(el)) return false;
    if (el.hasAttribute('tabindex') || el.hasAttribute('role')) return false;   // 의도된 지정 존중
    if (el.closest && el.closest('[aria-hidden="true"]')) return false;
    return true;
  }

  function mark(el) {
    if (!needsFix(el)) return;
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
  }

  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    var list = root.querySelectorAll('[onclick]');
    for (var i = 0; i < list.length; i++) mark(list[i]);
  }

  // Enter/Space 활성화 — 위임 하나로 정적·동적 요소를 모두 덮는다.
  //   onclick 속성이 없어도 role만 맞으면 활성화한다(판정 캡처 존처럼 JS 위임으로 클릭을 받는 경우).
  var ACTIVATABLE = { button: 1, tab: 1, switch: 1, checkbox: 1 };
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
    var el = e.target;
    if (!el || el.nodeType !== 1 || isNative(el)) return;
    if (!ACTIVATABLE[el.getAttribute('role')]) return;
    if (el.hasAttribute('data-a11y-manual')) return;   // 자체 키보드 처리를 하는 요소는 제외
    e.preventDefault();                                 // Space 스크롤 방지
    if (typeof el.click === 'function') el.click();
  });

  // 탭 선택 상태(aria-selected)를 클릭/키보드 활성화에 맞춰 갱신.
  //   각 화면의 탭 전환 JS는 클래스만 바꾸므로, 스크린리더가 읽는 상태는 여기서 한 번에 맞춘다.
  document.addEventListener('click', function (e) {
    var tab = e.target && e.target.closest && e.target.closest('[role="tab"]');
    if (!tab) return;
    var list = tab.closest('[role="tablist"]');
    var peers = list ? list.querySelectorAll('[role="tab"]') : [tab];
    for (var i = 0; i < peers.length; i++) peers[i].setAttribute('aria-selected', peers[i] === tab ? 'true' : 'false');
  }, true);

  function boot() {
    scan(document);
    if (!window.MutationObserver) return;
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var added = muts[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var n = added[j];
          if (!n || n.nodeType !== 1) continue;
          mark(n);        // 추가된 노드 자신
          scan(n);         // 그 안쪽
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
