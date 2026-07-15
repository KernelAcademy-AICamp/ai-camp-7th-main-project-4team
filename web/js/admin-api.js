/* admin-api.js — 3.D B2B API 콘솔(v3 · 화면 우선).
   샘플 콘솔. 실제 키 발급·게이트웨이·과금은 v3 백엔드.
   고객 레코드 계약: { id, name, plan, key, calls, quota, mrr, status }
   엔드포인트는 현행 FitEngine 메서드 기준(recommend/recommendBottom/ease/bodyFromExperiences). */
(function(){
  "use strict";
  var $=function(id){return document.getElementById(id);};
  var esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};
  function pct(n,d){return d?Math.round(n/d*100):0;}
  function kn(n){return n>=1000?(n/1000).toFixed(n>=10000?0:1)+'k':String(n);}
  function won(n){return '₩'+n.toLocaleString();}
  function kpi(n,l,s){return '<div class="kpi"><div class="n">'+n+'</div><div class="l">'+l+'</div>'+(s?'<div class="s">'+s+'</div>':'')+'</div>';}
  function bar(p){return '<span class="scorecell"><span class="bar"><span class="s2fill" style="width:'+Math.min(100,p)+'%"></span></span> '+p+'%</span>';}

  var PLAN={free:'무료',growth:'그로스',scale:'스케일'};
  var CLIENTS=[
    {id:'c01',name:'무드무드(편집샵)',plan:'scale', key:'fk_live_9a3f…d21',calls:184200,quota:300000,mrr:990000,status:'활성'},
    {id:'c02',name:'데일리룩',        plan:'growth',key:'fk_live_2b7c…88a',calls:52300, quota:60000, mrr:390000,status:'활성'},
    {id:'c03',name:'핏스토어',        plan:'growth',key:'fk_live_5e10…4f2',calls:61800, quota:60000, mrr:390000,status:'한도초과'},
    {id:'c04',name:'룩북몰',          plan:'free',  key:'fk_test_77aa…0c9',calls:820,   quota:1000,  mrr:0,     status:'평가판'},
    {id:'c05',name:'스타일리시',      plan:'scale', key:'fk_live_c4d2…a17',calls:210500,quota:300000,mrr:990000,status:'활성'},
    {id:'c06',name:'옷장연구소',      plan:'free',  key:'fk_test_31bd…9e0',calls:0,     quota:1000,  mrr:0,     status:'정지'}
  ];
  // 이번달 엔드포인트 호출(합계는 고객 calls와 별개의 개략 분포)
  var ENDPOINTS=[
    {path:'POST /v1/recommend',            desc:'상의 사이즈 추천',        calls:268000},
    {path:'POST /v1/recommend/bottom',     desc:'하의 사이즈 추천',        calls:141000},
    {path:'POST /v1/ease',                 desc:'여유·핏스코어 계산',      calls:73000},
    {path:'POST /v1/body-from-experiences',desc:'착용경험→신체 역산',      calls:29500},
    {path:'GET  /v1/size-chart',           desc:'브랜드 실측표 조회',      calls:18200}
  ];

  var cFilter='all';
  var SBADGE={'활성':'color:#1f6a4a;background:var(--green-soft)','한도초과':'color:#8a6d1f;background:#f5ecd0','평가판':'color:#3a5a8a;background:#dde6f5','정지':'color:#7a1f1f;background:#f5d6d6'};

  function renderKpis(){
    var live=CLIENTS.filter(function(c){return c.status==='활성'||c.status==='한도초과';});
    var calls=CLIENTS.reduce(function(s,c){return s+c.calls;},0);
    var mrr=CLIENTS.reduce(function(s,c){return s+c.mrr;},0);
    $('apiKpis').innerHTML=[
      kpi(CLIENTS.length,'API 고객','유료 '+CLIENTS.filter(function(c){return c.mrr>0;}).length),
      kpi(live.length,'활성 키','평가판/정지 '+(CLIENTS.length-live.length)),
      kpi(kn(calls),'이번달 호출','전 고객 합'),
      kpi(won(mrr),'MRR','월 반복 매출')
    ].join('');
  }
  window.__cf=function(s){ cFilter=s; drawClients(); };
  function renderFilters(){
    $('apiFilters').innerHTML=['all','활성','한도초과','평가판','정지'].map(function(s){
      return '<label class="numin"><input type="radio" name="cf" '+(cFilter===s?'checked':'')+' onchange="__cf(\''+s+'\')"><span>'+(s==='all'?'전체':s)+'</span></label>';
    }).join('')+'<span class="cnt muted" id="cCnt"></span>';
  }
  function drawClients(){
    var list=cFilter==='all'?CLIENTS:CLIENTS.filter(function(c){return c.status===cFilter;});
    $('cCnt').textContent=list.length+' 고객';
    var rows=list.map(function(c){
      var over=c.calls>c.quota;
      return '<tr><td><b>'+esc(c.name)+'</b></td>'+
        '<td>'+esc(PLAN[c.plan]||c.plan)+'</td>'+
        '<td class="muted"><code>'+esc(c.key)+'</code></td>'+
        '<td class="num">'+kn(c.calls)+' / '+kn(c.quota)+'</td>'+
        '<td>'+bar(pct(c.calls,c.quota))+(over?' <span class="pill" style="color:#7a1f1f;background:#f5d6d6">초과</span>':'')+'</td>'+
        '<td class="num">'+(c.mrr?won(c.mrr):'<span class="muted">—</span>')+'</td>'+
        '<td><span class="pill" style="'+(SBADGE[c.status]||'')+'">'+esc(c.status)+'</span></td>'+
        '<td>'+(c.status==='정지'
          ? '<a class="pill" style="color:var(--green);background:var(--green-soft);cursor:pointer" onclick="__setC(\''+c.id+'\',\'활성\')">재활성</a>'
          : '<a class="pill" style="cursor:pointer" onclick="__setC(\''+c.id+'\',\'정지\')">정지</a> <a class="pill" style="cursor:pointer" onclick="__rekey(\''+c.id+'\')">키 재발급</a>')+'</td></tr>';
    }).join('');
    $('clientTable').innerHTML='<thead><tr><th>고객사</th><th>플랜</th><th>API 키</th><th>호출/한도</th><th>사용률</th><th>MRR</th><th>상태</th><th>조치</th></tr></thead><tbody>'+rows+'</tbody>';
  }
  window.__setC=function(id,st){ var c=CLIENTS.filter(function(x){return x.id===id;})[0]; if(c)c.status=st; renderKpis(); drawClients(); };
  window.__rekey=function(id){ var c=CLIENTS.filter(function(x){return x.id===id;})[0]; if(c){ var suf=(id+c.calls).split('').reduce(function(a,ch){return (a*31+ch.charCodeAt(0))>>>0;},7).toString(16).slice(0,3); c.key='fk_live_'+suf+'…new'; } drawClients(); };

  function renderEndpoints(){
    var tot=ENDPOINTS.reduce(function(s,e){return s+e.calls;},0);
    var rows=ENDPOINTS.slice().sort(function(a,b){return b.calls-a.calls;}).map(function(e){
      return '<tr><td><code>'+esc(e.path)+'</code></td><td class="muted">'+esc(e.desc)+'</td>'+
        '<td class="num">'+kn(e.calls)+'</td><td>'+bar(pct(e.calls,tot))+'</td></tr>';
    }).join('');
    $('epTable').innerHTML='<thead><tr><th>엔드포인트</th><th>기능</th><th>호출</th><th>비중</th></tr></thead><tbody>'+rows+'</tbody>';
  }

  /* ───── 3.D.5 고객사 기술지원 ───── */
  function clientName(cid){ var c=CLIENTS.filter(function(x){return x.id===cid;})[0]; return c?c.name:cid; }
  function tsToast(msg){ var el=$('apiToast'); if(!el){ el=document.createElement('div'); el.id='apiToast'; el.style.cssText='position:fixed;left:50%;bottom:30px;transform:translateX(-50%);background:var(--ink,#16140f);color:#fff;padding:11px 18px;border-radius:10px;font-size:14px;font-weight:700;z-index:400;opacity:0;transition:opacity .2s;pointer-events:none'; document.body.appendChild(el); } el.textContent=msg; el.style.opacity='1'; clearTimeout(window._tst); window._tst=setTimeout(function(){ el.style.opacity='0'; },1900); }
  var TCAT={'연동':'연동/통합','에러':'에러/버그','한도':'한도/성능','SLA':'SLA/장애','기능':'기능 요청'};
  var TSEV={'긴급':'color:#7a1f1f;background:#f5d6d6','일반':'color:#3a5a8a;background:#dde6f5'};
  var TST={'접수':'color:#8a6d1f;background:#f5ecd0','처리중':'color:#3a5a8a;background:#dde6f5','해결':'color:#1f6a4a;background:var(--green-soft)'};
  var TICKETS=[
    {id:'T-2041', clientId:'c03', cat:'한도', sev:'긴급', status:'접수', at:'2026-07-14', endpoint:'POST /v1/recommend', channel:'상태페이지 알림',
      subject:'월 한도 초과로 429 응답 급증', body:'프로모션 트래픽으로 호출이 몰려 429가 발생합니다. 임시 한도 상향이 가능할까요? 스케일 플랜 업그레이드도 검토 중입니다.', reply:null},
    {id:'T-2038', clientId:'c01', cat:'에러', sev:'일반', status:'처리중', at:'2026-07-13', endpoint:'POST /v1/recommend/bottom', channel:'개발자 포털 문의폼',
      subject:'하의 추천에서 rise 필드가 null', body:'일부 상품에서 rise(밑위)가 null로 내려옵니다. 스키마상 필수 아닌가요?', reply:'재현 확인 중 · 데님 외 카테고리 일부에서 rise 미측정으로 확인. 응답에 nullable 명시 예정.'},
    {id:'T-2035', clientId:'c05', cat:'연동', sev:'일반', status:'해결', at:'2026-07-11', endpoint:'—', channel:'support 이메일',
      subject:'웹훅 서명(HMAC) 검증 실패', body:'전송해주신 서명이 저희 계산값과 계속 불일치합니다.', reply:'서명 베이스 문자열에 파싱 전 raw body를 사용하도록 안내 → 해결 확인.'},
    {id:'T-2030', clientId:'c02', cat:'기능', sev:'일반', status:'접수', at:'2026-07-10', endpoint:'POST /v1/recommend', channel:'개발자 포털 문의폼',
      subject:'추천 신뢰도(confidence) 응답 필드 요청', body:'추천 사이즈와 함께 신뢰도 점수를 받아 UI에 노출하고 싶습니다.', reply:null}
  ];
  var tFilter='미해결';
  function openTix(){ return TICKETS.filter(function(t){return t.status!=='해결';}); }

  function renderApiStatus(){
    $('apiStatus').innerHTML='<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;background:var(--green-soft);border:1px solid #cfe0d6;border-radius:12px;padding:12px 16px;margin:2px 0 14px">'+
      '<span style="font-weight:800;color:#1f6a4a">● API 정상</span>'+
      '<span class="muted">가동률 30일 <b class="num" style="color:var(--ink)">99.96%</b></span>'+
      '<span class="muted">p95 지연 <b class="num" style="color:var(--ink)">128ms</b></span>'+
      '<span class="muted">최근 인시던트 <b style="color:var(--ink)">7/09 recommend 지연 · 해결</b></span>'+
      '<a class="pill" style="margin-left:auto;cursor:pointer" onclick="__tsAnnounce()">상태 공지 발송</a></div>';
  }
  function renderTsKpis(){
    var open=openTix(), urgent=open.filter(function(t){return t.sev==='긴급';});
    $('tsKpis').innerHTML=[
      kpi(open.length,'미해결 티켓','접수+처리중'),
      kpi(urgent.length,'긴급','SLA 우선 대응'),
      kpi('98%','SLA 준수','첫 응답 기한 내'),
      kpi('2.4h','평균 첫 응답','유료 고객')
    ].join('');
  }
  window.__tf=function(s){ tFilter=s; drawTickets(); };
  function renderTsFilters(){
    $('tsFilters').innerHTML=['미해결','전체','긴급','해결'].map(function(s){
      return '<label class="numin"><input type="radio" name="tf" '+(tFilter===s?'checked':'')+' onchange="__tf(\''+s+'\')"><span>'+s+'</span></label>';
    }).join('')+'<span class="cnt muted" id="tCnt"></span>';
  }
  function tList(){
    if(tFilter==='전체') return TICKETS;
    if(tFilter==='미해결') return openTix();
    if(tFilter==='긴급') return TICKETS.filter(function(t){return t.sev==='긴급';});
    return TICKETS.filter(function(t){return t.status===tFilter;});
  }
  function drawTickets(){
    var list=tList(); if($('tCnt')) $('tCnt').textContent=list.length+' 건';
    var rows=list.map(function(t){
      return '<tr><td class="muted"><code>'+esc(t.id)+'</code></td>'+
        '<td><b>'+esc(clientName(t.clientId))+'</b></td>'+
        '<td>'+esc(t.subject)+'<div class="muted" style="font-size:12px"><code>'+esc(t.endpoint)+'</code></div></td>'+
        '<td>'+esc(TCAT[t.cat]||t.cat)+'</td>'+
        '<td><span class="pill" style="'+(TSEV[t.sev]||'')+'">'+esc(t.sev)+'</span></td>'+
        '<td><span class="pill" style="'+(TST[t.status]||'')+'">'+esc(t.status)+'</span></td>'+
        '<td class="muted num">'+esc(t.at)+'</td>'+
        '<td><a class="pill" style="cursor:pointer" onclick="__tsOpen(\''+t.id+'\')">상세·처리 →</a></td></tr>';
    }).join('');
    $('tsTable').innerHTML='<thead><tr><th>티켓</th><th>고객사</th><th>제목</th><th>분류</th><th>심각도</th><th>상태</th><th>접수</th><th>조치</th></tr></thead><tbody>'+(rows||'<tr><td class="muted" colspan="8">해당 티켓 없음</td></tr>')+'</tbody>';
  }
  function ensureTsStyle(){ if($('tsStyle')) return; var s=document.createElement('style'); s.id='tsStyle';
    s.textContent='.ts-modal{position:fixed;inset:0;z-index:300;display:flex;align-items:center;justify-content:center}'+
      '.ts-bd{position:absolute;inset:0;background:rgba(20,18,16,.45)}'+
      '.ts-pan{position:relative;background:#fff;border-radius:16px;width:min(560px,94vw);max-height:88vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.28)}'+
      '.ts-h{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:16px 20px;border-bottom:1px solid var(--line,#e6e5e1)}'+
      '.ts-h b{font-size:15.5px;font-weight:800}.ts-h span{font-size:12.5px;color:var(--sub,#6e6b63)}'+
      '.ts-x{background:none;border:none;font-size:20px;line-height:1;cursor:pointer;color:var(--sub2,#a6a29a)}'+
      '.ts-b{padding:14px 20px;overflow-y:auto}'+
      '.ts-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px}'+
      '.ts-sec{font-size:12.5px;font-weight:800;color:var(--sub,#6e6b63);margin:14px 0 6px}'+
      '.ts-quote{background:var(--soft,#ededea);border-radius:10px;padding:12px 14px;font-size:13.5px;line-height:1.55;white-space:pre-wrap}'+
      '.ts-quote.ok{background:var(--green-soft,#e7efea)}'+
      '.ts-b textarea{width:100%;margin-top:4px;border:1.5px solid var(--line2,#dad8d2);border-radius:10px;padding:10px 12px;font-family:inherit;font-size:13.5px;resize:vertical;min-height:70px;box-sizing:border-box}'+
      '.ts-b textarea:focus{outline:none;border-color:var(--green,#2e4a3b)}'+
      '.ts-f{display:flex;gap:8px;justify-content:flex-end;padding:13px 20px;border-top:1px solid var(--line,#e6e5e1)}'+
      '.ts-f .pill{padding:9px 16px;font-size:13px;font-weight:800}';
    document.head.appendChild(s); }
  var _curT=null;
  window.__tsOpen=function(id){ var t=TICKETS.filter(function(x){return x.id===id;})[0]; if(!t) return; _curT=t; ensureTsStyle();
    var m=$('tsModal'); if(!m){ m=document.createElement('div'); m.id='tsModal'; m.className='ts-modal'; document.body.appendChild(m); }
    m.innerHTML='<div class="ts-bd" onclick="__tsClose()"></div><div class="ts-pan">'+
      '<div class="ts-h"><div><b>'+esc(t.subject)+'</b><span> · '+esc(clientName(t.clientId))+' · '+esc(t.id)+'</span></div><button class="ts-x" onclick="__tsClose()">✕</button></div>'+
      '<div class="ts-b">'+
        '<div class="ts-meta"><span class="pill" style="'+(TSEV[t.sev]||'')+'">'+esc(t.sev)+'</span><span class="pill" style="'+(TST[t.status]||'')+'">'+esc(t.status)+'</span><span class="muted">'+esc(TCAT[t.cat]||t.cat)+' · <code>'+esc(t.endpoint)+'</code> · '+esc(t.at)+'</span></div>'+
        '<div class="muted" style="font-size:12.5px;margin-bottom:6px">유입 경로 · <b style="color:var(--ink)">'+esc(t.channel||'—')+'</b></div>'+
        '<div class="ts-sec">고객사 문의</div><div class="ts-quote">'+esc(t.body)+'</div>'+
        (t.reply?'<div class="ts-sec">지원팀 답변</div><div class="ts-quote ok">'+esc(t.reply)+'</div>':'')+
        '<div class="ts-sec">답변 작성</div><textarea id="tsReplyIn" placeholder="에러 원인·해결 방법·회신 내용을 적어주세요">'+esc(t.reply||'')+'</textarea>'+
      '</div>'+
      '<div class="ts-f"><button class="pill" style="cursor:pointer" onclick="__tsReply()">답변 저장 · 처리중</button>'+
        '<button class="pill" style="color:#1f6a4a;background:var(--green-soft);cursor:pointer" onclick="__tsResolve()">해결 처리</button></div>'+
    '</div>';
    m.style.display='flex'; };
  window.__tsClose=function(){ var m=$('tsModal'); if(m) m.style.display='none'; _curT=null; };
  function saveReplyFromInput(){ var el=$('tsReplyIn'); if(el && _curT) _curT.reply=el.value.trim()||null; }
  window.__tsReply=function(){ if(!_curT) return; saveReplyFromInput(); if(!_curT.reply){ tsToast('답변 내용을 입력해주세요'); return; } if(_curT.status==='접수') _curT.status='처리중'; renderTsKpis(); drawTickets(); __tsClose(); tsToast('답변을 저장했어요 · 처리중으로 변경'); };
  window.__tsResolve=function(){ if(!_curT) return; saveReplyFromInput(); _curT.status='해결'; renderTsKpis(); drawTickets(); __tsClose(); tsToast('티켓을 해결 처리했어요'); };
  window.__tsAnnounce=function(){ tsToast('전 고객사에 API 상태 공지를 발송했어요 (데모)'); };

  renderKpis(); renderFilters(); drawClients(); renderEndpoints();
  renderApiStatus(); renderTsKpis(); renderTsFilters(); drawTickets();
})();
