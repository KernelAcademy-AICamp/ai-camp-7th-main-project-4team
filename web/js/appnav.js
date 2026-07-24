/* appnav.js — 공용 크롬 단일 컴포넌트: 상단 내비 + 하단 푸터 + 인증 상태.
   index.html 헤더(index.js applyAuthUI)·푸터(.site-foot)와 '동일 규칙'을 재현한다(파편화 해소 1단계).
   마운트: <div id="appnav" data-active="fit">(헤더) · <div id="appfoot">(푸터). 스타일=appnav.css.
   링크는 href(멀티페이지) — index는 SPA(go())라 여기선 index.html#섹션으로 이동.
   인증: FITTING_MODE='api'(배포)=인증 표면 전체 숨김 / proto(로컬)=로그인상태 토글. index.js와 같은 'fitting.auth' 키.
   ※ Phase 2에서 index·result·diag·콘텐츠 페이지도 이 컴포넌트로 이관 예정(그때 SPA 분기·중복 CSS 통폐합). */
(function(){
  // 인증 저장 — index.js loadLS/saveLS와 같은 'fitting.*' 키를 공유한다.
  function lget(k, d){ try{ var v=localStorage.getItem('fitting.'+k); return v?JSON.parse(v):d; }catch(e){ return d; } }
  function lset(k, v){ try{ localStorage.setItem('fitting.'+k, JSON.stringify(v)); }catch(e){} }
  // 배포(gen-app이 'api' 주입) — config.js(body 하단)가 defer된 이 스크립트보다 먼저 실행돼 값 준비됨. 미정의면 proto.
  var isApi = window.FITTING_MODE === 'api';
  function loggedIn(){ return lget('auth', !isApi) !== false; }   // proto 기본=로그인(김도현) · api 기본=비로그인

  var mount = document.getElementById('appnav');
  if(mount){
    var active = (mount.getAttribute('data-active') || '').toLowerCase();
    var on = function(k){ return active === k ? ' class="on"' : ''; };
    var bell = '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8.5a6 6 0 0 0-12 0c0 4.6-1.9 6-1.9 6h15.8s-1.9-1.4-1.9-6z"/><path d="M10.2 18.5a2 2 0 0 0 3.6 0"/></svg>';
    mount.innerHTML =
      '<header class="appnav-hd"><div class="appnav-in">' +
        '<a class="appnav-logo" href="index.html">Fitting<i class="sq"></i></a>' +
        '<nav class="appnav-menu">' +
          '<a' + on('home') + ' href="index.html#home">Home</a>' +
          '<a' + on('shop') + ' href="index.html#shop">Stylists</a>' +
          '<a' + on('fit') + ' href="judge.html">Fit</a>' +
          '<a' + on('my') + ' id="appnavMy" href="index.html#my">My</a>' +
        '</nav>' +
        '<div class="appnav-r">' +
          '<a class="sup" href="pro-signup.html">스타일리스트 지원</a>' +
          '<span class="navdiv" id="appnavDiv0"></span>' +
          '<a class="navbell" id="appnavBell" href="index.html#my" title="알림" aria-label="알림">' + bell + '</a>' +
          '<span class="navdiv" id="appnavBellDiv"></span>' +
          '<a class="navauth" id="appnavAuth" href="index.html#my">로그인 · 회원가입</a>' +
          '<span class="navuser" id="appnavUser"><span class="navav" id="appnavAv">김</span><span class="navname">김도현 님</span></span>' +
          '<div class="usermenu" id="appnavMenu"><a href="index.html#my">마이페이지</a><a href="#" id="appnavLogout">로그아웃</a></div>' +
        '</div>' +
      '</div></header>';

    // 인증 상태 반영 — index.js applyAuthUI와 동일 규칙.
    var byId = function(id){ return document.getElementById(id); };
    var inA = loggedIn();
    var au = byId('appnavAuth'), us = byId('appnavUser'), be = byId('appnavBell'), bd = byId('appnavBellDiv'), my = byId('appnavMy'), d0 = byId('appnavDiv0');
    if(isApi){
      // 배포(MVP): 인증은 킬메트릭 대상 아님 + 소비자 로그인 목업 → 인증 표면 전체 숨김. 상단은 Home·Stylists·Fit + 스타일리스트 지원만.
      //  선두 구분선(d0)도 숨김 — 뒤 요소가 전부 사라져 '스타일리스트 지원' 뒤에 홀로 남는 선을 없앤다.
      [au, us, be, bd, my, d0].forEach(function(e){ if(e) e.style.display='none'; });
    } else {
      if(au) au.style.display = inA ? 'none' : 'inline-flex';   // 비로그인 시 로그인·회원가입 버튼
      if(us) us.style.display = inA ? 'flex' : 'none';          // 로그인 시 페르소나
      if(be) be.style.display = inA ? 'inline-flex' : 'none';
      if(bd) bd.style.display = inA ? 'inline-block' : 'none';
      if(my) my.style.display = inA ? '' : 'none';              // 비로그인 시 My(개인 데이터) 숨김
    }

    // 아바타 = 결과 카드 캐릭터 얼굴(index #myAv와 동일 김도현). 로그인(proto)일 때만 존재.
    var AVA = { gender: 'male', color: '#9db8ff' };   // color = bodytypes.json STR point (유형 바뀌면 같이 바꿀 것)
    var av = byId('appnavAv');
    if(av){
      av.style.background = AVA.color;
      av.innerHTML = '<div class="head '+AVA.gender+'">'+(AVA.gender==='female'?'<span class="longhair"></span>':'')+'<span class="face"></span><span class="cap"></span><span class="ey l"></span><span class="ey r"></span></div>';
    }

    // 유저 메뉴 토글 + 로그아웃(index doLogout과 동일: auth=false 후 홈으로).
    var u = byId('appnavUser'), m = byId('appnavMenu');
    if(u && m){
      u.addEventListener('click', function(e){ e.stopPropagation(); m.classList.toggle('on'); });
      document.addEventListener('click', function(e){ if(m.classList.contains('on') && !u.contains(e.target) && !m.contains(e.target)) m.classList.remove('on'); });
    }
    var lo = byId('appnavLogout');
    if(lo) lo.addEventListener('click', function(e){
      e.preventDefault();
      if(!confirm('로그아웃할까요? 둘러보기는 로그인 없이 이어갈 수 있어요.')) return;
      lset('auth', false); location.href = 'index.html';
    });
  }

  // 하단 푸터 — index .site-foot와 동일(전역 공용 푸터).
  var foot = document.getElementById('appfoot');
  if(foot){
    foot.innerHTML =
      '<footer class="site-foot"><div class="in">' +
        '<span class="brand">Fitting</span>' +
        '<nav class="flinks">' +
          '<a href="about.html">서비스 소개</a>' +
          '<a href="body-type-guide.html">체형별 가이드</a>' +
          '<a href="faq.html">도움말</a>' +
          '<a href="terms.html">이용약관</a>' +
          '<a href="privacy.html">개인정보 처리방침</a>' +
        '</nav>' +
        '<span class="copy">© 2026 Fitting · 진단 결과는 통계·규칙 기반 참고용이며 실제 착용과 다를 수 있어요</span>' +
      '</div></footer>';
  }
})();
