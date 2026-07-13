/* admin-login.js — 관리자 로그인(목업). ⚠️ 실제 인증 아님(프로토타입).
   실서비스 승격 시: startGoogle → supabase.auth.signInWithOAuth({provider:'google'}),
   verifyOtp → 서버(Edge Function)가 발송·검증하는 이메일 OTP. 지금은 UX/플로우 목업. */
(function(){
  "use strict";
  // 이미 로그인(목업 세션)돼 있으면 콘솔로
  try{ if(JSON.parse(sessionStorage.getItem('fitting.admin')||'null')){ location.replace('admin.html'); return; } }catch(e){}

  var DEMO_EMAIL='admin@fitting.kr';   // 목업 계정(구글 로그인 자리)

  window.startGoogle=function(){
    // 실제로는 여기서 Google OAuth 리다이렉트. 목업은 바로 2FA 단계로.
    document.getElementById('step-google').classList.remove('on');
    document.getElementById('step-otp').classList.add('on');
    document.getElementById('otpEmail').textContent=DEMO_EMAIL;
    var el=document.getElementById('otp'); el.value=''; el.focus();
  };
  window.backToGoogle=function(){
    document.getElementById('step-otp').classList.remove('on');
    document.getElementById('step-google').classList.add('on');
    document.getElementById('otpErr').textContent='';
  };

  var otp=document.getElementById('otp'), btn=document.getElementById('verifyBtn');
  if(otp){
    otp.addEventListener('input',function(){
      otp.value=otp.value.replace(/\D/g,'').slice(0,6);          // 숫자 6자리만
      btn.disabled=otp.value.length!==6;
      document.getElementById('otpErr').textContent='';
    });
    otp.addEventListener('keydown',function(e){ if(e.key==='Enter'&&otp.value.length===6) verifyOtp(); });
  }

  window.verifyOtp=function(){
    var code=(document.getElementById('otp').value||'').trim();
    if(code.length!==6){ document.getElementById('otpErr').textContent='6자리를 입력해 주세요.'; return; }
    // 목업 검증: 데모 코드 000000 또는 아무 6자리 허용(프로토타입). 실서비스는 서버 검증.
    var session={ email:DEMO_EMAIL, method:'google+email-otp(mock)', at:new Date().toISOString() };
    try{ sessionStorage.setItem('fitting.admin', JSON.stringify(session)); }catch(e){}
    location.replace('admin.html');
  };
})();
