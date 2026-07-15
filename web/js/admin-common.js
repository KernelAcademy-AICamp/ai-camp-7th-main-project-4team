/* admin-common.js — 관리자 공용: 로그인 가드 + 로그아웃 + 사용자 표시.
   모든 admin*.html이 로드. ⚠️ 목업 세션(sessionStorage 'fitting.admin') — 실서비스는 서버 세션. */
(function(){
  "use strict";
  var s=null;
  try{ s=JSON.parse(sessionStorage.getItem('fitting.admin')||'null'); }catch(e){}
  if(!s){ location.replace('admin-login.html'); return; }   // 미로그인 → 로그인으로
  document.addEventListener('DOMContentLoaded',function(){
    var who=document.getElementById('adminWho'); if(who) who.textContent=s.email||'admin';
  });
  window.adminLogout=function(){
    try{ sessionStorage.removeItem('fitting.admin'); }catch(e){}   // 목업/브릿지 세션 정리
    var go=function(){ location.replace('admin-login.html'); };
    // 실 세션(api·Supabase 로그인)까지 종료. ADMINAUTH 있으면 signOut(서버 폐기),
    // 없는 페이지(대부분 admin*)는 로컬 sb-* 토큰을 직접 제거해 재로그인 강제.
    if(window.ADMINAUTH && ADMINAUTH.ready && ADMINAUTH.ready()){
      try{ Promise.resolve(ADMINAUTH.signOut()).then(go, go); return; }catch(e){}
    }
    try{ Object.keys(localStorage).forEach(function(k){ if(k.indexOf('sb-')===0) localStorage.removeItem(k); }); }catch(e){}
    go();
  };
})();
