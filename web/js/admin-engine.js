/* admin-engine.js — 3.A.3 엔진 시뮬레이터·튜닝.
   몸 → 브랜드 사이즈 파이프라인을 실엔진(BodyModel 회귀 + FitEngine)으로 재현하고,
   여유·핏스코어·병목을 분해. 목표여유 슬라이더로 튜닝 감도 확인.
   ※ 파라미터 표시/래더 what-if는 engine.js 상수를 미러(정본은 engine.js·docs/6). 실추천은 FitEngine. */
(function(){
  "use strict";
  var $=function(id){return document.getElementById(id);};
  var esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};
  var GENDKO={male:'남성',female:'여성'};
  // engine.js 미러(표시·래더용). 정본=engine.js.
  var BANDS={'TOP:chest':{tight:2,snug:8,big:16},'TOP:shoulder':{tight:0,snug:1.5,big:4},
    'TOP:belly':{tight:0,snug:8,big:18},'BOTTOM:waist':{tight:0,snug:4,big:10},
    'BOTTOM:hip':{tight:0,snug:6,big:14},'BOTTOM:thigh':{tight:0,snug:5,big:12}};
  var TARGET={TOP:5,BOTTOM:2};                 // 가슴/허리 목표 여유(cm)
  var CIRC={chest:1,waist:1,hip:1,thigh:1};    // 둘레부위(단면×2)
  var RATEKO={TIGHT:'끼임',SNUG:'딱맞음',RELAXED:'여유',BIG:'넉넉'};
  var PREF_TOP=[['skinny','스키니'],['slim','슬림'],['regular','레귤러'],['loose','루즈'],['oversize','오버']];
  var PREF_BOT=[['skinny','스키니'],['slim','슬림'],['straight','스트레이트'],['tapered','테이퍼드'],['wide','와이드'],['bootcut','부츠컷']];

  var SPECS=[], BASE=null, DIST=null, curTarget=null;

  Promise.all([
    ADMINAUTH.garments(),
    fetch('data/body-base-model.json').then(function(r){return r.json();}).catch(function(){return null;}),
    fetch('data/body-distribution.json').then(function(r){return r.json();}).catch(function(){return null;})
  ]).then(function(a){ SPECS=a[0].specs||[]; BASE=a[1]; DIST=a[2]; buildInput(); run(); })
   .catch(function(){ $('recTable').innerHTML='<tbody><tr><td>데이터 로드 실패</td></tr></tbody>'; });

  function val(id){var el=$(id);return el?el.value:'';}
  function pctFromZ(z){var t=1/(1+0.2316419*Math.abs(z)),d=0.3989423*Math.exp(-z*z/2);
    var p=d*t*(0.3193815+t*(-0.3565638+t*(1.781478+t*(-1.821256+t*1.330274))));p=z>0?1-p:p;return Math.max(1,Math.min(99,Math.round(p*100)));}
  function estCm(g,key,h,w,age){var m=(BASE&&BASE[g]||{})[key];return m?(m.a_height*h+m.b_weight*w+(m.c_age||0)*age+m.intercept):null;}
  function bodyAxis(part,flat){return CIRC[part]?flat*2:flat;}

  function buildInput(){
    function opt(o,cur){return o.map(function(x){return '<option value="'+x[0]+'"'+(x[0]===cur?' selected':'')+'>'+x[1]+'</option>';}).join('');}
    $('simIn').innerHTML=
      row('성별','<select id="iGen" onchange="__run(1)">'+opt([['female','여성'],['male','남성']],'female')+'</select>')+
      row('카테고리','<select id="iCat" onchange="__run(1)">'+opt([['TOP','상의'],['BOTTOM','하의']],'TOP')+'</select>')+
      row('키(cm)','<input id="iH" type="number" value="170" oninput="__run()">')+
      row('몸무게(kg)','<input id="iW" type="number" value="65" oninput="__run()">')+
      row('나이','<input id="iA" type="number" value="28" oninput="__run()">')+
      row('선호핏','<select id="iPref" onchange="__run()"></select>');
    syncPref();
  }
  function row(l,ctrl){return '<label class="numin"><span>'+l+'</span>'+ctrl+'</label>';}
  function syncPref(){
    var cat=val('iCat')||'TOP', el=$('iPref'); if(!el)return;
    var opts=cat==='TOP'?PREF_TOP:PREF_BOT, cur=el.value;
    el.innerHTML=opts.map(function(x){return '<option value="'+x[0]+'"'+((x[0]===cur||x[0]===(cat==='TOP'?'regular':'straight'))?' selected':'')+'>'+x[1]+'</option>';}).join('');
  }
  window.__run=function(catChanged){ if(catChanged) syncPref(); run(); };

  function run(){
    var g=val('iGen'), cat=val('iCat'), h=+val('iH')||0, w=+val('iW')||0, age=+val('iA')||0, pref=val('iPref');
    // 2 · 신체 추정
    var keys=cat==='TOP'?['chestFull','shoulder']:['waist','hip'];
    var body={};
    var estRows=keys.map(function(k){
      var cm=estCm(g,k,h,w,age); body[k]=cm;
      var d=(DIST&&DIST[g]||{})[k]; var pct=(cm!=null&&d&&d.sd)?pctFromZ((cm-d.mean)/d.sd):null;
      var lbl=(BASE&&BASE[g]&&BASE[g][k]&&BASE[g][k].label)||k;
      return '<tr><td>'+esc(lbl)+' <span class="muted">'+k+'</span></td><td class="num"><b>'+(cm==null?'—':cm.toFixed(1))+'</b> cm</td><td class="num">'+(pct==null?'—':pct+'%tile')+'</td></tr>';
    }).join('');
    $('bodyEst').innerHTML='<thead><tr><th>부위</th><th>추정</th><th>백분위</th></tr></thead><tbody>'+estRows+'</tbody>'+
      (cat==='BOTTOM'?'<tbody><tr><td class="muted">허벅지</td><td class="muted">회귀 없음(역산 전용)</td><td>—</td></tr></tbody>':'');

    // 3 · 실엔진 추천
    var recs, bodyVec;
    if(cat==='TOP'){ bodyVec={chest:body.chestFull, shoulder:body.shoulder};
      recs=window.FitEngine?FitEngine.recommend(bodyVec, pref, g, 'long_sleeve', SPECS):[]; }
    else { bodyVec={waist:body.waist, hip:body.hip};
      recs=window.FitEngine?FitEngine.recommendBottom(bodyVec, pref, g, 'long_pants', SPECS):[]; }
    renderRecs(recs, cat);
    // 4 · 래더(추천 브랜드 중 선택)
    buildLadderPick(recs, cat);
    if(curTarget==null) curTarget=TARGET[cat];
    renderTuner(cat); renderLadder(cat, bodyVec, pref, g);
    // 5 · 파라미터
    renderParams(cat);
    window.__ctx={cat:cat, bodyVec:bodyVec, pref:pref, g:g};
  }

  function renderRecs(recs, cat){
    if(!recs||!recs.length){ $('recTable').innerHTML='<tbody><tr><td class="muted">이 입력으로 추천 가능한 브랜드가 없어요(데이터/핏 부재).</td></tr></tbody>'; return; }
    var easeL=cat==='TOP'?'가슴 여유':'허리 여유';
    var rows=recs.map(function(r,i){
      var e=cat==='TOP'?r.chestEase:r.waistEase;
      var score=r.fitScore||0, bar='<span class="s2fill" style="width:'+score+'%"></span>';
      return '<tr'+(i===0?' class="top"':'')+'><td><b>'+esc(r.brandName)+'</b>'+(r.variance?' <span class="pill" style="color:var(--warn);background:var(--warn-soft)">'+esc(r.variance)+'</span>':'')+'</td>'+
        '<td>'+esc(r.fitLine)+'</td><td><b class="num">'+esc(r.size)+'</b></td>'+
        '<td>'+esc(r.fit)+(r.warn?' ⚠️':'')+'</td>'+
        '<td class="num">'+(e==null?'—':e+'cm')+'</td><td>'+esc(r.bottleneck)+'</td>'+
        '<td class="scorecell"><span class="bar">'+bar+'</span><b class="num">'+score+'</b></td></tr>';
    }).join('');
    $('recTable').innerHTML='<thead><tr><th>브랜드</th><th>핏</th><th>추천 사이즈</th><th>착용감</th><th>'+easeL+'</th><th>병목</th><th>핏지수</th></tr></thead><tbody>'+rows+'</tbody>';
  }

  function buildLadderPick(recs, cat){
    var brands=(recs||[]).map(function(r){return r.brandId+'|'+r.brandName+'|'+r.fitLine;});
    $('ladderPick').innerHTML='<label class="simrow" style="max-width:320px"><span>브랜드</span><select id="ladBrand" onchange="__lad()">'+
      brands.map(function(b,i){var p=b.split('|');return '<option value="'+esc(p[0])+'|'+esc(p[2])+'"'+(i===0?' selected':'')+'>'+esc(p[1])+' · '+esc(p[2])+'</option>';}).join('')+
      '</select></label>';
  }
  window.__lad=function(){ var c=window.__ctx; renderLadder(c.cat,c.bodyVec,c.pref,c.g); };

  function renderTuner(cat){
    var lbl=cat==='TOP'?'가슴':'허리', def=TARGET[cat];
    $('tuner').innerHTML='<div class="tunerbox"><span class="tl">목표 '+lbl+' 여유</span>'+
      '<input type="range" id="tRange" min="0" max="14" step="0.5" value="'+curTarget+'" oninput="__tune()">'+
      '<b class="num" id="tVal">'+curTarget+'</b> cm '+
      '<span class="muted">(엔진 기본 '+def+'cm) — 슬라이더로 어느 사이즈가 뽑히는지 감도 확인</span>'+
      '<a class="alink" onclick="__treset()">기본값</a></div>';
  }
  window.__tune=function(){ curTarget=+val('tRange'); var v=$('tVal'); if(v)v.textContent=curTarget; var c=window.__ctx; renderLadder(c.cat,c.bodyVec,c.pref,c.g); };
  window.__treset=function(){ curTarget=TARGET[window.__ctx.cat]; renderTuner(window.__ctx.cat); window.__tune(); };

  // 사이즈 래더: 선택 브랜드·핏의 모든 사이즈 여유·등급. 목표(curTarget)에 가장 가까운=추천.
  function renderLadder(cat, bodyVec, pref, g){
    var sel=val('ladBrand'); if(!sel){ $('ladderTable').innerHTML=''; return; }
    var bid=sel.split('|')[0], fl=sel.split('|')[1];
    var keyPart=cat==='TOP'?'chest':'waist', bodyMain=cat==='TOP'?bodyVec.chest:bodyVec.waist;
    var axisField=cat==='TOP'?'fitLine':'silhouette';
    var rows=SPECS.filter(function(s){return s.brandId===bid && s.category===cat && s[axisField]===fl &&
      (s.gender===g||s.gender==='unisex') && s.garmentCm && s.garmentCm[keyPart]!=null;});
    // 사이즈별 단면 평균
    var bySize={};
    rows.forEach(function(s){ var e=bySize[s.sizeLabel]||(bySize[s.sizeLabel]={label:s.sizeLabel,canon:s.sizeCanonical,order:s.sizeOrder,flat:[],sec:[]});
      e.flat.push(s.garmentCm[keyPart]); var sk=cat==='TOP'?'shoulder':'hip'; if(s.garmentCm[sk]!=null)e.sec.push(s.garmentCm[sk]); });
    var sizes=Object.keys(bySize).map(function(k){return bySize[k];})
      .sort(function(a,b){return (a.order==null?99:a.order)-(b.order==null?99:b.order);});
    function avg(a){return a.reduce(function(x,y){return x+y;},0)/a.length;}
    var band=BANDS[cat+':'+keyPart];
    // 각 사이즈 여유·등급
    sizes.forEach(function(s){ var flat=avg(s.flat); s.ax=bodyAxis(keyPart,flat); s.ease=s.ax-(bodyMain||0);
      s.rate=s.ease<=band.tight?'TIGHT':s.ease<=band.snug?'SNUG':s.ease<=band.big?'RELAXED':'BIG'; });
    // 추천(현재 목표기준): 목표에 가장 가까운 여유
    var pick=sizes.slice().sort(function(a,b){return Math.abs(a.ease-curTarget)-Math.abs(b.ease-curTarget);})[0];
    var partKo=cat==='TOP'?'가슴 단면':'허리 단면';
    var body=sizes.map(function(s){
      var dev=Math.abs(s.ease-curTarget);
      var isPick=pick&&s.label===pick.label;
      return '<tr'+(isPick?' class="top"':'')+'><td><b>'+esc(s.canon||s.label)+'</b> '+(isPick?'<span class="anchor">추천</span>':'')+'</td>'+
        '<td class="num">'+avg(s.flat).toFixed(1)+'</td><td class="num">'+s.ax.toFixed(1)+'</td>'+
        '<td class="num"><b>'+s.ease.toFixed(1)+'</b></td><td>'+RATEKO[s.rate]+'</td>'+
        '<td class="num muted">'+dev.toFixed(1)+'</td></tr>';
    }).join('');
    $('ladderTable').innerHTML='<thead><tr><th>사이즈</th><th>'+partKo+'(cm)</th><th>×2 둘레</th><th>여유(cm)</th><th>등급</th><th>|목표−여유|</th></tr></thead><tbody>'+body+'</tbody>'+
      '<tbody><tr><td colspan="6" class="muted" style="white-space:normal">여유 = 둘레(단면×2) − 내 '+(cat==='TOP'?'가슴':'허리')+'('+ (bodyMain?bodyMain.toFixed(1):'—') +'cm). 밴드: 끼임≤'+band.tight+' · 딱맞음≤'+band.snug+' · 넉넉≤'+band.big+'. 추천 = |목표−여유| 최소.</td></tr></tbody>';
  }

  function renderParams(cat){
    var bandRows=Object.keys(BANDS).filter(function(k){return k.indexOf(cat+':')===0;}).map(function(k){
      var b=BANDS[k], part=k.split(':')[1];
      return '<tr><td><b>'+part+'</b> 여유밴드</td><td class="num">끼임 ≤ '+b.tight+'</td><td class="num">딱맞음 ≤ '+b.snug+'</td><td class="num">넉넉 ≤ '+b.big+'</td></tr>';
    }).join('');
    var extra=cat==='TOP'
      ? '<tr><td><b>목표 가슴 여유</b></td><td class="num" colspan="3">5cm (SNUG 중앙) — 사이즈는 이 근처를 겨냥</td></tr>'+
        '<tr><td><b>핏지수 가중치</b></td><td class="num" colspan="3">가슴편차 ×5.5 · 어깨편차 ×7 (끼임 큰 감점)</td></tr>'
      : '<tr><td><b>목표 허리 여유</b></td><td class="num" colspan="3">2cm (SNUG 중앙)</td></tr>'+
        '<tr><td><b>핏지수 가중치</b></td><td class="num" colspan="3">허리 ×4 · 엉덩이 ×3.5 · 허벅지 ×2.5</td></tr>'+
        '<tr><td><b>밴딩 보정</b></td><td class="num" colspan="3">허리 밴딩 시 끼임 경계 −4cm 완화(신축)</td></tr>';
    $('paramPanel').innerHTML='<div class="tablewrap"><table class="dt"><thead><tr><th>파라미터</th><th colspan="3">값 (단위 cm)</th></tr></thead><tbody>'+bandRows+extra+'</tbody></table></div>'+
      '<p class="subnote" style="margin-top:12px">이 값들이 <b>튜닝 레버</b>예요. 변경은 <span class="pill">engine.js</span>(정본)에서 — 하의 밴드는 아직 가설값이라 실피드백으로 조정 필요(3.A.2 수집 정확도 모니터링과 연결). 위 슬라이더는 목표여유만 임시로 바꿔 감도를 보는 what-if입니다(실엔진 미변경).</p>';
  }
})();
