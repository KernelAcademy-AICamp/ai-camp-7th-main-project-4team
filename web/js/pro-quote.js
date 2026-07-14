  /* 견적서 페이지 — 요청 클릭 시 진입. 고객 체형진단 결과 상세(브랜드 추천 제외) + 요청 내용 + 제안.
     데이터는 pro.js가 저장한 localStorage 'fitting.pro.reqs'를 공유. 체형 상세는 data/bodytypes.json. */
  function loadLS(k, def){ try{ var v=localStorage.getItem('fitting.'+k); return v?JSON.parse(v):def; }catch(e){ return def; } }
  function saveLS(k, v){ try{ localStorage.setItem('fitting.'+k, JSON.stringify(v)); }catch(e){} }
  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function toast(m){ var t=$('toast'); t.textContent=m; t.classList.add('on'); clearTimeout(window._t); window._t=setTimeout(function(){t.classList.remove('on');},2000); }

  var idx = parseInt(new URLSearchParams(location.search).get('req'),10);
  var reqs = loadLS('pro.reqs', []);
  var profile = loadLS('pro.profile', null);
  var MY_PRICE = (profile && profile.services && profile.services[0]) ? profile.services[0].price : 120000;
  var BTMAP = {};
  var offering = false;

  /* 요청자별 임의(데모) 측정치 + 선호핏 */
  var MEASURE_BY_CUST = {
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
    online:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="12" rx="2"/><path d="M8 20h8M12 16.5v3.5"/></svg>',
    shopping:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h12l-1 13H7L6 7z"/><path d="M9 7V6a3 3 0 0 1 6 0v1"/></svg>',
    image:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13.5" r="3.3"/><path d="M8.5 7l1.3-2h4.4l1.3 2"/></svg>'
  };
  function svcMeta(s){
    if(s==='shopping') return {cls:'shopping', label:'동행 쇼핑', icon:SVC_SVG.shopping};
    if(s==='image')  return {cls:'image',  label:'이미지 컨설팅', icon:SVC_SVG.image};
    return {cls:'online', label:'온라인 스타일링', icon:SVC_SVG.online};
  }
  function svcLabel(s){ return svcMeta(s).label; }
  function svcBadge(s){ var m=svcMeta(s); return '<span class="svcbadge '+m.cls+'">'+m.icon+' '+m.label+'</span>'; }
  function stClass(s){ return s==='신규'?'nw':(s==='제안발송'?'sent':(s==='수락됨'?'prog':(s==='분쟁'?'warn':(s==='완료'?'done':'sent')))); }
  function starsRO(n){ var s=''; for(var k=1;k<=5;k++) s+='<span style="color:'+(k<=n?'#e8a13a':'#ddd')+'">★</span>'; return s; }

  /* ── 액션(상태별) ── 받은 요청: 수락/거절 · 진행 중: 완료/취소 · 보낸 제안: 응답 대기 ── */
  function actionHTML(r){
    if(r.status==='신규'){
      return '<button class="btn" onclick="accept()">수락</button>'+
             '<button class="btn ghost" style="margin-top:10px" onclick="reject()">거절</button>';
    }
    if(r.status==='제안발송'){ var o=r.offer||{};
      return '<div class="note-quote"><b style="color:var(--green)">제안 발송됨</b> · <span class="num">'+((o.price||0).toLocaleString())+'</span>원<br>'+
        '<span style="font-size:13px;color:var(--sub)">"'+esc(o.msg||'')+'"</span><br>'+
        '<span style="font-size:12.5px;color:var(--sub2)">고객 응답을 기다리는 중이에요</span></div>'+
        '<button class="btn ghost" style="margin-top:10px" onclick="simAccept()">고객 수락 · 데모</button>';
    }
    if(r.status==='수락됨'){
      var hd='<div class="note-quote"><b style="color:var(--green,#2E4A3B)">수락됨 · 진행 중</b>'+((r.offer&&r.offer.price)?' · <span class="num">'+r.offer.price.toLocaleString()+'</span>원':'')+'</div>';
      var cancel='<button class="btn ghost" style="margin-top:8px" onclick="cancelReq()">취소 처리</button>';
      // 제출 후에도 완료 전까지는 수정 가능. 결과물=사진·내용(전 서비스 공통) + 구매 상품·예산(온라인 추가)
      if(r.deliver) return hd + deliverSummary(r) +
        '<button class="btn ghost" style="margin-top:10px" onclick="editDeliver()">결과물 수정</button>'+
        '<button class="btn" style="margin-top:8px" onclick="completeReq()">완료 처리</button>' + cancel;
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
    return '';
  }
  function svcPrice(service){ if(profile&&profile.services){ var f=profile.services.filter(function(s){return s.type===service;})[0]; if(f) return f.price; } return MY_PRICE; }
  function accept(){ if(!reqs[idx].offer) reqs[idx].offer={price:svcPrice(reqs[idx].service)}; reqs[idx].status='수락됨'; saveLS('pro.reqs',reqs); render(); toast('요청을 수락했어요'); }
  function reject(){ var rs=prompt('거절 사유 (선택 입력)',''); if(rs===null) return; reqs[idx].reason=rs.trim(); reqs[idx].status='거절'; saveLS('pro.reqs',reqs); render(); toast('요청을 거절했어요'); }
  function undoReject(){ reqs[idx].status='신규'; reqs[idx].reason=''; saveLS('pro.reqs',reqs); render(); toast('거절을 되돌렸어요'); }
  function simAccept(){ reqs[idx].status='수락됨'; saveLS('pro.reqs',reqs); render(); toast(reqs[idx].cust+' 님이 제안을 수락했어요'); }
  function completeReq(){ reqs[idx].status='완료'; saveLS('pro.reqs',reqs); render(); toast('완료 처리했어요'); }
  function cancelReq(){ var rs=prompt('취소 사유 (선택 입력)',''); if(rs===null) return; reqs[idx].reason=rs.trim(); reqs[idx].status='취소'; saveLS('pro.reqs',reqs); render(); toast('진행을 취소했어요'); }
  function undoCancel(){ reqs[idx].status='수락됨'; reqs[idx].reason=''; saveLS('pro.reqs',reqs); render(); toast('취소를 되돌렸어요'); }
  /* 분쟁 소명(2.x/3.B.4) — 쇼퍼 반박 제출 → 관리자 중재 대기 */
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

  /* ── 내 체형 측정 — 마이페이지 세그먼트(5칸) 디자인 재현 ── */
  function segIdx(pct){ return Math.max(0, Math.min(4, Math.floor((pct==null?50:pct)/20))); }
  function zoneLabel(i, L, R){ return i===0?L:(i===1?L+' 편':(i===2?'표준':(i===3?R+' 편':R))); }
  function n2row(part, pct, L, R, lo){
    var idx=segIdx(pct), segs='';
    for(var i=0;i<5;i++){ var c=(i===idx)?' on':(Math.abs(i-idx)===1?' near':''); segs+='<div class="n2seg'+c+'"></div>'; }
    return '<div class="n2row'+(lo?' lo':'')+'"><div class="n2top"><span class="part">'+esc(part)+'</span><span class="zone">'+esc(zoneLabel(idx,L,R))+'</span></div>'+
      '<div class="n2segs">'+segs+'</div>'+
      '<div class="n2scale"><span>'+esc(L)+'</span><span>'+esc(R)+'</span></div></div>';
  }
  function measureCard(m, bt, r){
    return '<div class="dtl-meas">'+
      '<div class="dtl-meas-h"><span class="k">내 체형 측정</span><span class="chip">전신 · 상·하의 완료</span></div>'+
      '<div class="dtl-grp up" style="margin-top:8px">상체 — 상의 진단</div>'+
      n2row('어깨', m.top.shoulder, '좁은', '넓은', false)+
      n2row('가슴', m.top.chestFull, '슬림한', '볼륨 있는', false)+
      '<div class="dtl-grp lo">하체 — 하의 진단</div>'+
      n2row('허리', m.bottom.waist, '슬림한', '볼륨 있는', true)+
      n2row('엉덩이', m.bottom.hip, '슬림한', '볼륨 있는', true)+
      '<div class="dtl-grp pref">취향</div>'+
      n2row('핏 취향', m.prefTop, '타이트', '여유', false)+
      '<div class="dtl-note">어깨·가슴·허리·엉덩이 측정을 종합해 <b style="color:var(--ink)">'+esc(bt.name||r.bodytype||'')+'('+esc(r.type||'')+')</b> 유형으로 확정됐어요</div>'+
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
    var r = reqs[idx];
    if(!r){ $('quoteRoot').innerHTML='<p class="crumb">요청을 찾을 수 없어요.</p><p style="margin-top:10px"><a class="tinybtn" onclick="location.href=\'pro.html\'">요청 내역으로</a></p>'; return; }
    var out = r.dir==='out';
    var bt = btResolve(BTMAP[r.type], r.gender) || {};   // 고객 성별로 콘텐츠 해석
    var m = MEASURE_BY_CUST[r.cust] || MEASURE_DEFAULT;
    var profileLines = (bt.profile||[]).map(function(p){ return '<p class="bdesc">'+esc(p)+'</p>'; }).join('');

    // 왼쪽: 체형 데이터가 있으면 측정 표시, 없으면(구 데이터) 안내 플레이스홀더
    var leftCol = (out && !r.cm)
      ? '<div class="card"><div class="seclabel">고객 체형 정보</div><p class="bdesc" style="color:var(--sub)">고객이 진단 결과를 공유하면 체형 측정 정보가 여기에 표시돼요.</p></div>'
      : measureCard(m, bt, r);

    // 오른쪽 상단: 받은 요청=체형결과상세, 보낸 제안=제안 대상
    var detailCard = out
      ? '<div class="card"><div class="seclabel">제안 대상</div>'+
          '<div class="kv"><span>고객</span><b>'+esc(r.cust)+' 님</b></div>'+
          '<div class="kv"><span>상황</span><b>'+esc(r.occ||'—')+'</b></div>'+
          '<div class="kv"><span>서비스 유형</span><b>'+svcLabel(r.service)+'</b></div>'+
        '</div>'
      : '<div class="card">'+
          '<div class="seclabel">체형진단 결과 상세</div>'+
          '<div class="btname"><i style="background:'+esc(bt.point||'#ccc')+'"></i>'+esc(bt.name||r.bodytype||'')+'</div>'+
          '<div class="btsub">'+esc(bt.sizeKorea||'')+(bt.silhouette?' · '+esc(bt.silhouette)+' 실루엣':'')+' · <span class="num">'+(r.cm||'—')+'</span>cm · <span class="num">'+(r.kg||'—')+'</span>kg</div>'+
          profileLines+
        '</div>'+
        '<div class="card">'+
          '<div class="subhead">요청 내용</div>'+
          '<div class="kv"><span>서비스 유형</span><b>'+svcLabel(r.service)+'</b></div>'+
          '<div class="kv"><span>상황</span><b>'+esc(r.occ)+'</b></div>'+
          '<div class="kv"><span>예산</span><b>'+esc(r.budget)+'</b></div>'+
          '<div class="kv"><span>희망 일정</span><b>'+esc(r.date||'—')+'</b></div>'+
          '<div class="seclabel" style="margin-top:16px">한 줄 요청</div>'+
          '<div class="note-quote'+(r.note?'':' muted')+'">'+(r.note?('"'+esc(r.note)+'"'):'요청 메모 없음')+'</div>'+
        '</div>';

    $('quoteRoot').innerHTML =
      '<p class="crumb">쇼퍼 지원 · '+(out?'보낸 제안':'견적 요청')+'</p>'+
      '<h1>'+esc(r.cust)+' 님'+(r.occ?' · '+esc(r.occ):'')+'</h1>'+
      '<div class="htags">'+svcBadge(r.service)+'<span class="st '+stClass(r.status)+'">'+esc(r.status)+'</span></div>'+
      '<div class="qgrid2">'+
        '<div class="qleft">'+ leftCol +'</div>'+
        '<div class="qright">'+
          detailCard +
          '<div class="card"><div class="subhead">'+(out?'제안 현황':'제안')+'</div>'+ actionHTML(r) +'</div>'+
        '</div>'+
      '</div>';
  }

  fetch('data/bodytypes.json').then(function(r){return r.json();}).then(function(j){
    (j.types||[]).forEach(function(t){ BTMAP[t.code]=t; }); render();
  }).catch(function(){ render(); });
