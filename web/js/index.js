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
  var FB="this.onerror=null;";
  /* 쇼퍼 프로필 이미지 — 외부 랜덤 사진 대신 일관된 '수트 입은 여성' 플랫 일러스트(SVG data URI).
     seed(lock)로 배경·정장·머리색만 살짝 변주해 카드가 똑같아 보이지 않게. */
  function suitPhoto(seed){
    var bgs=['#E7EFEA','#ECEAE3','#E6EDF2','#F0EAE4','#E9EEEA','#EEEAF0'];
    var suits=['#2E4A3B','#39404B','#4B5563','#5A4632','#33475A','#3A3550'];
    var hairs=['#3a2c22','#5c4433','#2a2320','#71533a','#463022','#4a3a30'];
    var i=((seed||0)%bgs.length+bgs.length)%bgs.length, bg=bgs[i], suit=suits[i], hair=hairs[i];
    var svg="<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 360'>"+
      "<rect width='300' height='360' fill='"+bg+"'/>"+
      "<path d='M40 360 C50 265 95 240 150 240 C205 240 250 265 260 360 Z' fill='"+suit+"'/>"+
      "<path d='M132 248 L150 292 L168 248 Z' fill='#F5F5F2'/>"+
      "<rect x='134' y='206' width='32' height='46' rx='11' fill='#e8c6a0'/>"+
      "<path d='M92 176 C88 108 150 96 150 96 C150 96 212 108 208 176 L208 250 C190 235 165 232 150 232 C135 232 110 235 92 250 Z' fill='"+hair+"'/>"+
      "<ellipse cx='150' cy='168' rx='46' ry='54' fill='#f2d6b8'/>"+
      "<path d='M104 168 C102 112 150 104 150 104 C150 104 198 112 196 168 C196 150 175 134 150 134 C125 134 104 150 104 168 Z' fill='"+hair+"'/>"+
      "<circle cx='133' cy='166' r='4.5' fill='#3a2f2a'/><circle cx='167' cy='166' r='4.5' fill='#3a2f2a'/>"+
      "<path d='M139 190 q11 8 22 0' stroke='#c07a6a' stroke-width='3' fill='none' stroke-linecap='round'/></svg>";
    return 'data:image/svg+xml;charset=utf8,'+encodeURIComponent(svg);
  }
  function img(e){ return suitPhoto((e&&e.lock)||0); }
  /* 찜(북마크) 아이콘 · onPhoto=사진 위(흰 반투명↔딥그린) / false=밝은 버튼 위(라인↔딥그린) */
  var BOOK_PATH='M6 3h12a1 1 0 0 1 1 1v17l-7-4.7L5 21V4a1 1 0 0 1 1-1z';
  function favIcon(on, onPhoto){ return '<svg class="bk'+(onPhoto?'':' lt')+(on?' on':'')+'" viewBox="0 0 24 24"><path d="'+BOOK_PATH+'"/></svg>'; }

  var EX=[
    {lock:32, nm:'소희', photo:'photos/p1.jpg', svc:'online', occ:['date','daily'], rating:4.9, price:120000, review:96, match:97, tags:['데일리룩','소개팅룩','미니멀'], mode:'온라인(비대면)', dur:'약 3일', bio:'데일리·소개팅룩 전문 스타일리스트<br>온라인 쇼핑몰 MD 출신으로<br>비대면 큐레이션이 강점이에요', reviews:[['비대면인데도 사이즈까지 딱 맞게 골라주셨어요','30세 · 소개팅룩'],['길게 설명 안 해도 취향을 바로 잡아주셔서 편했어요','27세 · 데일리']]},
    {lock:47, nm:'건형', photo:'photos/p2.jpg', svc:'image', occ:['interview'], rating:4.8, price:190000, review:74, match:90, tags:['면접룩','오피스','남성 그루밍'], mode:'오프라인 세션', dur:'세션 1회 · 약 2시간', bio:'남성 이미지 컨설턴트<br>면접·오피스 첫인상을<br>헤어부터 셔츠 핏까지 정돈해드려요', reviews:[['면접관 시선까지 짚어주셔서 자신감이 생겼어요','29세 · 면접']]},
    {lock:15, nm:'상민', photo:'photos/p3.jpg', svc:'shopping', occ:['wedding','interview'], rating:4.7, price:150000, review:58, match:86, tags:['포멀','하객룩','세미정장'], mode:'오프라인 동행', dur:'방문 1회 · 약 3시간', bio:'포멀·하객룩 동행 쇼핑 전문<br>매장을 함께 돌며 체형에 맞는<br>옷을 현장에서 골라드려요', reviews:[['혼자였으면 못 골랐을 옷을 잘 맞게 찾아주셨어요','34세 · 결혼식']]},
    {lock:52, nm:'지현', svc:'online', occ:['date','daily'], rating:4.8, price:98000, review:61, match:93, tags:['데일리','캐주얼','가성비'], mode:'온라인(비대면)', dur:'약 2일', bio:'가성비 데일리룩 큐레이터<br>합리적인 예산 안에서<br>실용적인 코디를 짜드려요', reviews:[['예산을 딱 지켜서 골라주셔서 좋았어요','26세 · 데일리']]},
    {lock:63, nm:'유나', svc:'online', occ:['date','wedding','daily'], rating:5.0, price:145000, review:38, match:95, tags:['여성복','하객룩','트렌디'], mode:'온라인(비대면)', dur:'약 3일', bio:'트렌디 여성 스타일링 전문<br>시즌 무드를 반영한<br>감각적인 큐레이션이 강점이에요', reviews:[['유행을 잘 녹여주면서 과하지 않았어요','28세 · 하객룩']]},
    {lock:71, nm:'세라', svc:'image', occ:['interview','wedding'], rating:4.9, price:175000, review:52, match:92, tags:['이미지','퍼스널컬러','포멀'], mode:'오프라인 세션', dur:'세션 1회 · 약 2시간', bio:'퍼스널컬러·이미지 컨설턴트<br>색과 실루엣으로 첫인상을<br>목적에 맞게 설계해드려요', reviews:[['퍼스널컬러까지 잡아주셔서 만족했어요','31세 · 면접']]},
    {lock:84, nm:'태오', svc:'shopping', occ:['daily','travel'], rating:4.6, price:130000, review:44, match:88, tags:['남성복','캐주얼','동행쇼핑'], mode:'오프라인 동행', dur:'방문 1회 · 약 2시간', bio:'남성 캐주얼 동행 쇼핑 전문<br>매장을 함께 돌며 핏에 맞는<br>데일리 아이템을 골라드려요', reviews:[['혼자 사면 실패했을 옷을 잘 잡아주셨어요','33세 · 데일리']]}
  ];

  /* ===== 로컬 저장소 (찜 · 요청 내역) ===== */
  function loadLS(k, def){ try{ var v=localStorage.getItem('fitting.'+k); return v?JSON.parse(v):def; }catch(e){ return def; } }
  function saveLS(k, v){ try{ localStorage.setItem('fitting.'+k, JSON.stringify(v)); }catch(e){} }
  var favs = loadLS('favs', [ {nm:'소희', svc:'online', rating:4.9, photo:'photos/p1.jpg'} ]);

  /* 입찰(역경매) 생성 — 오픈 요청에 서비스 유형이 맞는 쇼퍼들이 입찰.
     입찰은 EX 쇼퍼 풀을 단일 출처로 참조(idx)하고, 가격·메시지·예상기간만 요청별로 붙임.
     제출 시 1회 생성해 저장 → 재렌더에도 고정(랜덤 없이 결정적). */
  function makeBids(svc, occ){
    var oc=(occ&&occ[0])||'이번';
    var lines=[oc+' 코디, 체형·사이즈에 맞게 딱 잡아드릴게요', oc+' 자리에 맞춰 과하지 않게 정리해드릴게요', oc+' 첫인상 살리는 방향으로 제안드릴게요'];
    var deltas=[0, -0.12, 0.08];   // 기준가 대비 입찰가 변주
    var bids=[];
    for(var i=0;i<EX.length;i++){ if(EX[i].svc!==svc) continue; var k=bids.length;
      var price=Math.round(EX[i].price*(1+deltas[k%deltas.length])/1000)*1000;
      bids.push({idx:i, price:price, eta:EX[i].dur, msg:lines[k%lines.length]}); }
    return bids;
  }

  /* 데모 시드 버전 — 상태 모델이 바뀌었으니 옛 요청 데이터를 1회 자동 초기화(콘솔 리셋 불필요) */
  if(loadLS('reqsVer',0) < 7){ try{ localStorage.removeItem('fitting.reqs'); }catch(e){} saveLS('reqsVer',7); }
  var reqs = loadLS('reqs', [
    {nm:'상민', svc:'shopping', occ:['결혼식 하객'], budget:'10~15만', date:'2026.06.30', status:'대기'},
    {open:true, svc:'online', occ:['소개팅'], budget:'5~10만', date:'2026.07.02', status:'견적중', bids:makeBids('online',['소개팅'])},
    {nm:'건형', svc:'image',    occ:['면접·발표'],   budget:'15만+',   date:'2026.06.25', status:'수락'},
    {nm:'소희', svc:'online',   occ:['소개팅'],     budget:'5~10만',  date:'2026.06.20', status:'거절'}
  ]);
  /* 옛 상태 정리 — 지명 요청은 대기 → 수락/거절 뿐. 이전 데이터의 취소·제안도착·라이프사이클을 보정. */
  reqs.forEach(function(r){
    if(r.status==='취소') r.status='거절';
    if(r.status==='제안도착') r.status='대기';
    if(!r.open && (r.status==='진행중'||r.status==='완료'||r.status==='후기완료')) r.status='수락';
  });
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

  /* 마이페이지 · 프로필 아바타 — 진단 전=잉크블랙+이니셜 / 진단 후=결과 카드 캐릭터 얼굴 + 유형 색(bodytypes.json 단일 출처) */
  var USER={ name:'김도현', initial:'김', gender:'male', age:33, height:172, weight:68, fit:'슬림', type:'STR' };   // type:null = 진단 전
  var _btCache=null;
  function avatarFaceHTML(){ return '<div class="head '+USER.gender+'">'+(USER.gender==='female'?'<span class="longhair"></span>':'')+'<span class="face"></span><span class="cap"></span><span class="ey l"></span><span class="ey r"></span></div>'; }
  function renderMyAvatar(){
    var el=document.getElementById('myAv'); if(!el) return;
    if(!USER.type){ el.style.background='var(--ink)'; el.style.color='#fff'; el.textContent=USER.initial; return; }
    function paint(t){ if(!t){ el.style.background='var(--ink)'; el.textContent=USER.initial; return; } el.style.background=t.point; el.innerHTML=avatarFaceHTML(); }
    if(_btCache){ paint(_btCache[USER.type]); return; }
    fetch('data/bodytypes.json').then(function(r){return r.json();}).then(function(j){ _btCache={}; j.types.forEach(function(x){_btCache[x.code]=x;}); paint(_btCache[USER.type]); }).catch(function(){});
  }

  /* 마이페이지 · 프로필 기본정보 (읽기/편집) */
  var FIT_OPTS=['스키니','슬림','레귤러','루즈','오버'], _profEdit=false;
  function renderProfile(){
    var el=document.getElementById('profCard'); if(!el) return; var U=USER;
    if(!_profEdit){
      el.innerHTML='<div class="mcard">'+
        '<div class="msub"><div class="subhead">이름 <span class="pr half">◐ MVP</span></div>'+
          '<div class="field"><span>이름</span><span class="v">'+U.name+'</span></div></div>'+
        '<div class="msub"><div class="subhead">신체 정보 <span class="pr half">◐ MVP</span></div>'+
          '<div class="field"><span>성별 · 나이</span><span class="v">'+(U.gender==='female'?'여성':'남성')+' · <span class="num">'+U.age+'</span>세</span></div>'+
          '<div class="field"><span>키 · 몸무게</span><span class="v"><span class="num">'+U.height+'</span>cm · <span class="num">'+U.weight+'</span>kg</span></div>'+
          '<div class="note">🔒 민감정보 · 편집 시 재진단을 추천해요</div></div>'+
        '<div class="msub"><div class="subhead">선호 핏 <span class="pr half">◐ MVP</span></div>'+
          '<div class="field"><span>핏 취향</span><span class="v">'+U.fit+'</span></div></div>'+
        '</div><button class="btn" onclick="editProfile()">수정하기</button>';
    } else {
      el.innerHTML='<div class="mcard">'+
        '<div class="msub"><div class="subhead">이름</div>'+
          '<div class="field"><span>이름</span><span class="v">'+U.name+'</span></div></div>'+
        '<div class="msub"><div class="subhead">신체 정보</div>'+
          '<div class="pedit"><label>성별</label><div class="seg" id="pGender">'+['male','female'].map(function(g){return '<span class="o'+(U.gender===g?' on':'')+'" data-g="'+g+'" onclick="pPick(this)">'+(g==='male'?'남성':'여성')+'</span>';}).join('')+'</div></div>'+
          '<div class="pedit inrow3"><div><label>나이</label><input class="inp" id="pAge" type="number" value="'+U.age+'"></div><div><label>키(cm)</label><input class="inp" id="pHeight" type="number" value="'+U.height+'"></div><div><label>몸무게(kg)</label><input class="inp" id="pWeight" type="number" value="'+U.weight+'"></div></div>'+
          '<div class="note" style="color:var(--warn)">⚠️ 신체정보를 바꾸면 재진단을 추천해요</div></div>'+
        '<div class="msub"><div class="subhead">선호 핏</div>'+
          '<div class="pedit"><label>핏 취향</label><div class="seg" id="pFit">'+FIT_OPTS.map(function(f){return '<span class="o'+(U.fit===f?' on':'')+'" data-fit="'+f+'" onclick="pPick(this)">'+f+'</span>';}).join('')+'</div></div></div>'+
        '</div><div style="display:flex; gap:9px"><button class="btn" onclick="saveProfile()">저장하기</button><button class="btn ghost" onclick="cancelProfile()">취소</button></div>';
    }
  }
  function editProfile(){ _profEdit=true; renderProfile(); }
  function cancelProfile(){ _profEdit=false; renderProfile(); }
  function pPick(el){ var ch=el.parentNode.children; for(var i=0;i<ch.length;i++) ch[i].classList.remove('on'); el.classList.add('on'); }
  function saveProfile(){
    var g=document.querySelector('#pGender .o.on'); if(g) USER.gender=g.dataset.g;
    var a=document.getElementById('pAge'), h=document.getElementById('pHeight'), w=document.getElementById('pWeight');
    if(a&&a.value) USER.age=+a.value; if(h&&h.value) USER.height=+h.value; if(w&&w.value) USER.weight=+w.value;
    var f=document.querySelector('#pFit .o.on'); if(f) USER.fit=f.dataset.fit;
    _profEdit=false; renderProfile(); renderMyAvatar(); toast('프로필을 저장했어요');
  }

  /* 마이페이지 · 즐겨찾기 렌더 */
  function renderFavs(){
    var el=document.getElementById('favList'); if(!el) return;
    if(!favs.length){ el.innerHTML='<p class="note" style="grid-column:1/-1">아직 찜한 쇼퍼가 없어요 · 쇼퍼찾기에서 🤍 를 눌러 담아보세요</p>'; return; }
    el.innerHTML=favs.map(function(f){
      return '<div class="fcard"><div class="cov" style="background-image:url(\''+(f.photo||'')+'\'); background-size:cover; background-position:center"><span class="heart" title="즐겨찾기 해제" onclick="toggleFav(\''+f.nm+'\')">'+favIcon(true,true)+'</span></div>'+
        '<div class="fb"><b>'+f.nm+' 쇼퍼</b><small>'+svcLabel(f.svc)+' · ★ <span class="num">'+f.rating+'</span></small></div></div>';
    }).join('');
  }
  /* 마이페이지 · 코디 요청 내역 렌더 (라이프사이클) */
  function stClass(s){ return (s==='완료'||s==='후기완료')?'done':(s==='진행중'||s==='수락'?'prog':(s==='견적중'?'offer':(s==='거절'||s==='취소함'?'cancel':'wait'))); }
  function statusLabel(s){ return s==='견적중'?'견적 받는 중':(s==='후기완료'?'후기 완료':(s==='수락'?'수락됨':(s==='거절'?'거절됨':(s==='대기'?'응답 대기':s)))); }
  function starsRO(n){ var s=''; for(var k=1;k<=5;k++) s+='<span style="color:'+(k<=n?'var(--ink)':'var(--line2)')+'">★</span>'; return s; }
  function reviewForm(r,i){ var rt=r._rating||5, st='';
    for(var k=1;k<=5;k++) st+='<span class="'+(k<=rt?'on':'')+'" onclick="setStar('+i+','+k+')">★</span>';
    return '<div class="reqact"><div class="reviewform"><div class="stars">'+st+'</div><textarea class="rtext" id="rtext'+i+'" placeholder="쇼퍼와의 경험을 남겨주세요">'+(r._text||'')+'</textarea><div class="rbtns"><button class="tinybtn ghost" onclick="cancelReview('+i+')">취소</button><button class="tinybtn" onclick="submitReview('+i+')">후기 등록</button></div></div></div>';
  }
  function reqAction(r,i){ var s=r.status;
    if(s==='견적중'){ var n=(r.bids||[]).length;
      if(!n) return '<div class="reqact"><span>견적을 받는 중이에요 · 쇼퍼들이 견적을 준비하고 있어요</span></div>';
      return '<div class="reqact"><div class="offerbox"><b>견적 <span class="num">'+n+'</span>개 도착</b><div class="omsg">여러 쇼퍼가 견적을 보냈어요 · 비교하고 선택하세요</div></div><button class="tinybtn" style="margin-left:auto" onclick="openBids('+i+')">받은 견적 보기 →</button></div>'; }
    if(s==='대기') return '<div class="reqact"><span>쇼퍼가 요청을 검토하고 있어요 · 응답을 기다리는 중</span><button class="tinybtn ghost" style="margin-left:auto" onclick="confirmCancel('+i+')">요청 취소</button></div>'+
      '<div class="reqact" style="background:none; padding:10px 2px 0"><span class="muted" style="font-size:11.5px">데모 · 쇼퍼 응답 시뮬레이션</span><div class="obtns" style="margin-left:auto"><button class="tinybtn ghost" onclick="reqReject('+i+')">거절</button><button class="tinybtn" onclick="reqAccept('+i+')">수락</button></div></div>';
    if(s==='취소함') return '<div class="reqact"><span class="muted">요청을 취소했어요</span></div>';
    if(s==='수락') return '<div class="reqact"><span><b style="color:var(--green)">요청 수락되었어요!</b> 이제 쇼퍼와 코디를 진행해요</span></div>';
    if(s==='진행중') return '<div class="reqact"><span><b style="color:var(--green)">요청 수락되었어요!</b> 완료되면 후기를 남겨주세요</span><button class="tinybtn ghost" style="margin-left:auto" onclick="reqComplete('+i+')">완료 처리 · 데모</button></div>';
    if(s==='완료'){ if(r._reviewing) return reviewForm(r,i); return '<div class="reqact"><span>서비스가 완료됐어요 · 어떠셨나요?</span><button class="tinybtn" style="margin-left:auto" onclick="openReviewForm('+i+')">후기 작성하기</button></div>'; }
    if(s==='후기완료'){ var rv=r.review||{}; return '<div class="reqact"><div class="revshow"><span class="starsRO">'+starsRO(rv.rating||5)+'</span> <span class="rtx">"'+(rv.text||'')+'"</span></div></div>'; }
    if(s==='거절') return '<div class="reqact"><span class="muted">아쉽게도 요청이 거절되었어요!</span><button class="tinybtn ghost" style="margin-left:auto" onclick="closeBids();go(\'shop\')">다른 쇼퍼 찾기</button></div>';
    return '';
  }
  /* 요청 카드 1개 (원본 reqs 인덱스 i 유지 — 액션 핸들러가 참조) */
  function reqCard(r,i){
    if(r.kind==='notify') return '<div class="req"><div class="reqtop"><div class="ic"></div><div class="info"><b>1기 오픈 알림 신청</b><small>'+svcLabel(r.svc)+' · 오픈 대기</small></div><span class="st wait">대기</span></div></div>';
    var cls = r.open ? 'open' : 'named';
    var title = (r.open && r.nm ? '선택 · '+r.nm+' 쇼퍼' : (r.nm ? r.nm+' 쇼퍼' : '오픈 요청')) + ' · ' + svcLabel(r.svc);
    var sub = [(r.occ&&r.occ.length?r.occ.join('·'):''), (r.date||'')].filter(Boolean).join(' · ');
    return '<div class="req '+cls+'"><div class="reqtop"><div class="ic"></div><div class="info"><b>'+title+'</b><small>'+sub+'</small></div><span class="st '+stClass(r.status)+'">'+statusLabel(r.status)+'</span></div>'+reqAction(r,i)+'</div>';
  }
  /* 섹션 아이콘 — 딥그린 모노라인 SVG(currentColor로 색 상속) */
  var ICON_RECV='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/><path d="M8 11l4 4 4-4"/><path d="M12 3.5v11.5"/></svg>';
  var ICON_SENT='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 4L3 11l7 2.5L12.5 21 21 4z"/><path d="M10 13.5L21 4"/></svg>';
  var ICON_BELL='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.5 21a1.9 1.9 0 0 1-3 0"/></svg>';

  /* '받은 견적' 컴팩트 카드 (숨고형) — 요약(날짜·상황·서비스) + 견적 건수 클릭 → 받은 견적 오버레이.
     진행 상태·후기는 카드에 붙이지 않고 오버레이 안에서 처리(카드는 깔끔하게 유지). */
  function reqCardOpen(r,i,xc){
    var n=(r.bids||[]).length;
    var top = statusLabel(r.status) + (r.date?' · '+r.date+' 요청':'');
    var title = [(r.occ&&r.occ.length?r.occ.join('·'):''), svcLabel(r.svc)].filter(Boolean).join(' · ') || '코디 요청';
    return '<div class="reqrow open'+(xc?' '+xc:'')+'" onclick="openBids('+i+')">'+
        '<div class="reqrow-l"><div class="reqrow-top">'+top+'</div><div class="reqrow-title">'+title+'</div></div>'+
        '<div class="reqrow-r"><b>견적 <span class="num">'+n+'</span>개</b><span class="chev">›</span></div>'+
      '</div>';
  }
  /* '내가 보낸 fit 요청'(지명) 컴팩트 카드 — 쇼퍼·서비스·상황·날짜 + 화살표 → 상세 */
  function reqCardNamed(r,i,xc){
    var top = (r.date?r.date+' 요청':'요청');
    var title = [(r.nm?r.nm+' 쇼퍼':'쇼퍼'), svcLabel(r.svc), (r.occ&&r.occ.length?r.occ.join('·'):'')].filter(Boolean).join(' · ');
    return '<div class="reqrow named'+(xc?' '+xc:'')+'" onclick="openReqDetail('+i+')">'+
        '<div class="reqrow-l"><div class="reqrow-top">'+top+'</div><div class="reqrow-title">'+title+'</div></div>'+
        '<div class="reqrow-r"><span class="st '+stClass(r.status)+'">'+statusLabel(r.status)+'</span><span class="chev">›</span></div>'+
      '</div>';
  }
  /* 받은 견적(오픈) vs 지명 요청을 그룹으로 갈라 렌더 */
  function renderReqs(){
    var el=document.getElementById('reqList'); if(!el) return;
    var open=[], named=[], notify=[];
    reqs.forEach(function(r,i){ if(r.kind==='notify') notify.push(i); else if(r.open) open.push(i); else named.push(i); });
    function isActive(s){ return s==='견적중'||s==='대기'||s==='진행중'||s==='수락'; }
    function group(ids, cls, icon, label, cardFn, desc, emptyLink){
      var act=[], past=[];
      ids.forEach(function(i){ (isActive(reqs[i].status)?act:past).push(i); });
      var body;
      if(!ids.length){ body='<p class="rgempty">'+emptyLink+'</p>'; }
      else {   // 진행 중(초록 강조) / 지난 요청(흐리게)으로 항상 분리 — 받은 견적·보낸 요청 동일
        body='';
        if(act.length) body+='<div class="substat active">진행 중</div>'+act.map(function(i){ return cardFn(reqs[i],i,'active'); }).join('');
        if(past.length) body+='<div class="substat past">지난 요청</div>'+past.map(function(i){ return cardFn(reqs[i],i,'past'); }).join('');
      }
      return '<div class="reqgroup"><div class="rghead '+cls+'"><span class="rgicon">'+icon+'</span>'+
        '<div class="rgtx"><b>'+label+'</b><p>'+desc+'</p></div>'+
        '<span class="rgcount"><span class="num">'+ids.length+'</span>건</span></div>'+
        '<div class="rglist">'+body+'</div></div>';
    }
    var html =
      group(open,'open',ICON_RECV,'받은 견적', reqCardOpen, '여러 쇼퍼가 보낸 견적 · 비교하고 선택',
        '아직 없어요 · <a onclick="go(\'shop\');openMatch()">견적 요청 보내기</a>') +
      group(named,'named',ICON_SENT,'보낸 요청', reqCardNamed, '내가 지명한 쇼퍼에게 직접 · 진행 확인',
        '아직 없어요 · <a onclick="go(\'shop\')">쇼퍼 찾아 요청하기</a>');
    if(notify.length) html += '<div class="reqgroup"><div class="rghead alert"><span class="rgicon">'+ICON_BELL+'</span>'+
      '<div class="rgtx"><b>오픈 알림 신청</b><p>서비스가 열리면 알려드려요</p></div>'+
      '<span class="rgcount"><span class="num">'+notify.length+'</span>건</span></div>'+
      '<div class="rglist">'+notify.map(function(i){ return reqCard(reqs[i],i); }).join('')+'</div></div>';
    el.innerHTML = html;
  }
  /* 요청 라이프사이클 액션 (목업) — 지명 요청: 대기 → 수락(진행중→완료→후기) / 거절 */
  function reqAccept(i){ reqs[i].status='수락'; saveLS('reqs',reqs); syncReqViews(); toast('요청 수락되었어요!'); }
  function reqReject(i){ reqs[i].status='거절'; saveLS('reqs',reqs); syncReqViews(); toast('아쉽게도 요청이 거절되었어요!'); }
  function reqCancel(i){ reqs[i].status='취소함'; saveLS('reqs',reqs); syncReqViews(); toast('요청을 취소했어요'); }
  function reqComplete(i){ reqs[i].status='완료'; saveLS('reqs',reqs); syncReqViews(); toast('서비스가 완료됐어요 · 후기를 남겨보세요'); }
  function captureReview(i){ var ta=document.getElementById('rtext'+i); if(ta) reqs[i]._text=ta.value; }
  function openReviewForm(i){ reqs[i]._reviewing=true; reqs[i]._rating=reqs[i]._rating||5; syncReqViews(); }
  function cancelReview(i){ captureReview(i); reqs[i]._reviewing=false; syncReqViews(); }
  function setStar(i,n){ captureReview(i); reqs[i]._rating=n; syncReqViews(); }
  function submitReview(i){ captureReview(i); var r=reqs[i]; r.review={rating:r._rating||5, text:(r._text||'').trim()||'만족스러웠어요'}; r.status='후기완료'; r._reviewing=false; delete r._text; delete r._rating; saveLS('reqs',reqs); syncReqViews(); toast('후기를 등록했어요 · 감사합니다'); }

  /* ===== 입찰 비교·낙찰 (IA 1.3.8 · 역경매) =====
     오픈 요청에 들어온 여러 입찰을 비교(정렬)하고 하나를 낙찰 → 진행중으로 넘어가며
     나머지 입찰은 자동 탈락. 입찰 데이터는 요청(reqs[i].bids)에 고정 저장됨. */
  var _bidReq=-1, _ovMode=null;
  function showOverlay(){ document.getElementById('bidsOverlay').classList.add('on'); document.body.style.overflow='hidden'; }
  function openBids(i){ _bidReq=i; _ovMode='bids'; renderBids(); showOverlay(); }              // 받은 견적(오픈)
  function openReqDetail(i){ _bidReq=i; _ovMode='req'; renderReqDetail(); showOverlay(); }     // 보낸 요청 상세(지명)
  function closeBids(){ _ovMode=null; document.getElementById('bidsOverlay').classList.remove('on'); document.body.style.overflow=''; }
  /* 요청 상태가 바뀌면 목록 + (열려있으면) 오버레이를 함께 갱신 */
  function syncReqViews(){ renderReqs(); if(_ovMode && document.getElementById('bidsOverlay').classList.contains('on')){ _ovMode==='req'?renderReqDetail():renderBids(); } }
  /* 내가 보낸 요청 내용 요약(오픈: 토글 · 지명: 상세에 상시 노출) */
  function reqSummaryHTML(r){
    var rows=[['서비스 유형', svcLabel(r.svc)], ['상황', (r.occ&&r.occ.length?r.occ.join(' · '):'—')], ['예산', r.budget||'—'], ['희망 일정', r.date||'—'], ['요청 메모', (r.note&&(''+r.note).trim())?r.note:'—']];
    return '<div class="req-summary-in">'+rows.map(function(x){ return '<div class="rs-row"><span>'+x[0]+'</span><b>'+x[1]+'</b></div>'; }).join('')+
      '<div class="rs-note">📎 내 체형·사이즈 프로필이 함께 전달됐어요</div></div>';
  }
  function toggleReqSummary(btn){ var p=document.getElementById('reqSummaryPanel'); if(!p) return; var on=p.classList.toggle('on'); var tg=btn.querySelector('.tg'); if(tg) tg.textContent=on?'▴':'▾'; }
  /* 지명 요청 상세 — 쇼퍼 + 요청 내용 + 진행 상태(라이프사이클 액션) */
  function renderReqDetail(){
    var r=reqs[_bidReq]; if(!r){ closeBids(); return; }
    var e=EX.filter(function(x){return x.nm===r.nm;})[0];
    var sub=[(r.date?r.date+' 요청':''), statusLabel(r.status)].filter(Boolean).join(' · ');
    var matched = (r.status==='수락'||r.status==='진행중');
    var shopper = e ? '<div class="rq-shopper'+(matched?' matched':'')+'">'+(matched?'<span class="rq-matched">✓ 매칭 완료</span>':'')+'<img class="rq-ph" src="'+img(e)+'" alt="" onerror="'+FB+'"><div class="rq-info"><div class="rq-nm">'+e.nm+' 쇼퍼</div><div class="rq-svc">'+svcLabel(r.svc)+' · ★ <span class="num">'+e.rating+'</span> · 매칭도 '+e.match+'%</div></div><button class="tinybtn ghost" onclick="detailFromReq('+EX.indexOf(e)+','+_bidReq+',\'req\')">프로필</button></div>' : '';
    var head='<div class="bids-head"><button class="xbtn" onclick="closeBids()">✕</button>'+
      '<span class="reqtype open">요청 결과</span><h2>보낸 요청</h2><p>'+sub+'</p></div>';
    document.getElementById('bidsBody').innerHTML = head + shopper +
      '<div class="rq-sec"><div class="rq-h">진행 상태</div>'+reqAction(r,_bidReq)+'</div>'+
      '<div class="rq-sec"><div class="rq-h">요청 내용</div>'+reqSummaryHTML(r)+'</div>';
  }
  function renderBids(){
    var r=reqs[_bidReq]; if(!r){ closeBids(); return; }
    var bids=(r.bids||[]).slice();
    bids.sort(function(a,b){ return EX[b.idx].match-EX[a.idx].match; });   // 매칭도 높은 순 고정
    var sub=[svcLabel(r.svc), (r.occ&&r.occ.length?r.occ.join('·'):''), (r.budget?'예산 '+r.budget:''), (r.date||'')].filter(Boolean).join(' · ');
    var head='<div class="bids-head"><button class="xbtn" onclick="closeBids()">✕</button>'+
      '<span class="reqtype open">견적 요청 결과</span><h2>받은 견적</h2>'+
      '<p><b class="num">'+bids.length+'</b>명의 쇼퍼가 견적을 보냈어요 · '+sub+'</p>'+
      '<button class="req-toggle" onclick="toggleReqSummary(this)">내가 보낸 요청 내용 <span class="tg">▾</span></button>'+
      '<div class="req-summary" id="reqSummaryPanel">'+reqSummaryHTML(r)+'</div></div>';
    var awardedIdx = (r.awarded && typeof r.awarded.idx!=='undefined') ? r.awarded.idx : null;
    var canPick = (r.status==='견적중');   // 취소·진행중이면 더 이상 쇼퍼 선택 불가
    var cards=bids.map(function(b){ var e=EX[b.idx];
      var isSel=(awardedIdx===b.idx);
      var badges=(isSel?'<span class="q-sel">✓ 매칭 완료</span>':'');
      var action = isSel ? '<button class="tinybtn" disabled style="opacity:.55;cursor:default">진행 중 ✓</button>'
                 : (canPick ? '<button class="tinybtn" onclick="confirmAward('+b.idx+')">진행하기</button>' : '');
      return '<div class="qcard'+(isSel?' sel':'')+'">'+
        '<div class="q-l">'+
          '<div class="q-top"><img class="q-ph" src="'+img(e)+'" alt="" onerror="'+FB+'"><div class="q-nm">'+e.nm+' 쇼퍼</div>'+badges+'</div>'+
          '<div class="q-price">총 <span class="num">'+b.price.toLocaleString()+'</span>원</div>'+
          '<div class="q-meta">★ <span class="num">'+e.rating+'</span> ('+e.review+') · 매칭도 <b>'+e.match+'%</b> · '+svcLabel(r.svc)+' · '+(b.eta||'')+'</div>'+
          '<div class="q-tags">'+e.tags.map(function(t){return '<span>'+t+'</span>';}).join('')+'</div>'+
          '<div class="q-msg">"'+b.msg+'"</div>'+
        '</div>'+
        '<div class="q-r"><button class="tinybtn ghost" onclick="detailFromReq('+b.idx+','+_bidReq+',\'bids\')">프로필 보기</button>'+action+'</div>'+
      '</div>'; }).join('');
    var lifecycle = (r.status!=='견적중') ? '<div class="rq-sec"><div class="rq-h">진행 상태</div>'+reqAction(r,_bidReq)+'</div>' : '';
    var cancel = (r.status==='견적중') ? '<div class="bids-cancel"><button onclick="confirmCancel('+_bidReq+')">이 견적 요청 취소하기</button></div>' : '';
    document.getElementById('bidsBody').innerHTML=head+lifecycle+'<div class="bids-list">'+cards+'</div>'+cancel;
  }
  /* 쇼퍼 선택은 되돌릴 수 없으므로 확인 모달 후 확정 */
  function confirmAward(idx){ var e=EX[idx];
    askConfirm('<b>'+e.nm+' 쇼퍼</b>로 진행할까요?<div class="cf-sub">진행하면 바로 쇼퍼와 매칭돼요</div>', '진행하기', function(){ awardBid(idx); }); }
  function awardBid(idx){ var r=reqs[_bidReq]; if(!r) return; var e=EX[idx];
    var win=(r.bids||[]).filter(function(b){return b.idx===idx;})[0];
    r.nm=e.nm; r.status='진행중'; r.awarded={idx:idx, price:win?win.price:e.price};
    saveLS('reqs',reqs); closeBids(); renderReqs(); toast(e.nm+' 쇼퍼로 진행해요 · 코디를 시작할게요');
  }
  /* 공용 확인 모달 */
  function askConfirm(msg, yesLabel, onYes, noLabel){
    document.getElementById('confirmMsg').innerHTML=msg;
    var n=document.getElementById('confirmNo'); if(n) n.textContent=noLabel||'취소하기';
    var y=document.getElementById('confirmYes'); y.textContent=yesLabel||'확인';
    y.onclick=function(){ closeConfirm(); if(onYes) onYes(); };
    document.getElementById('confirmModal').classList.add('on');
  }
  function closeConfirm(){ document.getElementById('confirmModal').classList.remove('on'); }
  /* 요청/견적 취소도 되돌릴 수 없으므로 재차 확인 */
  function confirmCancel(i){ var r=reqs[i]; if(!r) return; var isOpen=!!r.open;
    var msg = isOpen ? '이 견적 요청을 취소할까요?<div class="cf-sub">받은 견적이 모두 사라져요</div>'
                     : '이 요청을 취소할까요?<div class="cf-sub">쇼퍼에게 보낸 요청이 취소돼요</div>';
    askConfirm(msg, '취소하기', function(){ if(isOpen) closeBids(); reqCancel(i); }, '돌아가기');
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

  /* 자세히 보기 → 쇼퍼 상세 (탭 내 화면 전환)
     hideReq=요청내역에서 진입(견적 요청 버튼 숨김) · _detailBack=뒤로가기 시 돌아갈 이전 화면 */
  var _detailBack=null;
  function backFromDetail(){ if(_detailBack){ var f=_detailBack; _detailBack=null; f(); } else showOnly('listView'); }
  /* 쇼퍼 상세 본문 — 페이지(detailView)와 요청 오버레이(bidsBody) 공용.
     opts.hideReq=견적 요청 버튼 숨김 · opts.back=뒤로 onclick · opts.fav=즐겨찾기 onclick */
  function detailBodyHTML(idx, opts){ var e=EX[idx];
    var rt=e.rating>0?('★ '+e.rating+' · 후기 '+e.review+'건'):'신규 쇼퍼';
    var revs=e.reviews.length ? e.reviews.map(function(r){return '<div class="rev">"'+r[0]+'"<div class="who">— '+r[1]+'</div></div>';}).join('') : '<div class="noreview">아직 등록된 후기가 없어요</div>';
    return '<a class="back" onclick="'+opts.back+'">← 뒤로</a>'+
      '<div class="dhero"><div class="dhero-img"><img src="'+img(e)+'" onerror="'+FB+'"></div>'+
      '<div class="dhero-info"><span class="dsvc">'+SVC[e.svc]+'</span>'+
      '<div class="dnamerow"><h1>'+e.nm+' 쇼퍼</h1><div class="dmeta"><b>매칭도 '+e.match+'%</b> · '+rt+'</div></div>'+
      '<div class="tagrow" style="margin-top:16px">'+e.tags.map(function(t){return '<span>'+t+'</span>';}).join('')+'</div>'+
      '<p class="dbio">'+e.bio+'</p>'+
      '<div style="display:flex; gap:9px; flex-wrap:wrap; margin-top:22px">'+
      (opts.hideReq?'':'<button class="btn" onclick="requestFor('+idx+')">이 쇼퍼에게 견적 요청하기 →</button>')+
      '<button class="btn ghost" onclick="'+opts.fav+'">'+favIcon(isFav(e.nm),false)+' '+(isFav(e.nm)?'즐겨찾기 해제':'즐겨찾기 추가')+'</button>'+
      '</div></div></div>'+
      '<div class="dsecs">'+
        '<div class="dsec"><h3>서비스 정보</h3><div class="svcinfo"><div class="r"><span>서비스</span><b>'+SVC[e.svc]+'</b></div><div class="r"><span>예상 가격</span><b>'+e.price.toLocaleString()+'원</b></div><div class="r"><span>제공 방식</span><b>'+e.mode+'</b></div><div class="r"><span>예상 기간</span><b>'+e.dur+'</b></div></div></div>'+
        '<div class="dsec"><h3>후기'+(e.rating>0?' <span class="dsec-score">★ '+e.rating+' · '+e.review+'건</span>':'')+'</h3>'+revs+'</div>'+
        '<div class="dsec"><h3>포트폴리오</h3><div class="dgal">'+[1,2,3,4,5,6].map(function(i){return '<div style="background-image:url(\'photos/folio'+i+'.jpg\')"></div>';}).join('')+'</div></div>'+
      '</div>';
  }
  /* 쇼퍼찾기 탭 내 상세 페이지 (목록에서 진입) */
  function openDetail(idx, hideReq){ hideReq=!!hideReq; if(!hideReq) _detailBack=null; closeAll();
    document.getElementById('detailView').innerHTML = detailBodyHTML(idx, {hideReq:hideReq, back:'backFromDetail()', fav:'toggleFav(\''+EX[idx].nm+'\');openDetail('+idx+','+(hideReq?1:0)+')'});
    showOnly('detailView');
  }
  /* 요청 오버레이 안에서 쇼퍼 상세 — 탭 전환·폭 점프 없이 같은 자리에서 (뒤로=요청으로 복귀) */
  function overlayDetail(idx){
    document.getElementById('bidsBody').innerHTML = detailBodyHTML(idx, {hideReq:true, back:'reopenOverlay()', fav:'toggleFav(\''+EX[idx].nm+'\');overlayDetail('+idx+')'});
    window.scrollTo({top:0});
  }
  function reopenOverlay(){ _ovMode==='req'?renderReqDetail():renderBids(); window.scrollTo({top:0}); }
  function detailFromReq(idx, reqIdx, mode){ _bidReq=reqIdx; _ovMode=mode; overlayDetail(idx); showOverlay(); }
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
      '<a class="back" onclick="openDetail('+idx+')">← 뒤로</a>'+
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
      '<h1>오픈 요청 <span class="reqtype open">여러 견적</span></h1><p class="lead">조건을 남기면 <b style="color:var(--ink)">여러 쇼퍼가 견적</b>을 보내요 · 가격·제안을 비교해 마음에 드는 쇼퍼를 선택하세요 · 체형·사이즈 프로필도 함께 전달돼요</p>'+
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
    var isOpen = !curReq.nm;   // 지명(쇼퍼 선택) 아니면 오픈 요청(여러 쇼퍼 견적)
    if(isOpen) addReq({open:true, svc:curReq.svc, occ:occ, budget:budget, date:date, note:note, status:'견적중', bids:makeBids(curReq.svc, occ)});
    else       addReq({nm:curReq.nm, svc:curReq.svc, occ:occ, budget:budget, date:date, note:note, status:'대기'});
    document.getElementById('requestView').innerHTML=
      '<div class="reqdone"><div class="cc">✓</div>'+
      '<h1>'+(isOpen?'오픈 요청을 보냈어요':'견적 요청을 보냈어요')+'</h1>'+
      '<p>'+(isOpen?'조건에 맞는 여러 쇼퍼가 견적을 보내드려요<br>마이페이지에서 <b>비교하고 선택</b>할 수 있어요':(curReq.nm+' 쇼퍼가 검토하고 제안(견적)을 보내드려요<br>진행 상황은 마이페이지에서 볼 수 있어요'))+'</p>'+
      '<div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin-top:26px">'+
        '<button class="btn ghost" onclick="showOnly(\'listView\')">목록으로 돌아가기</button>'+
        '<button class="btn" onclick="goMy(\'mp-req\')">마이페이지로 이동하기</button>'+
      '</div></div>';
    showOnly('requestView');
  }

  /* ===== 전역 이벤트 ===== */
  document.addEventListener('click', closeDD);
  document.addEventListener('keydown', function(e){ if(e.key==='Escape'){ closeConfirm(); closeAll(); closeDD(); closeBids(); } });
  /* 외부 화면에서 #home·#shop·#my 로 돌아오면 해당 탭 열기 */
  (function(){ var h=(location.hash||'').replace('#',''); if(['home','shop','my'].indexOf(h)>=0) go(h); })();

  render(); renderFavs(); renderReqs(); renderMyAvatar(); renderProfile();

  /* ================= 홈 (줄자 리디자인) 인터랙션 — _home2 이식 ================= */
  (function(){
    var RM=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var home=document.getElementById('home'); if(!home) return;
    var $=function(id){return document.getElementById(id);};

    /* 1) 히어로 줄자 — cm·kg 측정 */
    (function(){
      var marker=$('hMarker'), cm=$('hCm'), kg=$('hKg'), tag=$('hMtag'); if(!marker) return;
      var TO_CM=172, TO_KG=68, posEnd=((TO_CM-150)/40)*100;
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
