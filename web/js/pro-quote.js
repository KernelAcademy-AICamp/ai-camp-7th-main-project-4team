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

  /* 체형 측정 부위 정의 (result.js와 동일) */
  var MEAS = {
    TOP:[['shoulder','좁은 어깨','넓은 어깨','어깨 — 어깨 기준으로 사이즈가 갈려요'],
         ['chestFull','슬림한 가슴','볼륨 있는 가슴','가슴 — 슬림핏은 여유를 확인해요'],
         ['waist','슬림한 배','볼륨 있는 배','배 — 표준 대비 위치'],
         ['arm','짧은 상체·팔','긴 상체·팔','총장·소매 — 기장이 맞는지']],
    BOTTOM:[['waist','슬림한 허리','볼륨 있는 허리','허리 — 밴드·버튼 기준'],
            ['hip','슬림한 엉덩이','볼륨 있는 엉덩이','엉덩이 — 힙 기준으로 사이즈가 갈려요']]
  };
  /* 요청자별 임의(데모) 측정치 + 선호핏 */
  var MEASURE_BY_CUST = {
    '김도현':{ top:{shoulder:55,chestFull:46,waist:40,arm:52}, bottom:{waist:44,hip:41}, prefTop:55, prefBottom:46 },
    '정예린':{ top:{shoulder:72,chestFull:48,waist:30,arm:55}, bottom:{waist:34,hip:30}, prefTop:34, prefBottom:40 },
    '이서연':{ top:{shoulder:62,chestFull:38,waist:28,arm:54}, bottom:{waist:24,hip:58}, prefTop:55, prefBottom:35 },
    '박지우':{ top:{shoulder:40,chestFull:44,waist:36,arm:46}, bottom:{waist:30,hip:68}, prefTop:52, prefBottom:74 },
    '최민준':{ top:{shoulder:58,chestFull:56,waist:50,arm:57}, bottom:{waist:50,hip:47}, prefTop:70, prefBottom:55 }
  };
  var MEASURE_DEFAULT = { top:{shoulder:50,chestFull:50,waist:45,arm:50}, bottom:{waist:45,hip:48}, prefTop:55, prefBottom:50 };

  function svcLabel(s){ return s==='visit' ? '방문 서비스' : '온라인 컨설팅'; }
  function svcBadge(s){ var v=s==='visit'; return '<span class="svcbadge '+(v?'visit':'online')+'">'+(v?'🏠 방문 서비스':'💻 온라인 컨설팅')+'</span>'; }
  function stClass(s){ return s==='신규'?'nw':(s==='제안발송'?'sent':(s==='수락됨'?'prog':'done')); }
  function starsRO(n){ var s=''; for(var k=1;k<=5;k++) s+='<span style="color:'+(k<=n?'#e8a13a':'#ddd')+'">★</span>'; return s; }

  /* ── 제안 액션(상태별) ── */
  function actionHTML(r){
    if(r.status==='신규'){
      if(offering) return offerForm(r);
      return '<button class="btn" onclick="openOffer()">제안 보내기</button>';
    }
    if(r.status==='제안발송'){ var o=r.offer||{};
      return '<div class="note-quote"><b style="color:var(--green)">제안 발송됨</b> · <span class="num">'+((o.price||0).toLocaleString())+'</span>원<br>'+
        '<span style="font-size:13px;color:var(--sub)">"'+esc(o.msg||'')+'"</span><br>'+
        '<span style="font-size:12.5px;color:var(--sub2)">고객 응답을 기다리는 중이에요</span></div>'+
        '<button class="btn ghost" style="margin-top:10px" onclick="simAccept()">고객 수락 · 데모</button>';
    }
    if(r.status==='수락됨'){ var o2=r.offer||{};
      return '<div class="note-quote"><b style="color:var(--green)">수락됨 · 진행 중</b> · <span class="num">'+((o2.price||0).toLocaleString())+'</span>원</div>'+
        '<button class="btn" style="margin-top:10px" onclick="completeReq()">완료 처리</button>';
    }
    if(r.status==='완료'){
      if(r.review) return '<div class="seclabel">고객 후기</div><div class="note-quote"><span style="letter-spacing:1px">'+starsRO(r.review.rating)+'</span><br>"'+esc(r.review.text)+'"</div>';
      return '<div class="note-quote muted">완료 · 고객 후기를 기다리는 중이에요</div>';
    }
    return '';
  }
  function offerForm(r){
    return '<div class="offerform">'+
      '<label>견적 금액</label><input id="offAmt" type="number" value="'+((r.offer&&r.offer.price)||MY_PRICE)+'"> '+
      '<label>고객에게 전할 한 줄 제안</label><textarea id="offMsg" placeholder="예: 면접관 시선까지 고려해 첫인상 깔끔하게 잡아드릴게요">'+esc((r.offer&&r.offer.msg)||'')+'</textarea>'+
      '<div class="obtns"><button class="tinybtn ghost" onclick="cancelOffer()">취소</button><button class="tinybtn" onclick="sendOffer()">제안 발송</button></div>'+
    '</div>';
  }
  function openOffer(){ offering=true; render(); }
  function cancelOffer(){ offering=false; render(); }
  function sendOffer(){
    var a=$('offAmt'), m=$('offMsg');
    var price=a?parseInt(a.value,10)||MY_PRICE:MY_PRICE, msg=m?m.value.trim():'';
    reqs[idx].offer={price:price, msg:msg||'요청에 맞춰 코디해드릴게요'}; reqs[idx].status='제안발송'; offering=false;
    saveLS('pro.reqs',reqs); render(); toast(reqs[idx].cust+' 님에게 제안을 보냈어요');
  }
  function simAccept(){ reqs[idx].status='수락됨'; saveLS('pro.reqs',reqs); render(); toast(reqs[idx].cust+' 님이 제안을 수락했어요'); }
  function completeReq(){ reqs[idx].status='완료'; saveLS('pro.reqs',reqs); render(); toast('완료 처리했어요 · 고객 후기를 기다려요'); }

  /* ── 체형 측정 바 (result.html 재현) ── */
  function specRow(poleL,pct,poleR,axis){
    pct=Math.max(3,Math.min(97,Math.round(pct||50)));
    var lc=pct<50?' dom':'', rc=pct>=50?' dom':'';
    return '<div class="mspec"><div class="top"><span class="pole'+lc+'">'+esc(poleL)+'</span><span class="pct"><span class="n">'+pct+'</span>%</span><span class="pole'+rc+'">'+esc(poleR)+'</span></div>'+
      '<div class="mtrack"><i style="width:'+pct+'%"></i></div><div class="maxis">'+esc(axis)+'</div></div>';
  }
  function measureBlock(chip, subtitleHTML, cat, vals, prefRowHTML){
    var rows = MEAS[cat].map(function(p){ return specRow(p[1], vals[p[0]], p[2], p[3]); }).join('');
    return '<div class="card">'+
      '<div class="mrow"><span class="mkicker">내 체형 측정</span><span class="mchip">'+chip+'</span></div>'+
      '<div class="mgrp">'+subtitleHTML+'</div>'+
      rows+
      '<div class="mgrp">선호</div>'+
      prefRowHTML+
      '<div class="mnote">부위는 <b style="color:var(--ink)">카테고리별로 달라져요</b>. 다른 카테고리까지 진단하면 상하 균형·전신 비율이 나와요.</div>'+
    '</div>';
  }

  /* ── 전체 렌더 ── */
  function render(){
    var r = reqs[idx];
    if(!r){ $('quoteRoot').innerHTML='<p class="crumb">요청을 찾을 수 없어요.</p><p style="margin-top:10px"><a class="tinybtn" onclick="location.href=\'pro.html\'">요청함으로</a></p>'; return; }
    var bt = BTMAP[r.type] || {};
    var m = MEASURE_BY_CUST[r.cust] || MEASURE_DEFAULT;
    var profileLines = (bt.profile||[]).map(function(p){ return '<p class="bdesc">'+esc(p)+'</p>'; }).join('');

    var topBlock = measureBlock('상의 기준', '필수 부위 — 키·몸무게로 추정한 몸', 'TOP', m.top,
      specRow('타이트 선호', m.prefTop, '여유 핏 선호', '여유 선호핏 — 고른 핏 취향'));
    var botBlock = measureBlock('하의 기준', '필수 부위 — 착용경험으로 <b style="color:var(--ink)">역산</b>한 몸', 'BOTTOM', m.bottom,
      specRow('슬림 실루엣', m.prefBottom, '와이드 실루엣', '선호 실루엣 — 고른 바지 형태'));

    $('quoteRoot').innerHTML =
      '<p class="crumb">쇼퍼 지원 · 견적 요청</p>'+
      '<h1>'+esc(r.cust)+' 님 · '+esc(r.occ)+'</h1>'+
      '<div class="htags">'+svcBadge(r.service)+'<span class="st '+stClass(r.status)+'">'+esc(r.status)+'</span></div>'+
      '<div class="qgrid2">'+
        // ── 왼쪽: 내 체형 측정 (상의 / 하의) ──
        '<div class="qleft">'+ topBlock + botBlock +'</div>'+
        // ── 오른쪽: 결과 상세 · 요청 내용 · 제안 ──
        '<div class="qright">'+
          '<div class="card">'+
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
          '</div>'+
          '<div class="card">'+
            '<div class="subhead">제안</div>'+
            actionHTML(r)+
          '</div>'+
        '</div>'+
      '</div>';
  }

  fetch('data/bodytypes.json').then(function(r){return r.json();}).then(function(j){
    (j.types||[]).forEach(function(t){ BTMAP[t.code]=t; }); render();
  }).catch(function(){ render(); });
