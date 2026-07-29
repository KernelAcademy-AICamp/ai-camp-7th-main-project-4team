/* admin-login.js — 관리자 로그인.
   실배선: ADMINAUTH(Supabase Google OAuth) 준비되면 실 인증.
   폴백: supabase-js/config 미로드 시 기존 목업(2FA) 흐름 유지(로컬·오프라인).
   ※ 진짜 방어는 DB RLS. 로그인은 세션 JWT 확보(대시보드 읽기용) + UX 게이트. */
(function () {
  "use strict";
  var A = window.ADMINAUTH, real = A && A.ready();

  function bridge(email) { try { sessionStorage.setItem('fitting.admin', JSON.stringify({ email: email, method: real ? 'supabase-google' : 'mock', at: new Date().toISOString() })); } catch (e) {} }
  function hint(msg, err) { var h = document.querySelector('#step-google .ahint'); if (h) { h.textContent = msg; if (err) h.style.color = 'var(--warn, #b0553f)'; } }

  if (real) {
    // OAuth 복귀/기존 세션 처리
    (async function () {
      var s = await A.getSession();
      if (!s) return;                       // 세션 없음 → 버튼 대기
      var ok = await A.isAdmin();
      if (!ok && A.claimAdmin) { if (await A.claimAdmin()) ok = true; }   // 초대목록에 있으면 자동 승격 [db/07]
      if (ok) { bridge(s.user.email); location.replace('admin.html'); return; }
      // 로그인은 됐으나 관리자 아님(초대도 없음) → 안내 + 로그아웃
      hint('이 계정(' + (s.user.email || '') + ')은 관리자 권한이 없어요. 기존 관리자에게 초대를 요청하세요.', true);
      await A.signOut();
    })();

    window.startGoogle = function () { A.signInGoogle(location.href); };   // 실 OAuth 리다이렉트
    window.backToGoogle = function () {};
    window.verifyOtp = function () {};
    return;
  }

  // ── 폴백: 목업(프로토타입) 흐름 ─────────────────────────────
  try { if (JSON.parse(sessionStorage.getItem('fitting.admin') || 'null')) { location.replace('admin.html'); return; } } catch (e) {}
  var DEMO_EMAIL = 'admin@fitting.kr';
  window.startGoogle = function () {
    document.getElementById('step-google').classList.remove('on');
    document.getElementById('step-otp').classList.add('on');
    var em = document.getElementById('otpEmail'); if (em) em.textContent = DEMO_EMAIL;
    var el = document.getElementById('otp'); if (el) { el.value = ''; el.focus(); }
  };
  window.backToGoogle = function () {
    document.getElementById('step-otp').classList.remove('on');
    document.getElementById('step-google').classList.add('on');
    var e = document.getElementById('otpErr'); if (e) e.textContent = '';
  };
  var otp = document.getElementById('otp'), btn = document.getElementById('verifyBtn');
  if (otp) {
    otp.addEventListener('input', function () { otp.value = otp.value.replace(/\D/g, '').slice(0, 6); btn.disabled = otp.value.length !== 6; document.getElementById('otpErr').textContent = ''; });
    otp.addEventListener('keydown', function (e) { if (e.key === 'Enter' && otp.value.length === 6) verifyOtp(); });
  }
  window.verifyOtp = function () {
    var code = (document.getElementById('otp').value || '').trim();
    if (code.length !== 6) { document.getElementById('otpErr').textContent = '6자리를 입력해 주세요.'; return; }
    try { sessionStorage.setItem('fitting.admin', JSON.stringify({ email: DEMO_EMAIL, method: 'google+email-otp(mock)', at: new Date().toISOString() })); } catch (e) {}
    location.replace('admin.html');
  };
})();
