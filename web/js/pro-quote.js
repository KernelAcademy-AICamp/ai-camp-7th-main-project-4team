  /* 견적서 페이지 — 요청 클릭 시 진입. 고객 체형진단 결과 상세(브랜드 추천 제외) + 요청 내용 + 제안.
     데이터는 pro.js가 저장한 localStorage 'fitting.pro.reqs'를 공유. 체형 상세는 data/bodytypes.json. */
  function loadLS(k, def){ try{ var v=localStorage.getItem('fitting.'+k); return v?JSON.parse(v):def; }catch(e){ return def; } }
  function saveLS(k, v){ try{ localStorage.setItem('fitting.'+k, JSON.stringify(v)); }catch(e){} }
  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function toast(m){ var t=$('toast'); t.textContent=m; t.classList.add('on'); clearTimeout(window._t); window._t=setTimeout(function(){t.classList.remove('on');},2000); }

  var idx = parseInt(new URLSearchParams(location.search).get('req'),10);
  var candIdx = parseInt(new URLSearchParams(location.search).get('cand'),10);
  var reqs = loadLS('pro.reqs', []);
  var profile = loadLS('pro.profile', null);
  var cands = loadLS('pro.candidates', []);
  var isCand = !isNaN(candIdx) && !!cands[candIdx];   // 견적 보내기(먼저 견적) 진입
  /* 후보 → 유사 요청 레코드(dir:out, 상태 '견적작성'). 실제 발송 전까지 reqs에 넣지 않음 */
  function candRecord(){ var c=cands[candIdx]; return { cust:c.cust, occ:c.occ, service:c.service, type:c.type, bodytype:c.bodytype, gender:c.gender, cm:c.cm, kg:c.kg, budget:c.budget, note:c.note, date:'—', dir:'out', status:'견적작성' }; }
  var MY_PRICE = (profile && profile.services && profile.services[0]) ? profile.services[0].price : 120000;
  var BTMAP = {};
  var offering = false;

  /* 요청자별 임의(데모) 측정치 + 선호핏 */
  var MEASURE_BY_CUST = {
    '한서준':{ top:{shoulder:46,chestFull:38,waist:38,arm:48}, bottom:{waist:38,hip:36}, prefTop:45, prefBottom:42 },
    '김도현':{ top:{shoulder:55,chestFull:46,waist:40,arm:52}, bottom:{waist:44,hip:41}, prefTop:55, prefBottom:46 },
    '정예린':{ top:{shoulder:72,chestFull:48,waist:30,arm:55}, bottom:{waist:34,hip:30}, prefTop:34, prefBottom:40 },
    '이서연':{ top:{shoulder:62,chestFull:38,waist:28,arm:54}, bottom:{waist:24,hip:58}, prefTop:55, prefBottom:35 },
    '박지우':{ top:{shoulder:40,chestFull:44,waist:36,arm:46}, bottom:{waist:30,hip:68}, prefTop:52, prefBottom:74 },
    '최민준':{ top:{shoulder:58,chestFull:56,waist:50,arm:57}, bottom:{waist:50,hip:47}, prefTop:70, prefBottom:55 },
    '이수민':{ top:{shoulder:48,chestFull:52,waist:26,arm:50}, bottom:{waist:22,hip:60}, prefTop:50, prefBottom:36 },
    '박준영':{ top:{shoulder:74,chestFull:52,waist:34,arm:58}, bottom:{waist:38,hip:32}, prefTop:38, prefBottom:44 },
    '최지아':{ top:{shoulder:38,chestFull:42,waist:34,arm:44}, bottom:{waist:30,hip:66}, prefTop:58, prefBottom:70 }
  };
  var MEASURE_DEFAULT = { top:{shoulder:50,chestFull:50,waist:45,arm:50}, bottom:{waist:45,hip:48}, prefTop:55, prefBottom:50 };

  var SVC_SVG = {
    online:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="11" rx="1.6"/><path d="M8.5 20h7"/><path d="M12 16v4"/></svg>',
    shopping:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7.5h12l-1 12.5H7L6 7.5z"/><path d="M9.3 7.5V6a2.7 2.7 0 0 1 5.4 0v1.5"/></svg>',
    image:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.6l1.6 4.5 4.5 1.6-4.5 1.6L12 15.8l-1.6-4.5L5.9 9.7l4.5-1.6L12 3.6z"/><path d="M18.6 13.8v2.2M19.7 14.9h-2.2"/></svg>'
  };
  function svcMeta(s){
    if(s==='shopping') return {cls:'shopping', label:'동행 쇼핑', icon:SVC_SVG.shopping};
    if(s==='image')  return {cls:'image',  label:'이미지 컨설팅', icon:SVC_SVG.image};
    return {cls:'online', label:'온라인 스타일링', icon:SVC_SVG.online};
  }
  function svcLabel(s){ return svcMeta(s).label; }
  function svcBadge(s){ var m=svcMeta(s); return '<span class="svcbadge '+m.cls+'">'+m.icon+' '+m.label+'</span>'; }
  function stClass(s){ return s==='신규'?'nw':(s==='제안발송'?'sent':(s==='수락됨'?'prog':(s==='완료'?'done':'sent'))); }
  function starsRO(n){ var s=''; for(var k=1;k<=5;k++) s+='<span style="color:'+(k<=n?'#e8a13a':'#ddd')+'">★</span>'; return s; }

  /* ── 액션(상태별) ── 받은 요청: 수락/거절 · 진행 중: 완료/취소 · 보낸 제안: 응답 대기 ── */
  function actionHTML(r){
    if(r.status==='신규'){
      return '<div class="act-row"><button class="btn ghost" onclick="confirmReject()">거절하기</button>'+
             '<button class="btn" onclick="confirmAccept()">수락하기</button></div>';
    }
    if(r.status==='제안발송'){ var o=r.offer||{};
      return '<div class="note-quote"><b style="color:var(--green)">제안 발송됨</b> · <span class="num">'+((o.price||0).toLocaleString())+'</span>원<br>'+
        '<span style="font-size:13px;color:var(--sub)">"'+esc(o.msg||'')+'"</span><br>'+
        '<span style="font-size:12.5px;color:var(--sub2)">고객 응답을 기다리는 중이에요</span></div>'+
        '<button class="btn ghost" style="margin-top:10px" onclick="simAccept()">고객 수락 · 데모</button>';
    }
    if(r.status==='수락됨'){
      return '<div class="note-quote"><b style="color:var(--green)">수락됨 · 진행 중</b>'+((r.offer&&r.offer.price)?' · <span class="num">'+r.offer.price.toLocaleString()+'</span>원':'')+'</div>'+
        '<button class="btn" style="margin-top:10px" onclick="confirmComplete()">완료 처리</button>'+
        '<button class="btn ghost" style="margin-top:8px" onclick="confirmCancel()">취소 처리</button>';
    }
    if(r.status==='완료'){
      if(r.review) return '<div class="seclabel">고객 후기</div><div class="note-quote"><span style="letter-spacing:1px">'+starsRO(r.review.rating)+'</span><br>"'+esc(r.review.text)+'"</div>';
      return '<div class="note-quote muted">완료 · 고객 후기를 기다리는 중이에요</div>';
    }
    if(r.status==='거절'){ return '<div class="note-quote muted">거절한 요청이에요'+(r.reason?' · "'+esc(r.reason)+'"':'')+'</div><button class="btn ghost" style="margin-top:10px" onclick="undoReject()">되돌리기</button>'; }
    if(r.status==='취소'){ return '<div class="note-quote muted">취소된 요청이에요'+(r.reason?' · "'+esc(r.reason)+'"':'')+'</div><button class="btn ghost" style="margin-top:10px" onclick="undoCancel()">되돌리기</button>'; }
    if(r.status==='견적작성'){   // 먼저 견적 보내기 — 금액·메시지 입력 후 발송
      return '<div class="offerform">'+
        '<label style="display:block;font-size:12.5px;font-weight:800;color:var(--sub);margin:0 0 6px">견적 금액</label>'+
        '<input id="qPrice" type="number" value="'+svcPrice(r.service)+'">'+
        '<label style="display:block;font-size:12.5px;font-weight:800;color:var(--sub);margin:14px 0 6px">한 줄 메시지</label>'+
        '<textarea id="qMsg" placeholder="예: '+esc(r.occ||'')+' 룩 맞춤 견적 드려요"></textarea>'+
        '<button class="btn" style="margin-top:14px" onclick="sendQuote()">견적 보내기</button>'+
      '</div>';
    }
    return '';
  }
  function sendQuote(){
    var c=cands[candIdx]; if(!c) return;
    var pe=$('qPrice'), me=$('qMsg');
    var price=pe?(parseInt(pe.value,10)||svcPrice(c.service)):svcPrice(c.service);
    var msg=me?me.value.trim():'';
    reqs.unshift({ cust:c.cust, occ:c.occ, service:c.service, type:c.type, bodytype:c.bodytype, gender:c.gender, cm:c.cm, kg:c.kg,
      dir:'out', status:'제안발송', offer:{price:price, msg:msg||(c.occ+' 룩 맞춤 견적 드려요')}, budget:c.budget, date:'방금' });
    saveLS('pro.reqs',reqs);
    var proposed=loadLS('pro.proposed',[]); proposed.push(c.cust); saveLS('pro.proposed',proposed);
    toast(c.cust+' 님에게 견적을 보냈어요');
    setTimeout(function(){ location.href='pro.html'; }, 700);
  }
  function svcPrice(service){ if(profile&&profile.services){ var f=profile.services.filter(function(s){return s.type===service;})[0]; if(f) return f.price; } return MY_PRICE; }
  function accept(){ if(!reqs[idx].offer) reqs[idx].offer={price:svcPrice(reqs[idx].service)}; reqs[idx].status='수락됨'; saveLS('pro.reqs',reqs); render(); toast('요청을 수락했어요'); }
  function reject(){ reqs[idx].reason=''; reqs[idx].status='거절'; saveLS('pro.reqs',reqs); render(); toast('요청을 거절했어요'); }
  function undoReject(){ reqs[idx].status='신규'; reqs[idx].reason=''; saveLS('pro.reqs',reqs); render(); toast('거절을 되돌렸어요'); }
  function simAccept(){ reqs[idx].status='수락됨'; saveLS('pro.reqs',reqs); render(); toast(reqs[idx].cust+' 님이 제안을 수락했어요'); }
  function completeReq(){ reqs[idx].status='완료'; saveLS('pro.reqs',reqs); render(); toast('완료 처리했어요'); }
  function cancelReq(){ reqs[idx].reason=''; reqs[idx].status='취소'; saveLS('pro.reqs',reqs); render(); toast('진행을 취소했어요'); }
  function undoCancel(){ reqs[idx].status='수락됨'; reqs[idx].reason=''; saveLS('pro.reqs',reqs); render(); toast('취소를 되돌렸어요'); }

  /* 결정 버튼 확인 팝업 — 수락/거절/완료/취소 */
  function askConfirm(msg, onYes, yesLabel){
    var ov=$('cfOverlay'); $('cfMsg').textContent=msg; $('cfYes').textContent=yesLabel||'확인';
    ov.classList.add('on');
    function close(){ ov.classList.remove('on'); }
    $('cfYes').onclick=function(){ close(); if(onYes) onYes(); };
    $('cfNo').onclick=close;
    ov.onclick=function(e){ if(e.target===ov) close(); };
  }
  function confirmAccept(){ askConfirm(reqs[idx].cust+' 님의 요청을 수락할까요?', accept, '수락하기'); }
  function confirmReject(){ askConfirm(reqs[idx].cust+' 님의 요청을 거절할까요?', reject, '거절하기'); }
  function confirmComplete(){ askConfirm('완료 처리할까요? 고객 후기를 받을 수 있어요', completeReq, '완료 처리'); }
  function confirmCancel(){ askConfirm('진행을 취소할까요?', cancelReq, '취소하기'); }

  /* ── 고객 체형 = 쇼퍼용 '결과 카드 값' 먼저, 측정값은 가독성 좋게 '자세히 보기' ── */
  function segIdx(pct){ return Math.max(0, Math.min(4, Math.floor((pct==null?50:pct)/20))); }
  function zoneLabel(i, L, R){ return i===0?L:(i===1?L+' 편':(i===2?'표준':(i===3?R+' 편':R))); }
  /* 결과 카드 캐릭터(card.js .fig) 재사용 — 실루엣 clip-path로 체형 모양 + 성별 + 유형색. 옆에 측정 라벨 */
  function bodySilhouette(m, bt, gender){
    gender=(gender==='male'||gender==='female')?gender:'female';
    var sil=(bt&&bt.silhouette)||'straight', pt=(bt&&bt.point)||'#2E4A3B';
    var head='<div class="head '+gender+'">'+(gender==='female'?'<span class="longhair"></span>':'')
      +'<span class="face"></span><span class="cap"></span><span class="ey l"></span><span class="ey r"></span></div>';
    var fig='<div class="fig">'+head+'<div class="body '+esc(sil)+'" style="background-color:'+esc(pt)+'; height:150px"></div></div>';
    function zone(v,L,R){ return zoneLabel(segIdx(v),L,R); }
    var rows=[['어깨',zone(m.top.shoulder,'좁은','넓은')],['가슴',zone(m.top.chestFull,'슬림','볼륨')],
      ['허리',zone(m.bottom.waist,'슬림','볼륨')],['엉덩이',zone(m.bottom.hip,'슬림','볼륨')],
      ['핏 취향',zone(m.prefTop,'타이트','여유')]];
    var list=rows.map(function(x){ return '<div class="bm-row"><span class="bp">'+esc(x[0])+'</span><span class="bz">'+esc(x[1])+'</span></div>'; }).join('');
    return '<div class="bodymap"><div class="bm-fig">'+fig+'</div><div class="bm-list">'+list+'</div></div>';
  }

  /* 쇼퍼용 체형 설명 한 줄(8유형) — 고객 체형을 '~체형이에요!'로 설명 */
  var SHOPPER_DESC={
    STR:'벨트로 허리에 곡선을 더하면 직선 라인이 한층 살아나는 체형이에요!',
    TRI:'상체에 포인트를 주고 시선을 위로 올리면 균형이 살아나는 체형이에요!',
    INV:'상의는 깔끔하게, 하의로 시선을 분산하면 균형이 살아나는 체형이에요!',
    HRG:'허리 라인을 살리면 곡선이 우아하게 떨어지는 체형이에요!',
    BAL:'비율이 고르게 균형 잡혀 뭘 입어도 잘 어울리는 체형이에요!',
    DIA:'세로로 길게 흐르는 라인을 살리면 훨씬 깔끔해지는 체형이에요!',
    RND:'세로 라인과 여유 핏으로 길게 떨어뜨리면 산뜻해지는 체형이에요!',
    TUB:'레이어와 디테일로 입체감을 더하면 멋이 살아나는 체형이에요!'
  };

  /* 고객 체형 — 결과 카드(유형명) 없이: 기본정보 + 8유형색 설명 한 줄 + 웃긴 바디맵 */
  function measureCard(m, bt, r){
    var pt=esc(bt.point||'#2E4A3B');
    var gLabel=r.gender==='male'?'남성':(r.gender==='female'?'여성':'');
    var guide=SHOPPER_DESC[bt.code||r.type] || bt.insight || ((bt.profile&&bt.profile[1])||'');
    return '<div class="card bodycard2">'+
      '<div class="rr-eye">고객 체형 · 제안 참고용</div>'+
      /* ① 기본 — 성별·키·몸무게 */
      '<div class="body-basic">'+(gLabel?esc(gLabel)+' · ':'')+'<span class="num">'+(r.cm||'—')+'</span>cm · <span class="num">'+(r.kg||'—')+'</span>kg</div>'+
      /* ② 체형 + 체형 설명(같이) */
      '<div class="body-type">'+
        '<div class="bt-head"><i style="background:'+pt+'"></i>'+esc(bt.sizeKorea||'')+'</div>'+
        (guide?'<div class="guide-line" style="background:'+pt+'1f;border-left:3px solid '+pt+'">'+esc(guide)+'</div>':'')+
      '</div>'+
      /* ③ 캐릭터 + 어깨·가슴·허리·엉덩이·핏취향(같이) */
      bodySilhouette(m, bt, r.gender)+
    '</div>';
  }

  /* 체형 미첨부 — 성별·키·몸무게만(요청에 늘 있는 값) */
  function basicBodyCard(r){
    var gLabel=r.gender==='male'?'남성':(r.gender==='female'?'여성':'');
    return '<div class="card bodycard2">'+
      '<div class="rr-eye">고객 기본 정보</div>'+
      '<div class="brc-sub">'+(gLabel?esc(gLabel)+' · ':'')+'<span class="num">'+(r.cm||'—')+'</span>cm · <span class="num">'+(r.kg||'—')+'</span>kg</div>'+
      '<p class="basic-note">고객이 체형 진단 결과를 첨부하지 않았어요 · 성별·키·몸무게만 확인할 수 있어요</p>'+
    '</div>';
  }

  /* ① 요청서 영수증 — 고객이 보낸 견적 요청을 고객 화면(cf-a) 톤으로 통일 */
  var IC_DOC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h4"/></svg>';
  var IC_PIN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11l-8.5 8.5a4.5 4.5 0 0 1-6.4-6.4l8.5-8.5a3 3 0 0 1 4.3 4.3l-8.6 8.5a1.5 1.5 0 0 1-2.1-2.1l7.9-7.9"/></svg>';
  function requestReceipt(r, att){
    var out = r.dir==='out';
    // 지명(받은 요청)=이 쇼퍼 한 명에게 → 명확한 예상 가격 / 오픈(보낸 제안)=여러 쇼퍼에 뿌린 요청 → 고객 예산 범위
    var money = out
      ? ['고객 예산', esc(r.budget||'—')]
      : ['예상 가격', '<span class="num">'+svcPrice(r.service).toLocaleString()+'</span>원'];
    var rows=[['서비스 유형', esc(svcLabel(r.service))], ['상황', esc(r.occ||'—')], money, ['희망 일정', esc(r.date||'—')]];
    if(r.styles && r.styles.length) rows.push(['선호 스타일', esc(r.styles.join(' · '))]);
    return '<div class="card reqreceipt">'+
      '<div class="rr-ic">'+IC_DOC+'</div>'+
      /* 요청사항 = 메모 히어로(초록 따옴표 인용). 없으면 방향별 기본 문구 */
      (r.note
        ? '<div class="rr-eye">요청사항</div><div class="rr-hero"><span class="mk">“</span>'+esc(r.note)+'<span class="mk">”</span></div>'
        : '<div class="rr-title">'+(out?'이런 스타일을 원해요!':'견적 요청이 도착했어요!')+'</div>')+
      '<div class="rr-list">'+rows.map(function(x){ return '<div class="rr-item"><span class="k">'+esc(x[0])+'</span><span class="v">'+x[1]+'</span></div>'; }).join('')+'</div>'+
      '<span class="rr-chip'+(att?'':' off')+'">'+IC_PIN+(att?'체형·사이즈 측정 결과 첨부됨':'체형·사이즈 측정 미첨부')+'</span>'+
    '</div>';
  }

  /* ── 전체 렌더 ── */
  // 8유형 성별 축: 구조필드(공유)+gender.{male,female} 콘텐츠 병합. 구 포맷은 raw 폴백.
  function btResolve(t, g){
    if(!t) return t;
    g=(g==='male'||g==='female')?g:'female';
    var c=(t.gender&&(t.gender[g]||t.gender.female))||t;
    return { code:t.code, name:t.name, sizeKorea:t.sizeKorea, silhouette:t.silhouette, point:t.point,
      profile:c.profile, fitOk:c.fitOk, fitNo:c.fitNo, insight:c.insight, match:c.match, signature:c.signature };
  }
  function render(){
    var r = isCand ? candRecord() : reqs[idx];
    if(!r){ $('quoteRoot').innerHTML='<p class="crumb">요청을 찾을 수 없어요.</p><p style="margin-top:10px"><a class="tinybtn" onclick="location.href=\'pro.html\'">요청 내역으로</a></p>'; return; }
    var out = r.dir==='out';
    var bt = btResolve(BTMAP[r.type], r.gender) || {};   // 고객 성별로 콘텐츠 해석
    var m = MEASURE_BY_CUST[r.cust] || MEASURE_DEFAULT;
    // 체형 진단 결과 첨부 여부 — 첨부 O: 캐릭터·측정 / 첨부 X: 성별·키·몸무게만
    var attached = r.attach!==false && !!(bt && (bt.sizeKorea||bt.silhouette));

    var bodyCard = attached ? measureCard(m, bt, r) : basicBodyCard(r);

    // 좌(primary): ① 요청서 먼저 → ② 체형 참고 나중  /  우(sticky): ③ 제안
    $('quoteRoot').innerHTML =
      '<a class="backlink" onclick="location.href=\'pro.html\'">← '+(r.status==='견적작성'?'견적 보내기로':'요청 내역으로')+'</a>'+
      '<p class="crumb">쇼퍼 지원 · '+(r.status==='견적작성'?'견적 보내기':(out?'보낸 제안':'받은 요청'))+'</p>'+
      '<h1>'+esc(r.cust)+' 님'+(r.occ?' · '+esc(r.occ):'')+'</h1>'+
      '<div class="htags">'+svcBadge(r.service)+'<span class="st '+stClass(r.status)+'">'+esc(r.status)+'</span></div>'+
      '<div class="qgrid2">'+
        '<div class="qleft">'+ requestReceipt(r, attached) + bodyCard +'</div>'+
        '<div class="qright">'+
          '<div class="card offer-card"><div class="subhead">'+(r.status==='견적작성'?'견적 작성':(out?'제안 현황':(r.status==='신규'?'요청을 수락하시겠습니까?':'진행 상태')))+'</div>'+ actionHTML(r) +'</div>'+
        '</div>'+
      '</div>';
  }

  /* 상단바(앱 바) — 프로필 이름·아바타·알림 뱃지 채우기 + 계정 메뉴 */
  function toggleAccMenu(e){ if(e) e.stopPropagation(); var m=$('accMenu'); if(m) m.classList.toggle('on'); }
  document.addEventListener('click', function(){ var m=$('accMenu'); if(m) m.classList.remove('on'); });
  function setTxt(id,v){ var e=$(id); if(e&&v!=null) e.textContent=v; }
  function setSrc(id,v){ var e=$(id); if(e&&v) e.src=v; }
  function initHeader(){
    var nm=(profile&&profile.name)||'소희 쇼퍼';
    var av=(profile&&profile.avatar)||'photos/p1.jpg';
    var role=(profile&&profile.services&&profile.services[0]&&profile.services[0].label)||'온라인 스타일링';
    setTxt('hdrName',nm); setTxt('sideName',nm);
    setSrc('hdrAvatar',av); setSrc('sideAvatar',av);
    setTxt('sideRole',role);
    setTxt('pRate',(profile&&profile.rating)||'4.9');
    setTxt('pRev', reqs.filter(function(r){ return r.review; }).length);
    var nw=reqs.filter(function(x){ return x.status==='신규'; }).length;
    var bb=$('bellBadge'); if(bb){ if(nw>0){ bb.style.display='flex'; bb.textContent=nw; } else bb.style.display='none'; }
  }
  window.toggleAccMenu=toggleAccMenu;
  initHeader();

  fetch('data/bodytypes.json').then(function(r){return r.json();}).then(function(j){
    (j.types||[]).forEach(function(t){ BTMAP[t.code]=t; }); render();
  }).catch(function(){ render(); });
