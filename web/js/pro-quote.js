  /* 견적서 페이지 — 요청 클릭 시 진입. 고객 체형진단 결과 상세(브랜드 추천 제외) + 요청 내용 + 제안.
     데이터는 pro.js가 저장한 localStorage 'fitting.pro.reqs'를 공유. 체형 상세는 data/bodytypes.json. */
  function loadLS(k, def){ try{ var v=localStorage.getItem('fitting.'+k); return v?JSON.parse(v):def; }catch(e){ return def; } }
  function saveLS(k, v){ try{ localStorage.setItem('fitting.'+k, JSON.stringify(v)); }catch(e){} }
  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function toast(m){ var t=$('toast'); t.textContent=m; t.classList.add('on'); clearTimeout(window._t); window._t=setTimeout(function(){t.classList.remove('on');},2000); }

  var idx = parseInt(new URLSearchParams(location.search).get('req'),10);
  var candIdx = parseInt(new URLSearchParams(location.search).get('cand'),10);
  /* 어느 패널에서 들어왔는지 — 뒤로가기가 대시보드가 아니라 그 화면으로 돌아가게. 없으면 진입 종류로 추정 */
  var PANEL_LABEL = {dash:'대시보드로', inbox:'요청 내역으로', propose:'견적 보내기로', profile:'내 프로필로', reviews:'받은 후기로', settle:'정산으로'};
  var fromPanel = (function(){
    var f=new URLSearchParams(location.search).get('from');
    if(f && PANEL_LABEL[f]) return f;
    return isNaN(candIdx) ? 'inbox' : 'propose';   // 구 링크(from 없음) 폴백
  })();
  function backHref(){ return 'pro.html?panel='+fromPanel; }
  function goBackToPro(){ location.href=backHref(); }
  var reqs = loadLS('pro.reqs', []);
  var profile = loadLS('pro.profile', null);
  var cands = loadLS('pro.candidates', []);
  var isCand = !isNaN(candIdx) && !!cands[candIdx];   // 견적 보내기(먼저 견적) 진입
  /* 후보 → 유사 요청 레코드(dir:out, 상태 '견적작성'). 실제 발송 전까지 reqs에 넣지 않음 */
  function candRecord(){ var c=cands[candIdx]; return { cust:c.cust, occ:c.occ, service:c.service, type:c.type, bodytype:c.bodytype, gender:c.gender, cm:c.cm, kg:c.kg, budget:c.budget, note:c.note, date:'—', dir:'out', status:'견적작성' }; }
  var MY_PRICE = (profile && profile.services && profile.services[0]) ? profile.services[0].price : 120000;
  var BTMAP = {};
  var BMODEL=null, BDIST=null;   // 예상 치수용 회귀모델·분포(사이즈코리아)
  var offering = false;
  var editDlv = false;   // 방향 A: 제출한 결과물을 인라인으로 다시 편집 중인지
  var addFormOpen = false;   // 결과물 '상품 추가' 폼 펼침 여부(기본 접힘)
  var chatOpen = false;      // 고객과의 대화 드로어 열림 여부
  var chatAnim = false;      // 자동 열림 직후 1프레임 — 닫힌 채로 그려야 오른쪽에서 밀려 들어오는 전환이 걸림
  var dlvCat = '상의';       // 추천 상품 추가 폼의 선택된 카테고리

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
  /* 서비스 아이콘만(글자 뺌) — 상단 태그줄용. 라벨은 title로 접근성 유지 */
  function svcBadgeIcon(s){ var m=svcMeta(s); return '<span class="svcbadge '+m.cls+' icon-only" title="'+esc(m.label)+'" aria-label="'+esc(m.label)+'">'+m.icon+'</span>'; }
  function stClass(s){ return s==='신규'?'nw':(s==='제안발송'?'sent':(s==='수락됨'?'prog':(s==='분쟁'?'warn':(s==='완료'?'done':'sent')))); }
  function starsRO(n){ var s=''; for(var k=1;k<=5;k++) s+='<span style="color:'+(k<=n?'#e8a13a':'#ddd')+'">★</span>'; return s; }

  /* 진행 상태 배너 — 고객 화면(index reqStatusBlock)과 동일 .statban 컴포넌트, 스타일리스트 시점 카피 */
  function stIcon(k){
    var P={ check:'<path d="M20 6L9 17l-5-5"/>',
      clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      flag:'<path d="M5 21V4h13l-2.6 4L18 12H5"/>',
      star:'<path d="M12 3l2.7 5.5 6 .9-4.35 4.2 1.03 6L12 17l-5.38 2.6 1.03-6L3.3 9.4l6-.9z"/>',
      x:'<path d="M18 6L6 18M6 6l12 12"/>',
      card:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10.5h18"/>' };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'+(P[k]||'')+'</svg>';
  }
  /* 상태 → [배너색, 아이콘, 제목, 설명] (스타일리스트 시점) */
  var ST_BAN_PRO={
    '신규':    ['wait','clock','새 요청 도착','새로운 요청을 확인해 주세요'],
    '제안발송':['wait','clock','제안 발송됨','고객의 응답을 기다리고 있어요'],
    '상담중':  ['go','check','요청 수락함','대화로 내용을 맞춰본 뒤 입금을 안내해 주세요'],
    '수락됨':  ['go','check','진행 중','결과물을 작성해 전달해 주세요'],
    '완료':    ['go','flag','서비스 완료','고객의 후기를 기다리고 있어요'],
    '거절':    ['no','x','요청 거절함','요청을 거절했어요'],
    '취소':    ['wait','x','진행 취소됨','요청이 취소됐어요'],
    '분쟁':    ['no','x','분쟁 처리 중','소명을 제출해 주세요']
  };
  function statusBanner(r){
    var b=ST_BAN_PRO[r.status]; if(!b) return '';
    return '<div class="statban '+b[0]+'"><span class="sb-ic">'+stIcon(b[1])+'</span>'+
      '<div class="sb-tx"><b>'+esc(b[2])+'</b><p>'+esc(b[3]).replace(/ · /g,'<br>')+'</p></div></div>';
  }
  /* 진행 스테퍼 — 정상 흐름(요청/제안→수락→진행→완료). 예외(거절/취소/분쟁/견적작성)는 null → 배너 폴백 */
  function progressStepper(r){
    var out = r.dir==='out';
    var labels = out ? ['제안','수락','진행','완료'] : ['요청','수락','진행','완료'];
    var FLOW = out ? {'제안발송':0,'상담중':1,'수락됨':2,'완료':3} : {'신규':0,'상담중':1,'수락됨':2,'완료':3};
    /* 예외 — 흐름에서 멈춘 단계에 경고 표시 (거절=수락 단계 / 취소·분쟁=진행 단계) */
    var EXC = {'거절':{at:1,lb:'거절'},'취소':{at:2,lb:'취소'},'분쟁':{at:2,lb:'분쟁'}};
    var cur, exAt=-1;
    if(r.status in FLOW){ cur=FLOW[r.status]; }
    else if(r.status in EXC){ var e=EXC[r.status]; exAt=e.at; cur=e.at; labels=labels.slice(); labels[e.at]=e.lb; }
    else return null;   // 견적작성 등 → 스테퍼 없음
    var h='';
    labels.forEach(function(lab,i){
      var cls = i===exAt?'exc':(i<cur?'done':(i===cur?'now':''));
      var mark = i===exAt?'✕':(i<cur?'✓':(i+1));
      h+='<div class="pstep '+cls+'"><span class="pn">'+mark+'</span><span class="pl">'+esc(lab)+'</span></div>';
    });
    return '<div class="stepper">'+h+'</div>';
  }
  /* 상태 표시 — 스테퍼(진행 위치) + 상태 바(현재 상태·할 일)를 모든 상태에서 함께 */
  function statusBlock(r){
    var step=progressStepper(r), b=ST_BAN_PRO[r.status];
    var bar = b ? '<div class="statbar '+b[0]+'"><span class="sb-dot"></span><b>'+esc(b[2])+'</b>'
      +'<span class="sb-sep">·</span><span class="sb-d">'+esc(b[3])+'</span></div>' : '';
    if(!step && !bar) return '';
    return '<div class="card statcard">'+(step||'')+bar+'</div>';
  }

  /* 요청서 아래 액션 박스 제목 — '진행 상태'(스테퍼가 대신) 대신 지금 할 일 중심 */
  function actionTitle(r){
    if(r.status==='견적작성') return '견적 작성';
    if(r.status==='제안발송') return '제안 현황';
    var T={'신규':'요청 수락','상담중':'입금 안내','수락됨':'결과물 전달','완료':'완료','거절':'거절한 요청','취소':'취소한 요청','분쟁':'분쟁 대응'};
    return T[r.status]||'진행 관리';
  }

  /* ── 액션(상태별) ── 버튼/입력만. 상태 표시는 render에서 statusBlock으로 별도 ── */
  function actionHTML(r){
    var banner='';
    if(r.status==='신규'){
      return banner+'<div class="act-row"><button class="btn ghost" onclick="confirmReject()">거절하기</button>'+
             '<button class="btn" onclick="confirmAccept()">수락하기</button></div>';
    }
    if(r.status==='제안발송'){ var o=r.offer||{};
      return banner+
        '<div class="note-quote"><b style="color:var(--green)">보낸 견적</b> · <span class="num">'+((o.price||0).toLocaleString())+'</span>원'+
        (o.msg?'<br><span style="font-size:13px;color:var(--sub)">"'+esc(o.msg)+'"</span>':'')+'</div>'+
        '<button class="btn ghost" style="margin-top:10px" onclick="simAccept()">고객 수락 · 데모</button>';
    }
    if(r.status==='수락됨'){
      var price=(r.offer&&r.offer.price)?'<div class="note-quote"><b style="color:var(--green,#2E4A3B)">확정 금액</b> · <span class="num">'+r.offer.price.toLocaleString()+'</span>원</div>':'';
      var cancel='<button class="btn ghost" style="margin-top:8px" onclick="confirmCancel()">취소 처리</button>';
      // 제출 후에도 완료 전까지는 수정 가능. 결과물=사진·내용(전 서비스 공통) + 구매 상품·예산(온라인 추가)
      if(r.deliver) return banner + price + deliverSummary(r) +
        '<button class="btn ghost" style="margin-top:10px" onclick="editDeliver()">결과물 수정</button>'+
        '<button class="btn" style="margin-top:8px" onclick="confirmComplete()">완료 처리</button>' + cancel;
      var hasDraft=((r._draft||[]).length || (r._photos||[]).length || (r._dmsg||'').trim());
      return banner + price + '<button class="btn" style="margin-top:10px" onclick="openDeliverModal()">결과물 작성'+(hasDraft?' (임시저장)':'')+' →</button>' + cancel;
    }
    if(r.status==='분쟁'){ var dp=r.dispute||{};
      return banner+
        '<div class="note-quote" style="border-color:#e6b8b8;background:#fbf3f3"><span style="font-size:13px">사유: '+esc(dp.reason||'—')+'<br>"'+esc(dp.detail||'')+'"</span></div>'+
        (dp.reply
          ? '<div class="note-quote" style="margin-top:10px"><b style="color:var(--green,#2E4A3B)">내 소명 제출됨</b><br><span style="font-size:13px;color:var(--sub,#6b6a67)">"'+esc(dp.reply)+'"</span><br><span style="font-size:12px;color:var(--sub2,#8a857b)">관리자 중재를 기다리는 중이에요</span></div>'
          : '<div class="offerform" style="margin-top:10px"><label>소명 · 반박</label><textarea id="dispReply" placeholder="결과물 전달 내역·대화 등 상황을 설명해주세요"></textarea><button class="btn" style="margin-top:10px" onclick="submitDisputeReply()">소명 제출</button></div>')+
        '<p class="note-quote muted" style="margin-top:10px">관리자 중재(3.B.4)로 환불·정산이 결정돼요</p>';
    }
    if(r.status==='완료'){
      if(r.review) return banner+'<div class="seclabel">고객 후기</div><div class="note-quote"><span style="letter-spacing:1px">'+starsRO(r.review.rating)+'</span><br>"'+esc(r.review.text)+'"</div>';
      return banner;
    }
    if(r.status==='거절'){ return banner+(r.reason?'<div class="note-quote muted">"'+esc(r.reason)+'"</div>':'')+'<button class="btn ghost" style="margin-top:10px" onclick="undoReject()">되돌리기</button>'; }
    if(r.status==='취소'){ return banner+(r.reason?'<div class="note-quote muted">"'+esc(r.reason)+'"</div>':'')+'<button class="btn ghost" style="margin-top:10px" onclick="undoCancel()">되돌리기</button>'; }
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
    toast(c.cust+'님에게 견적을 보냈어요');
    setTimeout(goBackToPro, 700);
  }
  function svcPrice(service){ if(profile&&profile.services){ var f=profile.services.filter(function(s){return s.type===service;})[0]; if(f) return f.price; } return MY_PRICE; }
  /* 수락 = 대화 시작까지만. 결제 안내는 '입금 요청하기'(askPay)로 분리 — 수락과 동시에 결제대기로 넘기지 않음 */
  function accept(){ if(!reqs[idx].offer) reqs[idx].offer={price:svcPrice(reqs[idx].service)}; reqs[idx].status='상담중'; pushSysMsg(reqs[idx],'acceptReq'); saveLS('pro.reqs',reqs); render(); toast('요청을 수락했어요 · 대화로 내용을 맞춰보세요'); }
  /* 입금 요청(명시 액션) — 상담중 → 결제대기 */
  function askPay(){ var r=reqs[idx]; if(!r) return; r.status='결제대기'; pushSysMsg(r,'askPay'); saveLS('pro.reqs',reqs); render(); toast('서비스 결제를 안내했어요 · 고객 입금을 기다려요'); }
  function confirmAskPay(){ askConfirm(reqs[idx].cust+'님에게 입금을 요청할까요?', askPay, '입금 요청하기', '요청하면 고객에게 결제가 안내돼요'); }
  /* 입금 확인(데모) — 결제대기 → 수락됨(결과물 작성 열림) */
  function markPaid(){ var r=reqs[idx]; if(!r) return; r.status='수락됨'; r.paidAt=new Date().toISOString(); pushSysMsg(r,'paid'); saveLS('pro.reqs',reqs); render(); toast('입금이 확인됐어요 · 결과물을 작성해 주세요'); }
  function confirmPayment(){ askConfirm(reqs[idx].cust+'님의 입금을 확인할까요?', markPaid, '확인하기', '확인하면 코디를 진행할 수 있어요'); }
  function reject(){ reqs[idx].reason=''; reqs[idx].status='거절'; saveLS('pro.reqs',reqs); render(); toast('요청을 거절했어요'); }
  function undoReject(){ reqs[idx].status='신규'; reqs[idx].reason=''; saveLS('pro.reqs',reqs); render(); toast('거절을 되돌렸어요'); }
  function simAccept(){ reqs[idx].status='상담중'; pushSysMsg(reqs[idx],'acceptOffer'); saveLS('pro.reqs',reqs); render(); toast(reqs[idx].cust+'님이 제안을 수락했어요 · 대화로 내용을 맞춰보세요'); }
  function completeReq(){ reqs[idx].status='완료'; saveLS('pro.reqs',reqs); render(); toast('완료 처리했어요'); }
  function cancelReq(){ reqs[idx].reason=''; reqs[idx].status='취소'; saveLS('pro.reqs',reqs); render(); toast('진행을 취소했어요'); }
  function undoCancel(){ reqs[idx].status='수락됨'; reqs[idx].reason=''; saveLS('pro.reqs',reqs); render(); toast('취소를 되돌렸어요'); }
  /* 분쟁 소명(2.x/3.B.4) — 스타일리스트 반박 제출 → 관리자 중재 대기 */
  function submitDisputeReply(){ var el=$('dispReply'); var v=el?el.value.trim():''; if(!v){ toast('소명 내용을 입력해주세요'); return; }
    if(!reqs[idx].dispute) reqs[idx].dispute={}; reqs[idx].dispute.reply=v; saveLS('pro.reqs',reqs); render(); toast('소명을 제출했어요 · 관리자 중재를 기다려요'); }

  /* ===== 결과물 작성·전달 (IA 2.1.2) — 온라인: 브랜드·상품명·사이즈·가격·구매링크 n개 + 합계·예산 검증 → 제출 → 고객 수령(1.6/1.7) ===== */
  function pval(id){ var el=$(id); return el?el.value.trim():''; }
  function itemLine(it){ return (it.cat?'<span class="dlv-cat">'+esc(it.cat)+'</span> ':'')+'<b style="color:var(--ink,#1c1a17)">'+esc(it.brand)+'</b> '+esc(it.name)+' · '+esc(it.size)+' · <span class="num">'+(it.price?Number(it.price).toLocaleString():'—')+'</span>원'+(it.url?' 🔗':''); }
  /* 예산 요약(간단) — 합계 한 줄 + 예산 상태 칩. 위 초록 밴드와 구분되게 중립색 */
  /* 옷값 합계 — C안: 구분선 없이 작게 오른쪽에 '총 N원'(참고용) */
  function budgetLiteHTML(items){
    return '<div class="budget-lite">총 <b class="num">'+itemsTotal(items).toLocaleString()+'원</b></div>';
  }
  /* 카테고리 칩 선택(추가 폼) — 리렌더 없이 클래스만 토글 */
  function pickCat(el, cat){ dlvCat=cat; var p=el.parentNode; if(p){ [].forEach.call(p.querySelectorAll('.catchip'), function(c){ c.classList.toggle('on', c===el); }); } }
  function itemsTotal(items){ return (items||[]).reduce(function(a,it){ return a+(parseInt(it.price,10)||0); },0); }
  /* "10~15만"·"~5만"·"15만+" → {min,max} (원) */
  function budgetRange(b){ b=(b||'').replace(/\s/g,''); if(!b) return null;
    var nums=(b.match(/\d+/g)||[]).map(function(n){ return parseInt(n,10)*10000; }); if(!nums.length) return null;
    if(b.charAt(0)==='~') return {min:0, max:nums[0]};
    if(/\+$/.test(b)) return {min:nums[0], max:Infinity};
    if(nums.length>=2) return {min:nums[0], max:nums[1]};
    return {min:0, max:nums[0]}; }
  function budgetText(range, raw){ if(!range) return raw||'—'; if(range.max===Infinity) return (range.min/10000)+'만원 이상'; return (range.min?(range.min/10000)+'~':'~')+(range.max/10000)+'만원'; }
  function budgetStatus(total, range){ if(!range) return {label:'예산 미설정', color:'var(--sub2,#8a857b)'};
    if(total < range.min) return {label:'예산보다 낮아요', color:'#b8862b'};
    if(range.max===Infinity || total <= range.max) return {label:'예산 내 ✓', color:'var(--green,#2E4A3B)'};
    return {label:'예산 '+(total-range.max).toLocaleString()+'원 초과', color:'#c0392b'}; }
  /* 합계·예산 서머리 (모달 + 제출요약 공용) */
  function budgetSummaryHTML(items, req, compact){
    var total=itemsTotal(items), range=budgetRange(req.budget), st=budgetStatus(total, range);
    var pct = range ? (range.max&&range.max!==Infinity ? Math.min(100, total/range.max*100) : (total>=range.min?100:(range.min?total/range.min*100:0))) : 0;
    var bar = compact ? '' : '<div class="dlv-bar"><i style="width:'+pct.toFixed(0)+'%;background:'+st.color+'"></i></div>';
    return '<div class="dlv-bud"><div class="r"><span>추천 상품 '+(items||[]).length+'개 · 합계</span><b class="num" style="color:'+st.color+'">'+total.toLocaleString()+'원</b></div>'+
      '<div class="r"><span>고객 예산</span><span>'+budgetText(range, req.budget)+'</span></div>'+bar+
      '<div style="text-align:right;font-size:12.5px;font-weight:800;color:'+st.color+';margin-top:'+(compact?'2':'7')+'px">'+st.label+'</div></div>'; }
  function ensureDlvStyle(){ if($('dlvStyle')) return; var s=document.createElement('style'); s.id='dlvStyle';
    s.textContent='.dlv-modal{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center}'+
      '.dlv-bd{position:absolute;inset:0;background:rgba(20,18,16,.45)}'+
      '.dlv-pan{position:relative;background:#fff;border-radius:18px;width:min(520px,93vw);max-height:88vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.28)}'+
      '.dlv-h{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--line,#ece9e3)}'+
      '.dlv-h b{font-size:16px;font-weight:800}.dlv-h span{font-size:12.5px;color:var(--sub,#6b6a67)}'+
      '.dlv-x{background:none;border:none;font-size:20px;line-height:1;cursor:pointer;color:var(--sub2,#8a857b)}'+
      '.dlv-b{padding:16px 20px;overflow-y:auto}.dlv-f{padding:13px 20px;border-top:1px solid var(--line,#ece9e3)}'+
      '.dlv-bud{background:var(--soft,#f5f3ee);border-radius:12px;padding:13px 15px;margin-bottom:14px}'+
      '.dlv-bud .r{display:flex;justify-content:space-between;align-items:center;font-size:13.5px;margin-bottom:4px}.dlv-bud .r span{color:var(--sub,#6b6a67)}'+
      '.dlv-bar{height:8px;border-radius:5px;background:#e3e0d8;overflow:hidden;margin-top:9px}.dlv-bar>i{display:block;height:100%;border-radius:5px;transition:width .2s}'+
      '.dlv-it{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--line,#ece9e3);font-size:13.5px}.dlv-it:last-child{border:none}'+
      '.dlv-sec{display:flex;align-items:baseline;flex-wrap:wrap;gap:5px;font-size:15px;font-weight:800;color:var(--sub,#6E6B63);margin:16px 0 9px;letter-spacing:.01em}'+
      '.dlv-cap{font-size:12px;font-weight:600;color:var(--sub2,#a6a29a)}'+
      '.dlv-div{height:1px;background:var(--line,#e6e5e1);margin:20px 0 4px}'+
      '.dlv-thumbs{display:flex;gap:8px;flex-wrap:wrap;margin:2px 0 10px}'+
      '.dlv-th{position:relative;width:74px;height:74px;border-radius:10px;background:#eee center/cover;background-size:cover}'+
      '.dlv-th button{position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;border:none;background:rgba(20,18,16,.72);color:#fff;font-size:11px;line-height:1;cursor:pointer}'+
      '.dlv-up{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;width:74px;height:74px;border:1.5px dashed var(--line2,#d8d4cc);border-radius:11px;font-size:11px;font-weight:700;color:var(--sub,#6b6a67);cursor:pointer;flex:none}'+
      '.dlv-up:hover{background:var(--soft,#eee);border-color:var(--green-line,#CBDDD2)}.dlv-up svg{width:22px;height:22px}';
    document.head.appendChild(s); }
  function openDeliverModal(){ ensureDlvStyle(); var m=$('deliverModal'); if(!m){ m=document.createElement('div'); m.id='deliverModal'; m.className='dlv-modal'; document.body.appendChild(m); } renderDeliverModal(); m.style.display='flex'; }
  function saveDlvMsg(){ var el=$('dvMsg'); if(el&&reqs[idx]) reqs[idx]._dmsg=el.value; }
  function closeDeliverModal(){ saveDlvMsg(); if(reqs[idx]) saveLS('pro.reqs',reqs); var m=$('deliverModal'); if(m) m.style.display='none'; render(); }
  /* 결과물 편집 새로고침 — 모달이 열려 있으면 모달, 아니면(방향 A 인라인) 전체 렌더 */
  function refreshDlv(){ var m=$('deliverModal'); if(m && m.style.display==='flex'){ renderDeliverModal(); } else { render(); } }
  var MAX_PHOTOS=6, MAX_PHOTO_BYTES=800000;
  function photoThumbsHTML(photos, editable){ if(!(photos||[]).length) return '';
    return '<div class="dlv-thumbs">'+photos.map(function(p,k){ return '<div class="dlv-th" style="background-image:url(\''+p.data+'\')">'+(editable?'<button onclick="delPhoto('+k+')">✕</button>':'')+'</div>'; }).join('')+'</div>'; }
  var IC_LINK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 14.5l5-5"/><path d="M11.5 6.5l1-1a3.5 3.5 0 0 1 5 5l-2 2"/><path d="M12.5 17.5l-1 1a3.5 3.5 0 0 1-5-5l2-2"/></svg>';
  var IC_X='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>';
  var IC_CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5.5 5.5L20 6.5"/></svg>';
  /* 상품 카드 1개 — editable=작성폼(삭제 O) / false=제출요약(삭제 X). 2줄: [카테고리] 브랜드 상품 / 사이즈·가격·링크 */
  function pcardHTML(it, k, editable){
    var price=(it.price?Number(it.price).toLocaleString():'—');
    return '<div class="pcard'+(editable?' picked':' ro')+'">'+
      (editable?'<span class="pmark" aria-label="담김">'+IC_CHECK+'</span>':'')+
      (editable?'<button class="pdel" onclick="delDeliverItem('+k+')" aria-label="삭제">'+IC_X+'</button>':'')+
      (it.cat?'<span class="pcat">'+esc(it.cat)+'</span>':'')+
      '<div class="pbody">'+
        '<div class="pr1"><b class="pbrand">'+esc(it.brand)+'</b><span class="pbar">|</span>'+esc(it.name)+' <b class="psz">'+esc(it.size)+'</b></div>'+
        '<div class="pr2"><b class="num">'+price+'원</b>'+
          (it.url?'<span class="pbar">|</span><span class="plk" title="구매 링크">'+IC_LINK+'</span>':'')+'</div>'+
      '</div>'+
    '</div>';
  }
  /* 구매 상품 블록 (온라인 한정) — 상품 리스트 + 추가 폼 + 합계 */
  function productBlockHTML(r){ var draft=r._draft||[];
    // A 카드형 — 상품 1개 = 카드 1개(카테고리·상품명 강조)
    var list=draft.map(function(it,k){ return pcardHTML(it,k,true); }).join('');
    var CATS=['상의','하의','아우터','신발','기타'];
    var addUI = addFormOpen
      ? '<div class="pform">'+
          '<div class="pform-h">새 상품 담기</div>'+
          '<div class="catrow">'+CATS.map(function(c){ return '<span class="catchip'+(c===dlvCat?' on':'')+'" onclick="pickCat(this,\''+c+'\')">'+c+'</span>'; }).join('')+'</div>'+
          '<div class="offerform">'+
            '<label>브랜드</label><input id="dvBrand" placeholder="예: 유니클로">'+
            '<label>상품 이름</label><input id="dvName" placeholder="예: 라운드 니트">'+
            '<div style="display:flex;gap:8px"><div style="flex:1"><label>사이즈</label><input id="dvSize" placeholder="M / 30 / 270"></div><div style="flex:1"><label>가격(원)</label><input id="dvPrice" type="number" placeholder="39900"></div></div>'+
            '<label>구매 링크</label><input id="dvUrl" placeholder="https://...">'+
          '</div>'+
          '<div class="pform-act"><button class="p-cancel" onclick="toggleAddForm()">취소</button><button class="p-add" onclick="addDeliverItem()">담기</button></div></div>'
      : '<button class="dlv-addbtn" onclick="toggleAddForm()">+ 상품 담기</button>';
    // 담은 목록 헤더는 담긴 게 있을 때만 — 비어 있으면 '담기' 하나만 보이게
    var listHead=draft.length ? '<div class="plist-h">담은 상품 <b>'+draft.length+'개</b></div>' : '';
    return '<div class="dlv-sec">추천 상품 <span class="dlv-req">· 필수</span></div>'+
      listHead+list+addUI+(draft.length?budgetLiteHTML(draft):''); }
  /* 사진 블록 (전 서비스 공통) */
  var IC_CAM='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6.5" width="18" height="13" rx="2.5"/><circle cx="12" cy="13" r="3.4"/><path d="M8.5 6.5l1.3-2.2h4.4l1.3 2.2"/></svg>';
  function photoBlockHTML(r){ var photos=r._photos||[];
    var thumbs=(photos||[]).map(function(p,k){ return '<div class="dlv-th" style="background-image:url(\''+p.data+'\')"><button onclick="delPhoto('+k+')">✕</button></div>'; }).join('');
    return '<div class="dlv-sec">코디 착용 예시 <span class="dlv-cap">· 장당 800KB 이하, 최대 '+MAX_PHOTOS+'장</span></div>'+
      '<div class="dlv-thumbs">'+thumbs+'<label class="dlv-up">'+IC_CAM+'<span>사진 추가</span><input type="file" accept="image/*" multiple onchange="attachPhoto(this)" style="display:none"></label></div>'; }
  /* 내용/코디 노트 (전 서비스 공통) */
  function contentBlockHTML(r){ return '<div class="dlv-sec" style="margin-top:16px">코디 노트</div><div class="offerform"><textarea id="dvMsg" style="min-height:104px" placeholder="착용 팁·코디 포인트를 적어주세요">'+esc(r._dmsg||'')+'</textarea></div>'; }
  function renderDeliverModal(){ var r=reqs[idx], m=$('deliverModal'); if(!m||!r) return;
    var online=(r.service==='online'), draft=r._draft||[];
    var submit='결과물 '+(r.deliver?'다시 제출':'제출')+(online&&draft.length ? ' ('+draft.length+'개 · '+itemsTotal(draft).toLocaleString()+'원)' : '');
    m.innerHTML='<div class="dlv-bd" onclick="closeDeliverModal()"></div><div class="dlv-pan">'+
      '<div class="dlv-h"><div><b>'+(r.deliver?'결과물 수정':'결과물 작성')+'</b> <span>'+esc(r.cust)+'님 · '+svcLabel(r.service)+'</span></div><button class="dlv-x" onclick="closeDeliverModal()">✕</button></div>'+
      '<div class="dlv-b">'+(online?productBlockHTML(r):'')+photoBlockHTML(r)+contentBlockHTML(r)+'</div>'+
      '<div class="dlv-f"><button class="btn" onclick="sendDeliver()">'+submit+'</button></div></div>';
  }
  /* 제출한 결과물 요약 — 회색박스 없이 담은 상품 카드(읽기전용)·사진·노트, 합계는 맨 밑 */
  function deliverSummary(r){ ensureDlvStyle(); var d=r.deliver||{}, items=d.items||[], photos=d.photos||[];
    var out='';
    if(items.length) out+=items.map(function(it,k){ return pcardHTML(it,k,false); }).join('');
    if(photos.length) out+='<div style="margin-top:8px">'+photoThumbsHTML(photos, false)+'</div>';
    if(d.msg) out+='<div class="dlv-note-ro">'+esc(d.msg)+'</div>';
    if(items.length) out+=budgetLiteHTML(items);   // 가격 합계는 맨 밑
    return out;
  }
  function addDeliverItem(){ var br=pval('dvBrand'), nm=pval('dvName'); if(!br||!nm){ toast('브랜드와 상품명을 입력해주세요'); return; }
    saveDlvMsg(); reqs[idx]._draft=(reqs[idx]._draft||[]).concat([{ cat:dlvCat, brand:br, name:nm, size:pval('dvSize')||'—', price:pval('dvPrice')||'', url:pval('dvUrl') }]);
    saveLS('pro.reqs',reqs); refreshDlv(); }
  function delDeliverItem(k){ if(reqs[idx]._draft) reqs[idx]._draft.splice(k,1); saveDlvMsg(); saveLS('pro.reqs',reqs); refreshDlv(); }
  function attachPhoto(input){ var files=input.files; if(!files||!files.length) return; var r=reqs[idx]; r._photos=r._photos||[]; saveDlvMsg();
    [].forEach.call(files, function(f){
      if(!/^image\//.test(f.type)) return;
      if(r._photos.length>=MAX_PHOTOS){ toast('사진은 최대 '+MAX_PHOTOS+'장까지예요'); return; }
      if(f.size>MAX_PHOTO_BYTES){ toast(f.name+' — 800KB 이하만 첨부돼요(데모)'); return; }
      var rd=new FileReader(); rd.onload=function(){ if(r._photos.length>=MAX_PHOTOS) return; r._photos.push({ name:f.name, data:rd.result }); saveLS('pro.reqs',reqs); refreshDlv(); }; rd.readAsDataURL(f);
    });
    input.value=''; }
  function delPhoto(k){ if(reqs[idx]._photos) reqs[idx]._photos.splice(k,1); saveDlvMsg(); saveLS('pro.reqs',reqs); refreshDlv(); }
  /* 완료 전 수정 — 제출본을 초안으로 되돌려 모달 열기 */
  function editDeliver(){ var r=reqs[idx]; if(!r||!r.deliver) return;
    r._draft=(r.deliver.items||[]).slice(); r._photos=(r.deliver.photos||[]).slice(); r._dmsg=r.deliver.msg||'';
    editDlv=true; render(); }
  /* 방향 A: 제출본 인라인 편집 취소 — 초안 버리고 제출본 요약으로 복귀 */
  function cancelEditDeliver(){ var r=reqs[idx]; if(r){ delete r._draft; delete r._photos; delete r._dmsg; } editDlv=false; render(); }
  function sendDeliver(){ saveDlvMsg(); var r=reqs[idx];
    var items=r._draft||[], photos=r._photos||[], msg=(r._dmsg||'').trim();
    if(!items.length && !photos.length && !msg){ toast('상품·사진·내용 중 하나 이상 추가해주세요'); return; }
    r.deliver={ items:items, photos:photos, msg:r._dmsg||'', sentAt:new Date().toISOString() }; delete r._draft; delete r._photos; delete r._dmsg;
    r.status='완료';   // 제출 = 최종. 수정 불가 · 바로 고객에게 · 완료로 이동
    pushSysMsg(r,'deliver');
    saveLS('pro.reqs',reqs); editDlv=false; addFormOpen=false; var m=$('deliverModal'); if(m) m.style.display='none'; render(); toast(r.cust+'님에게 결과물을 전달했어요 · 완료로 넘어갔어요'); }
  /* 제출 재확인 — 수정 불가·바로 고객에게 경고 */
  function confirmSubmitDeliver(){ askConfirm(reqs[idx].cust+'님에게 결과물을 보낼까요?', sendDeliver, '보내기', '보내면 수정할 수 없어요'); }
  /* '상품 추가' 폼 펼치기/접기 */
  function toggleAddForm(){ saveDlvMsg(); addFormOpen=!addFormOpen; refreshDlv(); }

  /* 결정 버튼 확인 팝업 — 수락/거절/완료/취소 */
  function askConfirm(msg, onYes, yesLabel, sub){
    var ov=$('cfOverlay'); $('cfMsg').innerHTML=esc(msg)+(sub?'<span class="cf-sub">'+esc(sub)+'</span>':''); $('cfYes').textContent=yesLabel||'확인';
    ov.classList.add('on');
    function close(){ ov.classList.remove('on'); }
    $('cfYes').onclick=function(){ close(); if(onYes) onYes(); };
    $('cfNo').onclick=close;
    ov.onclick=function(e){ if(e.target===ov) close(); };
  }
  function confirmAccept(){ askConfirm(reqs[idx].cust+'님의 요청을 수락할까요?', accept, '수락하기', '수락하면 코디를 시작할 수 있어요'); }
  function confirmReject(){ askConfirm(reqs[idx].cust+'님의 요청을 거절할까요?', reject, '거절하기', '거절하면 요청이 종료돼요'); }
  function confirmComplete(){ askConfirm('완료 처리할까요?', completeReq, '완료 처리', '고객 후기를 받을 수 있어요'); }
  function confirmCancel(){ var s=reqs[idx]&&reqs[idx].status; var pay=(s==='결제대기');
    askConfirm(pay?'거래를 취소할까요?':'진행을 취소할까요?', cancelReq, '취소하기', pay?'취소하면 요청이 종료돼요':'취소하면 진행 중인 코디가 종료돼요'); }

  /* ── 고객 체형 = 스타일리스트용 '결과 카드 값' 먼저, 측정값은 가독성 좋게 '자세히 보기' ── */
  function segIdx(pct){ return Math.max(0, Math.min(4, Math.floor((pct==null?50:pct)/20))); }
  function zoneLabel(i, L, R){ return i===0?L:(i===1?L+' 편':(i===2?'표준':(i===3?R+' 편':R))); }
  /* 8유형 시그니처 색(라이트 배경용 보정 톤) — 아바타 라인 색에 사용 */
  var TYPE_COLOR={STR:'#7E9BE8',TRI:'#3FB9A6',INV:'#8A93A8',HRG:'#B675E8',
    BAL:'#5FBE7E',DIA:'#EA6EA0',RND:'#F0855A',TUB:'#9184E0'};
  /* hex 선형 보간 — a에서 to로 t만큼. color-mix 미지원 대비 JS 계산 */
  function mixHex(hex,to,t){
    function p(h){ h=h.replace('#',''); return [parseInt(h.substr(0,2),16),parseInt(h.substr(2,2),16),parseInt(h.substr(4,2),16)]; }
    var a=p(hex), b=p(to), o=a.map(function(v,i){ return Math.round(v+(b[i]-v)*t); });
    return '#'+o.map(function(x){ return ('0'+Math.max(0,Math.min(255,x)).toString(16)).slice(-2); }).join('');
  }
  /* 태그 톤 — 항상 옅은 유형색 배경 + 딥톤 유형색 글자/점/외곽선.
     seg 0(가장 슬림)…4(가장 볼륨)로 갈수록 배경·글자 함께 진해지되, 대비 유지(글씨 항상 읽힘) */
  var TAG_BGT=[0.88,0.80,0.72,0.64,0.56];   // 배경: 흰색 혼합비(작을수록 진함)
  var TAG_FGT=[0.34,0.44,0.54,0.64,0.72];   // 글자·점·선: 다크 혼합비(클수록 진함)
  function tagTone(tc, seg){
    return { bg:mixHex(tc,'#FFFFFF',TAG_BGT[seg]), fg:mixHex(tc,'#2A2823',TAG_FGT[seg]) };
  }
  /* 부위 백분위(측정 기반)로 폭이 반응하는 파라메트릭 실루엣 아바타.
     좌: 슬림/표준/볼륨 태그(zoneLabel) · 우: 부위명 + 예상 cm(est) · 아래: 핏취향 칩.
     Catmull-Rom으로 몸통·다리 외곽선을 만들고, 팔은 스트로크. 세로 비율은 표준 템플릿 고정. cx=180 가운데정렬. */
  function bodySilhouette(m, bt, gender, est, conf){
    var tc=TYPE_COLOR[(bt&&bt.code)||''] || '#57544C';   // 이 카드 유형색(태그 농도·라인 공용)
    var cx=180, headCY=48, headRx=27, headRy=31, neckHalf=12;
    var neckY=88, shoulderY=110, chestY=172, waistY=240, hipY=300, crotchY=330, kneeY=422, ankleY=498;
    /* 백분위 50=표준 반폭, 0~100 → ±28%. shoulder=너비 / 나머지=둘레지만 시각 폭으로 통일 근사 */
    var BASE={shoulder:42, chest:34, waist:27, hip:33};
    function hw(part,p){ p=(p==null?50:p); return BASE[part]*(0.72+p/100*0.56); }
    var sh=hw('shoulder',m.top.shoulder), ch=hw('chest',m.top.chestFull),
        wa=hw('waist',m.bottom.waist), hi=hw('hip',m.bottom.hip);
    function cr(pts){ var n=pts.length, P=function(i){return pts[(i%n+n)%n];};
      var d='M '+pts[0][0].toFixed(1)+' '+pts[0][1].toFixed(1);
      for(var i=0;i<n;i++){ var a=P(i-1),b=P(i),c=P(i+1),e=P(i+2);
        d+=' C '+(b[0]+(c[0]-a[0])/6).toFixed(1)+' '+(b[1]+(c[1]-a[1])/6).toFixed(1)+', '
          +(c[0]-(e[0]-b[0])/6).toFixed(1)+' '+(c[1]-(e[1]-b[1])/6).toFixed(1)+', '
          +c[0].toFixed(1)+' '+c[1].toFixed(1); } return d+' Z'; }
    function arm(s){ return 'M '+(cx+s*(sh-7)).toFixed(1)+' '+(shoulderY+6)
      +' C '+(cx+s*(sh+13)).toFixed(1)+' '+(chestY-14)+', '+(cx+s*(sh+11)).toFixed(1)+' '+(chestY+34)
      +', '+(cx+s*(sh-2)).toFixed(1)+' '+(hipY-6); }
    var body=[[cx+neckHalf,neckY],[cx+sh,shoulderY],[cx+ch,chestY],[cx+wa,waistY],[cx+hi,hipY],
      [cx+hi*0.9,crotchY+16],[cx+22,kneeY],[cx+18,ankleY],[cx+8,ankleY],[cx+9,kneeY],[cx+3,crotchY+24],
      [cx,crotchY+6],[cx-3,crotchY+24],[cx-9,kneeY],[cx-8,ankleY],[cx-18,ankleY],[cx-22,kneeY],
      [cx-hi*0.9,crotchY+16],[cx-hi,hipY],[cx-wa,waistY],[cx-ch,chestY],[cx-sh,shoulderY],[cx-neckHalf,neckY]];
    var LV=[
      {name:'어깨',   key:'어깨너비',  pct:m.top.shoulder,   lo:'좁은',hi:'넓은',half:sh,y:shoulderY},
      {name:'가슴',   key:'가슴둘레',  pct:m.top.chestFull,  lo:'슬림',hi:'볼륨',half:ch,y:chestY},
      {name:'허리',   key:'허리둘레',  pct:m.bottom.waist,   lo:'슬림',hi:'볼륨',half:wa,y:waistY},
      {name:'엉덩이', key:'엉덩이둘레', pct:m.bottom.hip,     lo:'슬림',hi:'볼륨',half:hi,y:hipY}];
    var estMap={}; (est||[]).forEach(function(e){ estMap[e.label]={val:e.val, pm:e.pm}; });
    var vx=240, guides='';
    LV.forEach(function(x){ var i=segIdx(x.pct), tag=zoneLabel(i,x.lo,x.hi), tn=tagTone(tc,i), bg=tn.bg, fg=tn.fg;
      var half=x.half, y=x.y, re=cx+half, le=cx-half, e=estMap[x.key];
      // 우: 부위명(+ 예상 cm을 바로 옆에). cm 있으면 이름은 위·수치 아래로.
      guides+='<circle cx="'+re.toFixed(1)+'" cy="'+y+'" r="2.6" fill="var(--fig-line)"/>'
        +'<line x1="'+(re+4).toFixed(1)+'" y1="'+y+'" x2="'+(vx-6)+'" y2="'+y+'" stroke="var(--guide)" stroke-width="1.2" stroke-dasharray="2 3"/>'
        +'<text class="g-name" x="'+vx+'" y="'+(e?(y-5):(y+4))+'">'+esc(x.name)+'</text>';
      if(e) guides+='<text class="g-val" x="'+vx+'" y="'+(y+13)+'">약 '+e.val+'<tspan class="g-unit" dx="1">cm</tspan> <tspan class="g-pm">±'+e.pm+'</tspan></text>';
      // 좌: 슬림/표준/볼륨 태그 — 옅은 유형색 배경 + 딥톤 글자/점/외곽선(농도로 강약)
      var tw=tag.length*13+30, pe=le-9, ps=pe-tw;
      guides+='<circle cx="'+le.toFixed(1)+'" cy="'+y+'" r="2.6" fill="var(--fig-line)"/>'
        +'<line x1="'+(le-4).toFixed(1)+'" y1="'+y+'" x2="'+(pe+1).toFixed(1)+'" y2="'+y+'" stroke="var(--guide)" stroke-width="1.2"/>'
        +'<rect x="'+ps.toFixed(1)+'" y="'+(y-12)+'" width="'+tw.toFixed(1)+'" height="24" rx="12" fill="'+bg+'" stroke="'+fg+'" stroke-opacity=".45"/>'
        +'<circle cx="'+(ps+13).toFixed(1)+'" cy="'+y+'" r="3.2" fill="'+fg+'"/>'
        +'<text class="g-tag" x="'+(ps+24).toFixed(1)+'" y="'+(y+4)+'" fill="'+fg+'">'+esc(tag)+'</text>'; });
    var svg='<svg viewBox="0 0 360 520" role="img" aria-label="고객 체형 실루엣">'
      +'<ellipse cx="'+cx+'" cy="514" rx="52" ry="9" fill="var(--fig-line)" opacity=".10"/>'
      +'<path d="'+arm(1)+'" fill="none" stroke="var(--fig-line)" stroke-width="13.5" stroke-linecap="round" opacity=".92"/>'
      +'<path d="'+arm(-1)+'" fill="none" stroke="var(--fig-line)" stroke-width="13.5" stroke-linecap="round" opacity=".92"/>'
      +'<path d="'+arm(1)+'" fill="none" stroke="var(--fig-fill)" stroke-width="9.5" stroke-linecap="round"/>'
      +'<path d="'+arm(-1)+'" fill="none" stroke="var(--fig-fill)" stroke-width="9.5" stroke-linecap="round"/>'
      +'<rect x="'+(cx-neckHalf)+'" y="70" width="'+(neckHalf*2)+'" height="34" rx="9" fill="var(--fig-fill)" stroke="var(--fig-line)" stroke-width="2"/>'
      +'<path d="'+cr(body)+'" fill="var(--fig-fill)" stroke="var(--fig-line)" stroke-width="2" stroke-linejoin="round"/>'
      +'<ellipse cx="'+cx+'" cy="'+headCY+'" rx="'+headRx+'" ry="'+headRy+'" fill="var(--fig-fill)" stroke="var(--fig-line)" stroke-width="2"/>'
      +'<line x1="'+cx+'" y1="'+(shoulderY+6)+'" x2="'+cx+'" y2="'+(hipY-6)+'" stroke="var(--fig-line)" stroke-width="1" stroke-dasharray="1 5" opacity=".28"/>'
      +guides+'</svg>';
    var pref=zoneLabel(segIdx(m.prefTop),'타이트','여유');
    var note=(est&&est.length)
      ? '예상 치수 · 신뢰도 '+esc(conf||'—')+' · 폭=측정 반영, 세로=표준 비율'
      : '폭 = 측정 백분위 반영 · 세로 = 표준 비율';
    /* 라인만 스타일 — 유형색을 라인(80%+다크)으로, 채움은 아주 옅은 틴트(12%) */
    var figLine=mixHex(tc,'#2A2823',0.20), figFill=mixHex(tc,'#FFFFFF',0.88);
    return '<div class="bodymap2" style="--fig-fill:'+figFill+';--fig-line:'+figLine+'">'+svg
      +'<div class="av-pref"><span>핏 취향</span><b>'+esc(pref)+'</b></div>'
      +'<div class="av-cap">'+note+'</div></div>';
  }

  /* 스타일리스트용 체형 설명 한 줄(8유형) — 고객 체형을 '~체형이에요!'로 설명 */
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

  /* [프로토타입] A 기준 옷 · B 브랜드별 추천 사이즈 — 데모값(실데이터는 고객 착용경험·엔진 출력에서 와야 함) */
  var DEMO_BRANDREC = {
    female:[['무신사 스탠다드','M','27'],['H&M','M','S'],['COS','36','38'],['스파오','M','M']],
    male:[['무신사 스탠다드','L','32'],['H&M','L','M'],['COS','50','48'],['스파오','L','L']]
  };
  /* 예상 신체 치수 — body-base-model(회귀: a·키+b·몸무게+c·나이+intercept) + body-distribution(sd). 착용경험 수로 ± 폭 조정 */
  function estBody(r){
    if(!BMODEL||!BDIST) return null;
    var g=(r.gender==='male')?'male':'female';
    var h=parseFloat(r.cm)||0, w=parseFloat(r.kg)||0, age=parseFloat(r.age)||30;
    if(!h||!w||!BMODEL[g]||!BDIST[g]) return null;
    var n=(r.wearExp||[]).length;
    var band = n>=2?0.25 : (n===1?0.4 : 0.6);   // 착용경험 많을수록 ± 좁힘
    var parts=[['shoulder','어깨너비'],['chestUpper','가슴둘레'],['waist','허리둘레'],['hip','엉덩이둘레']];
    return parts.map(function(p){
      var c=BMODEL[g][p[0]], d=BDIST[g][p[0]]; if(!c||!d) return null;
      var val=c.a_height*h + c.b_weight*w + (c.c_age||0)*age + c.intercept;
      return {label:p[1], val:Math.round(val), pm:Math.max(1,Math.round(d.sd*band))};
    }).filter(Boolean);
  }
  /* 신뢰도 라벨 — 착용경험 수로. 아바타 캡션·예상치수 공용 */
  function estConf(r){
    var n=(r.wearExp||[]).length;
    return n>=2?'정확 (착용경험 2벌+)' : (n===1?'보통 (착용경험 1벌)' : '낮음 (키·몸무게만)');
  }
  function estSection(r){
    var es=estBody(r); if(!es||!es.length) return '';
    var conf = estConf(r);
    return '<div class="cx-sec"><div class="cx-h">예상 신체 치수 <span class="cx-ex">추정</span></div>'+
      '<table class="cx-tbl"><tbody>'+
      es.map(function(x){return '<tr><td>'+esc(x.label)+'</td><td style="text-align:right">약 <b>'+x.val+'</b>cm <span style="color:var(--sub2);font-weight:700">± '+x.pm+'</span></td></tr>';}).join('')+
      '</tbody></table>'+
      '<div class="cx-note">키·몸무게 기반 통계 추정(사이즈코리아 인체치수) · 신뢰도 '+esc(conf)+' — 착용경험이 많을수록 오차가 줄어요</div></div>';
  }

  function refAndRecs(m, bt, r){
    var g=(r.gender==='male')?'male':'female';
    var ex='<span class="cx-ex">예시</span>';
    // A. 잘 맞는 기준 옷 — 고객 착용경험(딱맞음)에서. 진단엔 상품명이 없어 브랜드·카테고리·핏·사이즈만 표기
    var fits=(r.wearExp||[]).filter(function(e){return e.feel==='딱맞음';});
    var a='<div class="cx-sec"><div class="cx-h">잘 맞는 기준 옷</div>'+
      (fits.length
        ? '<div class="cx-tags">'+fits.map(function(e){return '<span class="cx-tag"><b>'+esc(e.brand)+'</b> · '+esc(e.cat)+' '+esc(e.fit)+' · <b>'+esc(e.size)+'</b></span>';}).join('')+'</div>'
        : '<div class="cx-note">진단 때 착용경험을 입력하지 않았어요 · 기준 옷 정보 없음</div>')+
    '</div>';
    var b='<div class="cx-sec"><div class="cx-h">브랜드별 추천 사이즈 '+ex+'</div>'+
      '<table class="cx-tbl"><thead><tr><th>브랜드</th><th>상의</th><th>하의</th></tr></thead><tbody>'+
      DEMO_BRANDREC[g].map(function(x){return '<tr><td>'+esc(x[0])+'</td><td><b>'+esc(x[1])+'</b></td><td><b>'+esc(x[2])+'</b></td></tr>';}).join('')+
      '</tbody></table></div>';
    return a+b;
  }

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
      /* ③ 아바타 + 부위별 슬림/표준/볼륨 + 예상 cm(라벨에 바로) */
      bodySilhouette(m, bt, r.gender, estBody(r), estConf(r))+
      /* ⑤ [프로토타입] 기준 옷 · 브랜드별 추천 사이즈 — 더보기로 접음 */
      '<details class="meas-more"><summary>기준 옷 · 브랜드별 추천 사이즈 자세히 보기</summary>'+
      refAndRecs(m, bt, r)+
      '</details>'+
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
    // 지명(받은 요청)=이 스타일리스트 한 명에게 → 명확한 예상 가격 / 오픈(보낸 제안)=여러 스타일리스트에 뿌린 요청 → 고객 예산 범위
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

  /* ===== 고객과의 대화(상담) — IA 2.x, 소비자측 index.js sendReqMsg와 대칭 =====
     pro.reqs는 소비자 fitting.reqs와 분리된 데모 스토어 → 스레드는 r.msgs에 보관({from:'pro'|'cust'}) */
  function proMsgs(r){ return r.msgs || [{from:'cust', text:'안녕하세요 스타일리스트님! 잘 부탁드려요 🙂'}]; }
  function msgCardHTML(r){
    var bubbles=proMsgs(r).map(function(mm){
      var mine=(mm.from==='pro'||mm.from==='me');
      return '<div class="pm-row '+(mine?'me':'cust')+'"><div class="pm-b">'+esc(mm.text)+'</div></div>';
    }).join('');
    return '<div class="card pm-card"><div class="subhead">고객과의 대화</div>'+
      '<div class="pm-thread" id="pmThread">'+bubbles+'</div>'+
      '<div class="pm-compose"><input id="pmIn" placeholder="메시지를 입력하세요" onkeydown="if(event.key===\'Enter\')sendProMsg()"><button class="btn ghost" onclick="sendProMsg()">보내기</button></div>'+
    '</div>';
  }
  function sendProMsg(){ var inp=$('pmIn'); if(!inp) return; var t=(inp.value||'').trim(); if(!t) return;
    var r=reqs[idx]; if(!r) return; r.msgs=proMsgs(r).slice(); r.msgs.push({from:'pro', text:t}); saveLS('pro.reqs',reqs); render();
    setTimeout(function(){ var th=$('pmThread'); if(th) th.scrollTop=th.scrollHeight; var i2=$('pmIn'); if(i2) i2.focus(); },0); }

  /* ===== 고객 신고(양방향) — IA 2.x. 소비자→스타일리스트는 분쟁/후기, 스타일리스트→고객은 여기.
     공유 스토어 fitting.reports에 적재 → 관리자 신고 큐(3.B.4)가 병합해서 처리 =====*/
  var REPORT_REASONS=['노쇼(약속 불이행)','부적절한 언행·요구','허위·악의성 요청','플랫폼 외 거래 유도','결제 회피','기타'];
  function hasReport(r){ return !!(r && r.reported); }
  function openReportModal(){ ensureProStyle(); var m=$('reportModal'); if(!m){ m=document.createElement('div'); m.id='reportModal'; m.className='dlv-modal'; document.body.appendChild(m); } renderReportModal(); m.style.display='flex'; }
  function closeReportModal(){ var m=$('reportModal'); if(m) m.style.display='none'; }
  function renderReportModal(){ var r=reqs[idx], m=$('reportModal'); if(!m||!r) return;
    m.innerHTML='<div class="dlv-bd" onclick="closeReportModal()"></div><div class="dlv-pan">'+
      '<div class="dlv-h"><div><b>고객 신고</b> <span>'+esc(r.cust)+'님</span></div><button class="dlv-x" onclick="closeReportModal()">✕</button></div>'+
      '<div class="dlv-b">'+
        '<p style="font-size:12.5px;color:var(--sub2,#8a857b);margin:0 0 12px">부적절한 요청·언행·노쇼 등을 신고하면 관리자가 검토해 회원 제재로 이어질 수 있어요. 허위 신고는 제재 대상이에요.</p>'+
        '<div class="rpt-reasons" id="rptReasons">'+REPORT_REASONS.map(function(rs,k){ return '<label class="rpt-r"><input type="radio" name="rptReason" value="'+esc(rs)+'"'+(k===0?' checked':'')+'> '+esc(rs)+'</label>'; }).join('')+'</div>'+
        '<div class="offerform" style="margin-top:12px"><label>상세 내용</label><textarea id="rptDetail" placeholder="상황을 구체적으로 적어주세요 (일시·대화·정황 등)"></textarea></div>'+
      '</div>'+
      '<div class="dlv-f"><button class="btn" onclick="submitProReport()">신고 접수</button></div></div>';
  }
  function submitProReport(){ var r=reqs[idx]; if(!r) return;
    var sel=document.querySelector('input[name="rptReason"]:checked'); var reason=sel?sel.value:REPORT_REASONS[0];
    var detail=($('rptDetail')&&$('rptDetail').value.trim())||'';
    var reports=loadLS('reports', []);
    reports.unshift({ id:'R'+Date.now().toString(36), by:'pro', reporter:(profile&&profile.name)||'소희 스타일리스트',
      target:r.cust, targetRole:'고객', type:reason, detail:detail, state:'접수', at:new Date().toISOString().slice(0,10) });
    saveLS('reports', reports);
    r.reported={ type:reason, at:new Date().toISOString().slice(0,10) }; saveLS('pro.reqs',reqs);
    closeReportModal(); render(); toast('신고가 접수됐어요 · 관리자가 검토해요');
  }
  function reportBoxHTML(r){
    if(hasReport(r)) return '<div class="rpt-done">🚩 신고 접수됨 · <b>'+esc(r.reported.type)+'</b><br><span style="font-size:12px;color:var(--sub2,#8a857b)">관리자 검토 중이에요</span></div>';
    return '<button class="rpt-link" onclick="openReportModal()">🚩 고객 신고 (노쇼·부적절 언행 등)</button>';
  }

  function ensureProStyle(){ if($('proXStyle')) return; ensureDlvStyle(); var s=document.createElement('style'); s.id='proXStyle';
    s.textContent='.pm-card .subhead{margin-bottom:10px}'+
      '.pm-thread{display:flex;flex-direction:column;gap:8px;max-height:260px;overflow-y:auto;padding:4px 2px 10px}'+
      '.pm-row{display:flex}.pm-row.me{justify-content:flex-end}'+
      '.pm-b{max-width:78%;padding:9px 13px;border-radius:14px;font-size:13.5px;line-height:1.5;white-space:pre-wrap;word-break:break-word}'+
      '.pm-row.cust .pm-b{background:var(--soft,#f5f3ee);color:var(--ink,#1c1a17);border-bottom-left-radius:4px}'+
      '.pm-row.me .pm-b{background:var(--green,#2E4A3B);color:#fff;border-bottom-right-radius:4px}'+
      '.pm-compose{display:flex;gap:8px;margin-top:4px;border-top:1px solid var(--line,#ece9e3);padding-top:12px}'+
      '.pm-compose input{flex:1;padding:10px 13px;border:1.5px solid var(--line2,#d8d4cc);border-radius:10px;font-size:14px;font-family:inherit}'+
      '.pm-compose input:focus{outline:none;border-color:var(--green,#2E4A3B)}'+
      '.rpt-reasons{display:flex;flex-direction:column;gap:2px}'+
      '.rpt-r{display:flex;align-items:center;gap:8px;padding:9px 4px;font-size:14px;cursor:pointer;border-bottom:1px solid var(--line,#ece9e3)}.rpt-r:last-child{border:none}'+
      '.rpt-link{display:block;width:100%;margin-top:10px;padding:11px;background:none;border:1px solid var(--line2,#d8d4cc);border-radius:11px;color:var(--sub,#6b6a67);font-size:13px;font-weight:700;font-family:inherit;cursor:pointer}'+
      '.rpt-link:hover{border-color:#c0392b;color:#c0392b}'+
      '.rpt-done{margin-top:10px;padding:12px 14px;background:#fbf3f3;border:1px solid #e6b8b8;border-radius:11px;font-size:13px;color:#c0392b;line-height:1.5}';
    document.head.appendChild(s); }

  /* ═══ 방향 A · 타임라인 작업대 ═══
     왼쪽 qleft를 세로 타임라인으로. 지난 단계=접힌 영수증(필요할 때 펼침) / 현재 단계=유일한 주연(펼침)
     / 미래 단계=흐림. 결과물 작성은 현재 단계 안 인라인으로 열려 오른쪽 체형을 안 가림.
     정상 흐름(신규/제안발송/수락됨/완료)만. 예외(거절/취소/분쟁/견적작성)는 render에서 기존 레이아웃 폴백. */
  function toggleRcpt(head){ var r=head.closest('.rcpt'); if(r) r.classList.toggle('open'); }
  function refBody(){ var el=document.querySelector('.qright .bodycard2')||document.querySelector('.qright .card'); if(!el) return;
    el.classList.remove('cxflash'); void el.offsetWidth; el.classList.add('cxflash'); el.scrollIntoView({behavior:'smooth',block:'nearest'}); }
  /* 날짜 6자리(YY.MM.DD)로 축약 — "2026.07.02" → "26.07.02". 형식 다르면 그대로 */
  function shortDate(d){ d=String(d||''); var p=d.split(/[.\-/]/);
    return (p.length===3 && p[0].length===4) ? (p[0].slice(2)+'.'+('0'+p[1]).slice(-2)+'.'+('0'+p[2]).slice(-2)) : d; }
  /* 요청 내용 행들(요청/제안 단계 본문 공용) */
  function reqRowsHTML(r){
    var out=r.dir==='out';
    var money = out ? ['고객 예산', esc(r.budget||'—')] : ['예상 가격','<span class="num">'+svcPrice(r.service).toLocaleString()+'</span>원'];
    var rows=[['서비스 유형', esc(svcLabel(r.service))], ['상황', esc(r.occ||'—')], money, ['희망 일정', esc(r.date||'—')]];
    if(r.styles && r.styles.length) rows.push(['선호 스타일', esc(r.styles.join(' · '))]);
    if(r.note) rows.push(['요청사항', esc(r.note)]);
    return rows.map(function(x){ return '<div class="rrow"><span class="k">'+x[0]+'</span><span class="v">'+x[1]+'</span></div>'; }).join('');
  }
  var IC_ATT='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11l-8.5 8.5a4.5 4.5 0 0 1-6.4-6.4l8.5-8.5a3 3 0 0 1 4.3 4.3l-8.6 8.5a1.5 1.5 0 0 1-2.1-2.1l7.9-7.9"/></svg>';
  function attachChip(attached, mt){ return '<span class="rr-chip'+(attached?'':' off')+'" style="margin-top:'+(mt||12)+'px">'+IC_ATT+(attached?'체형·사이즈 측정 결과 첨부됨':'체형·사이즈 측정 미첨부')+'</span>'; }
  /* 타임라인 노드 마커 */
  function tlNode(state, i){
    if(state==='done') return '<span class="tl-node"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></span>';
    if(state==='now')  return '<span class="tl-node">'+(i===4
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>')+'</span>';
    if(state==='exc')  return '<span class="tl-node"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></span>';
    return '<span class="tl-node">'+(i+1)+'</span>';
  }
  /* 접힌 영수증(지난·미래 단계). inner 있으면 펼침 가능, 없으면(미래) 한 줄 흐림 */
  function tlReceipt(lb, sum, inner, dim){
    var head='<div class="rcpt-head"'+(inner?' onclick="toggleRcpt(this)"':' style="cursor:default"')+'>'+
      '<span class="rcpt-lb">'+esc(lb)+'</span><span class="rcpt-sum'+(dim?' dim':'')+'">'+sum+'</span>'+
      (inner?'<span class="rcpt-chev">▾</span>':'')+'</div>';
    return '<div class="rcpt'+(dim?' fut':'')+'">'+head+(inner?'<div class="rcpt-body"><div class="rcpt-inner">'+inner+'</div></div>':'')+'</div>';
  }
  /* 현재 단계 주연 카드 */
  function nowCard(title, badge, hint, body){
    return '<div class="now-card">'+
      '<div class="now-top"><span class="dot"></span><b>'+esc(title)+'</b>'+(badge?'<span class="badge">'+esc(badge)+'</span>':'')+'</div>'+
      (hint?'<p class="now-hint">'+esc(hint)+'</p>':'')+
      '<div class="now-body">'+body+'</div></div>';
  }
  /* 거절·취소(예외) 주연 카드 — 경고 톤. hint는 이미 안전한 HTML로 넘김 */
  function nowCardWarn(title, badge, hint, body){
    return '<div class="now-card warn">'+
      '<div class="now-top"><span class="dot"></span><b>'+esc(title)+'</b><span class="badge">'+esc(badge)+'</span></div>'+
      (hint?'<p class="now-hint">'+hint+'</p>':'')+
      '<div class="now-body">'+body+'</div></div>';
  }
  /* 결제·입금 대기 주연 카드 — amber 톤 */
  function nowCardPay(title, badge, hint, body){
    return '<div class="now-card pay">'+
      '<div class="now-top"><span class="dot"></span><b>'+esc(title)+'</b><span class="badge">'+esc(badge)+'</span></div>'+
      (hint?'<p class="now-hint">'+esc(hint)+'</p>':'')+
      '<div class="now-body">'+body+'</div></div>';
  }
  /* 오른쪽 체형 참고 연결 콜아웃(동적) */
  function calloutHTML(r){
    var es=estBody(r); var sh=(es&&es[0]) ? ('예상 '+esc(es[0].label)+' 약 '+es[0].val+'cm') : '예상 치수';
    var fits=(r.wearExp||[]).filter(function(e){ return e.feel==='딱맞음'; });
    var ref=fits.length ? ('기준 옷('+esc(fits[0].brand)+' '+esc(fits[0].size)+')') : '기준 옷';
    return '<div class="callout" onclick="refBody()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>'+
      '<p>오른쪽 <b>'+ref+'</b>·<b>'+sh+'</b>을 보며 사이즈를 추천하세요</p></div>';
  }
  /* 결과물 인라인 작성 폼(현재=수락됨, 미제출·편집중) — 모달 내부와 같은 블록 재사용 */
  function deliverInlineBody(r){
    var online=(r.service==='online'), draft=r._draft||[];
    var canSubmit = online ? draft.length>0 : true;   // 추천 상품(필수) 1개 이상이면 제출 활성
    return (online?productBlockHTML(r)+'<div class="dlv-div"></div>':'') + photoBlockHTML(r) + contentBlockHTML(r) +
      '<button class="btn" style="margin-top:16px"'+(canSubmit?'':' disabled')+' onclick="confirmSubmitDeliver()">결과물 보내기</button>';
  }
  /* 결과물 제출 완료 요약(현재=수락됨, 제출됨) — 수정/완료/취소 */
  function deliverDoneBody(r){
    return deliverSummary(r) +
      '<button class="btn ghost" style="margin-top:12px" onclick="editDeliver()">결과물 수정</button>'+
      '<button class="btn" style="margin-top:8px" onclick="confirmComplete()">완료 처리</button>'+
      '<div class="quiet"><a onclick="confirmCancel()">취소하기</a></div>';
  }
  /* 단계별 카드 HTML */
  function tlStepHTML(i, state, r, attached, out){
    var inner='';
    if(i===0){                                   // 요청 / 제안
      if(state==='now'){
        if(out){ var o=r.offer||{};
          var b='<div class="note-quote"><b style="color:var(--green)">보낸 견적</b> · <span class="num">'+((o.price||0).toLocaleString())+'</span>원'+(o.msg?'<br><span style="font-size:13px;color:var(--sub)">"'+esc(o.msg)+'"</span>':'')+'</div>'+
            '<div class="rr-mini">'+reqRowsHTML(r)+'</div>'+attachChip(attached,10)+
            '<button class="btn ghost" style="margin-top:12px" onclick="simAccept()">고객 수락 · 데모</button>';
          inner=nowCard('제안 발송됨','응답 대기','고객의 응답을 기다리고 있어요', b);
        } else {
          var b2='<div class="rr-mini">'+reqRowsHTML(r)+'</div>'+attachChip(attached,12)+
            '<div class="act-row" style="margin-top:14px"><button class="btn ghost" onclick="confirmReject()">거절하기</button><button class="btn" onclick="confirmAccept()">수락하기</button></div>';
          inner=nowCard('요청 수락','지금 할 일','요청 내용을 확인하고 수락 여부를 정해요', b2);
        }
      } else {
        var price0=(r.offer&&r.offer.price)?r.offer.price.toLocaleString():'—';
        // 상황(occ)은 상단 h1에 이미 있어 요약에선 뺌 · 날짜는 6자리
        var sum = out ? ('견적 <span class="money">'+price0+'원</span> 보냄'+(r.date?' · '+shortDate(r.date):''))
                      : ('견적 요청 도착'+(r.date?' · '+shortDate(r.date):''));
        inner=tlReceipt(out?'제안':'요청', sum, reqRowsHTML(r)+attachChip(attached,12), false);
      }
    } else if(i===1){                            // 수락
      if(state==='done'){
        var price1=(r.offer&&r.offer.price)?r.offer.price.toLocaleString():'—';
        var sum1 = out ? ('견적 <span class="money">'+price1+'원</span> · 고객 수락함') : ('요청 수락함 · <span class="money">'+price1+'원</span> 확정');
        var body1='<div class="rrow"><span class="k">확정 금액</span><span class="v"><span class="money">'+price1+'원</span></span></div>'+
          '<span class="undo" onclick="undoAccept()">↩ 수락 되돌리기</span>';
        inner=tlReceipt('수락', sum1, body1, false);
      } else if(state==='now'){                    // 상담중 — 수락 후, 입금 요청 전
        var pricec=(r.offer&&r.offer.price)?r.offer.price.toLocaleString():'—';
        inner=nowCard('입금 안내','지금 할 일','대화로 내용을 맞춰본 뒤 입금을 안내해요',
          '<div class="pay-amt"><span>안내할 금액</span><b class="num">'+pricec+'원</b></div>'+
          '<button class="btn" style="margin-top:14px;width:100%" onclick="confirmAskPay()">입금 요청하기</button>'+
          '<div class="quiet"><a onclick="undoAccept()">수락 되돌리기</a></div>');
      } else if(state==='exc'){
        inner=nowCardWarn('요청 거절함','거절', '요청을 거절했어요',
          (r.reason?'<div class="note-quote muted" style="margin-bottom:10px">“'+esc(r.reason)+'”</div>':'')+
          '<button class="btn ghost" onclick="undoReject()">되돌리기</button>');
      } else {
        inner=tlReceipt('수락', '고객 수락을 기다려요', '', true);
      }
    } else if(i===2){                            // 결제 · 입금 확인
      var pp=(r.offer&&r.offer.price)?r.offer.price.toLocaleString():'—';
      if(state==='now'){                          // 결제대기
        inner=nowCardPay('결제 · 입금 대기','입금 대기','고객 입금을 확인하면 결과물 작성이 열려요',
          '<div class="pay-amt"><span>결제 금액</span><b class="num">'+pp+'원</b></div>'+
          '<div class="act-row" style="margin-top:14px"><button class="btn ghost" onclick="confirmCancel()">취소하기</button><button class="btn" onclick="confirmPayment()">입금 확인하기</button></div>');
      } else if(state==='done'){                   // 입금 완료
        inner=tlReceipt('결제', '입금 완료 · <span class="money">'+pp+'원</span>',
          '<div class="rrow"><span class="k">결제 금액</span><span class="v"><span class="money">'+pp+'원</span></span></div>'+
          '<div class="rrow"><span class="k">상태</span><span class="v" style="color:var(--green)">입금 완료</span></div>', false);
      } else {                                     // future
        inner=tlReceipt('결제', '고객 입금을 기다려요', '', true);
      }
    } else if(i===3){                            // 진행 / 결과물
      if(state==='now'){
        inner=nowCard('결과물 전달','지금 할 일','추천 상품·사진·코디 노트를 작성해보세요', deliverInlineBody(r));
      } else if(state==='done'){
        var its=(r.deliver&&r.deliver.items)||[];
        var sum2='결과물 전달함'+(its.length?' · '+its.length+'개':'');
        inner=tlReceipt('진행', sum2, deliverSummary(r), false);
      } else if(state==='exc'){
        inner=nowCardWarn('진행 취소됨','취소', '진행을 취소했어요',
          (r.reason?'<div class="note-quote muted" style="margin-bottom:10px">“'+esc(r.reason)+'”</div>':'')+
          '<button class="btn ghost" onclick="undoCancel()">되돌리기</button>');
      } else {
        inner=tlReceipt('진행', '결과물 작성·전달', '', true);
      }
    } else {                                     // 완료
      if(state==='now'){
        var body3 = r.review
          ? '<div class="seclabel">고객 후기</div><div class="note-quote"><span style="letter-spacing:1px">'+starsRO(r.review.rating)+'</span><br>"'+esc(r.review.text)+'"</div>'
          : '<p class="note-quote muted">고객의 후기를 기다리고 있어요</p>';
        inner=nowCard('서비스 완료','완료','거래가 마무리됐어요', body3);
      } else {
        inner=tlReceipt('완료', '고객 확인 후 정산 · 후기', '', true);
      }
    }
    var pcls=(i===2 && state==='now')?' pay':'';   // 결제(입금 대기) 현재 노드는 노랑
    return '<div class="tl-step '+state+pcls+(i===4?' last':'')+'">'+tlNode(state,i)+inner+'</div>';
  }
  /* 정상 흐름·거절·취소면 타임라인 HTML, 아니면 null(분쟁·견적작성 → 폴백) */
  function timelineHTML(r, attached){
    var out=r.dir==='out';
    // 5단계: 요청/제안(0) · 수락(1) · 결제(2) · 진행(3) · 완료(4)
    var NORMAL = out ? {'제안발송':0,'상담중':1,'결제대기':2,'수락됨':3,'완료':4} : {'신규':0,'상담중':1,'결제대기':2,'수락됨':3,'완료':4};
    var EXC = {'거절':1,'취소':3};   // 흐름에서 멈춘 단계(✕)
    var cur, excAt=-1;
    if(r.status in NORMAL){ cur=NORMAL[r.status]; }
    else if(r.status in EXC){ excAt=EXC[r.status]; cur=excAt; }
    else return null;                // 분쟁·견적작성 등 → 폴백
    if(r.status==='수락됨') ensureDlvStyle();
    var steps='';
    for(var i=0;i<5;i++){ var state=(i===excAt?'exc':(i<cur?'done':(i===cur?'now':'future'))); steps+=tlStepHTML(i,state,r,attached,out); }
    return '<div class="tl">'+steps+'</div>';
  }
  /* 수락 되돌리기 — 정상 흐름에서만 노출 */
  function undoAccept(){ var r=reqs[idx]; if(!r) return; r.status=(r.dir==='out')?'제안발송':'신규'; saveLS('pro.reqs',reqs); render(); toast('수락을 되돌렸어요'); }

  /* ── 고객과의 대화 = 오른쪽 위 아이콘 → 우측 드로어(별도 관리) ── */
  var ICON_CHAT='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-11.7 7.7L4 20.5l1.3-4.9A8.4 8.4 0 1 1 21 11.5z"/></svg>';
  /* 고객이 마지막에 보낸(내가 아직 답 안 한) 메시지 수 = 새 메시지 알림 */
  function unreadFromCust(r){ var ms=proMsgs(r), n=0; for(var i=ms.length-1;i>=0;i--){ if(ms[i].from==='cust') n++; else break; } return n; }
  function chatOpenBtn(r){
    var unread=unreadFromCust(r);
    return '<button class="chat-open" onclick="toggleChat()" aria-label="고객과의 대화">'+ICON_CHAT+'<span>대화</span>'+(unread?'<span class="co-dot" title="새 메시지"></span>':'')+'</button>';
  }
  var IC_SEND='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>';
  var IC_FLAG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4m0 0h11l-2 4 2 4H5"/></svg>';
  /* 신고 = 헤더 작은 깃발 아이콘(자주 안 쓰니 눈에 안 띄게). 접수됐으면 경고색 */
  function reportIconBtn(r){ var done=hasReport(r);
    return '<button class="cd-flag'+(done?' on':'')+'" onclick="openReportModal()" title="'+(done?'신고 접수됨':'고객 신고')+'" aria-label="고객 신고">'+IC_FLAG+'</button>'; }
  function chatDrawerHTML(r, showReport){
    var bubbles=proMsgs(r).map(function(mm){
      // ev=새 사건 기반 / text=예전에 저장된 완성 문장(구 데이터 폴백)
      if(mm.from==='sys') return '<div class="pm-sys">'+esc(mm.ev?sysText(mm.ev,r,'pro'):(mm.text||''))+'</div>';
      var mine=(mm.from==='pro'||mm.from==='me');
      return '<div class="pm-row '+(mine?'me':'cust')+'"><div class="pm-b">'+esc(mm.text)+'</div></div>'; }).join('');
    var shown = chatOpen && !chatAnim;   // 자동 열림이면 닫힌 채로 그리고 다음 프레임에 open을 붙임
    return '<div class="cd-scrim'+(shown?' on':'')+'" id="cdScrim" onclick="toggleChat()"></div>'+
      '<aside class="chatdrawer'+(shown?' open':'')+'" id="chatDrawer" aria-label="고객과의 대화">'+
        '<div class="cd-head"><div class="cd-ti"><span class="cd-eye">고객과의 대화</span><b>'+esc(r.cust)+'님</b></div>'+(showReport?reportIconBtn(r):'')+'<button class="cd-x" onclick="toggleChat()" aria-label="닫기">'+IC_X+'</button></div>'+
        '<div class="pm-thread" id="pmThread">'+bubbles+'</div>'+
        '<div class="pm-compose"><input id="pmIn" placeholder="메시지를 입력하세요" onkeydown="if(event.key===\'Enter\')sendProMsg()"><button class="pm-send" onclick="sendProMsg()" aria-label="보내기">'+IC_SEND+'</button></div>'+
      '</aside>';
  }
  /* ── 대화창 시스템 안내 카피 ─────────────────────────────────────────
     같은 사건이라도 보는 쪽에 따라 문장이 다름 → 완성된 문장이 아니라 '사건(ev)'만 저장하고
     읽는 쪽에서 문장을 만든다. 고객 화면을 붙일 때도 이 표를 그대로 쓰고 view만 'cust'로 준다.
     {cust}=고객 이름 · {pro}=스타일리스트 이름 */
  var SYS_COPY = {
    acceptReq:   { pro:'요청을 수락했어요 · {cust}님과 대화를 시작해보세요',   cust:'{pro}님이 요청을 수락했어요 · 대화를 시작해보세요' },
    acceptOffer: { pro:'{cust}님이 제안을 수락했어요 · 대화를 시작해보세요',  cust:'제안을 수락했어요 · 대화를 시작해보세요' },
    askPay:      { pro:'서비스 결제를 안내했어요',                          cust:'서비스 결제를 진행해주세요' },
    paid:        { pro:'입금을 확인했어요 · 결과물을 준비해주세요',           cust:'결제가 완료됐어요 · 결과물을 기다려주세요' },
    deliver:     { pro:'결과물을 전달했어요 · 후기를 기다려주세요',           cust:'결과물을 받았어요 · 후기를 남겨주세요' },
    review:      { pro:'후기가 등록됐어요 · 서비스가 완료되었어요!',          cust:'후기를 남겨주셔서 감사해요 · 서비스가 완료되었어요!' }
  };
  function sysText(ev, r, view){
    var c=SYS_COPY[ev]; if(!c) return '';
    return (c[view||'pro']||'')
      .replace('{cust}', (r&&r.cust)||'고객')
      .replace('{pro}', (profile&&profile.name)||'소희 스타일리스트');
  }
  /* 상태 변화(수락·입금확인·결과물 전달 등)를 대화에 시스템 메시지로 로그 — ev는 SYS_COPY의 키 */
  function pushSysMsg(r, ev){ if(!r) return; r.msgs = proMsgs(r).slice(); r.msgs.push({from:'sys', ev:ev});
    /* 결정이 나면 대화를 함께 연다 — 뒤이어 render가 '닫힘'으로 그리고, 두 프레임 뒤 open을 붙여 오른쪽에서 밀려 들어옴 */
    chatOpen=true; chatAnim=true;
    requestAnimationFrame(function(){ requestAnimationFrame(function(){
      chatAnim=false;
      var d=$('chatDrawer'), s=$('cdScrim'), t=$('pmThread');
      if(d) d.classList.add('open');
      if(s) s.classList.add('on');
      if(t) t.scrollTop=t.scrollHeight;
    }); }); }
  function toggleChat(){ chatOpen=!chatOpen; ensureProStyle();
    var d=$('chatDrawer'), s=$('cdScrim'); if(d) d.classList.toggle('open',chatOpen); if(s) s.classList.toggle('on',chatOpen);
    if(chatOpen) setTimeout(function(){ var t=$('pmThread'); if(t) t.scrollTop=t.scrollHeight; var i=$('pmIn'); if(i) i.focus(); },30); }

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
    if(!r){ $('quoteRoot').innerHTML='<p class="crumb">요청을 찾을 수 없어요.</p><p style="margin-top:10px"><a class="tinybtn" onclick="goBackToPro()">'+PANEL_LABEL[fromPanel]+'</a></p>'; return; }
    var out = r.dir==='out';
    // 대화=제안 발송~진행~완료·분쟁(견적작성 전/거절·취소 제외) · 신고=실제 진행된 고객만
    var showMsg = !isCand && ['제안발송','상담중','결제대기','수락됨','완료','분쟁'].indexOf(r.status)>=0;
    var showReport = !isCand && ['결제대기','수락됨','완료','분쟁'].indexOf(r.status)>=0;
    if(showMsg||showReport) ensureProStyle();
    var bt = btResolve(BTMAP[r.type], r.gender) || {};   // 고객 성별로 콘텐츠 해석
    var m = MEASURE_BY_CUST[r.cust] || MEASURE_DEFAULT;
    // 체형 진단 결과 첨부 여부 — 첨부 O: 캐릭터·측정 / 첨부 X: 성별·키·몸무게만
    var attached = r.attach!==false && !!(bt && (bt.sizeKorea||bt.silhouette));

    var bodyCard = attached ? measureCard(m, bt, r) : basicBodyCard(r);

    // 좌: 방향 A 타임라인 작업대(정상 흐름) / 예외 상태는 기존 레이아웃 폴백  ·  우(sticky): 체형
    var tl = timelineHTML(r, attached);
    // 신고는 왼쪽에서 빼고 대화 드로어 안으로 이동
    var qleft = tl
      ? tl
      : ( statusBlock(r) + requestReceipt(r, attached) +
          '<div class="card offer-card"><div class="subhead">'+esc(actionTitle(r))+'</div>'+ actionHTML(r) +'</div>' );
    // 대화는 상단 오른쪽 아이콘 → 우측 드로어(별도 관리)
    $('quoteRoot').innerHTML =
      '<div class="qtop"><div class="qtop-l">'+
        '<a class="backlink" onclick="goBackToPro()">← '+PANEL_LABEL[fromPanel]+'</a>'+
        '<p class="crumb">스타일리스트 지원 · '+(r.status==='견적작성'?'견적 보내기':(out?'보낸 제안':'받은 요청'))+'</p>'+
        '<h1>'+esc(r.cust)+'님 · '+esc(svcLabel(r.service))+'</h1>'+
      '</div>'+(showMsg?chatOpenBtn(r):'')+'</div>'+
      '<div class="qgrid2"><div class="qleft">'+qleft+'</div><div class="qright'+(r.status==='수락됨'?' ref-on':'')+'">'+ bodyCard +'</div></div>'+
      (showMsg?chatDrawerHTML(r, showReport):'');
  }

  /* 상단바(앱 바) — 프로필 이름·아바타·알림 뱃지 채우기 + 계정 메뉴 */
  function toggleAccMenu(e){ if(e) e.stopPropagation(); var m=$('accMenu'); if(m) m.classList.toggle('on'); }
  document.addEventListener('click', function(){ var m=$('accMenu'); if(m) m.classList.remove('on'); });
  function setTxt(id,v){ var e=$(id); if(e&&v!=null) e.textContent=v; }
  function setSrc(id,v){ var e=$(id); if(e&&v) e.src=v; }
  function initHeader(){
    var nm=(profile&&profile.name)||'소희 스타일리스트';
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

  Promise.all([
    fetch('data/bodytypes.json').then(function(r){return r.json();}).catch(function(){return {};}),
    fetch('data/body-base-model.json').then(function(r){return r.json();}).catch(function(){return null;}),
    fetch('data/body-distribution.json').then(function(r){return r.json();}).catch(function(){return null;})
  ]).then(function(res){
    ((res[0]&&res[0].types)||[]).forEach(function(t){ BTMAP[t.code]=t; });
    BMODEL=res[1]; BDIST=res[2];
    render();
  }).catch(function(){ render(); });
