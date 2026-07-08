  /* 쇼퍼(공급자) 포털 — 시작 구조. 페르소나: 소희 쇼퍼.
     고객 측 요청 라이프사이클의 대칭 뷰. 요청 클릭 → 상세 드로어(체형·사이즈 첨부 + 요청 내용)에서 제안. */
  function loadLS(k, def){ try{ var v=localStorage.getItem('fitting.'+k); return v?JSON.parse(v):def; }catch(e){ return def; } }
  function saveLS(k, v){ try{ localStorage.setItem('fitting.'+k, JSON.stringify(v)); }catch(e){} }
  /* 가입(온보딩)에서 저장한 프로필. 데이터 계약: docs/쇼퍼가입-화면정의서.md §5 */
  var PROFILE = loadLS('pro.profile', null);
  var MY_PRICE = (PROFILE && PROFILE.services && PROFILE.services[0]) ? PROFILE.services[0].price : 120000;
  /* 가입 전(직접 pro.html 진입) 편집 시 시드로 쓸 기본 프로필 = 화면의 데모값과 동일 */
  /* 예시용 포트폴리오(사진 + 착용 모델 키·몸무게) */
  var DEMO_PORTFOLIO = [
    {src:'photos/folio1.jpg', height:168, weight:55},
    {src:'photos/folio2.jpg', height:172, weight:63},
    {src:'photos/folio3.jpg', height:160, weight:50},
    {src:'photos/folio4.jpg', height:177, weight:70},
    {src:'photos/folio5.jpg', height:165, weight:58},
    {src:'photos/folio6.jpg', height:170, weight:60},
    {src:'photos/folio1.jpg', height:158, weight:48},
    {src:'photos/folio2.jpg', height:174, weight:66}
  ];
  var DEFAULT_PROFILE = {
    registered:false, name:'소희 쇼퍼',
    services:[{type:'online',label:'온라인 스타일링',price:35000},{type:'visit',label:'방문',price:120000}],
    tagline:'데일리·소개팅룩 전문 스타일리스트',
    bio:'온라인 쇼핑몰 MD 출신으로 비대면 큐레이션이 강점이에요',
    specialties:['데일리룩','소개팅룩','미니멀'], portfolio:DEMO_PORTFOLIO, regions:['서울 강남','서울 마포'],
    height:167, weight:52
  };
  var TAG_PRESETS = ['데일리룩','소개팅룩','미니멀','오피스','하객룩','캐주얼','스트릿'];
  var REGION_PRESETS = ['서울','경기','인천','부산','대구','대전','광주'];

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
  document.addEventListener('keydown', function(e){ if(e.key==='Escape'){ closeDrawer(); closeAvatar(); } });

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

  /* ===== 가입 프로필을 포털 화면에 반영 ===== */
  function setText(id, v){ var el=document.getElementById(id); if(el&&v!=null) el.textContent=v; }
  function applyProfile(){
    if(!PROFILE) return;   // 가입 전(데모 기본값 유지)
    setText('hdrName', PROFILE.name);
    setText('sideName', PROFILE.name);
    if(PROFILE.avatar){
      var h=document.getElementById('hdrAvatar'), sd=document.getElementById('sideAvatar');
      if(h){ h.src=PROFILE.avatar; h.style.visibility='visible'; }
      if(sd){ sd.src=PROFILE.avatar; sd.style.visibility='visible'; }
    }
    if(PROFILE.tagline || PROFILE.bio){
      var bio=document.getElementById('pfBio');
      if(bio) bio.textContent=[PROFILE.tagline, PROFILE.bio].filter(Boolean).join(' · ');
    }
    if(PROFILE.specialties && PROFILE.specialties.length){
      document.getElementById('pfTags').innerHTML = PROFILE.specialties.map(function(t){ return '<span class="tag">'+t+'</span>'; }).join('');
    }
  }
  /* 서비스·가격을 카테고리별 카드 행으로 (가입 전이면 데모 기본값 사용) */
  function svcIcon(t){ return t==='online'?'💻':(t==='visit'?'🏠':(t==='video'?'🎥':'🛍️')); }
  function svcDesc(t){ return t==='online'?'비대면 온라인 스타일링':(t==='visit'?'직접 만나서 코디':(t==='video'?'화상 상담':'맞춤 서비스')); }
  function renderServices(){
    var base = PROFILE || DEFAULT_PROFILE;
    var svc = base.services || [];
    var el = document.getElementById('pfServices'); if(!el) return;
    el.innerHTML = svc.map(function(s){
      return '<div class="svcrow"><span class="ic">'+svcIcon(s.type)+'</span>'+
        '<span class="nm"><b>'+s.label+'</b><small>'+svcDesc(s.type)+'</small></span>'+
        '<span class="pr">'+(s.price||0).toLocaleString()+'<small>원</small></span></div>';
    }).join('');
    if(svc[0]) setText('sideRole', svc[0].label);
  }
  /* 키·몸무게를 보기 화면에 (없으면 행 숨김) */
  function renderBody(){
    var base = PROFILE || DEFAULT_PROFILE;
    var f=document.getElementById('pfBodyField'), v=document.getElementById('pfBody');
    if(!f||!v) return;
    var parts=[]; if(base.height) parts.push(base.height+'cm'); if(base.weight) parts.push(base.weight+'kg');
    if(parts.length){ f.style.display=''; v.textContent=parts.join(' · '); }
    else { f.style.display='none'; }
  }
  /* 활동 지역을 보기 화면에 태그로 (없으면 섹션 숨김) */
  function renderRegions(){
    var base = PROFILE || DEFAULT_PROFILE;
    var rg = base.regions || [];
    var el=document.getElementById('pfRegions'), head=document.getElementById('pfRegionHead');
    if(!el||!head) return;
    if(rg.length){
      head.style.display=''; el.style.display='';
      el.innerHTML = rg.map(function(t){ return '<span class="tag">📍 '+t+'</span>'; }).join('');
    } else { head.style.display='none'; el.style.display='none'; }
  }
  /* 프로필 사진 확대 */
  function openAvatar(){
    var src=(PROFILE&&PROFILE.avatar)||DEFAULT_AVATAR;
    document.getElementById('avLightboxImg').src=src;
    document.getElementById('avLightbox').classList.add('on');
  }
  function closeAvatar(){ document.getElementById('avLightbox').classList.remove('on'); }
  function specText(p){ var a=[]; if(p.height) a.push(p.height+'cm'); if(p.weight) a.push(p.weight+'kg'); return a.join(' '); }
  function renderPortfolio(){
    var base = PROFILE || DEFAULT_PROFILE;
    var list = (base.portfolio && base.portfolio.length) ? base.portfolio : DEMO_PORTFOLIO;
    document.getElementById('pgal').innerHTML = list.map(function(p){ p=normPhoto(p);
      var s=specText(p);
      return '<div style="background-image:url(\''+p.src+'\')">'+(s?'<span class="pspec">'+s+'</span>':'')+'</div>'; }).join('');
  }

  /* ===== 프로필 편집 ===== */
  var DEFAULT_AVATAR='photos/p1.jpg';
  var edTags=[], edAllTags=[], edPhotos=[], edAvatar=DEFAULT_AVATAR, edRegions=[], edAllRegions=[];
  function normPhoto(p){ return typeof p==='string' ? {src:p, height:null, weight:null} : {src:p.src, height:p.height||null, weight:p.weight||null}; }
  function findSvc(profile,type){ return (profile.services||[]).filter(function(s){return s.type===type;})[0]; }

  function editProfile(){
    var base = PROFILE || DEFAULT_PROFILE;
    edAvatar = base.avatar || DEFAULT_AVATAR;
    var ap=document.getElementById('edAvatarPreview'); if(ap){ ap.src=edAvatar; ap.style.visibility='visible'; }
    document.getElementById('edName').value = base.name||'';
    document.getElementById('edHeight').value = base.height||'';
    document.getElementById('edWeight').value = base.weight||'';
    var on=findSvc(base,'online'), vi=findSvc(base,'visit');
    document.getElementById('edOnlineOn').checked = !!on;
    document.getElementById('edOnlinePrice').value = on?on.price:35000;
    document.getElementById('edVisitOn').checked = !!vi;
    document.getElementById('edVisitPrice').value = vi?vi.price:120000;
    document.getElementById('edTagline').value = base.tagline||'';
    document.getElementById('edBio').value = base.bio||'';
    edTags = (base.specialties||[]).slice();
    edAllTags = TAG_PRESETS.slice();
    edTags.forEach(function(t){ if(edAllTags.indexOf(t)<0) edAllTags.push(t); });
    edRegions = (base.regions||[]).slice();
    edAllRegions = REGION_PRESETS.slice();
    edRegions.forEach(function(t){ if(edAllRegions.indexOf(t)<0) edAllRegions.push(t); });
    edPhotos = (base.portfolio||[]).map(normPhoto);
    edRenderTags(); edRenderRegions(); edRenderPhotos(); edToggleSvc();
    document.getElementById('profileView').style.display='none';
    document.getElementById('profileEdit').style.display='block';
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function cancelEdit(){
    document.getElementById('profileEdit').style.display='none';
    document.getElementById('profileView').style.display='block';
  }
  function edToggleSvc(){
    var oOn=document.getElementById('edOnlineOn').checked, vOn=document.getElementById('edVisitOn').checked;
    document.getElementById('edSvcOnline').classList.toggle('off', !oOn);
    document.getElementById('edSvcVisit').classList.toggle('off', !vOn);
    document.getElementById('edOnlinePrice').disabled=!oOn;
    document.getElementById('edVisitPrice').disabled=!vOn;
  }
  function edCollectServices(){
    var s=[];
    if(document.getElementById('edOnlineOn').checked) s.push({type:'online',label:'온라인 스타일링',price:parseInt(document.getElementById('edOnlinePrice').value,10)||0});
    if(document.getElementById('edVisitOn').checked) s.push({type:'visit',label:'방문',price:parseInt(document.getElementById('edVisitPrice').value,10)||0});
    return s;
  }
  function saveProfile(){
    var name=document.getElementById('edName').value.trim();
    var svc=edCollectServices();
    if(!name){ toast('활동명을 입력해주세요'); return; }
    if(!svc.length){ toast('서비스 유형을 최소 1개 켜주세요'); return; }
    if(!svc.every(function(s){return s.price>0;})){ toast('켠 유형의 가격을 확인해주세요'); return; }
    var next = PROFILE || {};
    next.registered = true;
    next.avatar = edAvatar;
    next.name = name;
    next.height = parseInt(document.getElementById('edHeight').value,10) || null;
    next.weight = parseInt(document.getElementById('edWeight').value,10) || null;
    next.services = svc;
    next.tagline = document.getElementById('edTagline').value.trim();
    next.bio = document.getElementById('edBio').value.trim();
    next.specialties = edTags.slice();
    next.regions = edRegions.slice();
    next.portfolio = edPhotos.slice();
    PROFILE = next; MY_PRICE = svc[0].price;
    saveLS('pro.profile', next);
    applyProfile(); renderServices(); renderBody(); renderRegions(); renderPortfolio();
    cancelEdit();
    toast('프로필을 저장했어요');
  }

  /* 편집: 태그 */
  function edRenderTags(){
    document.getElementById('edTags').innerHTML = edAllTags.map(function(t){
      var on=edTags.indexOf(t)>=0;
      return '<span class="tag'+(on?' on':'')+'" onclick="edToggleTag(\''+t.replace(/'/g,'')+'\')">'+t+'</span>';
    }).join('');
  }
  function edToggleTag(t){ var i=edTags.indexOf(t); if(i>=0) edTags.splice(i,1); else edTags.push(t); edRenderTags(); }
  function edAddTag(){ var el=document.getElementById('edTagInput'), v=el.value.trim(); if(!v) return;
    if(edAllTags.indexOf(v)<0) edAllTags.push(v); if(edTags.indexOf(v)<0) edTags.push(v); el.value=''; edRenderTags(); }

  /* 편집: 활동 지역(대면) — 전문분야와 같은 방식 */
  function edRenderRegions(){
    document.getElementById('edRegions').innerHTML = edAllRegions.map(function(t){
      var on=edRegions.indexOf(t)>=0;
      return '<span class="tag'+(on?' on':'')+'" onclick="edToggleRegion(\''+t.replace(/'/g,'')+'\')">'+t+'</span>';
    }).join('');
  }
  function edToggleRegion(t){ var i=edRegions.indexOf(t); if(i>=0) edRegions.splice(i,1); else edRegions.push(t); edRenderRegions(); }
  function edAddRegion(){ var el=document.getElementById('edRegionInput'), v=el.value.trim(); if(!v) return;
    if(edAllRegions.indexOf(v)<0) edAllRegions.push(v); if(edRegions.indexOf(v)<0) edRegions.push(v); el.value=''; edRenderRegions(); }

  /* 편집: 포트폴리오 */
  function edRenderPhotos(){
    var rows=edPhotos.map(function(p,i){
      return '<div class="eprow">'+
        '<div class="epthumb" style="background-image:url(\''+p.src+'\')"></div>'+
        '<div class="epfields">'+
          '<div class="eprowf"><input type="number" class="epin" placeholder="키" value="'+(p.height||'')+'" oninput="edSetSpec('+i+',\'height\',this.value)"><span class="won">cm</span></div>'+
          '<div class="eprowf"><input type="number" class="epin" placeholder="몸무게" value="'+(p.weight||'')+'" oninput="edSetSpec('+i+',\'weight\',this.value)"><span class="won">kg</span></div>'+
        '</div>'+
        '<button class="epdel" onclick="edDelPhoto('+i+')">✕</button>'+
      '</div>';
    });
    if(edPhotos.length<8) rows.push('<button class="epadd" onclick="document.getElementById(\'edFile\').click()">＋ 사진 추가</button>');
    document.getElementById('edPgal').innerHTML=rows.join('');
  }
  function edOnFiles(ev){
    var files=ev.target.files||[]; var room=8-edPhotos.length;
    var list=Array.prototype.slice.call(files,0,room);
    list.forEach(function(f){ if(!/^image\//.test(f.type)){ toast('이미지만 올릴 수 있어요'); return; }
      var r=new FileReader(); r.onload=function(){ edPhotos.push({src:r.result, height:null, weight:null}); edRenderPhotos(); }; r.readAsDataURL(f); });
    ev.target.value='';
  }
  function edDelPhoto(i){ edPhotos.splice(i,1); edRenderPhotos(); }
  /* 사진별 착용 모델 키·몸무게 입력(값만 갱신, 재렌더 없이 포커스 유지) */
  function edSetSpec(i,key,val){ edPhotos[i][key] = parseInt(val,10) || null; }

  /* 편집: 프로필 사진(아바타) */
  function edOnAvatar(ev){
    var f=(ev.target.files||[])[0]; if(!f) return;
    if(!/^image\//.test(f.type)){ toast('이미지만 올릴 수 있어요'); return; }
    var r=new FileReader(); r.onload=function(){ edAvatar=r.result; var ap=document.getElementById('edAvatarPreview'); ap.src=edAvatar; ap.style.visibility='visible'; };
    r.readAsDataURL(f); ev.target.value='';
  }
  function edRemoveAvatar(){ edAvatar=DEFAULT_AVATAR; var ap=document.getElementById('edAvatarPreview'); ap.src=edAvatar; ap.style.visibility='visible'; }

  applyProfile();
  renderServices();
  renderBody();
  renderRegions();
  renderPortfolio();
  renderAll();
