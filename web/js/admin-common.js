/* admin-common.js — 관리자 공용: 로그인 가드 + 로그아웃 + 사용자 표시.
   모든 admin*.html이 로드. ⚠️ 목업 세션(sessionStorage 'fitting.admin') — 실서비스는 서버 세션. */
(function(){
  "use strict";
  var s=null;
  try{ s=JSON.parse(sessionStorage.getItem('fitting.admin')||'null'); }catch(e){}
  if(!s){ location.replace('admin-login.html'); return; }   // 미로그인 → 로그인으로
  document.addEventListener('DOMContentLoaded',function(){
    var who=document.getElementById('adminWho'); if(who) who.textContent=s.email||'admin';
    // MVP 범위 메뉴만 노출 — 사이즈·데이터(+하위: 실측표·브랜드·수집·엔진) + 진단·정확도(킬메트릭).
    // 나머지(회원·거래·사업현황·B2B API·내부운영)는 v2라 숨김. admin-diagnostics는 네비에 없어 추가.
    // MVP 측정 2축: 진단 정확도(킬메트릭) + 전문가 수요(lead). + 데이터 콘솔(사이즈·데이터).
    var MVP={'admin.html':1,'admin-diagnostics.html':1,'admin-leads.html':1,'admin-improve.html':1};
    var sizePages={'admin.html':1,'admin-brands.html':1,'admin-collect.html':1,'admin-engine.html':1,'admin-garments.html':1};
    var EXTRA=[['admin-diagnostics.html','진단·정확도'],['admin-improve.html','엔진 강화'],['admin-leads.html','전문가 수요']];   // 네비 마크업에 없어 주입
    var nav=document.querySelector('.asecs');
    if(nav){
      [].forEach.call(nav.querySelectorAll('a'),function(a){
        var href=(a.getAttribute('href')||'').split('/').pop();
        if(!MVP[href]) a.style.display='none';
      });
      EXTRA.forEach(function(e){ if(!nav.querySelector('a[href="'+e[0]+'"]')){ var a=document.createElement('a'); a.className='s'; a.href=e[0]; a.textContent=e[1]; nav.appendChild(a); } });
      var cur=(location.pathname.split('/').pop()||'admin.html');
      [].forEach.call(nav.querySelectorAll('a'),function(a){
        var href=(a.getAttribute('href')||'').split('/').pop();
        a.classList.toggle('on', href===cur || (href==='admin.html'&&sizePages[cur]));
      });
    }
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
