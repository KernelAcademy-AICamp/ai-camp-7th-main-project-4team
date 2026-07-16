/* admin.js — 3.A 사이즈 수집/데이터 콘솔. web/data/*.json(실파일) 브라우징.
   브랜드 실측(garments.json) 커버리지·필터 + 신체 사이즈(body-base-model/distribution). */
(function(){
  "use strict";
  var $=function(id){ return document.getElementById(id); };
  var esc=function(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); };
  var GENDKO={male:'남',female:'여',unisex:'공용'};
  var CATKO={TOP:'상의',BOTTOM:'하의',OUTER:'아우터',DRESS:'원피스',SKIRT:'치마'};

  window.showTab=function(t){
    ['garments','body'].forEach(function(x){
      var p=$('panel-'+x); if(p) p.classList.toggle('on',x===t);
    });
    [].forEach.call(document.querySelectorAll('#atabs .t'),function(el){ el.classList.toggle('on',el.getAttribute('data-tab')===t); });
  };

  // ── 브랜드 실측(garments.json) ──────────────────────────
  var SPECS=[], ANCHORS=[], ORD={};
  function ordOf(brandId){ var o=ORD[brandId]; return o?o.display_order:100; }   // 진단 노출 순서(brand 테이블)
  Promise.all([ADMINAUTH.garments(), ADMINAUTH.brandOrder()]).then(function(res){
    var j=res[0]||{}; SPECS=j.specs||[]; ANCHORS=(j.$meta&&j.$meta.anchorBrands)||[];
    ORD=res[1]||{};
    renderGarments();
  }).catch(function(){ $('gKpis').innerHTML='<div class="kpi"><div class="l">실측 데이터 로드 실패 · admin 로그인 필요</div></div>'; });

  function uniq(arr){ return arr.filter(function(v,i){ return arr.indexOf(v)===i; }); }

  function renderGarments(){
    var brands=uniq(SPECS.map(function(s){return s.brandName;})).sort();
    var anchorNames=uniq(SPECS.filter(function(s){return ANCHORS.indexOf(s.brandId)>=0;}).map(function(s){return s.brandName;}));
    // KPI
    $('gKpis').innerHTML=[
      kpi(SPECS.length,'실측 specs','브랜드×핏×사이즈 단위'),
      kpi(brands.length,'브랜드',''),
      kpi(anchorNames.length,'앵커 브랜드','착용경험 입력 대상'),
      kpi(uniq(SPECS.map(function(s){return s.brandId+s.category+s.gender+s.fitLine+s.silhouette;})).length,'셀','핏라인/실루엣 조합')
    ].join('');
    // 커버리지: 브랜드 × 카테고리(성별)
    var cov={};
    SPECS.forEach(function(s){
      var k=s.brandName; cov[k]=cov[k]||{brandId:s.brandId,TOP:{},BOTTOM:{}};
      var cat=s.category==='BOTTOM'?'BOTTOM':(s.category==='TOP'?'TOP':null);
      if(cat){ cov[k][cat][s.gender]=(cov[k][cat][s.gender]||0)+1; }
    });
    // 진단 노출 순서(brand 테이블)로 정렬 — 작을수록 위. 동순위는 브랜드명. admin-brands에서 편집.
    var covRows=Object.keys(cov).sort(function(a,b){
      return (ordOf(cov[a].brandId)-ordOf(cov[b].brandId)) || a.localeCompare(b);
    }).map(function(b){
      var c=cov[b], isA=ANCHORS.indexOf(c.brandId)>=0, od=ordOf(c.brandId);
      var obadge=od<100?'<span class="pill" title="진단 노출 순서">'+od+'</span> ':'';
      var cell=function(o){ var m=o.male||0,f=o.female||0,u=o.unisex||0; var t=m+f+u;
        return t?('<span class="num">'+t+'</span> <span class="muted">('+(m?'남'+m:'')+(m&&(f||u)?' ':'')+(f?'여'+f:'')+(u?' 공'+u:'')+')</span>'):'<span class="muted">—</span>'; };
      return '<tr><td>'+obadge+'<a href="admin-garments.html?brand='+encodeURIComponent(b)+'"><b>'+esc(b)+'</b></a> '+(isA?'<span class="anchor">앵커</span>':'')+'</td>'+
        '<td>'+cell(c.TOP)+'</td><td>'+cell(c.BOTTOM)+'</td></tr>';
    }).join('');
    $('covTable').innerHTML='<thead><tr><th>브랜드 <span class="muted" style="font-weight:400">(진단 노출 순서)</span></th><th>상의</th><th>하의</th></tr></thead><tbody>'+covRows+'</tbody>';
    // 필터
    buildFilters(brands);
    applyFilter();
  }

  function buildFilters(brands){
    var cats=uniq(SPECS.map(function(s){return s.category;}));
    var gens=uniq(SPECS.map(function(s){return s.gender;}));
    var fits=uniq(SPECS.map(function(s){return s.fitLine;})).filter(Boolean);
    function sel(id,label,opts,koMap){
      return '<select id="'+id+'" onchange="__af()"><option value="">'+label+' 전체</option>'+
        opts.map(function(o){return '<option value="'+esc(o)+'">'+esc(koMap?(koMap[o]||o):o)+'</option>';}).join('')+'</select>';
    }
    $('gFilters').innerHTML=
      sel('fBrand','브랜드',brands.slice().sort())+
      sel('fCat','카테고리',cats,CATKO)+
      sel('fGen','성별',gens,GENDKO)+
      sel('fFit','핏라인',fits)+
      '<span class="cnt" id="specCnt"></span>';
  }
  window.__af=applyFilter;
  function applyFilter(){
    var fb=val('fBrand'),fc=val('fCat'),fg=val('fGen'),ff=val('fFit');
    var rows=SPECS.filter(function(s){
      return (!fb||s.brandName===fb)&&(!fc||s.category===fc)&&(!fg||s.gender===fg)&&(!ff||s.fitLine===ff);
    });
    $('specCnt').textContent=rows.length.toLocaleString()+' specs';
    var body=rows.slice(0,300).map(function(s){
      var g=s.garmentCm||{};
      var cm=Object.keys(g).map(function(k){return k+':'+g[k];}).join(', ');
      return '<tr><td><b>'+esc(s.brandName)+'</b></td><td>'+(GENDKO[s.gender]||s.gender)+'</td>'+
        '<td>'+(CATKO[s.category]||s.category)+'</td><td>'+esc(s.fitLine||'')+(s.silhouette?' <span class="pill">'+esc(s.silhouette)+'</span>':'')+'</td>'+
        '<td><b>'+esc(s.sizeCanonical||s.sizeLabel)+'</b> <span class="muted">'+esc(s.sizeLabel!==s.sizeCanonical?s.sizeLabel:'')+'</span></td>'+
        '<td class="muted" style="white-space:normal;max-width:280px">'+esc(cm)+'</td>'+
        '<td class="muted">'+esc(s.product||'')+'</td></tr>';
    }).join('');
    $('specTable').innerHTML='<thead><tr><th>브랜드</th><th>성별</th><th>카테고리</th><th>핏/실루엣</th><th>사이즈</th><th>실측(cm, 단면)</th><th>제품</th></tr></thead><tbody>'+body+'</tbody>'+
      (rows.length>300?'':'');
    if(rows.length>300){ $('specCnt').textContent+=' · 상위 300개 표시'; }
  }
  function val(id){ var el=$(id); return el?el.value:''; }
  function kpi(n,l,s){ return '<div class="kpi"><div class="n">'+(typeof n==='number'?n.toLocaleString():n)+'</div><div class="l">'+l+'</div>'+(s?'<div class="s">'+s+'</div>':'')+'</div>'; }

  // ── 신체 사이즈 = 엔진의 신체 추정 기준(회귀 모델 + 인구 분포) ─────
  var BASE=null, DIST=null;
  Promise.all([
    fetch('data/body-base-model.json').then(function(r){return r.json();}).catch(function(){return null;}),
    fetch('data/body-distribution.json').then(function(r){return r.json();}).catch(function(){return null;})
  ]).then(function(res){ BASE=res[0]; DIST=res[1]; renderBody(); });

  function pctFromZ(z){ // 표준정규 CDF(Abramowitz-Stegun 근사) → 백분위(%)
    var t=1/(1+0.2316419*Math.abs(z)), d=0.3989423*Math.exp(-z*z/2);
    var p=d*t*(0.3193815+t*(-0.3565638+t*(1.781478+t*(-1.821256+t*1.330274))));
    p=z>0?1-p:p; return Math.max(1,Math.min(99,Math.round(p*100)));
  }
  function estPart(m,h,w,age){ return m.a_height*h + m.b_weight*w + (m.c_age||0)*age + m.intercept; }
  function f(x){ return x==null?'—':(''+x); }

  function renderBody(){
    if(!BASE){ $('bKpis').innerHTML='<div class="kpi"><div class="l">신체 데이터 로드 실패</div></div>'; return; }
    var meta=BASE._meta||{}, r2s=[], ns=[];
    ['male','female'].forEach(function(g){ Object.keys(BASE[g]||{}).forEach(function(k){ var m=BASE[g][k]; if(m.r2!=null)r2s.push(m.r2); if(m.n!=null)ns.push(m.n); }); });
    var avgR2=r2s.length?(r2s.reduce(function(a,b){return a+b;},0)/r2s.length):null;
    $('bKpis').innerHTML=[
      kpi(Object.keys(BASE.male||{}).length,'추정 부위','회귀 모델'),
      kpi(avgR2!=null?avgR2.toFixed(2):'—','평균 r²','1에 가까울수록 적합'),
      kpi(ns.length?Math.min.apply(null,ns):'—','최소 표본','부위별 n 하한'),
      kpi('8차','출처',meta.attribution||'사이즈코리아')
    ].join('');
    buildEst(); renderEst(); buildModelFilter(); renderModel(); renderDist();
  }

  // 추정 미리보기 — 이 입력으로 엔진이 뽑는 몸(회귀식 직접 적용)
  function buildEst(){
    $('bEstIn').innerHTML=
      selRaw('eGen',[['female','여성'],['male','남성']],'female','__be')+
      numIn('eH','키(cm)',170)+numIn('eW','몸무게(kg)',65)+numIn('eA','나이',28)+
      '<span class="cnt">부위cm = a·키 + b·몸무게 + c·나이 + 절편</span>';
  }
  window.__be=function(){
    var g=val('eGen'), h=+val('eH')||0, w=+val('eW')||0, age=+val('eA')||0;
    var src=BASE[g]||{}, dist=(DIST&&DIST[g])||{};
    var rows=Object.keys(src).map(function(k){
      var m=src[k], cm=estPart(m,h,w,age), d=dist[k];
      var pct=(d&&d.sd)?pctFromZ((cm-d.mean)/d.sd):null;
      return '<tr><td>'+esc(m.label||k)+' <span class="muted">'+k+'</span></td>'+
        '<td class="num"><b>'+cm.toFixed(1)+'</b> cm</td>'+
        '<td class="num">'+(pct==null?'—':pct+'%tile')+'</td>'+
        '<td class="num muted">'+(m.r2!=null?'r² '+m.r2:'')+'</td></tr>';
    }).join('');
    $('bEstTable').innerHTML='<thead><tr><th>부위</th><th>추정 치수</th><th>인구 백분위</th><th>적합도</th></tr></thead><tbody>'+rows+'</tbody>';
  };
  function renderEst(){ window.__be(); }

  // 회귀 모델 품질 — 관리자 모니터링(어느 부위가 신뢰도 낮은지)
  function buildModelFilter(){ $('bModelFilter').innerHTML=selRaw('mGen',[['female','여성'],['male','남성']],'female','__bm')+'<span class="cnt">r²·RMSE·표본으로 부위별 추정 신뢰도 점검</span>'; }
  window.__bm=function(){
    var g=val('mGen')||'female', src=BASE[g]||{};
    var rows=Object.keys(src).map(function(k){ var m=src[k];
      var q=m.r2==null?'':(m.r2>=0.75?'<span class="anchor">양호</span>':m.r2>=0.55?'<span class="pill">보통</span>':'<span class="pill" style="color:var(--warn);background:var(--warn-soft)">낮음</span>');
      return '<tr><td>'+esc(m.label||k)+' <span class="muted">'+k+'</span></td>'+
        '<td class="num">'+f(m.a_height)+'</td><td class="num">'+f(m.b_weight)+'</td><td class="num">'+f(m.c_age)+'</td><td class="num">'+f(m.intercept)+'</td>'+
        '<td class="num"><b>'+f(m.r2)+'</b> '+q+'</td><td class="num">'+(m.rmse_cm==null?'—':'±'+m.rmse_cm)+'</td><td class="num muted">'+(m.n==null?'—':m.n.toLocaleString())+'</td></tr>';
    }).join('');
    $('bModelTable').innerHTML='<thead><tr><th>부위</th><th>키계수</th><th>몸무게계수</th><th>나이계수</th><th>절편</th><th>r²</th><th>RMSE(cm)</th><th>표본 n</th></tr></thead><tbody>'+rows+'</tbody>';
  };
  function renderModel(){ window.__bm(); }

  function renderDist(){
    if(!DIST){ $('bDistTable').innerHTML=''; return; }
    var keys=Object.keys(DIST.female||DIST.male||{});
    var rows=keys.map(function(k){
      var fe=(DIST.female||{})[k]||{}, ma=(DIST.male||{})[k]||{};
      return '<tr><td>'+esc(fe.label||ma.label||k)+' <span class="muted">'+k+'</span></td>'+
        '<td class="num">'+f(fe.p5)+' / <b>'+f(fe.p50)+'</b> / '+f(fe.p95)+' <span class="muted">±'+f(fe.sd)+'</span></td>'+
        '<td class="num">'+f(ma.p5)+' / <b>'+f(ma.p50)+'</b> / '+f(ma.p95)+' <span class="muted">±'+f(ma.sd)+'</span></td></tr>';
    }).join('');
    $('bDistTable').innerHTML='<thead><tr><th>부위</th><th>여성 P5 / P50 / P95</th><th>남성 P5 / P50 / P95</th></tr></thead><tbody>'+rows+'</tbody>';
  }

  function selRaw(id,opts,cur,cb){ return '<select id="'+id+'" onchange="'+(cb||'__be')+'()">'+opts.map(function(o){return '<option value="'+o[0]+'"'+(o[0]===cur?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select>'; }
  function numIn(id,label,def){ return '<label class="numin">'+label+' <input id="'+id+'" type="number" value="'+def+'" oninput="__be()"></label>'; }
})();
