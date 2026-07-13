  const NEXT_URL='diag-fit.html', PREV_URL='index.html';
  const steps=[...document.querySelectorAll('.wstep')];
  let cur=0;
  function render(){
    steps.forEach((s,k)=>s.classList.toggle('active',k===cur));
    var wf=document.getElementById('wfill'); if(wf) wf.style.width=((cur+1)/steps.length*100)+'%';
    document.querySelectorAll('#qconn span').forEach(function(el,k){ el.classList.toggle('on', k<=cur); });  // 질문 진행(연결선)
    document.getElementById('nextbtn').textContent = cur===steps.length-1 ? '옷 종류 고르기' : '다음';
    updateNext();
    window.scrollTo(0,0);
  }
  // 선택 완료 여부 — 첫 진입엔 미선택이라 '다음'을 비활성으로 둔다.
  function selDone(){
    if(cur===0) return !!document.querySelector('.wstep.active .seg .opt.on');   // 성별 고름
    if(cur===1) return ['age','height','weight'].every(id=>document.getElementById(id).value);  // 3개 다 채움
    return true;
  }
  function updateNext(){ document.getElementById('nextbtn').disabled = !selDone(); }
  function saveBasic(){
    // 진단 스냅샷 기본값 — 다음 화면(착용경험)·결과에서 재사용
    var basic={ gender: sex==='남성'?'male':'female',
      age: document.getElementById('age').value,
      height: document.getElementById('height').value,
      weight: document.getElementById('weight').value };
    try{ sessionStorage.setItem('fitting.basic', JSON.stringify(basic)); }catch(e){}
  }
  function next(){ if(!selDone()) return; if(cur<steps.length-1){cur++;render()} else { saveBasic(); location.href=NEXT_URL; } }
  function prev(){ if(cur>0){cur--;render()} else location.href=PREV_URL; }
  function pick(el){[...el.parentElement.children].forEach(c=>c.classList.remove('on'));el.classList.add('on');updateNext();}
  function pickNext(el){pick(el);setTimeout(next,220)}   // 단일 선택 → 자동 진행

  let sex='';
  const AGE=['10대','20대','30대','40대','50대','60대 이상'];
  // 첫 항목 = '선택' 플레이스홀더(value 빈값) → 고르기 전엔 selDone=false
  function fill(id,list){ document.getElementById(id).innerHTML='<option value="" selected disabled>선택</option>'+list.map(v=>'<option>'+v+'</option>').join(''); }
  function scaleOpen(a,b,u){ const r=[a+u+' 이하']; for(let i=a+1;i<b;i++) r.push(i+u); r.push(b+u+' 이상'); return r; }
  function buildFields(){
    fill('age', AGE);
    fill('height', scaleOpen(140,200,'cm'));
    fill('weight', scaleOpen(35,150,'kg'));
    ['age','height','weight'].forEach(id=>document.getElementById(id).onchange=updateNext);
  }
  function pickSex(el){ sex=el.textContent.trim(); pick(el); }   // 선택만 — 진행은 '다음' 버튼으로

  buildFields();
  render();
