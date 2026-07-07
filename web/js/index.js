  /* ===== 탭 전환 (셸) ===== */
  function go(id, el){
    document.querySelectorAll('.page').forEach(p=>p.classList.toggle('on', p.id===id));
    document.querySelectorAll('.menu a').forEach(a=>a.classList.toggle('on', a.dataset.t===id));
    if(id==='shop') showOnly('listView');   // 쇼퍼찾기는 항상 목록부터
    window.scrollTo({top:0, behavior:'smooth'});
  }

  /* ===== 공통 ===== */
  function scrim(on){ document.getElementById('scrim').classList.toggle('on', on); }
  function closeAll(){ document.getElementById('drawer').classList.remove('on'); document.getElementById('sheet').classList.remove('on'); scrim(false); }
  function toast(m){ var t=document.getElementById('toast'); t.textContent=m; t.classList.add('on'); clearTimeout(window._t); window._t=setTimeout(function(){t.classList.remove('on');},2000); }

  /* ===== 진단 = 별도 화면 플로우 (sangmin 실제 UI 이식) =====
     diag-basic → diag-fit → diag-loading → result. 진단 수집은 서비스 제공에 필요한 최소로 이뤄지며
     동의 없이도 이용 가능(엔진 개선 활용만 결과화면에서 선택 동의).
     '시작/다시 진단하기'는 새 진단이므로 이전 입력을 초기화(이어서 진단은 result의 옷장 게이트 링크가 담당). */
  function startDiag(){
    try{ ['fitting.dx','fitting.basic','fitting.consent'].forEach(function(k){ sessionStorage.removeItem(k); }); }catch(e){}
    location.href='diag-basic.html';
  }

  /* ===== 로그인/가입 시트 ===== */
  function openLogin(ctx, onDone){ window._loginCb=onDone||null; document.getElementById('loginTitle').textContent=(ctx?ctx+' — ':'')+'로그인하고 이어가기'; document.getElementById('sheet').classList.add('on'); scrim(true); }
  function loginDone(){ saveLS('auth', true); closeAll(); var cb=window._loginCb; window._loginCb=null; if(cb){ toast('로그인했어요 · 이어서 진행할게요'); cb(); } else toast('로그인했어요 · 결과가 계정에 저장됐어요'); }
  function loggedIn(){ return loadLS('auth', true)!==false; }   // 기본 '로그인됨' 가정 (명시적 로그아웃 시에만 false)

  /* ===== 마이페이지 사이드 네비 ===== */
  function myNav(el){
    var m=document.querySelectorAll('#smenu a'); for(var i=0;i<m.length;i++) m[i].classList.remove('on'); el.classList.add('on');
    var ps=document.querySelectorAll('#my .mpanel'); for(var j=0;j<ps.length;j++) ps[j].classList.remove('on');
    document.getElementById(el.dataset.p).classList.add('on');
  }
  function goMy(panel){ go('my'); var a=document.querySelector('#smenu a[data-p="'+panel+'"]'); if(a) myNav(a); }

  /* =========================================================
     쇼퍼찾기 (source: idea/데모/쇼퍼찾기_상세.html 이식)
     1.2 둘러보기(검색·정렬·필터) + 1.3 견적요청 + 1.3.7 결과
     찜·요청 상태는 localStorage에 저장 → 마이페이지와 연동
     ========================================================= */
  var SVC={online:'온라인 스타일링', shopping:'동행 쇼핑', image:'이미지 컨설팅'};
  var SVCI={online:'💻', shopping:'🛍️', image:'✨'};
  var OCC={date:'소개팅', interview:'면접·발표', wedding:'결혼식 하객', travel:'여행', daily:'일상 코디'};
  var BUD={b1:'~5만', b2:'5~10만', b3:'10~15만', b4:'15만+'};
  function budOf(p){ return p<50000?'b1':(p<=100000?'b2':(p<=150000?'b3':'b4')); }
  var FB="this.onerror=null;this.src='https://picsum.photos/seed/fit'+Math.floor(Math.random()*99)+'/480/340'";
  function img(e){ return e.photo || 'https://loremflickr.com/480/340/model,portrait?lock='+e.lock; }
  /* 찜(북마크) 아이콘 · onPhoto=사진 위(흰 반투명↔딥그린) / false=밝은 버튼 위(라인↔딥그린) */
  var BOOK_PATH='M6 3h12a1 1 0 0 1 1 1v17l-7-4.7L5 21V4a1 1 0 0 1 1-1z';
  function favIcon(on, onPhoto){ return '<svg class="bk'+(onPhoto?'':' lt')+(on?' on':'')+'" viewBox="0 0 24 24"><path d="'+BOOK_PATH+'"/></svg>'; }

  var EX=[
    {lock:32, nm:'소희', photo:'photos/p1.jpg', svc:'online', occ:['date','daily'], rating:4.9, price:120000, review:96, match:97, tags:['데일리룩','소개팅룩','미니멀'], mode:'온라인(비대면)', dur:'약 3일', bio:'데일리·소개팅룩 전문 스타일리스트<br>온라인 쇼핑몰 MD 출신으로<br>비대면 큐레이션이 강점이에요', reviews:[['비대면인데도 사이즈까지 딱 맞게 골라주셨어요','30세 · 소개팅룩'],['길게 설명 안 해도 취향을 바로 잡아주셔서 편했어요','27세 · 데일리']]},
    {lock:47, nm:'건형', photo:'photos/p2.jpg', svc:'image', occ:['interview'], rating:4.8, price:190000, review:74, match:90, tags:['면접룩','오피스','남성 그루밍'], mode:'오프라인 세션', dur:'세션 1회 · 약 2시간', bio:'남성 이미지 컨설턴트<br>면접·오피스 첫인상을<br>헤어부터 셔츠 핏까지 정돈해드려요', reviews:[['면접관 시선까지 짚어주셔서 자신감이 생겼어요','29세 · 면접']]},
    {lock:15, nm:'상민', photo:'photos/p3.jpg', svc:'shopping', occ:['wedding','interview'], rating:4.7, price:150000, review:58, match:86, tags:['포멀','하객룩','세미정장'], mode:'오프라인 동행', dur:'방문 1회 · 약 3시간', bio:'포멀·하객룩 동행 쇼핑 전문<br>매장을 함께 돌며 체형에 맞는<br>옷을 현장에서 골라드려요', reviews:[['혼자였으면 못 골랐을 옷을 잘 맞게 찾아주셨어요','34세 · 결혼식']]}
  ];

  /* ===== 로컬 저장소 (찜 · 요청 내역) ===== */
  function loadLS(k, def){ try{ var v=localStorage.getItem('fitting.'+k); return v?JSON.parse(v):def; }catch(e){ return def; } }
  function saveLS(k, v){ try{ localStorage.setItem('fitting.'+k, JSON.stringify(v)); }catch(e){} }
  var favs = loadLS('favs', [ {nm:'소희', svc:'online', rating:4.9, photo:'photos/p1.jpg'} ]);
  var reqs = loadLS('reqs', [
    {nm:'상민', svc:'shopping', occ:['결혼식 하객'], budget:'10~15만', date:'2026.06.30', status:'진행중'},
    {nm:'소희', svc:'online',   occ:['소개팅'],     budget:'5~10만',  date:'2026.06.28', status:'완료'}
  ]);
  function svcLabel(v){ return SVC[v]||v; }
  function isFav(nm){ return favs.some(function(f){ return f.nm===nm; }); }
  function toggleFav(nm){
    if(!loggedIn()){ openLogin('즐겨찾기', function(){ toggleFav(nm); }); return; }   // 로그인 후에만 데이터 저장
    var e=EX.filter(function(x){return x.nm===nm;})[0];
    if(isFav(nm)) favs=favs.filter(function(f){return f.nm!==nm;});
    else if(e) favs.unshift({nm:e.nm, svc:e.svc, rating:e.rating, photo:e.photo||img(e)});
    saveLS('favs', favs); render(); renderFavs();
    toast(isFav(nm)?(nm+' 쇼퍼를 즐겨찾기에 담았어요'):(nm+' 쇼퍼를 즐겨찾기에서 뺐어요'));
  }
  function addReq(r){ reqs.unshift(r); saveLS('reqs', reqs); renderReqs(); }

  /* 마이페이지 · 즐겨찾기 렌더 */
  function renderFavs(){
    var el=document.getElementById('favList'); if(!el) return;
    if(!favs.length){ el.innerHTML='<p class="note" style="grid-column:1/-1">아직 찜한 쇼퍼가 없어요 · 쇼퍼찾기에서 🤍 를 눌러 담아보세요</p>'; return; }
    el.innerHTML=favs.map(function(f){
      return '<div class="fcard"><div class="cov" style="background-image:url(\''+(f.photo||'')+'\'); background-size:cover; background-position:center"><span class="heart" title="즐겨찾기 해제" onclick="toggleFav(\''+f.nm+'\')">'+favIcon(true,true)+'</span></div>'+
        '<div class="fb"><b>'+f.nm+' 쇼퍼</b><small>'+svcLabel(f.svc)+' · ★ <span class="num">'+f.rating+'</span></small></div></div>';
    }).join('');
  }
  /* 마이페이지 · 코디 요청 내역 렌더 */
  function stClass(s){ return s==='완료'?'done':(s==='진행중'?'prog':'wait'); }
  function renderReqs(){
    var el=document.getElementById('reqList'); if(!el) return;
    if(!reqs.length){ el.innerHTML='<p class="note">아직 보낸 요청이 없어요 · 쇼퍼에게 견적을 요청해보세요</p>'; return; }
    el.innerHTML=reqs.map(function(r){
      var title = r.kind==='notify' ? '1기 오픈 알림 신청' : (r.nm ? r.nm+' 쇼퍼 · '+svcLabel(r.svc) : '견적 요청 · '+svcLabel(r.svc));
      var sub = r.kind==='notify' ? (svcLabel(r.svc)+' · 오픈 대기') : ([(r.occ&&r.occ.length?r.occ.join('·'):''), (r.date||'')].filter(Boolean).join(' · '));
      return '<div class="req"><div class="ic"></div><div class="info"><b>'+title+'</b><small>'+sub+'</small></div><span class="st '+stClass(r.status)+'">'+r.status+'</span></div>';
    }).join('');
  }

  /* 빈 상태 · 오픈 알림 신청 → 로그인 후 요청내역에 대기로 기록 */
  function notifySignup(){ var done=function(){ addReq({kind:'notify', svc:'image', status:'대기'}); toast('오픈 알림을 신청했어요 · 마이 > 코디 요청 내역에서 확인'); }; if(loggedIn()) done(); else openLogin('오픈 알림 신청', done); }

  var curSvc='all', curOcc='all', curBudget='all', query='';
  function toggleClr(){ document.getElementById('clrBtn').style.display=document.getElementById('q').value?'inline':'none'; }
  function doSearch(){ query=(document.getElementById('q').value||'').trim(); toggleClr(); render(); }
  function clearSearch(){ document.getElementById('q').value=''; query=''; toggleClr(); render(); }

  function setActive(el){ [].forEach.call(el.parentNode.children, function(c){ c.classList.remove('on'); }); el.classList.add('on'); }
  function setSvc(el){ setActive(el); curSvc=el.dataset.svc; render(); }
  function setOcc(el){ setActive(el); curOcc=el.dataset.occ; updateDD('ddOcc', curOcc==='all'?'':OCC[curOcc]); closeDD(); render(); }
  function setBud(el){ setActive(el); curBudget=el.dataset.bud; updateDD('ddBud', curBudget==='all'?'':BUD[curBudget]); closeDD(); render(); }
  function updateDD(id, val){ var d=document.getElementById(id); d.classList.toggle('active', !!val); d.querySelector('.lab').textContent = val ? ' · '+val : ''; }
  function toggleDD(e, id){ e.stopPropagation(); var d=document.getElementById(id); var open=d.classList.contains('open'); closeDD(); if(!open) d.classList.add('open'); }
  function closeDD(){ [].forEach.call(document.querySelectorAll('.dd.open'), function(d){d.classList.remove('open');}); }
  function syncControls(){
    [].forEach.call(document.querySelectorAll('#svctab .t'), function(t){t.classList.toggle('on', t.dataset.svc===curSvc);});
    [].forEach.call(document.querySelectorAll('#ddOcc .ddopt'), function(o){o.classList.toggle('on', o.dataset.occ===curOcc);});
    [].forEach.call(document.querySelectorAll('#ddBud .ddopt'), function(o){o.classList.toggle('on', o.dataset.bud===curBudget);});
    updateDD('ddOcc', curOcc==='all'?'':OCC[curOcc]); updateDD('ddBud', curBudget==='all'?'':BUD[curBudget]);
  }
  function browseAll(){ curSvc='all'; curOcc='all'; curBudget='all'; query=''; document.getElementById('q').value=''; toggleClr(); document.getElementById('sort').value='match'; syncControls(); render(); }

  function render(){
    var q=query;
    var s=document.getElementById('sort').value;
    var list=EX.filter(function(e){
      return (curSvc==='all'||e.svc===curSvc)
        && (curOcc==='all'||e.occ.indexOf(curOcc)>=0)
        && (curBudget==='all'||budOf(e.price)===curBudget)
        && (!q || e.nm.indexOf(q)>=0 || e.tags.join(' ').indexOf(q)>=0);
    });
    list.sort(function(a,b){ return s==='rating'?b.rating-a.rating : s==='priceA'?a.price-b.price : s==='priceD'?b.price-a.price : b.match-a.match; });
    var cond = list.length+'명 · '+(curSvc==='all'?'전체 유형':SVC[curSvc])+(curOcc==='all'?'':' · '+OCC[curOcc])+(curBudget==='all'?'':' · 예산 '+BUD[curBudget])+(q?' · "'+q+'"':'');
    var active = curSvc!=='all'||curOcc!=='all'||curBudget!=='all'||q;
    document.getElementById('count').innerHTML = cond + (active?'  ·  <a onclick="browseAll()">초기화하기</a>':'');
    var g=document.getElementById('grid');
    if(!list.length){ g.innerHTML='<div class="empty"><b>조건에 맞는 쇼퍼가 아직 없어요</b><p>초기라 쇼퍼를 모으는 중이에요 · <a onclick="notifySignup()">오픈 알림 신청하기</a> 또는 <a onclick="browseAll()">전체 보기</a></p></div>'; return; }
    g.innerHTML=list.map(function(e){ var idx=EX.indexOf(e); var rt=e.rating>0?'<span class="star">★ '+e.rating+'</span>':'<span class="star new">신규</span>';
      return '<div class="ecard" onclick="openProfile('+idx+')"><div class="cover"><img src="'+img(e)+'" alt="" onerror="'+FB+'"><span class="match">매칭도 '+e.match+'%</span>'+
        '<button class="favbtn" title="즐겨찾기" onclick="event.stopPropagation();toggleFav(\''+e.nm+'\')">'+favIcon(isFav(e.nm),true)+'</button></div>'+
        '<div class="eb"><div class="top"><span class="nm">'+e.nm+' 쇼퍼</span>'+rt+'</div>'+
        '<div class="tags">'+e.tags.map(function(t){return '<span>'+t+'</span>';}).join('')+'</div>'+
        '<div class="price">'+e.price.toLocaleString()+'원 <small>· 후기 '+e.review+'건</small></div></div></div>';
    }).join('');
  }

  /* 폼 선택 헬퍼 */
  function pickOne(el){ var ch=el.parentNode.children; for(var i=0;i<ch.length;i++) ch[i].classList.remove('on'); el.classList.add('on'); validate(); }
  function pickBud(el){ var was=el.classList.contains('on'); var ch=el.parentNode.children; for(var i=0;i<ch.length;i++) ch[i].classList.remove('on'); if(!was) el.classList.add('on'); validate(); }
  function validate(){
    var btn=document.getElementById('reqBtn'); if(!btn) return;
    var occ=document.querySelectorAll('#mOcc .o.on').length>0;
    var bud=document.querySelectorAll('#mBud .o.on').length>0;
    var d=document.getElementById('reqDate'); var date=d && d.value && d.value>=todayStr();  // 오늘 이후만 유효
    var ok=occ && bud && !!date;
    btn.disabled=!ok;
    var hint=document.getElementById('reqHint'); if(hint) hint.style.display=ok?'none':'block';
  }

  /* 카드 클릭 → 빠른 보기 드로어 */
  function openProfile(idx){ var e=EX[idx]; var rt=e.rating>0?('★ '+e.rating+' · 후기 '+e.review+'건'):'신규 쇼퍼';
    document.getElementById('drawerBody').innerHTML=
      '<div class="dhead"><img src="'+img(e)+'" onerror="'+FB+'"><div class="dov"><span class="dm">매칭도 '+e.match+'%</span><div class="dn">'+e.nm+' 쇼퍼</div><div style="font-size:13px;opacity:.9;margin-top:2px">'+rt+'</div></div></div>'+
      '<div class="dbody"><p class="bio">'+e.bio+'</p>'+
      '<div class="feat">전문 분야</div><div class="tagrow">'+e.tags.map(function(t){return '<span>'+t+'</span>';}).join('')+'</div>'+
      '<div class="feat">서비스 정보</div><div class="svcinfo"><div class="r"><span>서비스</span><b>'+SVC[e.svc]+'</b></div><div class="r"><span>예상 가격</span><b>'+e.price.toLocaleString()+'원</b></div><div class="r"><span>제공 방식</span><b>'+e.mode+'</b></div></div>'+
      '<button class="btn full" style="margin-top:20px" onclick="openDetail('+idx+')">자세히 보기 →</button>'+
      '<button class="btn ghost full" style="margin-top:9px" onclick="requestFor('+idx+')">견적 요청하기</button>'+
      '<button class="btn ghost full" style="margin-top:9px" onclick="toggleFav(\''+e.nm+'\');openProfile('+idx+')">'+favIcon(isFav(e.nm),false)+' '+(isFav(e.nm)?'즐겨찾기 해제':'즐겨찾기 추가')+'</button></div>';
    document.getElementById('drawer').classList.add('on'); scrim(true);
  }

  /* 자세히 보기 → 쇼퍼 상세 (탭 내 화면 전환) */
  function openDetail(idx){ var e=EX[idx]; closeAll();
    var rt=e.rating>0?('★ '+e.rating+' · 후기 '+e.review+'건'):'신규 쇼퍼';
    var revs=e.reviews.length ? e.reviews.map(function(r){return '<div class="rev">"'+r[0]+'"<div class="who">— '+r[1]+'</div></div>';}).join('') : '<div class="noreview">아직 등록된 후기가 없어요</div>';
    document.getElementById('detailView').innerHTML=
      '<a class="back" onclick="closeDetail()">← 목록으로</a>'+
      '<div class="dhero"><div class="dhero-img"><img src="'+img(e)+'" onerror="'+FB+'"></div>'+
      '<div class="dhero-info"><span class="dsvc">'+SVC[e.svc]+'</span>'+
      '<div class="dnamerow"><h1>'+e.nm+' 쇼퍼</h1><div class="dmeta"><b>매칭도 '+e.match+'%</b> · '+rt+'</div></div>'+
      '<div class="tagrow" style="margin-top:16px">'+e.tags.map(function(t){return '<span>'+t+'</span>';}).join('')+'</div>'+
      '<p class="dbio">'+e.bio+'</p>'+
      '<div style="display:flex; gap:9px; flex-wrap:wrap; margin-top:22px">'+
      '<button class="btn" onclick="requestFor('+idx+')">이 쇼퍼에게 견적 요청하기 →</button>'+
      '<button class="btn ghost" onclick="toggleFav(\''+e.nm+'\');openDetail('+idx+')">'+favIcon(isFav(e.nm),false)+' '+(isFav(e.nm)?'즐겨찾기 해제':'즐겨찾기 추가')+'</button>'+
      '</div></div></div>'+
      '<div class="dsecs">'+
        '<div class="dsec"><h3>서비스 정보</h3><div class="svcinfo"><div class="r"><span>서비스</span><b>'+SVC[e.svc]+'</b></div><div class="r"><span>예상 가격</span><b>'+e.price.toLocaleString()+'원</b></div><div class="r"><span>제공 방식</span><b>'+e.mode+'</b></div><div class="r"><span>예상 기간</span><b>'+e.dur+'</b></div></div></div>'+
        '<div class="dsec"><h3>실제 후기</h3>'+revs+'</div>'+
        '<div class="dsec"><h3>포트폴리오</h3><div class="dgal">'+[1,2,3,4,5,6].map(function(i){return '<div style="background-image:url(\'photos/folio'+i+'.jpg\')"></div>';}).join('')+'</div></div>'+
      '</div>';
    showOnly('detailView');
  }
  function closeDetail(){ showOnly('listView'); }
  function showOnly(id){ ['listView','detailView','requestView'].forEach(function(v){ var el=document.getElementById(v); if(el) el.style.display=(v===id)?'block':'none'; }); window.scrollTo({top:0}); }

  /* 오늘(YYYY-MM-DD) — 견적 일정의 최소 선택일 */
  function todayStr(){ var d=new Date(), p=function(n){return (n<10?'0':'')+n;}; return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); }

  /* 견적 요청 폼 (공통 필드) */
  function reqFields(){ return '<div class="feat">상황 · <em>필수</em> · 최대 2개</div><div class="seg" id="mOcc"><span class="o" onclick="toggleOcc(this)">소개팅</span><span class="o" onclick="toggleOcc(this)">면접·발표</span><span class="o" onclick="toggleOcc(this)">결혼식 하객</span><span class="o" onclick="toggleOcc(this)">여행</span><span class="o" onclick="toggleOcc(this)">일상 코디</span></div>'+
    '<div class="feat">예산 · <em>필수</em></div><div class="seg" id="mBud"><span class="o" onclick="pickBud(this)">~5만</span><span class="o" onclick="pickBud(this)">5~10만</span><span class="o" onclick="pickBud(this)">10~15만</span><span class="o" onclick="pickBud(this)">15만+</span></div>'+
    '<div class="feat">일정 · <em>필수</em> · 오늘 이후만 선택 가능</div><input class="inp" type="date" id="reqDate" min="'+todayStr()+'" onchange="validate()">'+
    '<div class="feat">한 줄 요청 · 선택</div><input class="inp" id="reqNote" maxlength="100" placeholder="예) 과하지 않게 깔끔한 첫인상 원해요">'+
    '<div class="attach"><div class="at"><b>내 체형·사이즈 프로필 첨부</b><div>시크 스트레이트 · 추천 사이즈 카드</div></div><div class="toggle on" onclick="this.classList.toggle(\'on\')"></div></div>'; }

  var curReq={nm:null, svc:'online'};

  /* 특정 쇼퍼에게 견적 요청 (로그인 게이트) */
  function requestFor(idx){
    if(!loggedIn()){ closeAll(); openLogin(EX[idx].nm+' 쇼퍼 견적 요청', function(){ requestFor(idx); }); return; }
    var e=EX[idx]; curReq={nm:e.nm, svc:e.svc};
    var SNM={online:'온라인', shopping:'동행 쇼핑', image:'이미지'};
    var svc3=['online','shopping','image'].map(function(v){ return '<div class="s '+(v===e.svc?'on':'locked')+'"><div class="i">'+SVCI[v]+'</div><b>'+SNM[v]+'</b></div>'; }).join('');
    document.getElementById('requestView').innerHTML=
      '<a class="back" onclick="showOnly(\'listView\')">← 목록으로</a>'+
      '<div class="reqpage">'+
      '<div class="reqto"><img src="'+img(e)+'" onerror="'+FB+'"><div><div class="rl">견적 요청 대상</div><div class="rn">'+e.nm+' 쇼퍼</div></div></div>'+
      '<h1 style="margin-top:20px">견적 요청</h1><p class="lead">조건을 남기면 이 쇼퍼가 검토하고 제안(견적)을 보내드려요 · 체형·사이즈 프로필도 함께 전달돼요</p>'+
      '<div class="feat" style="margin-top:26px">서비스 유형 · 이 쇼퍼의 서비스로 고정</div><div class="svc3">'+svc3+'</div>'+
      reqFields()+
      '<button class="btn full" id="reqBtn" disabled style="margin-top:26px" onclick="submitMatch()">견적 요청 보내기</button>'+
      '<p class="reqhint" id="reqHint">상황·예산·일정을 모두 입력하면 보낼 수 있어요</p></div>';
    closeAll(); showOnly('requestView'); validate();
  }

  /* 조건으로 견적 요청 (배너 진입, 로그인 게이트) */
  function openMatch(){
    if(!loggedIn()){ openLogin('견적 요청', openMatch); return; }
    curReq={nm:null, svc:'online'};
    var SNM={online:'온라인',shopping:'동행 쇼핑',image:'이미지'};
    var svc3=['online','shopping','image'].map(function(v){ return '<div class="s '+(v==='online'?'on':'')+'" data-v="'+v+'" onclick="pickSvc(this)"><div class="i">'+SVCI[v]+'</div><b>'+SNM[v]+'</b></div>'; }).join('');
    document.getElementById('requestView').innerHTML=
      '<a class="back" onclick="showOnly(\'listView\')">← 목록으로</a>'+
      '<div class="reqpage">'+
      '<h1>견적 요청</h1><p class="lead">조건을 남기면 조건에 맞는 쇼퍼가 검토하고 제안(견적)을 보내드려요 · 체형·사이즈 프로필도 함께 전달돼요</p>'+
      '<div class="feat" style="margin-top:26px">서비스 유형 · 필수</div><div class="svc3" id="mSvc">'+svc3+'</div>'+
      reqFields()+
      '<button class="btn full" id="reqBtn" disabled style="margin-top:26px" onclick="submitMatch()">견적 요청 보내기</button>'+
      '<p class="reqhint" id="reqHint">상황·예산·일정을 모두 입력하면 보낼 수 있어요</p></div>';
    closeAll(); showOnly('requestView'); validate();
  }
  function pickSvc(el){ pickOne(el); curReq.svc=el.dataset.v; }
  function toggleOcc(el){
    if(el.classList.contains('on')){ el.classList.remove('on'); }
    else { if(document.querySelectorAll('#mOcc .o.on').length>=2) return; el.classList.add('on'); }
    var full=document.querySelectorAll('#mOcc .o.on').length>=2;
    [].forEach.call(document.querySelectorAll('#mOcc .o'), function(o){ if(!o.classList.contains('on')) o.classList.toggle('dis', full); });
    validate();
  }
  function submitMatch(){
    var occ=[].map.call(document.querySelectorAll('#mOcc .o.on'), function(o){ return o.textContent; });
    var budEl=document.querySelector('#mBud .o.on'); var budget=budEl?budEl.textContent:'';
    var dEl=document.getElementById('reqDate'); var date=(dEl && dEl.value)?dEl.value.replace(/-/g,'.'):'';
    var nEl=document.getElementById('reqNote'); var note=nEl?nEl.value:'';
    addReq({nm:curReq.nm, svc:curReq.svc, occ:occ, budget:budget, date:date, note:note, status:'대기'});
    document.getElementById('requestView').innerHTML=
      '<div class="reqdone"><div class="cc">✓</div>'+
      '<h1>견적 요청을 보냈어요</h1>'+
      '<p>'+(curReq.nm?curReq.nm+' 쇼퍼가':'조건에 맞는 쇼퍼가')+' 검토하고 제안(견적)을 보내드려요<br>진행 상황은 마이페이지에서 볼 수 있어요</p>'+
      '<div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin-top:26px">'+
        '<button class="btn ghost" onclick="showOnly(\'listView\')">목록으로 돌아가기</button>'+
        '<button class="btn" onclick="goMy(\'mp-req\')">마이페이지로 이동하기</button>'+
      '</div></div>';
    showOnly('requestView');
  }

  /* ===== 전역 이벤트 ===== */
  document.addEventListener('click', closeDD);
  document.addEventListener('keydown', function(e){ if(e.key==='Escape'){ closeAll(); closeDD(); } });
  /* 외부 화면에서 #home·#shop·#my 로 돌아오면 해당 탭 열기 */
  (function(){ var h=(location.hash||'').replace('#',''); if(['home','shop','my'].indexOf(h)>=0) go(h); })();

  render(); renderFavs(); renderReqs();

  /* ================= 홈 (줄자 리디자인) 인터랙션 — _home2 이식 ================= */
  (function(){
    var RM=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var home=document.getElementById('home'); if(!home) return;
    var $=function(id){return document.getElementById(id);};

    /* 1) 히어로 줄자 — cm·kg 측정 */
    (function(){
      var marker=$('hMarker'), cm=$('hCm'), kg=$('hKg'), tag=$('hMtag'); if(!marker) return;
      var TO_CM=158, TO_KG=65, posEnd=((TO_CM-150)/40)*100;
      if(RM){ marker.style.left=posEnd+'%'; cm.textContent=TO_CM; kg.textContent=TO_KG; tag.textContent='그래서 나는 어떤 FIT일까?'; return; }
      var s0=null,dur=1700;
      function s(t){ if(!s0)s0=t; var p=Math.min((t-s0)/dur,1),e=1-Math.pow(1-p,3);
        marker.style.left=(2+(posEnd-2)*e)+'%'; cm.textContent=Math.round(150+(TO_CM-150)*e); kg.textContent=Math.round(45+(TO_KG-45)*e);
        if(p<1)requestAnimationFrame(s); else tag.textContent='그래서 나는 어떤 FIT일까?'; }
      requestAnimationFrame(s);
    })();

    /* 2) 스크롤 리빌 */
    var io=new IntersectionObserver(function(es){es.forEach(function(en){ if(en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target);} });},{threshold:.16});
    [].forEach.call(home.querySelectorAll('.reveal'), function(el,i){ el.style.transitionDelay=(el.classList.contains('step')?(i%3)*.09:0)+'s'; io.observe(el); });

    /* 3) 숫자 카운트업 */
    function countUp(el){ var to=+el.dataset.to, suf=el.dataset.suffix||'', from=+el.textContent||0, dur=1100, start=null;
      if(RM){ el.textContent=to+suf; return; }
      function s(t){ if(!start)start=t; var p=Math.min((t-start)/dur,1),e=1-Math.pow(1-p,3); el.textContent=Math.round(from+(to-from)*e)+suf; if(p<1)requestAnimationFrame(s); } requestAnimationFrame(s);
    }
    var cio=new IntersectionObserver(function(es){es.forEach(function(en){ if(en.isIntersecting){ countUp(en.target); cio.unobserve(en.target);} });},{threshold:.6});
    [].forEach.call(home.querySelectorAll('.hcount'), function(el){ cio.observe(el); });

    /* 4) 세로 줄자 — 스크롤에 1:1 추종 (rAF, 이징 없음 → 커서 타이밍에 딱) */
    var how=home.querySelector('.how'), vfill=$('hVfill'), vhead=$('hVhead'), ticking=false;
    function updTape(){ ticking=false; if(!how||!vfill) return; var r=how.getBoundingClientRect(), vh=window.innerHeight;
      var prog=(vh*0.5 - r.top)/(r.height*1.02); prog=Math.max(0,Math.min(1,prog));  // 뷰포트 중앙선이 섹션을 지나는 만큼 채움(스크롤 1:1)
      var pct=(prog*100).toFixed(2)+'%'; vfill.style.height=pct; vhead.style.top=pct; }
    function onScroll(){ if(!ticking){ ticking=true; requestAnimationFrame(updTape); } }
    window.addEventListener('scroll',onScroll,{passive:true}); window.addEventListener('resize',onScroll); updTape();

    /* 5) 결과 카드 쇼케이스 — 8유형 자동 순환(블러+잠금) */
    (function(){
      var NAME={STR:['시크 스트레이트','어깨–허리–힙이 일직선인 직선 라인'],TRI:['소프트 A라인','어깨는 좁고 하체에 볼륨 있는 A라인'],
        INV:['모던 V라인','어깨가 넓고 하체는 좁은 V라인'],HRG:['엘레강스 X라인','허리가 잘록한 X라인'],
        BAL:['이지 밸런스','상·하체 균형 잡힌 표준 비율'],DIA:['소프트 다이아','허리에 볼륨이 실리는 라인'],
        RND:['코지 라운드','부드러운 곡선의 둥근 라인'],TUB:['슬릭 라인','굴곡이 완만한 일자 라인']};
      var tyname=$('hTyname'), frames=[$('hFrameA'),$('hFrameB')];
      var chips=[].slice.call(document.querySelectorAll('#hTypes .ty')); if(!frames[0]) return;
      var order=chips.map(function(c){return c.dataset.t;}), cur=0, front=0, timer=null;
      function highlight(code){ chips.forEach(function(c){ c.classList.toggle('on', c.dataset.t===code); }); var n=NAME[code]||['','']; tyname.innerHTML='<b>'+n[0]+'</b> · '+n[1]; }
      function show(code){ highlight(code); cur=order.indexOf(code); var back=frames[1-front];
        back.onload=function(){ back.classList.add('on'); frames[front].classList.remove('on'); front=1-front; };
        back.src='card.html?type='+code+'&g=male'; }
      function startShow(){ if(RM||timer) return; timer=setInterval(function(){ show(order[(cur+1)%order.length]); }, 3000); }
      var sObs=new IntersectionObserver(function(es){ if(es[0].isIntersecting){ startShow(); sObs.disconnect(); } },{threshold:.35});
      sObs.observe(home.querySelector('.showpanel'));   // 스크롤로 보이면 순환 시작
    })();

    /* 6) 쇼퍼 연결 — 선 따라 연결 → 딱! 매칭 → 반복 */
    (function(){
      var SH=[{nm:'소희',ph:'photos/p1.jpg',spec:'데일리·소개팅룩',svc:'온라인 스타일링'},{nm:'건형',ph:'photos/p2.jpg',spec:'면접·오피스',svc:'이미지 컨설팅'},{nm:'상민',ph:'photos/p3.jpg',spec:'포멀·하객룩',svc:'동행 쇼핑'}];
      var FLOW=[{occ:'소개팅',s:0,m:97},{occ:'면접·발표',s:1,m:94},{occ:'결혼식 하객',s:2,m:91},{occ:'여행',s:0,m:88},{occ:'일상 코디',s:0,m:95}];
      var chips=[].slice.call(document.querySelectorAll('#hOccRow .oc')), node=$('hShopNode');
      var link=home.querySelector('.connect .link'); if(!node||!link) return;
      var wirefill=link.querySelector('.wirefill'), pulse=link.querySelector('.pulse');
      function highlight(idx){ chips.forEach(function(c,k){ c.classList.toggle('on', k===idx); }); }
      function render(f){ var s=SH[f.s];
        node.innerHTML='<img class="ph" src="'+s.ph+'" alt="" onerror="this.style.visibility=\'hidden\'"><div><div class="snm">'+s.nm+' 쇼퍼</div><div class="spec">'+s.spec+'</div><span class="svcpill">'+s.svc+'</span></div><div class="mt"><div class="pct">–</div><div class="ml">매칭도</div></div><span class="matchbadge">✓ 매칭 완료</span>'; }
      function countTo(to){ var pct=node.querySelector('.pct'); if(!pct) return; if(RM){ pct.textContent=to+'%'; return; }
        var from=Math.max(70,to-16),t0=null; function c(t){ if(!t0)t0=t; var p=Math.min((t-t0)/1300,1),e=1-Math.pow(1-p,3); pct.textContent=Math.round(from+(to-from)*e)+'%'; if(p<1)requestAnimationFrame(c);} requestAnimationFrame(c); }
      var i=0, timers=[];
      function clr(){ timers.forEach(clearTimeout); timers=[]; }
      function cycle(){ clr(); var idx=i,f=FLOW[idx];
        highlight(idx); node.classList.remove('matched'); node.style.opacity='0'; node.style.transform='translateY(10px)';
        wirefill.style.transition='none'; wirefill.style.width='0'; pulse.style.transition='none'; pulse.style.left='2%'; void wirefill.offsetWidth;
        timers.push(setTimeout(function(){ render(f); node.style.opacity='1'; node.style.transform='none';
          if(RM){ node.classList.add('matched'); countTo(f.m); return; }
          wirefill.style.transition='width 1.3s cubic-bezier(.35,.75,.25,1)'; pulse.style.transition='left 1.3s cubic-bezier(.35,.75,.25,1)';
          wirefill.style.width='100%'; pulse.style.left='98%'; countTo(f.m); }, 300));
        timers.push(setTimeout(function(){ node.classList.add('matched'); }, 1600));
        i=(i+1)%FLOW.length; }
      var started=false;
      function startMatch(){ if(started) return; started=true; cycle(); if(!RM) setInterval(cycle, 4600); }
      var mObs=new IntersectionObserver(function(es){ if(es[0].isIntersecting){ startMatch(); mObs.disconnect(); } },{threshold:.3});
      mObs.observe(home.querySelector('.connect'));   // 스크롤로 보이면 매칭 시작
    })();
  })();
