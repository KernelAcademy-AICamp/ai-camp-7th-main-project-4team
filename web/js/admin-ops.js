/* admin-ops.js — 3.E 내부운영(후순위 · 화면 우선).
   샘플. 실제 접근제어는 백엔드(Supabase RLS), 감사로그는 불변(append-only).
   역할: owner(전체)·ops(운영)·data(데이터)·support(지원·읽기). */
(function(){
  "use strict";
  var $=function(id){return document.getElementById(id);};
  var esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};
  function kpi(n,l,s){return '<div class="kpi"><div class="n">'+n+'</div><div class="l">'+l+'</div>'+(s?'<div class="s">'+s+'</div>':'')+'</div>';}
  function d(s){return esc((s||'').replace('T',' ').slice(0,16));}

  window.__otab=function(t){
    ['rbac','audit','flags'].forEach(function(k){ var p=$('panel-'+k); if(p)p.classList.toggle('on',k===t); });
    Array.prototype.forEach.call(document.querySelectorAll('#atabs .t'),function(el){ el.classList.toggle('on', el.getAttribute('data-tab')===t); });
  };

  var ROLELBL={owner:'오너',ops:'운영',data:'데이터',support:'지원'};
  var AREAS=['사이즈·데이터','회원·거래','사업현황','B2B API','내부운영'];
  // 역할 × 영역 접근권: rw(읽기·쓰기)·r(읽기)·-(없음)
  var MATRIX={
    owner:  ['rw','rw','rw','rw','rw'],
    ops:    ['r', 'rw','rw','-', '-'],
    data:   ['rw','-', 'r', 'r', '-'],
    support:['r', 'r', '-', '-', '-']
  };
  var USERS=[
    {id:'u1',email:'trubard@gmail.com',name:'팀장',role:'owner',last:'2026-07-13T09:10:00',status:'활성'},
    {id:'u2',email:'sangmin@fitting.kr',name:'상민',role:'data',last:'2026-07-12T22:40:00',status:'활성'},
    {id:'u3',email:'sohee@fitting.kr', name:'소희',role:'ops', last:'2026-07-12T18:05:00',status:'활성'},
    {id:'u4',email:'cs@fitting.kr',    name:'지원봇',role:'support',last:'2026-07-10T11:20:00',status:'정지'}
  ];
  var AUDIT=[
    {ts:'2026-07-13T09:12:00',who:'팀장',role:'owner',act:'로그인',target:'admin',area:'내부운영'},
    {ts:'2026-07-12T22:41:00',who:'상민',role:'data',act:'실측표 재생성',target:'garments.json',area:'사이즈·데이터'},
    {ts:'2026-07-12T21:03:00',who:'소희',role:'ops',act:'전문가 승인',target:'p214',area:'회원·거래'},
    {ts:'2026-07-12T20:15:00',who:'소희',role:'ops',act:'회원 정지',target:'m1021',area:'회원·거래'},
    {ts:'2026-07-12T15:30:00',who:'상민',role:'data',act:'엔진 파라미터 조회',target:'FitEngine',area:'사이즈·데이터'},
    {ts:'2026-07-11T10:02:00',who:'팀장',role:'owner',act:'API 키 정지',target:'c06',area:'B2B API'}
  ];
  var FLAGS=[
    {key:'ocr_collect',   name:'OCR 사이즈 수집(베타)',    on:true,  scope:'admin'},
    {key:'ai_bridge',     name:'AI 프롬프트 브릿지',        on:true,  scope:'admin'},
    {key:'derived_cats',  name:'파생 카테고리(아우터·치마·원피스)', on:true, scope:'app'},
    {key:'real_matching', name:'실매칭(역경매) 오픈',       on:false, scope:'app'},
    {key:'b2b_api',       name:'B2B API 게이트웨이',        on:false, scope:'b2b'}
  ];
  var COUPONS=[
    {code:'FIT-LAUNCH', desc:'런칭 기념 전문가 매칭 수수료 면제', use:'0/500', period:'~2026-08-31', status:'예약'},
    {code:'FRIEND10',   desc:'친구초대 1만원',                  use:'23/1000',period:'상시',        status:'활성'}
  ];

  function renderRbac(){
    $('rKpis').innerHTML=[
      kpi(USERS.length,'관리자 계정','활성 '+USERS.filter(function(u){return u.status==='활성';}).length),
      kpi(Object.keys(ROLELBL).length,'역할',''),
      kpi(AUDIT.length,'최근 감사 이벤트',''),
      kpi(FLAGS.filter(function(f){return f.on;}).length+'/'+FLAGS.length,'활성 피처플래그','')
    ].join('');
    var urows=USERS.map(function(u){
      return '<tr><td><b>'+esc(u.name)+'</b> <span class="muted">'+esc(u.email)+'</span></td>'+
        '<td><span class="pill" style="color:var(--green);background:var(--green-soft)">'+esc(ROLELBL[u.role])+'</span></td>'+
        '<td class="muted">'+d(u.last)+'</td>'+
        '<td><span class="pill" style="'+(u.status==='활성'?'color:#1f6a4a;background:var(--green-soft)':'color:#7a1f1f;background:#f5d6d6')+'">'+esc(u.status)+'</span></td></tr>';
    }).join('');
    $('userTable').innerHTML='<thead><tr><th>계정</th><th>역할</th><th>최근 접속</th><th>상태</th></tr></thead><tbody>'+urows+'</tbody>';
    var perm=function(v){ return v==='rw'?'<span class="pill" style="color:#1f6a4a;background:var(--green-soft)">쓰기</span>':(v==='r'?'<span class="pill" style="color:#3a5a8a;background:#dde6f5">읽기</span>':'<span class="muted">·</span>'); };
    var rrows=Object.keys(MATRIX).map(function(role){
      return '<tr><td><b>'+esc(ROLELBL[role])+'</b></td>'+MATRIX[role].map(function(v){return '<td>'+perm(v)+'</td>';}).join('')+'</tr>';
    }).join('');
    $('roleTable').innerHTML='<thead><tr><th>역할 \\ 영역</th>'+AREAS.map(function(a){return '<th>'+esc(a)+'</th>';}).join('')+'</tr></thead><tbody>'+rrows+'</tbody>';
  }

  var aFilter='all';
  window.__af=function(s){ aFilter=s; drawAudit(); };
  function renderAudit(){
    $('aFilters').innerHTML=['all'].concat(AREAS).map(function(s){
      return '<label class="numin"><input type="radio" name="af" '+(aFilter===s?'checked':'')+' onchange="__af(\''+s+'\')"><span>'+(s==='all'?'전체':s)+'</span></label>';
    }).join('')+'<span class="cnt muted" id="aCnt"></span>';
    drawAudit();
  }
  function drawAudit(){
    var list=(aFilter==='all'?AUDIT:AUDIT.filter(function(a){return a.area===aFilter;}))
      .slice().sort(function(a,b){return (b.ts||'').localeCompare(a.ts||'');});
    $('aCnt').textContent=list.length+' 건';
    var rows=list.map(function(a){
      return '<tr><td class="muted">'+d(a.ts)+'</td><td><b>'+esc(a.who)+'</b> <span class="muted">'+esc(ROLELBL[a.role]||a.role)+'</span></td>'+
        '<td>'+esc(a.act)+'</td><td class="muted"><code>'+esc(a.target)+'</code></td><td class="muted">'+esc(a.area)+'</td></tr>';
    }).join('');
    $('auditTable').innerHTML='<thead><tr><th>시각</th><th>수행자</th><th>동작</th><th>대상</th><th>영역</th></tr></thead><tbody>'+(rows||'<tr><td class="muted">없음</td></tr>')+'</tbody>';
  }

  function renderFlags(){
    var frows=FLAGS.map(function(f){
      return '<tr><td><code>'+esc(f.key)+'</code></td><td>'+esc(f.name)+'</td><td class="muted">'+esc(f.scope)+'</td>'+
        '<td><span class="pill" style="'+(f.on?'color:#1f6a4a;background:var(--green-soft)':'color:#8a6d1f;background:#f5ecd0')+'">'+(f.on?'ON':'OFF')+'</span></td>'+
        '<td><a class="pill" style="cursor:pointer" onclick="__flag(\''+f.key+'\')">'+(f.on?'끄기':'켜기')+'</a></td></tr>';
    }).join('');
    $('flagTable').innerHTML='<thead><tr><th>키</th><th>기능</th><th>범위</th><th>상태</th><th>조치</th></tr></thead><tbody>'+frows+'</tbody>';
    var crows=COUPONS.map(function(c){
      return '<tr><td><code>'+esc(c.code)+'</code></td><td class="muted">'+esc(c.desc)+'</td><td class="num">'+esc(c.use)+'</td><td class="muted">'+esc(c.period)+'</td>'+
        '<td><span class="pill" style="'+(c.status==='활성'?'color:#1f6a4a;background:var(--green-soft)':'color:#8a6d1f;background:#f5ecd0')+'">'+esc(c.status)+'</span></td></tr>';
    }).join('');
    $('couponTable').innerHTML='<thead><tr><th>코드</th><th>내용</th><th>사용</th><th>기간</th><th>상태</th></tr></thead><tbody>'+crows+'</tbody>';
  }
  window.__flag=function(k){ var f=FLAGS.filter(function(x){return x.key===k;})[0]; if(f)f.on=!f.on; renderRbac(); renderFlags(); };

  renderRbac(); renderAudit(); renderFlags();
})();
