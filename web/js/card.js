  var q=new URLSearchParams(location.search);
  var cur=(q.get('type')||'STR').toUpperCase();
  var gender=(q.get('g')||'female'); if(gender!=='male'&&gender!=='female') gender='female';
  var wmStyle=document.createElement('style'); document.head.appendChild(wmStyle);

  function figHTML(d){
    var head='<div class="head '+gender+'">'+(gender==='female'?'<span class="longhair"></span>':'')+
      '<span class="face"></span><span class="cap"></span><span class="ey l"></span><span class="ey r"></span></div>';
    return '<div class="fig">'+head+'<div class="body '+d.silhouette+'" style="background-color:'+d.point+'; height:150px"></div></div>';
  }
  function pills(a){ return '<div class="ps">'+a.map(function(x){return '<span>'+x+'</span>';}).join('')+'</div>'; }

  function render(d){
    var card=document.getElementById('card');
    var p1=d.profile[0]||'', p2=d.profile[1]||'';
    card.style.background='radial-gradient(ellipse 70% 34% at 50% 11%, '+d.point+'2b, transparent 60%), linear-gradient(160deg,#191a1f,#0f1014)';
    wmStyle.textContent='.card::after{content:"'+d.code+'";}';
    card.innerHTML=
      '<div class="ctop"><span class="clogo">fitting</span><span class="cacts"><button title="결과 저장">🔖</button><button title="카드 공유">🔗</button></span></div>'+
      figHTML(d)+
      '<div class="code" style="color:'+d.point+'">'+d.code+'</div>'+
      '<div class="word">'+d.name+'</div>'+
      '<div class="info">'+
        '<div class="sl" style="color:'+d.point+'">MY FIT</div><div class="desc two">'+p1+(p2?'<br>'+p2:'')+'</div>'+
        '<div class="sl sec2" style="color:'+d.point+'">FIT INSIGHT</div><div class="desc ins">'+d.insight+'</div>'+
        '<div class="fits sec2"><div class="fr ok"><span class="fl" style="color:'+d.point+'">잘맞 FIT</span>'+pills(d.fitOk)+'</div>'+
        '<div class="fr no"><span class="fl no">피할 FIT</span>'+pills(d.fitNo)+'</div></div>'+
      '</div>'+
      '<div class="grow"></div>'+
      '<div class="match">🩷 환상의 궁합 · <b style="color:'+d.point+'">'+d.match+'</b></div>';
  }

  // 8유형 데이터 = data/bodytypes.json 단일 출처 (하드코딩 제거)
  fetch('data/bodytypes.json')
    .then(function(r){ return r.json(); })
    .then(function(j){
      var map={}; j.types.forEach(function(t){ map[t.code]=t; });
      if(!map[cur]) cur='STR';
      render(map[cur]);
    })
    .catch(function(e){
      document.getElementById('card').innerHTML=
        '<div style="padding:40px;font:14px Pretendard">데이터를 불러오지 못했어요.<br><br>'+
        '로컬 서버로 열어주세요:<br><code>python3 -m http.server</code> 후 <code>localhost:8000/card.html?type=STR</code></div>';
    });
