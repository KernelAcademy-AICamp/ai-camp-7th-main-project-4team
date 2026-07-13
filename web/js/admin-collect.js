/* admin-collect.js — 3.A.1 이미지 붙여넣기 사이즈 수집.
   클립보드/드래그/파일로 사이즈표 이미지 → 보면서 전사 → 기존 raw CSV 포맷으로 내보내기.
   (자동 OCR 없음 — 표 인식 신뢰도 문제. 이미지는 전사 레퍼런스.) */
(function(){
  "use strict";
  var $=function(id){return document.getElementById(id);};
  // 카테고리별 전사 부위(라벨=CSV 컬럼명)
  var PARTS={ TOP:['총장','어깨너비','가슴단면','소매길이'], BOTTOM:['총장','허리단면','엉덩이단면','허벅지단면','밑위','밑단단면'] };
  var NORM={ TOP:[['slim','슬림'],['regular','레귤러'],['loose','루즈'],['oversize','오버'],['skinny','스키니']],
             BOTTOM:[['skinny','스키니'],['slim','슬림'],['straight','스트레이트'],['tapered','테이퍼드'],['wide','와이드'],['bootcut','부츠컷']] };
  var rows=[{size:'',cells:{},note:''}];

  // ── 이미지 붙여넣기/드롭/파일 ──
  function showImage(file){ if(!file) return; var r=new FileReader();
    r.onload=function(){ var img=$('preview'); img.src=r.result; img.hidden=false; $('dzHint').hidden=true; $('dzTools').hidden=false; };
    r.readAsDataURL(file); }
  window.__clear=function(){ var img=$('preview'); img.src=''; img.hidden=true; $('dzHint').hidden=false; $('dzTools').hidden=true; };
  document.addEventListener('paste',function(e){
    var items=(e.clipboardData&&e.clipboardData.items)||[];
    for(var i=0;i<items.length;i++){ if(items[i].type.indexOf('image')===0){ showImage(items[i].getAsFile()); e.preventDefault(); return; } }
  });
  var dz=$('dropzone');
  dz.addEventListener('dragover',function(e){ e.preventDefault(); dz.classList.add('over'); });
  dz.addEventListener('dragleave',function(){ dz.classList.remove('over'); });
  dz.addEventListener('drop',function(e){ e.preventDefault(); dz.classList.remove('over');
    var f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0]; if(f&&f.type.indexOf('image')===0) showImage(f); });
  $('fileIn').addEventListener('change',function(e){ showImage(e.target.files&&e.target.files[0]); });

  // ── 메타 폼 ──
  function buildMeta(){
    function sel(id,opts,cur){return '<select id="'+id+'" onchange="__meta()">'+opts.map(function(o){return '<option value="'+o[0]+'"'+(o[0]===cur?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select>';}
    function inp(id,ph,w){return '<input id="'+id+'" placeholder="'+ph+'" oninput="__build()" style="width:'+(w||120)+'px">';}
    var cat=(($('iCat')&&$('iCat').value))||'TOP';
    $('metaForm').innerHTML=
      fld('브랜드',inp('mBrand','예: 자라',110))+
      fld('성별',sel('mGen',[['female','여성'],['male','남성'],['unisex','공용']],'female'))+
      fld('카테고리',sel('iCat',[['TOP','상의'],['BOTTOM','하의']],cat))+
      fld('정규화핏/실루엣',sel('mNorm',NORM[cat],cat==='TOP'?'regular':'straight'))+
      fld('원본 fit',inp('mFit','예: 슬림핏(선택)',110))+
      fld('제품명',inp('mProduct','예: 코튼 셔츠',130))+
      fld('소재',inp('mMat','선택',80))+
      (cat==='BOTTOM'?fld('밴딩',inp('mBand','예: 없음/히든',90)):'')+
      '<label class="numin"><input type="checkbox" id="mAnchor" onchange="__build()"><span>앵커 브랜드</span></label>';
  }
  function fld(l,ctrl){return '<label class="numin"><span>'+l+'</span>'+ctrl+'</label>';}
  window.__meta=function(){ buildMeta(); buildGrid(); build(); };  // 카테고리 바뀌면 그리드도

  // ── 전사 그리드 ──
  function buildGrid(){
    var cat=(($('iCat')&&$('iCat').value))||'TOP', parts=PARTS[cat];
    $('partsHint').textContent='('+parts.join(' · ')+' · 단면 cm)';
    var head='<tr><th style="width:34px"></th><th>size</th>'+parts.map(function(p){return '<th>'+p+'</th>';}).join('')+'<th>비고</th></tr>';
    var body=rows.map(function(row,ri){
      var cells=parts.map(function(p){return '<td><input class="gcell num" data-ri="'+ri+'" data-part="'+p+'" value="'+esc(row.cells[p]||'')+'" oninput="__cell(this)"></td>';}).join('');
      return '<tr><td><span class="rmrow" onclick="__rm('+ri+')" title="행 삭제">✕</span></td>'+
        '<td><input class="gcell" data-ri="'+ri+'" data-part="__size" value="'+esc(row.size)+'" oninput="__cell(this)" placeholder="S·M·30…" style="width:70px"></td>'+
        cells+'<td><input class="gcell" data-ri="'+ri+'" data-part="__note" value="'+esc(row.note)+'" oninput="__cell(this)" style="width:110px"></td></tr>';
    }).join('');
    $('gridTable').innerHTML='<thead>'+head+'</thead><tbody>'+body+'</tbody>';
  }
  function esc(s){return String(s==null?'':s).replace(/"/g,'&quot;').replace(/</g,'&lt;');}
  window.__cell=function(el){ var ri=+el.getAttribute('data-ri'), part=el.getAttribute('data-part'), v=el.value;
    if(part==='__size') rows[ri].size=v; else if(part==='__note') rows[ri].note=v; else rows[ri].cells[part]=v; build(); };
  window.__addRow=function(){ rows.push({size:'',cells:{},note:''}); buildGrid(); build(); };
  window.__addRows=function(n){ for(var i=0;i<n;i++) rows.push({size:'',cells:{},note:''}); buildGrid(); build(); };
  window.__rm=function(ri){ rows.splice(ri,1); if(!rows.length) rows.push({size:'',cells:{},note:''}); buildGrid(); build(); };

  // ── CSV 빌드(기존 raw 헤더 포맷) ──
  function q(v){ v=v==null?'':(''+v); return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; }
  function build(){
    var cat=(($('iCat')&&$('iCat').value))||'TOP';
    var brand=v('mBrand'), gen=v('mGen'), norm=v('mNorm'), fit=v('mFit')||norm, product=v('mProduct'), mat=v('mMat');
    var anchor=$('mAnchor')&&$('mAnchor').checked?'true':'false';
    var header, lines;
    if(cat==='TOP'){
      header=['브랜드','isAnchor','fit','소재','앵커역할','정규화여유','성별','product','size','총장','어깨너비','가슴단면','소매길이','비고'];
      lines=rows.filter(function(r){return r.size;}).map(function(r){
        return [brand,anchor,fit,mat,'기반',norm,gen,product,r.size,r.cells['총장'],r.cells['어깨너비'],r.cells['가슴단면'],r.cells['소매길이'],r.note].map(q).join(',');
      });
    } else {
      var band=v('mBand');
      header=['브랜드','isAnchor','fit','소재','정규화실루엣','성별','product','size','총장','허리단면','엉덩이단면','허벅지단면','밑위','밑단단면','밴딩','비고'];
      lines=rows.filter(function(r){return r.size;}).map(function(r){
        return [brand,anchor,fit,mat,norm,gen,product,r.size,r.cells['총장'],r.cells['허리단면'],r.cells['엉덩이단면'],r.cells['허벅지단면'],r.cells['밑위'],r.cells['밑단단면'],band,r.note].map(q).join(',');
      });
    }
    var csv=header.join(',')+'\n'+lines.join('\n');
    window.__csv=csv;
    $('csvOut').textContent=lines.length?csv:'(사이즈 행을 채우면 CSV가 여기 미리보기 됩니다)';
    $('exportMsg').textContent=lines.length?(lines.length+'개 사이즈 행'):'';
  }
  window.__build=build;
  function v(id){ var el=$(id); return el?el.value.trim():''; }

  window.__copyCsv=function(){
    var lines=(window.__csv||'').split('\n').length-1;
    if(lines<1){ $('exportMsg').textContent='먼저 사이즈 행을 채워주세요.'; return; }
    // 헤더 없이 데이터 행만 복사(기존 시트에 append)하려면 아래에서 조정 가능. 여기선 전체 복사.
    (navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(window.__csv):Promise.reject())
      .then(function(){ $('exportMsg').textContent='✅ 복사됨 — 수집 시트에 붙여넣기'; })
      .catch(function(){ $('exportMsg').textContent='복사 실패 — 아래 미리보기에서 직접 선택·복사하세요.'; });
  };
  window.__downloadCsv=function(){
    if(!(window.__csv&&window.__csv.split('\n').length>1)){ $('exportMsg').textContent='먼저 사이즈 행을 채워주세요.'; return; }
    var cat=(($('iCat')&&$('iCat').value))||'TOP';
    var blob=new Blob(['﻿'+window.__csv],{type:'text/csv;charset=utf-8'});   // BOM(엑셀 한글)
    var a=document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download='수집-'+(v('mBrand')||'brand')+'-'+cat+'.csv'; document.body.appendChild(a); a.click(); a.remove();
  };

  // ── OCR 자동 추출(베타) — Tesseract.js로 단어+좌표 → 행/열 재구성 ──
  var tessLoad=null;
  function loadTess(){ if(window.Tesseract) return Promise.resolve();
    if(!tessLoad) tessLoad=new Promise(function(res,rej){ var s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'; s.onload=res;
      s.onerror=function(){ tessLoad=null; rej(new Error('OCR 엔진 로드 실패(네트워크)')); }; document.head.appendChild(s); });
    return tessLoad; }
  function prog(p,m){ $('ocrProg').hidden=false; $('ocrFill').style.width=(p||0)+'%'; $('ocrMsg').textContent=m||''; }

  window.__ocr=function(){
    var img=$('preview'); if(!img||img.hidden||!img.src) return;
    var btn=$('ocrBtn'); btn.disabled=true; prog(3,'OCR 엔진 로딩…');
    loadTess().then(function(){ prog(10,'인식 준비…');
      return window.Tesseract.recognize(img.src,'kor+eng',{ logger:function(m){
        if(m.status==='recognizing text') prog(15+Math.round(m.progress*80),'인식 중… '+Math.round(m.progress*100)+'%');
        else prog(12,m.status||''); } });
    }).then(function(r){
      prog(98,'표 재구성…');
      try{ $('ocrRaw').textContent=(r.data&&r.data.text)||'(빈 결과)'; $('ocrRawWrap').hidden=false; }catch(e){}
      var rowsW=clusterRows((r.data&&r.data.words)||[]);
      var parsed=autoFill(rowsW);
      if(parsed && parsed.rows.length){ rows=parsed.rows; buildGrid(); build();
        prog(100,'✅ '+parsed.rows.length+'행 추출('+(parsed.cat==='TOP'?'상의':'하의')+') — 값을 꼭 확인·교정하세요'); return; }
      // 폴백: 구조 판정 실패해도 인식된 행렬을 러프하게 그리드에(빈 화면 대신).
      var m=buildMatrix(rowsW), dumped=m?rawDump(m):[];
      if(dumped.length){ rows=dumped; buildGrid(); build();
        prog(100,'⚠️ 구조 자동판정 실패 — 러프 추출('+dumped.length+'행). 사이즈·부위·값을 꼭 확인·교정하세요'); }
      else { prog(100,'⚠️ 인식이 약해요 — 수동 전사하세요(인식 텍스트는 콘솔).');
        try{ console.log('OCR raw text:\n'+((r.data&&r.data.text)||'')); }catch(e){} }
    }).catch(function(e){ prog(100,'❌ '+(e.message||'OCR 실패')); })
    .then(function(){ btn.disabled=false; });
  };

  function median(a){ if(!a.length) return 0; var s=a.slice().sort(function(x,y){return x-y;}); return s[Math.floor(s.length/2)]; }
  function clusterRows(words){
    var ws=(words||[]).map(function(w){ var b=w.bbox||{}; return {t:(w.text||'').trim(),
      x:((b.x0||0)+(b.x1||0))/2, y:((b.y0||0)+(b.y1||0))/2, h:((b.y1||0)-(b.y0||0))||12, conf:w.confidence||0}; })
      .filter(function(w){ return w.t && w.conf>25; });
    if(!ws.length) return [];
    var medH=median(ws.map(function(w){return w.h;}))||12;
    ws.sort(function(a,b){return a.y-b.y;});
    var out=[], cur=[];
    ws.forEach(function(w){ if(cur.length && Math.abs(w.y-cur[cur.length-1].y)>medH*0.7){ out.push(cur); cur=[]; } cur.push(w); });
    if(cur.length) out.push(cur);
    out.forEach(function(r){ r.sort(function(a,b){return a.x-b.x;}); });
    return out;
  }
  // '소매' 먼저(소매길이) → 이후 '길이'류(전체길이·총길이)를 총장에. 순서 중요.
  var PARTKW=[['소매길이',['소매','팔길이']],['어깨너비',['어깨','등너비']],['가슴단면',['가슴','젖가슴','품','가슴둘레']],
    ['총장',['총장','총기장','전체길이','총길이','기장','앞기장','앞면길이']],
    ['허리단면',['허리']],['엉덩이단면',['엉덩이','힙']],['허벅지단면',['허벅지']],['밑위',['밑위']],['밑단단면',['밑단','부리','밑단둘레']]];
  function matchPart(t){ for(var i=0;i<PARTKW.length;i++) for(var j=0;j<PARTKW[i][1].length;j++) if(t.indexOf(PARTKW[i][1][j])>=0) return PARTKW[i][0]; return null; }
  function cleanTok(t){ return (''+t).replace(/[^A-Za-z0-9.]/g,''); }
  function sizeLabel(t){ return (''+t).trim(); }
  // 사이즈: 레터(옵션으로 (090) 같은 KR호칭 병기) 또는 2~3자리 숫자
  function isSize(t){ var c=(''+t).trim();
    return /^(XXS|XS|S|M|L|XL|XXL|XXXL|[2-5]XL)(\s*\(\s*\d+\s*\))?$/i.test(c) || /^\d{2,3}$/.test(cleanTok(t)); }
  function toNum(t){ var m=(''+t).match(/\d+(\.\d+)?/); return m?parseFloat(m[0]):null; }
  function nearestX(cands,x){ var best=null,bd=1e9; cands.forEach(function(c){ var d=Math.abs(c.x-x); if(d<bd){bd=d;best=c;} }); return best; }
  var BOTTOMPARTS=['허리단면','엉덩이단면','허벅지단면','밑위','밑단단면'];
  function setCategory(cat){ var el=$('iCat'); if(el && el.value!==cat){ el.value=cat; buildMeta(); } }

  // 행(clusterRows) → 열(x) 정렬 2D 행렬. 앵커=셀 가장 많은 행의 x를 열 기준으로, 각 단어를 최근접 열에.
  function buildMatrix(rowsW){
    if(!rowsW.length) return null;
    var anchor=rowsW[0]; rowsW.forEach(function(r){ if(r.length>anchor.length) anchor=r; });
    var colX=anchor.map(function(w){return w.x;}); var nc=colX.length; if(nc<2) return null;
    function colOf(x){ var bi=0,bd=1e9; for(var i=0;i<nc;i++){ var d=Math.abs(colX[i]-x); if(d<bd){bd=d;bi=i;} } return bi; }
    return rowsW.map(function(r){
      var cells=[]; for(var i=0;i<nc;i++) cells.push('');
      r.forEach(function(w){ var c=colOf(w.x); cells[c]=(cells[c]?cells[c]+' ':'')+w.t; });
      return cells;
    });
  }
  function countSize(arr){ return arr.filter(function(t){return isSize(t);}).length; }
  // 자동 판정 실패 폴백: 행렬을 그대로 그리드에(사이즈=첫칸, 숫자=현재 카테고리 부위칸 순서대로). 사람이 교정.
  function rawDump(m){
    var cat=(($('iCat')&&$('iCat').value))||'TOP', parts=PARTS[cat];
    return m.map(function(cells){
      var o={size:sizeLabel(cells[0]||''), cells:{}, note:''};
      var nums=cells.slice(1).map(toNum).filter(function(x){return x!=null;});
      nums.forEach(function(v,i){ if(i<parts.length) o.cells[parts[i]]=v; });
      return o;
    // 노이즈 제거: 사이즈 같은 첫칸이거나 숫자 2개 이상인 행만(라벨·문장 줄 배제)
    }).filter(function(o){ return isSize(o.size) || Object.keys(o.cells).length>=2; });
  }

  // 방향 판정: 사이즈 키워드(S/M/L·90/95/100…)가 헤더 행에 있으면 열=사이즈(행=부위),
  //   첫 열에 있으면 행=사이즈(열=부위). 사이즈 없는 축 = 부위. → 표 정규화.
  function autoFill(rowsW){
    var m=buildMatrix(rowsW); if(!m || m.length<2) return null;
    var nc=m[0].length;
    var headerSizes=countSize(m[0]);
    var col0Sizes=countSize(m.map(function(row){return row[0];}));
    if(headerSizes<2 && col0Sizes<2) return null;   // 어느 축에도 사이즈 라벨 없음 → 실패
    var out=[], c, r;
    if(headerSizes>=col0Sizes){
      // 헤더 행 = 사이즈, 각 행 = 부위
      for(c=1;c<nc;c++){ if(isSize(m[0][c])) out.push({size:sizeLabel(m[0][c]), cells:{}, note:'', _c:c}); }
      for(r=1;r<m.length;r++){ var partA=matchPart(m[r][0]); if(!partA) continue;
        out.forEach(function(o){ var v=toNum(m[r][o._c]); if(v!=null) o.cells[partA]=v; }); }
    } else {
      // 첫 열 = 사이즈, 헤더 행 = 부위
      var partCols=[]; for(c=1;c<nc;c++) partCols.push({c:c, part:matchPart(m[0][c])});
      for(r=1;r<m.length;r++){ if(!isSize(m[r][0])) continue;
        var o2={size:sizeLabel(m[r][0]), cells:{}, note:''};
        partCols.forEach(function(pc){ if(!pc.part) return; var v=toNum(m[r][pc.c]); if(v!=null) o2.cells[pc.part]=v; });
        out.push(o2); }
    }
    out.forEach(function(o){ delete o._c; });
    out=out.filter(function(o){ return Object.keys(o.cells).length; });
    if(!out.length) return null;
    var cat=out.some(function(o){ return Object.keys(o.cells).some(function(p){return BOTTOMPARTS.indexOf(p)>=0;}); })?'BOTTOM':'TOP';
    setCategory(cat);
    return {cat:cat, rows:out};
  }

  buildMeta(); buildGrid(); build();
})();
