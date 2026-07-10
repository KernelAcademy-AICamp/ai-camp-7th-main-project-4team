  var payload={}; try{ payload=JSON.parse(sessionStorage.getItem('fitting.dx')||'{}'); }catch(e){}
  var savedBasic={}; try{ savedBasic=JSON.parse(sessionStorage.getItem('fitting.basic')||'{}'); }catch(e){}
  // 건너뛰기(0벌): dx가 없어 기본 추정만 — fitting.basic(성별·키·몸무게)을 써야 측정·추천이 나온다.
  if(!payload.experiences) payload.experiences=[];
  if(!payload.basic || payload.basic.height==null) payload.basic=savedBasic;
  if(!payload.prefs) payload.prefs={};
  var gender=(payload.basic&&payload.basic.gender)||'female';
  var dx=FittingEngine.diagnose(payload);

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
  var showCard=cardReady || noneDone;
  function cardNoteHTML(){
    var tier=dx.confidenceTier||'low';
    if(!cardReady && tier==='high') tier='mid'; // 완성 전엔 '높음' 아님
    var tierKo=tier==='high'?'높음':tier==='mid'?'보통':'낮음';
    var msg='';
    if(noneDone){ // 0벌: 실착을 넣으면 정밀해진다는 안내
      msg='<span class="rconf-msg"><a href="diag-fit.html?cat=top">상의</a> · <a href="diag-fit.html?cat=bottom">하의</a> 실착을 넣으면 체형이 또렷해져요</span>';
    }
    return '<div class="rcardnote"><span class="rconf '+tier+'">정확도 '+tierKo+(tier==='low'?' · 기본 추정':'')+'</span>'+msg+'</div>';
  }
  function renderCard(type){
    slot.innerHTML='<iframe src="card.html?type='+(type||'BAL')+'&g='+gender+'" scrolling="no" title="내 결과 카드"></iframe>'+cardNoteHTML();
  }
  var cardType=dx.bodyType||'BAL';
  // 유형 정체성 / 잘맞·피할 FIT / 한 끗 — 마이 '내 진단결과' 디자인 통일 (8유형 동적)
  (function(){
    var okC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
    var noC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>';
    function chips(a){ return (a||[]).map(function(c){ return '<span>'+c+'</span>'; }).join(''); }
    window._renderType=function(list){
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
      window._btList=Array.isArray(j)?j:(j.types||Object.keys(j).map(function(k){ return j[k]; }));
      window._renderType(window._btList);
    }).catch(function(){});
  })();
  if(showCard){
    slot.className='rcard';
    renderCard(cardType);
  }else{
    // 부분 완료: 아직 안 한 기반으로 유도
    slot.className='rlock';
    var needLabel=upperDone?'하의':'상의';
    var doneRegion=upperDone?'상체':'하체';
    var needHref=upperDone?'diag-fit.html?cat=bottom&reuse=1&have=top':'diag-fit.html?cat=top&reuse=1&have=bottom';
    document.getElementById('rtitle').textContent=doneRegion+' 부분 진단이 끝났어요';
    slot.innerHTML='<div class="lk">🔒</div><div class="t1">체형 카드는 상·하의를 모두 진단하면 나와요</div>'+
      '<div class="t2">지금은 '+doneRegion+'만 파악됐어요 — 8유형 체형은 '+needLabel+'까지 해야 확정돼요</div>'+
      '<a class="b" href="'+needHref+'">'+needLabel+' 진단하기 →</a>';
  }

  // ── 브랜드별 추천 사이즈 — TOP(가슴·어깨)·BOTTOM(허리·엉덩이+실루엣) 실계산, 파생은 '준비중' ──
  var FLK={slim:'슬림',regular:'레귤러',loose:'루즈',oversize:'오버',skinny:'스키니',
    straight:'스트레이트',tapered:'테이퍼드',wide:'와이드',bootcut:'부츠컷'};
  function renderRecs(recs, real){
    // 몸에 가장 잘 맞을 브랜드만 — 핏 지수 상위. real(엔진 실계산)이면 60%+ 중 상위 3(없으면 상위 3).
    var ranked=(recs||[]).slice().sort(function(a,b){ return (b.fitScore||0)-(a.fitScore||0); });
    if(real){ var good=ranked.filter(function(r){ return (r.fitScore||0)>=60; }); ranked=(good.length?good:ranked).slice(0,3); }
    else ranked=ranked.slice(0,3);
    document.getElementById('recs').innerHTML=
      '<div class="rrow"><div class="rkicker">가장 잘 맞을 브랜드·사이즈</div><span class="rchip">이번 진단 · '+curLabel+'</span></div>'+
      '<div class="rnote">평소 착용감 기준, 몸에 <b style="color:var(--ink2)">가장 잘 맞을 순</b>으로 추렸어요 · <b style="color:var(--ink2)">핏 지수</b>=예상 적합도</div>'+
      '<div class="s2list">'+
      ranked.map(function(r){
        var note=(FLK[r.fitLine]||'')+' · '+r.bottleneck+' 기준'+(r.variance?' · '+r.variance:'');
        var pct=(r.fitScore!=null)?r.fitScore:0;
        var scoreTxt=(r.fitScore!=null)?r.fit+' '+r.fitScore+'%':r.fit;
        var loCls=(r.warn||(r.fitScore!=null&&r.fitScore<70))?' lo':'';
        return '<div class="s2row'+loCls+'"><div class="s2fill" style="width:'+pct+'%"></div>'+
          '<div class="s2in"><div class="b">'+r.brandName+'<small>'+note+'</small></div>'+
          '<div class="r"><span class="sz">'+r.size+'</span><span class="p">'+scoreTxt+'</span></div></div></div>';
      }).join('')+'</div>'+
      (real?'<div class="rfoot">※ 핏 지수 = 브랜드 실측(단면) 대비 '+(curCat==='BOTTOM'?'허리·엉덩이·허벅지 여유로 계산 · 바지':'가슴·어깨 여유로 계산 · 긴팔')+' 기준 · 착용경험을 넣으면 정밀해져요</div>':'');
  }
  // 추천은 A축 사이즈 시드가 있는 TOP만 실제. 나머지 카테고리는 측정만 보여주고 추천은 '준비중'.
  function renderRecsPending(){
    document.getElementById('recs').innerHTML=
      '<div class="rrow"><div class="rkicker">브랜드별 추천 사이즈</div><span class="rchip">이번 진단 · '+curLabel+'</span></div>'+
      '<div class="rgnotice" style="margin-top:12px">🔒 <b>'+curLabel+' 브랜드 추천은 준비 중</b>이에요 — '+curLabel+' 사이즈표 데이터를 모으는 단계라, 아래 <b>체형 측정</b>으로 먼저 보여드려요. <span style="color:var(--sub2)">(상의는 브랜드별 실계산 제공)</span></div>';
  }
  if(isTop){
    // 목업 초기 렌더(로드 전) — 엔진 recs 형태 변환
    renderRecs((dx.recs||[]).map(function(r){ return { brandName:r.brandName, fitLine:'regular', bottleneck:r.bottleneck, size:r.size, fit:(r.warnings&&r.warnings[0])||'추천', warn:false, variance:null }; }), false);
  } else {
    renderRecsPending();
  }

  // ── 내 체형 측정 + 실추천(회귀·garments) ──
  // 왼쪽 poleL=낮은 끝, 오른쪽 poleR=높은 끝. 막대는 백분위만큼 왼→오. 강조(dom)는 가까운 쪽.
  function specRow(poleL,pct,poleR,axis){
    pct=Math.max(3,Math.min(97,Math.round(pct||50)));
    var part=(axis||'').split(/\s*[—-]\s*/)[0].trim();
    var adjL=(poleL||'').split(' ')[0], adjR=(poleR||'').split(' ')[0];
    var zone = pct>=62 ? adjR+' 편' : (pct<=38 ? adjL+' 편' : '표준');
    var idx=Math.min(4,Math.max(0,Math.round(pct/100*4))), segs='';
    for(var i=0;i<5;i++){ segs+='<div class="n2seg'+(i===idx?' on':(Math.abs(i-idx)===1?' near':''))+'"></div>'; }
    return '<div class="n2row"><div class="n2top"><span class="part">'+part+'</span><span class="zone">'+zone+'</span></div>'+
      '<div class="n2segs">'+segs+'</div><div class="n2scale"><span>'+adjL+'</span><span>'+adjR+'</span></div></div>';
  }
  // 여유축(상의): skinny..oversize / 형태축(하의 실루엣): slim..wide 슬림도로 근사 배치.
  var FITPCT={skinny:20,slim:32,regular:55,loose:70,oversize:85,
    straight:50,tapered:45,wide:78,bootcut:62};
  if(window.BodyModel){ BodyModel.load().then(function(){
    var est=BodyModel.estimate(payload.basic||{});
    if(!est.ready) return;
    var pm={}, cm={}; est.parts.forEach(function(p){ pm[p.key]=p.pct; cm[p.key]=p.cm; });
    var pref=(payload.prefs&&payload.prefs[curCat])||'regular';

    // garments 로드 → 착용경험 역산으로 부위별 prior 덮어쓰기(TOP: 가슴·어깨 / BOTTOM: 허리·엉덩이·허벅지) → 측정·추천 반영.
    return fetch('data/garments.json').then(function(r){return r.json();}).catch(function(){return null;}).then(function(gj){
      var specs=gj&&gj.specs, expUsed=false;
      if(specs && window.FitEngine && FitEngine.bodyFromExperiences){
        var eb=FitEngine.bodyFromExperiences(payload.experiences, specs);
        var EBMAP={chest:'chestFull',shoulder:'shoulder',waist:'waist',hip:'hip',thigh:'thigh'};
        Object.keys(EBMAP).forEach(function(k){
          if(eb[k]==null) return;
          var key=EBMAP[k]; cm[key]=eb[k];
          var pc=BodyModel.pctOf(est.sex,key,eb[k]); if(pc!=null)pm[key]=pc;
          expUsed=true;
        });
      }

      // 8유형 판정 — 역산(상의:가슴 / 하의:허리·엉덩이)+회귀 폴백 몸으로 KS드롭 분류(bodytype.js). 스텁(mapToBodyType) 대체.
      if(showCard && window.FitBodyType){
        var bt=FitBodyType.classify({ gender:est.sex,
          heightCm:(payload.basic&&payload.basic.height), weightKg:(payload.basic&&payload.basic.weight),
          chestFull:cm.chestFull, chestUpper:cm.chestUpper, waist:cm.waist, hip:cm.hip });
        if(bt && bt!==cardType){ cardType=bt; renderCard(bt); if(window._renderType&&window._btList) window._renderType(window._btList); }
      }

      // 측정: 이번 진단 카테고리의 필수 부위 + 여유 선호핏 (역산 반영된 pm)
      var rows=(MEAS[curCat]||MEAS.TOP).map(function(m){ return specRow(m[1],pm[m[0]],m[2],m[3]); }).join('');
      document.getElementById('meas').innerHTML=
        '<div class="rrow"><div class="rkicker">내 체형 측정</div><span class="rchip">'+curLabel+' 기준</span></div>'+
        '<div class="rgrp">필수 부위 — '+(expUsed?'착용경험으로 <b style="color:var(--ink2)">역산</b>한 몸':'키·몸무게로 추정한 몸')+'</div>'+
        rows+
        '<div class="rgrp">선호</div>'+
        (curCat==='BOTTOM'
          ? specRow('슬림 실루엣',FITPCT[pref]||50,'와이드 실루엣','선호 실루엣 — 고른 바지 형태')
          : specRow('타이트 선호',FITPCT[pref]||55,'여유 핏 선호','여유 선호핏 — 고른 핏 취향'))+
        '<div class="rnote" style="margin-top:16px">부위는 <b style="color:var(--ink2)">카테고리별로 달라져요</b>. '+(cardReady?'상·하의를 모두 마쳐 전신 비율까지 볼 수 있어요.':'다른 카테고리까지 진단하면 상하 균형·전신 비율이 나와요.')+'</div>';

      // 추천 — TOP(가슴·어깨) / BOTTOM(허리·엉덩이+선호 실루엣). 역산 반영된 bodyVec.
      if(isTop && specs && cm.chestFull!=null){
        var recs=FitEngine.recommend({ chest:cm.chestFull, shoulder:cm.shoulder }, pref, est.sex, 'long_sleeve', specs);
        if(recs.length) renderRecs(recs, true);
      } else if(curCat==='BOTTOM' && specs && FitEngine.recommendBottom && cm.waist!=null){
        // pref = prefs[BOTTOM] = 선호 실루엣. 허리를 사이즈 게이트로, 엉덩이·허벅지 수용 확인.
        var brecs=FitEngine.recommendBottom({ waist:cm.waist, hip:cm.hip, thigh:cm.thigh }, pref, est.sex, 'long_pants', specs);
        if(brecs.length) renderRecs(brecs, true);
      }
    });
  }).catch(function(){ /* file:// 등 실패 시 목업/기본 유지 */ }); }

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
    '<div class="rex plus"><div class="lbl"><span class="mk">＋</span> 강점</div><p>가장 또렷한 부위를 기준으로 맞추면 <strong>실루엣이 안정적으로</strong> 떨어져요.</p></div>'+
    '<div class="rex eq"><div class="lbl"><span class="mk">＝</span> 핏 공식</div><p><strong>'+mn.eq+'</strong> 사이즈를 고르고, 나머지는 여유로 조절하세요.</p></div>'+
    '<div class="rex warn"><div class="lbl"><span class="mk">！</span> 주의</div><p>'+mn.warn+' <strong>같은 치수에서 한 단계 위</strong>를 고려하세요.</p></div>'+
    '<div class="rfoot">※ 캐릭터·해설 서술은 AI가 생성하는 자리예요(현재는 규칙 기반 예시).</div>';

  // ── 옷장 · 이어서 진단 ──
  function catRow(nm,kind,kcls,meta,go,href,cls){
    var g = href?'<a class="go" href="'+href+'">'+go+'</a>':'<span class="go">'+go+'</span>';
    return '<div class="rcat '+(cls||'')+'"><span class="nm">'+nm+'</span><span class="rkind '+kcls+'">'+kind+'</span><span class="meta">'+meta+'</span>'+g+'</div>';
  }
  // 옷장 게이트는 상·하의(기반) 완성 후에만 노출 — 미완성 안내는 카드 영역 잠금이 담당(중복 제거).
  var gateEl=document.getElementById('gate');
  if(cardReady){
    gateEl.innerHTML=
      '<div class="rrow"><div class="rkicker">옷장 · 이어서 진단</div><span class="rchip">기반 완료 · 파생 열림</span></div>'+
      '<div class="rgrp">기반 — 실착으로 <b style="color:var(--ink2)">체형을 잠갔어요</b></div>'+
      catRow('상의','기반','base','상체 잠금 완료','완료 ✓',null,'done')+
      catRow('하의','기반','base','하체 잠금 완료','완료 ✓',null,'done')+
      '<div class="rgrp">파생 — 체형 재사용, <b style="color:var(--ink2)">선호핏만</b></div>'+
      catRow('아우터','파생','der','상체 기반 · 해금됨','선호핏만 30초 →','diag-fit.html?cat=outer&reuse=1&have=top','')+
      // 치마·원피스는 여성만 노출 (남성 제외)
      (gender==='male' ? '' :
        catRow('치마','파생','der','하체 기반 · 해금됨','선호핏만 30초 →','diag-fit.html?cat=skirt&reuse=1&have=bottom','')+
        catRow('원피스','파생','der','상체+하체 · 해금됨','선호핏만 30초 →','diag-fit.html?cat=dress&reuse=1&have=top,bottom',''))+
      '<div class="rgnotice"><b>기반(상·하의) 완료</b> — '+(gender==='male'?'아우터':'아우터·원피스·치마')+'는 옷을 다시 넣지 않고 <b>선호핏만으로</b> 열려요.</div>';
  } else {
    gateEl.style.display='none';
  }

  // ── 엔진 개선 활용: 선택 동의(opt-in). 진단 이용엔 영향 없음(서비스 제공 근거로 수집·처리). ──
  function engineConsented(){ try{ return JSON.parse(sessionStorage.getItem('fitting.consent')||'{}').engineImprove===true; }catch(e){ return false; } }
  // 체크 = 엔진 개선 동의 + 만14세 이상/법정대리인 동의 확인(자기확인). 동의 지점에서만 나이 확인.
  function setEngineConsent(on){
    try{ sessionStorage.setItem('fitting.consent', JSON.stringify({ engineImprove:!!on, ageAttested:!!on, at:new Date().toISOString() })); }catch(e){}
  }
  // 저장된 동의 상태를 체크박스에 반영(재방문·재렌더 시)
  (function(){ var el=document.getElementById('eiConsent'); if(el) el.checked=engineConsented(); })();

  // ── 피드백 로깅(킬 메트릭 원천). 엔진 개선 활용은 동의(engineImprove)한 경우로 표기 ──
  function fb(el,verdict){
    [].forEach.call(el.parentElement.children,function(c){c.classList.remove('on');}); el.classList.add('on');
    var consent={}; try{ consent=JSON.parse(sessionStorage.getItem('fitting.consent')||'{}'); }catch(e){}
    var rec={ ts:new Date().toISOString(), bodyType:cardType, verdict:verdict, confidenceTier:dx.confidenceTier, engineImprove:consent.engineImprove===true, ageAttested:consent.ageAttested===true };
    try{ var k='fitting.feedback', arr=JSON.parse(localStorage.getItem(k)||'[]'); arr.push(rec); localStorage.setItem(k,JSON.stringify(arr)); }catch(e){}
  }
  // 진단 초기화 — 누적된 입력(dx·기본정보·동의·피드백)을 지우고 처음부터. (목업 테스트용)
  function resetDiag(){
    try{ ['fitting.dx','fitting.basic','fitting.consent'].forEach(function(k){ sessionStorage.removeItem(k); }); }catch(e){}
    try{ localStorage.removeItem('fitting.feedback'); }catch(e){}
    location.href='diag-basic.html';
  }
