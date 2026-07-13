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
  var SPECS=[], ANCHORS=[];
  fetch('data/garments.json').then(function(r){return r.json();}).then(function(j){
    SPECS=j.specs||[]; ANCHORS=(j.$meta&&j.$meta.anchorBrands)||[];
    renderGarments();
  }).catch(function(){ $('gKpis').innerHTML='<div class="kpi"><div class="l">garments.json 로드 실패</div></div>'; });

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
    var covRows=Object.keys(cov).sort().map(function(b){
      var c=cov[b], isA=ANCHORS.indexOf(c.brandId)>=0;
      var cell=function(o){ var m=o.male||0,f=o.female||0,u=o.unisex||0; var t=m+f+u;
        return t?('<span class="num">'+t+'</span> <span class="muted">('+(m?'남'+m:'')+(m&&(f||u)?' ':'')+(f?'여'+f:'')+(u?' 공'+u:'')+')</span>'):'<span class="muted">—</span>'; };
      return '<tr><td><a href="admin-garments.html?brand='+encodeURIComponent(b)+'"><b>'+esc(b)+'</b></a> '+(isA?'<span class="anchor">앵커</span>':'')+'</td>'+
        '<td>'+cell(c.TOP)+'</td><td>'+cell(c.BOTTOM)+'</td></tr>';
    }).join('');
    $('covTable').innerHTML='<thead><tr><th>브랜드</th><th>상의</th><th>하의</th></tr></thead><tbody>'+covRows+'</tbody>';
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

  // ── 신체 사이즈(body-base-model + body-distribution) ─────
  Promise.all([
    fetch('data/body-base-model.json').then(function(r){return r.json();}).catch(function(){return null;}),
    fetch('data/body-distribution.json').then(function(r){return r.json();}).catch(function(){return null;})
  ]).then(function(res){ renderBody(res[0],res[1]); });

  function flat(o,pre){ // 중첩 dict → {경로:값}
    var out={}; pre=pre||'';
    if(o&&typeof o==='object'&&!Array.isArray(o)){
      Object.keys(o).forEach(function(k){ if(k==='_meta')return; var v=o[k];
        if(v&&typeof v==='object'&&!Array.isArray(v)) Object.assign(out,flat(v,pre+k+'.'));
        else out[pre+k]=Array.isArray(v)?v.join(' / '):v;
      });
    }
    return out;
  }
  function renderBody(base,dist){
    if(!base){ $('bKpis').innerHTML='<div class="kpi"><div class="l">신체 데이터 로드 실패</div></div>'; return; }
    var mf=flat(base.male), ff=flat(base.female);
    var keys=Object.keys(mf).length>=Object.keys(ff).length?Object.keys(mf):Object.keys(ff);
    $('bKpis').innerHTML=[
      kpi(keys.length,'신체 지표','성별 기준값'),
      kpi(2,'성별','남·여'),
      kpi(base._meta&&base._meta.source?'':'사이즈코리아','출처',base._meta&&base._meta.source?base._meta.source:'회귀 base model')
    ].join('');
    var $b=$('bFilters'); if($b) $b.innerHTML='<span class="pill">body-base-model.json</span>'+(dist?'<span class="pill">body-distribution.json</span>':'')+'<span class="cnt">성별별 신체 기준값</span>';
    var rows=keys.map(function(k){
      return '<tr><td>'+esc(k)+'</td><td class="num">'+esc(mf[k]==null?'—':mf[k])+'</td><td class="num">'+esc(ff[k]==null?'—':ff[k])+'</td></tr>';
    }).join('');
    $('bodyTable').innerHTML='<thead><tr><th>지표</th><th>남성</th><th>여성</th></tr></thead><tbody>'+rows+'</tbody>';
  }
})();
