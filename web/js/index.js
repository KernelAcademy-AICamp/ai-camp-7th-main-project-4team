  function go(id, el){
    if(id==='shop'){ /* 외부 상세 화면은 통합 포트에 아직 없음 — 인앱 탭으로 전환 */ }
    document.querySelectorAll('.page').forEach(p=>p.classList.toggle('on', p.id===id));
    document.querySelectorAll('.menu a').forEach(a=>a.classList.toggle('on', a.dataset.t===id));
    window.scrollTo({top:0, behavior:'smooth'});
  }

  var FB="this.onerror=null;this.src='https://picsum.photos/seed/fit'+Math.floor(Math.random()*99)+'/480/340'";
  var EX=[
    {lock:7,  nm:'민지', spec:'데일리·소개팅룩 시크 스트레이트 전문', rating:4.9, price:120000, review:128, match:98, tags:['시크 스트레이트','데일리','소개팅'], mode:'온라인(비대면)', dur:'약 3일', bio:'온라인 쇼핑몰 MD 7년 → 퍼스널 스타일리스트 · 비대면으로 상품·코디·구매링크까지 큐레이션해요', reviews:[['비대면인데도 사이즈가 정확해서 반품 없이 한 번에 성공했어요.','33세 · 소개팅룩'],['내 체형 설명을 안 해도 이미 알고 골라주셔서 편했어요.','29세 · 데일리']]},
    {lock:12, nm:'서연', spec:'면접·오피스 이미지 컨설팅', rating:4.8, price:200000, review:94, match:91, tags:['면접','오피스','이미지'], mode:'오프라인 세션', dur:'세션 1회 · 약 2시간', bio:'이미지 컨설턴트 협회 정회원 · 첫인상이 중요한 자리의 전체 인상을 설계해요', reviews:[['면접관 입장에서 어떻게 보일지까지 짚어주셔서 자신감이 생겼어요.','31세 · 면접']]},
    {lock:23, nm:'하늘', spec:'하객룩·여행룩 동행 쇼핑', rating:4.7, price:150000, review:61, match:85, tags:['하객룩','여행','동행'], mode:'오프라인 동행', dur:'방문 1회 · 약 3시간', bio:'백화점 퍼스널 쇼퍼 출신 · 같이 매장을 돌며 체형에 맞는 옷을 현장에서 골라드려요', reviews:[['혼자 갔으면 절대 안 골랐을 옷인데 너무 잘 맞았어요.','27세 · 하객룩']]},
    {lock:31, nm:'도윤', spec:'포멀·세미정장 온라인 스타일링', rating:4.9, price:135000, review:142, match:88, tags:['포멀','세미정장','남성'], mode:'온라인(비대면)', dur:'약 3일', bio:'남성 포멀 전문 · 결혼식·면접 등 격식 있는 자리의 핏을 비대면으로 잡아드려요', reviews:[['남자 정장 핏을 이렇게 디테일하게 봐주는 분 처음이에요.','38세 · 결혼식']]},
    {lock:44, nm:'채원', spec:'첫인상 동행 쇼핑', rating:4.6, price:140000, review:38, match:80, tags:['소개팅','면접','첫인상'], mode:'오프라인 동행', dur:'방문 1회 · 약 3시간', bio:'소개팅·면접 등 잘 보여야 하는 날 전문 · 현장에서 시착하며 사이즈를 함께 확정해요', reviews:[['예산 안에서 최대한 뽑아주셔서 만족했어요.','28세 · 소개팅']]},
    {lock:52, nm:'유나', spec:'토탈 이미지 컨설팅', rating:4.8, price:230000, review:76, match:83, tags:['토탈','웨딩','컬러'], mode:'오프라인 세션', dur:'세션 1회 · 약 2시간', bio:'헤어·메이크업까지 연계한 토탈 이미지 설계 · 인생 사진이 필요한 날을 위한 컨설팅', reviews:[['단순 옷이 아니라 전체 분위기를 바꿔주셨어요.','34세 · 웨딩']]}
  ];
  document.getElementById('experts').innerHTML = EX.map(function(e,i){
    var img='photos/p'+(i+1)+'.jpg';   // 전문가 6명 개별 사진 (p1~p6)
    return '<div class="ecard" onclick="openProfile('+i+')"><div class="cover"><img src="'+img+'" alt="" onerror="'+FB+'"><span class="match">매칭도 <span class="num">'+e.match+'</span>%</span></div>'+
      '<div class="eb"><div class="top"><span class="nm">'+e.nm+' 전문가</span><span class="star">★ <span class="num">'+e.rating+'</span></span></div>'+
      '<div class="spec">'+e.spec+'</div><div class="tags">'+e.tags.map(t=>'<span>'+t+'</span>').join('')+'</div>'+
      '<div class="price"><span class="num">'+e.price.toLocaleString()+'</span>원 <small>· 후기 <span class="num">'+e.review+'</span></small></div></div></div>';
  }).join('');

  /* ===== 공통 ===== */
  function scrim(on){ document.getElementById('scrim').classList.toggle('on', on); }
  function closeAll(){ document.getElementById('drawer').classList.remove('on'); document.getElementById('sheet').classList.remove('on'); scrim(false); }
  function toast(m){ var t=document.getElementById('toast'); t.textContent=m; t.classList.add('on'); clearTimeout(window._t); window._t=setTimeout(function(){t.classList.remove('on');},2000); }
  function pickOne(el){ var ch=el.parentNode.children; for(var i=0;i<ch.length;i++) ch[i].classList.remove('on'); el.classList.add('on'); }
  function pickCard(el){ pickOne(el); }

  /* ===== 진단 = 별도 화면 플로우 (sangmin 실제 UI 이식) =====
     diag-basic → diag-fit → diag-loading → result. 진단 수집은 서비스 제공에 필요한 최소로 이뤄지며
     동의 없이도 이용 가능(엔진 개선 활용만 결과화면에서 선택 동의).
     '시작/다시 진단하기'는 새 진단이므로 이전 입력을 초기화(이어서 진단은 result의 옷장 게이트 링크가 담당). */
  function startDiag(){
    try{ ['fitting.dx','fitting.basic','fitting.consent'].forEach(function(k){ sessionStorage.removeItem(k); }); }catch(e){}
    location.href='diag-basic.html';
  }

  /* ===== 전문가 프로필 드로어 ===== */
  function openProfile(idx){ var e=EX[idx], img='photos/p'+(idx+1)+'.jpg';
    document.getElementById('drawerBody').innerHTML=
      '<div class="dhead"><img src="'+img+'" onerror="'+FB+'"><div class="dov"><span class="dm">매칭도 <span class="num">'+e.match+'</span>%</span><div class="dn">'+e.nm+' 전문가</div><div style="font-size:13px;opacity:.9;margin-top:2px">★ <span class="num">'+e.rating+'</span> · 후기 <span class="num">'+e.review+'</span></div></div></div>'+
      '<div class="dbody"><p class="bio">'+e.bio+'</p>'+
      '<div class="feat">전문 분야</div><div style="display:flex;flex-wrap:wrap;gap:6px">'+e.tags.map(function(t){return '<span style="font-size:12.5px;background:var(--soft);color:#6a6258;padding:6px 12px;border-radius:20px;font-weight:600">'+t+'</span>';}).join('')+'</div>'+
      '<div class="feat">포트폴리오</div><div class="pgal">'+[1,2,3,4,5,6].map(function(i){return '<div style="background-image:url(\'photos/folio'+i+'.jpg\')"></div>';}).join('')+'</div>'+
      '<div class="feat">실제 후기</div>'+e.reviews.map(function(r){return '<div class="rev">"'+r[0]+'"<div class="who">— '+r[1]+'</div></div>';}).join('')+
      '<div class="feat">서비스 정보</div><div class="svcinfo"><div class="r"><span>가격</span><b><span class="num">'+e.price.toLocaleString()+'</span>원</b></div><div class="r"><span>제공 방식</span><b>'+e.mode+'</b></div><div class="r"><span>예상 기간</span><b>'+e.dur+'</b></div></div>'+
      '<button class="btn full" style="margin-top:18px" onclick="openLogin(\''+e.nm+' 전문가 요청\')">이 전문가에게 요청하기 →</button></div>';
    document.getElementById('drawer').classList.add('on'); scrim(true);
  }

  /* ===== AI 전문가 매칭 (드로어) ===== */
  function openMatch(){
    document.getElementById('drawerBody').innerHTML=
      '<div class="dbody" style="padding-top:54px"><h2 style="font-size:24px;font-weight:800;letter-spacing:-.04em">AI 전문가 매칭</h2><p style="font-size:14px;color:var(--sub);margin-top:8px">조건만 알려주면 매칭도순으로 추천해드려요</p>'+
      '<div class="feat">서비스 유형 · 필수</div><div class="svc3"><div class="s on" onclick="pickCard(this)"><div class="i">💻</div><b>온라인</b></div><div class="s" onclick="pickCard(this)"><div class="i">🛍️</div><b>동행 쇼핑</b></div><div class="s" onclick="pickCard(this)"><div class="i">✨</div><b>이미지</b></div></div>'+
      '<div class="feat">상황 · 최대 2개</div><div class="seg" style="flex-wrap:wrap"><span class="o" onclick="this.classList.toggle(\'on\')">소개팅</span><span class="o" onclick="this.classList.toggle(\'on\')">면접·발표</span><span class="o" onclick="this.classList.toggle(\'on\')">결혼식</span><span class="o" onclick="this.classList.toggle(\'on\')">여행</span></div>'+
      '<div class="feat">예산</div><div class="seg"><span class="o" onclick="pickOne(this)">~5만</span><span class="o on" onclick="pickOne(this)">5~10만</span><span class="o" onclick="pickOne(this)">10~15만</span><span class="o" onclick="pickOne(this)">15만+</span></div>'+
      '<div class="feat">한 줄 요청</div><input class="inp" placeholder="예) 과하지 않게 깔끔한 첫인상">'+
      '<div style="display:flex;align-items:center;gap:12px;background:var(--soft);border-radius:14px;padding:14px 16px;margin-top:18px"><div style="flex:1"><b style="font-size:14px">📏 내 체형·사이즈 프로필 첨부</b><div style="font-size:12px;color:var(--sub);margin-top:2px">시크 스트레이트 · 추천 사이즈 카드</div></div><div class="toggle on" onclick="this.classList.toggle(\'on\')"></div></div>'+
      '<button class="btn full" style="margin-top:20px" onclick="openLogin(\'AI 매칭 신청\')">전문가 매칭하기</button></div>';
    document.getElementById('drawer').classList.add('on'); scrim(true);
  }

  /* ===== 로그인/가입 시트 ===== */
  function openLogin(ctx){ document.getElementById('loginTitle').textContent=(ctx?ctx+' — ':'')+'로그인하고 이어가기'; document.getElementById('sheet').classList.add('on'); scrim(true); }
  function loginDone(){ closeAll(); toast('로그인했어요 · 결과가 계정에 저장됐어요'); }

  /* ===== 마이페이지 사이드 네비 ===== */
  function myNav(el){
    var m=document.querySelectorAll('#smenu a'); for(var i=0;i<m.length;i++) m[i].classList.remove('on'); el.classList.add('on');
    var ps=document.querySelectorAll('#my .mpanel'); for(var j=0;j<ps.length;j++) ps[j].classList.remove('on');
    document.getElementById(el.dataset.p).classList.add('on');
  }

  document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeAll(); });
  /* 외부 화면에서 #home·#shop·#my 로 돌아오면 해당 탭 열기 */
  (function(){ var h=(location.hash||'').replace('#',''); if(['home','shop','my'].indexOf(h)>=0) go(h); })();
