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

  var PARTLBL={arm:'팔(소매)',neck:'목',thigh:'허벅지',hip:'엉덩이',waist:'허리',shoulder:'어깨',chest:'가슴',
    belly:'배',sleeve:'소매',length:'총장',rise:'밑위',hem:'밑단'};
  // 착용감/불편/기장 원값 → 한글. (fits: 4지 · painFlags: 2지 · lengthPrefs: 3지)
  var FEELKO={TIGHT:'끼임',SNUG:'딱맞음',RELAXED:'여유',BIG:'큼',OK:'괜찮음',SHORT:'짧음',GOOD:'딱 좋음',LONG:'긺'};
  function feelKo(v){ return FEELKO[v]||v; }
  function kvLine(label,obj){
    var ks=Object.keys(obj||{}); if(!ks.length) return '';
    return '<div><span class="muted">'+label+':</span> '+ks.map(function(k){ return esc(PARTLBL[k]||k)+' <b>'+esc(feelKo(obj[k]))+'</b>'; }).join(', ')+'</div>';
  }
  // 로그 행 펼침 = 그 진단에 수집된 원본 입력 전체(기본·앵커·모든 부위 착용감·불편·기장·밴딩·자유의견).
  function expDetail(raw){
    if(!raw || !Array.isArray(raw.experiences) || !raw.experiences.length){
      return '<span class="muted">상세 입력 없음 (샘플·이 브라우저 로그 또는 0벌 진단)</span>';
    }
    var b=raw.basic||{}, GEN={male:'남성',female:'여성'};
    var head='<div class="muted" style="margin-bottom:4px">기본 · '+esc([GEN[b.gender]||b.gender,b.age,(b.height?b.height+'cm':''),(b.weight?b.weight+'kg':'')].filter(Boolean).join(' / '))+'</div>';
    return head + raw.experiences.map(function(e){
      var meta=[esc(e.brandName||e.brandId||'?'), e.sizeLabel?esc(e.sizeLabel):'', e.fitLine?esc(e.fitLine):'', e.silhouette?esc(e.silhouette):'', e.category?esc(e.category):''].filter(Boolean).join(' · ');
      var wb=e.waistband==='banded'?'밴딩 있음':(e.waistband==='none'?'밴딩 없음':'');
      return '<div style="padding:6px 0;border-top:1px solid var(--line,#eee)">'+
        '<b>'+meta+'</b>'+(wb?' <span class="muted">('+wb+')</span>':'')+
        kvLine('착용감',e.fits)+kvLine('불편',e.painFlags)+kvLine('기장',e.lengthPrefs)+
        ((e.openNote||'').trim()?'<div><span class="muted">자유의견:</span> '+esc(e.openNote)+'</div>':'')+
        '</div>';
    }).join('');
  }
  window.__dxToggle=function(id){ var el=document.getElementById(id); if(el) el.style.display=(el.style.display==='none'?'':'none'); };
  var TYPES={};  // code→name (bodytypes.json)

  // 로컬 로그(fitting.feedback)를 정본 레코드로 정규화. 브랜드/페인은 아직 미배선 → 빈값.
  function loadReal(){
    var raw=FDATA.loadFeedback();   // 어댑터(seam): proto=localStorage / api=서버(다음 증분 async)
    if(!Array.isArray(raw)) raw=[];
    return raw.map(function(r,i){ return {
      id:'r'+i, ts:r.ts, gender:r.gender||null, bodyType:r.bodyType||'?', category:r.category||'TOP',
      verdict:r.verdict, confidenceTier:r.confidenceTier||'mid', engineImprove:!!r.engineImprove,
      anchors:r.anchors||[], painFlags:r.painFlags||{} };
    });
  }

  var SOURCE='sample', DATA=[], LIVE=[];
  var MODE=(window.FDATA&&FDATA.mode)||'proto';
  var LIVEON = MODE==='api' && window.ADMINAUTH && ADMINAUTH.ready();

  // Supabase feedback(+diagnosis 임베드) → 렌더 레코드 형태로 정규화. RLS로 관리자만 데이터 받음.
  function normLive(rows){ return (rows||[]).map(function(r,i){
    var d=r.diagnosis||{}, res=d.result||{}, inp=d.input||{};
    var exps=Array.isArray(inp.experiences)?inp.experiences:[];
    // 앵커 = 착용경험(브랜드·핏라인·사이즈). 페인 = 경험별 painFlags 합집합.
    var pain={};
    exps.forEach(function(e){ var pf=e&&e.painFlags||{}; Object.keys(pf).forEach(function(p){ if(pf[p]) pain[p]=pf[p]; }); });
    return { id:r.id||('l'+i), ts:r.created_at, gender:(inp.basic&&inp.basic.gender)||null,
      bodyType:res.card||'?', category:d.category||'TOP', verdict:r.verdict,
      confidenceTier:res.confidenceTier||'mid', engineImprove:!!r.engine_improve_consent,
      engineVersion:d.engine_version||'?',
      anchors:exps.map(function(e){ return {brandName:e.brandName,fitLine:e.fitLine,sizeLabel:e.sizeLabel}; }),
      painFlags:pain, _raw:{basic:inp.basic||null, prefs:inp.prefs||null, experiences:exps} };
  }); }
  async function loadLive(){ if(!LIVEON) return []; try{ return normLive(await ADMINAUTH.feedbackJoin(500)); }catch(e){ return []; } }

  fetch('data/bodytypes.json').then(function(r){return r.json();}).then(function(j){
    (j.types||j||[]).forEach(function(t){ if(t&&t.code) TYPES[t.code]=t.name; });
  }).catch(function(){}).then(function(){
    if(LIVEON){ loadLive().then(function(rows){ LIVE=rows; SOURCE='live'; buildSrcBar(realCount()); apply(); }); }
    else pickSource();
  });

  function realCount(){ return loadReal().length; }
  function pickSource(){
    var rc=realCount();
    SOURCE = rc>0 ? 'real' : 'sample';
    buildSrcBar(rc); apply();
  }
  function buildSrcBar(rc){
    $('srcBar').innerHTML=
      (LIVEON?'<label class="numin"><input type="radio" name="src" value="live" '+(SOURCE==='live'?'checked':'')+' onchange="__src(\'live\')"><span>실 DB (Supabase · '+LIVE.length+')</span></label>':'')+
      '<label class="numin"><input type="radio" name="src" value="real" '+(SOURCE==='real'?'checked':'')+' onchange="__src(\'real\')"><span>이 브라우저 로그 ('+rc+')</span></label>'+
      '<label class="numin"><input type="radio" name="src" value="sample" '+(SOURCE==='sample'?'checked':'')+' onchange="__src(\'sample\')"><span>샘플 데이터 ('+SAMPLE.length+')</span></label>'+
      (LIVEON?'<button class="abtn ghost" style="margin-left:auto;color:var(--warn)" onclick="__resetDx()">🗑 진단·피드백 로그 초기화</button>':'')+
      '<span class="cnt muted" id="srcNote"></span>';
  }
  window.__src=function(s){ SOURCE=s; apply(); };
  // 테스트 로그 초기화 — 진단+피드백(실 DB) 전체 삭제(admin RLS). 되돌릴 수 없음. [db/06]
  window.__resetDx=async function(){
    if(!(window.ADMINAUTH&&ADMINAUTH.ready())){ alert('실 DB(api·admin 로그인) 상태에서만 초기화할 수 있어요.'); return; }
    if(!confirm('진단·피드백 로그를 전부 삭제할까요?\n킬 메트릭 데이터가 모두 지워지고 되돌릴 수 없어요. (테스트 데이터 정리용)')) return;
    var r=await ADMINAUTH.resetDiagnosisLogs();
    if(r.ok){ alert('초기화됐어요.'); LIVE=await loadLive(); SOURCE='live'; buildSrcBar(realCount()); apply(); }
    else alert('초기화 실패: '+(r.error||'admin 권한 확인'));
  };

  function apply(){
    DATA = SOURCE==='sample' ? SAMPLE.slice() : (SOURCE==='live' ? LIVE.slice() : loadReal());
    var note=$('srcNote');
    if(SOURCE==='sample') note.innerHTML='· <b>샘플</b>(대표 16건) — 화면 확인용, 실응답 아님';
    else if(SOURCE==='live') note.innerHTML='· <b>실 DB</b>(Supabase feedback · RLS 관리자 전용) — 킬 메트릭 실측';
    else note.innerHTML = DATA.length? '· 이 브라우저에 쌓인 실피드백(브랜드·페인 breakdown은 dx-log 배선 후)' : '· 로그 없음 — 진단→결과에서 정확도 응답 시 쌓임';
    renderKpis(); renderTrend(); renderCalib(); renderTypes(); renderBrands(); renderPain(); renderLog();
  }

  // 정확도 추세 — 킬메트릭(맞음율)이 시간·엔진버전에 따라 오르는지. "강해지고 있나"를 눈으로.
  function renderTrend(){
    if(!$('trendDayTable')) return;
    function okRate(g){ return g.n?Math.round(g.ok/g.n*100):0; }
    // 날짜(일)별
    var byDay={};
    DATA.forEach(function(r){ var d=(r.ts||'').slice(0,10); if(!d) return; var g=byDay[d]=byDay[d]||{n:0,ok:0}; g.n++; if(r.verdict==='맞음') g.ok++; });
    var days=Object.keys(byDay).sort();
    var dayRows=days.map(function(d){ var g=byDay[d]; return '<tr><td>'+d+'</td><td class="num">'+g.n+'</td><td>'+bar(okRate(g))+'</td></tr>'; }).join('');
    $('trendDayTable').innerHTML='<thead><tr><th>날짜</th><th>응답</th><th>맞음율(킬메트릭)</th></tr></thead><tbody>'+(dayRows||'<tr><td class="muted" colspan="3">데이터 없음</td></tr>')+'</tbody>';
    // 엔진버전별 (튜닝 before/after)
    var byVer={};
    DATA.forEach(function(r){ var v=r.engineVersion||'?'; var g=byVer[v]=byVer[v]||{n:0,ok:0}; g.n++; if(r.verdict==='맞음') g.ok++; });
    var vers=Object.keys(byVer).sort();
    var verRows=vers.map(function(v){ var g=byVer[v]; return '<tr><td><b>'+esc(v)+'</b></td><td class="num">'+g.n+'</td><td>'+bar(okRate(g))+'</td></tr>'; }).join('');
    $('trendVerTable').innerHTML='<thead><tr><th>엔진 버전</th><th>응답</th><th>맞음율</th></tr></thead><tbody>'+(verRows||'<tr><td class="muted" colspan="3">데이터 없음</td></tr>')+'</tbody>';
    var note=$('trendNote'); if(note){
      var first=days.length?okRate(byDay[days[0]]):null, last=days.length?okRate(byDay[days[days.length-1]]):null;
      note.innerHTML = (days.length>=2)? ('기간 맞음율 '+first+'% → '+last+'% ('+(last-first>=0?'+':'')+(last-first)+'p) · 목표 ≥65%') : '추세를 보려면 여러 날짜의 응답이 필요해요. 엔진 버전을 올리며(engine_version) 맞음율 변화를 비교하세요.';
    }
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
    var rows=list.map(function(r,i){
      var anch=(r.anchors||[]).map(function(a){return esc(a.brandName)+(a.sizeLabel?' '+esc(a.sizeLabel):'');}).join(', ')||'<span class="muted">—</span>';
      var did='dxd'+i, hasRaw=!!(r._raw&&r._raw.experiences&&r._raw.experiences.length);
      // 행 클릭 → 수집 원본 전체 펼침(작업2). 원본 없으면(샘플·브라우저로그) 토글 비활성.
      var main='<tr'+(hasRaw?' style="cursor:pointer" onclick="__dxToggle(\''+did+'\')"':'')+'>'+
        '<td class="muted">'+(hasRaw?'▸ ':'')+esc((r.ts||'').replace('T',' ').slice(0,16))+'</td>'+
        '<td>'+(r.gender?GENLBL[r.gender]||r.gender:'<span class="muted">—</span>')+'</td>'+
        '<td><b>'+esc(r.bodyType)+'</b> '+esc(TYPES[r.bodyType]||'')+'</td>'+
        '<td>'+esc(r.category)+'</td>'+
        '<td>'+anch+'</td>'+
        '<td><span class="pill" style="'+(VBADGE[r.verdict]||'')+'">'+esc(r.verdict)+'</span></td>'+
        '<td class="muted">'+(TIERLBL[r.confidenceTier]||r.confidenceTier)+'</td>'+
        '<td>'+(r.engineImprove?'✓':'<span class="muted">·</span>')+'</td></tr>';
      var detail='<tr id="'+did+'" style="display:none"><td colspan="8" style="background:rgba(31,106,74,.04);font-size:.92em;line-height:1.55">'+expDetail(r._raw)+'</td></tr>';
      return main+detail;
    }).join('');
    $('logTable').innerHTML='<thead><tr><th>시각</th><th>성별</th><th>8유형</th><th>카테고리</th><th>앵커</th><th>정확도</th><th>신뢰도</th><th>동의</th></tr></thead><tbody>'+rows+'</tbody>';
  }
})();
