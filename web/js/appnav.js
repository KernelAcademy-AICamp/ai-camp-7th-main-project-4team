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
        '<span class="navuser" id="appnavUser"><span class="navav">김</span><span class="navname">김도현 님</span></span>' +
        '<div class="usermenu" id="appnavMenu"><a href="index.html#my">마이페이지</a><a href="index.html">로그아웃</a></div>' +
      '</div>' +
    '</div></header>';
  var u = document.getElementById('appnavUser'), m = document.getElementById('appnavMenu');
  if(u && m){
    u.addEventListener('click', function(e){ e.stopPropagation(); m.classList.toggle('on'); });
    document.addEventListener('click', function(e){ if(m.classList.contains('on') && !u.contains(e.target) && !m.contains(e.target)) m.classList.remove('on'); });
  }
})();
