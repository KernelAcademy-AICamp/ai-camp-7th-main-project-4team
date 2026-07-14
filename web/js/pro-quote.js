  /* 견적서 페이지 — 요청 클릭 시 진입. 고객 체형진단 결과 상세(브랜드 추천 제외) + 요청 내용 + 제안.
     데이터는 pro.js가 저장한 localStorage 'fitting.pro.reqs'를 공유. 체형 상세는 data/bodytypes.json. */
  function loadLS(k, def){ try{ var v=localStorage.getItem('fitting.'+k); return v?JSON.parse(v):def; }catch(e){ return def; } }
  function saveLS(k, v){ try{ localStorage.setItem('fitting.'+k, JSON.stringify(v)); }catch(e){} }
  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function toast(m){ var t=$('toast'); t.textContent=m; t.classList.add('on'); clearTimeout(window._t); window._t=setTimeout(function(){t.classList.remove('on');},2000); }

  var idx = parseInt(new URLSearchParams(location.search).get('req'),10);
  var candIdx = parseInt(new URLSearchParams(location.search).get('cand'),10);
  var reqs = loadLS('pro.reqs', []);
  var profile = loadLS('pro.profile', null);
  var cands = loadLS('pro.candidates', []);
  var isCand = !isNaN(candIdx) && !!cands[candIdx];   // 견적 보내기(먼저 견적) 진입
  /* 후보 → 유사 요청 레코드(dir:out, 상태 '견적작성'). 실제 발송 전까지 reqs에 넣지 않음 */
  function candRecord(){ var c=cands[candIdx]; return { cust:c.cust, occ:c.occ, service:c.service, type:c.type, bodytype:c.bodytype, gender:c.gender, cm:c.cm, kg:c.kg, budget:c.budget, note:c.note, date:'—', dir:'out', status:'견적작성' }; }
  var MY_PRICE = (profile && profile.services && profile.services[0]) ? profile.services[0].price : 120000;
  var BTMAP = {};
  var BMODEL=null, BDIST=null;   // 예상 치수용 회귀모델·분포(사이즈코리아)
  var offering = false;

  /* 요청자별 임의(데모) 측정치 + 선호핏 */
  var MEASURE_BY_CUST = {
    '한서준':{ top:{shoulder:46,chestFull:38,waist:38,arm:48}, bottom:{waist:38,hip:36}, prefTop:45, prefBottom:42 },
    '김도현':{ top:{shoulder:55,chestFull:46,waist:40,arm:52}, bottom:{waist:44,hip:41}, prefTop:55, prefBottom:46 },
    '정예린':{ top:{shoulder:72,chestFull:48,waist:30,arm:55}, bottom:{waist:34,hip:30}, prefTop:34, prefBottom:40 },
    '이서연':{ top:{shoulder:62,chestFull:38,waist:28,arm:54}, bottom:{waist:24,hip:58}, prefTop:55, prefBottom:35 },
    '박지우':{ top:{shoulder:40,chestFull:44,waist:36,arm:46}, bottom:{waist:30,hip:68}, prefTop:52, prefBottom:74 },
    '최민준':{ top:{shoulder:58,chestFull:56,waist:50,arm:57}, bottom:{waist:50,hip:47}, prefTop:70, prefBottom:55 },
    '이수민':{ top:{shoulder:48,chestFull:52,waist:26,arm:50}, bottom:{waist:22,hip:60}, prefTop:50, prefBottom:36 },
    '박준영':{ top:{shoulder:74,chestFull:52,waist:34,arm:58}, bottom:{waist:38,hip:32}, prefTop:38, prefBottom:44 },
    '최지아':{ top:{shoulder:38,chestFull:42,waist:34,arm:44}, bottom:{waist:30,hip:66}, prefTop:58, prefBottom:70 }
  };
  var MEASURE_DEFAULT = { top:{shoulder:50,chestFull:50,waist:45,arm:50}, bottom:{waist:45,hip:48}, prefTop:55, prefBottom:50 };

  var SVC_SVG = {
    online:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="11" rx="1.6"/><path d="M8.5 20h7"/><path d="M12 16v4"/></svg>',
    shopping:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7.5h12l-1 12.5H7L6 7.5z"/><path d="M9.3 7.5V6a2.7 2.7 0 0 1 5.4 0v1.5"/></svg>',
    image:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.6l1.6 4.5 4.5 1.6-4.5 1.6L12 15.8l-1.6-4.5L5.9 9.7l4.5-1.6L12 3.6z"/><path d="M18.6 13.8v2.2M19.7 14.9h-2.2"/></svg>'
  };
  function svcMeta(s){
    if(s==='shopping') return {cls:'shopping', label:'동행 쇼핑', icon:SVC_SVG.shopping};
    if(s==='image')  return {cls:'image',  label:'이미지 컨설팅', icon:SVC_SVG.image};
    return {cls:'online', label:'온라인 스타일링', icon:SVC_SVG.online};
  }
  function svcLabel(s){ return svcMeta(s).label; }
  function svcBadge(s){ var m=svcMeta(s); return '<span class="svcbadge '+m.cls+'">'+m.icon+' '+m.label+'</span>'; }
  /* 서비스 아이콘만(글자 뺌) — 상단 태그줄용. 라벨은 title로 접근성 유지 */
  function svcBadgeIcon(s){ var m=svcMeta(s); return '<span class="svcbadge '+m.cls+' icon-only" title="'+esc(m.label)+'" aria-label="'+esc(m.label)+'">'+m.icon+'</span>'; }
  function stClass(s){ return s==='신규'?'nw':(s==='제안발송'?'sent':(s==='수락됨'?'prog':(s==='분쟁'?'warn':(s==='완료'?'done':'sent')))); }
  function starsRO(n){ var s=''; for(var k=1;k<=5;k++) s+='<span style="color:'+(k<=n?'#e8a13a':'#ddd')+'">★</span>'; return s; }

  /* ── 액션(상태별) ── 받은 요청: 수락/거절 · 진행 중: 완료/취소 · 보낸 제안: 응답 대기 ── */
  function actionHTML(r){
    if(r.status==='신규'){
      return '<div class="act-row"><button class="btn ghost" onclick="confirmReject()">거절하기</button>'+
             '<button class="btn" onclick="confirmAccept()">수락하기</button></div>';
    }
    if(r.status==='제안발송'){ var o=r.offer||{};
      return '<div class="note-quote"><b style="color:var(--green)">제안 발송됨</b> · <span class="num">'+((o.price||0).toLocaleString())+'</span>원<br>'+
        '<span style="font-size:13px;color:var(--sub)">"'+esc(o.msg||'')+'"</span><br>'+
        '<span style="font-size:12.5px;color:var(--sub2)">고객 응답을 기다리는 중이에요</span></div>'+
        '<button class="btn ghost" style="margin-top:10px" onclick="simAccept()">고객 수락 · 데모</button>';
    }
    if(r.status==='수락됨'){
      var hd='<div class="note-quote"><b style="color:var(--green,#2E4A3B)">수락됨 · 진행 중</b>'+((r.offer&&r.offer.price)?' · <span class="num">'+r.offer.price.toLocaleString()+'</span>원':'')+'</div>';
      var cancel='<button class="btn ghost" style="margin-top:8px" onclick="confirmCancel()">취소 처리</button>';
      // 제출 후에도 완료 전까지는 수정 가능. 결과물=사진·내용(전 서비스 공통) + 구매 상품·예산(온라인 추가)
      if(r.deliver) return hd + deliverSummary(r) +
        '<button class="btn ghost" style="margin-top:10px" onclick="editDeliver()">결과물 수정</button>'+
        '<button class="btn" style="margin-top:8px" onclick="confirmComplete()">완료 처리</button>' + cancel;
      var hasDraft=((r._draft||[]).length || (r._photos||[]).length || (r._dmsg||'').trim());
      return hd + '<button class="btn" style="margin-top:10px" onclick="openDeliverModal()">결과물 작성'+(hasDraft?' (임시저장)':'')+' →</button>' + cancel;
    }
    if(r.status==='분쟁'){ var dp=r.dispute||{};
      return '<div class="note-quote" style="border-color:#e6b8b8;background:#fbf3f3"><b style="color:#c0392b">⚠ 분쟁 접수 · 정산 보류</b><br><span style="font-size:13px">사유: '+esc(dp.reason||'—')+'<br>"'+esc(dp.detail||'')+'"</span></div>'+
        (dp.reply
          ? '<div class="note-quote" style="margin-top:10px"><b style="color:var(--green,#2E4A3B)">내 소명 제출됨</b><br><span style="font-size:13px;color:var(--sub,#6b6a67)">"'+esc(dp.reply)+'"</span><br><span style="font-size:12px;color:var(--sub2,#8a857b)">관리자 중재를 기다리는 중이에요</span></div>'
          : '<div class="offerform" style="margin-top:10px"><label>소명 · 반박</label><textarea id="dispReply" placeholder="결과물 전달 내역·대화 등 상황을 설명해주세요"></textarea><button class="btn" style="margin-top:10px" onclick="submitDisputeReply()">소명 제출</button></div>')+
        '<p class="note-quote muted" style="margin-top:10px">관리자 중재(3.B.4)로 환불·정산이 결정돼요</p>';
    }
    if(r.status==='완료'){
      if(r.review) return '<div class="seclabel">고객 후기</div><div class="note-quote"><span style="letter-spacing:1px">'+starsRO(r.review.rating)+'</span><br>"'+esc(r.review.text)+'"</div>';
      return '<div class="note-quote muted">완료 · 고객 후기를 기다리는 중이에요</div>';
    }
    if(r.status==='거절'){ return '<div class="note-quote muted">거절한 요청이에요'+(r.reason?' · "'+esc(r.reason)+'"':'')+'</div><button class="btn ghost" style="margin-top:10px" onclick="undoReject()">되돌리기</button>'; }
    if(r.status==='취소'){ return '<div class="note-quote muted">취소된 요청이에요'+(r.reason?' · "'+esc(r.reason)+'"':'')+'</div><button class="btn ghost" style="margin-top:10px" onclick="undoCancel()">되돌리기</button>'; }
    if(r.status==='견적작성'){   // 먼저 견적 보내기 — 금액·메시지 입력 후 발송
      return '<div class="offerform">'+
        '<label style="display:block;font-size:12.5px;font-weight:800;color:var(--sub);margin:0 0 6px">견적 금액</label>'+
        '<input id="qPrice" type="number" value="'+svcPrice(r.service)+'">'+
        '<label style="display:block;font-size:12.5px;font-weight:800;color:var(--sub);margin:14px 0 6px">한 줄 메시지</label>'+
        '<textarea id="qMsg" placeholder="예: '+esc(r.occ||'')+' 룩 맞춤 견적 드려요"></textarea>'+
        '<button class="btn" style="margin-top:14px" onclick="sendQuote()">견적 보내기</button>'+
      '</div>';
    }
    return '';
  }
  function sendQuote(){
    var c=cands[candIdx]; if(!c) return;
    var pe=$('qPrice'), me=$('qMsg');
    var price=pe?(parseInt(pe.value,10)||svcPrice(c.service)):svcPrice(c.service);
    var msg=me?me.value.trim():'';
    reqs.unshift({ cust:c.cust, occ:c.occ, service:c.service, type:c.type, bodytype:c.bodytype, gender:c.gender, cm:c.cm, kg:c.kg,
      dir:'out', status:'제안발송', offer:{price:price, msg:msg||(c.occ+' 룩 맞춤 견적 드려요')}, budget:c.budget, date:'방금' });
    saveLS('pro.reqs',reqs);
    var proposed=loadLS('pro.proposed',[]); proposed.push(c.cust); saveLS('pro.proposed',proposed);
    toast(c.cust+' 님에게 견적을 보냈어요');
    setTimeout(function(){ location.href='pro.html'; }, 700);
  }
  function svcPrice(service){ if(profile&&profile.services){ var f=profile.services.filter(function(s){return s.type===service;})[0]; if(f) return f.price; } return MY_PRICE; }
  function accept(){ if(!reqs[idx].offer) reqs[idx].offer={price:svcPrice(reqs[idx].service)}; reqs[idx].status='수락됨'; saveLS('pro.reqs',reqs); render(); toast('요청을 수락했어요'); }
  function reject(){ reqs[idx].reason=''; reqs[idx].status='거절'; saveLS('pro.reqs',reqs); render(); toast('요청을 거절했어요'); }
  function undoReject(){ reqs[idx].status='신규'; reqs[idx].reason=''; saveLS('pro.reqs',reqs); render(); toast('거절을 되돌렸어요'); }
  function simAccept(){ reqs[idx].status='수락됨'; saveLS('pro.reqs',reqs); render(); toast(reqs[idx].cust+' 님이 제안을 수락했어요'); }
  function completeReq(){ reqs[idx].status='완료'; saveLS('pro.reqs',reqs); render(); toast('완료 처리했어요'); }
  function cancelReq(){ reqs[idx].reason=''; reqs[idx].status='취소'; saveLS('pro.reqs',reqs); render(); toast('진행을 취소했어요'); }
  function undoCancel(){ reqs[idx].status='수락됨'; reqs[idx].reason=''; saveLS('pro.reqs',reqs); render(); toast('취소를 되돌렸어요'); }
  /* 분쟁 소명(2.x/3.B.4) — 스타일리스트 반박 제출 → 관리자 중재 대기 */
  function submitDisputeReply(){ var el=$('dispReply'); var v=el?el.value.trim():''; if(!v){ toast('소명 내용을 입력해주세요'); return; }
    if(!reqs[idx].dispute) reqs[idx].dispute={}; reqs[idx].dispute.reply=v; saveLS('pro.reqs',reqs); render(); toast('소명을 제출했어요 · 관리자 중재를 기다려요'); }

  /* ===== 결과물 작성·전달 (IA 2.1.2) — 온라인: 브랜드·상품명·사이즈·가격·구매링크 n개 + 합계·예산 검증 → 제출 → 고객 수령(1.6/1.7) ===== */
  function pval(id){ var el=$(id); return el?el.value.trim():''; }
  function itemLine(it){ return '<b style="color:var(--ink,#1c1a17)">'+esc(it.brand)+'</b> '+esc(it.name)+' · '+esc(it.size)+' · <span class="num">'+(it.price?Number(it.price).toLocaleString():'—')+'</span>원'+(it.url?' 🔗':''); }
  function itemsTotal(items){ return (items||[]).reduce(function(a,it){ return a+(parseInt(it.price,10)||0); },0); }
  /* "10~15만"·"~5만"·"15만+" → {min,max} (원) */
  function budgetRange(b){ b=(b||'').replace(/\s/g,''); if(!b) return null;
    var nums=(b.match(/\d+/g)||[]).map(function(n){ return parseInt(n,10)*10000; }); if(!nums.length) return null;
    if(b.charAt(0)==='~') return {min:0, max:nums[0]};
    if(/\+$/.test(b)) return {min:nums[0], max:Infinity};
    if(nums.length>=2) return {min:nums[0], max:nums[1]};
    return {min:0, max:nums[0]}; }
  function budgetText(range, raw){ if(!range) return raw||'—'; if(range.max===Infinity) return (range.min/10000)+'만원 이상'; return (range.min?(range.min/10000)+'~':'~')+(range.max/10000)+'만원'; }
  function budgetStatus(total, range){ if(!range) return {label:'예산 미설정', color:'var(--sub2,#8a857b)'};
    if(total < range.min) return {label:'예산보다 낮아요', color:'#b8862b'};
    if(range.max===Infinity || total <= range.max) return {label:'예산 내 ✓', color:'var(--green,#2E4A3B)'};
    return {label:'예산 '+(total-range.max).toLocaleString()+'원 초과', color:'#c0392b'}; }
  /* 합계·예산 서머리 (모달 + 제출요약 공용) */
  function budgetSummaryHTML(items, req, compact){
    var total=itemsTotal(items), range=budgetRange(req.budget), st=budgetStatus(total, range);
    var pct = range ? (range.max&&range.max!==Infinity ? Math.min(100, total/range.max*100) : (total>=range.min?100:(range.min?total/range.min*100:0))) : 0;
    var bar = compact ? '' : '<div class="dlv-bar"><i style="width:'+pct.toFixed(0)+'%;background:'+st.color+'"></i></div>';
    return '<div class="dlv-bud"><div class="r"><span>추천 상품 '+(items||[]).length+'개 · 합계</span><b class="num" style="color:'+st.color+'">'+total.toLocaleString()+'원</b></div>'+
      '<div class="r"><span>고객 예산</span><span>'+budgetText(range, req.budget)+'</span></div>'+bar+
      '<div style="text-align:right;font-size:12.5px;font-weight:800;color:'+st.color+';margin-top:'+(compact?'2':'7')+'px">'+st.label+'</div></div>'; }
  function ensureDlvStyle(){ if($('dlvStyle')) return; var s=document.createElement('style'); s.id='dlvStyle';
    s.textContent='.dlv-modal{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center}'+
      '.dlv-bd{position:absolute;inset:0;background:rgba(20,18,16,.45)}'+
      '.dlv-pan{position:relative;background:#fff;border-radius:18px;width:min(520px,93vw);max-height:88vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.28)}'+
      '.dlv-h{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--line,#ece9e3)}'+
      '.dlv-h b{font-size:16px;font-weight:800}.dlv-h span{font-size:12.5px;color:var(--sub,#6b6a67)}'+
      '.dlv-x{background:none;border:none;font-size:20px;line-height:1;cursor:pointer;color:var(--sub2,#8a857b)}'+
      '.dlv-b{padding:16px 20px;overflow-y:auto}.dlv-f{padding:13px 20px;border-top:1px solid var(--line,#ece9e3)}'+
      '.dlv-bud{background:var(--soft,#f5f3ee);border-radius:12px;padding:13px 15px;margin-bottom:14px}'+
      '.dlv-bud .r{display:flex;justify-content:space-between;align-items:center;font-size:13.5px;margin-bottom:4px}.dlv-bud .r span{color:var(--sub,#6b6a67)}'+
      '.dlv-bar{height:8px;border-radius:5px;background:#e3e0d8;overflow:hidden;margin-top:9px}.dlv-bar>i{display:block;height:100%;border-radius:5px;transition:width .2s}'+
      '.dlv-it{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--line,#ece9e3);font-size:13.5px}.dlv-it:last-child{border:none}'+
      '.dlv-sec{font-size:13px;font-weight:800;color:var(--ink,#1c1a17);margin:16px 0 8px}'+
      '.dlv-thumbs{display:flex;gap:8px;flex-wrap:wrap;margin:2px 0 10px}'+
      '.dlv-th{position:relative;width:74px;height:74px;border-radius:10px;background:#eee center/cover;background-size:cover}'+
      '.dlv-th button{position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;border:none;background:rgba(20,18,16,.72);color:#fff;font-size:11px;line-height:1;cursor:pointer}'+
      '.dlv-up{display:inline-flex;align-items:center;gap:6px;padding:10px 14px;border:1.5px dashed var(--line2,#d8d4cc);border-radius:10px;font-size:13.5px;font-weight:700;color:var(--sub,#6b6a67);cursor:pointer}';
    document.head.appendChild(s); }
  function openDeliverModal(){ ensureDlvStyle(); var m=$('deliverModal'); if(!m){ m=document.createElement('div'); m.id='deliverModal'; m.className='dlv-modal'; document.body.appendChild(m); } renderDeliverModal(); m.style.display='flex'; }
  function saveDlvMsg(){ var el=$('dvMsg'); if(el&&reqs[idx]) reqs[idx]._dmsg=el.value; }
  function closeDeliverModal(){ saveDlvMsg(); if(reqs[idx]) saveLS('pro.reqs',reqs); var m=$('deliverModal'); if(m) m.style.display='none'; render(); }
  var MAX_PHOTOS=6, MAX_PHOTO_BYTES=800000;
  function photoThumbsHTML(photos, editable){ if(!(photos||[]).length) return '';
    return '<div class="dlv-thumbs">'+photos.map(function(p,k){ return '<div class="dlv-th" style="background-image:url(\''+p.data+'\')">'+(editable?'<button onclick="delPhoto('+k+')">✕</button>':'')+'</div>'; }).join('')+'</div>'; }
  /* 구매 상품 블록 (온라인 한정) — 합계·예산 미터 + 상품 리스트 + 추가 폼 */
  function productBlockHTML(r){ var draft=r._draft||[];
    var list=draft.length ? draft.map(function(it,k){ return '<div class="dlv-it"><span>'+itemLine(it)+'</span><button onclick="delDeliverItem('+k+')" style="background:none;border:none;color:var(--sub2,#8a857b);font-size:12px;font-weight:700;cursor:pointer;flex:none">삭제</button></div>'; }).join('') : '<p class="note-quote muted">아직 담은 상품이 없어요 · 아래에서 추가해보세요</p>';
    return budgetSummaryHTML(draft, r, false)+
      '<div class="dlv-sec">추천 상품 · 구매 링크</div>'+list+
      '<div class="offerform" style="margin-top:12px">'+
        '<label>브랜드</label><input id="dvBrand" placeholder="예: 유니클로">'+
        '<label>상품명</label><input id="dvName" placeholder="예: 라운드 니트">'+
        '<div style="display:flex;gap:8px"><div style="flex:1"><label>사이즈</label><input id="dvSize" placeholder="M / 30 / 270"></div><div style="flex:1"><label>가격(원)</label><input id="dvPrice" type="number" placeholder="39900"></div></div>'+
        '<label>구매 링크 URL</label><input id="dvUrl" placeholder="https://...">'+
        '<button class="btn ghost" style="margin-top:12px" onclick="addDeliverItem()">+ 상품 추가</button></div>'; }
  /* 사진 블록 (전 서비스 공통) */
  function photoBlockHTML(r){ var photos=r._photos||[];
    return '<div class="dlv-sec">사진 첨부'+(photos.length?' ('+photos.length+')':'')+'</div>'+
      photoThumbsHTML(photos, true)+
      '<label class="dlv-up">📷 사진 추가<input type="file" accept="image/*" multiple onchange="attachPhoto(this)" style="display:none"></label>'+
      '<div style="font-size:11.5px;color:var(--sub2,#8a857b);margin-top:6px">현장 코디·착용 사진 등 · 장당 800KB 이하, 최대 '+MAX_PHOTOS+'장(데모)</div>'; }
  /* 내용/코디 노트 (전 서비스 공통) */
  function contentBlockHTML(r){ return '<div class="offerform" style="margin-top:16px"><label>내용 · 코디 노트</label><textarea id="dvMsg" placeholder="코디 설명·착용 팁·현장 메모 등을 적어주세요">'+esc(r._dmsg||'')+'</textarea></div>'; }
  function renderDeliverModal(){ var r=reqs[idx], m=$('deliverModal'); if(!m||!r) return;
    var online=(r.service==='online'), draft=r._draft||[];
    var submit='결과물 '+(r.deliver?'다시 제출':'제출')+(online&&draft.length ? ' ('+draft.length+'개 · '+itemsTotal(draft).toLocaleString()+'원)' : '');
    m.innerHTML='<div class="dlv-bd" onclick="closeDeliverModal()"></div><div class="dlv-pan">'+
      '<div class="dlv-h"><div><b>'+(r.deliver?'결과물 수정':'결과물 작성')+'</b> <span>'+esc(r.cust)+' 님 · '+svcLabel(r.service)+'</span></div><button class="dlv-x" onclick="closeDeliverModal()">✕</button></div>'+
      '<div class="dlv-b">'+(online?productBlockHTML(r):'')+photoBlockHTML(r)+contentBlockHTML(r)+'</div>'+
      '<div class="dlv-f"><button class="btn" onclick="sendDeliver()">'+submit+'</button></div></div>';
  }
  function deliverSummary(r){ ensureDlvStyle(); var d=r.deliver||{}, items=d.items||[], photos=d.photos||[];
    var out='<div class="seclabel" style="margin-top:16px">제출한 결과물</div>';
    if(items.length) out+=budgetSummaryHTML(items, r, true);
    out+='<div class="note-quote" style="margin-top:10px"><b style="color:var(--green,#2E4A3B)">✓ 제출 완료</b>';
    if(items.length) out+='<br>'+items.map(function(it){ return '<span style="font-size:13px;color:var(--sub,#6b6a67)">· '+itemLine(it)+'</span>'; }).join('<br>');
    if(photos.length) out+='<br><span style="font-size:12.5px;color:var(--sub2,#8a857b)">📷 사진 '+photos.length+'장</span>';
    if(d.msg) out+='<br><span style="font-size:12.5px;color:var(--sub2,#8a857b)">"'+esc(d.msg)+'"</span>';
    out+='</div>'+photoThumbsHTML(photos, false);
    return out;
  }
  function addDeliverItem(){ var br=pval('dvBrand'), nm=pval('dvName'); if(!br||!nm){ toast('브랜드와 상품명을 입력해주세요'); return; }
    saveDlvMsg(); reqs[idx]._draft=(reqs[idx]._draft||[]).concat([{ brand:br, name:nm, size:pval('dvSize')||'—', price:pval('dvPrice')||'', url:pval('dvUrl') }]);
    saveLS('pro.reqs',reqs); renderDeliverModal(); }
  function delDeliverItem(k){ if(reqs[idx]._draft) reqs[idx]._draft.splice(k,1); saveDlvMsg(); saveLS('pro.reqs',reqs); renderDeliverModal(); }
  function attachPhoto(input){ var files=input.files; if(!files||!files.length) return; var r=reqs[idx]; r._photos=r._photos||[]; saveDlvMsg();
    [].forEach.call(files, function(f){
      if(!/^image\//.test(f.type)) return;
      if(r._photos.length>=MAX_PHOTOS){ toast('사진은 최대 '+MAX_PHOTOS+'장까지예요'); return; }
      if(f.size>MAX_PHOTO_BYTES){ toast(f.name+' — 800KB 이하만 첨부돼요(데모)'); return; }
      var rd=new FileReader(); rd.onload=function(){ if(r._photos.length>=MAX_PHOTOS) return; r._photos.push({ name:f.name, data:rd.result }); saveLS('pro.reqs',reqs); renderDeliverModal(); }; rd.readAsDataURL(f);
    });
    input.value=''; }
  function delPhoto(k){ if(reqs[idx]._photos) reqs[idx]._photos.splice(k,1); saveDlvMsg(); saveLS('pro.reqs',reqs); renderDeliverModal(); }
  /* 완료 전 수정 — 제출본을 초안으로 되돌려 모달 열기 */
  function editDeliver(){ var r=reqs[idx]; if(!r||!r.deliver) return;
    r._draft=(r.deliver.items||[]).slice(); r._photos=(r.deliver.photos||[]).slice(); r._dmsg=r.deliver.msg||'';
    openDeliverModal(); }
  function sendDeliver(){ saveDlvMsg(); var r=reqs[idx];
    var items=r._draft||[], photos=r._photos||[], msg=(r._dmsg||'').trim();
    if(!items.length && !photos.length && !msg){ toast('상품·사진·내용 중 하나 이상 추가해주세요'); return; }
    r.deliver={ items:items, photos:photos, msg:r._dmsg||'', sentAt:new Date().toISOString() }; delete r._draft; delete r._photos; delete r._dmsg;
    saveLS('pro.reqs',reqs); var m=$('deliverModal'); if(m) m.style.display='none'; render(); toast(r.cust+' 님에게 결과물을 제출했어요'); }

  /* 결정 버튼 확인 팝업 — 수락/거절/완료/취소 */
  function askConfirm(msg, onYes, yesLabel){
    var ov=$('cfOverlay'); $('cfMsg').textContent=msg; $('cfYes').textContent=yesLabel||'확인';
    ov.classList.add('on');
    function close(){ ov.classList.remove('on'); }
    $('cfYes').onclick=function(){ close(); if(onYes) onYes(); };
    $('cfNo').onclick=close;
    ov.onclick=function(e){ if(e.target===ov) close(); };
  }
  function confirmAccept(){ askConfirm(reqs[idx].cust+' 님의 요청을 수락할까요?', accept, '수락하기'); }
  function confirmReject(){ askConfirm(reqs[idx].cust+' 님의 요청을 거절할까요?', reject, '거절하기'); }
  function confirmComplete(){ askConfirm('완료 처리할까요? 고객 후기를 받을 수 있어요', completeReq, '완료 처리'); }
  function confirmCancel(){ askConfirm('진행을 취소할까요?', cancelReq, '취소하기'); }

  /* ── 고객 체형 = 스타일리스트용 '결과 카드 값' 먼저, 측정값은 가독성 좋게 '자세히 보기' ── */
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
  /* 태그 pill 배경 — 유형색 농도로. seg 0(가장 슬림)=가장 연하게 … 4(가장 볼륨)=가장 진하게 */
  function tagBg(tc, seg){
    if(seg<=0) return mixHex(tc,'#FFFFFF',0.78);   // 가장 슬림·좁은
    if(seg===1) return mixHex(tc,'#FFFFFF',0.56);  // 슬림 편
    if(seg===2) return mixHex(tc,'#FFFFFF',0.28);  // 표준(표준색)
    if(seg===3) return mixHex(tc,'#2A2823',0.18);  // 볼륨 편
    return mixHex(tc,'#2A2823',0.40);              // 가장 볼륨·넓은
  }
  /* 배경 명도로 글자색(흰/검정) 자동 */
  function textOn(hex){ var h=hex.replace('#','');
    var r=parseInt(h.substr(0,2),16), g=parseInt(h.substr(2,2),16), b=parseInt(h.substr(4,2),16);
    return (0.299*r+0.587*g+0.114*b) > 150 ? '#2A2823' : '#FFFFFF'; }
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
    var vx=240, guides='';
    LV.forEach(function(x){ var i=segIdx(x.pct), tag=zoneLabel(i,x.lo,x.hi), bg=tagBg(tc,i), txt=textOn(bg);
      var half=x.half, y=x.y, re=cx+half, le=cx-half, e=estMap[x.key];
      // 우: 부위명(+ 예상 cm을 바로 옆에). cm 있으면 이름은 위·수치 아래로.
      guides+='<circle cx="'+re.toFixed(1)+'" cy="'+y+'" r="2.6" fill="var(--fig-line)"/>'
        +'<line x1="'+(re+4).toFixed(1)+'" y1="'+y+'" x2="'+(vx-6)+'" y2="'+y+'" stroke="var(--guide)" stroke-width="1.2" stroke-dasharray="2 3"/>'
        +'<text class="g-name" x="'+vx+'" y="'+(e?(y-5):(y+4))+'">'+esc(x.name)+'</text>';
      if(e) guides+='<text class="g-val" x="'+vx+'" y="'+(y+13)+'">약 '+e.val+'<tspan class="g-unit" dx="1">cm</tspan> <tspan class="g-pm">±'+e.pm+'</tspan></text>';
      // 좌: 슬림/표준/볼륨 태그 — 유형색 농도(볼륨 진하게·슬림 연하게), 글자색 자동
      var tw=tag.length*13.5+22, pe=le-9, ps=pe-tw;
      guides+='<circle cx="'+le.toFixed(1)+'" cy="'+y+'" r="2.6" fill="var(--fig-line)"/>'
        +'<line x1="'+(le-4).toFixed(1)+'" y1="'+y+'" x2="'+(pe+1).toFixed(1)+'" y2="'+y+'" stroke="var(--guide)" stroke-width="1.2"/>'
        +'<rect x="'+ps.toFixed(1)+'" y="'+(y-12)+'" width="'+tw.toFixed(1)+'" height="24" rx="12" fill="'+bg+'"/>'
        +'<text class="g-tag" x="'+(ps+tw/2).toFixed(1)+'" y="'+(y+4)+'" text-anchor="middle" fill="'+txt+'">'+esc(tag)+'</text>'; });
    var svg='<svg viewBox="0 0 360 520" role="img" aria-label="고객 체형 실루엣">'
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
    var pref=zoneLabel(segIdx(m.prefTop),'타이트','여유');
    var note=(est&&est.length)
      ? '예상 치수 · 신뢰도 '+esc(conf||'—')+' · 폭=측정 반영, 세로=표준 비율'
      : '폭 = 측정 백분위 반영 · 세로 = 표준 비율';
    /* 라인만 스타일 — 유형색을 라인(80%+다크)으로, 채움은 아주 옅은 틴트(12%) */
    var figLine=mixHex(tc,'#2A2823',0.20), figFill=mixHex(tc,'#FFFFFF',0.88);
    return '<div class="bodymap2" style="--fig-fill:'+figFill+';--fig-line:'+figLine+'">'+svg
      +'<div class="av-pref"><span>핏 취향</span><b>'+esc(pref)+'</b></div>'
      +'<div class="av-cap">'+note+'</div></div>';
  }

  /* 스타일리스트용 체형 설명 한 줄(8유형) — 고객 체형을 '~체형이에요!'로 설명 */
  var SHOPPER_DESC={
    STR:'벨트로 허리에 곡선을 더하면 직선 라인이 한층 살아나는 체형이에요!',
    TRI:'상체에 포인트를 주고 시선을 위로 올리면 균형이 살아나는 체형이에요!',
    INV:'상의는 깔끔하게, 하의로 시선을 분산하면 균형이 살아나는 체형이에요!',
    HRG:'허리 라인을 살리면 곡선이 우아하게 떨어지는 체형이에요!',
    BAL:'비율이 고르게 균형 잡혀 뭘 입어도 잘 어울리는 체형이에요!',
    DIA:'세로로 길게 흐르는 라인을 살리면 훨씬 깔끔해지는 체형이에요!',
    RND:'세로 라인과 여유 핏으로 길게 떨어뜨리면 산뜻해지는 체형이에요!',
    TUB:'레이어와 디테일로 입체감을 더하면 멋이 살아나는 체형이에요!'
  };

  /* [프로토타입] A 기준 옷 · B 브랜드별 추천 사이즈 — 데모값(실데이터는 고객 착용경험·엔진 출력에서 와야 함) */
  var DEMO_BRANDREC = {
    female:[['무신사 스탠다드','M','27'],['H&M','M','S'],['COS','36','38'],['스파오','M','M']],
    male:[['무신사 스탠다드','L','32'],['H&M','L','M'],['COS','50','48'],['스파오','L','L']]
  };
  /* 예상 신체 치수 — body-base-model(회귀: a·키+b·몸무게+c·나이+intercept) + body-distribution(sd). 착용경험 수로 ± 폭 조정 */
  function estBody(r){
    if(!BMODEL||!BDIST) return null;
    var g=(r.gender==='male')?'male':'female';
    var h=parseFloat(r.cm)||0, w=parseFloat(r.kg)||0, age=parseFloat(r.age)||30;
    if(!h||!w||!BMODEL[g]||!BDIST[g]) return null;
    var n=(r.wearExp||[]).length;
    var band = n>=2?0.25 : (n===1?0.4 : 0.6);   // 착용경험 많을수록 ± 좁힘
    var parts=[['shoulder','어깨너비'],['chestUpper','가슴둘레'],['waist','허리둘레'],['hip','엉덩이둘레']];
    return parts.map(function(p){
      var c=BMODEL[g][p[0]], d=BDIST[g][p[0]]; if(!c||!d) return null;
      var val=c.a_height*h + c.b_weight*w + (c.c_age||0)*age + c.intercept;
      return {label:p[1], val:Math.round(val), pm:Math.max(1,Math.round(d.sd*band))};
    }).filter(Boolean);
  }
  /* 신뢰도 라벨 — 착용경험 수로. 아바타 캡션·예상치수 공용 */
  function estConf(r){
    var n=(r.wearExp||[]).length;
    return n>=2?'정확 (착용경험 2벌+)' : (n===1?'보통 (착용경험 1벌)' : '낮음 (키·몸무게만)');
  }
  function estSection(r){
    var es=estBody(r); if(!es||!es.length) return '';
    var conf = estConf(r);
    return '<div class="cx-sec"><div class="cx-h">예상 신체 치수 <span class="cx-ex">추정</span></div>'+
      '<table class="cx-tbl"><tbody>'+
      es.map(function(x){return '<tr><td>'+esc(x.label)+'</td><td style="text-align:right">약 <b>'+x.val+'</b>cm <span style="color:var(--sub2);font-weight:700">± '+x.pm+'</span></td></tr>';}).join('')+
      '</tbody></table>'+
      '<div class="cx-note">키·몸무게 기반 통계 추정(사이즈코리아 인체치수) · 신뢰도 '+esc(conf)+' — 착용경험이 많을수록 오차가 줄어요</div></div>';
  }

  function refAndRecs(m, bt, r){
    var g=(r.gender==='male')?'male':'female';
    var ex='<span class="cx-ex">예시</span>';
    // A. 잘 맞는 기준 옷 — 고객 착용경험(딱맞음)에서. 진단엔 상품명이 없어 브랜드·카테고리·핏·사이즈만 표기
    var fits=(r.wearExp||[]).filter(function(e){return e.feel==='딱맞음';});
    var a='<div class="cx-sec"><div class="cx-h">잘 맞는 기준 옷</div>'+
      (fits.length
        ? '<div class="cx-tags">'+fits.map(function(e){return '<span class="cx-tag"><b>'+esc(e.brand)+'</b> · '+esc(e.cat)+' '+esc(e.fit)+' · <b>'+esc(e.size)+'</b></span>';}).join('')+'</div>'
        : '<div class="cx-note">진단 때 착용경험을 입력하지 않았어요 · 기준 옷 정보 없음</div>')+
    '</div>';
    var b='<div class="cx-sec"><div class="cx-h">브랜드별 추천 사이즈 '+ex+'</div>'+
      '<table class="cx-tbl"><thead><tr><th>브랜드</th><th>상의</th><th>하의</th></tr></thead><tbody>'+
      DEMO_BRANDREC[g].map(function(x){return '<tr><td>'+esc(x[0])+'</td><td><b>'+esc(x[1])+'</b></td><td><b>'+esc(x[2])+'</b></td></tr>';}).join('')+
      '</tbody></table></div>';
    return a+b;
  }

  /* 고객 체형 — 결과 카드(유형명) 없이: 기본정보 + 8유형색 설명 한 줄 + 웃긴 바디맵 */
  function measureCard(m, bt, r){
    var pt=esc(bt.point||'#2E4A3B');
    var gLabel=r.gender==='male'?'남성':(r.gender==='female'?'여성':'');
    var guide=SHOPPER_DESC[bt.code||r.type] || bt.insight || ((bt.profile&&bt.profile[1])||'');
    return '<div class="card bodycard2">'+
      '<div class="rr-eye">고객 체형 · 제안 참고용</div>'+
      /* ① 기본 — 성별·키·몸무게 */
      '<div class="body-basic">'+(gLabel?esc(gLabel)+' · ':'')+'<span class="num">'+(r.cm||'—')+'</span>cm · <span class="num">'+(r.kg||'—')+'</span>kg</div>'+
      /* ② 체형 + 체형 설명(같이) */
      '<div class="body-type">'+
        '<div class="bt-head"><i style="background:'+pt+'"></i>'+esc(bt.sizeKorea||'')+'</div>'+
        (guide?'<div class="guide-line" style="background:'+pt+'1f;border-left:3px solid '+pt+'">'+esc(guide)+'</div>':'')+
      '</div>'+
      /* ③ 캐릭터 + 어깨·가슴·허리·엉덩이·핏취향(같이) */
      /* ③ 아바타 + 부위별 슬림/표준/볼륨 + 예상 cm(라벨에 바로) */
      bodySilhouette(m, bt, r.gender, estBody(r), estConf(r))+
      /* ⑤ [프로토타입] 기준 옷 · 브랜드별 추천 사이즈 · 스타일링 힌트 */
      refAndRecs(m, bt, r)+
    '</div>';
  }

  /* 체형 미첨부 — 성별·키·몸무게만(요청에 늘 있는 값) */
  function basicBodyCard(r){
    var gLabel=r.gender==='male'?'남성':(r.gender==='female'?'여성':'');
    return '<div class="card bodycard2">'+
      '<div class="rr-eye">고객 기본 정보</div>'+
      '<div class="brc-sub">'+(gLabel?esc(gLabel)+' · ':'')+'<span class="num">'+(r.cm||'—')+'</span>cm · <span class="num">'+(r.kg||'—')+'</span>kg</div>'+
      '<p class="basic-note">고객이 체형 진단 결과를 첨부하지 않았어요 · 성별·키·몸무게만 확인할 수 있어요</p>'+
    '</div>';
  }

  /* ① 요청서 영수증 — 고객이 보낸 견적 요청을 고객 화면(cf-a) 톤으로 통일 */
  var IC_DOC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h4"/></svg>';
  var IC_PIN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11l-8.5 8.5a4.5 4.5 0 0 1-6.4-6.4l8.5-8.5a3 3 0 0 1 4.3 4.3l-8.6 8.5a1.5 1.5 0 0 1-2.1-2.1l7.9-7.9"/></svg>';
  function requestReceipt(r, att){
    var out = r.dir==='out';
    // 지명(받은 요청)=이 스타일리스트 한 명에게 → 명확한 예상 가격 / 오픈(보낸 제안)=여러 스타일리스트에 뿌린 요청 → 고객 예산 범위
    var money = out
      ? ['고객 예산', esc(r.budget||'—')]
      : ['예상 가격', '<span class="num">'+svcPrice(r.service).toLocaleString()+'</span>원'];
    var rows=[['서비스 유형', esc(svcLabel(r.service))], ['상황', esc(r.occ||'—')], money, ['희망 일정', esc(r.date||'—')]];
    if(r.styles && r.styles.length) rows.push(['선호 스타일', esc(r.styles.join(' · '))]);
    return '<div class="card reqreceipt">'+
      '<div class="rr-ic">'+IC_DOC+'</div>'+
      /* 요청사항 = 메모 히어로(초록 따옴표 인용). 없으면 방향별 기본 문구 */
      (r.note
        ? '<div class="rr-eye">요청사항</div><div class="rr-hero"><span class="mk">“</span>'+esc(r.note)+'<span class="mk">”</span></div>'
        : '<div class="rr-title">'+(out?'이런 스타일을 원해요!':'견적 요청이 도착했어요!')+'</div>')+
      '<div class="rr-list">'+rows.map(function(x){ return '<div class="rr-item"><span class="k">'+esc(x[0])+'</span><span class="v">'+x[1]+'</span></div>'; }).join('')+'</div>'+
      '<span class="rr-chip'+(att?'':' off')+'">'+IC_PIN+(att?'체형·사이즈 측정 결과 첨부됨':'체형·사이즈 측정 미첨부')+'</span>'+
    '</div>';
  }

  /* ── 전체 렌더 ── */
  // 8유형 성별 축: 구조필드(공유)+gender.{male,female} 콘텐츠 병합. 구 포맷은 raw 폴백.
  function btResolve(t, g){
    if(!t) return t;
    g=(g==='male'||g==='female')?g:'female';
    var c=(t.gender&&(t.gender[g]||t.gender.female))||t;
    return { code:t.code, name:t.name, sizeKorea:t.sizeKorea, silhouette:t.silhouette, point:t.point,
      profile:c.profile, fitOk:c.fitOk, fitNo:c.fitNo, insight:c.insight, match:c.match, signature:c.signature };
  }
  function render(){
    var r = isCand ? candRecord() : reqs[idx];
    if(!r){ $('quoteRoot').innerHTML='<p class="crumb">요청을 찾을 수 없어요.</p><p style="margin-top:10px"><a class="tinybtn" onclick="location.href=\'pro.html\'">요청 내역으로</a></p>'; return; }
    var out = r.dir==='out';
    var bt = btResolve(BTMAP[r.type], r.gender) || {};   // 고객 성별로 콘텐츠 해석
    var m = MEASURE_BY_CUST[r.cust] || MEASURE_DEFAULT;
    // 체형 진단 결과 첨부 여부 — 첨부 O: 캐릭터·측정 / 첨부 X: 성별·키·몸무게만
    var attached = r.attach!==false && !!(bt && (bt.sizeKorea||bt.silhouette));

    var bodyCard = attached ? measureCard(m, bt, r) : basicBodyCard(r);

    // 좌(primary): ① 요청서 먼저 → ② 체형 참고 나중  /  우(sticky): ③ 제안
    $('quoteRoot').innerHTML =
      '<a class="backlink" onclick="location.href=\'pro.html\'">← '+(r.status==='견적작성'?'견적 보내기로':'요청 내역으로')+'</a>'+
      '<p class="crumb">스타일리스트 지원 · '+(r.status==='견적작성'?'견적 보내기':(out?'보낸 제안':'받은 요청'))+'</p>'+
      '<h1>'+esc(r.cust)+' 님'+(r.occ?' · '+esc(r.occ):'')+'</h1>'+
      '<div class="htags"><span class="st '+stClass(r.status)+'">'+esc(r.status)+'</span>'+svcBadgeIcon(r.service)+'</div>'+
      '<div class="qgrid2">'+
        '<div class="qleft">'+ requestReceipt(r, attached) +
          '<div class="card offer-card"><div class="subhead">'+(r.status==='견적작성'?'견적 작성':(out?'제안 현황':(r.status==='신규'?'요청을 수락하시겠습니까?':'진행 상태')))+'</div>'+ actionHTML(r) +'</div>'+
        '</div>'+
        '<div class="qright">'+ bodyCard +'</div>'+
      '</div>';
  }

  /* 상단바(앱 바) — 프로필 이름·아바타·알림 뱃지 채우기 + 계정 메뉴 */
  function toggleAccMenu(e){ if(e) e.stopPropagation(); var m=$('accMenu'); if(m) m.classList.toggle('on'); }
  document.addEventListener('click', function(){ var m=$('accMenu'); if(m) m.classList.remove('on'); });
  function setTxt(id,v){ var e=$(id); if(e&&v!=null) e.textContent=v; }
  function setSrc(id,v){ var e=$(id); if(e&&v) e.src=v; }
  function initHeader(){
    var nm=(profile&&profile.name)||'소희 스타일리스트';
    var av=(profile&&profile.avatar)||'photos/p1.jpg';
    var role=(profile&&profile.services&&profile.services[0]&&profile.services[0].label)||'온라인 스타일링';
    setTxt('hdrName',nm); setTxt('sideName',nm);
    setSrc('hdrAvatar',av); setSrc('sideAvatar',av);
    setTxt('sideRole',role);
    setTxt('pRate',(profile&&profile.rating)||'4.9');
    setTxt('pRev', reqs.filter(function(r){ return r.review; }).length);
    var nw=reqs.filter(function(x){ return x.status==='신규'; }).length;
    var bb=$('bellBadge'); if(bb){ if(nw>0){ bb.style.display='flex'; bb.textContent=nw; } else bb.style.display='none'; }
  }
  window.toggleAccMenu=toggleAccMenu;
  initHeader();

  Promise.all([
    fetch('data/bodytypes.json').then(function(r){return r.json();}).catch(function(){return {};}),
    fetch('data/body-base-model.json').then(function(r){return r.json();}).catch(function(){return null;}),
    fetch('data/body-distribution.json').then(function(r){return r.json();}).catch(function(){return null;})
  ]).then(function(res){
    ((res[0]&&res[0].types)||[]).forEach(function(t){ BTMAP[t.code]=t; });
    BMODEL=res[1]; BDIST=res[2];
    render();
  }).catch(function(){ render(); });
