  /* ===== 탭 전환 (셸) ===== */
  function go(id, el){
    if(id==='my' && !loggedIn()){ openLogin('마이페이지', function(){ go('my'); }); return; }   // 비로그인 My 접근 차단(로그인 게이트)
    document.querySelectorAll('.page').forEach(p=>p.classList.toggle('on', p.id===id));
    document.querySelectorAll('.menu a').forEach(a=>a.classList.toggle('on', a.dataset.t===id));
    if(id==='shop') showOnly('listView');   // 스타일리스트찾기는 항상 목록부터
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
  function loginDone(){ saveLS('auth', true); closeAll(); applyAuthUI(); var cb=window._loginCb; window._loginCb=null; if(cb){ toast('로그인했어요 · 이어서 진행할게요'); cb(); } else toast('로그인했어요 · 결과가 계정에 저장됐어요'); }
  function loggedIn(){ return loadLS('auth', true)!==false; }   // 기본 '로그인됨' 가정 (명시적 로그아웃 시에만 false)
  /* 헤더 auth 상태 반영 — 로그인=프로필·알림벨 / 비로그인=로그인·회원가입 버튼(메인화면 게이트) */
  function applyAuthUI(){
    var inA=loggedIn();
    var a=document.getElementById('navAuth'), u=document.getElementById('navUser'), b=document.getElementById('navBell'), bd=document.getElementById('navBellDiv'), my=document.getElementById('navMy');
    if(a) a.style.display=inA?'none':'inline-flex';
    if(u) u.style.display=inA?'inline-flex':'none';
    if(b) b.style.display=inA?'inline-flex':'none';
    if(bd) bd.style.display=inA?'inline-block':'none';
    if(my) my.style.display=inA?'':'none';   // 비로그인 시 My(개인 데이터·진단·요청) 숨김
  }
  function doLogout(){ if(!confirm('로그아웃할까요? 둘러보기는 로그인 없이 이어갈 수 있어요.')) return;
    saveLS('auth', false); applyAuthUI(); go('home'); toast('로그아웃했어요'); }
  function doQuit(){ if(!confirm('정말 회원 탈퇴할까요? 진단·요청·저장 데이터가 모두 삭제돼요.')) return;
    ['user','reqs','favs','support','notis'].forEach(function(k){ try{ localStorage.removeItem('fitting.'+k); }catch(e){} });
    try{ sessionStorage.clear(); }catch(e){}
    saveLS('auth', false);   // 기본값이 true라 '제거'가 아닌 false 저장해야 탈퇴 후 비로그인 유지
    applyAuthUI(); toast('회원 탈퇴가 완료됐어요'); setTimeout(function(){ location.reload(); }, 900); }

  /* ===== 마이페이지 사이드 네비 ===== */
  function myNav(el){
    var m=document.querySelectorAll('#smenu a'); for(var i=0;i<m.length;i++) m[i].classList.remove('on'); el.classList.add('on');
    var ps=document.querySelectorAll('#my .mpanel'); for(var j=0;j<ps.length;j++) ps[j].classList.remove('on');
    document.getElementById(el.dataset.p).classList.add('on');
  }
  function goMy(panel){ go('my'); var a=document.querySelector('#smenu a[data-p="'+panel+'"]'); if(a) myNav(a); }

  /* =========================================================
     스타일리스트찾기 (source: idea/데모/스타일리스트찾기_상세.html 이식)
     1.2 둘러보기(검색·정렬·필터) + 1.3 견적요청 + 1.3.7 결과
     찜·요청 상태는 localStorage에 저장 → 마이페이지와 연동
     ========================================================= */
  var SVC={online:'온라인 스타일링', shopping:'동행 쇼핑', image:'이미지 컨설팅'};
  var SVCSHORT={online:'온라인', shopping:'동행', image:'이미지'};   // 카드 배지용 짧은 라벨
  var SVCI={online:'💻', shopping:'🛍️', image:'✨'};
  /* 서비스 유형 아이콘 — 섹션 아이콘과 동일 톤(딥그린 모노라인, currentColor 상속) */
  var SVCI_SVG={
    online:'<rect x="2.5" y="5" width="19" height="11" rx="1.6"/><path d="M8.5 20h7"/><path d="M12 16v4"/>',
    shopping:'<path d="M6 7.5h12l-1 12.5H7L6 7.5z"/><path d="M9.3 7.5V6a2.7 2.7 0 0 1 5.4 0v1.5"/>',
    image:'<path d="M12 3.6l1.6 4.5 4.5 1.6-4.5 1.6L12 15.8l-1.6-4.5L5.9 9.7l4.5-1.6L12 3.6z"/><path d="M18.6 13.8v2.2M19.7 14.9h-2.2"/>'
  };
  function svcIcon(v){ return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+(SVCI_SVG[v]||'')+'</svg>'; }
  /* 상황(=스타일리스트 전문분야, 고객 화면 라벨) — 7가지 확정 (docs/스타일리스트-데이터-계약.md) */
  var OCC={date:'소개팅·데이트', interview:'면접·발표', wedding:'결혼식 하객', travel:'여행', daily:'데일리 스타일링', personal:'퍼스널 스타일링', bodycover:'체형 커버 스타일링'};
  var BUD={b1:'~5만', b2:'5~10만', b3:'10~15만', b4:'15만+'};
  function budOf(p){ return p<50000?'b1':(p<=100000?'b2':(p<=150000?'b3':'b4')); }
  var FB="this.onerror=null;";
  /* 스타일리스트 프로필 이미지 — 외부 랜덤 사진 대신 일관된 '수트 입은 여성' 플랫 일러스트(SVG data URI).
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

  /* 서비스 제공 방식(타입 고정) — 데이터 계약(docs/스타일리스트-데이터-계약.md §2) */
  var SMODE={online:'비대면', shopping:'대면', image:'대면'};   // 제공 방식(타입 고정) · 대면이면 활동지역
  /* 스타일리스트 = 다중 서비스(services[{type,price,dur,regions?}]). 코드 image로 통일 */
  var EX=[
    {lock:32, nm:'소희', photo:'photos/p1.jpg', occ:['date','daily','personal'], rating:4.9, review:12, match:97, tags:['미니멀','캐주얼','시크'],
      services:[{type:'online',price:90000},{type:'shopping',price:130000,regions:['서울 강남','서울 마포']},{type:'image',price:110000,regions:['서울 강남','서울 마포']}],
      bio:'데일리·소개팅룩 전문 스타일리스트<br>온라인 쇼핑몰 MD 출신으로<br>비대면 큐레이션이 강점이에요', reviews:[['비대면인데도 사이즈까지 딱 맞게 골라주셨어요','30세 · 소개팅룩'],['길게 설명 안 해도 취향을 바로 잡아주셔서 편했어요','27세 · 데일리']]},
    {lock:47, nm:'건형', photo:'photos/p2.jpg', occ:['interview','bodycover'], rating:4.8, review:9, match:90, tags:['클래식','시크','미니멀'],
      services:[{type:'image',price:190000,regions:['서울 강남','서울 종로']}],
      bio:'남성 이미지 컨설턴트<br>면접·오피스 첫인상을<br>헤어부터 셔츠 핏까지 정돈해드려요', reviews:[['면접관 시선까지 짚어주셔서 자신감이 생겼어요','29세 · 면접']]},
    {lock:15, nm:'상민', photo:'photos/p3.jpg', occ:['wedding','interview'], rating:4.7, review:7, match:86, tags:['클래식','시크','빈티지'],
      services:[{type:'shopping',price:150000,regions:['서울 종로','경기 성남']}],
      bio:'포멀·하객룩 동행 쇼핑 전문<br>매장을 함께 돌며 체형에 맞는<br>옷을 현장에서 골라드려요', reviews:[['혼자였으면 못 골랐을 옷을 잘 맞게 찾아주셨어요','34세 · 결혼식']]},
    {lock:52, nm:'지현', occ:['date','daily'], rating:4.8, review:8, match:93, tags:['캐주얼','스포티','미니멀'],
      services:[{type:'online',price:98000},{type:'shopping',price:115000,regions:['서울 강남']}],
      bio:'가성비 데일리룩 큐레이터<br>합리적인 예산 안에서<br>실용적인 코디를 짜드려요', reviews:[['예산을 딱 지켜서 골라주셔서 좋았어요','26세 · 데일리']]},
    {lock:63, nm:'유나', occ:['date','wedding','personal'], rating:5.0, review:6, match:95, tags:['걸리시','시크','빈티지'],
      services:[{type:'online',price:145000}],
      bio:'트렌디 여성 스타일링 전문<br>시즌 무드를 반영한<br>감각적인 큐레이션이 강점이에요', reviews:[['유행을 잘 녹여주면서 과하지 않았어요','28세 · 하객룩']]},
    {lock:71, nm:'세라', occ:['interview','wedding','bodycover'], rating:4.9, review:7, match:92, tags:['클래식','시크','미니멀'],
      services:[{type:'image',price:175000,regions:['서울 강남','서울 용산']}],
      bio:'퍼스널컬러·이미지 컨설턴트<br>색과 실루엣으로 첫인상을<br>목적에 맞게 설계해드려요', reviews:[['퍼스널컬러까지 잡아주셔서 만족했어요','31세 · 면접']]},
    {lock:84, nm:'태오', occ:['daily','travel'], rating:4.6, review:5, match:88, tags:['캐주얼','스포티','스트리트'],
      services:[{type:'shopping',price:130000,regions:['서울 마포','서울 용산']}],
      bio:'남성 캐주얼 동행 쇼핑 전문<br>매장을 함께 돌며 핏에 맞는<br>데일리 아이템을 골라드려요', reviews:[['혼자 사면 실패했을 옷을 잘 잡아주셨어요','33세 · 데일리']]}
  ];
  /* 서비스 헬퍼 — 다중 서비스 접근(단일 svc/price/mode/dur 대체) */
  function svcTypes(e){ return (e.services||[]).map(function(s){return s.type;}); }
  function svcOf(e,t){ return (e.services||[]).filter(function(s){return s.type===t;})[0]; }
  function svcHas(e,t){ return svcTypes(e).indexOf(t)>=0; }
  function svcMinPrice(e){ var ps=(e.services||[]).map(function(s){return s.price;}); return ps.length?Math.min.apply(null,ps):0; }
  function svcPrimary(e){ return (e.services||[])[0]||{}; }
  /* 포트폴리오 데모 = 사진 + 착용 모델 키·몸무게(cm·kg) — 포털(pro.js)과 동일 계약 */
  var DEMO_FOLIO=[
    {src:'photos/folio1.jpg', height:168, weight:55},{src:'photos/folio2.jpg', height:172, weight:63},{src:'photos/folio3.jpg', height:160, weight:50},
    {src:'photos/folio4.jpg', height:177, weight:70},{src:'photos/folio5.jpg', height:165, weight:58},{src:'photos/folio6.jpg', height:170, weight:60}
  ];
  function folioSpec(p){ var a=[]; if(p.height) a.push(p.height+'cm'); if(p.weight) a.push(p.weight+'kg'); return a.join(' '); }

  /* ===== 로컬 저장소 (찜 · 요청 내역) ===== */
  function loadLS(k, def){ try{ var v=localStorage.getItem('fitting.'+k); return v?JSON.parse(v):def; }catch(e){ return def; } }
  function saveLS(k, v){ try{ localStorage.setItem('fitting.'+k, JSON.stringify(v)); }catch(e){} }
  var favs = loadLS('favs', [ {nm:'소희', svc:'online', rating:4.9, photo:'photos/p1.jpg'} ]);

  /* 입찰(역경매) 생성 — 오픈 요청에 서비스 유형이 맞는 스타일리스트들이 입찰.
     입찰은 EX 스타일리스트 풀을 단일 출처로 참조(idx)하고, 가격·메시지·예상기간만 요청별로 붙임.
     제출 시 1회 생성해 저장 → 재렌더에도 고정(랜덤 없이 결정적). */
  function makeBids(svc, occ){
    var oc=(occ&&occ[0])||'이번';
    var lines=[oc+' 코디, 체형·사이즈에 맞게 딱 잡아드릴게요', oc+' 자리에 맞춰 과하지 않게 정리해드릴게요', oc+' 첫인상 살리는 방향으로 제안드릴게요'];
    var deltas=[0, -0.12, 0.08];   // 기준가 대비 입찰가 변주
    var bids=[];
    for(var i=0;i<EX.length;i++){ var so=svcOf(EX[i],svc); if(!so) continue; var k=bids.length;
      var price=Math.round(so.price*(1+deltas[k%deltas.length])/1000)*1000;
      bids.push({idx:i, price:price, eta:SMODE[svc]+(so.regions&&so.regions.length?' · '+so.regions.join('·'):''), msg:lines[k%lines.length]}); }
    return bids;
  }

  /* 데모 시드 버전 — 상태 모델이 바뀌었으니 옛 요청 데이터를 1회 자동 초기화(콘솔 리셋 불필요) */
  if(loadLS('reqsVer',0) < 12){ try{ localStorage.removeItem('fitting.reqs'); }catch(e){} saveLS('reqsVer',12); }
  var reqs = loadLS('reqs', [
    {nm:'지현', svc:'online',   occ:['소개팅·데이트'], price:98000,  date:'2026.07.03', status:'결제대기'},
    {nm:'상민', svc:'shopping', occ:['결혼식 하객'], price:150000, date:'2026.06.30', status:'대기'},
    {open:true, svc:'online', occ:['소개팅·데이트'], budget:'5~10만', date:'2026.07.02', status:'견적중', bids:makeBids('online',['소개팅·데이트'])},
    {nm:'건형', svc:'image',    occ:['면접·발표'],   price:190000,   date:'2026.06.25', status:'진행중'},
    {nm:'세라', svc:'image',    occ:['면접·발표'],   price:175000,   date:'2026.06.28', status:'분쟁', payMethod:'카드', paidAt:'2026-06-28T10:00:00Z', _prevStatus:'진행중', dispute:{reason:'미이행', detail:'약속한 날짜에 결과물을 받지 못했어요', at:'2026-07-01T09:00:00Z'}},
    {nm:'소희', svc:'online',   occ:['소개팅·데이트'], price:90000,  date:'2026.06.20', status:'거절'}
  ]);
  /* 옛 상태 정리 — 지명 요청은 대기 → 수락/거절 뿐. 이전 데이터의 취소·제안도착·라이프사이클을 보정. */
  reqs.forEach(function(r){
    if(r.status==='취소') r.status='거절';
    if(r.status==='제안도착') r.status='대기';
    if(r.status==='수락') r.status='진행중';   // 흐름 통일: 지명도 수락 시 진행중부터 완료·후기까지
  });
  function svcLabel(v){ return SVC[v]||v; }
  function isFav(nm){ return favs.some(function(f){ return f.nm===nm; }); }
  function toggleFav(nm){
    if(!loggedIn()){ openLogin('즐겨찾기', function(){ toggleFav(nm); }); return; }   // 로그인 후에만 데이터 저장
    var e=EX.filter(function(x){return x.nm===nm;})[0];
    if(isFav(nm)) favs=favs.filter(function(f){return f.nm!==nm;});
    else if(e) favs.unshift({nm:e.nm, svc:svcTypes(e)[0], rating:e.rating, photo:e.photo||img(e)});
    saveLS('favs', favs); render(); renderFavs();
    toast(isFav(nm)?(nm+' 스타일리스트를 즐겨찾기에 담았어요'):(nm+' 스타일리스트를 즐겨찾기에서 뺐어요'));
  }
  function addReq(r){ reqs.unshift(r); saveLS('reqs', reqs); renderReqs(); }

  /* 마이페이지 · 프로필 아바타 — 진단 전=잉크블랙+이니셜 / 진단 후=결과 카드 캐릭터 얼굴 + 유형 색(bodytypes.json 단일 출처) */
  var USER={ name:'김도현', initial:'김', gender:'male', age:33, height:172, weight:68, fit:'슬림', type:'STR' };   // type:null = 진단 전
  // 결과 페이지에서 '결과 저장' 시 기록한 진단 프로필(fitting.user)을 병합 → 마이가 실제 진단 결과를 보여줌.
  (function(){ try{ var s=JSON.parse(localStorage.getItem('fitting.user')||'null'); if(s&&typeof s==='object') Object.assign(USER, s); }catch(e){} })();
  /* ===== 고객센터 · 1:1 문의 (1.9 / G.2) ===== */
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  var support = loadLS('support', [
    {type:'결제·환불', body:'환불 요청했는데 아직 입금이 안 됐어요', date:'2026.07.05', status:'답변완료'}
  ]);
  /* 세그(단일 선택) — 유형·관련거래 공용 */
  function supPick(el){ var seg=el.parentNode; [].forEach.call(seg.children, function(c){ c.classList.remove('on'); }); el.classList.add('on'); }
  function supSel(id){ var o=document.querySelector('#'+id+' .o.on'); return o?o.textContent:''; }
  function renderSupport(){
    var el=document.getElementById('supList'); if(!el) return;
    if(!support.length){ el.innerHTML='<div class="note">아직 접수한 문의가 없어요</div>'; return; }
    el.innerHTML=support.map(function(s){
      var done=s.status==='답변완료'; var body=esc(s.body); if(body.length>24) body=body.slice(0,24)+'…';
      return '<div class="field"><span>['+esc(s.type)+'] '+body+' <span class="note" style="margin-left:4px">'+s.date+'</span></span>'+
             '<span class="v" style="color:'+(done?'var(--green)':'var(--sub2)')+'">'+s.status+'</span></div>';
    }).join('');
  }
  function submitSupport(){
    if(!loggedIn()){ openLogin('1:1 문의', submitSupport); return; }
    var ta=document.getElementById('supBody'); var body=(ta.value||'').trim();
    if(!body){ toast('문의 내용을 입력해주세요'); ta.focus(); return; }
    support.unshift({ type:supSel('supType')||'계정·기타', body:body, date:todayStr().replace(/-/g,'.'), status:'접수됨' });
    saveLS('support', support); ta.value=''; renderSupport();
    toast('문의를 접수했어요 · 답변은 알림으로 회신해요');
  }
  /* 거래 분쟁·환불은 에스크로(v2) 오픈 후 — 지금은 안내만 */
  function supDispute(){ toast('거래 분쟁·환불은 실매칭(결제·에스크로) 오픈 후 지원해요'); }

  /* ===== 알림 센터 (G.6) — 매칭·문의 답변·소식 회신 ===== */
  // 이모지 → SVG(라인 아이콘). 유형별 뱃지로 표시 (quote=견적·reply=문의답변·news=소식)
  var NS='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">';
  var NOTI_IC = {
    quote: NS+'<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
    reply: NS+'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
    news:  NS+'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg>'
  };
  var GO_TYPE = { 'mp-req':'quote', 'mp-support':'reply', 'shop':'news' };
  function notiType(n){ return n.type || GO_TYPE[n.go] || 'news'; }
  var notis = loadLS('notis', [
    {type:'quote', msg:'소희 스타일리스트가 견적을 보냈어요', time:'10분 전', read:false, go:'mp-req'},
    {type:'reply', msg:'1:1 문의 답변이 등록됐어요', time:'1시간 전', read:false, go:'mp-support'},
    {type:'news', msg:'새 스타일리스트가 합류했어요 · 매칭도를 확인해보세요', time:'어제', read:true, go:'shop'}
  ]);
  function notiUnread(){ return notis.filter(function(n){ return !n.read; }).length; }
  function updateNotiDot(){ var d=document.getElementById('notiDot'); if(d) d.style.display=notiUnread()?'block':'none'; }
  function renderNotis(){
    var el=document.getElementById('notiList'); if(!el){ updateNotiDot(); return; }
    if(!notis.length){ el.innerHTML='<div class="note">새 알림이 없어요</div>'; updateNotiDot(); return; }
    el.innerHTML=notis.map(function(n,i){
      var t=notiType(n);
      return '<a class="noti'+(n.read?'':' unread')+'" onclick="notiOpen('+i+')">'+
        '<span class="noti-ic t-'+t+'">'+(NOTI_IC[t]||NOTI_IC.news)+'</span>'+
        '<span class="noti-bd"><span class="noti-msg">'+esc(n.msg)+'</span><span class="noti-time">'+esc(n.time)+'</span></span>'+
        '<span class="arr">›</span></a>';
    }).join('');
    updateNotiDot();
  }
  function notiOpen(i){ var n=notis[i]; if(!n) return; n.read=true; saveLS('notis',notis); renderNotis();
    if(n.go==='shop') go('shop'); else if(n.go && document.querySelector('#smenu a[data-p="'+n.go+'"]')) goMy(n.go); }
  function markAllNoti(){ notis.forEach(function(n){ n.read=true; }); saveLS('notis',notis); renderNotis(); toast('모든 알림을 읽음 처리했어요'); }

  /* ===== 개인정보·데이터 관리 (1.4E / G.4) — 계정 하위 서브패널 ===== */
  /* smenu 항목 없는 패널 전환(메뉴 하이라이트 없이 계정에서 진입 · 뒤로가기로 복귀) */
  function openMyPanel(pid){ go('my');
    [].forEach.call(document.querySelectorAll('#smenu a'), function(a){ a.classList.remove('on'); });
    [].forEach.call(document.querySelectorAll('#my .mpanel'), function(p){ p.classList.remove('on'); });
    var t=document.getElementById(pid); if(t) t.classList.add('on'); window.scrollTo(0,0);
  }
  function ssGet(k){ try{ return sessionStorage.getItem(k); }catch(e){ return null; } }
  function safeParse(s){ try{ return s?JSON.parse(s):null; }catch(e){ return s; } }
  /* 엔진개선 동의 = 진단 결과화면(result.js)과 동일 키·포맷(sessionStorage fitting.consent) */
  function engineConsent(){ try{ return JSON.parse(ssGet('fitting.consent')||'{}').engineImprove===true; }catch(e){ return false; } }
  function renderPrivacy(){
    var t=document.getElementById('privConsent'); if(t) t.classList.toggle('on', engineConsent());
    var d=document.getElementById('privData'); if(!d) return;
    var basic=ssGet('fitting.basic'), dx=ssGet('fitting.dx');
    d.innerHTML = (basic||dx)
      ? '<div class="field"><span>기본 정보(성별·키·몸무게)</span><span class="v">'+(basic?'저장됨':'없음')+'</span></div>'+
        '<div class="field"><span>착용 경험·진단 입력</span><span class="v">'+(dx?'저장됨':'없음')+'</span></div>'
      : '<div class="note">아직 저장된 진단 데이터가 없어요 · 진단을 완료하면 여기 표시돼요</div>';
  }
  function toggleEngineConsent(){
    var on=!engineConsent();
    try{ sessionStorage.setItem('fitting.consent', JSON.stringify({ engineImprove:on, ageAttested:on, at:new Date().toISOString() })); }catch(e){}
    renderPrivacy(); toast(on?'엔진 개선 활용에 동의했어요':'엔진 개선 활용 동의를 철회했어요');
  }
  function downloadMyData(){
    var data={ basic:safeParse(ssGet('fitting.basic')), dx:safeParse(ssGet('fitting.dx')), consent:safeParse(ssGet('fitting.consent')), exportedAt:new Date().toISOString() };
    if(!data.basic && !data.dx){ toast('내려받을 진단 데이터가 없어요'); return; }
    try{
      var blob=new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
      var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='fitting-my-data.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href);
      toast('내 데이터를 내려받았어요');
    }catch(e){ toast('내려받기에 실패했어요'); }
  }
  function deleteMyData(){
    askConfirm('<b>진단 데이터를 삭제</b>할까요?<div class="cf-sub">신체·착용경험·결과·개선 이력이 모두 삭제돼요 · 되돌릴 수 없어요</div>', '삭제하기', function(){
      try{ ['fitting.dx','fitting.basic','fitting.consent'].forEach(function(k){ sessionStorage.removeItem(k); }); }catch(e){}
      try{ localStorage.removeItem('fitting.feedback'); }catch(e){}
      renderPrivacy(); toast('진단 데이터를 삭제했어요');
    });
  }

  var _btCache=null;
  function avatarFaceHTML(){ return '<div class="head '+USER.gender+'">'+(USER.gender==='female'?'<span class="longhair"></span>':'')+'<span class="face"></span><span class="cap"></span><span class="ey l"></span><span class="ey r"></span></div>'; }
  function renderMyAvatar(){
    var el=document.getElementById('myAv'); if(!el) return;
    if(!USER.type){ el.style.background='var(--ink)'; el.style.color='#fff'; el.textContent=USER.initial; return; }
    function paint(t){ if(!t){ el.style.background='var(--ink)'; el.textContent=USER.initial; return; } el.style.background=t.point; el.innerHTML=avatarFaceHTML(); }
    if(_btCache){ paint(_btCache[USER.type]); return; }
    fetch('data/bodytypes.json').then(function(r){return r.json();}).then(function(j){ _btCache={}; j.types.forEach(function(x){_btCache[x.code]=x;}); paint(_btCache[USER.type]); }).catch(function(){});
  }
  /* 내 진단 결과 카드(iframe) — USER의 유형·성별과 연동 (프로필 수정 시에도 반영) */
  function renderMyDiagCard(){
    var f=document.getElementById('myDiagCard'); if(!f) return;
    var g=(USER.gender==='female'?'female':'male');
    var src='card.html?type='+(USER.type||'STR')+'&g='+g;
    if((f.getAttribute('src')||'')!==src) f.src=src;   // 값이 바뀐 경우에만 리로드
  }
  /* FITTING의 한 끗(#myTip) — 유형별 insight로 채움(카드와 같이 움직이게). 하드코딩 데모 대체. */
  function renderMyInsight(){
    var el=document.getElementById('myTip'); if(!el) return;
    function paint(t){ if(!t) return;
      var tp=t.point||'#2E4A3B'; el.style.setProperty('--tp',tp);
      var g=(USER.gender==='female')?'female':'male';
      var c=(t.gender&&(t.gender[g]||t.gender.female))||t;   // 성별별 콘텐츠 해석
      el.innerHTML='<div class="k">FITTING의 한 끗</div><p>'+(c.insight||'')+'</p>';
    }
    if(_btCache){ paint(_btCache[USER.type]); return; }
    fetch('data/bodytypes.json').then(function(r){return r.json();}).then(function(j){ _btCache={}; j.types.forEach(function(x){_btCache[x.code]=x;}); paint(_btCache[USER.type]); }).catch(function(){});
  }

  /* 마이페이지 · 프로필 기본정보 (읽기/편집) */
  var FIT_OPTS=['스키니','슬림','레귤러','루즈','오버'], _profEdit=false;
  function renderProfile(){
    var el=document.getElementById('profCard'); if(!el) return; var U=USER;
    if(!_profEdit){
      el.innerHTML='<div class="mcard">'+
        '<div class="msub"><div class="subhead">신체 정보 <span class="pr half">◐ MVP</span></div>'+
          '<div class="field"><span>성별 · 나이</span><span class="v">'+(U.gender==='female'?'여성':'남성')+' · <span class="num">'+U.age+'</span>세</span></div>'+
          '<div class="field"><span>키 · 몸무게</span><span class="v"><span class="num">'+U.height+'</span>cm · <span class="num">'+U.weight+'</span>kg</span></div>'+
          '<div class="note">🔒 민감정보 · 편집 시 재진단을 추천해요</div></div>'+
        '<div class="msub"><div class="subhead">선호 핏 <span class="pr half">◐ MVP</span></div>'+
          '<div class="field"><span>핏 취향</span><span class="v">'+U.fit+'</span></div></div>'+
        '</div><div class="prof-actions"><button class="btn" onclick="editProfile()">수정하기</button></div>';
    } else {
      el.innerHTML='<div class="mcard">'+
        '<div class="msub"><div class="subhead">신체 정보</div>'+
          '<div class="pedit"><label>성별</label><div class="seg" id="pGender">'+['male','female'].map(function(g){return '<span class="o'+(U.gender===g?' on':'')+'" data-g="'+g+'" onclick="pPick(this)">'+(g==='male'?'남성':'여성')+'</span>';}).join('')+'</div></div>'+
          '<div class="pedit inrow3"><div><label>나이</label><input class="inp" id="pAge" type="number" value="'+U.age+'"></div><div><label>키(cm)</label><input class="inp" id="pHeight" type="number" value="'+U.height+'"></div><div><label>몸무게(kg)</label><input class="inp" id="pWeight" type="number" value="'+U.weight+'"></div></div>'+
          '<div class="note" style="color:var(--warn)">⚠️ 신체정보를 바꾸면 재진단을 추천해요</div></div>'+
        '<div class="msub"><div class="subhead">선호 핏</div>'+
          '<div class="pedit"><label>핏 취향</label><div class="seg" id="pFit">'+FIT_OPTS.map(function(f){return '<span class="o'+(U.fit===f?' on':'')+'" data-fit="'+f+'" onclick="pPick(this)">'+f+'</span>';}).join('')+'</div></div></div>'+
        '</div><div class="prof-actions"><button class="btn ghost" onclick="cancelProfile()">취소</button><button class="btn" onclick="saveProfile()">저장하기</button></div>';
    }
    var an=document.getElementById('acctName'); if(an) an.textContent=U.name;   // 이름은 계정 섹션에 표시(신원)
  }
  function editProfile(){ _profEdit=true; renderProfile(); }
  function cancelProfile(){ _profEdit=false; renderProfile(); }
  function pPick(el){ var ch=el.parentNode.children; for(var i=0;i<ch.length;i++) ch[i].classList.remove('on'); el.classList.add('on'); }
  function saveProfile(){
    var g=document.querySelector('#pGender .o.on'); if(g) USER.gender=g.dataset.g;
    var a=document.getElementById('pAge'), h=document.getElementById('pHeight'), w=document.getElementById('pWeight');
    if(a&&a.value) USER.age=+a.value; if(h&&h.value) USER.height=+h.value; if(w&&w.value) USER.weight=+w.value;
    var f=document.querySelector('#pFit .o.on'); if(f) USER.fit=f.dataset.fit;
    _profEdit=false; renderProfile(); renderMyAvatar(); renderMyDiagCard(); renderMyInsight(); toast('프로필을 저장했어요');
  }

  /* 마이페이지 · 즐겨찾기 렌더 */
  function renderFavs(){
    var el=document.getElementById('favList'); if(!el) return;
    if(!favs.length){ el.innerHTML='<p class="note" style="grid-column:1/-1">아직 찜한 스타일리스트가 없어요 · 스타일리스트찾기에서 🤍 를 눌러 담아보세요</p>'; return; }
    el.innerHTML=favs.map(function(f){
      var e=EX.filter(function(x){return x.nm===f.nm;})[0];   // 지정 스타일리스트 원본(얼굴·전문분야) 단일 출처
      var face=e?img(e):(f.photo||'');                        // 실제 지정 스타일리스트 얼굴(SVG)
      var rating=(f.rating!=null?f.rating:(e&&e.rating));
      var review=e?e.review:null;
      var tags=(e&&e.tags)?e.tags.slice(0,2):[];              // 스타일 태그 2개 (스타일리스트찾기 카드와 동일)
      var rt=rating?'<span class="star"><span class="rvstar">'+starSVG()+'</span> '+rating+(review!=null?' <small class="rv">('+review+')</small>':'')+'</span>':'';
      var svcico=e?'<div class="cardmid"><span class="svcico">'+e.services.map(function(sv){return '<span class="b" title="'+SVC[sv.type]+'">'+svcIcon(sv.type)+'</span>';}).join('')+'</span></div>':'';
      return '<div class="fcard"'+(e?' onclick="favOpen(\''+f.nm+'\')"':'')+'><div class="cov"><img class="favimg" src="'+face+'" alt="" onerror="'+FB+'"><span class="heart" title="즐겨찾기 해제" onclick="event.stopPropagation();toggleFav(\''+f.nm+'\')">'+favIcon(true,true)+'</span></div>'+
        '<div class="fb"><div class="top"><b>'+f.nm+' 스타일리스트</b>'+rt+'</div>'+
        (tags.length?'<div class="subtags">'+tags.join(' · ')+'</div>':'')+svcico+
        '</div></div>';
    }).join('');
  }
  /* 즐겨찾기 카드 클릭 → 스타일리스트찾기 탭의 상세 화면으로 전환(뒤로가기=즐겨찾기 복귀) */
  function favOpen(nm){
    var idx=EX.map(function(e){return e.nm;}).indexOf(nm); if(idx<0) return;
    go('shop'); openDetail(idx); _detailBack=function(){ goMy('mp-fav'); };
  }
  /* 마이페이지 · 코디 요청 내역 렌더 (라이프사이클) */
  function stClass(s){ return (s==='완료'||s==='후기완료')?'done':(s==='진행중'||s==='수락'?'prog':(s==='견적중'?'offer':(s==='분쟁'?'warn':(s==='거절'||s==='취소함'||s==='환불'?'cancel':'wait')))); }
  function statusLabel(s){ return s==='견적중'?'견적 받는 중':(s==='결제대기'?'결제 대기':(s==='분쟁'?'분쟁 처리 중':(s==='환불'?'환불 완료':(s==='후기완료'?'후기 완료':(s==='수락'?'수락됨':(s==='거절'?'거절됨':(s==='대기'?'응답 대기':s))))))); }
  function starsRO(n){ var s=''; for(var k=1;k<=5;k++) s+='<span style="color:'+(k<=n?'var(--green)':'var(--line2)')+'">'+starSVG()+'</span>'; return s; }
  /* 통통하고 둥근 별 (귀여운 모양) — round join으로 뾰족함 없이 */
  function starSVG(){ return '<svg class="cutestar" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"><path d="M12 4 L14.1 9.6 20.1 9.9 15.4 13.6 17 19.4 12 16.1 7 19.4 8.6 13.6 3.9 9.9 9.9 9.6Z"/></svg>'; }
  function reviewForm(r,i){ var rt=r._rating||5, st='';
    for(var k=1;k<=5;k++) st+='<span class="'+(k<=rt?'on':'')+'" onclick="setStar('+i+','+k+')">'+starSVG()+'</span>';
    return '<div class="reqact"><div class="reviewform"><div class="stars">'+st+'</div><textarea class="rtext" id="rtext'+i+'" placeholder="스타일리스트와의 경험을 남겨주세요">'+(r._text||'')+'</textarea><div class="rbtns"><button class="tinybtn ghost" onclick="cancelReview('+i+')">취소</button><button class="tinybtn" onclick="submitReview('+i+')">후기 등록</button></div></div></div>';
  }
  /* 매칭 완료 히어로 배너 — 지난 견적/진행 상태에서 '○○ 스타일리스트로 매칭' 을 딥그린+얼굴로 예쁘게 */
  function matchedBannerHTML(r){
    var sub = r.status==='완료' ? '코디가 완료됐어요 · 후기를 남겨보세요'
            : r.status==='후기완료' ? '코디와 후기까지 완료됐어요 · 고마워요'
            : '곧 코디를 시작해요 · 완료되면 후기를 남겨주세요';
    var ck='<span class="mb-ck"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></span>';
    return '<div class="matchban">'+ck+
      '<div class="mb-tx"><b>'+(r.nm||'')+' 스타일리스트로 매칭되었어요!</b><span>'+sub+'</span></div></div>';
  }
  function reqAction(r,i){ var s=r.status;
    if(s==='견적중'){ var n=(r.bids||[]).length;
      if(!n) return '<div class="reqact"><span>견적을 받는 중이에요 · 스타일리스트들이 견적을 준비하고 있어요</span></div>';
      return '<div class="reqact"><div class="offerbox"><b>견적 <span class="num">'+n+'</span>개 도착</b><div class="omsg">여러 스타일리스트가 견적을 보냈어요 · 비교하고 선택하세요</div></div><button class="tinybtn" style="margin-left:auto" onclick="openBids('+i+')">받은 견적 보기 →</button></div>'; }
    if(s==='대기') return '<div class="reqact"><span>스타일리스트가 요청을 검토하고 있어요 · 응답을 기다리는 중</span><button class="tinybtn ghost" style="margin-left:auto" onclick="confirmCancel('+i+')">요청 취소</button></div>'+
      '<div class="reqact" style="background:none; padding:10px 2px 0"><span class="muted" style="font-size:12px">데모 · 스타일리스트 응답 시뮬레이션</span><div class="obtns" style="margin-left:auto"><button class="tinybtn ghost" onclick="reqReject('+i+')">거절</button><button class="tinybtn" onclick="reqAccept('+i+')">수락</button></div></div>';
    if(s==='취소함') return '<div class="reqact"><span class="muted">요청을 취소했어요</span></div>';
    if(s==='수락') return '<div class="reqact"><span><b style="color:var(--green)">요청 수락되었어요!</b> 이제 스타일리스트와 코디를 진행해요</span></div>';
    if(s==='결제대기') return '<div class="reqact"><div class="offerbox"><b>결제하고 시작하기</b><div class="omsg">'+(r.nm||'')+' 스타일리스트로 매칭됐어요 · 에스크로 결제 후 코디를 시작해요</div></div><button class="tinybtn" style="margin-left:auto" onclick="openPay('+i+')">결제하기 →</button></div>';
    if(s==='진행중') return matchedBannerHTML(r)+
      '<div class="reqact" style="background:none; padding:10px 2px 0"><span class="muted" style="font-size:12px">데모 · 서비스 완료 시뮬레이션</span><button class="tinybtn ghost" style="margin-left:auto" onclick="reqComplete('+i+')">완료 처리</button></div>';
    if(s==='완료'){ if(r._reviewing) return matchedBannerHTML(r)+reviewForm(r,i);
      return matchedBannerHTML(r)+'<div class="reqact" style="background:none; padding:12px 2px 0"><span class="muted" style="font-size:12px">서비스가 완료됐어요</span><button class="tinybtn" style="margin-left:auto" onclick="openReviewForm('+i+')">후기 작성하기</button></div>'; }
    if(s==='후기완료'){ var rv=r.review||{}; return matchedBannerHTML(r)+'<div class="reqact"><div class="revshow"><span class="starsRO">'+starsRO(rv.rating||5)+'</span> <span class="rtx">"'+(rv.text||'')+'"</span></div></div>'; }
    if(s==='거절') return '<div class="reqact"><span class="muted">아쉽게도 요청이 거절되었어요!</span><button class="tinybtn ghost" style="margin-left:auto" onclick="closeBids();go(\'shop\')">다른 스타일리스트 찾기</button></div>';
    return '';
  }
  /* 요청 카드 1개 (원본 reqs 인덱스 i 유지 — 액션 핸들러가 참조) */
  function reqCard(r,i){
    if(r.kind==='notify') return '<div class="req notify"><div class="reqtop"><div class="info"><b>오픈 알림 신청 완료</b></div><span class="st wait">오픈 대기</span></div></div>';
    var cls = r.open ? 'open' : 'named';
    var title = (r.open && r.nm ? '선택 · '+r.nm+' 스타일리스트' : (r.nm ? r.nm+' 스타일리스트' : '견적 요청')) + ' · ' + svcLabel(r.svc);
    var sub = [(r.occ&&r.occ.length?r.occ.join('·'):''), (r.date||'')].filter(Boolean).join(' · ');
    return '<div class="req '+cls+'"><div class="reqtop"><div class="ic"></div><div class="info"><b>'+title+'</b><small>'+sub+'</small></div><span class="st '+stClass(r.status)+'">'+statusLabel(r.status)+'</span></div>'+reqAction(r,i)+'</div>';
  }
  /* 섹션 아이콘 — 딥그린 모노라인 SVG(currentColor로 색 상속) */
  var ICON_RECV='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/><path d="M8 11l4 4 4-4"/><path d="M12 3.5v11.5"/></svg>';
  var ICON_SENT='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 4L3 11l7 2.5L12.5 21 21 4z"/><path d="M10 13.5L21 4"/></svg>';
  var ICON_BELL='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.5 21a1.9 1.9 0 0 1-3 0"/></svg>';

  /* '받은 견적' 컴팩트 카드 (숨고형) — 요약(날짜·상황·서비스) + 견적 건수 클릭 → 받은 견적 오버레이.
     진행 상태·후기는 카드에 붙이지 않고 오버레이 안에서 처리(카드는 깔끔하게 유지). */
  /* 날짜 6글자 — 2026.07.12 → 26.07.12 */
  function shortDate(d){ return (typeof d==='string' && /^\d{4}\./.test(d)) ? d.slice(2) : (d||''); }
  /* 통일 리스트 행(.ureq) — 1줄: 상황·서비스 / 2줄: 이름·날짜·예산. 서비스는 모노 아이콘, 색은 상태에만 */
  function reqCardOpen(r,i,xc){
    if(r.awarded) return reqCardNamed(r,i,xc);   // 매칭 완료 → 지명 요청과 동일하게(진행중 스타일리스트 · 진행 상세로)
    var n=(r.bids||[]).length;
    var title = [(r.occ&&r.occ.length?r.occ.join('·'):''), svcLabel(r.svc)].filter(Boolean).join(' · ') || '코디 요청';
    var money = r.budget?' · <b>예산 '+r.budget+'</b>':'';
    var pill = (r.status==='견적중')?'<b class="cnt">견적 '+n+'개</b>':'<span class="st '+stClass(r.status)+'">'+statusLabel(r.status)+'</span>';
    return '<div class="ureq'+(xc?' '+xc:'')+'" onclick="openBids('+i+')">'+
        '<span class="ureq-ic">'+svcIcon(r.svc)+'</span>'+
        '<div class="ureq-l"><div class="ureq-title">'+title+'</div><div class="ureq-meta">여러 스타일리스트 · '+shortDate(r.date)+money+'</div></div>'+
        '<div class="ureq-r">'+pill+'<span class="chev">›</span></div>'+
      '</div>';
  }
  /* '내가 보낸 fit 요청'(지명) — 지명은 예상 가격(확정) */
  function reqCardNamed(r,i,xc){
    var title = [(r.occ&&r.occ.length?r.occ.join('·'):''), svcLabel(r.svc)].filter(Boolean).join(' · ') || '코디 요청';
    var money = r.budget?' · <b>예산 '+r.budget+'</b>':(r.price?' · <b>예상 '+r.price.toLocaleString()+'원</b>':'');
    return '<div class="ureq'+(xc?' '+xc:'')+'" onclick="openReqDetail('+i+')">'+
        '<span class="ureq-ic">'+svcIcon(r.svc)+'</span>'+
        '<div class="ureq-l"><div class="ureq-title">'+title+'</div><div class="ureq-meta">'+(r.nm?r.nm+' 스타일리스트 · ':'')+shortDate(r.date)+money+'</div></div>'+
        '<div class="ureq-r"><span class="st '+stClass(r.status)+'">'+statusLabel(r.status)+'</span><span class="chev">›</span></div>'+
      '</div>';
  }
  /* 받은 견적(오픈) vs 지명 요청을 그룹으로 갈라 렌더 */
  function renderReqs(){
    var el=document.getElementById('reqList'); if(!el) return;
    var open=[], named=[], notify=[];
    reqs.forEach(function(r,i){ if(r.kind==='notify') notify.push(i); else if(r.open) open.push(i); else named.push(i); });
    function isActive(s){ return s==='견적중'||s==='대기'||s==='진행중'||s==='수락'||s==='결제대기'||s==='분쟁'; }
    function group(ids, cls, icon, label, cardFn, desc, emptyLink, splitActive){
      var act=[], past=[];
      ids.forEach(function(i){ (isActive(reqs[i].status)?act:past).push(i); });
      var body='';
      if(!ids.length){ body='<p class="rgempty">'+emptyLink+'</p>'; }
      else if(splitActive){   // 받은 견적: '견적 비교 중'(아직 고르는 중) / '진행 중'(선택 완료)으로 소분리
        var comparing=act.filter(function(i){ return reqs[i].status==='견적중'; });
        var going=act.filter(function(i){ return reqs[i].status!=='견적중'; });
        if(comparing.length) body+='<div class="substat">견적 비교 중</div>'+comparing.map(function(i){ return cardFn(reqs[i],i,''); }).join('');   // 견적 비교 중 = 회색(활성 아님)
        if(going.length) body+='<div class="substat active">진행 중</div>'+going.map(function(i){ return cardFn(reqs[i],i,'active'); }).join('');   // 진행 중만 연한 초록
        if(past.length) body+='<div class="substat past">지난 요청</div>'+past.map(function(i){ return cardFn(reqs[i],i,'past'); }).join('');
      }
      else {   // 진행 중(초록 강조) / 지난 요청(흐리게)으로 분리
        if(act.length) body+='<div class="substat active">진행 중</div>'+act.map(function(i){ return cardFn(reqs[i],i,'active'); }).join('');
        if(past.length) body+='<div class="substat past">지난 요청</div>'+past.map(function(i){ return cardFn(reqs[i],i,'past'); }).join('');
      }
      return '<div class="reqgroup"><div class="rghead '+cls+'"><span class="rgicon">'+icon+'</span>'+
        '<div class="rgtx"><b>'+label+'</b><p>'+desc+'</p></div>'+
        '<span class="rgcount"><span class="num">'+ids.length+'</span>건</span></div>'+
        '<div class="rglist">'+body+'</div></div>';
    }
    var html =
      group(open,'open',ICON_RECV,'받은 견적', reqCardOpen, '여러 스타일리스트가 보낸 견적 · 비교하고 선택',
        '아직 없어요 · <a onclick="go(\'shop\');openMatch()">견적 요청 보내기</a>', true) +
      group(named,'named',ICON_SENT,'보낸 요청', reqCardNamed, '내가 지명한 스타일리스트에게 직접 · 진행 확인',
        '아직 없어요 · <a onclick="go(\'shop\')">스타일리스트 찾아 요청하기</a>');
    if(notify.length) html += '<div class="reqgroup"><div class="rghead alert"><span class="rgicon">'+ICON_BELL+'</span>'+
      '<div class="rgtx"><b>오픈 알림 신청</b><p>스타일리스트가 모이면 · 가장 먼저 알림</p></div>'+
      '<span class="rgcount"><span class="num">'+notify.length+'</span>건</span></div>'+
      '<div class="rglist">'+notify.map(function(i){ return reqCard(reqs[i],i); }).join('')+'</div></div>';
    el.innerHTML = html;
  }
  /* 요청 라이프사이클 액션 (목업) — 지명 요청: 대기 → 수락(진행중→완료→후기) / 거절 */
  function reqAccept(i){ reqs[i].status='결제대기'; saveLS('reqs',reqs); renderReqs(); openPay(i); toast((reqs[i].nm||'')+' 스타일리스트가 수락했어요 · 결제 후 시작해요'); }
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
  /* 스크롤 잠금 — 스크롤바가 사라지며 폭이 바뀌지 않게 사라진 스크롤바 폭만큼 body에 패딩 보정(사이드바 밀림 방지) */
  function lockScroll(on){ document.documentElement.style.overflow = on ? 'hidden' : ''; }
  function showOverlay(){ document.getElementById('bidsOverlay').classList.add('on'); lockScroll(true); }
  function openBids(i){ _bidReq=i; _ovMode='bids'; renderBids(); showOverlay(); }              // 받은 견적(오픈)
  function openReqDetail(i){ _bidReq=i; _ovMode='req'; renderReqDetail(); showOverlay(); }     // 보낸 요청 상세(지명)
  function closeBids(){ _ovMode=null; document.getElementById('bidsOverlay').classList.remove('on'); lockScroll(false); }
  /* 요청 상태가 바뀌면 목록 + (열려있으면) 오버레이를 함께 갱신 */
  function syncReqViews(){ renderReqs(); if(_ovMode && document.getElementById('bidsOverlay').classList.contains('on')){ _ovMode==='req'?renderReqDetail():(_ovMode==='pay'?renderPay():(_ovMode==='dispute'?renderDispute():renderBids())); } }
  /* 내가 보낸 요청 내용 요약(오픈: 토글 · 지명: 상세에 상시 노출) */
  function reqSummaryHTML(r){
    // 헤더 강조형 — '무엇을 보냈나'(서비스 유형)를 제목처럼 크게, 상황·예산은 요약 한 줄, 나머지는 라인
    var money=r.budget?'예산 '+r.budget:(r.price?'예상 '+r.price.toLocaleString()+'원':'');   // 오픈=예산 / 지명=예상 가격
    var sum=[(r.occ&&r.occ.length?r.occ.join(' · '):''), money].filter(Boolean).join('  ·  ');
    var note=(r.note&&(''+r.note).trim())?r.note:'—';
    var rows=[['희망 일정', r.date||'—'], ['요청 메모', note]];
    return '<div class="req-summary-in">'+
      '<div class="rs-head"><span class="rs-ic">'+svcIcon(r.svc)+'</span><div class="rs-htx"><b class="rs-title">'+svcLabel(r.svc)+'</b>'+(sum?'<span class="rs-sum">'+sum+'</span>':'')+'</div></div>'+
      '<div class="rs-lines">'+rows.map(function(x){ return '<div class="rs-row"><span>'+x[0]+'</span><b>'+x[1]+'</b></div>'; }).join('')+'</div>'+
      (r.attach!==false
        ? '<div class="rs-note">📎 내 체형·사이즈 측정 결과가 함께 전달됐어요</div>'
        : '<div class="rs-note off">체형·사이즈 측정 결과는 첨부하지 않았어요</div>')+'</div>';
  }
  function toggleReqSummary(btn){ var p=document.getElementById('reqSummaryPanel'); if(!p) return; var on=p.classList.toggle('on'); var tg=btn.querySelector('.tg'); if(tg) tg.textContent=on?'▴':'▾'; }
  /* 진행 상태 UI — 단계 스테퍼 + 컬러 배너 (지명 요청 라이프사이클) */
  function stIcon(k){
    var P={ check:'<path d="M20 6L9 17l-5-5"/>',
      clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      flag:'<path d="M5 21V4h13l-2.6 4L18 12H5"/>',
      star:'<path d="M12 3l2.7 5.5 6 .9-4.35 4.2 1.03 6L12 17l-5.38 2.6 1.03-6L3.3 9.4l6-.9z"/>',
      x:'<path d="M18 6L6 18M6 6l12 12"/>',
      card:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10.5h18"/>',
      lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>' };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'+(P[k]||'')+'</svg>';
  }
  /* 상태 → [배너색, 아이콘, 제목, 설명] */
  var ST_BAN={
    '대기':    ['wait','clock','응답 대기 중','스타일리스트가 요청을 검토하고 있어요'],
    '수락':    ['go','check','요청 수락됨','스타일리스트가 요청을 수락했어요 · 곧 코디를 시작해요'],
    '결제대기':['wait','card','결제 대기','에스크로 결제를 하면 코디를 시작해요'],
    '진행중':  ['go','check','진행 중','스타일리스트와 코디를 진행하고 있어요 · 완료되면 후기를 남겨주세요'],
    '완료':    ['go','flag','서비스 완료','코디가 완료됐어요 · 후기를 남겨보세요'],
    '후기완료':['go','star','후기 작성 완료','소중한 후기 고마워요'],
    '거절':    ['no','x','요청 거절됨','아쉽게도 요청이 거절되었어요 · 다른 스타일리스트를 찾아보세요'],
    '취소함':  ['wait','x','요청 취소됨','요청을 취소했어요'],
    '분쟁':    ['no','x','분쟁 처리 중','문제 신고가 접수돼 정산이 보류됐어요 · 관리자 중재 중'],
    '환불':    ['no','x','환불 완료','분쟁 중재로 환불 처리됐어요']
  };
  function reqStatusBlock(status){
    var b=ST_BAN[status]||['wait','clock',statusLabel(status),''];
    return '<div class="statban '+b[0]+'"><span class="sb-ic">'+stIcon(b[1])+'</span>'+
      '<div class="sb-tx"><b>'+b[2]+'</b>'+(b[3]?'<p>'+b[3]+'</p>':'')+'</div></div>';
  }
  /* 상세용 액션 버튼만 (설명 줄글은 배너가 대신하므로 버튼/후기 콘텐츠만) */
  function reqActions(r,i){ var s=r.status;
    if(s==='대기') return '<div class="rq-btns"><button class="tinybtn ghost" onclick="confirmCancel('+i+')">요청 취소</button>'+
      '<button class="tinybtn ghost" onclick="reqReject('+i+')">거절 · 데모</button><button class="tinybtn" onclick="reqAccept('+i+')">수락 · 데모</button></div>';
    if(s==='결제대기') return '<div class="rq-btns"><button class="tinybtn" onclick="openPay('+i+')">결제하고 시작 →</button></div>';
    if(s==='진행중') return '';   // 진행 액션(완료 확인)은 progressSectionsHTML(대화·결과물 하단)에서 처리
    if(s==='완료'){ if(r._reviewing) return reviewForm(r,i); return '<div class="rq-btns"><button class="tinybtn" onclick="openReviewForm('+i+')">후기 작성하기</button></div>'; }
    if(s==='후기완료'){ var rv=r.review||{}; return '<div class="reqact"><div class="revshow"><span class="starsRO">'+starsRO(rv.rating||5)+'</span> <span class="rtx">"'+(rv.text||'')+'"</span></div></div>'; }
    if(s==='분쟁') return '';   // 분쟁 상세·중재 버튼은 disputeSectionHTML에서
    if(s==='환불') return '<div class="rq-btns"><button class="tinybtn ghost" onclick="closeBids();go(\'shop\')">다른 스타일리스트 찾기</button></div>';
    if(s==='거절') return '<div class="rq-btns"><button class="tinybtn ghost" onclick="closeBids();go(\'shop\')">다른 스타일리스트 찾기</button></div>';
    return '';
  }
  /* ===== 진행·결과물 수령 (IA 1.6/1.7) — 진행중 상세: 대화 + 받은 결과물 + 완료 확인 ===== */
  var DELIVER=[{src:'photos/folio1.jpg',label:'코디 1'},{src:'photos/folio2.jpg',label:'코디 2'},{src:'photos/folio3.jpg',label:'코디 3'}];
  var DELIVER_LINKS=[{brand:'유니클로', name:'라운드 니트', size:'M', price:39900},{brand:'무신사 스탠다드', name:'테이퍼드 슬랙스', size:'30', price:35900},{brand:'자라', name:'싱글 코트', size:'M', price:129000},{brand:'나이키', name:'레더 스니커즈', size:'270', price:119000},{brand:'스파오', name:'미니멀 벨트', size:'FREE', price:19900}];
  function reqMsgs(r){ return r.msgs || [{from:'shopper', text:'요청 주신 무드로 코디 3안 보내드려요 🙂 구매 링크도 함께 넣었어요!'}]; }
  function sendReqMsg(i){ var inp=document.getElementById('reqMsgIn'); if(!inp) return; var t=(inp.value||'').trim(); if(!t) return;
    var r=reqs[i]; r.msgs=reqMsgs(r).slice(); r.msgs.push({from:'me', text:t}); saveLS('reqs',reqs); renderReqDetail(); }
  function progressSectionsHTML(r, i){
    var e=EX.filter(function(x){ return x.nm===r.nm; })[0];
    var av = e ? '<img src="'+img(e)+'" style="width:28px;height:28px;border-radius:50%;object-fit:cover;flex:none" onerror="'+FB+'">' : '';
    var thread=reqMsgs(r).map(function(m){
      if(m.from==='me') return '<div style="display:flex;justify-content:flex-end;margin:6px 0"><div style="max-width:76%;background:var(--green);color:#fff;padding:9px 13px;border-radius:14px 14px 3px 14px;font-size:14px;line-height:1.5">'+esc(m.text)+'</div></div>';
      return '<div style="display:flex;gap:8px;align-items:flex-end;margin:6px 0">'+av+'<div style="max-width:76%;background:var(--soft);color:var(--ink);padding:9px 13px;border-radius:14px 14px 14px 3px;font-size:14px;line-height:1.5">'+esc(m.text)+'</div></div>';
    }).join('');
    var chat='<div class="rq-sec"><div class="rq-h">대화</div>'+
      '<div style="background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:12px 14px;max-height:220px;overflow-y:auto">'+thread+'</div>'+
      (r.status==='진행중' ? '<div style="display:flex;gap:8px;margin-top:9px"><input id="reqMsgIn" class="inp" placeholder="메시지를 입력하세요" onkeydown="if(event.key===\'Enter\')sendReqMsg('+i+')" style="flex:1"><button class="tinybtn" onclick="sendReqMsg('+i+')">보내기</button></div>' : '')+
      '</div>';
    var gal=DELIVER.map(function(d){ return '<div style="background-image:url(\''+d.src+'\')"><span class="pspec">'+d.label+'</span></div>'; }).join('');
    var deliver='<div class="rq-sec"><div class="rq-h">받은 결과물</div><div class="dgal">'+gal+'</div>'+
      '<div class="rq-h" style="margin:16px 0 9px">🛍 구매 링크 <span class="num">'+DELIVER_LINKS.length+'</span></div>'+
      '<div class="rs-lines">'+DELIVER_LINKS.map(function(l){ return '<div class="rs-row"><span><b style="color:var(--ink)">'+l.brand+'</b> '+l.name+' · '+l.size+' · <span class="num">'+l.price.toLocaleString()+'</span>원</span><a onclick="toast(\'데모 · 실제 구매 링크는 스타일리스트가 코디와 함께 작성해요\')" style="color:var(--green);font-weight:700;cursor:pointer;white-space:nowrap">보러가기 ›</a></div>'; }).join('')+'</div>'+
      (r.status==='진행중'
        ? '<button class="btn" style="width:100%;margin-top:14px" onclick="reqComplete('+i+')">받았어요 · 완료 확인</button>'+
          '<p style="text-align:center;margin:9px 0 0;color:var(--sub2);font-size:12px">완료 확인 시 에스크로 결제금이 스타일리스트에게 정산돼요</p>'+
          '<div style="margin-top:15px;border-top:1px solid var(--line);padding-top:14px;font-size:13px"><a onclick="openDispute('+i+')" style="color:var(--warn);font-weight:700;cursor:pointer">문제 신고·환불 요청 →</a><span style="color:var(--sub2)"> · </span><a onclick="closeBids();goMy(\'mp-support\')" style="color:var(--green);font-weight:700;cursor:pointer">고객센터 문의 →</a></div>'
        : '')+
      '</div>';
    return chat + deliver;
  }
  /* 완료·후기 — 에스크로 정산 릴리스 안내 + 영수증(IA 1.6/1.8) */
  function settlementSectionHTML(r){
    var price=reqPayPrice(r), method=r.payMethod||'카드';
    var paidDate=r.paidAt ? r.paidAt.slice(0,10).replace(/-/g,'.') : (r.date||'—');
    return '<div class="rq-sec"><div class="rq-h">정산 · 영수증</div>'+
      '<div class="statban go"><span class="sb-ic">'+stIcon('lock')+'</span><div class="sb-tx"><b>에스크로 정산 릴리스</b><p>보관된 결제금 '+price.toLocaleString()+'원이 '+(r.nm||'스타일리스트')+' 스타일리스트에게 지급돼요</p></div></div>'+
      '<div class="rs-lines" style="margin-top:10px">'+
        '<div class="rs-row"><span>결제 금액</span><b class="num">'+price.toLocaleString()+'원</b></div>'+
        '<div class="rs-row"><span>결제 수단</span><b>'+esc(method)+'</b></div>'+
        '<div class="rs-row"><span>결제일</span><b>'+paidDate+'</b></div>'+
        '<div class="rs-row"><span>정산 상태</span><b style="color:var(--green)">지급 완료</b></div>'+
      '</div>'+
      '<div class="note" style="margin-top:8px">실 결제·정산 연동은 후속 · 데모 영수증</div></div>';
  }
  /* ===== 문제 신고·환불(분쟁) · IA 1.9 — 진행중 거래 → 신고 → 에스크로 릴리스 보류 → 관리자 중재(3.B.4) ===== */
  var DISPUTE_REASONS=['미이행','품질 불만','노쇼','기타'];
  function openDispute(i){ _bidReq=i; _ovMode='dispute'; renderDispute(); showOverlay(); }
  function disPick(el){ var seg=el.parentNode; [].forEach.call(seg.children, function(c){ c.classList.remove('on'); }); el.classList.add('on'); }
  function renderDispute(){
    var r=reqs[_bidReq]; if(!r){ closeBids(); return; }
    var e=EX.filter(function(x){ return x.nm===r.nm; })[0]; var price=reqPayPrice(r);
    var head='<div class="bids-head"><button class="xbtn" onclick="closeBids()">✕</button><button class="bids-back" onclick="openReqDetail('+_bidReq+')">‹ 뒤로</button><h2>문제 신고 · 환불 요청</h2><p>에스크로 보관금이 있는 거래만 신고할 수 있어요</p></div>';
    var target = e ? '<div class="rq-sec"><div class="rq-h">대상 거래</div><div class="req-summary-in"><div class="rs-head"><span class="rs-ic"><img src="'+img(e)+'" style="width:34px;height:34px;border-radius:50%;object-fit:cover" onerror="'+FB+'"></span><div class="rs-htx"><b class="rs-title">'+e.nm+' 스타일리스트</b><span class="rs-sum">'+svcLabel(r.svc)+' · 에스크로 보관 '+price.toLocaleString()+'원</span></div></div></div></div>' : '';
    var reasons='<div class="rq-sec"><div class="rq-h">신고 사유</div><div class="seg" id="disReason">'+DISPUTE_REASONS.map(function(rs,k){ return '<span class="o'+(k===0?' on':'')+'" onclick="disPick(this)">'+rs+'</span>'; }).join('')+'</div></div>';
    var detail='<div class="rq-sec"><div class="rq-h">상세 · 증빙</div><textarea class="inp" id="disDetail" rows="3" placeholder="어떤 문제가 있었는지 자세히 적어주세요 (예: 결과물을 받지 못했어요)"></textarea><div class="attach" style="margin-top:10px"><div class="at"><b>증빙 첨부</b><div>대화·스크린샷 (선택)</div></div><div class="toggle" onclick="this.classList.toggle(\'on\')"></div></div></div>';
    var warn='<div class="rq-sec"><div class="statban no"><span class="sb-ic">'+stIcon('lock')+'</span><div class="sb-tx"><b>접수 시 정산 릴리스 보류</b><p>결제금이 묶이고, 스타일리스트 소명 후 관리자가 중재해요</p></div></div></div>';
    var submit='<div class="rq-sec" style="border:none;padding-top:2px"><button class="btn" style="width:100%;background:var(--warn)" onclick="submitDispute()">환불 요청 제출</button><p style="text-align:center;margin:9px 0 0;color:var(--sub2);font-size:12px">데모 · 실제 분쟁 처리는 관리자 큐(3.B.4)</p></div>';
    document.getElementById('bidsBody').innerHTML=head+target+reasons+detail+warn+submit; window.scrollTo({top:0});
  }
  function submitDispute(){ var r=reqs[_bidReq]; if(!r) return;
    var reasonEl=document.querySelector('#disReason .o.on'); var reason=reasonEl?reasonEl.textContent:'기타';
    var detail=(document.getElementById('disDetail').value||'').trim();
    if(!detail){ toast('문제 내용을 입력해주세요'); return; }
    r._prevStatus=r.status; r.dispute={reason:reason, detail:detail, at:new Date().toISOString()}; r.status='분쟁';
    saveLS('reqs',reqs); renderReqs(); openReqDetail(_bidReq); toast('문제 신고가 접수됐어요 · 정산이 보류돼요');
  }
  function disputeSectionHTML(r){ var d=r.dispute||{};
    return '<div class="rq-sec"><div class="rq-h">분쟁 · 중재</div>'+
      '<div class="statban no"><span class="sb-ic">'+stIcon('x')+'</span><div class="sb-tx"><b>정산 릴리스 보류</b><p>문제 신고가 접수돼 결제금이 묶였어요 · 관리자가 중재 중이에요</p></div></div>'+
      '<div class="rs-lines" style="margin-top:10px"><div class="rs-row"><span>신고 사유</span><b>'+esc(d.reason||'—')+'</b></div>'+
        '<div class="rs-row"><span>상세</span><b style="max-width:70%;text-align:right">'+esc(d.detail||'—')+'</b></div></div>'+
      '<div class="rq-btns" style="margin-top:12px"><button class="tinybtn ghost" onclick="withdrawDispute('+_bidReq+')">신고 철회</button><button class="tinybtn" onclick="refundDispute('+_bidReq+')">환불 완료 · 데모</button></div>'+
      '<div class="note" style="margin-top:8px">관리자 분쟁 큐(3.B.4)와 연계 · 스타일리스트 소명 후 중재</div></div>';
  }
  function withdrawDispute(i){ reqs[i].status=reqs[i]._prevStatus||'진행중'; delete reqs[i].dispute; delete reqs[i]._prevStatus; saveLS('reqs',reqs); renderReqs(); openReqDetail(i); toast('신고를 철회했어요 · 거래를 이어가요'); }
  function refundDispute(i){ reqs[i].status='환불'; saveLS('reqs',reqs); renderReqs(); openReqDetail(i); toast('중재로 환불 처리됐어요'); }
  /* 지명 요청 상세 — 진행 상태(스테퍼+배너) + 액션 + 스타일리스트 + 요청 내용 */
  function renderReqDetail(){
    var r=reqs[_bidReq]; if(!r){ closeBids(); return; }
    var e=EX.filter(function(x){return x.nm===r.nm;})[0];
    var shopper = e ? '<div class="rq-sec"><div class="rq-h">스타일리스트</div><div class="req-summary-in"><div class="rs-shopper">'+
        '<img class="av" src="'+img(e)+'" alt="" onerror="'+FB+'">'+
        '<div class="who"><div class="nm">'+e.nm+' 스타일리스트</div><div class="mt"><span class="rvstar">'+starSVG()+'</span> <span class="num">'+e.rating+'</span> · 매칭도 '+e.match+'%</div></div>'+
        '<button class="prof" onclick="detailFromReq('+EX.indexOf(e)+','+_bidReq+',\'req\')">프로필</button>'+
      '</div></div></div>' : '';
    var head='<div class="bids-head"><button class="xbtn" onclick="closeBids()">✕</button>'+
      '<span class="reqtype open">'+(r.open?'받은 견적':'요청 결과')+'</span><h2>'+(r.open?'진행 상황':'보낸 요청')+'</h2><p>'+(r.date?r.date+' 요청':'')+'</p></div>';
    var actions=reqActions(r,_bidReq);
    // 받은 견적 출신(매칭됨)이면 '지난 견적'으로 비교 화면 다시 볼 수 있게
    var pastBids = (r.open && r.awarded && (r.bids||[]).length) ?
      '<div class="rq-sec"><div class="rq-h">지난 견적</div><button class="req-toggle" onclick="openBids('+_bidReq+')">받은 견적 '+r.bids.length+'개 다시 보기 <span class="tg">›</span></button></div>' : '';
    var progress = (r.status==='진행중'||r.status==='완료'||r.status==='후기완료') ? progressSectionsHTML(r,_bidReq) : '';
    var settle = (r.status==='완료'||r.status==='후기완료') ? settlementSectionHTML(r) : '';
    var dispute = (r.status==='분쟁') ? disputeSectionHTML(r) : '';
    document.getElementById('bidsBody').innerHTML = head + reqStatusBlock(r.status) +
      (actions?'<div class="rq-actions">'+actions+'</div>':'') + shopper + progress + settle + dispute +
      '<div class="rq-sec"><div class="rq-h">요청 내용</div>'+reqSummaryHTML(r)+'</div>' + pastBids;
  }
  function renderBids(){
    var r=reqs[_bidReq]; if(!r){ closeBids(); return; }
    var bids=(r.bids||[]).slice();
    bids.sort(function(a,b){ return EX[b.idx].match-EX[a.idx].match; });   // 매칭도 높은 순 고정
    var back = r.awarded ? '<button class="bids-back" onclick="openReqDetail('+_bidReq+')">‹ 진행 상황</button>' : '';
    var badge = r.awarded ? '' : '<span class="reqtype open">견적 요청 결과</span>';   // 지난 견적: 뒤로가기만 (배지 중복 제거)
    var head='<div class="bids-head"><button class="xbtn" onclick="closeBids()">✕</button>'+ back + badge +
      '<h2>'+(r.awarded?'지난 견적':'받은 견적')+'</h2>'+
      '<p><b class="num">'+bids.length+'</b>명의 스타일리스트가 견적을 보냈어요</p>'+
      '<button class="req-toggle" onclick="toggleReqSummary(this)">내가 보낸 요청 내용 <span class="tg">▾</span></button>'+
      '<div class="req-summary" id="reqSummaryPanel">'+reqSummaryHTML(r)+'</div></div>';
    var awardedIdx = (r.awarded && typeof r.awarded.idx!=='undefined') ? r.awarded.idx : null;
    var canPick = (r.status==='견적중');   // 취소·진행중이면 더 이상 스타일리스트 선택 불가
    var cards=bids.map(function(b){ var e=EX[b.idx];
      var isSel=(awardedIdx===b.idx);
      var badges='';   // 선택 표시는 카드 강조 + 하단 '진행중' 버튼으로 (상단 배지 제거)
      var action = isSel ? '<span class="q-status">'+statusLabel(r.status)+'</span>'
                 : (canPick ? '<button class="tinybtn" onclick="confirmAward('+b.idx+')">선택하기</button>' : '');
      return '<div class="qcard'+(isSel?' sel':'')+'">'+
        '<div class="q-l">'+
          '<div class="q-top"><img class="q-ph" src="'+img(e)+'" alt="" onerror="'+FB+'"><div class="q-nm">'+e.nm+' 스타일리스트</div>'+badges+'</div>'+
          '<div class="q-price">총 <span class="num">'+b.price.toLocaleString()+'</span>원</div>'+
          '<div class="q-meta"><span class="rvstar">'+starSVG()+'</span> <span class="num">'+e.rating+'</span> ('+e.review+') · 매칭도 <b>'+e.match+'%</b> · '+svcLabel(r.svc)+' · '+(b.eta||'')+'</div>'+
          '<div class="q-tags">'+e.tags.map(function(t){return '<span>'+t+'</span>';}).join('')+'</div>'+
          '<div class="q-msg">"'+b.msg+'"</div>'+
        '</div>'+
        '<div class="q-r"><button class="tinybtn ghost" onclick="detailFromReq('+b.idx+','+_bidReq+',\'bids\')">프로필 보기</button>'+action+'</div>'+
      '</div>'; }).join('');
    // 지난 견적은 '다시 보기'용 참조 화면 — 매칭됐으면 배너만(읽기용), 완료·후기 액션은 진행 상황 페이지에서
    var lifecycle = (r.status!=='견적중')
      ? '<div class="rq-sec"><div class="rq-h">진행 상태</div>'+(r.awarded?matchedBannerHTML(r):reqAction(r,_bidReq))+'</div>' : '';
    var cancel = (r.status==='견적중') ? '<div class="bids-cancel"><button onclick="confirmCancel('+_bidReq+')">이 견적 요청 취소하기</button></div>' : '';
    document.getElementById('bidsBody').innerHTML=head+lifecycle+'<div class="bids-list">'+cards+'</div>'+cancel;
  }
  /* 스타일리스트 선택은 되돌릴 수 없으므로 확인 모달 후 확정 */
  function confirmAward(idx){ var e=EX[idx];
    askConfirm('<b>'+e.nm+' 스타일리스트</b>로 선택할까요?<div class="cf-sub">선택 후 에스크로 결제를 하면 코디를 시작해요</div>', '선택하기', function(){ awardBid(idx); }); }
  function awardBid(idx){ var r=reqs[_bidReq]; if(!r) return; var e=EX[idx];
    var win=(r.bids||[]).filter(function(b){return b.idx===idx;})[0];
    var so=svcOf(e, r.svc); r.nm=e.nm; r.status='결제대기'; r.awarded={idx:idx, price:win?win.price:(so?so.price:svcMinPrice(e))};
    saveLS('reqs',reqs); renderReqs(); openPay(_bidReq); toast(e.nm+' 스타일리스트 선택 완료 · 결제 후 시작해요');
  }

  /* ===== 결제 (에스크로) · IA 1.8 — 낙찰/수락 → 결제 → 진행중 ===== */
  var FEE_RATE=0.15;   // 수수료율(포함가 표기, 정책은 v2 확정)
  function reqPayPrice(r){ return (r.awarded&&r.awarded.price)||r.price||svcMinPrice(EX.filter(function(x){return x.nm===r.nm;})[0]||{})||0; }
  function openPay(i){ _bidReq=i; _ovMode='pay'; renderPay(); showOverlay(); }
  function payPick(el){ var seg=el.parentNode; [].forEach.call(seg.children, function(c){ c.classList.remove('on'); }); el.classList.add('on'); }
  function renderPay(){
    var r=reqs[_bidReq]; if(!r){ closeBids(); return; }
    var e=EX.filter(function(x){ return x.nm===r.nm; })[0];
    var price=reqPayPrice(r), fee=Math.round(price*FEE_RATE);
    var head='<div class="bids-head"><button class="xbtn" onclick="closeBids()">✕</button><span class="reqtype open">에스크로</span><h2>결제</h2><p>안전결제 후 코디를 시작해요</p></div>';
    var shopperHead = e ? '<div class="rs-head"><span class="rs-ic"><img src="'+img(e)+'" style="width:34px;height:34px;border-radius:50%;object-fit:cover" onerror="'+FB+'"></span><div class="rs-htx"><b class="rs-title">'+e.nm+' 스타일리스트</b><span class="rs-sum">'+svcLabel(r.svc)+(r.occ&&r.occ.length?' · '+r.occ.join('·'):'')+'</span></div></div>' : '';
    var order='<div class="rq-sec"><div class="rq-h">주문 요약</div><div class="req-summary-in">'+shopperHead+
      '<div class="rs-lines">'+
        '<div class="rs-row"><span>서비스 금액</span><b class="num">'+price.toLocaleString()+'원</b></div>'+
        '<div class="rs-row"><span>수수료 (15% 포함)</span><b class="num" style="color:var(--sub)">'+fee.toLocaleString()+'원</b></div>'+
        '<div class="rs-row" style="border-top:1px solid var(--line);margin-top:2px;padding-top:11px"><span style="font-weight:800;color:var(--ink)">결제 금액</span><b class="num" style="color:var(--green);font-size:17px">'+price.toLocaleString()+'원</b></div>'+
      '</div></div></div>';
    var method='<div class="rq-sec"><div class="rq-h">결제 수단</div><div class="seg" id="payMethod"><span class="o on" onclick="payPick(this)">카드</span><span class="o" onclick="payPick(this)">카카오페이</span><span class="o" onclick="payPick(this)">계좌이체</span></div></div>';
    var escrow='<div class="rq-sec"><div class="statban wait"><span class="sb-ic">'+stIcon('lock')+'</span><div class="sb-tx"><b>에스크로 안전결제</b><p>결제금은 안전 보관되고, 완료 확인 후 스타일리스트에게 정산돼요</p></div></div></div>';
    var pay='<div class="rq-sec" style="border:none;padding-top:2px"><button class="btn" style="width:100%" onclick="payConfirm()">'+price.toLocaleString()+'원 결제하고 시작</button><p style="text-align:center;margin-top:9px;color:var(--sub2);font-size:12px">데모 · 실제 결제(PG) 연동은 후속</p></div>';
    document.getElementById('bidsBody').innerHTML=head+order+method+escrow+pay;
    window.scrollTo({top:0});
  }
  function payConfirm(){ var r=reqs[_bidReq]; if(!r) return;
    r.status='진행중'; r.payMethod=((document.querySelector('#payMethod .o.on')||{}).textContent)||'카드'; r.paidAt=new Date().toISOString();
    saveLS('reqs',reqs); renderReqs(); openReqDetail(_bidReq); toast('결제 완료 · '+(r.nm||'')+' 스타일리스트와 코디를 시작해요');
  }
  /* 공용 확인 모달 */
  function askConfirm(msg, yesLabel, onYes, noLabel){
    document.getElementById('confirmMsg').innerHTML=msg;
    var n=document.getElementById('confirmNo'); if(n){ n.textContent=noLabel||'취소하기'; n.onclick=function(){ closeConfirm(); }; }
    var y=document.getElementById('confirmYes'); y.textContent=yesLabel||'확인';
    y.onclick=function(){ closeConfirm(); if(onYes) onYes(); };
    document.getElementById('confirmModal').onclick=function(){ closeConfirm(); };   // 바깥 클릭 닫기 복구(완료 화면에서 해제되므로 매번 복원)
    document.getElementById('confirmModal').classList.add('on');
  }
  function closeConfirm(){ document.getElementById('confirmModal').classList.remove('on'); }
  /* 요청/견적 취소도 되돌릴 수 없으므로 재차 확인 */
  function confirmCancel(i){ var r=reqs[i]; if(!r) return; var isOpen=!!r.open;
    var msg = isOpen ? '이 견적 요청을 취소할까요?<div class="cf-sub">받은 견적이 모두 사라져요</div>'
                     : '이 요청을 취소할까요?<div class="cf-sub">스타일리스트에게 보낸 요청이 취소돼요</div>';
    askConfirm(msg, '취소하기', function(){ if(isOpen) closeBids(); reqCancel(i); }, '돌아가기');
  }

  /* 빈 상태 · 오픈 알림 신청 → 로그인 후 요청내역에 대기로 기록 */
  function notifySignup(){ var done=function(){ addReq({kind:'notify', svc:'image', status:'대기'}); toast('오픈 알림을 신청했어요 · 마이 > 코디 요청 내역에서 확인'); }; if(loggedIn()) done(); else openLogin('오픈 알림 신청', done); }

  var curSvc='all', curOcc='all', curBudget='all', curStyles=[], query='', favOnly=false;
  function toggleClr(){ document.getElementById('clrBtn').style.display=document.getElementById('q').value?'inline':'none'; }
  function doSearch(){ query=(document.getElementById('q').value||'').trim(); toggleClr(); render(); }
  function clearSearch(){ document.getElementById('q').value=''; query=''; toggleClr(); render(); }

  function setActive(el){ [].forEach.call(el.parentNode.children, function(c){ c.classList.remove('on'); }); el.classList.add('on'); }
  function setSvc(el){ setActive(el); curSvc=el.dataset.svc; render(); }
  function setOcc(el){ setActive(el); curOcc=el.dataset.occ; updateDD('ddOcc', curOcc==='all'?'':OCC[curOcc]); closeDD(); render(); }
  function setBud(el){ setActive(el); curBudget=el.dataset.bud; updateDD('ddBud', curBudget==='all'?'':BUD[curBudget]); closeDD(); render(); }
  // 즐겨찾기 필터 — 켜면 즐겨찾기한 스타일리스트만 목록에 표시(다른 필터와 함께 동작)
  function toggleFavOnly(){ favOnly=!favOnly; var b=document.getElementById('favFilterBtn'); if(b) b.classList.toggle('on', favOnly); render(); }
  /* 스타일은 다중선택(OR) — 메뉴 열어둔 채 토글 */
  function setStyle(e, el){ e.stopPropagation();
    var v=el.dataset.style;
    if(v==='all') curStyles=[];
    else { var i=curStyles.indexOf(v); if(i>=0) curStyles.splice(i,1); else curStyles.push(v); }
    syncStyleDD(); render();
  }
  function styleLabel(){ return !curStyles.length ? '' : (curStyles.length<=2 ? curStyles.join('·') : curStyles[0]+' 외 '+(curStyles.length-1)); }
  function syncStyleDD(){
    [].forEach.call(document.querySelectorAll('#ddStyle .ddopt'), function(o){ var v=o.dataset.style;
      o.classList.toggle('on', v==='all' ? curStyles.length===0 : curStyles.indexOf(v)>=0); });
    updateDD('ddStyle', styleLabel());
  }
  function updateDD(id, val){ var d=document.getElementById(id); d.classList.toggle('active', !!val); d.querySelector('.lab').textContent = val ? ' · '+val : ''; }
  function toggleDD(e, id){ e.stopPropagation(); var d=document.getElementById(id); var open=d.classList.contains('open'); closeDD(); if(!open) d.classList.add('open'); }
  function closeDD(){ [].forEach.call(document.querySelectorAll('.dd.open'), function(d){d.classList.remove('open');}); }
  function syncControls(){
    [].forEach.call(document.querySelectorAll('#svctab .t'), function(t){t.classList.toggle('on', t.dataset.svc===curSvc);});
    [].forEach.call(document.querySelectorAll('#ddOcc .ddopt'), function(o){o.classList.toggle('on', o.dataset.occ===curOcc);});
    [].forEach.call(document.querySelectorAll('#ddBud .ddopt'), function(o){o.classList.toggle('on', o.dataset.bud===curBudget);});
    updateDD('ddOcc', curOcc==='all'?'':OCC[curOcc]); updateDD('ddBud', curBudget==='all'?'':BUD[curBudget]); syncStyleDD();
    var fb=document.getElementById('favFilterBtn'); if(fb) fb.classList.toggle('on', favOnly);
  }
  function browseAll(){ curSvc='all'; curOcc='all'; curBudget='all'; curStyles=[]; query=''; favOnly=false; document.getElementById('q').value=''; toggleClr(); document.getElementById('sort').value='match'; syncControls(); render(); }

  function render(){
    var q=query;
    var s=document.getElementById('sort').value;
    var list=EX.filter(function(e){
      return (curSvc==='all'||svcHas(e,curSvc))
        && (curOcc==='all'||e.occ.indexOf(curOcc)>=0)
        && (curBudget==='all'||budOf(svcMinPrice(e))===curBudget)
        && (!curStyles.length||curStyles.some(function(st){return e.tags.indexOf(st)>=0;}))
        && (!q || e.nm.indexOf(q)>=0 || e.tags.join(' ').indexOf(q)>=0)
        && (!favOnly || isFav(e.nm));
    });
    list.sort(function(a,b){ return s==='rating'?b.rating-a.rating : s==='priceA'?svcMinPrice(a)-svcMinPrice(b) : s==='priceD'?svcMinPrice(b)-svcMinPrice(a) : b.match-a.match; });
    var cond = list.length+'명 · '+(favOnly?'즐겨찾기 · ':'')+(curSvc==='all'?'전체 유형':SVC[curSvc])+(curOcc==='all'?'':' · '+OCC[curOcc])+(curBudget==='all'?'':' · 예산 '+BUD[curBudget])+(curStyles.length?' · '+styleLabel():'')+(q?' · "'+q+'"':'');
    var active = curSvc!=='all'||curOcc!=='all'||curBudget!=='all'||curStyles.length||q||favOnly;
    document.getElementById('count').innerHTML = cond + (active?'  ·  <a onclick="browseAll()">초기화하기</a>':'');
    var g=document.getElementById('grid');
    if(!list.length){
      g.innerHTML = favOnly
        ? '<div class="empty"><b>아직 즐겨찾기한 스타일리스트가 없어요</b><p>스타일리스트 카드의 <span style="color:var(--green)">북마크</span>를 눌러 담아보세요 · <a onclick="browseAll()">전체 보기</a></p></div>'
        : '<div class="empty"><b>조건에 맞는 스타일리스트가 아직 없어요</b><p>초기라 스타일리스트를 모으는 중이에요 · <a onclick="notifySignup()">오픈 알림 신청하기</a> 또는 <a onclick="browseAll()">전체 보기</a></p></div>';
      return; }
    g.innerHTML=list.map(function(e){ var idx=EX.indexOf(e);
      var rt=e.rating>0?'<span class="star"><span class="rvstar">'+starSVG()+'</span> '+e.rating+' <small class="rv">('+e.review+')</small></span>':'<span class="star new">신규</span>';
      var svcico='<span class="svcico">'+e.services.map(function(sv){return '<span class="b" title="'+SVC[sv.type]+'">'+svcIcon(sv.type)+'</span>';}).join('')+'</span>';
      return '<div class="ecard" onclick="openDetail('+idx+')"><div class="cover"><img src="'+img(e)+'" alt="" onerror="'+FB+'"><span class="match">매칭도 '+e.match+'%</span>'+
        '<button class="favbtn" title="즐겨찾기" onclick="event.stopPropagation();toggleFav(\''+e.nm+'\')">'+favIcon(isFav(e.nm),true)+'</button></div>'+
        '<div class="eb"><div class="top"><span class="nm">'+e.nm+' 스타일리스트</span>'+rt+'</div>'+
        '<div class="subtags">'+e.tags.slice(0,3).join(' · ')+'</div>'+
        '<div class="cardmid">'+svcico+'<span class="cardprice"><span class="num">'+svcMinPrice(e).toLocaleString()+'</span>원~</span></div>'+
        '</div></div>';
    }).join('');
  }


  /* 폼 선택 헬퍼 */
  function pickOne(el){ var ch=el.parentNode.children; for(var i=0;i<ch.length;i++) ch[i].classList.remove('on'); el.classList.add('on'); validate(); }
  function pickBud(el){ var was=el.classList.contains('on'); var ch=el.parentNode.children; for(var i=0;i<ch.length;i++) ch[i].classList.remove('on'); if(!was) el.classList.add('on'); validate(); }
  function validate(){
    var btn=document.getElementById('reqBtn'); if(!btn) return;
    var occ=document.querySelectorAll('#mOcc .o.on').length>0;
    var bud=!document.getElementById('mBud') || document.querySelectorAll('#mBud .o.on').length>0;   // 지명 요청엔 예산 없음
    var d=document.getElementById('reqDate'); var date=d && d.value && d.value>=todayStr();  // 오늘 이후만 유효
    var ok=occ && bud && !!date;
    btn.disabled=!ok;
    var hint=document.getElementById('reqHint'); if(hint) hint.style.display=ok?'none':'block';
  }

  /* (구) 카드 클릭 → 오른쪽 퀵뷰 드로어 openProfile 제거 — 이제 카드 클릭 시 바로 상세(openDetail)로 이동 */

  /* 자세히 보기 → 스타일리스트 상세 (탭 내 화면 전환)
     hideReq=요청내역에서 진입(견적 요청 버튼 숨김) · _detailBack=뒤로가기 시 돌아갈 이전 화면 */
  var _detailBack=null;
  function backFromDetail(){ if(_detailBack){ var f=_detailBack; _detailBack=null; f(); } else showOnly('listView'); }
  /* 스타일리스트 상세 본문 — 페이지(detailView)와 요청 오버레이(bidsBody) 공용.
     opts.hideReq=견적 요청 버튼 숨김 · opts.back=뒤로 onclick · opts.fav=즐겨찾기 onclick */
  /* 스타일리스트 후기 = 원본(EX.reviews) + 내가 남긴 후기(reqs 후기완료) 합산 — 후기가 스타일리스트 쪽에 반영 */
  function reviewData(e){
    var mine=reqs.filter(function(r){ return r.nm===e.nm && r.status==='후기완료' && r.review; });
    var count=e.review+mine.length;
    var sum=(e.rating*e.review)+mine.reduce(function(a,r){ return a+(r.review.rating||5); },0);
    var rating=count>0 ? Math.round(sum/count*10)/10 : 0;
    var av='<span class="rev-av"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.4"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/></svg></span>';
    var mineHTML=mine.map(function(r){ var occ=(r.occ&&r.occ.length?r.occ.join('·'):svcLabel(r.svc));
      return '<div class="rev">'+av+'<div class="rev-b">"'+r.review.text+'"<div class="who">— 나 · '+occ+'</div></div></div>'; }).join('');
    var baseHTML=e.reviews.map(function(r){ return '<div class="rev">'+av+'<div class="rev-b">"'+r[0]+'"<div class="who">— '+r[1]+'</div></div></div>'; }).join('');
    return { rating:rating, count:count, html:(mineHTML+baseHTML) || '<div class="noreview">아직 등록된 후기가 없어요</div>' };
  }
  function detailBodyHTML(idx, opts){ var e=EX[idx];
    var rd=reviewData(e);
    var rt=rd.count>0?('<span class="rvstar">'+starSVG()+'</span> '+rd.rating+' · 후기 '+rd.count+'건'):'신규 스타일리스트';
    var svcIco=e.services.map(function(sv){ return '<span class="svcico" title="'+SVC[sv.type]+'">'+svcIcon(sv.type)+'</span>'; }).join('');
    var svcCards=e.services.map(function(sv){ var meta=SMODE[sv.type]+(sv.regions&&sv.regions.length?' · '+sv.regions.join('·'):'');
      return '<div class="svctile"><span class="svct-ic">'+svcIcon(sv.type)+'</span><b class="svct-nm">'+SVC[sv.type]+'</b><span class="svct-mode">'+meta+'</span><div class="svct-pr"><span class="num">'+sv.price.toLocaleString()+'</span>원</div></div>'; }).join('');
    var folioHTML=(e.portfolio&&e.portfolio.length?e.portfolio:DEMO_FOLIO).map(function(p){ var s=folioSpec(p); return '<div style="background-image:url(\''+p.src+'\')">'+(s?'<span class="pspec">'+s+'</span>':'')+'</div>'; }).join('');
    return '<div class="detailbody"><a class="back" onclick="'+opts.back+'">← 뒤로</a>'+
      '<div class="dhero">'+
        '<div class="dhero-img"><img src="'+img(e)+'" onerror="'+FB+'"><span class="dside-match">매칭도 '+e.match+'%</span></div>'+
        '<div class="dhero-info">'+
          '<div class="svcicons">'+svcIco+'</div>'+
          '<h1>'+e.nm+' 스타일리스트</h1><div class="dmeta">'+rt+'</div>'+
          '<div class="dstyles">'+e.tags.map(function(t){return '<span>'+t+'</span>';}).join('')+'</div>'+
          '<p class="dbio">'+e.bio+'</p>'+
          '<div class="dhero-acts">'+
            (opts.hideReq?'':'<button class="btn" onclick="requestFor('+idx+')">견적 요청하기 →</button>')+
            '<button class="btn ghost favonly" onclick="'+opts.fav+'" title="'+(isFav(e.nm)?'즐겨찾기 해제':'즐겨찾기 추가')+'" aria-label="'+(isFav(e.nm)?'즐겨찾기 해제':'즐겨찾기 추가')+'">'+favIcon(isFav(e.nm),false)+'</button>'+
          '</div>'+
        '</div>'+
      '</div>'+
      '<div class="dblocks">'+
          '<div class="rcard"><div class="rlabel"><span class="rlt">제공 서비스</span></div><div class="svctiles">'+svcCards+'</div></div>'+
          '<div class="rcard"><div class="rlabel"><span class="rlt">후기</span></div>'+(rd.count>0?'<div class="revsum"><div class="revsum-n num">'+rd.rating+'</div><div class="revsum-r">'+'<span class="revstars">'+starsRO(Math.round(rd.rating))+'</span>'+'<span class="revsum-c">후기 '+rd.count+'개</span></div></div>':'')+'<div class="rrevs">'+rd.html+'</div></div>'+
          '<div class="rcard"><div class="rlabel"><span class="rlt">포트폴리오</span><span class="rcnt">착용 cm·kg</span></div><div class="dgal">'+folioHTML+'</div></div>'+
        '</div>'+
      '</div>';
  }
  /* 스타일리스트찾기 탭 내 상세 페이지 (목록에서 진입) */
  function openDetail(idx, hideReq){ hideReq=!!hideReq; if(!hideReq) _detailBack=null; closeAll();
    document.getElementById('detailView').innerHTML = detailBodyHTML(idx, {hideReq:hideReq, back:'backFromDetail()', fav:'toggleFav(\''+EX[idx].nm+'\');openDetail('+idx+','+(hideReq?1:0)+')'});
    showOnly('detailView');
  }
  /* 요청 오버레이 안에서 스타일리스트 상세 — 탭 전환·폭 점프 없이 같은 자리에서 (뒤로=요청으로 복귀) */
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

  /* 견적 요청 폼 (A안 — 섹션 카드 3그룹: 무엇을 / 언제·얼마 / 요청 메모) */
  function reqFormHTML(svc3, g1label, noBudget){
    return '<div class="grp"><div class="grp-h"><span class="n">1</span>'+(g1label||'어떤 서비스로 받을까요?')+'</div><div class="svc3" id="mSvc">'+svc3+'</div></div>'+
      '<div class="grp"><div class="grp-h"><span class="n">2</span>언제 어디서 진행할까요?</div>'+
        '<div class="feat">상황 · 최대 2개 · <em>필수</em></div><div class="seg" id="mOcc"><span class="o" onclick="toggleOcc(this)">소개팅·데이트</span><span class="o" onclick="toggleOcc(this)">면접·발표</span><span class="o" onclick="toggleOcc(this)">결혼식 하객</span><span class="o" onclick="toggleOcc(this)">여행</span><span class="segbrk"></span><span class="o" onclick="toggleOcc(this)">데일리 스타일링</span><span class="o" onclick="toggleOcc(this)">퍼스널 스타일링</span><span class="o" onclick="toggleOcc(this)">체형 커버 스타일링</span></div>'+
        (noBudget?'':'<div class="feat">예산 · <em>필수</em></div><div class="seg" id="mBud"><span class="o" onclick="pickBud(this)">~5만</span><span class="o" onclick="pickBud(this)">5~10만</span><span class="o" onclick="pickBud(this)">10~15만</span><span class="o" onclick="pickBud(this)">15만+</span></div>')+
        '<div class="feat">일정 · <em>필수</em> · 오늘 이후만 선택 가능</div><input class="inp" type="date" id="reqDate" min="'+todayStr()+'" onchange="validate()">'+
      '</div>'+
      '<div class="grp"><div class="grp-h"><span class="n">3</span>요청사항을 적어주세요</div>'+
        '<input class="inp" id="reqNote" maxlength="100" placeholder="예) 과하지 않게 깔끔한 첫인상 원해요">'+
        '<div class="feat">선호 스타일 · 최대 3개</div><div class="seg" id="mStyle">'+['캐주얼','미니멀','시크','클래식','스트리트','빈티지','스포티','걸리시'].map(function(s){return '<span class="o" onclick="toggleStyleSel(this)">'+s+'</span>';}).join('')+'</div>'+
        '<div class="attach" style="margin-top:16px"><div class="at"><b>내 체형·사이즈 측정 결과 첨부</b><div>시크 스트레이트 · 상·하의 측정값</div></div><div class="toggle on" id="reqAttach" onclick="this.classList.toggle(\'on\')"></div></div>'+
      '</div>';
  }

  var curReq={nm:null, svc:'online'};
  /* 지명 요청 왼쪽 카드의 '선택 서비스 · 가격' 줄 (svc3 선택 시 갱신) */
  function reqSideSvcHTML(e, type){ var sv=svcOf(e,type)||{}; return SVC[type]+' · <b class="num">'+(sv.price||0).toLocaleString()+'</b>원'; }
  function updateReqSide(){ var el=document.getElementById('reqSideSvc'); if(!el||!curReq.nm) return; var e=EX.filter(function(x){return x.nm===curReq.nm;})[0]; if(e) el.innerHTML=reqSideSvcHTML(e, curReq.svc); }

  /* 특정 스타일리스트에게 견적 요청 (로그인 게이트) */
  function requestFor(idx){
    if(!loggedIn()){ closeAll(); openLogin(EX[idx].nm+' 스타일리스트 견적 요청', function(){ requestFor(idx); }); return; }
    var e=EX[idx]; curReq={nm:e.nm, svc:svcPrimary(e).type};
    var SNM={online:'온라인 스타일링', shopping:'동행 쇼핑', image:'이미지 컨설팅'};
    var svc3=e.services.map(function(sv,i){ return '<div class="s '+(i===0?'on':'')+'" data-v="'+sv.type+'" onclick="pickSvc(this)"><div class="i">'+svcIcon(sv.type)+'</div><b>'+SNM[sv.type]+'</b><span class="p num">'+sv.price.toLocaleString()+'</span></div>'; }).join('');
    document.getElementById('requestView').innerHTML=
      '<a class="back" onclick="openDetail('+idx+')">← 뒤로</a>'+
      '<div class="reqsplit">'+
        '<div class="reqside">'+
          '<div class="reqside-img"><img src="'+img(e)+'" onerror="'+FB+'"><span class="dside-match">매칭도 '+e.match+'%</span></div>'+
          '<div class="reqside-b"><div class="rl">견적 요청 대상</div><div class="rn">'+e.nm+' 스타일리스트</div>'+
            '<div class="reqside-meta"><span class="rvstar">'+starSVG()+'</span> '+e.rating+' · 후기 '+e.review+'</div>'+
            '<div class="reqside-svc" id="reqSideSvc">'+reqSideSvcHTML(e, curReq.svc)+'</div>'+
          '</div>'+
        '</div>'+
        '<div class="reqmain">'+
          '<h1>견적 요청</h1><p class="lead">조건을 남기면 이 스타일리스트가 검토하고 제안(견적)을 보내드려요</p>'+
          reqFormHTML(svc3, null, true)+
          '<button class="btn full" id="reqBtn" disabled style="margin-top:22px" onclick="confirmMatch()">견적 요청 보내기</button>'+
          '<p class="reqhint" id="reqHint">상황·일정을 입력하면 보낼 수 있어요</p>'+
        '</div>'+
      '</div>';
    closeAll(); showOnly('requestView'); validate();
  }

  /* 조건으로 견적 요청 (배너 진입, 로그인 게이트) */
  function openMatch(){
    if(!loggedIn()){ openLogin('견적 요청', openMatch); return; }
    curReq={nm:null, svc:'online'};
    var SNM={online:'온라인 스타일링',shopping:'동행 쇼핑',image:'이미지 컨설팅'};
    var svc3=['online','shopping','image'].map(function(v){ return '<div class="s '+(v==='online'?'on':'')+'" data-v="'+v+'" onclick="pickSvc(this)"><div class="i">'+svcIcon(v)+'</div><b>'+SNM[v]+'</b></div>'; }).join('');
    document.getElementById('requestView').innerHTML=
      '<a class="back" onclick="showOnly(\'listView\')">← 목록으로</a>'+
      '<div class="reqpage">'+
      '<h1>견적 요청</h1><p class="lead">조건을 남기면 <b style="color:var(--ink)">여러 스타일리스트가 견적</b>을 보내요</p>'+
      reqFormHTML(svc3)+
      '<button class="btn full" id="reqBtn" disabled style="margin-top:22px" onclick="confirmMatch()">견적 요청 보내기</button>'+
      '<p class="reqhint" id="reqHint">상황·예산·일정을 모두 입력하면 보낼 수 있어요</p></div>';
    closeAll(); showOnly('requestView'); validate();
  }
  function pickSvc(el){ pickOne(el); curReq.svc=el.dataset.v; updateReqSide(); }
  function toggleOcc(el){
    if(el.classList.contains('on')){ el.classList.remove('on'); }
    else { if(document.querySelectorAll('#mOcc .o.on').length>=2) return; el.classList.add('on'); }
    var full=document.querySelectorAll('#mOcc .o.on').length>=2;
    [].forEach.call(document.querySelectorAll('#mOcc .o'), function(o){ if(!o.classList.contains('on')) o.classList.toggle('dis', full); });
    validate();
  }
  /* 선호 스타일 — 최대 3개 다중선택(선택 사항) */
  function toggleStyleSel(el){
    if(el.classList.contains('on')){ el.classList.remove('on'); }
    else { if(document.querySelectorAll('#mStyle .o.on').length>=3) return; el.classList.add('on'); }
    var full=document.querySelectorAll('#mStyle .o.on').length>=3;
    [].forEach.call(document.querySelectorAll('#mStyle .o'), function(o){ if(!o.classList.contains('on')) o.classList.toggle('dis', full); });
  }
  /* 보내기 전 '내 요청서' 확인 (B안 프리뷰) → 확인 시 실제 전송 */
  function confirmMatch(){
    var occ=[].map.call(document.querySelectorAll('#mOcc .o.on'), function(o){ return o.textContent; });
    var budEl=document.querySelector('#mBud .o.on'); var budget=budEl?budEl.textContent:'';
    var dEl=document.getElementById('reqDate'); var date=(dEl && dEl.value)?dEl.value.replace(/-/g,'.'):'';
    var nEl=document.getElementById('reqNote'); var note=(nEl && nEl.value.trim())?nEl.value.trim():'';
    var styles=[].map.call(document.querySelectorAll('#mStyle .o.on'), function(o){ return o.textContent; });
    var she=curReq.nm?EX.filter(function(x){return x.nm===curReq.nm;})[0]:null;
    var sPrice=she?((svcOf(she,curReq.svc)||{}).price||null):null;
    var rows=[['서비스', SVC[curReq.svc]||curReq.svc], ['상황', occ.join(' · ')||'—'],
      (curReq.nm?['예상 가격', sPrice?sPrice.toLocaleString()+'원':'—']:['예산', budget||'—']),
      ['희망 일정', date||'—']];
    if(styles.length) rows.push(['선호 스타일', styles.join(' · ')]);
    if(note) rows.push(['메모', note]);
    var attEl=document.getElementById('reqAttach'); var attach=attEl?attEl.classList.contains('on'):true;
    var icPin='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11l-8.5 8.5a4.5 4.5 0 0 1-6.4-6.4l8.5-8.5a3 3 0 0 1 4.3 4.3l-8.6 8.5a1.5 1.5 0 0 1-2.1-2.1l7.9-7.9"/></svg>';
    var cfTitle=curReq.nm?(curReq.nm+' 스타일리스트에게<br>견적을 요청할까요?'):'이 조건으로<br>견적을 요청할까요?';
    var cfSub=curReq.nm?'스타일리스트가 검토 후 제안을 보내드려요':'조건에 맞는 여러 스타일리스트가 견적을 보내드려요';
    var receipt='<div class="cf-a">'+
      '<span class="cf-a-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h4"/></svg></span>'+
      '<div class="cf-a-eye">요청 내용 확인</div>'+
      '<div class="cf-a-title">'+cfTitle+'</div>'+
      '<div class="cf-a-sub">'+cfSub+'</div>'+
      '<div class="cf-a-list">'+rows.map(function(x){ return '<div class="cf-a-item"><span class="k">'+x[0]+'</span><span class="v">'+x[1]+'</span></div>'; }).join('')+'</div>'+
      (attach?'<span class="cf-a-chip">'+icPin+'체형·사이즈 측정 결과 첨부됨</span>':'<span class="cf-a-chip off">체형·사이즈 측정 결과 미첨부</span>')+
    '</div>';
    askConfirm(receipt, '요청하기', null, '돌아가기');
    document.getElementById('confirmYes').onclick=function(){ submitMatch(); };   // 닫지 않고 그 자리에서 성공 전환
    // 돌아가기 = 모달만 닫힘 → 작성하던 요청서 화면으로 복귀(askConfirm 기본값 유지)
  }
  function submitMatch(){
    var occ=[].map.call(document.querySelectorAll('#mOcc .o.on'), function(o){ return o.textContent; });
    var budEl=document.querySelector('#mBud .o.on'); var budget=budEl?budEl.textContent:'';
    var dEl=document.getElementById('reqDate'); var date=(dEl && dEl.value)?dEl.value.replace(/-/g,'.'):'';
    var nEl=document.getElementById('reqNote'); var note=nEl?nEl.value:'';
    var styles=[].map.call(document.querySelectorAll('#mStyle .o.on'), function(o){ return o.textContent; });
    var attEl=document.getElementById('reqAttach'); var attach=attEl?attEl.classList.contains('on'):true;
    var isOpen = !curReq.nm;   // 지명(스타일리스트 선택) 아니면 오픈 요청(여러 스타일리스트 견적)
    if(isOpen) addReq({open:true, svc:curReq.svc, occ:occ, budget:budget, date:date, note:note, styles:styles, attach:attach, status:'견적중', bids:makeBids(curReq.svc, occ)});
    else { var she=EX.filter(function(x){return x.nm===curReq.nm;})[0]; var sp=she?((svcOf(she,curReq.svc)||{}).price||null):null;
      addReq({nm:curReq.nm, svc:curReq.svc, occ:occ, price:sp, date:date, note:note, styles:styles, attach:attach, status:'대기'}); }
    // 모달을 닫지 않고 그 자리에서 성공 화면으로 전환 (전체화면 점프 없이 자연스럽게)
    var doneSub=isOpen?'마이에서 <b>여러 스타일리스트</b>의 견적을 기다려보세요'
      :('마이에서 '+curReq.nm+' 스타일리스트의 견적을 기다려보세요');
    document.getElementById('confirmMsg').innerHTML=
      '<div class="cf-done"><div class="cf-done-ic">✓</div>'+
      '<div class="cf-done-t">견적 요청을 보냈어요</div>'+
      '<div class="cf-done-s">'+doneSub+'</div></div>';
    var no=document.getElementById('confirmNo'); no.textContent='목록으로'; no.onclick=function(){ closeConfirm(); showOnly('listView'); };
    var yes=document.getElementById('confirmYes'); yes.textContent='마이로 이동'; yes.onclick=function(){ closeConfirm(); goMy('mp-req'); };
    document.getElementById('confirmModal').onclick=null;   // 완료 화면: 바깥 클릭으로 안 닫힘(두 버튼만) — 스테일 폼 노출 방지
  }

  /* ===== 전역 이벤트 ===== */
  document.addEventListener('click', closeDD);
  document.addEventListener('keydown', function(e){ if(e.key==='Escape'){ closeConfirm(); closeAll(); closeDD(); closeBids(); } });
  /* 외부 화면에서 #home·#shop·#my 로 돌아오면 해당 탭 열기 */
  (function(){ var h=(location.hash||'').replace('#',''); if(['home','shop','my'].indexOf(h)>=0) go(h); })();

  render(); renderFavs(); renderReqs(); renderMyAvatar(); renderProfile(); renderMyDiagCard(); renderMyInsight(); renderSupport(); renderNotis(); renderPrivacy(); applyAuthUI();

  /* 친구 초대 링크로 유입(card 공유 → index.html?from=CODE) — 홈 상단 배너로 맞이 */
  (function(){ try{ var from=new URLSearchParams(location.search).get('from'); if(!from) return;
    go('home'); var b=document.getElementById('inviteBanner'); if(b) b.classList.add('on');
  }catch(e){} })();

  /* 결과 페이지의 로그인 게이트로 유입(index.html?login=1&next=my|shop) — 로그인 시트를 열고, 완료 시 해당 탭으로 */
  (function(){ try{ var q=new URLSearchParams(location.search); if(q.get('login')!=='1') return;
    var toShop=(q.get('next')==='shop');
    openLogin(toShop?'전문가 매칭':'결과 저장', function(){ if(toShop) go('shop'); else goMy('mp-diag'); });
  }catch(e){} })();

  /* 결과 저장 후 '마이에서 보기'(index.html?my=mp-diag) — 마이의 해당 서브패널(내 진단결과)로 바로 이동 */
  (function(){ try{ var q=new URLSearchParams(location.search); var mp=q.get('my');
    if(mp && document.querySelector('#smenu a[data-p="'+mp+'"]')) goMy(mp);
    /* 오류 페이지(G.7)에서 넘어온 오류 컨텍스트를 1:1 문의에 프리필 */
    var ctx=q.get('ctx'); if(mp==='mp-support' && ctx){ var ta=document.getElementById('supBody'); if(ta && !ta.value) ta.value='[오류 문의] '+ctx; }
  }catch(e){} })();

  /* ================= 홈 (줄자 리디자인) 인터랙션 — _home2 이식 ================= */
  (function(){
    var RM=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var home=document.getElementById('home'); if(!home) return;
    var $=function(id){return document.getElementById(id);};

    /* 1) 히어로 줄자 — cm·kg 측정 */
    (function(){
      var marker=$('hMarker'), cm=$('hCm'), kg=$('hKg'), tag=$('hMtag'); if(!marker) return;
      function rnd(a,b){ return a+Math.floor(Math.random()*(b-a+1)); }   // 랜덤 측정값
      function kgFor(c){ var m=c/100; return Math.round((19+Math.random()*7)*m*m); } // 키에 맞춘 몸무게(BMI 19~26)
      function pos(c){ return ((c-150)/40)*100; }                        // cm(150~190) → 줄자 위치 %
      var curCm=150, curKg=45;
      // 눈금선을 정수 픽셀 위치로 직접 생성(서브픽셀 두께 불균일 방지). 얇은줄=2cm마다(양끝 제외), 굵은줄=160·170·180
      (function(){
        var ruler=marker.closest('.ruler'); if(!ruler) return;
        var minorEl=ruler.querySelector('.ticks:not(.major)'), majorEl=ruler.querySelector('.ticks.major');
        function build(){ if(!minorEl) return; var w=minorEl.clientWidth; if(!w) return;
          var mh=''; for(var i=1;i<20;i++) mh+='<i style="left:'+Math.round(w*i/20)+'px"></i>'; minorEl.innerHTML=mh;
          if(majorEl){ var jh=''; [0.25,0.5,0.75].forEach(function(f){ jh+='<i style="left:'+Math.round(w*f)+'px"></i>'; }); majorEl.innerHTML=jh; } }
        build(); window.addEventListener('resize', build);
      })();
      if(RM){ var c=rnd(155,186), k=kgFor(c); marker.style.left=pos(c)+'%'; cm.textContent=c; kg.textContent=k; tag.textContent='그래서 나는 어떤 FIT일까?'; return; }
      function measure(){
        var toCm=rnd(155,186), toKg=kgFor(toCm), fCm=curCm, fKg=curKg, s0=null, dur=1500;
        tag.textContent='측정 중…';
        function s(t){ if(!s0)s0=t; var p=Math.min((t-s0)/dur,1), e=1-Math.pow(1-p,3);
          var c=fCm+(toCm-fCm)*e, k=fKg+(toKg-fKg)*e;
          marker.style.left=pos(c)+'%'; cm.textContent=Math.round(c); kg.textContent=Math.round(k);
          if(p<1) requestAnimationFrame(s);
          else { curCm=toCm; curKg=toKg; tag.textContent='그래서 나는 어떤 FIT일까?'; setTimeout(measure, 2200); } }
        requestAnimationFrame(s);
      }
      measure();   // 랜덤값으로 측정 → 잠시 멈춤 → 다시 랜덤 측정(반복)
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

    /* 6) 스타일리스트 연결 — 선 따라 연결 → 딱! 매칭 → 반복 */
    (function(){
      var SH=[{nm:'소희',ph:'photos/p1.jpg',spec:'데일리·소개팅룩',svc:'온라인 스타일링'},{nm:'건형',ph:'photos/p2.jpg',spec:'면접·오피스',svc:'이미지 컨설팅'},{nm:'상민',ph:'photos/p3.jpg',spec:'포멀·하객룩',svc:'동행 쇼핑'}];
      var FLOW=[{occ:'소개팅',s:0,m:97},{occ:'면접·발표',s:1,m:94},{occ:'결혼식 하객',s:2,m:91},{occ:'여행',s:0,m:88},{occ:'일상 코디',s:0,m:95}];
      var chips=[].slice.call(document.querySelectorAll('#hOccRow .oc')), node=$('hShopNode');
      var link=home.querySelector('.connect .link'); if(!node||!link) return;
      var wirefill=link.querySelector('.wirefill'), pulse=link.querySelector('.pulse');
      function highlight(idx){ chips.forEach(function(c,k){ c.classList.toggle('on', k===idx); }); }
      function render(f){ var s=SH[f.s];
        node.innerHTML='<img class="ph" src="'+s.ph+'" alt="" onerror="this.style.visibility=\'hidden\'"><div><div class="snm">'+s.nm+' 스타일리스트</div><div class="spec">'+s.spec+'</div><span class="svcpill">'+s.svc+'</span></div><div class="mt"><div class="pct">–</div><div class="ml">매칭도</div></div><span class="matchbadge">✓ 매칭 완료</span>'; }
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
