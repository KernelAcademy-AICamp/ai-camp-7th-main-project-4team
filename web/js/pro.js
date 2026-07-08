  /* 쇼퍼(공급자) 포털 — 시작 구조. 페르소나: 소희 쇼퍼.
     고객 측 요청 라이프사이클의 대칭 뷰. 요청 클릭 → 상세 드로어(체형·사이즈 첨부 + 요청 내용)에서 제안. */
  function loadLS(k, def){ try{ var v=localStorage.getItem('fitting.'+k); return v?JSON.parse(v):def; }catch(e){ return def; } }
  function saveLS(k, v){ try{ localStorage.setItem('fitting.'+k, JSON.stringify(v)); }catch(e){} }
  var MY_PRICE=120000;

  var reqs = loadLS('pro.reqs', [
    {cust:'김도현', type:'STR', bodytype:'시크 스트레이트', gender:'male',   cm:172, kg:65, occ:'소개팅',     budget:'5~10만',  date:'2026.07.02', note:'과하지 않게 깔끔한 첫인상 원해요', status:'신규'},
    {cust:'정예린', type:'INV', bodytype:'모던 V라인',     gender:'female', cm:167, kg:58, occ:'일상 코디',   budget:'~5만',    date:'2026.07.01', note:'출근룩 위주로 데일리하게 입고 싶어요', status:'신규'},
    {cust:'이서연', type:'HRG', bodytype:'엘레강스 X라인', gender:'female', cm:163, kg:52, occ:'면접·발표',   budget:'10~15만', date:'2026.06.30', note:'신뢰감 있는 오피스룩', status:'제안발송', offer:{price:95000, msg:'면접관 시선까지 고려해 첫인상 깔끔하게 잡아드릴게요'}},
    {cust:'박지우', type:'TRI', bodytype:'소프트 A라인',   gender:'female', cm:160, kg:54, occ:'결혼식 하객', budget:'10~15만', date:'2026.06.27', note:'', status:'수락됨', offer:{price:120000, msg:'하객룩 단정하게 코디해드릴게요'}},
    {cust:'최민준', type:'BAL', bodytype:'이지 밸런스',    gender:'male',   cm:175, kg:70, occ:'데일리',     budget:'~5만',    date:'2026.06.18', status:'완료', offer:{price:60000, msg:''}, review:{rating:5, text:'취향 저격이었어요! 반품 없이 한 번에 성공'}}
  ]);

  /* ===== 네비 ===== */
  function nav(el){
    var m=document.querySelectorAll('#smenu a'); for(var i=0;i<m.length;i++) m[i].classList.remove('on'); el.classList.add('on');
    var ps=document.querySelectorAll('.panel'); for(var j=0;j<ps.length;j++) ps[j].classList.remove('on');
    document.getElementById(el.dataset.p).classList.add('on');
    window.scrollTo({top:0, behavior:'smooth'});
  }
  function toast(m){ var t=document.getElementById('toast'); t.textContent=m; t.classList.add('on'); clearTimeout(window._t); window._t=setTimeout(function(){t.classList.remove('on');},2000); }
  function stClass(s){ return s==='신규'?'nw':(s==='제안발송'?'sent':(s==='수락됨'?'prog':'done')); }
  function starsRO(n){ var s=''; for(var k=1;k<=5;k++) s+='<span style="color:'+(k<=n?'var(--ink)':'var(--line2)')+'">★</span>'; return s; }

  /* ===== 요청 행(요약, 클릭 시 상세) ===== */
  function reqTop(r, clickable){ var i=reqs.indexOf(r);
    return '<div class="req'+(clickable?' rowbtn" onclick="openReqDetail('+i+')':'')+'">'+
      '<div class="reqtop"><div class="av">'+(r.cust?r.cust.charAt(0):'?')+'</div>'+
      '<div class="info"><b>'+r.cust+' 님 · '+r.occ+'</b><small>'+r.bodytype+' · 예산 '+r.budget+' · '+r.date+'</small></div>'+
      '<span class="st '+stClass(r.status)+'">'+r.status+'</span>'+(clickable?'<span class="chev">›</span>':'')+'</div></div>';
  }

  /* ===== 상세 드로어 ===== */
  function drawerAction(r,i){ var s=r.status;
    if(s==='신규'){ if(r._offering) return offerForm(r,i); return '<button class="btn full" onclick="openOffer('+i+')">제안 보내기</button>'; }
    if(s==='제안발송'){ var o=r.offer||{}; return '<div class="note-quote"><b style="color:var(--green)">제안 발송됨</b> · <span style="font-family:var(--num);font-weight:800">'+(o.price?o.price.toLocaleString():'—')+'</span>원<br><span style="font-size:13px;color:var(--sub)">"'+(o.msg||'')+'"</span><br><span style="font-size:12.5px;color:var(--sub2)">고객 응답을 기다리는 중이에요</span></div><button class="btn ghost full" style="margin-top:10px" onclick="simAccept('+i+')">고객 수락 · 데모</button>'; }
    if(s==='수락됨'){ var o2=r.offer||{}; return '<div class="note-quote"><b style="color:var(--green)">수락됨 · 진행 중</b> · <span style="font-family:var(--num);font-weight:800">'+(o2.price?o2.price.toLocaleString():'—')+'</span>원</div><button class="btn full" style="margin-top:10px" onclick="completeReq('+i+')">완료 처리</button>'; }
    if(s==='완료'){ if(r.review) return '<div class="dsec-label">고객 후기</div><div class="note-quote"><span style="letter-spacing:1px">'+starsRO(r.review.rating)+'</span><br>"'+r.review.text+'"</div>'; return '<div class="note-quote muted">완료 · 고객 후기를 기다리는 중이에요</div>'; }
    return '';
  }
  function offerForm(r,i){
    return '<div class="offerform">'+
      '<div class="row"><label>견적</label><input id="offAmt'+i+'" type="number" value="'+((r.offer&&r.offer.price)||MY_PRICE)+'"> 원</div>'+
      '<textarea id="offMsg'+i+'" placeholder="고객에게 전할 한 줄 제안">'+((r.offer&&r.offer.msg)||'')+'</textarea>'+
      '<div class="obtns"><button class="tinybtn ghost" onclick="cancelOffer('+i+')">취소</button><button class="tinybtn" onclick="sendOffer('+i+')">제안 발송</button></div>'+
    '</div>';
  }
  function openReqDetail(i){ var r=reqs[i]; var tp=r.type||'STR', g=r.gender||'female';
    document.getElementById('drawerBody').innerHTML=
      '<div class="dh"><div class="dcrumb">고객 요청 상세</div><h2>'+r.cust+' 님 · '+r.occ+'</h2></div>'+
      '<div class="db">'+
        '<div class="dsec-label">첨부된 체형·사이즈 프로필</div>'+
        '<div class="bodycard"><iframe src="card.html?type='+tp+'&g='+g+'&compact=1" scrolling="no" tabindex="-1" title="고객 체형 카드"></iframe></div>'+
        '<div class="bodymeta">'+r.bodytype+' ('+tp+') · <span class="num">'+(r.cm||'—')+'</span>cm · <span class="num">'+(r.kg||'—')+'</span>kg</div>'+
        '<div class="dsec-label">요청 내용</div>'+
        '<div class="kv"><span>서비스 유형</span><b>온라인 스타일링</b></div>'+
        '<div class="kv"><span>상황</span><b>'+r.occ+'</b></div>'+
        '<div class="kv"><span>예산</span><b>'+r.budget+'</b></div>'+
        '<div class="kv"><span>희망 일정</span><b>'+(r.date||'—')+'</b></div>'+
        '<div class="dsec-label">한 줄 요청</div>'+
        '<p class="note-quote'+(r.note?'':' muted')+'">'+(r.note?('"'+r.note+'"'):'요청 메모 없음')+'</p>'+
        '<div class="dact">'+drawerAction(r,i)+'</div>'+
      '</div>';
    document.getElementById('drawer').classList.add('on'); document.getElementById('scrim').classList.add('on');
  }
  function closeDrawer(){ document.getElementById('drawer').classList.remove('on'); document.getElementById('scrim').classList.remove('on'); }
  document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeDrawer(); });

  /* ===== 요청함 액션 (상세 드로어 안에서) ===== */
  function refresh(i){ renderAll(); if(document.getElementById('drawer').classList.contains('on')) openReqDetail(i); }
  function openOffer(i){ reqs[i]._offering=true; openReqDetail(i); }
  function cancelOffer(i){ reqs[i]._offering=false; openReqDetail(i); }
  function sendOffer(i){ var a=document.getElementById('offAmt'+i), m=document.getElementById('offMsg'+i);
    var price=a?parseInt(a.value,10)||MY_PRICE:MY_PRICE, msg=m?m.value.trim():'';
    reqs[i].offer={price:price, msg:msg||'요청에 맞춰 코디해드릴게요'}; reqs[i].status='제안발송'; reqs[i]._offering=false;
    saveLS('pro.reqs',reqs); refresh(i); toast(reqs[i].cust+' 님에게 제안을 보냈어요'); }
  function simAccept(i){ reqs[i].status='수락됨'; saveLS('pro.reqs',reqs); refresh(i); toast(reqs[i].cust+' 님이 제안을 수락했어요 · 진행 시작'); }
  function completeReq(i){ reqs[i].status='완료'; saveLS('pro.reqs',reqs); refresh(i); toast('완료 처리했어요 · 고객 후기를 기다려요'); }

  /* ===== 렌더 ===== */
  function renderInbox(){
    var el=document.getElementById('inboxList');
    var open=reqs.filter(function(r){return r.status!=='완료';}), done=reqs.filter(function(r){return r.status==='완료';});
    var list=open.concat(done);
    el.innerHTML = list.length ? list.map(function(r){ return reqTop(r,true); }).join('') : '<p class="note" style="padding:14px 0">아직 받은 요청이 없어요</p>';
  }
  function renderRecent(){ document.getElementById('dashRecent').innerHTML=reqs.slice(0,3).map(function(r){ return reqTop(r,true); }).join(''); }
  function renderReviews(){
    var el=document.getElementById('reviewList');
    var rv=reqs.filter(function(r){return r.review;});
    el.innerHTML = rv.length ? rv.map(function(r){
      return '<div class="req"><div class="reqtop"><div class="av">'+r.cust.charAt(0)+'</div><div class="info"><b>'+r.cust+' 님 · '+r.occ+'</b><small style="letter-spacing:1px">'+starsRO(r.review.rating)+'</small></div></div><div class="reqact"><span class="reqnote">"'+r.review.text+'"</span></div></div>';
    }).join('') : '<p class="note" style="padding:14px 0">아직 받은 후기가 없어요</p>';
  }
  function renderStats(){
    var nw=reqs.filter(function(r){return r.status==='신규';}).length;
    var prog=reqs.filter(function(r){return r.status==='수락됨';}).length;
    var done=reqs.filter(function(r){return r.status==='완료';}).length;
    document.getElementById('dashStats').innerHTML=
      '<div class="stat"><b>'+nw+'</b><small>신규 요청</small></div>'+
      '<div class="stat"><b>'+prog+'</b><small>진행 중</small></div>'+
      '<div class="stat"><b>'+done+'</b><small>완료</small></div>'+
      '<div class="stat"><b>4.9</b><small>평점</small></div>';
    document.getElementById('newCnt').textContent=nw;
    document.getElementById('pRev').textContent=reqs.filter(function(r){return r.review;}).length;
  }
  function renderAll(){ renderStats(); renderRecent(); renderInbox(); renderReviews(); }

  (function(){ document.getElementById('pgal').innerHTML=[1,2,3,4,5,6,7,8].map(function(i){return '<div style="background-image:url(\'photos/folio'+((i%6)+1)+'.jpg\')"></div>';}).join(''); })();
  renderAll();
