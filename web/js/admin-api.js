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

  renderKpis(); renderFilters(); drawClients(); renderEndpoints();
})();
