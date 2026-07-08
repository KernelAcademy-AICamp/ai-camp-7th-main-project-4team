  /* 쇼퍼 가입 온보딩 위저드 로직.
     단계 0(소개)~5(완료). 수집값을 localStorage 'fitting.pro.profile'에 저장.
     데이터 계약: docs/쇼퍼가입-화면정의서.md §5. */
  function loadLS(k, def){ try{ var v=localStorage.getItem('fitting.'+k); return v?JSON.parse(v):def; }catch(e){ return def; } }
  function saveLS(k, v){ try{ localStorage.setItem('fitting.'+k, JSON.stringify(v)); }catch(e){} }
  function $(id){ return document.getElementById(id); }
  function toast(m){ var t=$('toast'); t.textContent=m; t.classList.add('on'); clearTimeout(window._t); window._t=setTimeout(function(){t.classList.remove('on');},2000); }

  /* 이미 가입한 쇼퍼면 온보딩 건너뛰고 포털로 (재방문 처리, 화면정의서 SP-1) */
  (function(){ var p=loadLS('pro.profile',null); if(p&&p.registered){ location.replace('pro.html'); } })();

  var STEPS=6;               // 0~5
  var cur=0;
  var TAG_PRESETS=['데일리룩','소개팅룩','미니멀','오피스','하객룩','캐주얼','스트릿','미니멀'];
  var selectedTags=['데일리룩','소개팅룩','미니멀'];   // 기본 선택(예시)
  var allTags=TAG_PRESETS.slice();
  var photos=[];             // dataURL 배열

  /* ===== 단계 이동 ===== */
  function show(step){
    cur=Math.max(0, Math.min(STEPS-1, step));
    var ps=document.querySelectorAll('.panel');
    for(var i=0;i<ps.length;i++) ps[i].classList.toggle('on', parseInt(ps[i].dataset.step,10)===cur);
    // 헤더/진행바
    var titles=['쇼퍼 지원','쇼퍼 가입','기본 정보','이력·전문분야','포트폴리오','등록 완료'];
    $('headTitle').textContent=titles[cur];
    $('headStep').textContent = (cur>=1 && cur<=5) ? cur+'/5' : '';
    $('progBar').style.width = (cur/(STEPS-1)*100)+'%';
    $('backBtn').style.display = (cur>=1 && cur<=4) ? 'inline' : 'none';
    window.scrollTo({top:0,behavior:'smooth'});
    validate();
  }
  function go(dir){
    // dir: 다음 단계로 갈 땐 절대 인덱스가 아니라 상대 이동(+1/-1) 또는 절대값 모두 지원
    var target = (dir===1 || dir===-1) ? cur+dir : dir;
    if(target>cur && !stepValid(cur)){ showErr(cur); return; }
    show(target);
  }

  /* ===== 검증 ===== */
  function isEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  function enabledServices(){
    var s=[];
    if($('svcOnlineOn').checked){ s.push({type:'online', label:'온라인 스타일링', price:parseInt($('priceOnline').value,10)||0}); }
    if($('svcVisitOn').checked){ s.push({type:'visit', label:'방문', price:parseInt($('priceVisit').value,10)||0}); }
    return s;
  }
  function stepValid(step){
    if(step===1){ return isEmail($('email').value.trim()) && $('agreeReq').checked; }
    if(step===2){ var svc=enabledServices(); return $('name').value.trim().length>0 && svc.length>0 && svc.every(function(s){return s.price>0;}); }
    if(step===3){ return $('tagline').value.trim().length>0 && selectedTags.length>0; }
    return true;
  }
  function showErr(step){ var e=$('err'+step); if(e){ e.classList.add('on'); } }
  function validate(){
    // 현재 단계의 [다음] 활성/비활성 + 에러 숨김(입력 중이면)
    if(cur>=1 && cur<=3){ var e=$('err'+cur); if(e) e.classList.remove('on'); }
    var n1=$('next1'), n2=$('next2'), n3=$('next3');
    if(n1) n1.disabled=!stepValid(1);
    if(n2) n2.disabled=!stepValid(2);
    if(n3) n3.disabled=!stepValid(3);
  }

  /* ===== SP-2 서비스 토글 ===== */
  function toggleSvc(){
    $('svcOnline').classList.toggle('off', !$('svcOnlineOn').checked);
    $('svcVisit').classList.toggle('off', !$('svcVisitOn').checked);
    $('priceOnline').disabled=!$('svcOnlineOn').checked;
    $('priceVisit').disabled=!$('svcVisitOn').checked;
    validate();
  }

  /* ===== SP-3 태그 ===== */
  function renderTags(){
    $('tagList').innerHTML = allTags.map(function(t){
      var on=selectedTags.indexOf(t)>=0;
      return '<span class="tag'+(on?' on':'')+'" onclick="toggleTag(\''+t.replace(/'/g,"")+'\')">'+t+'</span>';
    }).join('');
  }
  function toggleTag(t){
    var i=selectedTags.indexOf(t);
    if(i>=0) selectedTags.splice(i,1); else selectedTags.push(t);
    renderTags(); validate();
  }
  function addTag(){
    var v=$('tagInput').value.trim(); if(!v) return;
    if(allTags.indexOf(v)<0) allTags.push(v);
    if(selectedTags.indexOf(v)<0) selectedTags.push(v);
    $('tagInput').value=''; renderTags(); validate();
  }

  /* ===== SP-4 포트폴리오 ===== */
  function renderPhotos(){
    var cells=photos.map(function(src,i){
      return '<div class="pcell"><img src="'+src+'" alt=""><span class="del" onclick="delPhoto(event,'+i+')">✕</span></div>';
    });
    if(photos.length<8) cells.push('<div class="pcell" onclick="document.getElementById(\'fileInput\').click()">＋</div>');
    $('pgrid').innerHTML=cells.join('');
  }
  function onFiles(ev){
    var files=ev.target.files||[]; var room=8-photos.length;
    var list=Array.prototype.slice.call(files,0,room);
    var pending=list.length;
    list.forEach(function(f){
      if(!/^image\//.test(f.type)){ pending--; toast('이미지만 올릴 수 있어요'); return; }
      var r=new FileReader();
      r.onload=function(){ photos.push(r.result); if(--pending<=0) renderPhotos(); else renderPhotos(); };
      r.readAsDataURL(f);
    });
    ev.target.value='';
  }
  function delPhoto(ev,i){ ev.stopPropagation(); photos.splice(i,1); renderPhotos(); }

  /* ===== 완료: 저장 → SP-5 ===== */
  function finish(){
    var svc=enabledServices();
    var profile={
      registered:true,
      email:$('email').value.trim(),
      phone:$('phone').value.trim(),
      agreeMkt:$('agreeMkt').checked,
      name:$('name').value.trim()||'쇼퍼',
      services:svc,
      tagline:$('tagline').value.trim(),
      bio:$('bio').value.trim(),
      specialties:selectedTags.slice(),
      portfolio:photos.slice()
    };
    saveLS('pro.profile', profile);
    $('doneName').textContent=profile.name;
    show(5);
  }

  /* ===== 초기화 ===== */
  renderTags();
  renderPhotos();
  toggleSvc();
  show(0);
