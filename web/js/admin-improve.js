/* admin-improve.js — 엔진 강화: 진단 로그 → 개선 작업목록. [docs/6 §1.1 성장 구조]
   ① 미표기∩페인(painFlags) → A축 역산 보정 후보 ② 새 페인(openNote) 승격 후보
   ③ 확신 틀림 → 규칙 튜닝 우선 ④ 수요 대비 데이터 부족 → 수집. RLS admin 읽기(자동 학습 아님, 사람 액션 우선순위). */
(function(){
  "use strict";
  var $=function(id){return document.getElementById(id);};
  var esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};
  function kpi(n,l,s){return '<div class="kpi"><div class="n">'+(typeof n==='number'?n.toLocaleString():n)+'</div><div class="l">'+l+'</div>'+(s?'<div class="s">'+s+'</div>':'')+'</div>';}

  Promise.all([ADMINAUTH.diagnoses(1000), ADMINAUTH.feedbackJoin(1000), ADMINAUTH.garments()]).then(function(res){
    render(res[0]||[], res[1]||[], res[2]||{});
  }).catch(function(){ $('impKpis').innerHTML='<div class="kpi"><div class="l">로드 실패 · admin 로그인 필요</div></div>'; });

  function expsOf(d){ var inp=d.input||{}; return Array.isArray(inp.experiences)?inp.experiences:[]; }
  function isTight(v){ v=String(v); return v.indexOf('끼')>=0 || v==='TIGHT'; }

  function render(diags, feedback, garments){
    var exps=[];
    diags.forEach(function(d){ expsOf(d).forEach(function(e){ if(e) exps.push(e); }); });

    // ① 미표기∩페인: 브랜드×병목부위 '끼임' 빈도
    var pain={}, painTotal=0;
    exps.forEach(function(e){
      var pf=e.painFlags||{}, brand=e.brandName||e.brandId||'(미상)';
      Object.keys(pf).forEach(function(part){
        var k=brand+''+part, g=pain[k]=pain[k]||{brand:brand,part:part,tight:0,seen:0};
        g.seen++; if(isTight(pf[part])){ g.tight++; painTotal++; }
      });
    });
    var painRows=Object.keys(pain).map(function(k){return pain[k];}).filter(function(p){return p.tight>0;}).sort(function(a,b){return b.tight-a.tight;});

    // ② 새 페인 후보: openNote 자유서술
    var notes=[];
    exps.forEach(function(e){ var n=(e.openNote||'').trim(); if(n) notes.push({brand:e.brandName||e.brandId||'', cat:e.category||'', note:n}); });

    // ③ 규칙 튜닝: 확신(high) 틀림 by 8유형×카테고리
    var calib={};
    feedback.forEach(function(r){
      var d=r.diagnosis||{}, res=d.result||{}, tier=res.confidenceTier||'mid', card=res.card||'?', cat=d.category||'TOP';
      if(tier==='high'){ var k=card+''+cat, g=calib[k]=calib[k]||{card:card,cat:cat,n:0,wrong:0}; g.n++; if(r.verdict==='틀림') g.wrong++; }
    });
    var calibRows=Object.keys(calib).map(function(k){return calib[k];}).filter(function(c){return c.wrong>0;}).sort(function(a,b){return b.wrong-a.wrong;});

    // ④ 커버리지: 입은 브랜드(수요) vs 실측 보유
    var specs=garments.specs||[], haveByBrand={};
    specs.forEach(function(s){ var b=s.brandName||s.brandId; haveByBrand[b]=(haveByBrand[b]||0)+1; });
    var wornByBrand={};
    exps.forEach(function(e){ var b=e.brandName||e.brandId||'(미상)'; wornByBrand[b]=(wornByBrand[b]||0)+1; });
    var covRows=Object.keys(wornByBrand).map(function(b){ return {brand:b, worn:wornByBrand[b], have:haveByBrand[b]||0}; })
      .sort(function(a,b){ return (a.have-b.have)||(b.worn-a.worn); });

    $('impKpis').innerHTML=[
      kpi(diags.length,'진단 로그','분석 대상'),
      kpi(painTotal,'페인 신호','병목부위 끼임'),
      kpi(notes.length,'자유서술','새 페인 원천'),
      kpi(calibRows.reduce(function(s,c){return s+c.wrong;},0),'확신 틀림','튜닝 1순위')
    ].join('');

    $('painTable').innerHTML='<thead><tr><th>브랜드</th><th>병목부위</th><th>끼임</th><th>응답</th><th>작업</th></tr></thead><tbody>'+
      (painRows.length?painRows.map(function(p){
        return '<tr><td><b>'+esc(p.brand)+'</b></td><td>'+esc(p.part)+'</td><td class="num"><b>'+p.tight+'</b></td><td class="num muted">'+p.seen+'</td>'+
          '<td><a class="pill" style="color:var(--green);background:var(--green-soft);text-decoration:none" href="admin-garments.html?brand='+encodeURIComponent(p.brand)+'">실측 보정 →</a></td></tr>';
      }).join(''):'<tr><td class="muted" colspan="5">아직 페인 신호가 없어요 · 진단이 쌓이면 브랜드×부위별 끼임이 모여요</td></tr>')+'</tbody>';

    $('noteTable').innerHTML='<thead><tr><th>브랜드</th><th>카테고리</th><th>자유서술(새 페인 후보)</th></tr></thead><tbody>'+
      (notes.length?notes.slice(0,50).map(function(n){ return '<tr><td class="muted">'+esc(n.brand||'—')+'</td><td class="muted">'+esc(n.cat)+'</td><td>'+esc(n.note)+'</td></tr>'; }).join(''):'<tr><td class="muted" colspan="3">자유서술 응답이 아직 없어요</td></tr>')+'</tbody>';

    $('calibTable').innerHTML='<thead><tr><th>8유형</th><th>카테고리</th><th>확신(high) 응답</th><th>그중 틀림</th></tr></thead><tbody>'+
      (calibRows.length?calibRows.map(function(c){ return '<tr><td><b>'+esc(c.card)+'</b></td><td>'+esc(c.cat)+'</td><td class="num">'+c.n+'</td><td class="num"><b style="color:var(--warn)">'+c.wrong+'</b></td></tr>'; }).join(''):'<tr><td class="muted" colspan="4">확신했는데 틀린 응답이 없어요 (캘리브레이션 양호)</td></tr>')+'</tbody>';

    $('covTable').innerHTML='<thead><tr><th>브랜드</th><th>입은 횟수(수요)</th><th>실측 보유(specs)</th><th>작업</th></tr></thead><tbody>'+
      (covRows.length?covRows.slice(0,30).map(function(c){
        var lack=c.have===0;
        return '<tr'+(lack?' style="background:var(--warn-soft)"':'')+'><td><b>'+esc(c.brand)+'</b></td><td class="num">'+c.worn+'</td><td class="num">'+(c.have||'<span class="muted">없음</span>')+'</td>'+
          '<td><a class="pill" style="text-decoration:none" href="admin-collect.html?brand='+encodeURIComponent(c.brand)+'">수집 →</a></td></tr>';
      }).join(''):'<tr><td class="muted" colspan="4">데이터 없음</td></tr>')+'</tbody>';
  }
})();
