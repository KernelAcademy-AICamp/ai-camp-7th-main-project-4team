  /* 견적서 페이지 — 요청 클릭 시 진입. 고객 체형진단 결과 상세(브랜드 추천 제외) + 요청 내용 + 제안.
     데이터는 pro.js가 저장한 localStorage 'fitting.pro.reqs'를 공유. 체형 상세는 data/bodytypes.json. */
  function loadLS(k, def){ try{ var v=localStorage.getItem('fitting.'+k); return v?JSON.parse(v):def; }catch(e){ return def; } }
  function saveLS(k, v){ try{ localStorage.setItem('fitting.'+k, JSON.stringify(v)); }catch(e){} }
  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function toast(m){ var t=$('toast'); t.textContent=m; t.classList.add('on'); clearTimeout(window._t); window._t=setTimeout(function(){t.classList.remove('on');},2000); }

  var idx = parseInt(new URLSearchParams(location.search).get('req'),10);
  var reqs = loadLS('pro.reqs', []);
  var profile = loadLS('pro.profile', null);
  var MY_PRICE = (profile && profile.services && profile.services[0]) ? profile.services[0].price : 120000;
  var BTMAP = {};
  var offering = false;

  /* 요청자별 임의(데모) 측정치 + 선호핏 */
  var MEASURE_BY_CUST = {
    '김도현':{ top:{shoulder:55,chestFull:46,waist:40,arm:52}, bottom:{waist:44,hip:41}, prefTop:55, prefBottom:46 },
    '정예린':{ top:{shoulder:72,chestFull:48,waist:30,arm:55}, bottom:{waist:34,hip:30}, prefTop:34, prefBottom:40 },
    '이서연':{ top:{shoulder:62,chestFull:38,waist:28,arm:54}, bottom:{waist:24,hip:58}, prefTop:55, prefBottom:35 },
    '박지우':{ top:{shoulder:40,chestFull:44,waist:36,arm:46}, bottom:{waist:30,hip:68}, prefTop:52, prefBottom:74 },
    '최민준':{ top:{shoulder:58,chestFull:56,waist:50,arm:57}, bottom:{waist:50,hip:47}, prefTop:70, prefBottom:55 },
    '이수민':{ top:{shoulder:48,chestFull:52,waist:26,arm:50}, bottom:{waist:22,hip:60}, prefTop:50, prefBottom:36 },
    '박준영':{ top:{shoulder:74,chestFull:52,waist:34,arm:58}, bottom:{waist:38,hip:32}, prefTop:38, prefBottom:44 },
    '최지아':{ top:{shoulder:38,chestFull:42,waist:34,arm:44}, bottom:{waist:30,hip:66}, prefTop:58, prefBottom:70 }
  };
  var MEASURE_DEFAULT = { top:{shoulder:50,chestFull:50,waist:45,arm:50}, bottom:{waist:45,hip:48}, prefTop:55, prefBottom:50 };

  var SVC_SVG = {
    online:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="12" rx="2"/><path d="M8 20h8M12 16.5v3.5"/></svg>',
    shopping:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h12l-1 13H7L6 7z"/><path d="M9 7V6a3 3 0 0 1 6 0v1"/></svg>',
    image:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13.5" r="3.3"/><path d="M8.5 7l1.3-2h4.4l1.3 2"/></svg>'
  };
  function svcMeta(s){
    if(s==='shopping') return {cls:'shopping', label:'동행 쇼핑', icon:SVC_SVG.shopping};
    if(s==='image')  return {cls:'image',  label:'이미지 컨설팅', icon:SVC_SVG.image};
    return {cls:'online', label:'온라인 스타일링', icon:SVC_SVG.online};
  }
  function svcLabel(s){ return svcMeta(s).label; }
  function svcBadge(s){ var m=svcMeta(s); return '<span class="svcbadge '+m.cls+'">'+m.icon+' '+m.label+'</span>'; }
  function stClass(s){ return s==='신규'?'nw':(s==='제안발송'?'sent':(s==='수락됨'?'prog':(s==='완료'?'done':'sent'))); }
  function starsRO(n){ var s=''; for(var k=1;k<=5;k++) s+='<span style="color:'+(k<=n?'#e8a13a':'#ddd')+'">★</span>'; return s; }

  /* ── 액션(상태별) ── 받은 요청: 수락/거절 · 진행 중: 완료/취소 · 보낸 제안: 응답 대기 ── */
  function actionHTML(r){
    if(r.status==='신규'){
      return '<button class="btn" onclick="accept()">수락</button>'+
             '<button class="btn ghost" style="margin-top:10px" onclick="reject()">거절</button>';
    }
    if(r.status==='제안발송'){ var o=r.offer||{};
      return '<div class="note-quote"><b style="color:var(--green)">제안 발송됨</b> · <span class="num">'+((o.price||0).toLocaleString())+'</span>원<br>'+
        '<span style="font-size:13px;color:var(--sub)">"'+esc(o.msg||'')+'"</span><br>'+
        '<span style="font-size:12.5px;color:var(--sub2)">고객 응답을 기다리는 중이에요</span></div>'+
        '<button class="btn ghost" style="margin-top:10px" onclick="simAccept()">고객 수락 · 데모</button>';
    }
    if(r.status==='수락됨'){
      return '<div class="note-quote"><b style="color:var(--green)">수락됨 · 진행 중</b>'+((r.offer&&r.offer.price)?' · <span class="num">'+r.offer.price.toLocaleString()+'</span>원':'')+'</div>'+
        '<button class="btn" style="margin-top:10px" onclick="completeReq()">완료 처리</button>'+
        '<button class="btn ghost" style="margin-top:8px" onclick="cancelReq()">취소 처리</button>';
    }
    if(r.status==='완료'){
      if(r.review) return '<div class="seclabel">고객 후기</div><div class="note-quote"><span style="letter-spacing:1px">'+starsRO(r.review.rating)+'</span><br>"'+esc(r.review.text)+'"</div>';
      return '<div class="note-quote muted">완료 · 고객 후기를 기다리는 중이에요</div>';
    }
    if(r.status==='거절'){ return '<div class="note-quote muted">거절한 요청이에요'+(r.reason?' · "'+esc(r.reason)+'"':'')+'</div><button class="btn ghost" style="margin-top:10px" onclick="undoReject()">되돌리기</button>'; }
    if(r.status==='취소'){ return '<div class="note-quote muted">취소된 요청이에요'+(r.reason?' · "'+esc(r.reason)+'"':'')+'</div><button class="btn ghost" style="margin-top:10px" onclick="undoCancel()">되돌리기</button>'; }
    return '';
  }
  function svcPrice(service){ if(profile&&profile.services){ var f=profile.services.filter(function(s){return s.type===service;})[0]; if(f) return f.price; } return MY_PRICE; }
  function accept(){ if(!reqs[idx].offer) reqs[idx].offer={price:svcPrice(reqs[idx].service)}; reqs[idx].status='수락됨'; saveLS('pro.reqs',reqs); render(); toast('요청을 수락했어요'); }
  function reject(){ var rs=prompt('거절 사유 (선택 입력)',''); if(rs===null) return; reqs[idx].reason=rs.trim(); reqs[idx].status='거절'; saveLS('pro.reqs',reqs); render(); toast('요청을 거절했어요'); }
  function undoReject(){ reqs[idx].status='신규'; reqs[idx].reason=''; saveLS('pro.reqs',reqs); render(); toast('거절을 되돌렸어요'); }
  function simAccept(){ reqs[idx].status='수락됨'; saveLS('pro.reqs',reqs); render(); toast(reqs[idx].cust+' 님이 제안을 수락했어요'); }
  function completeReq(){ reqs[idx].status='완료'; saveLS('pro.reqs',reqs); render(); toast('완료 처리했어요'); }
  function cancelReq(){ var rs=prompt('취소 사유 (선택 입력)',''); if(rs===null) return; reqs[idx].reason=rs.trim(); reqs[idx].status='취소'; saveLS('pro.reqs',reqs); render(); toast('진행을 취소했어요'); }
  function undoCancel(){ reqs[idx].status='수락됨'; reqs[idx].reason=''; saveLS('pro.reqs',reqs); render(); toast('취소를 되돌렸어요'); }

  /* ── 내 체형 측정 — 마이페이지 세그먼트(5칸) 디자인 재현 ── */
  function segIdx(pct){ return Math.max(0, Math.min(4, Math.floor((pct==null?50:pct)/20))); }
  function zoneLabel(i, L, R){ return i===0?L:(i===1?L+' 편':(i===2?'표준':(i===3?R+' 편':R))); }
  function n2row(part, pct, L, R, lo){
    var idx=segIdx(pct), segs='';
    for(var i=0;i<5;i++){ var c=(i===idx)?' on':(Math.abs(i-idx)===1?' near':''); segs+='<div class="n2seg'+c+'"></div>'; }
    return '<div class="n2row'+(lo?' lo':'')+'"><div class="n2top"><span class="part">'+esc(part)+'</span><span class="zone">'+esc(zoneLabel(idx,L,R))+'</span></div>'+
      '<div class="n2segs">'+segs+'</div>'+
      '<div class="n2scale"><span>'+esc(L)+'</span><span>'+esc(R)+'</span></div></div>';
  }
  function measureCard(m, bt, r){
    return '<div class="dtl-meas">'+
      '<div class="dtl-meas-h"><span class="k">내 체형 측정</span><span class="chip">전신 · 상·하의 완료</span></div>'+
      '<div class="dtl-grp up" style="margin-top:8px">상체 — 상의 진단</div>'+
      n2row('어깨', m.top.shoulder, '좁은', '넓은', false)+
      n2row('가슴', m.top.chestFull, '슬림한', '볼륨 있는', false)+
      '<div class="dtl-grp lo">하체 — 하의 진단</div>'+
      n2row('허리', m.bottom.waist, '슬림한', '볼륨 있는', true)+
      n2row('엉덩이', m.bottom.hip, '슬림한', '볼륨 있는', true)+
      '<div class="dtl-grp pref">취향</div>'+
      n2row('핏 취향', m.prefTop, '타이트', '여유', false)+
      '<div class="dtl-note">어깨·가슴·허리·엉덩이 측정을 종합해 <b style="color:var(--ink)">'+esc(bt.name||r.bodytype||'')+'('+esc(r.type||'')+')</b> 유형으로 확정됐어요</div>'+
    '</div>';
  }

  /* ── 전체 렌더 ── */
  function render(){
    var r = reqs[idx];
    if(!r){ $('quoteRoot').innerHTML='<p class="crumb">요청을 찾을 수 없어요.</p><p style="margin-top:10px"><a class="tinybtn" onclick="location.href=\'pro.html\'">요청 내역으로</a></p>'; return; }
    var out = r.dir==='out';
    var bt = BTMAP[r.type] || {};
    var m = MEASURE_BY_CUST[r.cust] || MEASURE_DEFAULT;
    var profileLines = (bt.profile||[]).map(function(p){ return '<p class="bdesc">'+esc(p)+'</p>'; }).join('');

    // 왼쪽: 체형 데이터가 있으면 측정 표시, 없으면(구 데이터) 안내 플레이스홀더
    var leftCol = (out && !r.cm)
      ? '<div class="card"><div class="seclabel">고객 체형 정보</div><p class="bdesc" style="color:var(--sub)">고객이 진단 결과를 공유하면 체형 측정 정보가 여기에 표시돼요.</p></div>'
      : measureCard(m, bt, r);

    // 오른쪽 상단: 받은 요청=체형결과상세, 보낸 제안=제안 대상
    var detailCard = out
      ? '<div class="card"><div class="seclabel">제안 대상</div>'+
          '<div class="kv"><span>고객</span><b>'+esc(r.cust)+' 님</b></div>'+
          '<div class="kv"><span>상황</span><b>'+esc(r.occ||'—')+'</b></div>'+
          '<div class="kv"><span>서비스 유형</span><b>'+svcLabel(r.service)+'</b></div>'+
        '</div>'
      : '<div class="card">'+
          '<div class="seclabel">체형진단 결과 상세</div>'+
          '<div class="btname"><i style="background:'+esc(bt.point||'#ccc')+'"></i>'+esc(bt.name||r.bodytype||'')+'</div>'+
          '<div class="btsub">'+esc(bt.sizeKorea||'')+(bt.silhouette?' · '+esc(bt.silhouette)+' 실루엣':'')+' · <span class="num">'+(r.cm||'—')+'</span>cm · <span class="num">'+(r.kg||'—')+'</span>kg</div>'+
          profileLines+
        '</div>'+
        '<div class="card">'+
          '<div class="subhead">요청 내용</div>'+
          '<div class="kv"><span>서비스 유형</span><b>'+svcLabel(r.service)+'</b></div>'+
          '<div class="kv"><span>상황</span><b>'+esc(r.occ)+'</b></div>'+
          '<div class="kv"><span>예산</span><b>'+esc(r.budget)+'</b></div>'+
          '<div class="kv"><span>희망 일정</span><b>'+esc(r.date||'—')+'</b></div>'+
          '<div class="seclabel" style="margin-top:16px">한 줄 요청</div>'+
          '<div class="note-quote'+(r.note?'':' muted')+'">'+(r.note?('"'+esc(r.note)+'"'):'요청 메모 없음')+'</div>'+
        '</div>';

    $('quoteRoot').innerHTML =
      '<p class="crumb">쇼퍼 지원 · '+(out?'보낸 제안':'견적 요청')+'</p>'+
      '<h1>'+esc(r.cust)+' 님'+(r.occ?' · '+esc(r.occ):'')+'</h1>'+
      '<div class="htags">'+svcBadge(r.service)+'<span class="st '+stClass(r.status)+'">'+esc(r.status)+'</span></div>'+
      '<div class="qgrid2">'+
        '<div class="qleft">'+ leftCol +'</div>'+
        '<div class="qright">'+
          detailCard +
          '<div class="card"><div class="subhead">'+(out?'제안 현황':'제안')+'</div>'+ actionHTML(r) +'</div>'+
        '</div>'+
      '</div>';
  }

  fetch('data/bodytypes.json').then(function(r){return r.json();}).then(function(j){
    (j.types||[]).forEach(function(t){ BTMAP[t.code]=t; }); render();
  }).catch(function(){ render(); });
