/* admin-leads.js — 전문가 수요(lead) 집계. [db/02]
   웨이트리스트 오픈알림(이메일)·견적요청 수요 + 진단→수요 전환. RLS admin 읽기. */
(function(){
  "use strict";
  var $=function(id){ return document.getElementById(id); };
  var esc=function(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); };
  var SVCKO={online:'온라인 스타일링',shopping:'동행 쇼핑',image:'이미지 컨설팅',stylist:'스타일리스트 매칭'};
  var KINDKO={notify:'오픈 알림',quote:'견적 요청'};
  function kpi(n,l,s){ return '<div class="kpi"><div class="n">'+(typeof n==='number'?n.toLocaleString():n)+'</div><div class="l">'+l+'</div>'+(s?'<div class="s">'+s+'</div>':'')+'</div>'; }
  function fmt(ts){ try{ var d=new Date(ts); return (d.getMonth()+1)+'/'+d.getDate()+' '+('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2); }catch(e){ return ts||''; } }

  function load(){
    return Promise.all([ADMINAUTH.leads(1000), ADMINAUTH.diagnosisSessions()]).then(function(res){
      var leads=res[0]||[], diagSet={}; (res[1]||[]).forEach(function(sid){ diagSet[sid]=1; });
      render(leads, diagSet, (res[1]||[]).length);
    }).catch(function(){ $('ldKpis').innerHTML='<div class="kpi"><div class="l">수요 데이터 로드 실패 · admin 로그인 필요</div></div>'; });
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
    var notify=leads.filter(function(l){return l.kind==='notify';});
    var quote=leads.filter(function(l){return l.kind==='quote';});
    var withEmail=leads.filter(function(l){return l.contact;});
    $('ldKpis').innerHTML=[
      kpi(leads.length,'총 수요','오픈알림+견적요청'),
      kpi(notify.length,'오픈 알림 신청','웨이트리스트'),
      kpi(quote.length,'견적 요청',''),
      kpi(withEmail.length,'이메일 확보','오픈 시 연락 가능')
    ].join('');

    // 진단 → 수요 전환 (같은 브라우저 세션 = 같은 session_id)
    var leadSessions={}; leads.forEach(function(l){ if(l.session_id) leadSessions[l.session_id]=1; });
    var leadSessionN=Object.keys(leadSessions).length;
    var postDiag=Object.keys(leadSessions).filter(function(sid){ return diagSet[sid]; }).length;
    var rate=diagCount?Math.round(postDiag/diagCount*1000)/10:0;
    $('funnelTable').innerHTML='<thead><tr><th>단계</th><th>수</th><th>비고</th></tr></thead><tbody>'+
      '<tr><td>진단한 세션</td><td class="num"><b>'+diagCount+'</b></td><td class="muted">diagnosis 기록 기준</td></tr>'+
      '<tr><td>수요 발생 세션</td><td class="num"><b>'+leadSessionN+'</b></td><td class="muted">그중 진단 후: '+postDiag+'</td></tr>'+
      '<tr><td>진단 → 수요 전환율</td><td class="num"><b>'+rate+'%</b></td><td class="muted">진단 후 수요 세션 / 진단 세션</td></tr>'+
      '</tbody>';

    // 서비스·상황별
    var seg={}; leads.forEach(function(l){ var k=(SVCKO[l.service]||l.service||'—')+' · '+(l.occasion||'—'); seg[k]=(seg[k]||0)+1; });
    var segRows=Object.keys(seg).sort(function(a,b){return seg[b]-seg[a];}).map(function(k){ return '<tr><td>'+esc(k)+'</td><td class="num">'+seg[k]+'</td></tr>'; }).join('');
    $('segTable').innerHTML='<thead><tr><th>서비스 · 상황</th><th>수요</th></tr></thead><tbody>'+(segRows||'<tr><td class="muted" colspan="2">데이터 없음</td></tr>')+'</tbody>';

    // 목록
    var rows=leads.map(function(l){
      var conv=(l.session_id&&diagSet[l.session_id])?'<span class="anchor">진단 후</span>':'<span class="pill">직접</span>';
      return '<tr><td class="muted">'+fmt(l.created_at)+'</td>'+
        '<td>'+(KINDKO[l.kind]||l.kind)+'</td>'+
        '<td>'+esc(SVCKO[l.service]||l.service||'—')+'</td>'+
        '<td>'+esc(l.occasion||'—')+'</td>'+
        '<td>'+(l.contact?esc(l.contact):'<span class="muted">—</span>')+'</td>'+
        '<td>'+conv+'</td></tr>';
    }).join('');
    $('ldTable').innerHTML='<thead><tr><th>시각</th><th>유형</th><th>서비스</th><th>상황</th><th>이메일</th><th>유입</th></tr></thead><tbody>'+(rows||'<tr><td class="muted" colspan="6">아직 수요가 없어요</td></tr>')+'</tbody>';
  }
})();
