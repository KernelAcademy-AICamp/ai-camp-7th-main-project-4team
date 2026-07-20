  /* 스타일리스트(공급자) 포털 — 시작 구조. 페르소나: 소희 스타일리스트.
     고객 측 요청 라이프사이클의 대칭 뷰. 요청 클릭 → 상세 드로어(체형·사이즈 첨부 + 요청 내용)에서 제안. */
  function loadLS(k, def){ try{ var v=localStorage.getItem('fitting.'+k); return v?JSON.parse(v):def; }catch(e){ return def; } }
  function saveLS(k, v){ try{ localStorage.setItem('fitting.'+k, JSON.stringify(v)); }catch(e){} }
  /* 가입(온보딩)에서 저장한 프로필. 데이터 계약: docs/스타일리스트가입-화면정의서.md §5 */
  var PROFILE = loadLS('pro.profile', null);
  var MY_PRICE = (PROFILE && PROFILE.services && PROFILE.services[0]) ? PROFILE.services[0].price : 120000;
  /* 가입 전(직접 pro.html 진입) 편집 시 시드로 쓸 기본 프로필 = 화면의 데모값과 동일 */
  /* 예시용 포트폴리오(사진 + 착용 모델 키·몸무게) */
  var DEMO_PORTFOLIO = [
    {src:'photos/folio1.jpg', height:168, weight:55},
    {src:'photos/folio2.jpg', height:172, weight:63},
    {src:'photos/folio3.jpg', height:160, weight:50},
    {src:'photos/folio4.jpg', height:177, weight:70},
    {src:'photos/folio5.jpg', height:165, weight:58},
    {src:'photos/folio6.jpg', height:170, weight:60},
    {src:'photos/folio1.jpg', height:158, weight:48},
    {src:'photos/folio2.jpg', height:174, weight:66}
  ];
  var DEFAULT_PROFILE = {
    registered:false, name:'소희 스타일리스트',
    services:[
      {type:'online',label:'온라인 스타일링',price:35000,mode:'비대면'},
      {type:'shopping',label:'동행 쇼핑',price:120000,mode:'대면',regions:['서울 강남','서울 마포']},
      {type:'image',label:'이미지 컨설팅',price:90000,mode:'대면',regions:['서울 강남']}
    ],
    bio:'데일리·소개팅룩 전문 스타일리스트 · 비대면 큐레이션이 강점이에요',
    occ:['date','daily'], tags:['미니멀','시크'], portfolio:DEMO_PORTFOLIO
  };
  /* 전문분야(=스타일리스트찾기 상황) 7가지 · 코드↔라벨 (데이터 계약) */
  var FIELD_OPTS = [
    {code:'date',label:'소개팅·데이트'},{code:'interview',label:'면접·발표'},{code:'wedding',label:'결혼식 하객'},
    {code:'travel',label:'여행'},{code:'daily',label:'데일리 스타일링'},{code:'personal',label:'퍼스널 스타일링'},{code:'bodycover',label:'체형 커버 스타일링'}
  ];
  function fieldLabel(c){ for(var i=0;i<FIELD_OPTS.length;i++) if(FIELD_OPTS[i].code===c) return FIELD_OPTS[i].label; return c; }
  var STYLE_PRESETS = ['캐주얼','미니멀','시크','클래식','스트리트','빈티지','스포티','걸리시'];
  var REGION_PRESETS = ['서울','경기','인천','부산','대구','대전','광주'];

  var REQS_VER = 9;   // 데모 버전 — 결과물·분쟁 샘플(#36) + wearExp + 대화 스레드(msgs) + 결제대기(5단계) 시드 + 분쟁 _prevStatus
  /* wearExp = 고객 진단 착용경험(상품명 없이 브랜드·카테고리·핏·사이즈·부위느낌). 없으면 미첨부(견적서에서 '없음' 표기) */
  var DEMO_REQS = [
    {cust:'한서준', type:'TUB', bodytype:'슬릭 라인',     gender:'male',   cm:180, kg:68, occ:'데일리',     budget:'5~10만',  date:'2026.07.14', service:'online', note:'심플하게, 근데 밋밋하지 않게 입고 싶어요', status:'신규'},
    {cust:'김도현', type:'STR', bodytype:'시크 스트레이트', gender:'male',   cm:172, kg:65, occ:'소개팅',     budget:'5~10만',  date:'2026.07.02', service:'online', note:'과하지 않게 깔끔한 첫인상 원해요', status:'신규', wearExp:[{brand:'유니클로',cat:'상의',fit:'레귤러핏',size:'M',feel:'딱맞음'},{brand:'무신사 스탠다드',cat:'하의',fit:'스트레이트',size:'32',feel:'딱맞음'}]},
    {cust:'정예린', type:'INV', bodytype:'모던 V라인',     gender:'female', cm:167, kg:58, occ:'일상 코디',   budget:'~5만',    date:'2026.07.01', service:'shopping', note:'출근룩 위주로 데일리하게 입고 싶어요', status:'신규', wearExp:[{brand:'ZARA',cat:'상의',fit:'슬림핏',size:'S',feel:'딱맞음'}]},
    {cust:'이서연', type:'HRG', bodytype:'엘레강스 X라인', gender:'female', cm:163, kg:52, occ:'면접·발표',   budget:'10~15만', date:'2026.06.30', service:'image', note:'신뢰감 있는 오피스룩', dir:'out', status:'제안발송', offer:{price:95000, msg:'면접관 시선까지 고려해 첫인상 깔끔하게 잡아드릴게요'}},
    {cust:'박지우', type:'TRI', bodytype:'소프트 A라인',   gender:'female', cm:160, kg:54, occ:'결혼식 하객', budget:'10~15만', date:'2026.06.27', service:'online', note:'', status:'수락됨', offer:{price:120000, msg:'하객룩 단정하게 코디해드릴게요'}, msgs:[{from:'cust', text:'안녕하세요! 결혼식이 다음 주 토요일이에요 🙂'},{from:'pro', text:'네 반가워요! 하객룩은 튀지 않게 단정하게 잡아드릴게요. 혹시 원하는 색 계열 있으세요?'},{from:'cust', text:'차분한 톤이 좋아요. 잘 부탁드려요!'}]},
    {cust:'최민준', type:'BAL', bodytype:'이지 밸런스',    gender:'male',   cm:175, kg:70, occ:'데일리',     budget:'~5만',    date:'2026.06.18', service:'online', status:'완료', offer:{price:60000, msg:''}, review:{rating:5, text:'취향 저격이었어요! 반품 없이 한 번에 성공'}},
    {cust:'한지민', type:'STR', bodytype:'시크 스트레이트', gender:'female', cm:164, kg:52, occ:'소개팅',     budget:'5~10만',  date:'2026.06.29', service:'online', note:'', status:'분쟁', _prevStatus:'수락됨', offer:{price:90000, msg:'소개팅룩 깔끔하게 잡아드릴게요'}, dispute:{reason:'미이행', detail:'결과물을 받지 못했어요', at:'2026.07.02'}, msgs:[{from:'cust', text:'결과물 언제 받을 수 있을까요?'},{from:'pro', text:'죄송해요, 어제 코디 3안 링크 전달드렸는데 혹시 확인 안 되셨을까요? 다시 보내드릴게요.'}]},
    {cust:'윤채원', type:'BAL', bodytype:'이지 밸런스',    gender:'female', cm:165, kg:53, occ:'데이트룩',   budget:'5~10만',  date:'2026.07.13', service:'online', note:'봄 데이트룩 화사하게', status:'결제대기', offer:{price:88000, msg:'화사한 데이트룩으로 잡아드릴게요'}, wearExp:[{brand:'마인드브릿지',cat:'상의',fit:'레귤러',size:'M',feel:'딱맞음'}], msgs:[{from:'cust', text:'견적 감사해요! 방금 입금했어요 :)'}]}
  ];
  var reqs = loadLS('pro.reqs', null);
  if(!reqs || loadLS('pro.reqsVer',0)!==REQS_VER){ reqs = DEMO_REQS; saveLS('pro.reqsVer', REQS_VER); }
  /* 서비스 유형 3종 보정 — 옛 캐시('visit' 등)도 요청자별로 강제 재매핑. 박지우=online(온라인 결과물 테스트) */
  var SVC_BY_CUST = {'한서준':'online','김도현':'online','정예린':'shopping','이서연':'image','박지우':'online','최민준':'online','한지민':'online','윤채원':'online'};
  reqs.forEach(function(r){ r.service = SVC_BY_CUST[r.cust] || r.service || 'online'; });
  saveLS('pro.reqs', reqs);   // 견적서 페이지(pro-quote)가 같은 데이터를 읽도록 항상 저장

  /* ===== 네비 ===== */
  function nav(el){
    var m=document.querySelectorAll('#smenu a'); for(var i=0;i<m.length;i++) m[i].classList.remove('on'); el.classList.add('on');
    var ps=document.querySelectorAll('.panel'); for(var j=0;j<ps.length;j++) ps[j].classList.remove('on');
    document.getElementById(el.dataset.p).classList.add('on');
    /* 현재 패널을 URL에 남김 — 견적서에 들어갔다 브라우저 뒤로가기로 돌아와도 대시보드로 초기화되지 않게 */
    try{ history.replaceState(null,'','pro.html?panel='+el.dataset.p); }catch(_){}
    window.scrollTo({top:0, behavior:'smooth'});
  }
  /* 지금 열려 있는 패널 키 — 견적서로 넘어갈 때 '어디서 왔는지'로 함께 넘김 */
  function curPanel(){ var a=document.querySelector('#smenu a.on'); return (a&&a.dataset.p)||'dash'; }
  function toast(m){ var t=document.getElementById('toast'); t.textContent=m; t.classList.add('on'); clearTimeout(window._t); window._t=setTimeout(function(){t.classList.remove('on');},2000); }
  function stClass(s){ return s==='신규'?'nw':(s==='제안발송'?'sent':((s==='수락됨'||s==='결제대기'||s==='상담중')?'prog':(s==='분쟁'?'warn':(s==='완료'?'done':'sent')))); }
  /* 서비스 유형 선(line) 아이콘 — 고객 화면(index.js SVCI_SVG)과 동일: 온라인=모니터·동행=쇼핑백·이미지=반짝임 */
  var SVC_SVG = {
    online:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="11" rx="1.6"/><path d="M8.5 20h7"/><path d="M12 16v4"/></svg>',
    shopping:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7.5h12l-1 12.5H7L6 7.5z"/><path d="M9.3 7.5V6a2.7 2.7 0 0 1 5.4 0v1.5"/></svg>',
    image:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.6l1.6 4.5 4.5 1.6-4.5 1.6L12 15.8l-1.6-4.5L5.9 9.7l4.5-1.6L12 3.6z"/><path d="M18.6 13.8v2.2M19.7 14.9h-2.2"/></svg>'
  };
  function svcSvg(t){ return SVC_SVG[t]||SVC_SVG.online; }
  function svcMeta(s){
    if(s==='shopping') return {cls:'shopping', label:'동행 쇼핑', icon:svcSvg('shopping')};
    if(s==='image')  return {cls:'image',  label:'이미지 컨설팅', icon:svcSvg('image')};
    return {cls:'online', label:'온라인 스타일링', icon:svcSvg('online')};
  }
  function svcLabel(s){ return svcMeta(s).label; }
  function svcBadge(s){ var m=svcMeta(s); return '<span class="svcbadge '+m.cls+'">'+m.icon+' '+m.label+'</span>'; }
  function starsRO(n){ var s=''; for(var k=1;k<=5;k++) s+='<span style="color:'+(k<=n?'var(--ink)':'var(--line2)')+'">★</span>'; return s; }

  /* ===== 요청 행(요약, 클릭 시 상세) ===== */
  /* 날짜 6글자 — 2026.07.12 → 26.07.12 */
  function shortDate(d){ return (typeof d==='string' && /^\d{4}\./.test(d)) ? d.slice(2) : (d||''); }
  /* 통일 리스트 행(.ureq) — 1줄: 상황·서비스 / 2줄: 이름·날짜·예산. 서비스는 모노 아이콘, 색은 상태에만 */
  /* 요청 행 카드(요청 내역·보낸 견적·공개 요청 공용). opts로 클릭 대상·뱃지만 갈아끼움.
     opts.href=지정 링크(공개 요청 ?cand) / opts.badge·badgeClass=상태 대신 표시할 뱃지 */
  function reqTop(r, opts){ opts=opts||{}; var i=reqs.indexOf(r);
    var s=r.status;
    var xc=(s==='수락됨'||s==='결제대기'||s==='상담중')?'active':((s==='완료'||s==='거절'||s==='취소')?'past':'');   // 진행중=활성 / 완료·취소·거절=지난
    var title=svcLabel(r.service)+(r.occ?' · '+r.occ:'');
    var parts=[]; if(r.cust) parts.push(r.cust+' 님'); var sd=shortDate(r.date); if(sd) parts.push(sd); if(r.budget) parts.push('<b>예산 '+r.budget+'</b>');
    var onclick = opts.href ? "location.href='"+opts.href+"'" : 'goQuote('+i+')';
    var badge = opts.badge!=null ? opts.badge : s;
    var badgeClass = opts.badgeClass || stClass(s);
    return '<div class="ureq'+(xc?' '+xc:'')+' rowbtn" onclick="'+onclick+'">'+
      '<span class="ureq-ic">'+svcSvg(r.service)+'</span>'+
      '<div class="ureq-l"><div class="ureq-title">'+title+'</div><div class="ureq-meta">'+parts.join(' · ')+'</div></div>'+
      '<div class="ureq-r"><span class="st '+badgeClass+'">'+badge+'</span><span class="chev">›</span></div>'+
    '</div>';
  }

  /* ===== 상세 드로어 ===== */
  function drawerAction(r,i){ var s=r.status;
    if(s==='신규'){ if(r._offering) return offerForm(r,i); return '<button class="btn full" onclick="openOffer('+i+')">제안 보내기</button>'; }
    if(s==='제안발송'){ var o=r.offer||{}; return '<div class="note-quote"><b style="color:var(--green)">제안 발송됨</b> · <span style="font-family:var(--num);font-weight:800">'+(o.price?o.price.toLocaleString():'—')+'</span>원<br><span style="font-size:13px;color:var(--sub)">"'+(o.msg||'')+'"</span><br><span style="font-size:12.5px;color:var(--sub2)">고객 응답을 기다리는 중이에요</span></div><button class="btn ghost full" style="margin-top:10px" onclick="simAccept('+i+')">고객 수락 · 데모</button>'; }
    if(s==='상담중'){ var oc=r.offer||{}; return '<div class="note-quote"><b style="color:var(--green)">수락함 · 대화 중</b> · <span style="font-family:var(--num);font-weight:800">'+(oc.price?oc.price.toLocaleString():'—')+'</span>원<br><span style="font-size:12.5px;color:var(--sub2)">'+(isOfflineSvc(r.service)?'약속을 잡고 입금을 요청해요':'내용을 맞춰본 뒤 입금을 요청해요')+'</span></div>'+
      '<button class="btn full" style="margin-top:10px" onclick="goQuote('+i+')">상세에서 이어가기 →</button>'; }
    if(s==='결제대기'){ var op=r.offer||{}; return '<div class="note-quote"><b style="color:#8A5F16">입금 대기</b> · <span style="font-family:var(--num);font-weight:800">'+(op.price?op.price.toLocaleString():'—')+'</span>원<br><span style="font-size:12.5px;color:var(--sub2)">고객 입금을 기다리는 중이에요</span></div>'+
      '<button class="btn full" style="margin-top:10px" onclick="goQuote('+i+')">상세에서 입금 확인 →</button>'; }
    if(s==='수락됨'){ var o2=r.offer||{};
      // 결과물 작성은 상세(견적서) 한 곳으로 통일 — 서비스별 폼·진단 리포트·사진이 거기 있음(옛 인라인 폼 제거)
      var hd='<div class="note-quote"><b style="color:var(--green)">수락됨 · 진행 중</b> · <span style="font-family:var(--num);font-weight:800">'+(o2.price?o2.price.toLocaleString():'—')+'</span>원'+
        (r.appt?'<br><span style="font-size:12.5px;color:var(--green-mid);font-weight:700">약속 '+apptText(r.appt)+'</span>':'')+'</div>';
      if(r.deliver) return hd + deliverSummary(r) + '<button class="btn full" style="margin-top:10px" onclick="completeReq('+i+')">완료 처리</button>';
      var lead = r.service==='image' ? '진단 리포트를 작성해 전달해요' : (r.service==='shopping' ? '구매 내역을 정리해 전달해요' : '추천 상품·코디를 작성해 전달해요');
      return hd + '<p class="note-quote muted" style="margin-top:10px">'+lead+' · 상세에서 작성</p>'+
        '<button class="btn full" style="margin-top:10px" onclick="goQuote('+i+')">상세에서 결과물 작성 →</button>'; }
    if(s==='분쟁'){ var dp=r.dispute||{}; return '<div class="note-quote" style="border-left:3px solid var(--warn);padding-left:12px"><b style="color:var(--warn)">분쟁 처리 중</b><br><span style="font-size:12.5px;color:var(--sub2)">'+esc(dp.reason||'기타')+' · '+(dp.reply?'소명 제출됨':'소명 필요')+'</span></div>'+
      '<button class="btn full" style="margin-top:10px" onclick="goQuote('+i+')">상세에서 대응 →</button>'; }
    if(s==='거절'||s==='취소'){ return '<div class="note-quote muted">'+(s==='거절'?'거절한 요청이에요':'취소된 건이에요')+'</div>'+
      '<button class="btn ghost full" style="margin-top:10px" onclick="goQuote('+i+')">상세 보기</button>'; }
    if(s==='완료'){ if(r.review) return '<div class="dsec-label">고객 후기</div><div class="note-quote"><span style="letter-spacing:1px">'+starsRO(r.review.rating)+'</span><br>"'+r.review.text+'"</div>'; return '<div class="note-quote muted">완료 · 고객 후기를 기다리는 중이에요</div>'; }
    return '<button class="btn ghost full" onclick="goQuote('+i+')">상세 보기</button>';
  }
  function offerForm(r,i){
    return '<div class="offerform">'+
      '<div class="row"><label>견적</label><input id="offAmt'+i+'" type="number" value="'+((r.offer&&r.offer.price)||MY_PRICE)+'"> 원</div>'+
      '<textarea id="offMsg'+i+'" placeholder="고객에게 전할 한 줄 제안">'+((r.offer&&r.offer.msg)||'')+'</textarea>'+
      '<div class="obtns"><button class="tinybtn ghost" onclick="cancelOffer('+i+')">취소</button><button class="tinybtn" onclick="sendOffer('+i+')">제안 발송</button></div>'+
    '</div>';
  }
  /* ===== 결과물 = 상세(견적서)에서 작성. 여기 목록 드로어는 '제출한 결과물 요약'만 읽기전용으로 보여줌 ===== */
  function itemLine(it){ return (it.cat?'['+it.cat+'] ':'')+'<b style="color:var(--ink)">'+it.brand+'</b> '+it.name+' · '+it.size+' · <span class="num">'+(it.price?Number(it.price).toLocaleString():'—')+'</span>원'+(it.url?' 🔗':''); }
  /* 대면 여부(pro-quote.js isOffline과 같은 기준) · 약속 표시 형식(상세와 동일: 26.07.20 11:00 AM) */
  function isOfflineSvc(s){ var f=(PROFILE&&PROFILE.services||[]).filter(function(x){return x.type===s;})[0]; if(f&&f.mode) return f.mode==='대면'; return s==='shopping'||s==='image'; }
  function shortDateP(d){ d=String(d||''); var p=d.split(/[.\-/]/); return (p.length===3&&p[0].length===4)?(p[0].slice(2)+'.'+('0'+p[1]).slice(-2)+'.'+('0'+p[2]).slice(-2)):d; }
  function fmtTimeP(t){ t=String(t||''); var m=t.match(/^(\d{1,2}):(\d{2})/); if(!m) return t; var h=+m[1],ap=h<12?'AM':'PM',h12=h%12; if(h12===0)h12=12; return ('0'+h12).slice(-2)+':'+m[2]+' '+ap; }
  function apptText(a){ a=a||{}; return shortDateP(a.date)+(a.time?' '+fmtTimeP(a.time):'')+(a.place?' · '+a.place:''); }
  /* 제출한 결과물 요약(읽기전용) — 서비스별: 진단 리포트 / 상품 목록 */
  function deliverSummary(r){ var d=r.deliver||{}, items=d.items||[], rp=d.report;
    var head, body='';
    if(r.service==='image' && rp){
      head='진단 리포트 전달함';
      body=(rp.color?'<span style="font-size:13px;color:var(--sub)">· 퍼스널 컬러 '+esc(rp.color)+'</span>':'')+
        (rp.direction?'<br><span style="font-size:13px;color:var(--sub)">· '+esc(rp.direction)+'</span>':'');
    } else {
      head=(r.service==='shopping'?'구매 상품':'추천 상품')+' '+items.length+'개 전달함';
      body=items.map(function(it){ return '<span style="font-size:13px;color:var(--sub)">· '+itemLine(it)+'</span>'; }).join('<br>');
    }
    return '<div class="dsec-label">제출한 결과물</div>'+
      '<div class="note-quote"><b style="color:var(--green)">✓ '+head+'</b>'+(body?'<br>'+body:'')+
      (d.msg?'<br><span style="font-size:12.5px;color:var(--sub2)">"'+esc(d.msg)+'"</span>':'')+'</div>';
  }

  function openReqDetail(i){ var r=reqs[i]; var tp=r.type||'STR', g=r.gender||'female';
    document.getElementById('drawerBody').innerHTML=
      '<div class="dh"><div class="dcrumb">고객 요청 상세</div><h2>'+r.cust+' 님 · '+r.occ+'</h2></div>'+
      '<div class="db">'+
        '<div class="dsec-label">첨부된 체형·사이즈 프로필</div>'+
        '<div class="bodycard"><iframe src="card.html?type='+tp+'&g='+g+'&compact=1" scrolling="no" tabindex="-1" title="고객 체형 카드"></iframe></div>'+
        '<div class="bodymeta">'+r.bodytype+' ('+tp+') · <span class="num">'+(r.cm||'—')+'</span>cm · <span class="num">'+(r.kg||'—')+'</span>kg</div>'+
        '<div class="dsec-label">요청 내용</div>'+
        '<div class="kv"><span>서비스 유형</span><b>'+svcLabel(r.service)+'</b></div>'+
        '<div class="kv"><span>상황</span><b>'+r.occ+'</b></div>'+
        '<div class="kv"><span>예산</span><b>'+r.budget+'</b></div>'+
        '<div class="kv"><span>희망 일정</span><b>'+(r.date||'—')+'</b></div>'+
        '<div class="dsec-label">한 줄 요청</div>'+
        '<p class="note-quote'+(r.note?'':' muted')+'">'+(r.note?('"'+r.note+'"'):'요청 메모 없음')+'</p>'+
        '<div class="dact">'+drawerAction(r,i)+'</div>'+
      '</div>';
    document.getElementById('drawer').classList.add('on'); document.getElementById('scrim').classList.add('on');
  }
  function closeDrawer(){ document.getElementById('drawer').classList.remove('on'); document.getElementById('scrim').classList.remove('on'); }
  document.addEventListener('keydown', function(e){ if(e.key==='Escape'){ closeDrawer(); closeAvatar(); } });

  /* ===== 요청함 액션 (상세 드로어 안에서) ===== */
  function refresh(i){ renderAll(); if(document.getElementById('drawer').classList.contains('on')) openReqDetail(i); }
  function openOffer(i){ reqs[i]._offering=true; openReqDetail(i); }
  function cancelOffer(i){ reqs[i]._offering=false; openReqDetail(i); }
  function sendOffer(i){ var a=document.getElementById('offAmt'+i), m=document.getElementById('offMsg'+i);
    var price=a?parseInt(a.value,10)||MY_PRICE:MY_PRICE, msg=m?m.value.trim():'';
    reqs[i].offer={price:price, msg:msg||'요청에 맞춰 코디해드릴게요'}; reqs[i].status='제안발송'; reqs[i]._offering=false;
    saveLS('pro.reqs',reqs); refresh(i); toast(reqs[i].cust+' 님에게 제안을 보냈어요'); }
  function simAccept(i){ reqs[i].status='상담중'; saveLS('pro.reqs',reqs); refresh(i); toast(reqs[i].cust+' 님이 제안을 수락했어요 · 대화로 내용을 맞춰보세요'); }
  function completeReq(i){ reqs[i].status='완료'; saveLS('pro.reqs',reqs); refresh(i); toast('완료 처리했어요 · 고객 후기를 기다려요'); }

  /* ===== 렌더 ===== */
  /* 상태 → 목록 버킷. 거래가 시작되면(진행 중·지난) 출처(들어온/보낸)를 따지지 않고 한 곳으로 모은다. */
  var ST_ACTIVE=['상담중','결제대기','수락됨','분쟁'];   // 진행 중
  var ST_CLOSED=['완료','거절','취소'];                   // 지난 요청(완료·거절·취소)
  function renderInbox(){
    // 새 요청 = 고객이 방금 보낸(들어온) 신규만. 제안발송(응답 대기)은 견적 보내기 '보낸 견적'으로.
    var news=reqs.filter(function(r){return r.dir!=='out' && r.status==='신규';}).sort(byDateDesc);
    var prog=reqs.filter(function(r){return ST_ACTIVE.indexOf(r.status)>=0;}).sort(byDateDesc);   // 출처 무관
    var closed=reqs.filter(function(r){return ST_CLOSED.indexOf(r.status)>=0;}).sort(byDateDesc); // 출처 무관
    // 보낸 견적 = 내가 견적을 보내고 고객 응답을 기다리는 건(들어온 요청에 제안한 것 + 공개 요청에 먼저 보낸 것 모두)
    var sent=reqs.filter(function(r){return r.status==='제안발송';}).sort(byDateDesc);
    function setCnt(id,n){ var e=document.getElementById(id); if(e) e.textContent=n; }
    setCnt('cntNew',news.length); setCnt('cntProg',prog.length); setCnt('cntDone',closed.length); setCnt('cntSent',sent.length);
    document.getElementById('inboxNewList').innerHTML = news.length ? news.map(function(r){ return reqTop(r,true); }).join('') : '<p class="note" style="padding:14px 0">새 요청이 없어요</p>';
    document.getElementById('inboxProgList').innerHTML = prog.length ? prog.map(function(r){ return reqTop(r,true); }).join('') : '<p class="note" style="padding:14px 0">진행 중인 건이 없어요</p>';
    var dc=document.getElementById('inboxDoneCard');
    if(closed.length){ dc.style.display=''; document.getElementById('inboxDoneList').innerHTML=closed.map(function(r){ return reqTop(r,true); }).join(''); }
    else { dc.style.display='none'; }
    document.getElementById('inboxOutList').innerHTML = sent.length ? sent.map(function(r){ return reqTop(r,true); }).join('') : '<p class="note" style="padding:14px 0">아직 응답을 기다리는 견적이 없어요</p>';
  }
  function renderRecent(){ document.getElementById('dashRecent').innerHTML=reqs.filter(function(r){return r.dir!=='out';}).sort(byDateDesc).slice(0,3).map(function(r){ return reqTop(r,true); }).join(''); }
  /* 견적 보내기(역방향): '견적받기' 설정한 고객(데모 · 고객 영역은 미구현) → 스타일리스트가 먼저 견적 발송 */
  var CANDIDATES = [
    {cust:'이수민', type:'HRG', bodytype:'엘레강스 X라인', gender:'female', cm:165, kg:53, occ:'결혼식 하객', budget:'10~15만', service:'shopping', note:'하객룩 단정하게, 과하지 않게'},
    {cust:'박준영', type:'INV', bodytype:'모던 V라인',   gender:'male',   cm:178, kg:74, occ:'면접·발표',   budget:'15만+',   service:'image',  note:'첫인상 신뢰감 있게'},
    {cust:'최지아', type:'TRI', bodytype:'소프트 A라인', gender:'female', cm:160, kg:50, occ:'데일리',       budget:'~5만',    service:'online',   note:'출근룩 위주 데일리하게'}
  ];
  saveLS('pro.candidates', CANDIDATES);   // 견적서(pro-quote)가 ?cand=i로 읽을 수 있게 공유
  function renderCandidates(){
    var el=document.getElementById('dashCand'); if(!el) return;
    var proposed=loadLS('pro.proposed',[]);
    var list=CANDIDATES.map(function(c,i){return {c:c,i:i};}).filter(function(x){return proposed.indexOf(x.c.cust)<0;});
    var cc=document.getElementById('cntCand'); if(cc) cc.textContent=list.length;
    if(!list.length){ el.innerHTML='<p class="note" style="padding:12px 0">지금은 공개 요청이 없어요</p>'; return; }
    // 요청 내역과 같은 행(reqTop) — 상태 대신 '공개 요청' 뱃지, 클릭 시 ?cand 상세로 이동해 거기서 견적 발송
    el.innerHTML=list.map(function(x){ var c=x.c, i=x.i;
      return reqTop(c, { href:'pro-quote.html?cand='+i+'&from=propose', badge:'공개 요청', badgeClass:'nw' });
    }).join('');
  }
  var replyIdx=-1;
  function renderReviews(){
    var el=document.getElementById('reviewList');
    var rv=reqs.filter(function(r){return r.review;});
    el.innerHTML = rv.length ? rv.map(function(r){ var i=reqs.indexOf(r);
      var replyBlock = r.reply
        ? '<div class="rvreply"><b>스타일리스트 답글</b><br>'+r.reply+'</div>'
        : (replyIdx===i
            ? '<div class="rvreplyform"><textarea id="rvReplyInput" placeholder="후기에 답글을 남겨보세요"></textarea><div class="rb"><button class="tinybtn ghost" onclick="cancelReply()">취소</button><button class="tinybtn" onclick="saveReply('+i+')">답글 등록</button></div></div>'
            : '<div style="margin-top:10px"><button class="tinybtn ghost" onclick="openReply('+i+')">답글 달기</button></div>');
      return '<div class="req"><div class="reqtop"><div class="av">'+r.cust.charAt(0)+'</div><div class="info"><b>'+r.cust+' 님 · '+r.occ+'</b><small style="letter-spacing:1px">'+starsRO(r.review.rating)+'</small></div></div>'+
        '<div class="reqact" style="display:block"><span class="reqnote">"'+r.review.text+'"</span>'+replyBlock+'</div></div>';
    }).join('') : '<p class="note" style="padding:14px 0">아직 받은 후기가 없어요</p>';
  }
  function openReply(i){ replyIdx=i; renderReviews(); }
  function cancelReply(){ replyIdx=-1; renderReviews(); }
  function saveReply(i){ var el=document.getElementById('rvReplyInput'); var v=el?el.value.trim():''; if(!v){ toast('답글 내용을 입력해주세요'); return; } reqs[i].reply=v; saveLS('pro.reqs',reqs); replyIdx=-1; renderReviews(); toast('답글을 등록했어요'); }
  var DEMO_AGO = ['방금 전','2시간 전','5시간 전','어제'];  // 응답 필요 목록의 예시용 경과시간
  /* ===== 실데이터 집계 (수익·평점) ===== */
  function completedReqs(){ return reqs.filter(function(r){return r.status==='완료';}); }
  function reqPrice(r){ return (r.offer&&r.offer.price)||0; }
  function monthRevenue(){ return completedReqs().reduce(function(s,r){return s+reqPrice(r);},0); }
  function avgRating(){ var rv=reqs.filter(function(r){return r.review;}); if(!rv.length) return null; return rv.reduce(function(s,r){return s+(r.review.rating||0);},0)/rv.length; }
  function won(n){ return (n||0).toLocaleString()+'원'; }

  function renderStats(){
    var nw=reqs.filter(function(r){return r.status==='신규'&&r.dir!=='out';}).length;
    // 진행 중 = 요청함 '진행 중'과 같은 상태 집합(ST_ACTIVE)이어야 숫자가 일치
    var prog=reqs.filter(function(r){return ST_ACTIVE.indexOf(r.status)>=0;}).length;
    var rating=avgRating(), rt=(rating!=null)?rating.toFixed(1):'—';
    document.getElementById('dashStats').innerHTML=
      '<div class="stat"><b>'+won(monthRevenue())+'</b><small>이번 달 수익</small></div>'+
      '<div class="stat"><b>'+nw+'</b><small>신규 요청</small></div>'+
      '<div class="stat"><b>'+prog+'</b><small>진행 중</small></div>'+
      '<div class="stat"><b>★ '+rt+'</b><small>평점</small></div>';
    document.getElementById('newCnt').textContent=nw;
    document.getElementById('pRev').textContent=reqs.filter(function(r){return r.review;}).length;
    var pr=document.getElementById('pRate'); if(pr) pr.textContent=rt;
    var bb=document.getElementById('bellBadge'); if(bb){ if(nw>0){ bb.style.display='flex'; bb.textContent=nw; } else bb.style.display='none'; }
  }
  /* 정산 화면 */
  function renderSettle(){
    var el=document.getElementById('settleList'); if(!el) return;
    var done=completedReqs(), total=monthRevenue();
    var ss=document.getElementById('settleStats');
    if(ss) ss.innerHTML=
      '<div class="stat"><b>'+won(total)+'</b><small>이번 달 수익</small></div>'+
      '<div class="stat"><b>'+done.length+'</b><small>완료 건</small></div>'+
      '<div class="stat"><b>'+won(done.length?Math.round(total/done.length):0)+'</b><small>건당 평균</small></div>';
    el.innerHTML = done.length ? done.map(function(r){
      return '<div class="setrow"><div class="si"><b>'+r.cust+' 님 · '+r.occ+'</b><small>'+svcLabel(r.service)+' · '+(r.date||'—')+'</small></div>'+
        '<span class="amt">'+won(reqPrice(r))+'</span><span class="stag wait">정산 대기</span></div>';
    }).join('') : '<p class="note" style="padding:14px 0">아직 완료된 정산 내역이 없어요</p>';
  }

  /* ===== 지원·문의 (전문가 CS · IA 2.x) — 소비자 고객센터(mp-support)의 공급자 대칭. 스토어: fitting.pro.support ===== */
  var SUP_SEED_VER=1;
  var SUP_SEED=[
    {id:'S1', type:'정산·지급', text:'6월 완료 건 정산일이 언제인지 궁금해요.', at:'2026.06.28', status:'답변완료',
      reply:'완료 확정일 기준 익월 10일에 일괄 정산돼요. 6월 완료 건은 7/10 지급 예정이에요.'},
    {id:'S2', type:'거래·고객', text:'노쇼 고객은 어떻게 처리되나요?', at:'2026.07.03', status:'접수'}
  ];
  var proSup = loadLS('pro.support', null);
  if(!proSup || loadLS('pro.supportVer',0)!==SUP_SEED_VER){ proSup=SUP_SEED.slice(); saveLS('pro.support',proSup); saveLS('pro.supportVer',SUP_SEED_VER); }
  function supTag(s){ return s==='답변완료'
    ? '<span class="stag" style="background:var(--green-soft,#e7efea);color:var(--green,#2E4A3B)">답변완료</span>'
    : '<span class="stag wait">접수</span>'; }
  function renderProSupport(){
    var el=document.getElementById('supList'); if(!el) return;
    el.innerHTML = proSup.length ? proSup.map(function(t){
      return '<div class="setrow" style="align-items:flex-start;flex-wrap:wrap">'+
        '<div class="si" style="flex:1;min-width:0"><b>'+t.type+'</b><small>'+(t.at||'')+'</small>'+
          '<div style="font-size:13.5px;color:var(--ink-soft,#4a4842);margin-top:6px;line-height:1.55">'+esc(t.text)+'</div>'+
          (t.reply?'<div class="note-quote" style="margin-top:8px;font-size:13px"><b style="color:var(--green,#2E4A3B)">운영팀 답변</b><br>'+esc(t.reply)+'</div>':'')+
        '</div>'+supTag(t.status)+'</div>';
    }).join('') : '<p class="note" style="padding:14px 0">아직 접수한 문의가 없어요</p>';
    var open=proSup.filter(function(t){return t.status!=='답변완료';}).length;
    var c=document.getElementById('supCnt'); if(c){ if(open>0){ c.style.display='inline-block'; c.textContent=open; } else c.style.display='none'; }
  }
  function submitProSupport(){
    var ty=document.getElementById('supType'), tx=document.getElementById('supText');
    var text=tx?tx.value.trim():''; if(!text){ toast('문의 내용을 입력해주세요'); return; }
    proSup.unshift({ id:'S'+Date.now().toString(36), type:ty?ty.value:'기타', text:text,
      at:new Date().toISOString().slice(0,10).replace(/-/g,'.'), status:'접수' });
    saveLS('pro.support',proSup); if(tx) tx.value=''; renderProSupport(); toast('문의가 접수됐어요 · 보통 1영업일 안에 답변드려요');
  }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  /* ===== 헤더: 알림·계정 ===== */
  function goPanel(p){ var a=document.querySelector('#smenu a[data-p="'+p+'"]'); if(a) nav(a); var m=document.getElementById('accMenu'); if(m) m.classList.remove('on'); }
  function toggleAccMenu(e){ if(e) e.stopPropagation(); document.getElementById('accMenu').classList.toggle('on'); }
  function logout(){ if(confirm('로그아웃할까요?')) location.href='pro-login.html'; }
  document.addEventListener('click', function(e){ var m=document.getElementById('accMenu'); if(!m||!m.classList.contains('on')) return; var me=document.querySelector('.navr .me'); if(!m.contains(e.target) && !(me&&me.contains(e.target))) m.classList.remove('on'); });
  /* 최신순 정렬용 날짜 파싱('방금'=최신) */
  function dateVal(d){ if(!d) return 0; if(d==='방금') return 9e15; var t=Date.parse(String(d).replace(/\./g,'-')); return isNaN(t)?0:t; }
  function byDateDesc(a,b){ return dateVal(b.date)-dateVal(a.date); }
  /* ① 지금 응답이 필요한 요청(신규) — 대시보드 상단 액션 카드 */
  function renderUrgent(){
    var el=document.getElementById('dashUrgent');
    var news=reqs.filter(function(r){return r.status==='신규'&&r.dir!=='out';}).sort(byDateDesc);
    if(!news.length){ el.style.display='none'; return; }
    el.style.display='block';
    el.innerHTML='<div class="subhead">지금 응답이 필요해요 <span class="ucount">'+news.length+'건</span></div>'+
      news.map(function(r){ return reqTop(r, true); }).join('');
  }
  function renderAll(){ renderStats(); renderUrgent(); renderCandidates(); renderRecent(); renderInbox(); renderReviews(); renderSettle(); renderProSupport(); }
  /* 요청 클릭 → 견적서 페이지로 이동(사이드 드로어 대신) */
  function goQuote(i){ location.href='pro-quote.html?req='+i+'&from='+curPanel(); }

  /* ===== 가입 프로필을 포털 화면에 반영 ===== */
  function setText(id, v){ var el=document.getElementById(id); if(el&&v!=null) el.textContent=v; }
  function applyProfile(){
    if(!PROFILE) return;   // 가입 전(데모 기본값 유지)
    setText('hdrName', PROFILE.name);
    setText('sideName', PROFILE.name);
    setText('pfName', PROFILE.name);
    setText('dashHello', '안녕하세요, '+PROFILE.name+'님');
    var bioTxt = PROFILE.bio || PROFILE.tagline || '';   // 소개 = bio(구 tagline 폴백)
    if(bioTxt){ var bioEl=document.getElementById('pfBio'); if(bioEl) bioEl.textContent=bioTxt; }
  }
  /* 프로필 사진: 저장된 게 있으면 그걸, 없으면 기본 SVG 캐릭터 */
  function renderAvatar(){
    var src=(PROFILE&&PROFILE.avatar)||DEFAULT_AVATAR;
    var h=document.getElementById('hdrAvatar'), sd=document.getElementById('sideAvatar');
    if(h){ h.src=src; h.style.visibility='visible'; }
    if(sd){ sd.src=src; sd.style.visibility='visible'; }
  }
  /* 서비스·가격을 카테고리별 카드 행으로 (가입 전이면 데모 기본값 사용) */
  function svcIcon(t){ return svcSvg(t); }
  function svcDesc(t){ return t==='online'?'비대면 온라인 스타일링':(t==='shopping'?'매장 동행 쇼핑':(t==='image'?'이미지 컨설팅':(t==='visit'?'직접 만나서 코디':'맞춤 서비스'))); }
  function renderServices(){
    var base = PROFILE || DEFAULT_PROFILE;
    var svc = base.services || [];
    var el = document.getElementById('pfServices'); if(!el) return;
    el.innerHTML = svc.map(function(s){
      var sub = (s.regions&&s.regions.length) ? s.regions.join(', ') : svcDesc(s.type);
      return '<div class="svcrow"><span class="ic">'+svcIcon(s.type)+'</span>'+
        '<span class="nm"><b>'+s.label+'</b><small>'+sub+'</small></span>'+
        '<span class="pr">'+(s.price||0).toLocaleString()+'<small>원</small></span></div>';
    }).join('');
    if(svc[0]) setText('sideRole', svc[0].label);
  }
  /* 전문 분야·스타일을 보기 화면에 (가입 전이면 데모값) */
  function renderTagsView(){
    var base=PROFILE||DEFAULT_PROFILE;
    var pf=document.getElementById('pfFields'), ps=document.getElementById('pfStyles');
    var dash='<span style="color:var(--sub2)">—</span>';
    if(pf) pf.innerHTML=(base.occ||base.fields||[]).map(function(c){ return '<span class="tag">'+fieldLabel(c)+'</span>'; }).join('') || dash;
    if(ps) ps.innerHTML=(base.tags||base.styles||[]).map(function(t){ return '<span class="tag">'+t+'</span>'; }).join('') || dash;
  }
  /* 프로필 사진 확대 */
  function openAvatar(){
    var src=(PROFILE&&PROFILE.avatar)||DEFAULT_AVATAR;
    document.getElementById('avLightboxImg').src=src;
    document.getElementById('avLightbox').classList.add('on');
  }
  function closeAvatar(){ document.getElementById('avLightbox').classList.remove('on'); }
  function specText(p){ var a=[]; if(p.height) a.push(p.height+'cm'); if(p.weight) a.push(p.weight+'kg'); return a.join(' '); }
  function renderPortfolio(){
    var base = PROFILE || DEFAULT_PROFILE;
    var list = (base.portfolio && base.portfolio.length) ? base.portfolio : DEMO_PORTFOLIO;
    document.getElementById('pgal').innerHTML = list.map(function(p){ p=normPhoto(p);
      var s=specText(p);
      return '<div style="background-image:url(\''+p.src+'\')">'+(s?'<span class="pspec">'+s+'</span>':'')+'</div>'; }).join('');
  }

  /* ===== 프로필 편집 ===== */
  /* 스타일리스트 찾기(index.js)와 동일한 SVG 캐릭터 아바타 — 기본 프로필 사진 */
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
  var DEFAULT_AVATAR=suitPhoto(0);
  var edFields=[], edStyles=[], edPhotos=[], edAvatar=DEFAULT_AVATAR;
  var edSvcRegions={};   // 대면 서비스별 활동지역 { shopping:[], image:[] }
  function normPhoto(p){ return typeof p==='string' ? {src:p, height:null, weight:null} : {src:p.src, height:p.height||null, weight:p.weight||null}; }
  function findSvc(profile,type){ return (profile.services||[]).filter(function(s){return s.type===type;})[0]; }
  /* 편집 폼의 서비스 유형 3종 (id ↔ type ↔ 라벨 ↔ 기본가 · regions=활동지역 있는 대면 서비스) */
  var ED_SERVICES = [
    {type:'online',   label:'온라인 스타일링', mode:'비대면', row:'edSvcOnline',   on:'edOnlineOn',   price:'edOnlinePrice',   def:35000,  regions:false},
    {type:'shopping', label:'동행 쇼핑',       mode:'대면',   row:'edSvcShopping', on:'edShoppingOn', price:'edShoppingPrice', def:120000, regions:true},
    {type:'image',    label:'이미지 컨설팅',   mode:'대면',   row:'edSvcImaging',  on:'edImagingOn',  price:'edImagingPrice',  def:90000,  regions:true}
  ];

  function editProfile(){
    var base = PROFILE || DEFAULT_PROFILE;
    edAvatar = base.avatar || DEFAULT_AVATAR;
    var ap=document.getElementById('edAvatarPreview'); if(ap){ ap.src=edAvatar; ap.style.visibility='visible'; }
    document.getElementById('edName').value = base.name||'';
    edSvcRegions={};
    ED_SERVICES.forEach(function(sv){
      var found=findSvc(base, sv.type);
      document.getElementById(sv.on).checked = !!found;
      document.getElementById(sv.price).value = found?found.price:sv.def;
      if(sv.regions){
        // 서비스에 저장된 regions 우선, 없으면 옛 프로필의 공통 regions(동행쇼핑에만) 이관
        edSvcRegions[sv.type] = (found&&found.regions) ? found.regions.slice() : (sv.type==='shopping' ? (base.regions||[]).slice() : []);
      }
    });
    document.getElementById('edTagline').value = base.bio || base.tagline || '';   // 소개 = bio(구 tagline 폴백)
    // 전문분야: occ(코드) 우선, 없으면 옛 fields(라벨)→코드 이관
    edFields = base.occ ? base.occ.slice() : (base.fields||[]).map(function(l){ for(var i=0;i<FIELD_OPTS.length;i++) if(FIELD_OPTS[i].label===l) return FIELD_OPTS[i].code; return null; }).filter(Boolean);
    edStyles = (base.tags||base.styles||base.specialties||[]).filter(function(t){return STYLE_PRESETS.indexOf(t)>=0;}).slice(0,3);
    edPhotos = (base.portfolio||[]).map(normPhoto);
    edRenderFields(); edRenderStyles(); edRenderPhotos(); edToggleSvc();
    ED_SERVICES.forEach(function(sv){ if(sv.regions) edRenderRegions(sv.type); });
    document.getElementById('profileView').style.display='none';
    document.getElementById('profileEdit').style.display='block';
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function cancelEdit(){
    document.getElementById('profileEdit').style.display='none';
    document.getElementById('profileView').style.display='block';
  }
  function edToggleSvc(){
    ED_SERVICES.forEach(function(sv){
      var on=document.getElementById(sv.on).checked;
      document.getElementById(sv.row).classList.toggle('off', !on);
      document.getElementById(sv.price).disabled=!on;
      if(sv.regions){ var blk=document.getElementById('edRegBlock_'+sv.type); if(blk) blk.style.display=on?'block':'none'; }
    });
  }
  function edCollectServices(){
    var s=[];
    ED_SERVICES.forEach(function(sv){
      if(document.getElementById(sv.on).checked){
        var item={type:sv.type, label:sv.label, mode:sv.mode, price:parseInt(document.getElementById(sv.price).value,10)||0};
        if(sv.regions) item.regions=(edSvcRegions[sv.type]||[]).slice();
        s.push(item);
      }
    });
    return s;
  }
  function saveProfile(){
    var name=document.getElementById('edName').value.trim();
    var svc=edCollectServices();
    if(!name){ toast('활동명을 입력해주세요'); return; }
    if(!svc.length){ toast('서비스 유형을 최소 1개 켜주세요'); return; }
    if(!svc.every(function(s){return s.price>0;})){ toast('켠 유형의 가격을 확인해주세요'); return; }
    var next = PROFILE || {};
    next.registered = true;
    next.avatar = edAvatar;
    next.name = name;
    delete next.height; delete next.weight;   // 스타일리스트 본인 신체정보 제거(계약 미포함)
    next.services = svc;                                           // 활동지역은 services[].regions 안에 포함
    next.bio = document.getElementById('edTagline').value.trim();  // 소개 = bio 하나로 통일(경력소개 제거)
    delete next.tagline; delete next.regions;                      // 구 필드 정리
    next.occ = edFields.slice();   // 전문분야=상황(코드) → 스타일리스트찾기 occ[]
    next.tags = edStyles.slice();  // 스타일 태그 → 스타일리스트찾기 tags[]
    delete next.fields; delete next.styles; delete next.specialties;
    next.portfolio = edPhotos.slice();
    PROFILE = next; MY_PRICE = svc[0].price;
    saveLS('pro.profile', next);
    applyProfile(); renderAvatar(); renderServices(); renderTagsView(); renderPortfolio();
    cancelEdit();
    toast('프로필을 저장했어요');
  }

  /* 편집: 전문 분야 / 전문 스타일 — 각 최대 3개, 직접추가 없음 */
  function edRenderFields(){   // 코드로 저장, 라벨로 표시
    var el=document.getElementById('edFields'); if(!el) return;
    var cnt=document.getElementById('edFieldCnt'); if(cnt) cnt.textContent=edFields.length+'/3';
    el.innerHTML = FIELD_OPTS.map(function(o){ var on=edFields.indexOf(o.code)>=0;
      return '<span class="tag'+(on?' on':'')+'" onclick="edToggleField(\''+o.code+'\')">'+o.label+'</span>'; }).join('');
  }
  function edRenderStyles(){
    var el=document.getElementById('edStyles'); if(!el) return;
    var cnt=document.getElementById('edStyleCnt'); if(cnt) cnt.textContent=edStyles.length+'/3';
    el.innerHTML = STYLE_PRESETS.map(function(t){ var on=edStyles.indexOf(t)>=0;
      return '<span class="tag'+(on?' on':'')+'" onclick="edToggleStyle(\''+t+'\')">'+t+'</span>'; }).join('');
  }
  function edToggleField(c){ var i=edFields.indexOf(c); if(i>=0) edFields.splice(i,1); else { if(edFields.length>=3){ toast('전문 분야는 최대 3개까지예요'); return; } edFields.push(c); } edRenderFields(); }
  function edToggleStyle(t){ var i=edStyles.indexOf(t); if(i>=0) edStyles.splice(i,1); else { if(edStyles.length>=3){ toast('전문 스타일은 최대 3개까지예요'); return; } edStyles.push(t); } edRenderStyles(); }

  /* 편집: 서비스별 활동 지역(대면) — type별로 관리 */
  function edRenderRegions(type){
    var el=document.getElementById('edRegTags_'+type); if(!el) return;
    var sel=edSvcRegions[type]||(edSvcRegions[type]=[]);
    var all=REGION_PRESETS.slice(); sel.forEach(function(t){ if(all.indexOf(t)<0) all.push(t); });
    el.innerHTML = all.map(function(t){ var on=sel.indexOf(t)>=0;
      return '<span class="tag'+(on?' on':'')+'" onclick="edToggleRegion(\''+type+'\',\''+t.replace(/'/g,'')+'\')">'+t+'</span>';
    }).join('');
  }
  function edToggleRegion(type,t){ var a=edSvcRegions[type]||(edSvcRegions[type]=[]); var i=a.indexOf(t); if(i>=0)a.splice(i,1); else a.push(t); edRenderRegions(type); }
  function edAddRegion(type){ var el=document.getElementById('edRegInput_'+type), v=el.value.trim(); if(!v) return;
    var a=edSvcRegions[type]||(edSvcRegions[type]=[]); if(a.indexOf(v)<0) a.push(v); el.value=''; edRenderRegions(type); }

  /* 편집: 포트폴리오 */
  function edRenderPhotos(){
    var rows=edPhotos.map(function(p,i){
      return '<div class="eprow">'+
        '<div class="epthumb" style="background-image:url(\''+p.src+'\')"></div>'+
        '<div class="epfields">'+
          '<div class="eprowf"><input type="number" class="epin" placeholder="키" value="'+(p.height||'')+'" oninput="edSetSpec('+i+',\'height\',this.value)"><span class="won">cm</span></div>'+
          '<div class="eprowf"><input type="number" class="epin" placeholder="몸무게" value="'+(p.weight||'')+'" oninput="edSetSpec('+i+',\'weight\',this.value)"><span class="won">kg</span></div>'+
        '</div>'+
        '<button class="epdel" onclick="edDelPhoto('+i+')">✕</button>'+
      '</div>';
    });
    if(edPhotos.length<8) rows.push('<button class="epadd" onclick="document.getElementById(\'edFile\').click()">＋ 사진 추가</button>');
    document.getElementById('edPgal').innerHTML=rows.join('');
  }
  function edOnFiles(ev){
    var files=ev.target.files||[]; var room=8-edPhotos.length;
    var list=Array.prototype.slice.call(files,0,room);
    list.forEach(function(f){ if(!/^image\//.test(f.type)){ toast('이미지만 올릴 수 있어요'); return; }
      var r=new FileReader(); r.onload=function(){ edPhotos.push({src:r.result, height:null, weight:null}); edRenderPhotos(); }; r.readAsDataURL(f); });
    ev.target.value='';
  }
  function edDelPhoto(i){ edPhotos.splice(i,1); edRenderPhotos(); }
  /* 사진별 착용 모델 키·몸무게 입력(값만 갱신, 재렌더 없이 포커스 유지) */
  function edSetSpec(i,key,val){ edPhotos[i][key] = parseInt(val,10) || null; }

  /* 편집: 프로필 사진(아바타) */
  function edOnAvatar(ev){
    var f=(ev.target.files||[])[0]; if(!f) return;
    if(!/^image\//.test(f.type)){ toast('이미지만 올릴 수 있어요'); return; }
    var r=new FileReader(); r.onload=function(){ edAvatar=r.result; var ap=document.getElementById('edAvatarPreview'); ap.src=edAvatar; ap.style.visibility='visible'; };
    r.readAsDataURL(f); ev.target.value='';
  }
  function edRemoveAvatar(){ edAvatar=DEFAULT_AVATAR; var ap=document.getElementById('edAvatarPreview'); ap.src=edAvatar; ap.style.visibility='visible'; }

  applyProfile();
  renderAvatar();
  renderServices();
  renderTagsView();
  renderPortfolio();
  renderAll();
  /* 견적서(pro-quote) 사이드 내비에서 ?panel=inbox 등으로 돌아올 때 해당 패널 열기 */
  var _pp=new URLSearchParams(location.search).get('panel'); if(_pp) goPanel(_pp);
