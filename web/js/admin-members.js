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
    ['members','pros','signals'].forEach(function(k){
      var p=$('panel-'+k); if(p) p.classList.toggle('on',k===t);
    });
    Array.prototype.forEach.call(document.querySelectorAll('#atabs .t'),function(el){
      el.classList.toggle('on', el.getAttribute('data-tab')===t);
    });
    if(t==='signals') renderSignals();
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
    {id:'p214',appliedAt:'2026-07-10T11:02:00',nick:'대구쇼퍼K',region:'대구 동성로',basis:'편집샵 근무',status:'승인'},
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

  renderMembers(); renderPros();
})();
