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
    try{ sessionStorage.removeItem('fitting.admin'); }catch(e){}
    location.replace('admin-login.html');
  };
})();
