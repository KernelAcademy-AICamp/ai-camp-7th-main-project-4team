/* admin-access.js — 관리자 관리(초대·자동승격·해제). [db/07]
   초대(admin_invite) → 초대된 이메일이 로그인하면 claim_admin()이 자동 승격. RLS admin. */
(function(){
  "use strict";
  var $=function(id){ return document.getElementById(id); };
  var esc=function(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); };
  function fmt(ts){ try{ var d=new Date(ts); return (d.getMonth()+1)+'/'+d.getDate(); }catch(e){ return ''; } }
  var MYEMAIL=null;

  function load(){
    return Promise.all([ADMINAUTH.listInvites(), ADMINAUTH.listAdmins(), ADMINAUTH.email()]).then(function(res){
      MYEMAIL=res[2]||null;
      renderInvites(res[0]||[]); renderAdmins(res[1]||[]);
    }).catch(function(){ $('admTable').innerHTML='<tbody><tr><td>로드 실패 · admin 로그인 필요</td></tr></tbody>'; });
  }
  load();

  function renderInvites(list){
    var rows=list.map(function(i){
      return '<tr><td><b>'+esc(i.email)+'</b></td><td class="muted">'+esc(i.invited_by||'—')+'</td><td class="muted">'+fmt(i.invited_at)+'</td>'+
        '<td><button class="tinybtn ghost" onclick="__cancelInvite(\''+esc(i.email).replace(/'/g,"\\'")+'\')">취소</button></td></tr>';
    }).join('');
    $('invTable').innerHTML='<thead><tr><th>이메일</th><th>초대한 사람</th><th>초대일</th><th></th></tr></thead><tbody>'+(rows||'<tr><td class="muted" colspan="4">대기 중인 초대 없음</td></tr>')+'</tbody>';
  }
  function renderAdmins(list){
    var rows=list.map(function(a){
      var isMe=MYEMAIL && a.email && a.email.toLowerCase()===MYEMAIL.toLowerCase();
      return '<tr><td><b>'+esc(a.email)+'</b>'+(isMe?' <span class="pill">나</span>':'')+'</td><td class="muted">'+esc(a.role||'admin')+'</td><td class="muted">'+fmt(a.added_at)+'</td>'+
        '<td>'+(isMe?'<span class="muted">—</span>':'<button class="tinybtn ghost" style="color:var(--warn)" onclick="__revoke(\''+a.id+'\',\''+esc(a.email).replace(/'/g,"\\'")+'\')">해제</button>')+'</td></tr>';
    }).join('');
    $('admTable').innerHTML='<thead><tr><th>이메일</th><th>역할</th><th>등록일</th><th></th></tr></thead><tbody>'+(rows||'<tr><td class="muted" colspan="4">관리자 없음</td></tr>')+'</tbody>';
  }

  window.__invite=async function(){
    var inp=$('invEmail'), email=(inp.value||'').trim().toLowerCase();
    var msg=$('invMsg');
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ if(msg) msg.textContent='이메일을 정확히 입력해 주세요'; inp.focus(); return; }
    if(msg) msg.textContent='초대 중…';
    var r=await ADMINAUTH.inviteAdmin(email, MYEMAIL);
    if(r.ok){ if(msg) msg.textContent='초대됨 ✓ · 그 계정이 로그인하면 자동 승격돼요'; inp.value=''; load(); }
    else if(msg) msg.textContent='초대 실패: '+(r.error||'이미 초대됐거나 권한 확인');
  };
  window.__cancelInvite=async function(email){
    if(!confirm(email+' 초대를 취소할까요?')) return;
    if(await ADMINAUTH.cancelInvite(email)) load(); else alert('취소 실패');
  };
  window.__revoke=async function(id, email){
    if(!confirm(email+' 의 관리자 권한을 해제할까요?\n이 계정은 더 이상 admin에 접근할 수 없어요.')) return;
    if(await ADMINAUTH.revokeAdmin(id)) load(); else alert('해제 실패(admin 권한 확인)');
  };
})();
