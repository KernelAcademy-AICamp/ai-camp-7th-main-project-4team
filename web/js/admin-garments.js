/* admin-garments.js — 3.A.1 브랜드·제품별 실측표. garments.json을 사이즈표(사이즈×부위 cm) 형태로.
   생성물(garments.json) 뷰어 — 수정은 CSV+build-sizespec.py 파이프라인(직접 편집 금지). */
(function(){
  "use strict";
  var $=function(id){ return document.getElementById(id); };
  var esc=function(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); };
  var GENDKO={male:'남성',female:'여성',unisex:'공용'};
  var CATKO={TOP:'상의',BOTTOM:'하의',OUTER:'아우터',DRESS:'원피스',SKIRT:'치마'};
  // 부위(garmentCm 키) → 한글 라벨·순서(카테고리별)
  var PARTS={
    TOP:    [['length','총장'],['shoulder','어깨너비'],['chest','가슴단면'],['sleeve','소매길이']],
    BOTTOM: [['waist','허리단면'],['hip','엉덩이단면'],['thigh','허벅지단면'],['rise','밑위'],['length','총장'],['hem','밑단단면']]
  };
  var FITKO={slim:'슬림',regular:'레귤러',loose:'루즈',oversize:'오버',skinny:'스키니',
    straight:'스트레이트',tapered:'테이퍼드',wide:'와이드',bootcut:'부츠컷'};

  var SPECS=[], ANCHORS=[];
  var q=new URLSearchParams(location.search);

  fetch('data/garments.json').then(function(r){return r.json();}).then(function(j){
    SPECS=j.specs||[]; ANCHORS=(j.$meta&&j.$meta.anchorBrands)||[];
    buildFilters(); render();
  }).catch(function(){ $('gsCharts').innerHTML='<p class="subnote">garments.json 로드 실패</p>'; });

  function uniq(a){ return a.filter(function(v,i){return a.indexOf(v)===i;}); }
  function val(id){ var el=$(id); return el?el.value:''; }

  function buildFilters(){
    var brands=uniq(SPECS.map(function(s){return s.brandName;})).sort();
    var pre=q.get('brand')||brands[0]||'';
    function sel(id,label,opts,cur,koMap){
      return '<select id="'+id+'" onchange="__gsr()">'+
        opts.map(function(o){return '<option value="'+esc(o)+'"'+(o===cur?' selected':'')+'>'+esc(koMap?(koMap[o]||o):o)+'</option>';}).join('')+'</select>';
    }
    $('gsFilters').innerHTML=
      sel('sBrand','브랜드',brands,pre)+
      sel('sGen','성별',['female','male','unisex'],(q.get('g')||'female'),GENDKO)+
      sel('sCat','카테고리',['TOP','BOTTOM'],(q.get('cat')||'TOP'),CATKO)+
      '<span class="cnt" id="gsCnt"></span>';
  }
  window.__gsr=render;

  function render(){
    var brand=val('sBrand'), gen=val('sGen'), cat=val('sCat');
    var rows=SPECS.filter(function(s){ return s.brandName===brand && s.category===cat &&
      (s.gender===gen || (gen==='unisex'&&s.gender==='unisex')); });
    var isA=rows[0]&&ANCHORS.indexOf(rows[0].brandId)>=0;
    // 제품별 그룹 → 각 제품 사이즈표
    var byProd={};
    rows.forEach(function(s){ var p=s.product||'(제품명 없음)'; (byProd[p]=byProd[p]||[]).push(s); });
    var prods=Object.keys(byProd);
    $('gsCnt').textContent=rows.length?(prods.length+'개 제품 · '+rows.length+' 사이즈행'):'데이터 없음';
    if(!rows.length){ $('gsCharts').innerHTML='<p class="subnote">이 브랜드·성별·카테고리 조합의 실측 데이터가 없어요.</p>'; return; }
    var parts=PARTS[cat]||PARTS.TOP;
    var html='<div class="gshead"><h1>'+esc(brand)+' '+(isA?'<span class="anchor">앵커</span>':'')+'</h1>'+
      '<span class="gsmeta">'+GENDKO[gen]+' · '+CATKO[cat]+' · 단면(cm) 원본</span></div>';
    html+=prods.map(function(p){
      var list=byProd[p].slice().sort(function(a,b){ return (a.sizeOrder==null?99:a.sizeOrder)-(b.sizeOrder==null?99:b.sizeOrder); });
      var cell=list[0]; var axis=(cat==='BOTTOM')?cell.silhouette:cell.fitLine;
      var head='<tr><th>사이즈</th>'+parts.map(function(pp){return '<th>'+pp[1]+'</th>';}).join('')+'</tr>';
      var body=list.map(function(s){
        var g=s.garmentCm||{};
        var szMain=esc(s.sizeCanonical||s.sizeLabel);
        var szRaw=(s.sizeLabel!==s.sizeCanonical)?(' <span class="muted">'+esc(s.sizeLabel)+'</span>'):'';
        return '<tr><td><b>'+szMain+'</b>'+szRaw+'</td>'+
          parts.map(function(pp){ var v=g[pp[0]]; return '<td class="num">'+(v==null?'<span class="muted">—</span>':v)+'</td>'; }).join('')+'</tr>';
      }).join('');
      return '<div class="gscard">'+
        '<div class="gscard-h"><b>'+esc(p)+'</b>'+
          (axis?'<span class="pill">'+esc(FITKO[axis]||axis)+'</span>':'')+
          '<span class="muted">'+list.length+' 사이즈</span></div>'+
        '<div class="tablewrap"><table class="dt sizechart"><thead>'+head+'</thead><tbody>'+body+'</tbody></table></div>'+
        '</div>';
    }).join('');
    $('gsCharts').innerHTML=html;
  }
})();
