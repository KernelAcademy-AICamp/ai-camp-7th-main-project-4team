/* admin-diagnostics.js — 3.C.2 진단 응답·정확도 뷰어.
   화면 우선: 실수집 배선 전이라 소스는 (1)이 브라우저 로그 fitting.feedback (2)샘플.
   정본 응답 레코드 계약(나중 배선의 목표 형태):
     { id, ts, gender:'female'|'male', bodyType:'A'..'H', category:'TOP'|'BOTTOM'|...,
       verdict:'맞음'|'애매'|'틀림', confidenceTier:'low'|'mid'|'high', engineImprove:bool,
       anchors:[{brandName, fitLine, sizeLabel}], painFlags:{part:'TIGHT'|'OK'} } */
(function(){
  "use strict";
  var $=function(id){return document.getElementById(id);};
  var esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};
  var TIERS=['low','mid','high'], TIERLBL={low:'낮음',mid:'중간',high:'높음'};
  var VERDICTS=['맞음','애매','틀림'];
  var GENLBL={female:'여성',male:'남성'};
  function pct(n,d){return d?Math.round(n/d*100):0;}
  function kpi(n,l,s){return '<div class="kpi"><div class="n">'+n+'</div><div class="l">'+l+'</div>'+(s?'<div class="s">'+s+'</div>':'')+'</div>';}
  function bar(p){return '<span class="scorecell"><span class="bar"><span class="s2fill" style="width:'+p+'%"></span></span> '+p+'%</span>';}

  // ── 샘플(대표 응답 16건). 화면 완성용 — 실데이터 아님. ─────────────────
  var SAMPLE=[
    {id:'s01',ts:'2026-07-12T21:14:00',gender:'female',bodyType:'C',category:'TOP',verdict:'맞음',confidenceTier:'high',engineImprove:true, anchors:[{brandName:'유니클로',fitLine:'regular',sizeLabel:'M'}],painFlags:{arm:'OK',neck:'OK'}},
    {id:'s02',ts:'2026-07-12T20:02:00',gender:'female',bodyType:'C',category:'TOP',verdict:'맞음',confidenceTier:'high',engineImprove:true, anchors:[{brandName:'무신사 스탠다드',fitLine:'relaxed',sizeLabel:'L'}],painFlags:{arm:'TIGHT',neck:'OK'}},
    {id:'s03',ts:'2026-07-12T18:40:00',gender:'male',  bodyType:'F',category:'TOP',verdict:'애매',confidenceTier:'mid', engineImprove:false,anchors:[{brandName:'자라',fitLine:'slim',sizeLabel:'M'}],painFlags:{arm:'OK',neck:'TIGHT'}},
    {id:'s04',ts:'2026-07-12T17:11:00',gender:'male',  bodyType:'F',category:'BOTTOM',verdict:'맞음',confidenceTier:'mid', engineImprove:true, anchors:[{brandName:'유니클로',fitLine:'straight',sizeLabel:'32'}],painFlags:{thigh:'TIGHT'}},
    {id:'s05',ts:'2026-07-12T15:55:00',gender:'female',bodyType:'A',category:'TOP',verdict:'틀림',confidenceTier:'high',engineImprove:true, anchors:[{brandName:'스파오',fitLine:'regular',sizeLabel:'S'}],painFlags:{arm:'TIGHT',neck:'OK'}},
    {id:'s06',ts:'2026-07-12T14:20:00',gender:'female',bodyType:'D',category:'TOP',verdict:'맞음',confidenceTier:'mid', engineImprove:false,anchors:[{brandName:'탑텐',fitLine:'regular',sizeLabel:'M'}],painFlags:{arm:'OK'}},
    {id:'s07',ts:'2026-07-12T12:05:00',gender:'male',  bodyType:'G',category:'TOP',verdict:'맞음',confidenceTier:'high',engineImprove:true, anchors:[{brandName:'에잇세컨즈',fitLine:'relaxed',sizeLabel:'L'}],painFlags:{arm:'OK',neck:'OK'}},
    {id:'s08',ts:'2026-07-12T10:48:00',gender:'female',bodyType:'C',category:'BOTTOM',verdict:'애매',confidenceTier:'low', engineImprove:false,anchors:[{brandName:'자라',fitLine:'wide',sizeLabel:'27'}],painFlags:{thigh:'OK',hip:'TIGHT'}},
    {id:'s09',ts:'2026-07-11T22:30:00',gender:'male',  bodyType:'H',category:'TOP',verdict:'틀림',confidenceTier:'mid', engineImprove:true, anchors:[{brandName:'무신사 스탠다드',fitLine:'oversized',sizeLabel:'XL'}],painFlags:{neck:'TIGHT'}},
    {id:'s10',ts:'2026-07-11T20:12:00',gender:'female',bodyType:'B',category:'TOP',verdict:'맞음',confidenceTier:'mid', engineImprove:false,anchors:[{brandName:'유니클로',fitLine:'slim',sizeLabel:'S'}],painFlags:{arm:'OK'}},
    {id:'s11',ts:'2026-07-11T18:00:00',gender:'female',bodyType:'C',category:'TOP',verdict:'맞음',confidenceTier:'high',engineImprove:true, anchors:[{brandName:'스파오',fitLine:'regular',sizeLabel:'M'}],painFlags:{arm:'OK',neck:'OK'}},
    {id:'s12',ts:'2026-07-11T15:33:00',gender:'male',  bodyType:'F',category:'BOTTOM',verdict:'애매',confidenceTier:'low', engineImprove:false,anchors:[{brandName:'탑텐',fitLine:'straight',sizeLabel:'34'}],painFlags:{thigh:'TIGHT',waist:'TIGHT'}},
    {id:'s13',ts:'2026-07-11T13:10:00',gender:'female',bodyType:'E',category:'TOP',verdict:'맞음',confidenceTier:'mid', engineImprove:true, anchors:[{brandName:'자라',fitLine:'regular',sizeLabel:'M'}],painFlags:{arm:'OK'}},
    {id:'s14',ts:'2026-07-10T21:44:00',gender:'male',  bodyType:'G',category:'TOP',verdict:'맞음',confidenceTier:'high',engineImprove:false,anchors:[{brandName:'유니클로',fitLine:'regular',sizeLabel:'L'}],painFlags:{arm:'OK',neck:'OK'}},
    {id:'s15',ts:'2026-07-10T19:20:00',gender:'female',bodyType:'A',category:'TOP',verdict:'틀림',confidenceTier:'low', engineImprove:true, anchors:[{brandName:'에잇세컨즈',fitLine:'slim',sizeLabel:'S'}],painFlags:{arm:'TIGHT'}},
    {id:'s16',ts:'2026-07-10T16:05:00',gender:'female',bodyType:'D',category:'TOP',verdict:'맞음',confidenceTier:'mid', engineImprove:false,anchors:[{brandName:'무신사 스탠다드',fitLine:'regular',sizeLabel:'M'}],painFlags:{arm:'OK'}}
  ];

  var PARTLBL={arm:'팔(소매)',neck:'목',thigh:'허벅지',hip:'엉덩이',waist:'허리',shoulder:'어깨',chest:'가슴'};
  var TYPES={};  // code→name (bodytypes.json)

  // 로컬 로그(fitting.feedback)를 정본 레코드로 정규화. 브랜드/페인은 아직 미배선 → 빈값.
  function loadReal(){
    var raw; try{ raw=JSON.parse(localStorage.getItem('fitting.feedback')||'[]'); }catch(e){ raw=[]; }
    if(!Array.isArray(raw)) raw=[];
    return raw.map(function(r,i){ return {
      id:'r'+i, ts:r.ts, gender:r.gender||null, bodyType:r.bodyType||'?', category:r.category||'TOP',
      verdict:r.verdict, confidenceTier:r.confidenceTier||'mid', engineImprove:!!r.engineImprove,
      anchors:r.anchors||[], painFlags:r.painFlags||{} };
    });
  }

  var SOURCE='sample', DATA=[];
  fetch('data/bodytypes.json').then(function(r){return r.json();}).then(function(j){
    (j.types||j||[]).forEach(function(t){ if(t&&t.code) TYPES[t.code]=t.name; });
  }).catch(function(){}).then(pickSource);

  function realCount(){ return loadReal().length; }
  function pickSource(){
    var rc=realCount();
    SOURCE = rc>0 ? 'real' : 'sample';
    buildSrcBar(rc); apply();
  }
  function buildSrcBar(rc){
    $('srcBar').innerHTML=
      '<label class="numin"><input type="radio" name="src" value="real" '+(SOURCE==='real'?'checked':'')+' onchange="__src(\'real\')"><span>이 브라우저 로그 ('+rc+')</span></label>'+
      '<label class="numin"><input type="radio" name="src" value="sample" '+(SOURCE==='sample'?'checked':'')+' onchange="__src(\'sample\')"><span>샘플 데이터 ('+SAMPLE.length+')</span></label>'+
      '<span class="cnt muted" id="srcNote"></span>';
  }
  window.__src=function(s){ SOURCE=s; apply(); };

  function apply(){
    DATA = SOURCE==='sample' ? SAMPLE.slice() : loadReal();
    var note=$('srcNote');
    if(SOURCE==='sample') note.innerHTML='· <b>샘플</b>(대표 16건) — 화면 확인용, 실응답 아님';
    else note.innerHTML = DATA.length? '· 이 브라우저에 쌓인 실피드백(브랜드·페인 breakdown은 dx-log 배선 후)' : '· 로그 없음 — 진단→결과에서 정확도 응답 시 쌓임';
    renderKpis(); renderCalib(); renderTypes(); renderBrands(); renderPain(); renderLog();
  }

  function renderKpis(){
    var n=DATA.length, byV={};
    VERDICTS.forEach(function(v){byV[v]=0;});
    var consent=0;
    DATA.forEach(function(r){ if(byV[r.verdict]!=null)byV[r.verdict]++; if(r.engineImprove)consent++; });
    $('dxKpis').innerHTML=[
      kpi(n,'총 응답',''),
      kpi(pct(byV['맞음'],n)+'%','정확도 동의율','킬 메트릭 · 맞음 '+byV['맞음']+'/'+n),
      kpi(pct(byV['애매'],n)+'%','애매','애매 '+byV['애매']),
      kpi(pct(byV['틀림'],n)+'%','틀림','틀림 '+byV['틀림']),
      kpi(pct(consent,n)+'%','엔진개선 동의','opt-in '+consent+'/'+n)
    ].join('');
  }

  function heat(c,max,danger){
    if(!c) return '<span class="muted">·</span>';
    var a=max?(0.12+0.66*c/max):0.4;
    var col=danger?('rgba(200,60,60,'+a+')'):('rgba(31,106,74,'+a+')');
    return '<span style="display:inline-block;min-width:34px;text-align:center;padding:3px 8px;border-radius:8px;background:'+col+';font-weight:700'+(danger?';color:#7a1f1f':'')+'">'+c+'</span>';
  }
  function renderCalib(){
    var m={}, max=0, dangerCount=0;
    VERDICTS.forEach(function(v){ m[v]={}; TIERS.forEach(function(t){m[v][t]=0;}); });
    DATA.forEach(function(r){ if(m[r.verdict]&&m[r.verdict][r.confidenceTier]!=null){ m[r.verdict][r.confidenceTier]++; max=Math.max(max,m[r.verdict][r.confidenceTier]); }});
    dangerCount=m['틀림']['high'];
    var rows=VERDICTS.map(function(v){
      return '<tr><td><b>'+v+'</b></td>'+TIERS.map(function(t){
        var danger=(v==='틀림'&&t==='high');
        return '<td>'+heat(m[v][t],max,danger)+'</td>';
      }).join('')+'</tr>';
    }).join('');
    $('calibTable').innerHTML='<thead><tr><th>정확도 \\ 신뢰도</th>'+TIERS.map(function(t){return '<th>'+TIERLBL[t]+'</th>';}).join('')+'</tr></thead><tbody>'+rows+'</tbody>';
    $('calibNote').innerHTML = dangerCount
      ? '⚠️ <b>높은 신뢰인데 틀림 '+dangerCount+'건</b> — 엔진이 확신한 오답. 캘리브레이션(신뢰도 산정) 또는 여유밴드 튜닝 1순위.'
      : '✓ 높은 신뢰 구간에서 틀림 응답 없음 — 캘리브레이션 양호.';
  }

  function renderTypes(){
    var m={};
    DATA.forEach(function(r){ var b=m[r.bodyType]||(m[r.bodyType]={n:0,ok:0}); b.n++; if(r.verdict==='맞음')b.ok++; });
    var keys=Object.keys(m).sort();
    if(!keys.length){ $('typeTable').innerHTML='<tbody><tr><td class="muted">응답 없음</td></tr></tbody>'; return; }
    var rows=keys.map(function(k){ var b=m[k]; return '<tr><td><b>'+esc(k)+'</b> <span class="muted">'+esc(TYPES[k]||'')+'</span></td>'+
      '<td class="num">'+b.n+'</td><td>'+bar(pct(b.ok,b.n))+'</td>'+
      '<td class="muted">'+(b.n<3?'표본 적음':'')+'</td></tr>'; }).join('');
    $('typeTable').innerHTML='<thead><tr><th>8유형</th><th>응답수</th><th>맞음율</th><th></th></tr></thead><tbody>'+rows+'</tbody>';
  }

  function renderBrands(){
    var m={};
    DATA.forEach(function(r){ (r.anchors||[]).forEach(function(a){ var b=m[a.brandName]||(m[a.brandName]={n:0,ok:0}); b.n++; if(r.verdict==='맞음')b.ok++; }); });
    var keys=Object.keys(m).sort(function(a,b){return m[b].n-m[a].n;});
    if(!keys.length){ $('brandTable').innerHTML='<tbody><tr><td class="muted">앵커 브랜드 정보 없음 — dx-log 배선 후 표시</td></tr></tbody>'; return; }
    var rows=keys.map(function(k){ var b=m[k]; return '<tr><td><b>'+esc(k)+'</b></td><td class="num">'+b.n+'</td><td>'+bar(pct(b.ok,b.n))+'</td></tr>'; }).join('');
    $('brandTable').innerHTML='<thead><tr><th>앵커 브랜드</th><th>진단 수</th><th>맞음율</th></tr></thead><tbody>'+rows+'</tbody>';
  }

  function renderPain(){
    var m={}, tot=0;
    DATA.forEach(function(r){ var f=r.painFlags||{}; Object.keys(f).forEach(function(p){ if(f[p]==='TIGHT'){ m[p]=(m[p]||0)+1; tot++; } }); });
    var keys=Object.keys(m).sort(function(a,b){return m[b]-m[a];});
    if(!keys.length){ $('painTable').innerHTML='<tbody><tr><td class="muted">페인 신호 없음 — dx-log 배선 후 표시</td></tr></tbody>'; return; }
    var rows=keys.map(function(k){ return '<tr><td><b>'+esc(PARTLBL[k]||k)+'</b></td><td class="num">'+m[k]+'</td><td>'+bar(pct(m[k],tot))+'</td></tr>'; }).join('');
    $('painTable').innerHTML='<thead><tr><th>부위</th><th>TIGHT 응답</th><th>비중</th></tr></thead><tbody>'+rows+'</tbody>';
  }

  var VBADGE={'맞음':'color:#1f6a4a;background:var(--green-soft)','애매':'color:#8a6d1f;background:#f5ecd0','틀림':'color:#7a1f1f;background:#f5d6d6'};
  function renderLog(){
    var list=DATA.slice().sort(function(a,b){return (b.ts||'').localeCompare(a.ts||'');});
    if(!list.length){ $('logTable').innerHTML='<tbody><tr><td class="muted">응답 없음</td></tr></tbody>'; return; }
    var rows=list.map(function(r){
      var anch=(r.anchors||[]).map(function(a){return esc(a.brandName)+(a.sizeLabel?' '+esc(a.sizeLabel):'');}).join(', ')||'<span class="muted">—</span>';
      return '<tr><td class="muted">'+esc((r.ts||'').replace('T',' ').slice(0,16))+'</td>'+
        '<td>'+(r.gender?GENLBL[r.gender]||r.gender:'<span class="muted">—</span>')+'</td>'+
        '<td><b>'+esc(r.bodyType)+'</b> '+esc(TYPES[r.bodyType]||'')+'</td>'+
        '<td>'+esc(r.category)+'</td>'+
        '<td>'+anch+'</td>'+
        '<td><span class="pill" style="'+(VBADGE[r.verdict]||'')+'">'+esc(r.verdict)+'</span></td>'+
        '<td class="muted">'+(TIERLBL[r.confidenceTier]||r.confidenceTier)+'</td>'+
        '<td>'+(r.engineImprove?'✓':'<span class="muted">·</span>')+'</td></tr>';
    }).join('');
    $('logTable').innerHTML='<thead><tr><th>시각</th><th>성별</th><th>8유형</th><th>카테고리</th><th>앵커</th><th>정확도</th><th>신뢰도</th><th>동의</th></tr></thead><tbody>'+rows+'</tbody>';
  }
})();
