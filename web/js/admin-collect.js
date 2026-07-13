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

  buildMeta(); buildGrid(); build();
})();
