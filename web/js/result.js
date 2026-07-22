  var payload={}; try{ payload=JSON.parse(sessionStorage.getItem('fitting.dx')||'{}'); }catch(e){}
  var savedBasic={}; try{ savedBasic=JSON.parse(sessionStorage.getItem('fitting.basic')||'{}'); }catch(e){}
  // 건너뛰기(0벌): 실착 경험 없이 fitting.basic(성별·키·몸무게)만으로 회귀 추정. basic이 없으면 진단 불가.
  if(!payload.experiences) payload.experiences=[];
  if(!payload.basic || payload.basic.height==null) payload.basic=savedBasic;
  if(!payload.prefs) payload.prefs={};
  var gender=(payload.basic&&payload.basic.gender)||'female';
  // 실엔진(BodyModel·FitEngine·FitBodyType)이 단일 정본. 목업(engine-mock) 제거 — confidenceTier만 로컬 계산.
  var hasBasic=!!(payload.basic && payload.basic.height!=null);   // 진단 데이터 유무(없으면 가짜 결과 대신 가드)
  if(hasBasic){ try{ sessionStorage.setItem('fitting.done','1'); }catch(e){} }   // 진단 완료 표시 — 재진단 안내 배너(diag-basic) 조건
  var nExp=(payload.experiences||[]).length;
  var confidenceTier=nExp<=0?'low':(nExp===1?'mid':'high');       // 0벌 low·1벌 mid·2벌+ high
  // 8유형 성별 축: 구조필드(공유)+gender.{male,female} 콘텐츠 병합. 구 포맷(gender 없음)은 raw 폴백.
  function btResolve(t, g){
    if(!t) return t;
    g=(g==='male'||g==='female')?g:'female';
    var c=(t.gender&&(t.gender[g]||t.gender.female))||t;
    return { code:t.code, name:t.name, sizeKorea:t.sizeKorea, silhouette:t.silhouette, point:t.point,
      profile:c.profile, fitOk:c.fitOk, fitNo:c.fitNo, insight:c.insight, match:c.match, signature:c.signature };
  }

  // 완료 카테고리 = 착용경험(실착) + 선호핏만 진단(실측 데이터 없는 기반의 구조적 예외).
  // 0벌(건너뛰기)은 prefs가 비어 있어 아무것도 완료로 잡히지 않음(카드는 회귀 추정으로 노출).
  var doneCats={}; (payload.experiences||[]).forEach(function(e){ if(e.category) doneCats[e.category]=1; });
  Object.keys(payload.prefs||{}).forEach(function(c){ doneCats[c]=1; });
  var upperDone=!!doneCats.TOP, lowerDone=!!doneCats.BOTTOM, cardReady=upperDone&&lowerDone;

  // ── 이번 진단 카테고리(전환식): ?cat= 우선 → 마지막 착용경험 → 선호핏 키 → TOP ──
  var CATMAP={top:'TOP',bottom:'BOTTOM',outer:'OUTER',dress:'DRESS',skirt:'SKIRT'};
  var CATLABEL={TOP:'상의',BOTTOM:'하의',OUTER:'아우터',DRESS:'원피스',SKIRT:'치마'};
  var qcat=new URLSearchParams(location.search).get('cat');
  var exps=payload.experiences||[];
  var curCat = (qcat&&CATMAP[qcat]) ? CATMAP[qcat]
             : (exps.length ? exps[exps.length-1].category
             : (payload.prefs ? Object.keys(payload.prefs)[0] : 'TOP')) || 'TOP';
  var curLabel=CATLABEL[curCat]||'상의';
  var isTop=(curCat==='TOP');
  // 카테고리별 체형 측정 부위 — body-model.js 키(chestFull·waist·hip·shoulder·arm) 기준.
  // 형식: [key, 왼쪽(낮은/좁은 끝), 오른쪽(높은/넓은 끝), axis]. 막대는 백분위만큼 왼→오 채워짐.
  var MEAS={
    TOP:   [['shoulder','좁은 어깨','넓은 어깨','어깨 — 어깨 기준으로 사이즈가 갈려요'],
            ['chestFull','슬림한 가슴','볼륨 있는 가슴','가슴 — 슬림핏은 여유를 확인해요'],
            ['waist','슬림한 배','볼륨 있는 배','배 — 표준 대비 위치'],
            ['arm','짧은 상체·팔','긴 상체·팔','총장·소매 — 기장이 맞는지']],
    BOTTOM:[['waist','슬림한 허리','볼륨 있는 허리','허리 — 밴드·버튼 기준'],
            ['hip','슬림한 엉덩이','볼륨 있는 엉덩이','엉덩이 — 힙 기준으로 사이즈가 갈려요']],
    OUTER: [['shoulder','좁은 어깨','넓은 어깨','어깨 — 아우터는 어깨·품 기준'],
            ['chestFull','슬림한 가슴','볼륨 있는 가슴','가슴·품 — 레이어링 여유']],
    SKIRT: [['waist','슬림한 허리','볼륨 있는 허리','허리 — 치마 밴드 기준'],
            ['hip','슬림한 엉덩이','볼륨 있는 엉덩이','엉덩이 — 힙 기준']],
    DRESS: [['chestFull','슬림한 가슴','볼륨 있는 가슴','가슴 — 상의 기준'],
            ['waist','슬림한 허리','볼륨 있는 허리','허리 — 잘록 정도'],
            ['hip','슬림한 엉덩이','볼륨 있는 엉덩이','엉덩이 — 힙 기준']]
  };

  // ── 8유형 체형 카드 노출 규칙 ──
  //  · 0벌(건너뛰기): 옷 입력을 건너뛴 종착 상태 → 회귀 기본 추정 카드(저신뢰)
  //  · 완성(상+하): 8유형 카드
  //  · 부분(상의만/하의만): 진행 중 → 잠금(나머지 완성 유도)
  var slot=document.getElementById('cardslot');
  var noneDone=!upperDone && !lowerDone;
  // 카드는 항상 노출 — 부분(상의만/하의만)도 빠진 부위를 회귀로 채워 분류 가능(0벌과 동일 원칙).
  // 완성도는 신뢰도 배지 + 업그레이드 안내(cardNoteHTML)로 구분.
  // ※ 전엔 부분만 잠금이라 "0벌보다 정보가 많은데 카드를 못 받는" 모순이 있었음.
  var showCard=true;
  var fullBody=cardReady || noneDone;   // 측정 상세는 실제 측정한 범위만 — 부분은 그 카테고리만(정직성 유지)
  // ── 결과 준비 로딩 오버레이: 측정·추천 렌더(_contentReady) + 카드 iframe 로드(_cardPainted)가 실제로 끝나면 한 번에 공개 ──
  var _contentReady=false, _cardPainted=false;
  function hideRloading(){ var el=document.getElementById('rloading'); if(!el) return; el.classList.add('hide'); setTimeout(function(){ if(el.parentNode) el.parentNode.removeChild(el); }, 400); }
  function maybeHideLoading(){ if(_contentReady && (_cardPainted || !showCard)) hideRloading(); }
  setTimeout(hideRloading, 4000);   // 안전장치: 무슨 일이 있어도 4초 뒤엔 공개(카드 로드 실패 등)
  function cardNoteHTML(){
    var tier=confidenceTier;
    if(!cardReady && tier==='high') tier='mid'; // 완성 전엔 '높음' 아님
    var tierKo=tier==='high'?'높음':tier==='mid'?'보통':'낮음';
    var msg='';
    if(noneDone){ // 0벌: 실착을 넣으면 정밀해진다는 안내
      msg='<span class="rconf-msg"><a href="diag-fit.html?cat=top">상의</a> · <a href="diag-fit.html?cat=bottom">하의</a> 실착을 넣으면 체형이 또렷해져요</span>';
    }else if(!cardReady){ // 부분(1/2): 잠금이 아니라 진행률·업그레이드로 유도
      var needL=upperDone?'하의':'상의';
      var needH=upperDone?'diag-fit.html?cat=bottom&reuse=1&have=top':'diag-fit.html?cat=top&reuse=1&have=bottom';
      msg='<span class="rconf-msg"><b>1/2 완료</b> · <a href="'+needH+'">'+needL+'까지 진단</a>하면 체형이 또렷해져요</span>';
    }
    return '<div class="rcardnote"><span class="rconf '+tier+'">정확도 '+tierKo+(tier==='low'?' · 기본 추정':'')+'</span>'+msg+'</div>';
  }
  function renderCard(type){
    if(!type){ slot.innerHTML='<div class="rcard-load">체형 카드를 계산하고 있어요…</div>'; return; }  // 실분류 전 로딩(가짜 유형 X)
    slot.innerHTML='<iframe src="card.html?type='+type+'&g='+gender+'&host=result" scrolling="no" title="내 결과 카드"></iframe>'+cardNoteHTML();
    var _ifr=slot.querySelector('iframe'); if(_ifr) _ifr.addEventListener('load', function(){ _cardPainted=true; maybeHideLoading(); });
    var _sh=document.getElementById('rshare'); if(_sh) _sh.hidden=false;   // 유형이 정해졌을 때만 공유 노출
  }
  function rToast(msg){
    var t=document.getElementById('rtoast');
    if(!t){ t=document.createElement('div'); t.id='rtoast'; t.className='rtoast'; document.body.appendChild(t); }
    t.textContent=msg; void t.offsetWidth; t.classList.add('on');
    clearTimeout(window._rt); window._rt=setTimeout(function(){ t.classList.remove('on'); }, 2400);
  }
  // 결과 공유 = 친구 초대 링크(card.js shareInvite와 동일 규칙: index.html?from=CODE).
  // 카드 iframe 안 🔗은 작아서 잘 안 보임 → 카드 직후에 큰 액션으로 한 번 더.
  function shareResult(){
    var code=cardType||'';
    var t=(window._btList||[]).filter(function(x){ return x.code===code; })[0];
    var nm=t?t.name:code;
    var dir=location.pathname.replace(/[^/]*$/, '');
    var url=location.origin+dir+'index.html?from='+code;
    var text='너는 어떤 핏이야? 나는 \''+nm+'\' 나왔어 · 착용 경험 3분이면 내 체형·사이즈가 나와 — fitting';
    if(navigator.share){ navigator.share({title:'fitting — 내 핏 결과', text:text, url:url}).catch(function(){}); return; }
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text+'\n'+url)
        .then(function(){ rToast('초대 링크를 복사했어요 · 친구에게 붙여넣기 해보세요'); })
        .catch(function(){ rToast('링크: '+url); });
    } else { rToast('링크: '+url); }
  }
  window.shareResult=shareResult;
  var cardType=null;   // 실엔진(FitBodyType.classify)이 채움 — 초기 null이라 가짜 유형 안 뜸
  var _diagId=null;    // api 모드: recordDiagnosis 후 diagnosis id 저장(피드백 FK)
  // 유형 정체성 / 잘맞·피할 FIT / 한 끗 — 마이 '내 진단결과' 디자인 통일 (8유형 동적)
  (function(){
    var okC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
    var noC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>';
    function chips(a){ return (a||[]).map(function(c){ return '<span>'+c+'</span>'; }).join(''); }
    window._renderType=function(list){
      // 8유형 체형 상세(dtl-id/fitbox/tip)는 상·하의 모두 완료(cardReady) 시에만 — 미완료면
      // 빈 채로 둬 CSS(.dtl-*:empty{display:none})가 숨김. cardType이 'BAL' 폴백일 때 오노출 방지.
      if(!showCard) return;   // 카드가 나오면 유형 상세도 함께(부분도 노출 — 완성도는 신뢰도 배지로 구분)
      var t=(list||[]).filter(function(x){ return x.code===cardType; })[0]; if(!t) return;
      var tp=t.point||'#2E4A3B';
      var idEl=document.getElementById('rtypeid');
      if(idEl){ idEl.style.setProperty('--tp',tp);
        idEl.innerHTML='<span class="dtl-code">'+t.code+'</span><h2 class="dtl-name">'+t.name+'</h2>'+
          '<span class="dtl-korea">사이즈코리아 · '+t.sizeKorea+'</span>'+
          '<p class="dtl-desc">'+(t.profile||[]).map(function(p,i){ return i===0?'<b>'+p+'</b>':p; }).join('<br>')+'</p>'+
          '<div class="dtl-hash">'+chips(t.signature)+'</div>'; }
      var fEl=document.getElementById('rfit');
      if(fEl){ fEl.style.setProperty('--tp',tp);
        fEl.innerHTML='<div class="dtl-fit ok"><div class="dtl-fit-h">'+okC+'잘맞 FIT</div><div class="dtl-chips">'+chips(t.fitOk)+'</div></div>'+
          '<div class="dtl-fit no"><div class="dtl-fit-h">'+noC+'피할 FIT</div><div class="dtl-chips">'+chips(t.fitNo)+'</div></div>'; }
      var tEl=document.getElementById('rtip');
      if(tEl && t.insight){ tEl.style.setProperty('--tp',tp); tEl.innerHTML='<div class="k">FITTING의 한 끗</div><p>'+t.insight+'</p>'; }
    };
    fetch('data/bodytypes.json').then(function(r){ return r.json(); }).then(function(j){
      var list=Array.isArray(j)?j:(j.types||Object.keys(j).map(function(k){ return j[k]; }));
      window._btList=list.map(function(t){ return btResolve(t, gender); });   // 성별별 콘텐츠 해석
      window._renderType(window._btList);
    }).catch(function(){});
  })();
  // 부분(1/2)이면 제목으로 상태를 알리되, 카드는 노출한다(신뢰도·업그레이드 안내로 완성도 구분).
  if(!cardReady && !noneDone){
    document.getElementById('rtitle').textContent=(upperDone?'상체':'하체')+' 중심으로 진단했어요';
  }
  slot.className='rcard';
  renderCard(cardType);

  // ── 브랜드별 추천 사이즈 — TOP(가슴·어깨)·BOTTOM(허리·엉덩이+실루엣) 실계산, 파생은 '준비중' ──
  var FLK={slim:'슬림',regular:'레귤러',loose:'루즈',oversize:'오버',skinny:'스키니',
    straight:'스트레이트',tapered:'테이퍼드',wide:'와이드',bootcut:'부츠컷'};
  // 브랜드 추천 패널 헤더 — '내 체형 측정'과 동일한 마이 디자인(dtl-meas-h/dtl-note)
  function recsHead(chip){
    return '<div class="dtl-meas-h"><span class="k">브랜드별 추천 사이즈</span><span class="chip">'+chip+'</span></div>'+
      '<div class="dtl-note" style="margin-top:8px">몸에 <b style="color:var(--ink)">가장 잘 맞을 순</b>으로 · <b style="color:var(--ink)">핏 지수</b> = 예상 적합도</div>';
  }
  function recsNotice(msg){ return '<div class="rgnotice" style="margin-top:12px">'+msg+'</div>'; }
  // 추천 목록(s2row 막대). real(엔진 실계산): fit≥60 자격을 거른 뒤 브랜드 노출 순서(order · admin/DB)로 정렬(동점=fit).
  //   → '잘 맞는 브랜드 안에서 실착 접근성 순'. order 없으면(proto/미지정) fit 순으로 폴백.
  function recsListHTML(recs, real){
    function ord(r){ return (r.order==null?9999:r.order); }
    var ranked=(recs||[]).slice();
    if(real){
      var good=ranked.filter(function(r){ return (r.fitScore||0)>=60; });
      var base=good.length?good:ranked;
      base.sort(function(a,b){ return (ord(a)-ord(b)) || ((b.fitScore||0)-(a.fitScore||0)); });
      ranked=base.slice(0,3);
    } else {
      ranked.sort(function(a,b){ return (b.fitScore||0)-(a.fitScore||0); });
      ranked=ranked.slice(0,3);
    }
    return '<div class="s2list">'+ranked.map(function(r){
      var note=(FLK[r.fitLine]||'')+' · '+r.bottleneck+' 기준'+(r.variance?' · '+r.variance:'');
      var pct=(r.fitScore!=null)?r.fitScore:0;
      var scoreTxt=(r.fitScore!=null)?r.fit+' '+r.fitScore+'%':r.fit;
      var loCls=(r.warn||(r.fitScore!=null&&r.fitScore<70))?' lo':'';
      return '<div class="s2row'+loCls+'"><div class="s2fill" style="width:'+pct+'%"></div>'+
        '<div class="s2in"><div class="b">'+r.brandName+'<small>'+note+'</small></div>'+
        '<div class="r"><span class="sz">'+r.size+'</span><span class="p">'+scoreTxt+'</span></div></div></div>';
    }).join('')+'</div>';
  }
  // 단일 카테고리 추천(부분 완료)
  function renderRecs(recs, real){
    document.getElementById('recs').innerHTML=recsHead(curLabel+' 기준')+recsListHTML(recs, real);
  }
  // 상·하의 모두 완료 → 상의·하의 추천을 그룹으로 함께
  function renderRecsBoth(topRecs, botRecs, chip){
    function grp(label,cls,recs){
      var body=(recs&&recs.length)?recsListHTML(recs,true):recsNotice('이 입력만으로는 추천을 만들기 어려워요 — 착용 경험을 넣으면 정밀해져요');
      return '<div class="dtl-grp '+cls+'">'+label+'</div>'+body;
    }
    document.getElementById('recs').innerHTML=recsHead(chip||'전신 · 상·하의 완료')+grp('상의','up',topRecs)+grp('하의','lo',botRecs);
  }
  // 추천은 A축 사이즈 시드가 있는 TOP·BOTTOM만 실제. 나머지 카테고리는 측정만 보여주고 추천은 '준비중'.
  function renderRecsPending(){
    document.getElementById('recs').innerHTML=recsHead(curLabel+' 기준')+
      recsNotice('<svg class="ricon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg> <b>'+curLabel+' 브랜드 추천은 준비 중</b>이에요 — '+curLabel+' 사이즈표 데이터를 모으는 단계라, 아래 <b>체형 측정</b>으로 먼저 보여드려요. <span style="color:var(--sub2)">(상의는 브랜드별 실계산 제공)</span>');
  }
  // 실엔진 계산 대기 상태 — 목업 canned 추천을 걷어낸 자리(가짜 브랜드 노출 방지).
  function renderRecsLoading(){
    document.getElementById('recs').innerHTML=recsHead(curLabel+' 기준')+recsNotice('브랜드별 추천을 계산하고 있어요…');
  }
  // 추천 로드 실패/데이터 부족 — 가짜 대신 정직한 안내.
  function renderRecsError(msg){
    document.getElementById('recs').innerHTML=recsHead(curLabel+' 기준')+
      recsNotice('<svg class="ricon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4l9 16H3z"/><path d="M12 10v4"/><path d="M12 17h.01"/></svg> '+(msg||'추천을 불러오지 못했어요. 잠시 후 다시 시도해 주세요'));
  }
  // 데이터 없음(basic 미입력) — 가짜 결과 대신 진단 유도.
  function renderNoData(){
    if(slot){ slot.className='rlock';
      slot.innerHTML='<div class="lk"><svg class="ricon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="8" rx="1.5"/><path d="M7 8v3M11 8v4M15 8v3"/></svg></div><div class="t1">아직 진단 데이터가 없어요</div>'+
        '<div class="t2">키·몸무게와 착용 경험을 입력하면 체형과 추천 사이즈가 나와요</div>'+
        '<a class="b" href="diag-basic.html">진단 시작하기 →</a>'; }
    renderRecsError('진단을 먼저 완료해 주세요');
    var mEl=document.getElementById('meas'); if(mEl) mEl.innerHTML='';
  }
  // 엔진/데이터 로드 실패 — 목업 유지가 아니라 정직한 오류.
  function renderLoadError(){
    if(slot && !cardType){ slot.className='rlock';
      slot.innerHTML='<div class="lk"><svg class="ricon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4l9 16H3z"/><path d="M12 10v4"/><path d="M12 17h.01"/></svg></div><div class="t1">결과를 불러오지 못했어요</div><div class="t2">잠시 후 새로고침해 주세요</div>'; }
    renderRecsError();
  }
  if(isTop || curCat==='BOTTOM') renderRecsLoading();   // 실계산 카테고리는 로딩(실엔진이 채움)
  else renderRecsPending();                             // 파생은 준비중

  // ── 내 체형 측정 + 실추천(회귀·garments) ──
  // 왼쪽 poleL=낮은 끝, 오른쪽 poleR=높은 끝. 막대는 백분위만큼 왼→오. 강조(dom)는 가까운 쪽.
  function specRow(poleL,pct,poleR,axis,lo){
    pct=Math.max(3,Math.min(97,Math.round(pct||50)));
    var part=(axis||'').split(/\s*[—-]\s*/)[0].trim();
    // 부위(마지막 단어) 떼고 형용사 전체 — '볼륨 있는'이 '볼륨'으로 잘리지 않게. 한 단어 라벨('타이트')이면 통째로 유지.
    var adjL=(poleL||'').split(' ').slice(0,-1).join(' ')||poleL, adjR=(poleR||'').split(' ').slice(0,-1).join(' ')||poleR;
    var zone = pct>=62 ? adjR+' 편' : (pct<=38 ? adjL+' 편' : '표준');
    var idx=Math.min(4,Math.max(0,Math.round(pct/100*4))), segs='';
    for(var i=0;i<5;i++){ segs+='<div class="n2seg'+(i===idx?' on':(Math.abs(i-idx)===1?' near':''))+'"></div>'; }
    return '<div class="n2row'+(lo?' lo':'')+'"><div class="n2top"><span class="part">'+part+'</span><span class="zone">'+zone+'</span></div>'+
      '<div class="n2segs">'+segs+'</div><div class="n2scale"><span>'+adjL+'</span><span>'+adjR+'</span></div></div>';
  }
  // 여유축(상의): skinny..oversize / 형태축(하의 실루엣): slim..wide 슬림도로 근사 배치.
  var FITPCT={skinny:20,slim:32,regular:55,loose:70,oversize:85,
    straight:50,tapered:45,wide:78,bootcut:62};

  // specs(garments) 의존 계산 — proto=클라 로컬(garments.json 직접) / api=서버(/api/diagnose, garments 비노출·해자 보호).
  // 반환 {eb, topRecs, botRecs, specsMissing, id}. 체형추정·8유형분류·렌더는 호출부(클라)가 공통 처리.
  function diagnoseSpecs(est, cm, prefsObj){
    if(FDATA.mode==='api'){
      return FDATA.diagnose({ session_id:FDATA.sessionId(), category:curCat, sex:est.sex, cm:cm,
        prefs:prefsObj, experiences:payload.experiences, basic:payload.basic, input:payload,
        confidenceTier:confidenceTier, engine_version:'server-1' })
        .then(function(resp){ resp=resp||{}; return { eb:resp.eb||{}, topRecs:resp.topRecs||[], botRecs:resp.botRecs||[], specsMissing:false, id:resp.id }; });
    }
    return fetch('data/garments.json').then(function(r){return r.json();}).catch(function(){return null;}).then(function(gj){
      var specs=gj&&gj.specs;
      if(!specs) return { eb:{}, topRecs:[], botRecs:[], specsMissing:true };
      var eb=(window.FitEngine&&FitEngine.bodyFromExperiences)?FitEngine.bodyFromExperiences(payload.experiences, specs):{};
      var mcm={}; Object.keys(cm).forEach(function(k){ mcm[k]=cm[k]; });
      var EB={chest:'chestFull',shoulder:'shoulder',waist:'waist',hip:'hip',thigh:'thigh'};
      Object.keys(EB).forEach(function(k){ if(eb[k]!=null) mcm[EB[k]]=eb[k]; });
      var topRecs=(mcm.chestFull!=null)?FitEngine.recommend({ chest:mcm.chestFull, shoulder:mcm.shoulder }, prefsObj.TOP||'regular', est.sex, 'long_sleeve', specs):[];
      var botRecs=(FitEngine.recommendBottom&&mcm.waist!=null)?FitEngine.recommendBottom({ waist:mcm.waist, hip:mcm.hip, thigh:mcm.thigh }, prefsObj.BOTTOM||'regular', est.sex, 'long_pants', specs):[];
      return { eb:eb, topRecs:topRecs, botRecs:botRecs, specsMissing:false };
    });
  }

  if(!hasBasic){ renderNoData(); hideRloading(); }
  else if(window.BodyModel){ BodyModel.load().then(function(){
    var est=BodyModel.estimate(payload.basic||{});
    if(!est.ready){ renderNoData(); hideRloading(); return; }
    var pm={}, cm={}; est.parts.forEach(function(p){ pm[p.key]=p.pct; cm[p.key]=p.cm; });
    var pref=(payload.prefs&&payload.prefs[curCat])||'regular';

    // 역산+추천(specs 의존)은 diagnoseSpecs가 모드별로: proto=클라(garments 로드) / api=서버(/api/diagnose, garments 비노출).
    return diagnoseSpecs(est, cm, payload.prefs||{}).then(function(D){
      var expUsed=false, eb=D.eb||{};
      var EBMAP={chest:'chestFull',shoulder:'shoulder',waist:'waist',hip:'hip',thigh:'thigh'};
      Object.keys(EBMAP).forEach(function(k){
        if(eb[k]==null) return;
        var key=EBMAP[k]; cm[key]=eb[k];
        var pc=BodyModel.pctOf(est.sex,key,eb[k]); if(pc!=null)pm[key]=pc;
        expUsed=true;
      });
      if(D.id) _diagId=D.id;

      // 8유형 판정 — 역산(상의:가슴 / 하의:허리·엉덩이)+회귀 폴백 몸으로 KS드롭 분류(bodytype.js). 스텁(mapToBodyType) 대체.
      if(showCard && window.FitBodyType){
        var bt=FitBodyType.classify({ gender:est.sex,
          heightCm:(payload.basic&&payload.basic.height), weightKg:(payload.basic&&payload.basic.weight),
          chestFull:cm.chestFull, chestUpper:cm.chestUpper, waist:cm.waist, hip:cm.hip });
        if(bt && bt!==cardType){ cardType=bt; renderCard(bt); if(window._renderType&&window._btList) window._renderType(window._btList); }
      }

      // 측정: 마이 '내 체형 측정' 디자인 통일(상체/하체/취향 그룹 + 5칸 스펙트럼).
      // 상·하의 모두 완료(cardReady)면 전신 카드, 아니면 이번 진단 카테고리만.
      var body, lowerCat=(curCat==='BOTTOM'||curCat==='SKIRT');
      if(fullBody){
        // 취향은 상·하의가 다를 수 있어 각 그룹 끝에 따로 표시(상의=여유축, 하의=형태축).
        var prefTopKey=(payload.prefs&&payload.prefs.TOP)||'regular';
        var prefBotKey=(payload.prefs&&payload.prefs.BOTTOM)||'straight';
        body='<div class="dtl-grp up" style="margin-top:8px">상체 — 상의 진단</div>'+
             specRow('좁은 어깨',pm.shoulder,'넓은 어깨','어깨',false)+
             specRow('슬림한 가슴',pm.chestFull,'볼륨 있는 가슴','가슴',false)+
             specRow('타이트',FITPCT[prefTopKey]||55,'여유','핏 취향',false)+
             '<div class="dtl-grp lo">하체 — 하의 진단</div>'+
             specRow('슬림한 허리',pm.waist,'볼륨 있는 허리','허리',true)+
             specRow('슬림한 엉덩이',pm.hip,'볼륨 있는 엉덩이','엉덩이',true)+
             specRow('슬림',FITPCT[prefBotKey]||50,'와이드','핏 취향',true);
      } else {
        var grpLabel=(curCat==='TOP'?'상체 — 상의 진단':lowerCat?'하체 — '+curLabel+' 진단':'상체 — '+curLabel+' 진단');
        body='<div class="dtl-grp '+(lowerCat?'lo':'up')+'" style="margin-top:8px">'+grpLabel+'</div>'+
             (MEAS[curCat]||MEAS.TOP).map(function(m){ return specRow(m[1],pm[m[0]],m[2],m[3],lowerCat); }).join('')+
             (lowerCat
               ? specRow('슬림',FITPCT[pref]||50,'와이드','핏 취향',true)
               : specRow('타이트',FITPCT[pref]||55,'여유','핏 취향',false));
      }
      var btName='';
      if(fullBody && window._btList){ var _bt=window._btList.filter(function(x){ return x.code===cardType; })[0]; if(_bt) btName=_bt.name+'('+_bt.code+')'; }
      var measNote = cardReady
        ? '어깨·가슴·허리·엉덩이 측정을 종합해 '+(btName?'<b style="color:var(--ink)">'+btName+'</b> ':'')+'유형으로 확정됐어요'
        : noneDone
        ? '키·몸무게로 어깨·가슴·허리·엉덩이를 추정한 <b style="color:var(--ink2)">기본 결과</b>예요 · 입어본 옷을 넣으면 정밀해져요'
        : '부위는 <b style="color:var(--ink2)">카테고리별로 달라져요</b>. 카테고리별 진단을 모두 완료하면 전신 비율까지 확인할 수 있어요.';
      var measChip = cardReady ? '전신 · 상·하의 완료' : noneDone ? '전신 · 기본 추정' : curLabel+(expUsed?' · 입어본 옷':' · 추정');
      document.getElementById('meas').innerHTML=
        '<div class="dtl-meas-h"><span class="k">내 체형 측정</span><span class="chip">'+measChip+'</span></div>'+
        body+
        '<div class="dtl-note">'+measNote+'</div>';

      // 추천 — proto/api가 계산한 topRecs/botRecs(D)를 렌더. specs 없으면 정직한 안내.
      if(fullBody && (isTop||curCat==='BOTTOM')){
        if(D.specsMissing) renderRecsError();
        else renderRecsBoth(D.topRecs||[], D.botRecs||[], cardReady?'전신 · 상·하의 완료':'전신 · 기본 추정');
      } else if(isTop || curCat==='BOTTOM'){
        if(D.specsMissing) renderRecsError();
        else {
          var out=isTop?(D.topRecs||[]):(D.botRecs||[]);
          if(out.length) renderRecs(out, true);
          else renderRecsError('이 입력만으로는 추천을 만들기 어려워요 — 착용 경험을 넣으면 정밀해져요');
        }
      }
      _contentReady=true; maybeHideLoading();
    });
  }).catch(function(){ renderLoadError(); hideRloading(); }); }
  else { renderLoadError(); hideRloading(); }   // BodyModel 스크립트 로드 실패

  // ── 결과 풀이 (＋강점 / ＝핏 공식 / ！주의) — 규칙 기반 골격, 서술은 AI 자리 ──
  var MEANS={
    TOP:   {eq:'어깨·가슴 중 큰 쪽을 기준으로', warn:'슬림핏은 가슴이 끼일 수 있어'},
    BOTTOM:{eq:'허리·엉덩이 중 큰 쪽을 기준으로', warn:'스키니는 허벅지가 끼일 수 있어'},
    OUTER: {eq:'어깨·품을 기준으로', warn:'이너 위에 겹쳐 입으면 품이 빠듯할 수 있어'},
    SKIRT: {eq:'허리·엉덩이 중 큰 쪽을 기준으로', warn:'타이트 스커트는 힙이 끼일 수 있어'},
    DRESS: {eq:'가슴·허리·엉덩이 중 큰 쪽을 기준으로', warn:'상하 비율이 안 맞으면 한 곳이 끼일 수 있어'}
  };
  var mn=MEANS[curCat]||MEANS.TOP;
  document.getElementById('means').innerHTML=
    '<div class="rkicker">결과 풀이</div>'+
    '<div class="rex plus"><div class="lbl"><span class="mk">＋</span> 강점</div><p>가장 또렷한 부위를 기준으로 맞추면 <strong>실루엣이 안정적으로</strong> 떨어져요</p></div>'+
    '<div class="rex eq"><div class="lbl"><span class="mk">＝</span> 핏 공식</div><p><strong>'+mn.eq+'</strong> 사이즈를 고르고, 나머지는 여유로 조절해요</p></div>'+
    '<div class="rex warn"><div class="lbl"><span class="mk">！</span> 주의</div><p>'+mn.warn+' <strong>같은 치수에서 한 단계 위</strong>를 고려해요</p></div>'+
    '<div class="rfoot">※ 캐릭터·해설 서술은 AI가 생성하는 자리예요(현재는 규칙 기반 예시)</div>';

  // ── 옷장 · 이어서 진단 게이트: 노출 불필요로 제거(2026-07 디자인 결정) ──

  // ── 엔진 개선 활용: 선택 동의(opt-in). 진단 이용엔 영향 없음(서비스 제공 근거로 수집·처리). ──
  function engineConsented(){ return FDATA.readConsent().engineImprove===true; }   // 어댑터(seam)
  // 체크 = 엔진 개선 동의 + 만14세 이상/법정대리인 동의 확인(자기확인). 동의 지점에서만 나이 확인.
  function setEngineConsent(on){
    FDATA.saveConsent({ engineImprove:!!on, ageAttested:!!on, at:new Date().toISOString() });   // 어댑터(seam)
  }
  // 저장된 동의 상태를 체크박스에 반영(재방문·재렌더 시)
  (function(){ var el=document.getElementById('eiConsent'); if(el) el.checked=engineConsented(); })();

  // ── 피드백 로깅(킬 메트릭 원천). 엔진 개선 활용은 동의(engineImprove)한 경우로 표기 ──
  function fb(el,verdict){
    [].forEach.call(el.parentElement.children,function(c){c.classList.remove('on');}); el.classList.add('on');
    var consent=FDATA.readConsent();   // 어댑터(seam)
    var rec={ ts:new Date().toISOString(), bodyType:cardType, verdict:verdict, confidenceTier:confidenceTier, engineImprove:consent.engineImprove===true, ageAttested:consent.ageAttested===true, diagnosisId:_diagId };
    FDATA.saveFeedback(rec);   // 어댑터(seam): proto=localStorage / api=POST /api/feedback(diagnosis_id 포함)
  }
  // 진단 초기화 — 누적된 입력(dx·기본정보·동의·피드백)을 지우고 처음부터. (목업 테스트용)
  function resetDiag(){
    try{ ['fitting.dx','fitting.basic','fitting.consent'].forEach(function(k){ sessionStorage.removeItem(k); }); }catch(e){}
    FDATA.clearFeedback();
    location.href='diag-basic.html';
  }

  // ── 결과 저장 · 전문가 매칭 — 로그인 게이트 ──
  //  · 로그인: 저장 → '저장했어요' 모달 → 마이(#my)에 결과 표시 / 전문가 → 스타일리스트찾기(#shop)
  //  · 비로그인: 저장·전문가 모두 로그인 유도 모달
  //  · 공유(카드 🔗)는 로그인 무관(card.js shareInvite) — 여기서 다루지 않음
  // 로그인 상태: index.js loggedIn()과 동일(localStorage fitting.auth, 명시적 로그아웃 시에만 false).
  function isAuthed(){ return FDATA.isAuthed(); }   // 어댑터(seam)
  // 진단 유형·기본정보를 마이(#my)가 읽는 프로필로 저장 → 마이가 이 결과를 보여줌.
  function persistResultToProfile(){
    try{
      var u={};
      if(cardType) u.type=cardType;
      var b=payload.basic||{};
      if(b.gender) u.gender=b.gender;
      if(b.height!=null) u.height=b.height;
      if(b.weight!=null) u.weight=b.weight;
      var prefKo={skinny:'스키니',slim:'슬림',regular:'레귤러',loose:'루즈',oversize:'오버'};
      var pf=(payload.prefs&&(payload.prefs.TOP||payload.prefs.BOTTOM));
      if(pf&&prefKo[pf]) u.fit=prefKo[pf];
      FDATA.saveUser(u);   // 어댑터(seam)
    }catch(e){}
  }
  function saveResult(){
    if(FDATA.mode==='api'){ openRModal('saved'); return; }   // MVP: 진단은 서버에 이미 기록됨 · 계정 저장/마이 없음
    if(!isAuthed()){ openRModal('login','my'); return; }
    // 상의만/하의만(정확히 한 쪽) = 8유형 미완성 → 유형 저장 안 하고 나머지 진단 유도(대칭).
    if(upperDone!==lowerDone){ openRModal('incomplete'); return; }
    persistResultToProfile();
    openRModal('saved');
  }
  function goExpert(){
    if(FDATA.mode!=='api' && !isAuthed()){ openRModal('login','shop'); return; }   // api(MVP)는 로그인 없이 바로 스타일리스트찾기(페이크도어)
    location.href='index.html#shop';
  }
  // 결과 카드(iframe, ?host=result)의 🔖 저장 → 부모로 위임해 버튼과 동일 동작
  window.addEventListener('message', function(e){ if(e&&e.data&&e.data.type==='fitting:save') saveResult(); });

  // MVP(api): 계정 저장/로그인 표면 숨김 — '결과 저장하기' 버튼·로그인 안내 문구 감추고 '스타일리스트 찾기'만 남김.
  if(FDATA.mode==='api'){ try{
    var _saveBtn=document.querySelector('.rcta .rbtn.p'); if(_saveBtn) _saveBtn.style.display='none';
    var _ctaNote=document.querySelector('.rcta-note'); if(_ctaNote) _ctaNote.style.display='none';
  }catch(_e){} }

  // 결과 페이지 전용 미니 모달(index 로그인 시트가 없는 페이지라 자체 모달)
  function openRModal(kind, next){
    closeRModal();
    var title, body, primaryLabel, primaryHref;
    if(kind==='saved'){
      if(FDATA.mode==='api'){
        title='결과가 기록됐어요'; body='진단 결과가 안전하게 기록됐어요 · 스타일리스트찾기로 이어가 보세요';
        primaryLabel='스타일리스트 찾기'; primaryHref='index.html#shop';
      } else {
        title='결과를 저장했어요'; body='마이 &gt; 내 진단결과에서 언제든 다시 볼 수 있어요';
        primaryLabel='마이에서 보기'; primaryHref='index.html?my=mp-diag';
      }
    } else if(kind==='incomplete'){
      var needTop=!upperDone;   // 지금 한 쪽만 완료 — 나머지 안내
      var missKo=needTop?'상의':'하의', missCat=needTop?'top':'bottom', haveCat=needTop?'bottom':'top';
      title='조금만 더 하면 완성돼요';
      body='<b>'+missKo+'</b>도 진단하면 8체형 결과가 완성돼요';
      primaryLabel=missKo+' 진단하기'; primaryHref='diag-fit.html?cat='+missCat+'&reuse=1&have='+haveCat;
    } else {
      title='로그인이 필요해요'; body='결과 저장·스타일리스트 매칭은 로그인 후 이용할 수 있어요';
      primaryLabel='로그인하기'; primaryHref='index.html?login=1&next='+(next||'my');
    }
    var wrap=document.createElement('div'); wrap.id='rmodal';
    wrap.innerHTML='<div class="rmodal-scrim" onclick="closeRModal()"></div>'+
      '<div class="rmodal-box" role="dialog" aria-modal="true" aria-label="'+title+'">'+
        '<h3 class="rmodal-t">'+title+'</h3><p class="rmodal-b">'+body+'</p>'+
        '<div class="rmodal-acts">'+
          '<button type="button" class="rmodal-btn ghost" onclick="closeRModal()">닫기</button>'+
          '<a class="rmodal-btn primary" href="'+primaryHref+'">'+primaryLabel+'</a>'+
        '</div></div>';
    document.body.appendChild(wrap);
  }
  function closeRModal(){ var m=document.getElementById('rmodal'); if(m) m.remove(); }
