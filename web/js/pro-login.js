  /* 스타일리스트(공급자) 로그인 — 가입(pro-signup)이 무비밀번호(이메일·휴대폰 인증)라 로그인도 OTP로 통일.
     인증은 프로토타입 목업(코드 화면 표기, 실발송 아님) — 승격 시 Supabase Auth(이메일/문자 OTP). */
  function $(id){ return document.getElementById(id); }
  function toast(m){ var t=$('toast'); t.textContent=m; t.classList.add('on'); clearTimeout(window._t); window._t=setTimeout(function(){t.classList.remove('on');},2200); }
  function isEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  function isPhone(v){ return /^01[016789][-\s]?\d{3,4}[-\s]?\d{4}$/.test((v||'').trim()); }
  var sent=null, ver=false;
  function contactOk(){ var v=$('lid').value.trim(); return isEmail(v)||isPhone(v); }
  function sendCode(){
    if(!contactOk()){ toast('이메일 또는 휴대폰 번호를 확인해주세요'); return; }
    sent=''+(Math.floor(Math.random()*900000)+100000);
    $('vbox').style.display='flex'; $('ok').style.display='none'; ver=false;
    $('code').value=''; $('code').disabled=false;
    $('sendBtn').textContent='재전송';
    $('hint').textContent='데모 인증번호: '+sent+' · 실서비스는 이메일/문자로 발송돼요';
    $('code').focus(); update();
  }
  function checkCode(){
    var v=($('code').value||'').trim();
    if(v && v===sent){ ver=true; $('ok').style.display='inline'; $('code').disabled=true; $('hint').textContent=''; toast('인증이 완료됐어요'); }
    else { ver=false; toast('인증번호가 일치하지 않아요'); }
    update();
  }
  function onLid(){ ver=false; sent=null; $('vbox').style.display='none'; $('sendBtn').textContent='인증번호 받기'; update(); }
  function update(){ $('loginBtn').disabled=!(contactOk() && ver); }
  function login(){
    if(!(contactOk() && ver)){ toast('인증을 완료해주세요'); return; }
    /* 목업 로그인 — 실서비스는 세션 발급. 여기선 인증 후 포털로 진입 */
    location.href='pro.html';
  }
  document.addEventListener('keydown', function(e){ if(e.key==='Enter'){ if($('vbox').style.display==='none') sendCode(); else if(!ver) checkCode(); else login(); } });
  update();
