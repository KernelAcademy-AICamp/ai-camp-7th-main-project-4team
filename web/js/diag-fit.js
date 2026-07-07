  const PREV_URL='diag-basic.html';

  /* 진단은 카테고리(옷 종류) 단위. 역산은 신체 부위를 넘지 못하므로
     알고 싶은 종류의 옷으로 입력받고 그 종류의 사이즈를 출력한다. ready=true 만 실제 진단. */
  /* kind: base=실착 경험으로 체형(부위) 잠금 / derived=체형 재사용 + 선호핏만.
     provides=이 기반이 채우는 신체 영역, needs=이 파생이 필요로 하는 영역. */
  /* 착용경험 입력 4층(schema/wearexperience.ts와 동일):
     fit=주부위(둘레·너비 → 체형 역산) / flag=병목(미표기∩페인, A학습 전용) /
     pref=기장(취향·키, 역산 아님) / 개방 인테이크(자유서술)는 renderFeel에서 항상 추가. */
  const CATS={
    top:   {label:'상의',  ready:true,  kind:'base', provides:'upper',
            items:['레귤러핏 셔츠','슬림핏 셔츠','오버핏 맨투맨','니트'],
            fit:['어깨','가슴','배'], flag:['팔(소매통)','목'], pref:['소매 기장','총장']},
    bottom:{label:'하의',  ready:true,  kind:'base', provides:'lower',
            // 품목=실루엣(형태축). 바지는 같은 허리여도 실루엣별 허벅지·밑단이 달라 매칭 1차 키(engine silhouette).
            items:['스키니 진','슬림 팬츠','스트레이트 팬츠','테이퍼드 팬츠','와이드 팬츠','부츠컷'],
            fit:['허리','엉덩이','허벅지'], flag:['종아리'], pref:['밑위','기장']},
    outer: {label:'아우터', ready:false, kind:'derived', needs:['upper'],
            items:['싱글 코트','블레이저','패딩','바람막이'],
            fit:['어깨','가슴·품'], flag:['팔(소매통)','목/칼라','암홀'], pref:['소매 기장','총장']},
    dress: {label:'원피스', ready:false, kind:'derived', needs:['upper','lower'],
            items:['A라인 원피스','셔츠 원피스','니트 원피스'],
            fit:['가슴','허리','엉덩이'], flag:['팔','목','상하 비율'], pref:['총장']},
    skirt: {label:'치마',  ready:false, kind:'derived', needs:['lower'],
            items:['A라인 스커트','플리츠 스커트','미니 스커트'],
            fit:['허리','엉덩이'], flag:['밑단'], pref:['기장']},
  };
  let target='top';
  /* 품목 길이 facet — 옷별(feel1/feel2). 조회키 속성이자 ②③ 조건화. ①(체형)엔 무관.
     소매(상의류): long=소매취향+팔flag / short=팔flag만 / sleeveless=둘 다 스킵.
     하의: long=종아리flag / short(반바지)=종아리flag 제거(기장 취향은 유지). */
  const SLEEVE_CATS=['top','outer','dress'], LEG_CATS=['bottom'];
  // 정확한 진단을 위해 요청하는 '긴 옷' 표현(카테고리별). 긴 옷일수록 팔·다리까지 신호가 나옴.
  const LONGWORD={top:'긴팔',outer:'긴팔',dress:'긴팔',bottom:'긴바지',skirt:'긴 기장'};
  const sleeveType={1:'long',2:'long'}, legLength={1:'long',2:'long'};
  // facet(소매/기장)은 조회키 → '옷 N · 정보' 단계에 렌더. 바꾸면 정보 하이라이트+느낌 질문을 함께 갱신.
  function setSleeve(g,v){ sleeveType[g]=v; renderFacet(g); renderFeel(g); }
  function setLeg(g,v){ legLength[g]=v; renderFacet(g); renderFeel(g); }
  function facetSeg(g,opts,cur,fn){
    return '<div class="seg compact">'+opts.map(([v,lab])=>'<div class="opt'+(v===cur?' on':'')+'" onclick="'+fn+'('+g+',\''+v+'\')">'+lab+'</div>').join('')+'</div>';
  }
  function renderFacet(g){
    // 소매/기장 선택기 제거 — 긴팔/긴바지를 전제로 요청하므로 항상 long으로 가정(옷 정보 단계에서 묻지 않음).
    const el=document.getElementById('facet'+g); if(!el) return;
    el.innerHTML=''; el.classList.add('hidden');
  }

  /* 입력 점검(분기) 단계: 여기서 '진단하기'를 누르면 그 시점 벌 수로 진단을 끝낸다. */
  const DIAGNOSE_AT={4:1, 7:2};   // step idx → 진단 시 입력된 벌 수 (선호핏 단계 추가로 +1 밀림)
  const FRAC=['대상 선택','선호핏','옷 1 · 정보','옷 1 · 느낌','입력 점검','옷 2 · 정보','옷 2 · 느낌','입력 점검'];

  function feelRow(name,opts,defIdx){
    return '<div class="feel-row"><span class="part">'+name+'</span><div class="feel-opts">'+
      opts.map((o,i)=>'<div class="opt'+(i===defIdx?' on':'')+'" onclick="pick(this)">'+o+'</div>').join('')+
      '</div></div>';
  }
  function feelGroup(title,help,rows){
    return '<div class="feel-group"><h4>'+title+(help?' <span class="ghelp">'+help+'</span>':'')+'</h4>'+rows+'</div>';
  }
  function renderFeel(g){
    const c=CATS[target], box=document.getElementById('feel'+g);
    const hasSleeve=SLEEVE_CATS.includes(target), st=sleeveType[g]||'long';
    const hasLeg=LEG_CATS.includes(target), lg=legLength[g]||'long';
    // ②③ 조건화: 반팔·민소매 → 소매 기장 제거 / 민소매 → 팔 flag 제거 / 반바지 → 종아리 flag 제거. ①은 불변.
    let flags=(c.flag||[]), prefs=(c.pref||[]);
    if(hasSleeve){
      if(st==='sleeveless') flags=flags.filter(n=>!n.includes('팔'));
      if(st!=='long')       prefs=prefs.filter(n=>!n.includes('소매'));
    }
    if(hasLeg && lg==='short') flags=flags.filter(n=>!n.includes('종아리'));
    // ① 주부위 — 쪼임→헐렁 4단계(기본 딱맞음)
    const fit =(c.fit||[]).map(n=>feelRow(n,['끼임','딱맞음','여유','큼'],1)).join('');
    // ② 병목 플래그 — 최소 2값(음성 '괜찮았어요' 기본). 이 신호가 브랜드 치수를 채움.
    const flag=flags.map(n=>feelRow(n,['꼈어요','괜찮았어요'],1)).join('');
    // ③ 기장 — 취향(선택), 역산 아님
    const pref=prefs.map(n=>feelRow(n,['짧음','딱 좋음','긺'],1)).join('');
    // 선택 항목(걸린 곳·기장·그 외)은 접어둠 — 필수인 착용감만 먼저 보여 압도감↓ (값은 접혀도 수집됨)
    var optional=
      (flag?feelGroup('혹시 걸린 곳','없으면 괜찮았어요 — 이 신호가 브랜드 치수를 채워요',flag):'')+
      (pref?feelGroup('기장','취향 · 선택',pref):'')+
      '<div class="feel-group"><h4>그 외 <span class="ghelp">선택 · 자유롭게</span></h4>'+
        '<textarea class="open-note" placeholder="예: 소매 끝이 조였어요 / 밑단이 걸렸어요"></textarea></div>';
    // 하의: 허리 밴드 토글 — 밴딩이면 허리가 신축이라 허리 역산을 건너뜀(엔진). 기본 '모름'(보수적).
    var wband=(target==='bottom')?feelGroup('허리 밴드','고무밴드 있었나요 · 허리 사이즈 판정에 사용 · 선택',
      '<div class="seg wband-seg">'+['모름','없음','있음'].map(function(l,i){
        return '<div class="opt'+(i===0?' on':'')+'" onclick="pick(this)">'+l+'</div>'; }).join('')+'</div>'):'';
    box.innerHTML=
      feelGroup('착용감 · 부위별','한 부위씩 떠오르는 느낌 하나',fit)+ wband+
      '<details class="feel-more"><summary>걸린 곳·기장 등 더 알려주기 <span class="opt">선택 · 없으면 넘겨도 돼요</span></summary>'+optional+'</details>';
  }

  function applyTarget(){
    const c=CATS[target];
    ['item1','item2'].forEach(id=>document.getElementById(id).innerHTML=c.items.map(i=>'<option>'+i+'</option>').join(''));
    renderPrefOpts();   // 선호핏 옵션(하의=실루엣 / 그 외=여유)
    document.querySelectorAll('.catword').forEach(e=>e.textContent=c.label);
    document.querySelectorAll('.longword').forEach(e=>e.textContent=LONGWORD[target]||'긴 옷');
    renderFacet(1); renderFacet(2); renderFeel(1); renderFeel(2); renderSizes(1); renderSizes(2);
    // 선호핏 단계(idx1) 안내: 실측 데이터 없는 기반은 착용경험 없이 선호핏만 받는다고 알림
    var pnote=document.getElementById('prefonlynote');
    if(pnote){
      if(isPrefOnlyBase()){ pnote.classList.remove('hidden');
        pnote.innerHTML='<strong>'+c.label+'</strong>는 아직 브랜드 사이즈 데이터를 모으는 중이라, 지금은 <strong>선호핏만</strong> 받아 키·몸무게 기반으로 추정해요. 착용경험은 데이터가 준비되면 물어봐요.'; }
      else pnote.classList.add('hidden');
    }
    const note=document.getElementById('targetnote');
    if(c.ready){ note.classList.add('hidden'); }
    else{
      note.classList.remove('hidden');
      note.innerHTML='<strong>'+c.label+'</strong> 진단은 부위 설계가 끝났고 <strong>곧 열려요</strong>. '+
        '이번 발표 버전은 <strong>상의</strong>만 실제로 풀립니다 — 아래에서 '+c.label+'은 어떤 부위를 묻는지 미리 보여드릴게요.';
    }
  }
  function pickTarget(el){
    if(el.dataset.locked==='1'){ blockedHint(el.dataset.cat); return; }   // 파생: 기반 미완성이면 잠금
    pick(el); target=el.dataset.cat; applyTarget();
  }

  const steps=[...document.querySelectorAll('.wstep')];
  let cur=0;
  // 실측 데이터 없는 기반 카테고리(구조적 예외): 선호핏(idx1) 단계에서 착용경험 없이 바로 진단.
  function isPrefOnlyBase(){ return CATS[target] && CATS[target].kind==='base' && !hasData(target); }
  function render(){
    steps.forEach((s,k)=>s.classList.toggle('active',k===cur));
    document.getElementById('wfill').style.width=((cur+1)/steps.length*100)+'%';
    const btn=document.getElementById('nextbtn');
    if(isPrefOnlyBase() && cur===1) btn.textContent='이대로 진단하기 (선호핏만)';
    else if(DIAGNOSE_AT[cur]) btn.textContent='이대로 진단하기 ('+DIAGNOSE_AT[cur]+'벌)';
    else btn.textContent = cur===0 ? '이 종류로 시작' : '다음';
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function goTo(i){ cur=i; render(); }
  function next(){ if(cur<steps.length-1){cur++;render()} }
  function prev(){ if(cur>0){cur--;render()} else location.href=PREV_URL; }
  function footerAction(){
    if(isPrefOnlyBase() && cur===1){ collectPrefOnly(); location.href='diag-loading.html?cat='+target; return; }
    if(DIAGNOSE_AT[cur]){ collectExp(); location.href='diag-loading.html?g='+DIAGNOSE_AT[cur]+'&cat='+target; }
    else next();
  }
  function pick(el){[...el.parentElement.children].forEach(c=>c.classList.remove('on'));el.classList.add('on')}

  /* 착용경험 수집 → sessionStorage(fitting.dx). 결과 화면(result.html)이 엔진 계약(diagnose)에 넘긴다.
     부위 라벨→스키마 key, 선택 라벨→값(FitRating/PainVerdict/LengthPref). 레이어는 옵션 수로 판별(4=fit·2=flag·3=pref). */
  var CATMAP={top:'TOP',bottom:'BOTTOM',outer:'OUTER',dress:'DRESS',skirt:'SKIRT'};
  /* 사이즈 옵션은 브랜드·성별·서브타입별로 다르다(유니클로 남성=4XL까지, H&M=XXS부터…).
     garments.json(A축)에서 실제 sizeLabel 집합을 뽑아 렌더 → 하드코딩 XS~XL 제거.
     드롭다운 표기 → garments의 brandId 매핑. 데이터 없는 브랜드/카테고리는 DEFAULT_SIZES. */
  var BRANDID={'유니클로':'uniqlo','무신사 스탠다드':'musinsa-standard','나이키':'nike','탑텐':'topten',
    '스파오':'spao','에잇세컨즈':'8seconds','노스페이스':'northface','H&M (편차 큼)':'hm','자라 (편차 큼)':'zara'};
  var SIZE_ORDER=['XXS','XS','S','M','L','XL','XXL','2XL','3XL','4XL','5XL'];
  var DEFAULT_SIZES=['XS','S','M','L','XL'];
  var GARMENTS=null;
  // 실측(garment cm) 데이터가 있는 카테고리 = 착용경험 역산 대상. 없으면 선호핏만 받아 진단.
  // 실제 서비스에선 전 카테고리 데이터가 들어오므로 자동으로 착용경험 플로우로 전환된다.
  var DATA_CATS={TOP:1};   // fetch 실패(file:// 등) 시 현재 데이터 반영 폴백
  function categoriesWithData(specs){ var s={}; (specs||[]).forEach(function(g){ if(g&&g.category) s[g.category]=1; }); return s; }
  function hasData(cat){ return !!DATA_CATS[CATMAP[cat]]; }
  var BASIC={}; try{ BASIC=JSON.parse(sessionStorage.getItem('fitting.basic')||'{}'); }catch(e){}
  // 조회키 서브타입: 상의류=긴/반팔, 하의=긴/반바지(데이터 없으면 무의미).
  function subtypeOf(g){
    if(SLEEVE_CATS.includes(target)) return (sleeveType[g]==='short')?'short_sleeve':'long_sleeve';
    if(LEG_CATS.includes(target))    return (legLength[g]==='short')?'shorts':'long_pants';
    return null;
  }
  // 특정 브랜드·성별·서브타입에서 실제 존재하는 사이즈 라벨(정렬) — 없으면 null.
  function garmentSizeLabels(brandId, gender, subtype){
    if(!GARMENTS || !brandId) return null;
    var set={};
    GARMENTS.forEach(function(s){
      if(s.brandId!==brandId) return;
      if(!(s.gender===gender || s.gender==='unisex')) return;
      if(subtype && s.subtype!==subtype) return;
      set[s.sizeLabel]=1;
    });
    var labels=Object.keys(set);
    if(!labels.length) return null;
    labels.sort(function(a,b){
      if(/^\d/.test(a) && /^\d/.test(b)) return parseFloat(a)-parseFloat(b);  // 숫자 사이즈(바지 26·73…) 오름차순
      var ia=SIZE_ORDER.indexOf(a), ib=SIZE_ORDER.indexOf(b);
      return (ia<0?99:ia)-(ib<0?99:ib);
    });
    return labels;
  }
  // 사이즈 세그를 브랜드·카테고리에 맞춰 렌더. TOP만 데이터 기반, 나머지는 기본값.
  function renderSizes(g){
    var el=document.getElementById('size'+g); if(!el) return;
    var bsel=document.getElementById('brand'+g);
    var brandId=bsel?BRANDID[bsel.value]:null;
    var gender=BASIC.gender||'female';
    var labels=hasData(target) ? garmentSizeLabels(brandId, gender, subtypeOf(g)) : null;  // 데이터 있는 카테고리(TOP·BOTTOM)는 실 사이즈
    if(!labels || !labels.length) labels=DEFAULT_SIZES;
    var prev=el.querySelector('.opt.on'); var prevLab=prev?prev.textContent.trim():null;
    var def = (prevLab && labels.indexOf(prevLab)>=0) ? prevLab
            : (labels.indexOf('M')>=0 ? 'M' : labels[Math.floor(labels.length/2)]);
    el.innerHTML=labels.map(function(l){ return '<div class="opt'+(l===def?' on':'')+'" onclick="pick(this)">'+l+'</div>'; }).join('');
  }
  var LABELKEY={'어깨':'shoulder','가슴':'chest','가슴·품':'chest','배':'belly','소매':'sleeve','총장':'length',
    '허리':'waist','엉덩이':'hip','허벅지':'thigh','밑위':'rise','기장':'length',
    '팔(소매통)':'arm','팔':'arm','목':'neck','목/칼라':'neck','암홀':'armhole','종아리':'calf','밑단':'hem','상하 비율':'ratio'};
  var FITV={'끼임':'TIGHT','딱맞음':'SNUG','여유':'RELAXED','큼':'BIG'};
  var FLAGV={'꼈어요':'TIGHT','괜찮았어요':'OK'};
  var PREFV={'짧음':'SHORT','딱 좋음':'GOOD','긺':'LONG'};
  var FITLINE={'스키니':'skinny','슬림':'slim','레귤러':'regular','루즈':'loose','오버':'oversize','타이트':'skinny'};
  // 선호핏(idx1) 옵션 — 카테고리 축이 다름: 상의/파생=여유(ease), 하의=실루엣(형태).
  var PREFOPTS={
    ease:[['스키니','몸에 딱 붙는'],['슬림','군더더기 없이'],['레귤러','적당한 여유'],['루즈','넉넉하게'],['오버','크게 떨어지는']],
    silhouette:[['스키니','몸에 딱'],['슬림','다리 라인 슬림'],['스트레이트','일자'],['테이퍼드','아래로 좁아지는'],['와이드','넓게'],['부츠컷','아래로 벌어지는']]
  };
  var PREF_DEFAULT={ease:'레귤러', silhouette:'스트레이트'};
  var PREF_SIL={'스키니':'skinny','슬림':'slim','스트레이트':'straight','테이퍼드':'tapered','와이드':'wide','부츠컷':'bootcut'};
  function prefAxis(cat){ return (cat||target)==='bottom'?'silhouette':'ease'; }
  function renderPrefOpts(){
    var pseg=document.getElementById('prefseg'); if(!pseg) return;
    var ax=prefAxis(), def=PREF_DEFAULT[ax];
    pseg.innerHTML=PREFOPTS[ax].map(function(o){
      return '<div class="opt'+(o[0]===def?' on':'')+'" onclick="pick(this)">'+o[0]+' — '+o[1]+'</div>'; }).join('');
  }
  // 선호핏 선택 → enum. 하의=실루엣(형태축), 그 외=fitLine(여유축). prefs[cat]에 저장.
  function fitLineFromPref(){
    var inDerived = CATS[target] && CATS[target].kind==='derived';
    var sel = inDerived ? document.querySelector('#derived-flow .seg.stack .opt.on')
                        : document.querySelector('#prefseg .opt.on');
    if(!sel) return target==='bottom'?'straight':'regular';
    var word=sel.textContent.trim().split(' ')[0];
    return target==='bottom' ? (PREF_SIL[word]||'straight') : (FITLINE[word]||'regular');
  }
  function collectFeel(boxId){
    var fits={}, flags={}, prefs={};
    document.querySelectorAll('#'+boxId+' .feel-row').forEach(function(row){
      var part=row.querySelector('.part'), sel=row.querySelector('.feel-opts .opt.on');
      if(!part||!sel) return;
      var key=LABELKEY[part.textContent.trim()], lab=sel.textContent.trim();
      var n=row.querySelectorAll('.feel-opts .opt').length;
      if(!key) return;
      if(n===4 && FITV[lab]) fits[key]=FITV[lab];
      else if(n===2 && FLAGV[lab]) flags[key]=FLAGV[lab];
      else if(n===3 && PREFV[lab]) prefs[key]=PREFV[lab];
    });
    var note=document.querySelector('#'+boxId+' .open-note');
    return { fits:fits, painFlags:flags, lengthPrefs:prefs, openNote:note?note.value:'' };
  }
  // 입은 옷의 핏라인(garments 조회키) — '핏/품목' 선택 라벨에서 파싱. 선호핏과 별개.
  function garmentFitLine(itemTxt){
    itemTxt=itemTxt||'';
    var keys=Object.keys(FITLINE);
    for(var i=0;i<keys.length;i++){ if(itemTxt.indexOf(keys[i])>=0) return FITLINE[keys[i]]; }
    return 'regular';
  }
  // 하의 실루엣(형태축) — 품목 라벨에서 파싱. build-sizespec.py silhouette_of와 동일 규칙(1차 매칭키).
  var SILH=[['부츠컷','bootcut'],['스키니','skinny'],['세미와이드','wide'],['리얼와이드','wide'],
    ['와이드','wide'],['벌룬','wide'],['배기','wide'],['테이퍼','tapered'],['스트레이트','straight'],
    ['커브드','slim'],['슬림','slim']];
  function garmentSilhouette(itemTxt){
    itemTxt=itemTxt||'';
    for(var i=0;i<SILH.length;i++){ if(itemTxt.indexOf(SILH[i][0])>=0) return SILH[i][1]; }
    return null;
  }
  function collectExp(){
    var basic={}; try{ basic=JSON.parse(sessionStorage.getItem('fitting.basic')||'{}'); }catch(e){}
    var cat=CATMAP[target]||'TOP', prefLine=fitLineFromPref();
    var exps=[], n=DIAGNOSE_AT[cur]||1;
    [1,2].slice(0,n).forEach(function(g){
      var f=collectFeel('feel'+g);
      var bsel=document.getElementById('brand'+g), brandTxt=bsel?bsel.value:'';
      var isel=document.getElementById('item'+g), itemTxt=isel?isel.value:'';
      var szEl=document.querySelector('#size'+g+' .opt.on');
      // 하의 허리 밴드 응답 → waistband(엔진이 허리 역산 스킵 판정에 사용). 없으면 undefined('모름').
      var wbEl=document.querySelector('#feel'+g+' .wband-seg .opt.on'), wbLab=wbEl?wbEl.textContent.trim():'';
      var waistband=wbLab==='없음'?'none':(wbLab==='있음'?'banded':undefined);
      // fitLine = 입은 옷의 핏(역산 조회용). 선호핏(prefLine)은 prefs로 따로 저장.
      exps.push({ category:cat, brandId:BRANDID[brandTxt]||'unknown', brandName:brandTxt,
        fitLine:garmentFitLine(itemTxt), item:itemTxt, sizeLabel:szEl?szEl.textContent.trim():'M',
        subtype:subtypeOf(g), gender:BASIC.gender||'female', waistband:waistband,
        // 하의는 실루엣(형태축)이 엔진 1차 매칭키. 상의는 undefined(fitLine 사용).
        silhouette:cat==='BOTTOM'?garmentSilhouette(itemTxt):undefined,
        fits:f.fits, painFlags:f.painFlags, lengthPrefs:f.lengthPrefs, openNote:f.openNote });
    });
    // 기존 진단 결과에 병합 — 다른 카테고리(상↔하)는 보존하고, 같은 카테고리는 교체
    var prev={}; try{ prev=JSON.parse(sessionStorage.getItem('fitting.dx')||'{}'); }catch(e){}
    var prefs=(prev.prefs&&typeof prev.prefs==='object')?prev.prefs:{}; prefs[cat]=prefLine;
    var keep=(prev.experiences||[]).filter(function(e){ return e.category!==cat; });
    try{ sessionStorage.setItem('fitting.dx', JSON.stringify({ basic:basic, prefs:prefs, experiences:keep.concat(exps) })); }catch(e){}
  }
  // 선호핏만 진단(실측 데이터 없는 기반): 착용경험은 넣지 않고 선호핏만 병합. 체형은 결과화면이 회귀로 추정.
  function collectPrefOnly(){
    var basic={}; try{ basic=JSON.parse(sessionStorage.getItem('fitting.basic')||'{}'); }catch(e){}
    var cat=CATMAP[target]||'TOP', fitLine=fitLineFromPref();
    var prev={}; try{ prev=JSON.parse(sessionStorage.getItem('fitting.dx')||'{}'); }catch(e){}
    var prefs=(prev.prefs&&typeof prev.prefs==='object')?prev.prefs:{}; prefs[cat]=fitLine;
    try{ sessionStorage.setItem('fitting.dx', JSON.stringify({ basic:basic, prefs:prefs, experiences:prev.experiences||[] })); }catch(e){}
  }

  /* 결과 화면의 "이어서 진단"으로 들어온 경우:
     ?cat= 으로 대상 카테고리를 미리 선택, ?reuse=1 이면 기본 정보(03)를 재사용했음을 알린다.
     체형 프로필(B)은 신체 단위라 카테고리 간 재사용 → 두 번째부터 옷만 새로 넣으면 된다(리텐션). */
  /* 신체 영역: 기반(상의=upper, 하의=lower)이 파생 카테고리의 필요 부위를 채운다. */
  const REGION={upper:{label:'상체',cat:'top',catLabel:'상의'}, lower:{label:'하체',cat:'bottom',catLabel:'하의'}};
  function providedRegions(list){ const s=new Set(); list.forEach(c=>{const p=CATS[c]&&CATS[c].provides; if(p)s.add(p);}); return s; }
  /* 첫 화면 게이팅: 파생(아우터=상체 / 원피스=상+하체 / 치마=하체)은 필요한 기반이 진단돼야 열린다.
     진단된 기반은 ?have= 로 들어온다(결과화면의 '이어서 진단'). 첫 진단이면 상/하의만 선택 가능. */
  function diagnosedRegions(){ return providedRegions((new URLSearchParams(location.search).get('have')||'').split(',').filter(Boolean)); }
  function missingFor(cat){ const done=diagnosedRegions(); return (CATS[cat].needs||[]).filter(r=>!done.has(r)); }
  function gateTargets(){
    document.querySelectorAll('#target .opt').forEach(el=>{
      const c=CATS[el.dataset.cat], miss=missingFor(el.dataset.cat);
      if(c.kind==='derived' && miss.length){
        el.classList.add('locked'); el.dataset.locked='1';
        el.innerHTML=c.label+'<span class="lockhint">🔒 '+miss.map(r=>REGION[r].catLabel).join('·')+' 먼저</span>';
      } else { el.classList.remove('locked'); el.dataset.locked=''; el.textContent=c.label; }
    });
  }
  function blockedHint(cat){
    const miss=missingFor(cat), c=CATS[cat], note=document.getElementById('targetnote');
    note.classList.remove('hidden');
    note.innerHTML='<strong>'+c.label+'</strong>는 '+miss.map(r=>REGION[r].label).join('·')+' 치수가 필요해요 — <strong>'+
      miss.map(r=>REGION[r].catLabel).join('·')+'</strong>를 먼저 진단하면 열려요.';
  }
  // 기반 위저드만 숨김 — 파생 패널(#derived-flow/#blocked) 내부의 .wnav는 건드리지 않도록 직계 자식만 선택
  function hideBaseWizard(){ document.querySelectorAll('.dhead .dprog, .flow > .wstep, .flow > .wnav, #wnote').forEach(e=>e.classList.add('hidden')); }
  function enterDerivedFlow(){
    document.getElementById('derived-flow').classList.remove('hidden');
    var go=document.getElementById('derived-go');
    go.href='diag-loading.html?derived=1&cat='+target;
    // 파생: 실측 없이 선호핏만 — 기존 체형(이전 진단)의 dx가 있으면 재사용, 없으면 기본 페이로드 stash
    go.addEventListener('click',function(){
      var basic={}; try{ basic=JSON.parse(sessionStorage.getItem('fitting.basic')||'{}'); }catch(e){}
      // 파생: 선호핏만 — 기존 dx(상·하의 등)에 병합해 카테고리 선호핏 추가
      var prev={}; try{ prev=JSON.parse(sessionStorage.getItem('fitting.dx')||'{}'); }catch(e){}
      var cat=CATMAP[target]||'OUTER';
      var prefs=(prev.prefs&&typeof prev.prefs==='object')?prev.prefs:{}; prefs[cat]=fitLineFromPref();
      try{ sessionStorage.setItem('fitting.dx', JSON.stringify({ basic:basic, prefs:prefs, experiences:prev.experiences||[] })); }catch(e){}
    });
  }
  function enterDerivedBlocked(missing){
    const r=REGION[missing[0]];
    document.getElementById('blocked-need').textContent=r.catLabel;
    document.getElementById('blocked-region').textContent=r.label;
    document.getElementById('blocked-basecat').textContent=r.catLabel;
    document.getElementById('blocked-todo').textContent=r.catLabel+' 진단';
    const go=document.getElementById('blocked-go');
    go.href='diag-fit.html?cat='+r.cat+'&reuse=1&have=top';
    go.textContent=r.catLabel+' 먼저 진단';
    document.getElementById('derived-blocked').classList.remove('hidden');
  }

  function initFromQuery(){
    const q=new URLSearchParams(location.search);
    let qcat=q.get('cat');
    // 남성이 여성 전용 카테고리로 직접 진입(?cat=dress/skirt)하면 무시(기본 상의로)
    if((BASIC.gender||'')==='male' && FEMALE_ONLY.indexOf(qcat)>=0) qcat=null;
    if(qcat && CATS[qcat]){
      target=qcat;
      document.querySelectorAll('#target .opt').forEach(o=>o.classList.toggle('on',o.dataset.cat===qcat));
    }
    const c=CATS[target];
    // 파생 카테고리: 체형 재사용 → 선호핏만 (기반 미완성이면 안내로 분기)
    if(c && c.kind==='derived'){
      const have=(q.get('have')||'').split(',').filter(Boolean);
      const reg=providedRegions(have);
      const missing=(c.needs||[]).filter(x=>!reg.has(x));
      hideBaseWizard();
      if(missing.length===0) enterDerivedFlow(); else enterDerivedBlocked(missing);
      return 'derived';
    }
    if(q.get('reuse')==='1'){
      const b=document.getElementById('reusebanner');
      b.classList.remove('hidden');
      b.innerHTML='<strong>이어서 진단</strong> · 이전 진단의 기본 정보(성별·키·몸무게)와 체형 프로필을 그대로 써요. <strong>'+c.label+'</strong>의 선호핏과 옷만 새로 정해주면 돼요.';
    }
    return 'base';
  }

  // 남성이면 여성 전용 카테고리(치마·원피스)를 선택기에서 숨김(결과 옷장 게이트와 동일 규칙)
  var FEMALE_ONLY=['dress','skirt'];
  function applyGenderFilter(){
    if((BASIC.gender||'')!=='male') return;
    FEMALE_ONLY.forEach(function(c){
      var el=document.querySelector('#target .opt[data-cat="'+c+'"]');
      if(el) el.style.display='none';
    });
  }
  function boot(){
    applyGenderFilter();
    const routed=initFromQuery();
    applyTarget();
    if(routed==='base'){ gateTargets(); render(); }
  }
  // A축 사이즈 시드 로드 → 데이터 보유 카테고리(DATA_CATS) 판별 + 브랜드별 사이즈 라벨.
  // 로드 후 플로우 시작(실패=file:// 등 → 현재 데이터 반영 폴백으로 boot).
  fetch('data/garments.json').then(function(r){return r.json();})
    .then(function(j){ GARMENTS=j.specs; DATA_CATS=categoriesWithData(j.specs); })
    .catch(function(){})
    .then(boot);
