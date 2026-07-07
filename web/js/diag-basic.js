  const NEXT_URL='diag-fit.html', PREV_URL='index.html';
  const steps=[...document.querySelectorAll('.wstep')];
  let cur=0;
  function render(){
    steps.forEach((s,k)=>s.classList.toggle('active',k===cur));
    document.getElementById('wfill').style.width=((cur+1)/steps.length*100)+'%';
    document.getElementById('nextbtn').textContent = cur===steps.length-1 ? '옷 종류 고르기' : '다음';
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function saveBasic(){
    // 진단 스냅샷 기본값 — 다음 화면(착용경험)·결과에서 재사용
    var basic={ gender: sex==='남성'?'male':'female',
      age: document.getElementById('age').value,
      height: document.getElementById('height').value,
      weight: document.getElementById('weight').value };
    try{ sessionStorage.setItem('fitting.basic', JSON.stringify(basic)); }catch(e){}
  }
  function next(){ if(cur<steps.length-1){cur++;render()} else { saveBasic(); location.href=NEXT_URL; } }
  function prev(){ if(cur>0){cur--;render()} else location.href=PREV_URL; }
  function pick(el){[...el.parentElement.children].forEach(c=>c.classList.remove('on'));el.classList.add('on')}
  function pickNext(el){pick(el);setTimeout(next,220)}   // 단일 선택 → 자동 진행

  let sex='남성';
  const AGE=['10대','20대','30대','40대','50대','60대 이상'];
  function fill(id,list,def){ document.getElementById(id).innerHTML=list.map(v=>'<option'+(v===def?' selected':'')+'>'+v+'</option>').join(''); }
  function scaleOpen(a,b,u){ const r=[a+u+' 이하']; for(let i=a+1;i<b;i++) r.push(i+u); r.push(b+u+' 이상'); return r; }
  function applyDefaults(){
    const m = sex==='남성';
    fill('age', AGE, '20대');
    fill('height', scaleOpen(140,200,'cm'), m?'173cm':'160cm');
    fill('weight', scaleOpen(35,150,'kg'), m?'72kg':'55kg');
  }
  function pickSex(el){ sex=el.textContent.trim(); applyDefaults(); pickNext(el); }

  applyDefaults();
  render();
