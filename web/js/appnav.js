/* appnav.js — 공용 상단 내비게이션 주입. 페이지의 <div id="appnav" data-active="fit"> 자리에
   '동일한 마크업'을 심는다(단일 소스). data-active로 현재 탭 활성 표시.
   Home·Stylists·My는 index 섹션(#home·#shop·#my)으로, Fit은 judge.html로. 스타일=appnav.css. */
(function(){
  var mount = document.getElementById('appnav');
  if(!mount) return;
  var active = (mount.getAttribute('data-active') || '').toLowerCase();
  function on(k){ return active === k ? ' class="on"' : ''; }
  var bell = '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8.5a6 6 0 0 0-12 0c0 4.6-1.9 6-1.9 6h15.8s-1.9-1.4-1.9-6z"/><path d="M10.2 18.5a2 2 0 0 0 3.6 0"/></svg>';
  mount.innerHTML =
    '<header class="appnav-hd"><div class="appnav-in">' +
      '<a class="appnav-logo" href="index.html">Fitting<i class="sq"></i></a>' +
      '<nav class="appnav-menu">' +
        '<a' + on('home') + ' href="index.html#home">Home</a>' +
        '<a' + on('shop') + ' href="index.html#shop">Stylists</a>' +
        '<a' + on('fit') + ' href="judge.html">Fit</a>' +
        '<a' + on('my') + ' href="index.html#my">My</a>' +
      '</nav>' +
      '<div class="appnav-r">' +
        '<a class="sup" href="pro-signup.html">스타일리스트 지원</a>' +
        '<span class="navdiv"></span>' +
        '<a class="navbell" href="index.html#my" title="알림" aria-label="알림">' + bell + '</a>' +
        '<span class="navdiv"></span>' +
        '<span class="navuser" id="appnavUser"><span class="navav" id="appnavAv">김</span><span class="navname">김도현 님</span></span>' +
        '<div class="usermenu" id="appnavMenu"><a href="index.html#my">마이페이지</a><a href="index.html">로그아웃</a></div>' +
      '</div>' +
    '</div></header>';
  // 아바타 = 홈·마이(index #myAv)와 동일한 얼굴 그림으로 통일. 페르소나=김도현(STR·남성) → index.js USER와 일치.
  var AVA = { gender: 'male', color: '#9db8ff' };   // color = bodytypes.json STR point (유형 바뀌면 같이 바꿀 것)
  var av = document.getElementById('appnavAv');
  if(av){
    av.style.background = AVA.color;
    av.innerHTML = '<div class="head '+AVA.gender+'">'+(AVA.gender==='female'?'<span class="longhair"></span>':'')+'<span class="face"></span><span class="cap"></span><span class="ey l"></span><span class="ey r"></span></div>';
  }
  var u = document.getElementById('appnavUser'), m = document.getElementById('appnavMenu');
  if(u && m){
    u.addEventListener('click', function(e){ e.stopPropagation(); m.classList.toggle('on'); });
    document.addEventListener('click', function(e){ if(m.classList.contains('on') && !u.contains(e.target) && !m.contains(e.target)) m.classList.remove('on'); });
  }
})();
