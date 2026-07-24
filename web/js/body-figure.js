/* body-figure.js — 체형 실루엣 아바타(공용).
   소유: 개발자(web/js/**). pro-quote(스타일리스트)와 result(고객 결과) 두 화면이 같은 그림을 쓰도록
   pro-quote.js에서 분리했다. 한 곳에서만 고치면 두 화면이 함께 바뀐다(복사본 금지).

   사용법:  BodyFigure.svg(m, bt, gender, est, conf)  →  SVG 문자열
     m      = {top:{shoulder,chestFull}, bottom:{waist,hip}}  부위 백분위(0~100)
     bt     = {code:"BAL", ...}  체형 유형(라인·태그 색)
     gender = "female" | "male"
     est    = [{label:"어깨", val:39, pm:1}, ...]  예상 치수(없으면 수치 라벨 생략)
     conf   = 신뢰도(있으면 톤 조정에 사용) */
(function (global) {
  "use strict";
  function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

  function segIdx(pct){ return Math.max(0, Math.min(4, Math.floor((pct==null?50:pct)/20))); }
  function zoneLabel(i, L, R){ return i===0?L:(i===1?L+' 편':(i===2?'표준':(i===3?R+' 편':R))); }
  /* 8유형 시그니처 색(라이트 배경용 보정 톤) — 아바타 라인 색에 사용 */
  var TYPE_COLOR={STR:'#7E9BE8',TRI:'#3FB9A6',INV:'#8A93A8',HRG:'#B675E8',
    BAL:'#5FBE7E',DIA:'#EA6EA0',RND:'#F0855A',TUB:'#9184E0'};
  /* hex 선형 보간 — a에서 to로 t만큼. color-mix 미지원 대비 JS 계산 */
  function mixHex(hex,to,t){
    function p(h){ h=h.replace('#',''); return [parseInt(h.substr(0,2),16),parseInt(h.substr(2,2),16),parseInt(h.substr(4,2),16)]; }
    var a=p(hex), b=p(to), o=a.map(function(v,i){ return Math.round(v+(b[i]-v)*t); });
    return '#'+o.map(function(x){ return ('0'+Math.max(0,Math.min(255,x)).toString(16)).slice(-2); }).join('');
  }
  /* 태그 톤 — 항상 옅은 유형색 배경 + 딥톤 유형색 글자/점/외곽선.
     seg 0(가장 슬림)…4(가장 볼륨)로 갈수록 배경·글자 함께 진해지되, 대비 유지(글씨 항상 읽힘) */
  var TAG_BGT=[0.88,0.80,0.72,0.64,0.56];   // 배경: 흰색 혼합비(작을수록 진함)
  var TAG_FGT=[0.34,0.44,0.54,0.64,0.72];   // 글자·점·선: 다크 혼합비(클수록 진함)
  function tagTone(tc, seg){
    return { bg:mixHex(tc,'#FFFFFF',TAG_BGT[seg]), fg:mixHex(tc,'#2A2823',TAG_FGT[seg]) };
  }
  /* 부위 백분위(측정 기반)로 폭이 반응하는 파라메트릭 실루엣 아바타.
     좌: 슬림/표준/볼륨 태그(zoneLabel) · 우: 부위명 + 예상 cm(est) · 아래: 핏취향 칩.
     Catmull-Rom으로 몸통·다리 외곽선을 만들고, 팔은 스트로크. 세로 비율은 표준 템플릿 고정. cx=180 가운데정렬. */
  function bodySilhouette(m, bt, gender, est, conf){
    var tc=TYPE_COLOR[(bt&&bt.code)||''] || '#57544C';   // 이 카드 유형색(태그 농도·라인 공용)
    var cx=180, headCY=48, headRx=27, headRy=31, neckHalf=12;
    var neckY=88, shoulderY=110, chestY=172, waistY=240, hipY=300, crotchY=330, kneeY=422, ankleY=498;
    /* 백분위 50=표준 반폭, 0~100 → ±28%. shoulder=너비 / 나머지=둘레지만 시각 폭으로 통일 근사 */
    var BASE={shoulder:42, chest:34, waist:27, hip:33};
    function hw(part,p){ p=(p==null?50:p); return BASE[part]*(0.72+p/100*0.56); }
    var sh=hw('shoulder',m.top.shoulder), ch=hw('chest',m.top.chestFull),
        wa=hw('waist',m.bottom.waist), hi=hw('hip',m.bottom.hip);
    function cr(pts){ var n=pts.length, P=function(i){return pts[(i%n+n)%n];};
      var d='M '+pts[0][0].toFixed(1)+' '+pts[0][1].toFixed(1);
      for(var i=0;i<n;i++){ var a=P(i-1),b=P(i),c=P(i+1),e=P(i+2);
        d+=' C '+(b[0]+(c[0]-a[0])/6).toFixed(1)+' '+(b[1]+(c[1]-a[1])/6).toFixed(1)+', '
          +(c[0]-(e[0]-b[0])/6).toFixed(1)+' '+(c[1]-(e[1]-b[1])/6).toFixed(1)+', '
          +c[0].toFixed(1)+' '+c[1].toFixed(1); } return d+' Z'; }
    function arm(s){ return 'M '+(cx+s*(sh-7)).toFixed(1)+' '+(shoulderY+6)
      +' C '+(cx+s*(sh+13)).toFixed(1)+' '+(chestY-14)+', '+(cx+s*(sh+11)).toFixed(1)+' '+(chestY+34)
      +', '+(cx+s*(sh-2)).toFixed(1)+' '+(hipY-6); }
    var body=[[cx+neckHalf,neckY],[cx+sh,shoulderY],[cx+ch,chestY],[cx+wa,waistY],[cx+hi,hipY],
      [cx+hi*0.9,crotchY+16],[cx+22,kneeY],[cx+18,ankleY],[cx+8,ankleY],[cx+9,kneeY],[cx+3,crotchY+24],
      [cx,crotchY+6],[cx-3,crotchY+24],[cx-9,kneeY],[cx-8,ankleY],[cx-18,ankleY],[cx-22,kneeY],
      [cx-hi*0.9,crotchY+16],[cx-hi,hipY],[cx-wa,waistY],[cx-ch,chestY],[cx-sh,shoulderY],[cx-neckHalf,neckY]];
    var LV=[
      {name:'어깨',   key:'어깨너비',  pct:m.top.shoulder,   lo:'좁은',hi:'넓은',half:sh,y:shoulderY},
      {name:'가슴',   key:'가슴둘레',  pct:m.top.chestFull,  lo:'슬림',hi:'볼륨',half:ch,y:chestY},
      {name:'허리',   key:'허리둘레',  pct:m.bottom.waist,   lo:'슬림',hi:'볼륨',half:wa,y:waistY},
      {name:'엉덩이', key:'엉덩이둘레', pct:m.bottom.hip,     lo:'슬림',hi:'볼륨',half:hi,y:hipY}];
    var estMap={}; (est||[]).forEach(function(e){ estMap[e.label]={val:e.val, pm:e.pm}; });
    var vx=260, guides='';   // 우측 예상치수 라벨 x — 넓은 어깨/팔(최대 ~247)과 안 겹치게 오른쪽으로
    LV.forEach(function(x){ var i=segIdx(x.pct), tag=zoneLabel(i,x.lo,x.hi), tn=tagTone(tc,i), bg=tn.bg, fg=tn.fg;
      var half=x.half, y=x.y, re=cx+half, le=cx-half, e=estMap[x.key];
      // 우: 부위명(+ 예상 cm을 바로 옆에). cm 있으면 이름은 위·수치 아래로.
      guides+='<circle cx="'+re.toFixed(1)+'" cy="'+y+'" r="2.6" fill="var(--fig-line)"/>'
        +'<line x1="'+(re+4).toFixed(1)+'" y1="'+y+'" x2="'+(vx-6)+'" y2="'+y+'" stroke="var(--guide)" stroke-width="1.2" stroke-dasharray="2 3"/>'
        +'<text class="g-name" x="'+vx+'" y="'+(e?(y-5):(y+4))+'">'+esc(x.name)+'</text>';
      if(e) guides+='<text class="g-val" x="'+vx+'" y="'+(y+13)+'">약 '+e.val+'<tspan class="g-unit" dx="1">cm</tspan> <tspan class="g-pm">±'+e.pm+'</tspan></text>';
      // 좌: 슬림/표준/볼륨 태그 — 옅은 유형색 배경 + 딥톤 글자/점/외곽선(농도로 강약)
      var tw=tag.length*13+30, pe=le-9, ps=pe-tw;
      guides+='<circle cx="'+le.toFixed(1)+'" cy="'+y+'" r="2.6" fill="var(--fig-line)"/>'
        +'<line x1="'+(le-4).toFixed(1)+'" y1="'+y+'" x2="'+(pe+1).toFixed(1)+'" y2="'+y+'" stroke="var(--guide)" stroke-width="1.2"/>'
        +'<rect x="'+ps.toFixed(1)+'" y="'+(y-12)+'" width="'+tw.toFixed(1)+'" height="24" rx="12" fill="'+bg+'" stroke="'+fg+'" stroke-opacity=".45"/>'
        +'<circle cx="'+(ps+13).toFixed(1)+'" cy="'+y+'" r="3.2" fill="'+fg+'"/>'
        +'<text class="g-tag" x="'+(ps+24).toFixed(1)+'" y="'+(y+4)+'" fill="'+fg+'">'+esc(tag)+'</text>'; });
    var svg='<svg viewBox="0 0 392 520" role="img" aria-label="고객 체형 실루엣">'
      +'<ellipse cx="'+cx+'" cy="514" rx="52" ry="9" fill="var(--fig-line)" opacity=".10"/>'
      +'<path d="'+arm(1)+'" fill="none" stroke="var(--fig-line)" stroke-width="13.5" stroke-linecap="round" opacity=".92"/>'
      +'<path d="'+arm(-1)+'" fill="none" stroke="var(--fig-line)" stroke-width="13.5" stroke-linecap="round" opacity=".92"/>'
      +'<path d="'+arm(1)+'" fill="none" stroke="var(--fig-fill)" stroke-width="9.5" stroke-linecap="round"/>'
      +'<path d="'+arm(-1)+'" fill="none" stroke="var(--fig-fill)" stroke-width="9.5" stroke-linecap="round"/>'
      +'<rect x="'+(cx-neckHalf)+'" y="70" width="'+(neckHalf*2)+'" height="34" rx="9" fill="var(--fig-fill)" stroke="var(--fig-line)" stroke-width="2"/>'
      +'<path d="'+cr(body)+'" fill="var(--fig-fill)" stroke="var(--fig-line)" stroke-width="2" stroke-linejoin="round"/>'
      +'<ellipse cx="'+cx+'" cy="'+headCY+'" rx="'+headRx+'" ry="'+headRy+'" fill="var(--fig-fill)" stroke="var(--fig-line)" stroke-width="2"/>'
      +'<line x1="'+cx+'" y1="'+(shoulderY+6)+'" x2="'+cx+'" y2="'+(hipY-6)+'" stroke="var(--fig-line)" stroke-width="1" stroke-dasharray="1 5" opacity=".28"/>'
      +guides+'</svg>';
    // 취향은 상·하의가 다를 수 있어 따로 표시(상의=타이트↔여유, 하의=슬림↔와이드).
    var prefTop=zoneLabel(segIdx(m.prefTop),'타이트','여유');
    var prefBot=zoneLabel(segIdx(m.prefBottom),'슬림','와이드');
    var note=(est&&est.length)
      ? '예상 치수 · 신뢰도 '+esc(conf||'—')+' · 폭=측정 반영, 세로=표준 비율'
      : '폭 = 측정 백분위 반영 · 세로 = 표준 비율';
    /* 라인만 스타일 — 유형색을 라인(80%+다크)으로, 채움은 아주 옅은 틴트(12%) */
    var figLine=mixHex(tc,'#2A2823',0.20), figFill=mixHex(tc,'#FFFFFF',0.88);
    return '<div class="bodymap2" style="--fig-fill:'+figFill+';--fig-line:'+figLine+'">'+svg
      +'<div class="av-prefs">'
        +'<div class="av-pref"><span>상의 핏</span><b>'+esc(prefTop)+'</b></div>'
        +'<div class="av-pref"><span>하의 핏</span><b>'+esc(prefBot)+'</b></div></div>'
      +'<div class="av-cap">'+note+'</div></div>';
  }
  global.BodyFigure = { svg: bodySilhouette, typeColor: TYPE_COLOR, zoneLabel: zoneLabel, segIdx: segIdx };
})(window);
