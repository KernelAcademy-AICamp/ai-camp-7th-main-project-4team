  const params=new URLSearchParams(location.search);
  const SKIP=params.get('skip')==='1';
  const G=params.get('g');
  const DERIVED=params.get('derived')==='1';
  const CAT=params.get('cat');
  let RESULT='result.html';
  if(SKIP) RESULT='result.html?conf=low';
  else if(G==='1') RESULT='result.html?conf=mid';
  if(CAT) RESULT += (RESULT.indexOf('?')>=0?'&':'?')+'cat='+encodeURIComponent(CAT);
  if(SKIP){
    document.getElementById('ltitle').textContent='기본 추정을 만들고 있어요';
    document.getElementById('lsub').textContent='입어본 옷 없이 키·몸무게로만 분석해요. 정확도는 조금 낮을 수 있어요';
    const first=document.querySelector('#steps li[data-i="0"]');
    if(first)first.textContent='키·몸무게로 추정';
  } else if(DERIVED){
    document.getElementById('ltitle').textContent='이미 아는 체형으로 맞춰요';
    document.getElementById('lsub').textContent='몸을 다시 재지 않아요 — 저장된 체형에 선호핏만 반영해 사이즈를 맞춰요';
    const first=document.querySelector('#steps li[data-i="0"]');
    if(first)first.textContent='저장된 체형 재사용';
  } else if(G==='1'){
    document.getElementById('lsub').textContent='입어본 옷을 바탕으로 체형과 선호핏을 분석하고 있어요';
    const first=document.querySelector('#steps li[data-i="0"]');
    if(first)first.textContent='착용감 분석';
  }
  const lis=[...document.querySelectorAll('#steps li')];
  let i=0;
  function tick(){
    if(i>0)lis[i-1].classList.replace('active','done');
    if(i<lis.length){lis[i].classList.add('active');i++;setTimeout(tick,750)}
    else{lis[lis.length-1].classList.replace('active','done');setTimeout(()=>location.href=RESULT,500)}
  }
  setTimeout(tick,400);
