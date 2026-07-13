/* admin-brands.js — 3.A.1 브랜드 관리. garments.json 기준 브랜드별 커버리지·앵커·갭.
   앵커/실측은 생성물(CSV→garments.json) — 여기선 조회 + 실측표/수집 진입점. */
(function(){
  "use strict";
  var $=function(id){return document.getElementById(id);};
  var esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};
  var GEN=['female','male'];
  function kpi(n,l,s){return '<div class="kpi"><div class="n">'+(typeof n==='number'?n.toLocaleString():n)+'</div><div class="l">'+l+'</div>'+(s?'<div class="s">'+s+'</div>':'')+'</div>';}
  function uniq(a){return a.filter(function(v,i){return a.indexOf(v)===i;});}

  var BRANDS=[], onlyAnchor=false;
  fetch('data/garments.json').then(function(r){return r.json();}).then(function(j){
    var specs=j.specs||[], anchors=(j.$meta&&j.$meta.anchorBrands)||[];
    var by={};
    specs.forEach(function(s){
      var b=by[s.brandId]||(by[s.brandId]={id:s.brandId,name:s.brandName,anchor:anchors.indexOf(s.brandId)>=0,
        n:0, cat:{TOP:{male:0,female:0,unisex:0},BOTTOM:{male:0,female:0,unisex:0}}, fits:{}, sils:{}, sizes:{}});
      b.n++;
      if(b.cat[s.category]) b.cat[s.category][s.gender]=(b.cat[s.category][s.gender]||0)+1;
      if(s.fitLine)b.fits[s.fitLine]=1; if(s.silhouette)b.sils[s.silhouette]=1; if(s.sizeCanonical)b.sizes[s.sizeCanonical]=1;
    });
    BRANDS=Object.keys(by).map(function(k){return by[k];}).sort(function(a,b){return (b.anchor-a.anchor)||(b.n-a.n);});
    renderKpis(anchors); buildFilters(); render();
  }).catch(function(){ $('brandTable').innerHTML='<tbody><tr><td>garments.json 로드 실패</td></tr></tbody>'; });

  function renderKpis(anchors){
    var na=BRANDS.filter(function(b){return b.anchor;}).length;
    $('bkKpis').innerHTML=[
      kpi(BRANDS.length,'브랜드',''),
      kpi(na,'앵커 브랜드','착용경험 입력 대상'),
      kpi(BRANDS.reduce(function(s,b){return s+b.n;},0),'총 실측 specs',''),
      kpi(BRANDS.filter(function(b){return b.cat.TOP.male+b.cat.TOP.female>0 && b.cat.BOTTOM.male+b.cat.BOTTOM.female>0;}).length,'상+하 보유','상·하의 둘 다')
    ].join('');
  }
  function buildFilters(){
    $('bkFilters').innerHTML='<label class="numin"><input type="checkbox" id="fAnchor" onchange="__bkf()"><span>앵커만</span></label>'+
      '<span class="cnt" id="bkCnt"></span>';
  }
  window.__bkf=function(){ onlyAnchor=$('fAnchor')&&$('fAnchor').checked; render(); };

  function catCell(o){ var m=o.male||0,f=o.female||0,u=o.unisex||0,t=m+f+u;
    return t?('<span class="num">'+t+'</span> <span class="muted">('+(f?'여'+f:'')+(f&&m?' ':'')+(m?'남'+m:'')+(u?' 공'+u:'')+')</span>'):'<span class="muted">—</span>'; }

  function render(){
    var list=onlyAnchor?BRANDS.filter(function(b){return b.anchor;}):BRANDS;
    $('bkCnt').textContent=list.length+' 브랜드';
    var rows=list.map(function(b){
      var fits=Object.keys(b.fits).length, sils=Object.keys(b.sils).length, sz=Object.keys(b.sizes).length;
      var q=encodeURIComponent(b.name);
      return '<tr><td><b>'+esc(b.name)+'</b> '+(b.anchor?'<span class="anchor">앵커</span>':'<span class="pill">비앵커</span>')+'</td>'+
        '<td>'+catCell(b.cat.TOP)+'</td><td>'+catCell(b.cat.BOTTOM)+'</td>'+
        '<td class="muted num">핏'+fits+' · 실루엣'+sils+' · 사이즈'+sz+'</td>'+
        '<td class="num">'+b.n+'</td>'+
        '<td><a class="pill" style="color:var(--green);background:var(--green-soft);text-decoration:none" href="admin-garments.html?brand='+q+'">실측표</a> '+
          '<a class="pill" style="text-decoration:none" href="admin-collect.html?brand='+q+'">수집</a></td></tr>';
    }).join('');
    $('brandTable').innerHTML='<thead><tr><th>브랜드</th><th>상의</th><th>하의</th><th>다양성</th><th>specs</th><th>작업</th></tr></thead><tbody>'+rows+'</tbody>';
    renderGaps();
  }
  function renderGaps(){
    var gaps=[];
    BRANDS.filter(function(b){return b.anchor;}).forEach(function(b){
      ['TOP','BOTTOM'].forEach(function(cat){ GEN.forEach(function(g){
        if((b.cat[cat][g]||0)===0) gaps.push({brand:b.name, cat:cat==='TOP'?'상의':'하의', gen:g==='male'?'남성':'여성', q:encodeURIComponent(b.name)});
      }); });
    });
    if(!gaps.length){ $('gapTable').innerHTML='<tbody><tr><td class="muted">앵커 브랜드의 상·하의 × 남/여 커버리지 갭 없음 ✓</td></tr></tbody>'; return; }
    var rows=gaps.map(function(g){ return '<tr><td><b>'+esc(g.brand)+'</b></td><td>'+g.cat+'</td><td>'+g.gen+'</td>'+
      '<td><a class="pill" style="text-decoration:none" href="admin-collect.html?brand='+g.q+'">수집하기 →</a></td></tr>'; }).join('');
    $('gapTable').innerHTML='<thead><tr><th>브랜드</th><th>카테고리</th><th>성별</th><th>작업</th></tr></thead><tbody>'+rows+'</tbody>';
  }
})();
