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
  function pills(a){ return '<div class="ps">'+a.map(function(x){return '<span>'+x+'</span>';}).join('')+'</div>'; }
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
    var p1=d.profile[0]||'', p2=d.profile[1]||'';
    card.style.background='radial-gradient(ellipse 70% 34% at 50% 11%, '+d.point+'2b, transparent 60%), linear-gradient(160deg,#191a1f,#0f1014)';
    wmStyle.textContent='.card::after{content:"'+d.code+'";}';
    var top='<div class="ctop"><span class="clogo">Fitting<i class="sq"></i></span><span class="cacts">'+
      '<button id="cSave" title="결과 저장" aria-label="결과 저장">🔖</button>'+
      '<button id="cShare" title="카드 공유" aria-label="카드 공유">🔗</button>'+
      '</span></div>';
    var head=figHTML(d)+'<div class="code" style="color:'+d.point+'">'+d.code+'</div><div class="word">'+d.name+'</div>';
    var myfit='<div class="sl" style="color:'+d.point+'">MY FIT</div><div class="desc two">'+p1+(p2?'<br>'+p2:'')+'</div>';
    if(compact){
      card.innerHTML=top+head+'<div class="info">'+myfit+'</div><div class="grow"></div>';
      wireActions(d);
      return;
    }
    card.innerHTML=top+head+
      '<div class="info">'+myfit+
        '<div class="sl sec2" style="color:'+d.point+'">FIT INSIGHT</div><div class="desc ins">'+d.insight+'</div>'+
        '<div class="fits sec2"><div class="fr ok"><span class="fl" style="color:'+d.point+'">잘맞 FIT</span>'+pills(d.fitOk)+'</div>'+
        '<div class="fr no"><span class="fl no">피할 FIT</span>'+pills(d.fitNo)+'</div></div>'+
      '</div>'+
      '<div class="grow"></div>'+
      '<div class="match">🩷 환상의 궁합 · <b style="color:'+d.point+'">'+d.match+'</b></div>';
    wireActions(d);
  }

  // 결과 카드 이미지 저장 (PNG 다운로드) — 액션 버튼은 캡처에서 제외
  function saveCard(d){
    // 결과 페이지(?host=result)에 임베드된 카드면 부모(result.js)의 계정 저장 흐름으로 위임(로그인 게이트+마이). 단독 열람은 PNG 저장.
    if(q.get('host')==='result' && window.parent && window.parent!==window){
      try{ window.parent.postMessage({type:'fitting:save'}, '*'); return; }catch(e){}
    }
    var card=document.getElementById('card');
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
