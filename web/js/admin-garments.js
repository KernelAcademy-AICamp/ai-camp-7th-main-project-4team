/* admin-garments.js — 3.A.1 브랜드·제품별 실측표 (조회 + CRUD).  [db/05]
   garment 테이블(DB) 직접 편집: 사이즈행 cm 인라인 수정 · 행 추가/삭제. 저장 시 rev↑ → 진단 즉시 반영.
   저장 = 현재 뷰(브랜드×성별×카테고리) 행을 새로 insert 후 기존 id 삭제(교체). 대량 수집은 CSV→build→import 유지. */
(function(){
  "use strict";
  var $=function(id){ return document.getElementById(id); };
  var esc=function(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); };
  var GENDKO={male:'남성',female:'여성',unisex:'공용'};
  var CATKO={TOP:'상의',BOTTOM:'하의',OUTER:'아우터',DRESS:'원피스',SKIRT:'치마'};
  var PARTS={
    TOP:    [['length','총장'],['shoulder','어깨너비'],['chest','가슴단면'],['sleeve','소매길이']],
    BOTTOM: [['waist','허리단면'],['hip','엉덩이단면'],['thigh','허벅지단면'],['rise','밑위'],['length','총장'],['hem','밑단단면']]
  };
  var FITKO={slim:'슬림',regular:'레귤러',loose:'루즈',oversize:'오버',skinny:'스키니',
    straight:'스트레이트',tapered:'테이퍼드',wide:'와이드',bootcut:'부츠컷'};

  var SPECS=[], ANCHORS=[], SPECBYID={}, CUR={};
  var q=new URLSearchParams(location.search);

  function load(){
    return Promise.all([ADMINAUTH.garmentRows(), ADMINAUTH.garmentMeta()]).then(function(res){
      var rows=res[0]||[], meta=res[1]||{};
      ANCHORS=meta.anchorBrands||[];
      SPECS=[]; SPECBYID={};
      rows.forEach(function(r){ var sp=r.spec||{}; sp._id=r.id; SPECS.push(sp); SPECBYID[r.id]=sp; });
      buildFilters(); render();
    }).catch(function(){ $('gsCharts').innerHTML='<p class="subnote">실측 데이터 로드 실패 · admin 로그인 필요(garment 테이블 RLS)</p>'; });
  }
  load();

  function uniq(a){ return a.filter(function(v,i){return a.indexOf(v)===i;}); }
  function val(id){ var el=$(id); return el?el.value:''; }

  function buildFilters(){
    var brands=uniq(SPECS.map(function(s){return s.brandName;})).sort();
    var qb=q.get('brand');
    var pre=CUR.brand||((qb&&brands.indexOf(qb)>=0)?qb:(brands[0]||''));
    function sel(id,opts,cur,koMap){
      return '<select id="'+id+'" onchange="__gsr()">'+
        opts.map(function(o){return '<option value="'+esc(o)+'"'+(o===cur?' selected':'')+'>'+esc(koMap?(koMap[o]||o):o)+'</option>';}).join('')+'</select>';
    }
    $('gsFilters').innerHTML=
      sel('sBrand',brands,pre)+
      sel('sGen',['female','male','unisex'],(CUR.gen||q.get('g')||'female'),GENDKO)+
      sel('sCat',['TOP','BOTTOM'],(CUR.cat||q.get('cat')||'TOP'),CATKO)+
      '<button class="abtn" onclick="__gsSave()" style="margin-left:auto">저장</button>'+
      '<span class="cnt" id="gsCnt"></span> <span class="cnt" id="gsSaveMsg" style="color:var(--green)"></span>';
  }
  window.__gsr=render;

  function cmInput(part,v){ return '<input type="number" step="0.1" class="cmin" data-part="'+part+'" value="'+(v==null?'':v)+'" style="width:62px">'; }
  function rowHTML(s,parts){
    var g=s.garmentCm||{};
    return '<tr data-id="'+(s._id!=null?s._id:'')+'">'+
      '<td><input class="szin" value="'+esc(s.sizeLabel||s.sizeCanonical||'')+'" style="width:66px"></td>'+
      parts.map(function(pp){ return '<td>'+cmInput(pp[0],g[pp[0]])+'</td>'; }).join('')+
      '<td><button class="tinybtn ghost" title="행 삭제" onclick="__gsDel(this)">✕</button></td></tr>';
  }

  function render(){
    var brand=val('sBrand'), gen=val('sGen'), cat=val('sCat');
    CUR={brand:brand,gen:gen,cat:cat};
    var parts=PARTS[cat]||PARTS.TOP;
    var rows=SPECS.filter(function(s){ return s.brandName===brand && s.category===cat && s.gender===gen; });
    var isA=rows[0]&&ANCHORS.indexOf(rows[0].brandId)>=0;
    var byProd={};
    rows.forEach(function(s){ var p=s.product||'(제품명 없음)'; (byProd[p]=byProd[p]||[]).push(s); });
    var prods=Object.keys(byProd);
    $('gsCnt').textContent=rows.length?(prods.length+'개 제품 · '+rows.length+' 사이즈행'):'데이터 없음';

    var head='<div class="gshead"><h1>'+esc(brand||'—')+' '+(isA?'<span class="anchor">앵커</span>':'')+'</h1>'+
      '<span class="gsmeta">'+GENDKO[gen]+' · '+CATKO[cat]+' · 단면(cm) · <b>편집 가능</b> — 저장 시 진단 즉시 반영</span></div>';
    var thead='<tr><th>사이즈</th>'+parts.map(function(pp){return '<th>'+pp[1]+'</th>';}).join('')+'<th></th></tr>';

    var cards=prods.map(function(p){
      var list=byProd[p].slice().sort(function(a,b){ return (a.sizeOrder==null?99:a.sizeOrder)-(b.sizeOrder==null?99:b.sizeOrder); });
      var t=list[0]; var axis=(cat==='BOTTOM')?t.silhouette:t.fitLine;
      var body=list.map(function(s){ return rowHTML(s,parts); }).join('');
      return '<div class="gscard" data-brandid="'+esc(t.brandId)+'" data-brandname="'+esc(t.brandName)+'" data-cat="'+esc(cat)+'" data-gen="'+esc(gen)+'" data-fit="'+esc(t.fitLine||'')+'" data-sil="'+esc(t.silhouette||'')+'" data-sub="'+esc(t.subtype||'')+'" data-sys="'+esc(t.sizeSystem||'')+'" data-prod="'+esc(p)+'">'+
        '<div class="gscard-h"><b>'+esc(p)+'</b>'+(axis?'<span class="pill">'+esc(FITKO[axis]||axis)+'</span>':'')+'<span class="muted">'+list.length+' 사이즈</span></div>'+
        '<div class="tablewrap"><table class="dt sizechart"><thead>'+thead+'</thead><tbody>'+body+'</tbody></table></div>'+
        '<button class="abtn ghost" onclick="__gsAdd(this)">+ 사이즈 행</button>'+
        '</div>';
    }).join('');

    var addNote=rows.length?'':'<p class="subnote">이 브랜드·성별·카테고리 조합은 실측 데이터가 없어요. 완전히 새 브랜드/제품은 <b>수집(CSV)</b> 경로를 권장해요 — 여기선 기존 제품의 사이즈·cm 보정에 쓰세요.</p>';
    $('gsCharts').innerHTML=head+cards+addNote;
  }

  window.__gsAdd=function(btn){
    var card=btn.closest('.gscard'); var cat=card.getAttribute('data-cat'); var parts=PARTS[cat]||PARTS.TOP;
    var tb=card.querySelector('tbody');
    var tr=document.createElement('tr'); tr.setAttribute('data-id','');
    tr.innerHTML='<td><input class="szin" value="" placeholder="사이즈" style="width:66px"></td>'+
      parts.map(function(pp){ return '<td>'+cmInput(pp[0],null)+'</td>'; }).join('')+
      '<td><button class="tinybtn ghost" onclick="__gsDel(this)">✕</button></td>';
    tb.appendChild(tr);
  };
  window.__gsDel=function(btn){ var tr=btn.closest('tr'); if(tr) tr.remove(); };   // 삭제=DOM 제거 → 저장 시 기존 id 미재삽입=삭제

  // 저장 = 현재 뷰의 DOM 행을 새로 insert(무 id) → 성공 시 기존 id 삭제(교체). 삭제/수정/추가 모두 반영.
  window.__gsSave=async function(){
    var brand=val('sBrand'), gen=val('sGen'), cat=val('sCat');
    var msg=$('gsSaveMsg'); if(msg) msg.textContent='저장 중…';
    var newRows=[];
    [].forEach.call(document.querySelectorAll('#gsCharts .gscard[data-prod]'), function(card){
      var m={ brandId:card.getAttribute('data-brandid'), brandName:card.getAttribute('data-brandname'),
        category:card.getAttribute('data-cat'), gender:card.getAttribute('data-gen'),
        fitLine:card.getAttribute('data-fit')||undefined, silhouette:card.getAttribute('data-sil')||undefined,
        subtype:card.getAttribute('data-sub')||undefined, sizeSystem:card.getAttribute('data-sys')||undefined,
        product:card.getAttribute('data-prod') };
      [].forEach.call(card.querySelectorAll('tbody tr'), function(tr,idx){
        var sz=(tr.querySelector('.szin').value||'').trim(); if(!sz) return;
        var gcm={}; [].forEach.call(tr.querySelectorAll('.cmin'), function(inp){ var v=(inp.value||'').trim(); if(v!=='') gcm[inp.getAttribute('data-part')]=parseFloat(v); });
        var idAttr=tr.getAttribute('data-id'); var id=idAttr?parseInt(idAttr,10):null;
        var spec;
        if(id!=null && SPECBYID[id]){ spec=Object.assign({},SPECBYID[id]); delete spec._id; spec.sizeLabel=sz; if(!spec.sizeCanonical) spec.sizeCanonical=sz; spec.garmentCm=gcm; }
        else { spec={ brandId:m.brandId, brandName:m.brandName, category:m.category, gender:m.gender, fitLine:m.fitLine, silhouette:m.silhouette, subtype:m.subtype, sizeSystem:m.sizeSystem, sizeLabel:sz, sizeCanonical:sz, sizeOrder:idx, garmentCm:gcm, product:m.product };
          Object.keys(spec).forEach(function(k){ if(spec[k]===undefined) delete spec[k]; }); }
        newRows.push({ brand_id:m.brandId, category:m.category, spec:spec });
      });
    });
    var oldIds=SPECS.filter(function(s){ return s.brandName===brand && s.category===cat && s.gender===gen && s._id!=null; }).map(function(s){ return s._id; });
    // insert 먼저(안전) → 성공 시 old 삭제. insert 실패 시 old 보존.
    var okI=true, ins=null;
    if(newRows.length){ ins=await ADMINAUTH.insertGarment(newRows); okI=ins.ok; }
    if(!okI){ if(msg) msg.textContent='저장 실패: '+((ins&&ins.error)||'admin 권한·로그인 확인'); return; }
    var okD=true;
    if(oldIds.length){ okD=await ADMINAUTH.deleteGarment(oldIds); }
    if(msg) msg.textContent=okD?'저장됨 ✓ · 진단 즉시 반영':'저장됨(구행 삭제 일부 실패 — 새로고침 확인)';
    load();
  };
})();
