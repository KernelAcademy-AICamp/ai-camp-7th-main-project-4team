  const params=new URLSearchParams(location.search);
  const SKIP=params.get('skip')==='1';
  const G=params.get('g');
  const DERIVED=params.get('derived')==='1';
  const CAT=params.get('cat');
  let RESULT='result.html';
  if(SKIP) RESULT='result.html?conf=low';
  else if(G==='1') RESULT='result.html?conf=mid';
  if(CAT) RESULT += (RESULT.indexOf('?')>=0?'&':'?')+'cat='+encodeURIComponent(CAT);

  // 이름 — 저장돼 있으면 "OO님의 …", 없으면(로그인 전 진단) 이름 없이.
  var NAME='';
  try{ NAME=(JSON.parse(sessionStorage.getItem('fitting.basic')||'{}').name)||''; }catch(e){}
  var titleEl=document.getElementById('ltitle');
  if(titleEl) titleEl.textContent = NAME ? (NAME+'님의 체형을 진단하고 있어요') : '체형을 진단하고 있어요';

  // 케이스별 설명 + 단계 (기본진단=skip · 옷 기반=g · 파생=derived)
  var subEl=document.getElementById('lsub');
  var desc, STEPS;
  if(SKIP){
    desc='키와 몸무게를 바탕으로 분석하고 있어요';
    STEPS=['기본 정보 분석','체형 분석','추천 결과 생성'];
  } else if(DERIVED){
    desc='저장된 체형에 선호핏을 반영하고 있어요';
    STEPS=['저장된 체형 재사용','선호핏 반영','추천 결과 생성'];
  } else if(G){
    desc='입어본 옷을 바탕으로 체형과 선호핏을 분석하고 있어요';
    STEPS=['착용감 분석','체형 분석','브랜드별 사이즈 비교','추천 결과 생성'];
  } else {
    desc='키와 몸무게를 바탕으로 분석하고 있어요';
    STEPS=['기본 정보 분석','체형 분석','추천 결과 생성'];
  }
  if(subEl) subEl.textContent=desc;
  var stepsUl=document.getElementById('steps');
  if(stepsUl) stepsUl.innerHTML=STEPS.map(function(t){ return '<li><span class="tick"></span>'+t+'</li>'; }).join('');

  // 줄자 로딩 — 마커가 0→100% 지나가며(측정) 단계를 순차 체크, 끝나면 결과로.
  var marker=document.getElementById('lmarker'), fill=document.getElementById('lfill'), pctEl=document.getElementById('lpct');
  var lis=[].slice.call(document.querySelectorAll('#steps li'));
  var DUR=3200, t0=null, gone=false;
  function raf(ts){
    if(t0===null) t0=ts;
    var p=Math.min(100,(ts-t0)/DUR*100);
    if(marker) marker.style.left=p+'%';
    if(fill) fill.style.width=p+'%';
    if(pctEl) pctEl.textContent=Math.round(p)+'%';
    var idx=Math.min(lis.length, Math.floor(p/100*lis.length));
    lis.forEach(function(l,k){ l.classList.toggle('done',k<idx); l.classList.toggle('active',k===idx && idx<lis.length); });
    if(p<100){ requestAnimationFrame(raf); }
    else if(!gone){ gone=true; lis.forEach(function(l){ l.classList.remove('active'); l.classList.add('done'); });
      setTimeout(function(){ location.href=RESULT; },450); }
  }
  requestAnimationFrame(raf);
