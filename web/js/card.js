  var q=new URLSearchParams(location.search);
  var cur=(q.get('type')||'STR').toUpperCase();
  var gender=(q.get('g')||'female'); if(gender!=='male'&&gender!=='female') gender='female';
  var compact=q.get('compact')==='1';   // 간단 버전: 그림 + 유형명 + MY FIT 만 노출
  var wmStyle=document.createElement('style'); document.head.appendChild(wmStyle);

  function figHTML(d){
    var head='<div class="head '+gender+'">'+(gender==='female'?'<span class="longhair"></span>':'')+
      '<span class="face"></span><span class="cap"></span><span class="ey l"></span><span class="ey r"></span></div>';
    return '<div class="fig">'+head+'<div class="body '+d.silhouette+'" style="background-color:'+d.point+'; height:150px"></div></div>';
  }
  function items(a){ return (a||[]).map(function(x){ return '<div class="b-it">'+x+'</div>'; }).join(''); }
  var CW='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
  var CX='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>';
  var HINT_F='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>';
  var HINT_B='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 2.64-6.36"/><path d="M3 3v6h6"/></svg>';
  // 카드 뒷면 인사이트 줄바꿈(여성) — 데이터(bodytypes.json)는 한 줄 유지, '한 끗' 등 다른 곳은 그대로. 카드 표시에서만 3줄.
  var INS_BR={
    TRI:'<b>상의에 포인트</b>를 주고<br>하의는 차분하게 가면<br>균형이 잡혀요',
    INV:'<b>상의는 깔끔하게</b>,<br>하의로 시선을 분산하면<br>균형이 살아나요',
    HRG:'<b>허리를 강조</b>하고<br>세로로 길게 떨어뜨리면<br>라인이 돋보여요',
    STR:'<b>벨트로 허리에 곡선</b>을<br>더하면 직선 라인이<br>한층 살아나요',
    BAL:'<b>트렌드는 자유롭게</b>,<br>포인트는 한 곳만 주면<br>깔끔하게 완성돼요',
    DIA:'<b>중앙은 흐르게</b> 두고<br>어깨·다리를 살리면<br>실루엣이 정돈돼요',
    RND:'<b>세로로 길게</b>,<br>다크 톤으로 정돈하면<br>한층 슬림해 보여요',
    TUB:'<b>레이어와 디테일</b>로<br>입체감을 더하면<br>밋밋함이 사라져요'
  };
  // 8유형 성별 축: 구조필드(공유) + gender.{male,female} 콘텐츠 병합. 구 포맷(gender 없음)은 raw 폴백.
  function btResolve(t, g){
    if(!t) return t;
    g=(g==='male'||g==='female')?g:'female';
    var c=(t.gender&&(t.gender[g]||t.gender.female))||t;
    return { code:t.code, name:t.name, sizeKorea:t.sizeKorea, silhouette:t.silhouette, point:t.point,
      profile:c.profile, fitOk:c.fitOk, fitNo:c.fitNo, insight:c.insight, match:c.match, signature:c.signature };
  }

  function render(d){
    var card=document.getElementById('card');
    card.style.setProperty('--tp', d.point);                       // 유형 포인트색 → CSS 변수
    wmStyle.textContent='.front::after{content:"'+d.code+'";}';    // 워터마크 코드
    var actions='<span class="cacts">'+
      '<button id="cSave" title="결과 저장" aria-label="결과 저장">🔖</button>'+
      '<button id="cShare" title="카드 공유" aria-label="카드 공유">🔗</button>'+
      '</span>';
    // 앞면 = 온보딩 정체성(그림·유형명·태그라인)
    var front='<div class="cface front">'+
      '<div class="ctop"><span class="clogo">Fitting<i class="sq"></i></span>'+actions+'</div>'+
      '<div class="hcbody">'+figHTML(d)+
        '<div class="code">'+d.code+'</div>'+
        '<div class="word">'+d.name+'</div>'+
        '<div class="tagline">'+((d.profile&&d.profile[0])||'')+'</div>'+
      '</div>'+
      (compact?'':'<div class="fliphint">'+HINT_F+'자세히 보기</div>')+
    '</div>';
    if(compact){                                                   // 쇼퍼 고객카드 등 — 앞면만(플립 없음)
      card.innerHTML='<div class="flip">'+front+'</div>';
      wireActions(d);
      return;
    }
    // 뒷면 = FIT INSIGHT · 잘맞 VS 피할 · 환상의 궁합
    var ins=(gender==='female'&&INS_BR[d.code])?INS_BR[d.code]:(d.insight||'');   // 카드 표시용 3줄(여성)
    var back='<div class="cface back">'+
      '<div class="ctop"><span class="clogo">Fitting<i class="sq"></i></span><span class="ctop-r">'+d.name+'</span></div>'+
      '<div class="b-main">'+
        '<div class="b-ins"><span class="b-lab">FIT INSIGHT</span><p>'+ins+'</p></div>'+
        '<div class="b-fitbox"><div class="b-duel">'+
          '<div class="b-side ok"><div class="b-sh">'+CW+'잘맞</div>'+items(d.fitOk)+'</div>'+
          '<div class="b-vs">VS</div>'+
          '<div class="b-side no"><div class="b-sh">'+CX+'피할</div>'+items(d.fitNo)+'</div>'+
        '</div></div>'+
      '</div>'+
      '<div class="b-foot"><span class="b-match">🩷 환상의 궁합 · <b>'+(d.match||'')+'</b></span></div>'+
      '<div class="fliphint">'+HINT_B+'돌아가기</div>'+
    '</div>';
    card.innerHTML='<div class="flip" id="flip">'+front+back+'</div>';
    var flip=document.getElementById('flip');
    card.addEventListener('click', function(e){ if(e.target.closest('.cacts')) return; flip.classList.toggle('turned'); });   // 카드 클릭 = 뒤집기(저장·공유 버튼 제외)
    wireActions(d);
  }

  // 결과 카드 이미지 저장 (PNG 다운로드) — 액션 버튼은 캡처에서 제외
  function saveCard(d){
    // 결과 페이지(?host=result)에 임베드된 카드면 부모(result.js)의 계정 저장 흐름으로 위임(로그인 게이트+마이). 단독 열람은 PNG 저장.
    if(q.get('host')==='result' && window.parent && window.parent!==window){
      try{ window.parent.postMessage({type:'fitting:save'}, '*'); return; }catch(e){}
    }
    var card=document.querySelector('.cface.front')||document.getElementById('card');
    if(!window.htmlToImage||!card){ return; }
    var btn=document.getElementById('cSave'); if(btn) btn.disabled=true;
    htmlToImage.toPng(card, {
      pixelRatio:2,
      filter:function(node){ return !(node.classList && node.classList.contains('cacts')); }
    }).then(function(url){
      var a=document.createElement('a');
      a.download='fitting-'+((d&&d.code)||'card')+'.png';
      a.href=url; document.body.appendChild(a); a.click(); a.remove();
    }).catch(function(e){ console.error('카드 저장 실패', e); })
      .then(function(){ if(btn) btn.disabled=false; });
  }
  // 결과 공유 = 친구 초대 링크 (인스타·카카오 등 아무 앱에나) — navigator.share, 실패 시 링크 복사
  function inviteURL(d){
    var dir=location.pathname.replace(/[^/]*$/, '');   // card.html이 위치한 경로 → 같은 폴더의 랜딩
    return location.origin+dir+'index.html?from='+((d&&d.code)||'');
  }
  function cardToast(msg){
    var t=document.getElementById('cToast');
    if(!t){ t=document.createElement('div'); t.id='cToast';
      t.style.cssText='position:fixed;left:50%;bottom:18px;transform:translateX(-50%);background:rgba(20,18,16,.92);color:#fff;font:600 12.5px/1.4 Pretendard,system-ui,sans-serif;padding:10px 16px;border-radius:20px;max-width:82%;text-align:center;opacity:0;transition:opacity .2s;z-index:99;pointer-events:none;';
      document.body.appendChild(t); }
    t.textContent=msg; t.style.opacity='1'; clearTimeout(window._ct); window._ct=setTimeout(function(){ t.style.opacity='0'; }, 2200);
  }
  function shareInvite(d){
    var url=inviteURL(d);
    var text='너는 어떤 핏이야? 나는 \''+d.name+'\' 나왔어 · 착용 경험 3분이면 내 체형·사이즈가 나와 — fitting';
    if(navigator.share){ navigator.share({title:'fitting — 내 핏 결과', text:text, url:url}).catch(function(){}); return; }
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text+'\n'+url).then(function(){ cardToast('초대 링크를 복사했어요 · 친구에게 붙여넣기 해보세요'); }).catch(function(){ cardToast('링크: '+url); });
    } else { cardToast('링크: '+url); }
  }
  function wireActions(d){
    var s=document.getElementById('cSave'); if(s) s.onclick=function(){ saveCard(d); };
    var sh=document.getElementById('cShare'); if(sh) sh.onclick=function(){ shareInvite(d); };
  }

  // 8유형 데이터 = data/bodytypes.json 단일 출처 (하드코딩 제거)
  fetch('data/bodytypes.json')
    .then(function(r){ return r.json(); })
    .then(function(j){
      var map={}; j.types.forEach(function(t){ map[t.code]=btResolve(t, gender); });   // 성별별 콘텐츠 해석
      if(!map[cur]) cur='STR';
      render(map[cur]);
    })
    .catch(function(e){
      document.getElementById('card').innerHTML=
        '<div style="padding:40px;font:14px Pretendard">데이터를 불러오지 못했어요.<br><br>'+
        '로컬 서버로 열어주세요:<br><code>python3 -m http.server</code> 후 <code>localhost:8000/card.html?type=STR</code></div>';
    });
