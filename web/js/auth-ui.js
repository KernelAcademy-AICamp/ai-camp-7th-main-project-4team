/* web/js/auth-ui.js — 소비자 로그인 UI 공용 컴포넌트 (index 바텀시트 · result 모달).
   필요: auth.js(FITAUTH) + config.js. 껍데기(시트를 열고 닫기·모달 조립)는 호스트가 맡고,
   provider 목록 · 이메일 매직링크 2단계 · 성공/실패 문구는 전부 여기가 소유한다.
   두 화면이 각자 그리면 provider 목록·문구·에러 처리가 갈라진다(실제로 갈라졌었다).

   호스트가 쓰는 것:
     FITAUTHUI.render(el, {
       onMock:            function(){}  // 계정OFF(proto 데모) — 실제 인증 대신 목업 로그인 처리
       onBeforeRedirect:  function(){}  // OAuth·매직링크로 이 페이지를 떠나기 직전(의도 저장용)
     })
   ※ 로그인 성공 처리는 여기서 하지 않는다 — 리다이렉트로 페이지가 새로 뜨므로,
     복귀 후 FITAUTH.onChange('SIGNED_IN')를 듣는 호스트 쪽 책임이다. */
(function (w) {
  "use strict";

  // 활성 provider. 네이버는 Supabase 미지원 — 목록에 두되 누르면 '준비 중'(있는 척 X, 없는 척도 X).
  var PROVIDERS = [
    { id: 'kakao',  label: '카카오로 계속하기' },
    { id: 'naver',  label: '네이버로 계속하기' },
    { id: 'google', label: 'Google로 계속하기' },
    { id: 'email',  label: '이메일로 계속하기' }
  ];
  var HINT = '비밀번호 없이, 메일로 받은 링크로 로그인해요';
  var MAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  // 계정ON = api 모드 + 플래그 + auth 클라 준비. 아니면 전부 목업 경로(proto 데모).
  function live() {
    return !!(w.FDATA && w.FDATA.mode === 'api' && w.ACCOUNTS_ENABLED && w.FITAUTH && w.FITAUTH.ready());
  }

  function render(el, opts) {
    if (!el) return;
    opts = opts || {};
    el.classList.add('authui');
    el.innerHTML =
      '<div class="authui-step" data-step="pick">' +
        PROVIDERS.map(function (p) {
          return '<button type="button" class="authui-btn ' + p.id + '" data-p="' + p.id + '">' + p.label + '</button>';
        }).join('') +
      '</div>' +
      '<div class="authui-step" data-step="email" hidden>' +
        '<input class="authui-inp" type="email" inputmode="email" autocomplete="email"' +
          ' placeholder="you@example.com" aria-label="로그인 링크를 받을 이메일">' +
        '<p class="authui-msg" role="status" aria-live="polite">' + HINT + '</p>' +
        '<button type="button" class="authui-btn email" data-act="send">로그인 링크 보내기</button>' +
        '<button type="button" class="authui-back" data-act="back">다른 방법으로 로그인</button>' +
      '</div>' +
      /* 동의 고지 — 여기선 '무엇에 동의하는지'와 그 문서로 가는 길만 준다.
         탈퇴·보관 처리 같은 세부는 문서(처리방침 §3·약관 제4조의2)와 실제 탈퇴 확인 시점에 있다.
         가입하려는 순간에 탈퇴 이야기를 먼저 꺼내면 필요 없는 경계심만 만든다. */
      /* 연령 확인은 여기(개인정보를 실제로 수집하기 시작하는 시점) — 비로그인 진단은 수집이 없어 물을 이유가 없다.
         별도 체크박스로 마찰을 만들지 않고 동의 고지 한 줄에 얹는다. */
      (live() ? '<p class="authui-notice">가입하면 <b>만 14세 이상</b>이며 <a href="terms.html">이용약관</a>·<a href="privacy.html">개인정보 처리방침</a>에 동의하는 것으로 봐요</p>' : '');

    var pick = el.querySelector('[data-step="pick"]'),
        mail = el.querySelector('[data-step="email"]'),
        input = el.querySelector('.authui-inp'),
        msg = el.querySelector('.authui-msg'),
        send = el.querySelector('[data-act="send"]');

    function say(text, kind) { msg.textContent = text; msg.className = 'authui-msg' + (kind ? ' ' + kind : ''); }
    function step(toEmail) {
      pick.hidden = !!toEmail; mail.hidden = !toEmail;
      say(HINT, ''); send.disabled = false; send.textContent = '로그인 링크 보내기';
      if (toEmail) setTimeout(function () { input.focus(); }, 60);
    }
    function leaving() { try { if (opts.onBeforeRedirect) opts.onBeforeRedirect(); } catch (e) {} }

    el.addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('button') : null;
      if (!b || !el.contains(b)) return;
      var p = b.getAttribute('data-p'), act = b.getAttribute('data-act');

      if (act === 'back') { step(false); return; }
      if (act === 'send') { sendMagic(); return; }
      if (!p) return;

      if (!live()) { if (opts.onMock) opts.onMock(); return; }   // proto/플래그off = 목업 로그인
      if (p === 'email')  { step(true); return; }
      if (p === 'naver')  { step(false); say('네이버는 준비 중이에요 · 다른 방법으로 로그인해 주세요', 'err'); return; }
      leaving();
      if (p === 'kakao')  { w.FITAUTH.signInKakao(); return; }
      if (p === 'google') { w.FITAUTH.signInGoogle(); return; }
    });

    input.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') sendMagic(); });

    function sendMagic() {
      var em = (input.value || '').trim();
      if (!MAIL_RE.test(em)) { say('이메일 주소를 다시 확인해 주세요', 'err'); input.focus(); return; }
      if (!live()) { if (opts.onMock) opts.onMock(); return; }
      leaving();
      send.disabled = true; send.textContent = '보내는 중…';
      say('전송 중이에요…', '');
      w.FITAUTH.signInEmail(em).then(function (r) {
        send.disabled = false; send.textContent = '다시 보내기';
        if (r && r.ok) { say(em + ' 로 링크를 보냈어요 · 메일함(스팸함)을 확인해 주세요', 'ok'); return; }
        try { console.error('[fitting] signInEmail 실패:', r && r.error); } catch (e) {}
        say('전송 실패 · ' + ((r && r.error) || '알 수 없는 오류'), 'err');   // 원인을 삼키지 않고 그대로 노출
      });
    }

    step(false);   // 항상 provider 목록부터
  }

  /* 바텀시트로 열기 — index·result 공통 진입점. 껍데기(스크림·시트·제목)까지 여기가 소유해
     두 페이지가 문자 그대로 같은 화면을 쓴다. opts에 title·desc를 넘겨 맥락만 갈아끼운다. */
  var _sheet = null, _scrim = null, _onEsc = null;
  function openSheet(opts) {
    opts = opts || {};
    closeSheet();
    _scrim = document.createElement('div'); _scrim.className = 'authui-scrim';
    _sheet = document.createElement('div'); _sheet.className = 'authui-sheet';
    _sheet.setAttribute('role', 'dialog'); _sheet.setAttribute('aria-modal', 'true');
    _sheet.setAttribute('aria-label', opts.title || '로그인');
    _sheet.innerHTML = '<div class="authui-grip"></div>' +
      '<h3 class="authui-title"></h3>' +
      '<p class="authui-desc"></p>' +
      '<div class="authui-body"></div>';
    _sheet.querySelector('.authui-title').textContent = opts.title || '로그인하고 이어가기';
    var d = _sheet.querySelector('.authui-desc');
    if (opts.desc) d.textContent = opts.desc; else d.remove();
    document.body.appendChild(_scrim); document.body.appendChild(_sheet);
    render(_sheet.querySelector('.authui-body'), opts);
    _scrim.addEventListener('click', closeSheet);
    _onEsc = function (ev) { if (ev.key === 'Escape') closeSheet(); };
    document.addEventListener('keydown', _onEsc);
    // 붙인 뒤 한 프레임 뒤에 .on — 붙자마자 켜면 transform 전환이 안 걸려 뚝 나타난다.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { if (_scrim) _scrim.classList.add('on'); if (_sheet) _sheet.classList.add('on'); });
    });
  }
  function closeSheet() {
    if (_onEsc) { document.removeEventListener('keydown', _onEsc); _onEsc = null; }
    var s = _sheet, c = _scrim; _sheet = null; _scrim = null;
    if (!s && !c) return;
    if (s) s.classList.remove('on');
    if (c) c.classList.remove('on');
    setTimeout(function () { if (s) s.remove(); if (c) c.remove(); }, 320);   // 전환 끝난 뒤 제거
  }

  w.FITAUTHUI = { render: render, live: live, openSheet: openSheet, closeSheet: closeSheet };
})(window);
