/* admin-business.js — 3.C.1 운영 대시보드(제품·운영 개요).
   화면 우선: 샘플 개요. 실집계는 각 상세 화면 + 마일스톤1 배선.
   금전(GMV·수수료·정산)은 실거래 오픈(v2) 대상 — 여기선 다루지 않음. */
(function(){
  "use strict";
  var $=function(id){return document.getElementById(id);};
  function pct(n,d){return d?Math.round(n/d*100):0;}
  function kpi(n,l,s){return '<div class="kpi"><div class="n">'+n+'</div><div class="l">'+l+'</div>'+(s?'<div class="s">'+s+'</div>':'')+'</div>';}
  function bar(p){return '<span class="scorecell"><span class="bar"><span class="s2fill" style="width:'+p+'%"></span></span> '+p+'%</span>';}

  // 샘플 개요 지표(대표값). 실배선 전 화면 확인용.
  var OV={
    diagStarted: 320,   // 진단 시작
    diagDone:    248,   // 진단 완료(결과 도달)
    fbAnswered:  96,    // 정확도 응답
    fbCorrect:   67,    // '맞음'
    matchReq:    41,    // 매칭 요청(오픈+지명)
    quoted:      33,    // 견적 1개+ 수신
    awarded:     18,    // 성사(수락/완료)
    proApplied:  12,    // 전문가 신청
    proApproved: 7      // 전문가 승인
  };

  function renderKpis(){
    $('ovKpis').innerHTML=[
      kpi(OV.diagDone,'진단 완료',pct(OV.diagDone,OV.diagStarted)+'% 완료율 · 시작 '+OV.diagStarted),
      kpi(pct(OV.fbCorrect,OV.fbAnswered)+'%','정확도 동의율','킬 메트릭 · 응답 '+OV.fbAnswered),
      kpi(OV.matchReq,'매칭 수요','성사 '+OV.awarded+' · 전환 '+pct(OV.awarded,OV.matchReq)+'%'),
      kpi(OV.proApproved+'/'+OV.proApplied,'전문가 승인','심사 통과')
    ].join('');
  }

  function renderFunnel(){
    var base=OV.diagStarted;
    var steps=[
      ['진단 시작', OV.diagStarted],
      ['진단 완료(결과 도달)', OV.diagDone],
      ['정확도 응답', OV.fbAnswered],
      ['매칭 요청', OV.matchReq],
      ['견적 수신', OV.quoted],
      ['성사(수락·완료)', OV.awarded]
    ];
    var rows=steps.map(function(s,i){
      var prev=i?steps[i-1][1]:s[1];
      var stepConv=i?pct(s[1],prev):100;
      return '<tr><td><b>'+s[0]+'</b></td><td class="num">'+s[1]+'</td>'+
        '<td>'+bar(pct(s[1],base))+'</td>'+
        '<td class="muted">'+(i?('직전 대비 '+stepConv+'%'):'기준')+'</td></tr>';
    }).join('');
    $('funnelTable').innerHTML='<thead><tr><th>단계</th><th>수</th><th>시작 대비</th><th>단계 전환</th></tr></thead><tbody>'+rows+'</tbody>';
  }

  function renderLinks(){
    var links=[
      ['진단 응답·정확도 (3.C.2)','정확도 캘리브레이션·8유형/브랜드/페인','admin-diagnostics.html'],
      ['회원·수요 신호 (3.B)','회원·전문가 심사·매칭 수요 신호','admin-members.html'],
      ['사이즈·데이터 (3.A)','브랜드 실측·신체 모델·엔진 튜닝','admin.html']
    ];
    var rows=links.map(function(l){
      return '<tr><td><a style="color:var(--green);font-weight:700;text-decoration:none" href="'+l[2]+'">'+l[0]+' →</a></td><td class="muted">'+l[1]+'</td></tr>';
    }).join('');
    $('linkTable').innerHTML='<tbody>'+rows+'</tbody>';
  }

  renderKpis(); renderFunnel(); renderLinks();
})();
