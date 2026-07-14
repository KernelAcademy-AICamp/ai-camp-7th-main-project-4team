/* admin-members.js — 3.B 회원·거래 운영(회원 3.B.2 · 전문가 심사 3.B.1).
   화면 우선: 실회원 저장소 전이라 샘플 렌더. 상태 변경은 비영속(프로토타입).
   회원 레코드 계약: { id, joinedAt, lastDiagAt, diagCount, gender, bodyType, anchorBrands, status }
   전문가 레코드 계약: { id, appliedAt, nick, region, basis, status } */
(function(){
  "use strict";
  var $=function(id){return document.getElementById(id);};
  var esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};
  var GENLBL={female:'여성',male:'남성'};
  function pct(n,d){return d?Math.round(n/d*100):0;}
  function kpi(n,l,s){return '<div class="kpi"><div class="n">'+n+'</div><div class="l">'+l+'</div>'+(s?'<div class="s">'+s+'</div>':'')+'</div>';}
  function d(s){return esc((s||'').replace('T',' ').slice(0,16));}

  window.__mtab=function(t){
    ['members','pros','signals','disputes','monitor','cs'].forEach(function(k){
      var p=$('panel-'+k); if(p) p.classList.toggle('on',k===t);
    });
    Array.prototype.forEach.call(document.querySelectorAll('#atabs .t'),function(el){
      el.classList.toggle('on', el.getAttribute('data-tab')===t);
    });
    if(t==='signals') renderSignals();
    if(t==='disputes') renderDisputes();
    if(t==='monitor') renderMonitor();
    if(t==='cs') renderCS();
  };

  // ── 샘플 ─────────────────────────────────────────────
  var MEMBERS=[
    {id:'m1042',joinedAt:'2026-06-28T10:12:00',lastDiagAt:'2026-07-12T21:14:00',diagCount:4,gender:'female',bodyType:'C',anchorBrands:3,status:'활성'},
    {id:'m1041',joinedAt:'2026-06-30T09:03:00',lastDiagAt:'2026-07-12T18:40:00',diagCount:2,gender:'male',  bodyType:'F',anchorBrands:2,status:'활성'},
    {id:'m1039',joinedAt:'2026-07-01T14:20:00',lastDiagAt:'2026-07-11T20:12:00',diagCount:6,gender:'female',bodyType:'B',anchorBrands:4,status:'활성'},
    {id:'m1030',joinedAt:'2026-07-02T11:41:00',lastDiagAt:'2026-07-10T16:05:00',diagCount:1,gender:'female',bodyType:'D',anchorBrands:1,status:'활성'},
    {id:'m1021',joinedAt:'2026-07-03T22:05:00',lastDiagAt:'2026-07-09T13:33:00',diagCount:3,gender:'male',  bodyType:'G',anchorBrands:2,status:'정지'},
    {id:'m1008',joinedAt:'2026-07-05T08:30:00',lastDiagAt:'2026-07-08T19:50:00',diagCount:1,gender:'female',bodyType:'A',anchorBrands:0,status:'활성'},
    {id:'m0997',joinedAt:'2026-07-06T17:22:00',lastDiagAt:'2026-07-07T12:11:00',diagCount:2,gender:'male',  bodyType:'H',anchorBrands:1,status:'차단'}
  ];
  var PROS=[
    {id:'p221',appliedAt:'2026-07-12T09:30:00',nick:'핏잡는언니',region:'서울 성수',basis:'스타일리스트 3년 · 자체 룩북',status:'대기'},
    {id:'p219',appliedAt:'2026-07-11T15:10:00',nick:'무신사덕후',region:'온라인',basis:'리뷰 실적 · 브랜드 착용경험 다수',status:'대기'},
    {id:'p214',appliedAt:'2026-07-10T11:02:00',nick:'대구스타일리스트K',region:'대구 동성로',basis:'편집샵 근무',status:'승인'},
    {id:'p205',appliedAt:'2026-07-08T20:44:00',nick:'사이즈요정',region:'온라인',basis:'자격 근거 불충분',status:'반려'}
  ];

  var MSTATUS={'활성':'color:#1f6a4a;background:var(--green-soft)','정지':'color:#8a6d1f;background:#f5ecd0','차단':'color:#7a1f1f;background:#f5d6d6'};
  var PSTATUS={'대기':'color:#8a6d1f;background:#f5ecd0','승인':'color:#1f6a4a;background:var(--green-soft)','반려':'color:#7a1f1f;background:#f5d6d6'};

  // ── 회원 ─────────────────────────────────────────────
  var mFilter='all';
  function renderMembers(){
    var act=MEMBERS.filter(function(m){return m.status==='활성';}).length;
    var diag=MEMBERS.reduce(function(s,m){return s+m.diagCount;},0);
    $('mKpis').innerHTML=[
      kpi(MEMBERS.length,'회원',''),
      kpi(act,'활성','정지/차단 '+(MEMBERS.length-act)),
      kpi(diag,'누적 진단','1인당 '+(MEMBERS.length?(diag/MEMBERS.length).toFixed(1):0)+'회'),
      kpi(MEMBERS.filter(function(m){return m.diagCount>=2;}).length,'재진단 회원','2회+')
    ].join('');
    $('mFilters').innerHTML=['all','활성','정지','차단'].map(function(s){
      return '<label class="numin"><input type="radio" name="mf" value="'+s+'" '+(mFilter===s?'checked':'')+' onchange="__mf(\''+s+'\')"><span>'+(s==='all'?'전체':s)+'</span></label>';
    }).join('')+'<span class="cnt muted" id="mCnt"></span>';
    drawMembers();
  }
  window.__mf=function(s){ mFilter=s; drawMembers(); };
  function drawMembers(){
    var list=mFilter==='all'?MEMBERS:MEMBERS.filter(function(m){return m.status===mFilter;});
    $('mCnt').textContent=list.length+' 명';
    var rows=list.map(function(m){
      return '<tr><td><b>'+esc(m.id)+'</b></td><td>'+(GENLBL[m.gender]||m.gender)+'</td>'+
        '<td><b>'+esc(m.bodyType)+'</b></td>'+
        '<td class="num">'+m.diagCount+'</td><td class="num">'+m.anchorBrands+'</td>'+
        '<td class="muted">'+d(m.lastDiagAt)+'</td>'+
        '<td><span class="pill" style="'+(MSTATUS[m.status]||'')+'">'+esc(m.status)+'</span></td>'+
        '<td>'+(m.status==='활성'
          ? '<a class="pill" style="cursor:pointer" onclick="__setM(\''+m.id+'\',\'정지\')">정지</a> <a class="pill" style="cursor:pointer" onclick="__setM(\''+m.id+'\',\'차단\')">차단</a>'
          : '<a class="pill" style="color:var(--green);background:var(--green-soft);cursor:pointer" onclick="__setM(\''+m.id+'\',\'활성\')">활성화</a>')+'</td></tr>';
    }).join('');
    $('memberTable').innerHTML='<thead><tr><th>회원ID</th><th>성별</th><th>8유형</th><th>진단</th><th>앵커</th><th>최근 진단</th><th>상태</th><th>조치</th></tr></thead><tbody>'+rows+'</tbody>';
  }
  window.__setM=function(id,st){ var m=MEMBERS.filter(function(x){return x.id===id;})[0]; if(m){m.status=st;} renderMembers(); };

  // ── 전문가 심사 ──────────────────────────────────────
  var pFilter='대기';
  function renderPros(){
    var wait=PROS.filter(function(p){return p.status==='대기';}).length;
    $('pKpis').innerHTML=[
      kpi(PROS.length,'신청',''),
      kpi(wait,'심사 대기','처리 필요'),
      kpi(PROS.filter(function(p){return p.status==='승인';}).length,'승인',''),
      kpi(PROS.filter(function(p){return p.status==='반려';}).length,'반려','')
    ].join('');
    $('pFilters').innerHTML=['대기','all','승인','반려'].map(function(s){
      return '<label class="numin"><input type="radio" name="pf" value="'+s+'" '+(pFilter===s?'checked':'')+' onchange="__pf(\''+s+'\')"><span>'+(s==='all'?'전체':s)+'</span></label>';
    }).join('')+'<span class="cnt muted" id="pCnt"></span>';
    drawPros();
  }
  window.__pf=function(s){ pFilter=s; drawPros(); };
  function drawPros(){
    var list=pFilter==='all'?PROS:PROS.filter(function(p){return p.status===pFilter;});
    $('pCnt').textContent=list.length+' 건';
    var rows=list.map(function(p){
      return '<tr><td><b>'+esc(p.nick)+'</b> <span class="muted">'+esc(p.id)+'</span></td>'+
        '<td>'+esc(p.region)+'</td><td class="muted">'+esc(p.basis)+'</td>'+
        '<td class="muted">'+d(p.appliedAt)+'</td>'+
        '<td><span class="pill" style="'+(PSTATUS[p.status]||'')+'">'+esc(p.status)+'</span></td>'+
        '<td>'+(p.status==='대기'
          ? '<a class="pill" style="color:var(--green);background:var(--green-soft);cursor:pointer" onclick="__setP(\''+p.id+'\',\'승인\')">승인</a> <a class="pill" style="cursor:pointer" onclick="__setP(\''+p.id+'\',\'반려\')">반려</a>'
          : '<a class="pill" style="cursor:pointer" onclick="__setP(\''+p.id+'\',\'대기\')">되돌리기</a>')+'</td></tr>';
    }).join('');
    $('proTable').innerHTML='<thead><tr><th>닉네임</th><th>활동지역</th><th>자격 근거</th><th>신청일</th><th>상태</th><th>조치</th></tr></thead><tbody>'+rows+'</tbody>';
  }
  window.__setP=function(id,st){ var p=PROS.filter(function(x){return x.id===id;})[0]; if(p){p.status=st;} renderPros(); };

  // ── 매칭 수요 신호 (3.B.3) — 페이크도어(fitting.reqs)가 수집하는 신호 ──
  var SVCLBL={online:'온라인 스타일링',shopping:'동행 쇼핑',image:'이미지 컨설팅'};
  var SVCS=['online','shopping','image'];
  // 요청 레코드 계약(index.js addReq와 동일): { open?|nm?|kind:'notify', svc, occ:[상황], budget?|price?, date, status, bids? }
  var REQS_SAMPLE=[
    {open:true, svc:'online', occ:['소개팅·데이트'], budget:'5~10만', date:'2026-07-12', status:'견적중', bids:[1,2,3]},
    {open:true, svc:'shopping', occ:['결혼식 하객'], budget:'10~20만', date:'2026-07-12', status:'견적중', bids:[1,2]},
    {nm:'상민', svc:'shopping', occ:['결혼식 하객'], price:150000, date:'2026-07-11', status:'수락'},
    {open:true, svc:'image', occ:['면접·발표'], budget:'20만+', date:'2026-07-11', status:'완료', bids:[1,2,3,4]},
    {kind:'notify', svc:'image', occ:[], date:'2026-07-11', status:'대기'},
    {open:true, svc:'online', occ:['데일리 스타일링'], budget:'5만 이하', date:'2026-07-10', status:'유찰', bids:[]},
    {nm:'소희', svc:'online', occ:['소개팅·데이트'], price:90000, date:'2026-07-10', status:'거절'},
    {open:true, svc:'shopping', occ:['체형 커버 스타일링'], budget:'10~20만', date:'2026-07-09', status:'견적중', bids:[1]},
    {open:true, svc:'image', occ:['퍼스널 스타일링'], budget:'20만+', date:'2026-07-09', status:'수락', bids:[1,2]},
    {kind:'notify', svc:'shopping', occ:[], date:'2026-07-08', status:'대기'},
    {open:true, svc:'online', occ:['여행'], budget:'5~10만', date:'2026-07-08', status:'견적중', bids:[1,2,3]},
    {nm:'건형', svc:'image', occ:['면접·발표'], price:190000, date:'2026-07-07', status:'진행중'}
  ];
  var sSrc='sample', SIG=[];
  function loadReqs(){ try{ var v=JSON.parse(localStorage.getItem('fitting.reqs')||'[]'); return Array.isArray(v)?v:[]; }catch(e){ return []; } }
  function reqKind(r){ return r.kind==='notify'?'알림':(r.open?'오픈':'지명'); }
  var _sigInit=false;
  function renderSignals(){
    if(!_sigInit){ sSrc = loadReqs().length? 'real':'sample'; _sigInit=true; }
    var rc=loadReqs().length;
    $('sSrcBar').innerHTML=
      '<label class="numin"><input type="radio" name="ssrc" '+(sSrc==='real'?'checked':'')+' onchange="__ssrc(\'real\')"><span>이 브라우저 요청 ('+rc+')</span></label>'+
      '<label class="numin"><input type="radio" name="ssrc" '+(sSrc==='sample'?'checked':'')+' onchange="__ssrc(\'sample\')"><span>샘플 ('+REQS_SAMPLE.length+')</span></label>'+
      '<span class="cnt muted">'+(sSrc==='sample'?'· 샘플 — 화면 확인용':'· 페이크도어 실수집 요청')+'</span>';
    SIG = sSrc==='sample'? REQS_SAMPLE.slice() : loadReqs();
    sigKpis(); sigSvc(); sigOcc(); sigBudget(); sigLog();
  }
  window.__ssrc=function(s){ sSrc=s; renderSignals(); };

  function bar2(p){return '<span class="scorecell"><span class="bar"><span class="s2fill" style="width:'+p+'%"></span></span> '+p+'%</span>';}
  function sigKpis(){
    var n=SIG.length;
    var open=SIG.filter(function(r){return r.open;});
    var notify=SIG.filter(function(r){return r.kind==='notify';}).length;
    var withBids=open.filter(function(r){return (r.bids||[]).length>0;}).length;
    var avgBids=open.length? (open.reduce(function(s,r){return s+((r.bids||[]).length);},0)/open.length).toFixed(1):0;
    $('sKpis').innerHTML=[
      kpi(n,'수요 신호','오픈·지명·알림'),
      kpi(open.length,'오픈 견적','역경매 · 응답률 '+pct(withBids,open.length)+'%'),
      kpi(avgBids,'오픈당 평균 견적','공급 유동성'),
      kpi(notify,'오픈알림 신청','순수 수요(미출시 서비스)')
    ].join('');
  }
  function tally(arr){ var m={}; arr.forEach(function(k){ m[k]=(m[k]||0)+1; }); return m; }
  function sigSvc(){
    var m=tally(SIG.map(function(r){return r.svc;}).filter(Boolean)), n=SIG.length;
    var rows=SVCS.filter(function(s){return m[s];}).sort(function(a,b){return m[b]-m[a];}).map(function(s){
      return '<tr><td><b>'+esc(SVCLBL[s])+'</b></td><td class="num">'+m[s]+'</td><td>'+bar2(pct(m[s],n))+'</td></tr>';
    }).join('');
    $('svcTable').innerHTML='<thead><tr><th>서비스</th><th>요청</th><th>비중</th></tr></thead><tbody>'+(rows||'<tr><td class="muted">없음</td></tr>')+'</tbody>';
  }
  function sigOcc(){
    var occs=[]; SIG.forEach(function(r){ (r.occ||[]).forEach(function(o){ occs.push(o); }); });
    var m=tally(occs), tot=occs.length;
    var keys=Object.keys(m).sort(function(a,b){return m[b]-m[a];});
    var rows=keys.map(function(k){ return '<tr><td><b>'+esc(k)+'</b></td><td class="num">'+m[k]+'</td><td>'+bar2(pct(m[k],tot))+'</td></tr>'; }).join('');
    $('occTable').innerHTML='<thead><tr><th>상황</th><th>요청</th><th>비중</th></tr></thead><tbody>'+(rows||'<tr><td class="muted">상황 정보 없음(알림 신청만)</td></tr>')+'</tbody>';
  }
  var BUDGET_ORDER=['5만 이하','5~10만','10~20만','20만+'];
  function sigBudget(){
    var open=SIG.filter(function(r){return r.open&&r.budget;});
    var m=tally(open.map(function(r){return r.budget;})), tot=open.length;
    var keys=BUDGET_ORDER.filter(function(b){return m[b];}).concat(Object.keys(m).filter(function(k){return BUDGET_ORDER.indexOf(k)<0;}));
    var rows=keys.map(function(k){ return '<tr><td><b>'+esc(k)+'</b></td><td class="num">'+m[k]+'</td><td>'+bar2(pct(m[k],tot))+'</td></tr>'; }).join('');
    $('budgetTable').innerHTML='<thead><tr><th>예산대</th><th>오픈 견적</th><th>비중</th></tr></thead><tbody>'+(rows||'<tr><td class="muted">오픈 견적 없음</td></tr>')+'</tbody>';
  }
  var KBADGE={'오픈':'color:#1f6a4a;background:var(--green-soft)','지명':'color:#3a5a8a;background:#dde6f5','알림':'color:#8a6d1f;background:#f5ecd0'};
  function sigLog(){
    var list=SIG.slice().sort(function(a,b){return (b.date||'').localeCompare(a.date||'');});
    var rows=list.map(function(r){
      var amt=r.budget?esc(r.budget):(r.price?(r.price/10000)+'만':'<span class="muted">—</span>');
      var occ=(r.occ||[]).join(', ')||'<span class="muted">—</span>';
      var k=reqKind(r);
      return '<tr><td class="muted">'+esc(r.date||'')+'</td>'+
        '<td><span class="pill" style="'+(KBADGE[k]||'')+'">'+k+'</span></td>'+
        '<td>'+esc(SVCLBL[r.svc]||r.svc||'')+'</td><td>'+occ+'</td><td class="num">'+amt+'</td>'+
        '<td class="num">'+(r.open?((r.bids||[]).length):'<span class="muted">·</span>')+'</td>'+
        '<td class="muted">'+esc(r.status||'')+'</td></tr>';
    }).join('');
    $('reqTable').innerHTML='<thead><tr><th>날짜</th><th>유형</th><th>서비스</th><th>상황</th><th>예산/가격</th><th>견적수</th><th>상태</th></tr></thead><tbody>'+(rows||'<tr><td class="muted">요청 없음</td></tr>')+'</tbody>';
  }

  // ── 분쟁·환불·신고 (3.B.4) — 에스크로 중재 큐 + 상세 중재(신고·소명 확인 후 판정) ──
  function loadProReqs(){ try{ var v=JSON.parse(localStorage.getItem('fitting.pro.reqs')||'[]'); return Array.isArray(v)?v:[]; }catch(e){ return []; } }
  function loadReports(){ try{ var v=JSON.parse(localStorage.getItem('fitting.reports')||'[]'); return Array.isArray(v)?v:[]; }catch(e){ return []; } }
  function saveReqs(a){ try{ localStorage.setItem('fitting.reqs',JSON.stringify(a)); }catch(e){} }
  function saveProReqs(a){ try{ localStorage.setItem('fitting.pro.reqs',JSON.stringify(a)); }catch(e){} }
  function admToast(m){ var el=$('admToast'); if(!el){ el=document.createElement('div'); el.id='admToast'; el.style.cssText='position:fixed;left:50%;bottom:32px;transform:translateX(-50%);background:var(--ink,#1c1a17);color:#fff;padding:11px 18px;border-radius:10px;font-size:14px;font-weight:700;z-index:400;opacity:0;transition:opacity .2s;pointer-events:none'; document.body.appendChild(el); } el.textContent=m; el.style.opacity='1'; clearTimeout(window._at); window._at=setTimeout(function(){ el.style.opacity='0'; },1900); }
  var DISPUTE_SAMPLE=[
    {id:'#1024', cust:'지민', shopper:'소희', reason:'미이행', detail:'약속한 날짜에 결과물을 받지 못했어요', reply:null, evidence:true, amount:90000, state:'중재 대기'},
    {id:'#1019', cust:'수현', shopper:'건형', reason:'품질 불만', detail:'추천받은 코디가 요청 무드와 많이 달랐어요', reply:'요청하신 3안 모두 전달드렸고 수정 요청도 반영했습니다', evidence:false, amount:120000, state:'소명 완료'}
  ];
  var REPORT_SAMPLE=[
    {id:'#N301', target:'회원 m0997', type:'부적절 언행', state:'검토 대기'},
    {id:'#N298', target:'스타일리스트 p205', type:'노쇼 신고', state:'제재 검토'}
  ];
  var DSTAG={'중재 대기':'color:#8a6d1f;background:#f5ecd0','소명 완료':'color:#3a5a8a;background:#dde6f5','환불':'color:#7a1f1f;background:#f5d6d6','기각':'color:#1f6a4a;background:var(--green-soft)'};
  function dtag(s){ return '<span class="pill" style="'+(DSTAG[s]||'')+'">'+esc(s)+'</span>'; }
  var _disputes=[], _curDisp=null;
  function collectDisputes(){
    var out=[];
    loadReqs().forEach(function(r,i){ if(r.status==='분쟁'&&r.dispute){ out.push({src:'reqs',idx:i,id:'#R'+(1000+i),cust:'고객(나)',shopper:r.nm||'스타일리스트',reason:r.dispute.reason||'기타',detail:r.dispute.detail||'',reply:null,evidence:false,amount:(r.awarded&&r.awarded.price)||r.price||0,state:'중재 대기',live:true}); } });
    loadProReqs().forEach(function(r,i){ if(r.status==='분쟁'&&r.dispute){ out.push({src:'pro',idx:i,id:'#P'+(1000+i),cust:r.cust||'고객',shopper:'소희',reason:r.dispute.reason||'기타',detail:r.dispute.detail||'',reply:r.dispute.reply||null,evidence:false,amount:(r.offer&&r.offer.price)||0,state:r.dispute.reply?'소명 완료':'중재 대기',live:true}); } });
    return out;
  }
  function renderDisputes(){
    _disputes = collectDisputes().concat(DISPUTE_SAMPLE);
    var pending=_disputes.filter(function(d){return d.state==='중재 대기';}).length;
    var _reports=loadReports();
    $('dKpis').innerHTML=[kpi(pending,'분쟁 대기','중재 필요'),kpi(_disputes.length,'환불 요청',''),kpi(_reports.length+REPORT_SAMPLE.length,'신고','어뷰징·노쇼'),kpi('1.8일','평균 처리','')].join('');
    var rows=_disputes.map(function(d,i){
      return '<tr><td>'+esc(d.id)+'</td><td>'+esc(d.cust)+' ↔ '+esc(d.shopper)+' 스타일리스트</td><td>'+esc(d.reason)+'</td><td class="num">'+d.amount.toLocaleString()+' <span class="muted">보관</span></td><td>'+dtag(d.state)+'</td><td><a class="pill" style="cursor:pointer" onclick="__dispOpen('+i+')">중재 →</a></td></tr>';
    }).join('');
    $('disputeTable').innerHTML='<thead><tr><th>거래</th><th>당사자</th><th>유형</th><th>에스크로</th><th>상태</th><th>조치</th></tr></thead><tbody>'+(rows||'<tr><td class="muted" colspan="6">분쟁 없음 — 진행중 거래에서 문제 신고 시 여기로</td></tr>')+'</tbody>';
    // 라이브 신고(공유 fitting.reports — 전문가/고객 양방향) + 정적 샘플
    var liveRep=_reports.map(function(r,i){
      var by=(r.by==='pro')?'스타일리스트':'고객';
      var who=esc(r.target||'—')+' <span class="muted">'+esc(r.targetRole||'')+'</span>';
      var act=(r.state==='처리완료')?'<span class="muted">완료</span>':'<a class="pill" style="cursor:pointer" onclick="__reportAct('+i+')">제재 검토 →</a>';
      return '<tr><td>'+esc(r.id||('#'+i))+' <span class="muted">'+by+' 신고</span></td><td>'+who+'</td><td>'+esc(r.type||'—')+(r.detail?'<br><span class="muted" style="font-size:12px">'+esc(String(r.detail).slice(0,40))+'</span>':'')+'</td><td>'+dtag(r.state==='접수'?'검토 대기':r.state)+'</td><td>'+act+'</td></tr>';
    }).join('');
    var rr=liveRep+REPORT_SAMPLE.map(function(r){ return '<tr><td>'+esc(r.id)+'</td><td>'+esc(r.target)+'</td><td>'+esc(r.type)+'</td><td>'+dtag(r.state)+'</td><td><span class="muted">샘플</span></td></tr>'; }).join('');
    $('reportTable').innerHTML='<thead><tr><th>신고</th><th>대상</th><th>유형</th><th>상태</th><th>조치</th></tr></thead><tbody>'+rr+'</tbody>';
  }
  /* 상세 중재 모달 — 신고 내용·증빙·스타일리스트 소명 확인 후 판정 */
  function ensureAdmStyle(){ if($('admDispStyle')) return; var s=document.createElement('style'); s.id='admDispStyle';
    s.textContent='.adm-modal{position:fixed;inset:0;z-index:300;display:flex;align-items:center;justify-content:center}'+
      '.adm-bd{position:absolute;inset:0;background:rgba(20,18,16,.5)}'+
      '.adm-pan{position:relative;background:#fff;border-radius:16px;width:min(540px,94vw);max-height:88vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.3)}'+
      '.adm-h{display:flex;align-items:center;justify-content:space-between;padding:15px 20px;border-bottom:1px solid var(--line,#eae7e1)}.adm-h b{font-size:16px;font-weight:800}'+
      '.adm-x{background:none;border:none;font-size:20px;line-height:1;cursor:pointer;color:var(--sub,#888)}'+
      '.adm-b{padding:16px 20px;overflow-y:auto}.adm-f{padding:13px 20px;border-top:1px solid var(--line,#eae7e1);display:flex;gap:8px;flex-wrap:wrap;align-items:center}'+
      '.adm-sec{font-size:11.5px;font-weight:800;color:var(--sub,#888);margin:16px 0 7px;letter-spacing:.03em}.adm-b .adm-sec:first-child{margin-top:0}'+
      '.adm-kv{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--line,#eae7e1);font-size:14px}'+
      '.adm-quote{background:var(--soft,#f5f3ee);border-radius:10px;padding:12px 14px;font-size:14px;line-height:1.6;margin-top:2px}';
    document.head.appendChild(s); }
  function mbtn(label,action,kind){
    var s='padding:9px 15px;border-radius:9px;font-size:13.5px;font-weight:800;cursor:pointer;border:1px solid var(--line,#e0ddd6)';
    s += kind==='warn' ? ';background:var(--warn,#c0392b);color:#fff;border-color:var(--warn,#c0392b)'
       : kind==='primary' ? ';background:var(--green,#2E4A3B);color:#fff;border-color:var(--green,#2E4A3B)'
       : ';background:#fff;color:var(--ink,#1c1a17)';
    return '<button onclick="__dispAct(\''+action+'\')" style="'+s+'">'+label+'</button>';
  }
  function renderDispModal(){ var d=_curDisp, m=$('dispModal'); if(!m||!d) return;
    var body='<div class="adm-sec">대상 거래</div>'+
      '<div class="adm-kv"><span>거래</span><b>'+esc(d.id)+'</b></div>'+
      '<div class="adm-kv"><span>당사자</span><b>'+esc(d.cust)+' ↔ '+esc(d.shopper)+' 스타일리스트</b></div>'+
      '<div class="adm-kv"><span>에스크로 보관금</span><b class="num">'+d.amount.toLocaleString()+'원</b></div>'+
      '<div class="adm-sec">고객 신고 · '+esc(d.reason)+'</div>'+
      '<div class="adm-quote">"'+esc(d.detail||'상세 없음')+'"'+(d.evidence?'<div style="margin-top:6px;color:var(--sub,#777);font-size:12.5px">📎 증빙(대화·스크린샷) 첨부됨</div>':'')+'</div>'+
      '<div class="adm-sec">스타일리스트 소명</div>'+
      (d.reply ? '<div class="adm-quote">"'+esc(d.reply)+'"</div>' : '<div class="adm-quote" style="color:var(--sub,#777)">아직 소명이 제출되지 않았어요 · 소명 요청 가능</div>');
    var foot = d.live
      ? mbtn('전액 환불','refund','warn')+mbtn('부분 환불','partial','plain')+mbtn('기각','reject','primary')+(d.reply?'':mbtn('소명 요청','reqReply','plain'))
      : '<span class="muted" style="align-self:center">샘플 — 조치 데모 없음</span>';
    m.innerHTML='<div class="adm-bd" onclick="__dispClose()"></div><div class="adm-pan">'+
      '<div class="adm-h"><b>분쟁 중재 · '+esc(d.id)+'</b><button class="adm-x" onclick="__dispClose()">✕</button></div>'+
      '<div class="adm-b">'+body+'</div>'+
      '<div class="adm-f">'+foot+'<button onclick="__dispClose()" style="margin-left:auto;background:none;border:none;color:var(--sub,#777);font-weight:700;cursor:pointer">닫기</button></div></div>';
  }
  window.__dispOpen=function(i){ _curDisp=_disputes[i]; if(!_curDisp) return; ensureAdmStyle(); var m=$('dispModal'); if(!m){ m=document.createElement('div'); m.id='dispModal'; m.className='adm-modal'; document.body.appendChild(m); } renderDispModal(); m.style.display='flex'; };
  window.__dispClose=function(){ var m=$('dispModal'); if(m) m.style.display='none'; };
  window.__dispAct=function(action){ var d=_curDisp; if(!d||!d.live){ __dispClose(); return; }
    if(action==='reqReply'){ admToast('스타일리스트에게 소명을 요청했어요'); __dispClose(); return; }
    var refund=(action==='refund'||action==='partial');
    if(d.src==='reqs'){ var a=loadReqs(); if(a[d.idx]) a[d.idx].status=(refund?'환불':'진행중'); saveReqs(a); }
    else if(d.src==='pro'){ var p=loadProReqs(); if(p[d.idx]) p[d.idx].status=(refund?'완료':'수락됨'); saveProReqs(p); }
    admToast(action==='refund'?'전액 환불로 종결했어요':action==='partial'?'부분 환불로 종결했어요':'분쟁을 기각했어요');
    __dispClose(); renderDisputes();
  };

  // ── 매칭 모니터링 · 정산 집행 · 리뷰 모더레이션 (3.B.5·6) ──
  function mtag(s){ var C={'정산 대기':'color:#8a6d1f;background:#f5ecd0','정산 완료':'color:#1f6a4a;background:var(--green-soft)','정상':'color:#1f6a4a;background:var(--green-soft)','신고 접수':'color:#7a1f1f;background:#f5d6d6','유찰 위험':'color:#8a6d1f;background:#f5ecd0','미응답':'color:#8a6d1f;background:#f5ecd0'}; return '<span class="pill" style="'+(C[s]||'')+'">'+esc(s)+'</span>'; }
  var MON_SAMPLE=[
    {id:'#1031', kind:'오픈 견적중 · 입찰 0', elapsed:'36h 경과', flag:'유찰 위험', act:'유찰 구제', key:'rescue'},
    {id:'#1028', kind:'지명 대기 · 미응답', elapsed:'28h 경과', flag:'미응답', act:'리마인드', key:'remind'}
  ];
  var SETTLE_SAMPLE=[{id:'#1020', who:'소희', amt:90000}];
  var REVIEW_SAMPLE=[{who:'익명 요청', rating:1, text:'후기에 욕설·비방 포함 (신고 접수)', flagged:true}];
  function renderMonitor(){
    // 1) 매칭 모니터링·개입 — 진행 중 매칭 + 미응답/유찰 개입
    var active=loadReqs().filter(function(r){ return ['견적중','대기','결제대기','진행중'].indexOf(r.status)>=0; });
    var m1=active.map(function(r){
      var flag = (r.status==='견적중'&&!(r.bids||[]).length)?'유찰 위험':(r.status==='대기'?'미응답':'정상');
      var act = flag==='유찰 위험'?'<a class="pill" style="cursor:pointer" onclick="__mon(\'rescue\')">유찰 구제</a>':(flag==='미응답'?'<a class="pill" style="cursor:pointer" onclick="__mon(\'remind\')">리마인드</a>':'<span class="muted">·</span>');
      return '<tr><td>'+esc((r.open?'오픈 견적':(r.nm||'지명'))+' · '+r.status)+'</td><td class="muted">'+esc(r.date||'')+'</td><td>'+mtag(flag)+'</td><td>'+act+'</td></tr>';
    });
    var m2=MON_SAMPLE.map(function(m){ return '<tr><td>'+esc(m.id+' · '+m.kind)+'</td><td class="muted">'+esc(m.elapsed)+'</td><td>'+mtag(m.flag)+'</td><td><a class="pill" style="cursor:pointer" onclick="__mon(\''+m.key+'\')">'+esc(m.act)+'</a></td></tr>'; });
    $('matchTable').innerHTML='<thead><tr><th>거래</th><th>일자/경과</th><th>플래그</th><th>개입</th></tr></thead><tbody>'+(m1.concat(m2).join('')||'<tr><td class="muted" colspan="4">진행 중 매칭 없음</td></tr>')+'</tbody>';
    // 2) 정산 집행 — 완료 거래 에스크로 릴리스
    var done=loadReqs().filter(function(r){ return (r.status==='완료'||r.status==='후기완료') && !r._settled; });
    var s1=done.map(function(r){ var amt=(r.awarded&&r.awarded.price)||r.price||0; return '<tr><td>'+esc((r.nm||'거래')+' 스타일리스트')+'</td><td class="num">'+amt.toLocaleString()+'원</td><td>'+mtag('정산 대기')+'</td><td><a class="pill" style="color:var(--green);background:var(--green-soft);cursor:pointer" onclick="__mon(\'settle\')">정산 집행</a></td></tr>'; });
    var s2=SETTLE_SAMPLE.map(function(x){ return '<tr><td>'+esc(x.id+' · '+x.who+' 스타일리스트')+'</td><td class="num">'+x.amt.toLocaleString()+'원</td><td>'+mtag('정산 대기')+'</td><td><a class="pill" style="color:var(--green);background:var(--green-soft);cursor:pointer" onclick="__mon(\'settle\')">정산 집행</a></td></tr>'; });
    $('settleTable').innerHTML='<thead><tr><th>거래(스타일리스트)</th><th>금액</th><th>상태</th><th>조치</th></tr></thead><tbody>'+(s1.concat(s2).join('')||'<tr><td class="muted" colspan="4">정산 대상 없음</td></tr>')+'</tbody>';
    // 3) 리뷰 모더레이션 — 신고·부적절 후기
    var revs=loadReqs().filter(function(r){ return r.status==='후기완료'&&r.review; }).map(function(r){ return {who:(r.nm||'')+' 스타일리스트', rating:r.review.rating||5, text:r.review.text||'', flagged:false}; });
    var rr=revs.concat(REVIEW_SAMPLE).map(function(v){
      return '<tr><td>'+esc(v.who)+'</td><td style="color:#e8a13a">'+('★'.repeat(v.rating)||'—')+'</td><td>'+esc((v.text||'').slice(0,34))+'</td><td>'+mtag(v.flagged?'신고 접수':'정상')+'</td><td>'+(v.flagged?'<a class="pill" style="color:#7a1f1f;background:#f5d6d6;cursor:pointer" onclick="__mon(\'hide\')">숨김</a>':'<span class="muted">·</span>')+'</td></tr>';
    }).join('');
    $('reviewTable').innerHTML='<thead><tr><th>대상</th><th>별점</th><th>후기</th><th>상태</th><th>조치</th></tr></thead><tbody>'+rr+'</tbody>';
  }
  window.__mon=function(action){ var M={remind:'미응답 스타일리스트에게 리마인드를 보냈어요',rescue:'유찰 임박 건을 다른 스타일리스트에게 재노출했어요',settle:'에스크로 정산을 집행했어요 · 수수료 차감(데모)',hide:'신고된 후기를 숨김 처리했어요'}; admToast(M[action]||'처리했어요'); };
  // 라이브 신고 처리(양방향) — 회원 제재(3.B.2) 연계, fitting.reports에 상태 되씀
  window.__reportAct=function(i){ var reps=loadReports(); if(!reps[i]) return; reps[i].state='처리완료'; try{ localStorage.setItem('fitting.reports',JSON.stringify(reps)); }catch(e){} admToast('신고를 제재 검토 처리했어요 · 회원 제재(3.B.2) 연계(데모)'); renderDisputes(); };

  // ── 고객 문의(CS) 처리 (3.B.7) — 고객센터(fitting.support) 티켓 관리 ──
  function loadSupport(){ try{ var v=JSON.parse(localStorage.getItem('fitting.support')||'[]'); return Array.isArray(v)?v:[]; }catch(e){ return []; } }
  function saveSupport(a){ try{ localStorage.setItem('fitting.support',JSON.stringify(a)); }catch(e){} }
  function cstag(s){ var C={'미처리':'color:#8a6d1f;background:#f5ecd0','처리중':'color:#3a5a8a;background:#dde6f5','답변완료':'color:#1f6a4a;background:var(--green-soft)'}; return '<span class="pill" style="'+(C[s]||'')+'">'+esc(s)+'</span>'; }
  var CS_SAMPLE=[
    {cust:'수현', type:'진단·엔진', body:'추천받은 사이즈가 실제 착용과 좀 달랐어요', date:'2026.07.04', status:'처리중'},
    {cust:'예린', type:'계정·기타', body:'카카오 로그인 연동이 안 돼요', date:'2026.07.03', status:'미처리'}
  ];
  var FAQ_MGMT=[
    {q:'환불 규정이 궁금해요', count:8, promoted:true},
    {q:'유니클로 M이면 자라는 몇인가요?', count:12, promoted:true},
    {q:'스타일리스트가 응답이 없어요', count:5, promoted:false}
  ];
  var _tickets=[], _curT=null;
  function isTrade(type){ return !!type && (type.indexOf('결제')>=0 || type.indexOf('매칭')>=0); }
  function renderCS(){
    var live=loadSupport().map(function(s,i){ return {src:'support',idx:i,cust:'나',type:s.type,body:s.body,date:s.date,status:(s.status==='답변완료'?'답변완료':'미처리'),reply:s.reply,live:true}; });
    _tickets = live.concat(CS_SAMPLE.map(function(t){ var o={live:false}; for(var k in t) o[k]=t[k]; return o; }));
    var pending=_tickets.filter(function(t){return t.status!=='답변완료';}).length;
    $('csKpis').innerHTML=[kpi(pending,'미처리 문의','응답 필요'),kpi('4.2h','평균 응답',''),kpi(2,'SLA 임박','24h 내'),kpi('86%','자가해결','FAQ')].join('');
    var rows=_tickets.map(function(t,i){
      var act='<a class="pill" style="cursor:pointer" onclick="__csOpen('+i+')">답변</a>'+(isTrade(t.type)&&t.status!=='답변완료'?' <a class="pill" style="cursor:pointer" onclick="__csOpen('+i+')">분쟁 전환</a>':'');
      return '<tr><td>#T'+(500+i)+'</td><td>'+esc(t.cust||'고객')+'</td><td>'+esc(t.type||'')+'</td><td>'+esc((t.body||'').slice(0,22))+'</td><td>'+cstag(t.status)+'</td><td>'+act+'</td></tr>';
    }).join('');
    $('csTable').innerHTML='<thead><tr><th>티켓</th><th>고객</th><th>유형</th><th>내용</th><th>상태</th><th>조치</th></tr></thead><tbody>'+(rows||'<tr><td class="muted" colspan="6">문의 없음</td></tr>')+'</tbody>';
    var fr=FAQ_MGMT.map(function(f){ return '<tr><td>'+esc(f.q)+'</td><td class="num">'+f.count+'회</td><td>'+(f.promoted?cstag('답변완료').replace('답변완료','FAQ 등록'):'<span class="muted">미등록</span>')+'</td><td>'+(f.promoted?'<span class="muted">·</span>':'<a class="pill" style="cursor:pointer" onclick="__csFaq()">FAQ 승격</a>')+'</td></tr>'; }).join('');
    $('faqMgmtTable').innerHTML='<thead><tr><th>반복 문의</th><th>건수</th><th>FAQ</th><th>조치</th></tr></thead><tbody>'+fr+'</tbody>';
  }
  function renderCSModal(){ var t=_curT, m=$('dispModal'); if(!m||!t) return;
    var trade=isTrade(t.type);
    var BTN_P='padding:9px 15px;border-radius:9px;font-size:13.5px;font-weight:800;cursor:pointer;border:1px solid var(--green,#2E4A3B);background:var(--green,#2E4A3B);color:#fff';
    var BTN_G='padding:9px 15px;border-radius:9px;font-size:13.5px;font-weight:800;cursor:pointer;border:1px solid var(--line,#e0ddd6);background:#fff;color:var(--ink,#1c1a17)';
    var body='<div class="adm-sec">문의 · '+esc(t.type||'')+'</div>'+
      '<div class="adm-kv"><span>고객</span><b>'+esc(t.cust||'고객')+'</b></div>'+
      '<div class="adm-kv"><span>접수일</span><b>'+esc(t.date||'—')+'</b></div>'+
      '<div class="adm-sec">문의 내용</div><div class="adm-quote">"'+esc(t.body||'')+'"</div>'+
      (t.reply?'<div class="adm-sec">기존 답변</div><div class="adm-quote">"'+esc(t.reply)+'"</div>':'')+
      '<div class="adm-sec">답변 작성</div><textarea id="csReplyIn" style="width:100%;border:1px solid var(--line,#e0ddd6);border-radius:10px;padding:11px 13px;font-family:inherit;font-size:14px;min-height:82px;resize:vertical" placeholder="답변을 작성하면 고객 알림으로 전달돼요">'+esc(t.reply||'')+'</textarea>';
    var foot = t.live
      ? '<button onclick="__csReply()" style="'+BTN_P+'">답변 전송</button>'+(trade?'<button onclick="__csToDispute()" style="'+BTN_G+'">분쟁 큐로 전환</button>':'')
      : '<span class="muted" style="align-self:center">샘플 — 조치 데모 없음</span>';
    m.innerHTML='<div class="adm-bd" onclick="__dispClose()"></div><div class="adm-pan">'+
      '<div class="adm-h"><b>문의 답변 · '+esc(t.type||'')+'</b><button class="adm-x" onclick="__dispClose()">✕</button></div>'+
      '<div class="adm-b">'+body+'</div>'+
      '<div class="adm-f">'+foot+'<button onclick="__dispClose()" style="margin-left:auto;background:none;border:none;color:var(--sub,#777);font-weight:700;cursor:pointer">닫기</button></div></div>';
  }
  window.__csOpen=function(i){ _curT=_tickets[i]; if(!_curT) return; ensureAdmStyle(); var m=$('dispModal'); if(!m){ m=document.createElement('div'); m.id='dispModal'; m.className='adm-modal'; document.body.appendChild(m); } renderCSModal(); m.style.display='flex'; };
  window.__csReply=function(){ var t=_curT; if(!t||!t.live){ __dispClose(); return; } var el=$('csReplyIn'); var v=el?el.value.trim():''; if(!v){ admToast('답변을 입력해주세요'); return; }
    var a=loadSupport(); if(a[t.idx]){ a[t.idx].status='답변완료'; a[t.idx].reply=v; saveSupport(a); }
    admToast('답변을 전송했어요 · 고객 알림으로 전달'); __dispClose(); renderCS(); };
  window.__csToDispute=function(){ admToast('거래 문의를 분쟁 큐(3.B.4)로 전환했어요'); __dispClose(); };
  window.__csFaq=function(){ admToast('반복 문의를 FAQ(도움말)로 승격했어요'); };

  renderMembers(); renderPros();
})();
