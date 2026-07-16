/* admin-leads.js — 전문가 수요(lead) 집계. [db/02]
   페이크도어 = 스타일리스트 웨이트리스트 오픈알림. api에선 kind=notify·이메일 + 웨이트리스트에서 고른
   service·occasion(선택·비필수, B안) 수집 → 서비스·상황 분해로 "무엇을 원하나"까지 봄. budget·note·견적(quote)은 v2.
   RLS admin 읽기. */
(function(){
  "use strict";
  var $=function(id){ return document.getElementById(id); };
  var esc=function(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); };
  var SVCKO={online:'온라인 코디 추천',shopping:'쇼핑 동행',image:'이미지 컨설팅',stylist:'스타일리스트 매칭(미지정)',undecided:'아직 모르겠음'};
  function kpi(n,l,s){ return '<div class="kpi"><div class="n">'+(typeof n==='number'?n.toLocaleString():n)+'</div><div class="l">'+l+'</div>'+(s?'<div class="s">'+s+'</div>':'')+'</div>'; }
  function bar(p){ return '<span class="scorecell"><span class="bar"><span class="s2fill" style="width:'+p+'%"></span></span> '+p+'%</span>'; }
  function fmt(ts){ try{ var d=new Date(ts); return (d.getMonth()+1)+'/'+d.getDate()+' '+('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2); }catch(e){ return ts||''; } }
  function day(ts){ return (ts||'').slice(0,10); }
  function isPostDiag(l, diagSet){ return !!(l.session_id && diagSet[l.session_id]); }

  var EMAILS=[];   // 고유 이메일(복사·CSV용)

  function load(){
    return Promise.all([ADMINAUTH.leads(1000), ADMINAUTH.diagnosisSessions()]).then(function(res){
      var leads=res[0]||[], diagSet={}; (res[1]||[]).forEach(function(sid){ diagSet[sid]=1; });
      render(leads, diagSet, (res[1]||[]).length);
    }).catch(function(){ $('ldKpis').innerHTML='<div class="kpi"><div class="l">수요 데이터 로드 실패 · admin(구글) 로그인 필요</div></div>'; });
  }
  load();

  // 테스트 수요 로그 초기화 — lead 전체 삭제(admin RLS). 되돌릴 수 없음. [db/06]
  window.__resetLeads=async function(){
    if(!(window.ADMINAUTH&&ADMINAUTH.ready())){ alert('실 DB(api·admin 로그인) 상태에서만 초기화할 수 있어요.'); return; }
    if(!confirm('수요(lead) 로그를 전부 삭제할까요?\n웨이트리스트 이메일·수요가 모두 지워지고 되돌릴 수 없어요. (테스트 데이터 정리용)')) return;
    var r=await ADMINAUTH.resetLeadLogs();
    if(r.ok){ alert('초기화됐어요.'); load(); }
    else alert('초기화 실패: '+(r.error||'admin 권한 확인'));
  };

  function render(leads, diagSet, diagCount){
    // 유효 신호 = 진단 후 신청(진단→매칭 게이트). 직접 = 탭·홈 유입.
    var postDiag=leads.filter(function(l){return isPostDiag(l,diagSet);});
    var direct=leads.filter(function(l){return !isPostDiag(l,diagSet);});
    // 고유 이메일(대소문자 무시 dedupe · 표시는 원본)
    var seen={}; EMAILS=[];
    leads.forEach(function(l){ var raw=(l.contact||'').trim(); var e=raw.toLowerCase(); if(e && !seen[e]){ seen[e]=1; EMAILS.push(raw); } });

    $('ldKpis').innerHTML=[
      kpi(leads.length,'총 신청','오픈 알림(웨이트리스트)'),
      kpi(postDiag.length,'진단 후 신청','★ 유효 수요 신호'),
      kpi(direct.length,'직접 유입 신청','탭·홈'),
      kpi(EMAILS.length,'고유 이메일','오픈 시 연락 가능')
    ].join('');

    // 진단 → 수요 전환 (같은 브라우저 세션 = 같은 session_id)
    var leadSessions={}; leads.forEach(function(l){ if(l.session_id) leadSessions[l.session_id]=1; });
    var leadSessionN=Object.keys(leadSessions).length;
    var postDiagSess=Object.keys(leadSessions).filter(function(sid){ return diagSet[sid]; }).length;
    var rate=diagCount?Math.round(postDiagSess/diagCount*1000)/10:0;
    $('funnelTable').innerHTML='<thead><tr><th>단계</th><th>수</th><th>비고</th></tr></thead><tbody>'+
      '<tr><td>진단한 세션</td><td class="num"><b>'+diagCount+'</b></td><td class="muted">diagnosis 기록 기준</td></tr>'+
      '<tr><td>수요 발생 세션</td><td class="num"><b>'+leadSessionN+'</b></td><td class="muted">그중 진단 후: '+postDiagSess+'</td></tr>'+
      '<tr><td>진단 → 수요 전환율</td><td class="num"><b>'+rate+'%</b></td><td class="muted">진단 후 수요 세션 / 진단 세션</td></tr>'+
      '</tbody>';

    // 일자별 신청 추세 — 신청수 + 진단 후 유입 비율(막대). 정확도 추세뷰와 대칭.
    var byDay={}; leads.forEach(function(l){ var d=day(l.created_at); if(!d) return; var g=byDay[d]=byDay[d]||{n:0,pd:0}; g.n++; if(isPostDiag(l,diagSet)) g.pd++; });
    var days=Object.keys(byDay).sort();
    var trendRows=days.map(function(d){ var g=byDay[d]; var p=g.n?Math.round(g.pd/g.n*100):0; return '<tr><td>'+d+'</td><td class="num">'+g.n+'</td><td>'+bar(p)+'</td></tr>'; }).join('');
    $('trendTable').innerHTML='<thead><tr><th>날짜</th><th>신청</th><th>진단 후 비율</th></tr></thead><tbody>'+(trendRows||'<tr><td class="muted" colspan="3">아직 신청이 없어요</td></tr>')+'</tbody>';

    // 유입 게이트 · 서비스 · 상황 — 웨이트리스트에서 고른 수요(service·occasion, 미선택은 집계 제외)
    var svc={}; leads.forEach(function(l){ var k=SVCKO[l.service]||l.service||'—'; svc[k]=(svc[k]||0)+1; });
    var svcRows=Object.keys(svc).sort(function(a,b){return svc[b]-svc[a];}).map(function(k){ return '<tr><td class="muted">'+esc(k)+'</td><td class="num">'+svc[k]+'</td></tr>'; }).join('');
    var occ={}; leads.forEach(function(l){ if(l.occasion){ occ[l.occasion]=(occ[l.occasion]||0)+1; } });
    var occKeys=Object.keys(occ).sort(function(a,b){return occ[b]-occ[a];});
    var occRows=occKeys.length?occKeys.map(function(k){ return '<tr><td class="muted">'+esc(k)+'</td><td class="num">'+occ[k]+'</td></tr>'; }).join('')
      :'<tr><td class="muted" colspan="2">아직 상황 선택이 없어요 (비필수)</td></tr>';
    $('segTable').innerHTML='<thead><tr><th>구분</th><th>신청</th></tr></thead><tbody>'+
      '<tr><td><span class="anchor">진단 후</span> 유입</td><td class="num"><b>'+postDiag.length+'</b></td></tr>'+
      '<tr><td><span class="pill">직접</span> 유입 (탭·홈)</td><td class="num"><b>'+direct.length+'</b></td></tr>'+
      '<tr><td class="muted" colspan="2" style="padding-top:12px;border-top:1px solid var(--line)">원하는 서비스</td></tr>'+
      (svcRows||'<tr><td class="muted" colspan="2">데이터 없음</td></tr>')+
      '<tr><td class="muted" colspan="2" style="padding-top:12px;border-top:1px solid var(--line)">상황</td></tr>'+
      occRows+
      '</tbody>';

    // 이메일 명단 — 이 페이크도어의 결과물. 복사/CSV로 오픈 알림에 사용.
    var emRows=EMAILS.map(function(e){ return '<tr><td>'+esc(e)+'</td></tr>'; }).join('');
    $('emailTable').innerHTML='<thead><tr><th>이메일 · 고유 '+EMAILS.length+'개</th></tr></thead><tbody>'+(emRows||'<tr><td class="muted">확보된 이메일 없음</td></tr>')+'</tbody>';

    // 수요 목록 — 시각·서비스·상황·이메일·유입. (kind는 항상 notify라 컬럼 제외)
    var rows=leads.map(function(l){
      var conv=isPostDiag(l,diagSet)?'<span class="anchor">진단 후</span>':'<span class="pill">직접</span>';
      return '<tr><td class="muted">'+fmt(l.created_at)+'</td>'+
        '<td>'+esc(SVCKO[l.service]||l.service||'—')+'</td>'+
        '<td>'+(l.occasion?esc(l.occasion):'<span class="muted">—</span>')+'</td>'+
        '<td>'+(l.contact?esc(l.contact):'<span class="muted">—</span>')+'</td>'+
        '<td>'+conv+'</td></tr>';
    }).join('');
    $('ldTable').innerHTML='<thead><tr><th>시각</th><th>서비스</th><th>상황</th><th>이메일</th><th>유입</th></tr></thead><tbody>'+(rows||'<tr><td class="muted" colspan="5">아직 수요가 없어요</td></tr>')+'</tbody>';
  }

  // ── 이메일 명단 복사·CSV ──
  window.__copyEmails=function(){
    if(!EMAILS.length){ alert('확보된 이메일이 없어요.'); return; }
    var txt=EMAILS.join('\n');
    if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).then(function(){ alert(EMAILS.length+'개 이메일을 복사했어요.'); }, function(){ prompt('복사(수동):', txt); }); }
    else prompt('복사(수동):', txt);
  };
  window.__csvEmails=function(){
    if(!EMAILS.length){ alert('확보된 이메일이 없어요.'); return; }
    var csv='email\n'+EMAILS.map(function(e){ return '"'+String(e).replace(/"/g,'""')+'"'; }).join('\n');
    var a=document.createElement('a');
    a.href='data:text/csv;charset=utf-8,﻿'+encodeURIComponent(csv);
    a.download='waitlist-emails.csv'; document.body.appendChild(a); a.click(); a.remove();
  };
})();
