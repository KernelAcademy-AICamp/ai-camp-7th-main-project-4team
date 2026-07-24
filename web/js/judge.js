/* judge.js — 구매 판정(Fit) 화면 컨트롤러. 소유: 개발자(web/js/**).
   흐름: ① 진단(fitting.dx)에서 체형 복원 → ② 상품 셀(브랜드·핏·종류) 선택 →
        ③ 판정 계산(proto=클라 garments / api=/api/judge, 해자 보호) → ④ 매트릭스+밴드 렌더.
   추천(result.js)과 같은 데이터·엔진을 쓰되, "고른 한 상품이 맞나"만 본다. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var E = window.FitEngine;

  // 표시 라벨
  var FIT_KO = { skinny: "스키니", slim: "슬림", regular: "레귤러", loose: "루즈", oversize: "오버사이즈" };
  var SIL_KO = { skinny: "스키니", slim: "슬림", straight: "스트레이트", tapered: "테이퍼드", wide: "와이드", bootcut: "부츠컷" };
  var SUBTYPE = { TOP: "long_sleeve", BOTTOM: "long_pants" };
  // body-model 키 → 엔진 부위 키 (오차·bodyVec 매핑)
  var EBMAP = { chest: "chestFull", shoulder: "shoulder", waist: "waist", hip: "hip", thigh: "thigh" };

  var state = {
    ready: false, cat: "TOP", brandId: null, fit: null,
    cm: {}, err: {}, sex: "female", exps: [], expCount: 0,
    catalog: null, gj: null  // gj=proto용 garments.json 캐시
  };

  /* ── 판정 기준(내 체형) 표시 = 마이 진단카드와 동일 유형.
     주의: fitting.user.type은 '결과 저장'(로그인) 때만 채워지고, 저장 안 하면 비거나 옛값이 남는다.
     그래서 저장 프로필로 '먼저' 표시하되(빠름), 판정 엔진이 현재 세션(fitting.dx.basic)으로 몸을
     추정하면 그 값으로 유형을 직접 분류해 '덮어쓴다'(renderMineFromSession) — 저장 여부와 무관하게
     실제 판정과 같은 소스를 보게 해 '시크 스트레이트 고정' 표기 버그를 없앤다. ── */
  function paintMine(code, gender) {
    if (!code) return;
    gender = (gender === "female") ? "female" : "male";
    function apply(t) {
      if (!t) return;
      var box = document.querySelector(".jmine");
      var b = document.querySelector(".jmine-tx b");
      var head = document.querySelector(".jmine-av .head");
      if (box && t.point) box.style.setProperty("--jtype", t.point);
      if (b) b.innerHTML = (t.name || "") + '<span class="jmine-code">' + t.code + "</span>";
      if (head) { head.classList.remove("male", "female"); head.classList.add(gender); }
    }
    if (window._jbt) { apply(window._jbt[code]); return; }
    fetch("data/bodytypes.json").then(function (r) { return r.json(); })
      .then(function (j) { window._jbt = {}; j.types.forEach(function (x) { window._jbt[x.code] = x; }); apply(window._jbt[code]); })
      .catch(function () {});
  }
  // 판정기준 유형 표시. 우선순위:
  //  1) 이번 세션 진단 정본(fitting.dxtype) — result가 착용경험까지 반영해 판정한 값(api=서버 eb 포함). 가장 정확.
  //  2) 저장된 프로필(fitting.user.type) — 로그인 저장 시.
  //  둘 다 없을 때만 basic 재분류(renderMineFromSession)로 폴백.
  function renderMine() {
    try { var d = JSON.parse(sessionStorage.getItem("fitting.dxtype") || "null"); if (d && d.code) { paintMine(d.code, d.gender); return; } } catch (e) {}
    var user = {}; try { user = JSON.parse(localStorage.getItem("fitting.user") || "{}") || {}; } catch (e) {}
    if (user.type) paintMine(user.type, user.gender);
  }
  // 폴백: 진단 정본이 없을 때만 현재 세션 basic로 직접 분류. 정본이 있으면 덮지 않는다
  // (judge는 키·몸무게만 보므로 착용경험 보정이 빠져 정본과 어긋날 수 있음 → 정본 우선).
  function renderMineFromSession(basic) {
    try { var d = JSON.parse(sessionStorage.getItem("fitting.dxtype") || "null"); if (d && d.code) return; } catch (e) {}
    if (!basic || !window.FitBodyType) return;
    var code = FitBodyType.classify({
      gender: state.sex, heightCm: basic.height, weightKg: basic.weight,
      chestFull: state.cm.chestFull, chestUpper: state.cm.chestUpper,
      waist: state.cm.waist, hip: state.cm.hip,
    });
    if (code) paintMine(code, state.sex);
  }

  /* ── 부팅: 체형 복원 ─────────────────────────────────────── */
  function boot() {
    renderMine();   // 판정 기준 유형 = 마이 진단결과와 일치
    var payload = readJSON("fitting.dx", {});
    var basic = payload.basic || readJSON("fitting.basic", {});
    state.exps = Array.isArray(payload.experiences) ? payload.experiences : [];
    state.expCount = state.exps.length;

    // ?nodx=1 = 진단 없음 미리보기(세션 유지 → 진단 왕복해도 없는 상태 그대로). ?nodx=0 = 해제.
    try { var qs = location.search || ""; if (/[?&]nodx=1/.test(qs)) sessionStorage.setItem(NODX_KEY, "1"); else if (/[?&]nodx=0/.test(qs)) sessionStorage.removeItem(NODX_KEY); } catch (e) {}
    var forceNoDx = false; try { forceNoDx = sessionStorage.getItem(NODX_KEY) === "1"; } catch (e) {}
    if (!window.BodyModel) return fail("체형 엔진을 불러오지 못했어요.");

    // 화면부터 즉시 렌더 — 체형 모델은 뒤에서 로드(진입 시 '불러오는 중' 깜빡임 제거).
    // 판정하기는 refreshRun의 state.ready 게이팅으로 모델 준비 전까지 잠겨 있어 안전.
    var hasBasic = !!(basic && basic.height && basic.weight);
    $("jloading").hidden = true;
    if (forceNoDx || !hasBasic) showNeedDx();
    else { $("jsetup").hidden = false; showCapture(); }

    BodyModel.load().then(function () {
      if (forceNoDx || !hasBasic) return;   // 이미 '진단 필요' 화면 — 체형값 불필요
      var est = BodyModel.estimate(basic);
      if (!est || !est.ready) { showNeedDx(); return; }
      state.sex = est.sex;
      est.parts.forEach(function (p) { state.cm[p.key] = p.cm; if (p.rmse != null) state.err[p.key] = p.rmse; });
      state.ready = true;
      renderMineFromSession(basic);   // 판정기준 유형 = 이번 세션 진단 기준(저장 안 해도 일치)
      refreshRun();   // 모델 준비 완료 → 입력이 갖춰졌으면 판정하기 활성
      var back = false; try { back = sessionStorage.getItem(RETURN_KEY) === "1"; sessionStorage.removeItem(RETURN_KEY); } catch (e) {}
      if (back) restoreJudge();   // '진단 수정'에서 이전으로 돌아온 경우에만 이전 판정 복원
    }).catch(function (e) { fail("불러오는 중 문제가 생겼어요. 새로고침해 주세요."); });
  }

  /* ── 캡처 입력 → 인식 → 보정 ──────────────────────────────
     둘레 부위(가슴·허리·엉덩이·허벅지)는 garments 규약(단면)으로 저장 — 판정 시 ×2로 복원.
     라벨이 아닌 값 분포로 단면/둘레 자동판정(FLAT_MAX 초과=둘레), 사용자가 토글로 override. */
  var CIRC = { chest: 1, waist: 1, hip: 1, thigh: 1, belly: 1 };
  var FLAT_MAX = { chest: 78, waist: 70, hip: 78, thigh: 44 };
  var JUDGE_PARTS = { TOP: ["chest", "shoulder"], BOTTOM: ["waist", "hip", "thigh"] };
  // 표에 있을 때만 쓰는 보조: 상의 허리+총장 / 하의 기장(length)+밑위(rise). 세로축은 len 그대로(×2 없음)·점수 미반영(소프트).
  var JUDGE_PARTS_OPT = { TOP: ["waist", "length"], BOTTOM: ["length", "rise"] };
  // 이 보정 화면에 표시·수집할 부위 = 핵심 + 보조. forceOpt(직접입력)=보조 전부 노출(선택),
  //   아니면(캡처) 파싱된 표에 실제로 있는 보조만.
  function correctParts(sizes, forceOpt) {
    var opt = (JUDGE_PARTS_OPT[state.cat] || []).filter(function (p) {
      return forceOpt || (sizes || []).some(function (s) { return s.values && s.values[p] != null; });
    });
    return JUDGE_PARTS[state.cat].concat(opt);
  }
  function isOptPart(p) { return (JUDGE_PARTS_OPT[state.cat] || []).indexOf(p) >= 0; }
  function koP(p) { return (E.partKo && E.partKo[p]) || p; }
  function toFlat(part, val, ov) {
    if (val == null || val === "") return null;
    val = +val; if (isNaN(val)) return null;
    if (!CIRC[part]) return val;                        // 너비·길이는 그대로
    var circ = ov === "circ" ? true : ov === "flat" ? false : val > (FLAT_MAX[part] || 78);
    return circ ? Math.round(val / 2 * 10) / 10 : val;  // 둘레면 단면으로
  }

  function setCat(cat) {
    state.cat = cat; state.basis = null;
    document.querySelectorAll(".jseg-b").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-cat") === cat); });
  }
  // 사이즈표 넣기 탭(캡처 업로드 ↔ 직접 입력) 활성 표시 동기화
  function markTab(mode) { document.querySelectorAll(".jtab").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-tab") === mode); }); }
  function showCapture() { showJudging(false); $("jcap").hidden = false; $("jcorrect").hidden = true; var m = $("jmiss"); if (m) m.hidden = true; var r = $("jrun"); if (r) r.disabled = true; state.parsed = null; state.manual = false; markTab("capture"); }

  // 붙여넣기/드롭/파일 → dataURL → 인식
  function onImageFile(file) {
    if (!state.ready) return;   // 진단 없는 사용자는 업로드 자체 차단(클릭·드롭·붙여넣기 공통 경로)
    if (!file || file.type.indexOf("image") !== 0) return;
    var r = new FileReader(); r.onload = function () { parseImage(r.result); }; r.readAsDataURL(file);
  }
  function parseImage(dataUrl) {
    state.capture = dataUrl; state.parsed = null; state.basis = null;
    $("jcap").hidden = true; $("jcorrect").hidden = false;
    $("jcorrect").classList.remove("man");                          // 캡처 모드: 썸네일·다시올리기 노출
    var ru = $("jreupload"); if (ru) ru.hidden = false;
    var th = $("jcapthumb"); if (th) { th.src = dataUrl; th.hidden = false; }
    $("jparsehint").innerHTML = "<span class='jspin-sm'></span>사이즈표를 읽는 중…"; $("jparsetable").innerHTML = ""; $("jrun").disabled = true; setParsing(true);   // 인식 로딩 = 왼쪽(사진 올린 자리) + 입력 잠금
    if (!(window.FDATA && FDATA.parseSizeTable)) return parseUnavailable();
    FDATA.parseSizeTable(dataUrl, state.cat).then(function (resp) {   // 로컬 데모: 고른 옷 종류에 맞는 샘플 표를 받음
      if (!resp) return parseUnavailable();
      if (resp.error || !resp.parsed) return parseFailed();
      onParsed(resp.parsed);
    }).catch(function () { parseFailed(); });
  }
  // 판정 중 = 결과 카드 자리(플레이스홀더 히어로)를 카드 뒷면 로딩으로 교체.
  // 결과가 오면 #jresult의 #jflip이 같은 자리·같은 뒷면에서 그대로 뒤집혀 크기 점프가 없다.
  // 사이즈표 인식 중 = 입력 카드 잠금(분석 도중 옷 종류·탭·재업로드 조작 방지)
  function setParsing(on) { var c = document.querySelector(".jcard"); if (c) c.classList.toggle("parsing", !!on); }
  function showJudging(on) {
    var lc = $("jloadcard"), hero = $("jghhero"), aside = $("jaside");
    if (lc) lc.hidden = !on;
    if (hero) hero.hidden = !!on;
    if (aside) aside.classList.toggle("judging", !!on);   // 아래 골격도 함께 반짝임(위만 도는 어색함 방지)
  }
  function parseUnavailable() { setParsing(false); $("jparsehint").innerHTML = "이 환경에선 자동 인식이 안 돼요. <a class='jlink' data-act='manual'>직접 입력</a>으로 진행하세요."; }
  function parseFailed() { setParsing(false); $("jparsehint").innerHTML = "표를 못 읽었어요. 더 또렷한 캡처로 다시 하거나 <a class='jlink' data-act='manual'>직접 입력</a>하세요."; }

  function onParsed(p) {
    setParsing(false);
    state.parsed = p;
    // 옷 종류는 사용자가 고른 상의/하의가 기준 — 자동 인식이 이를 덮어쓰지 않음(하의 선택이 상의로 튕기던 버그)
    if (p.tableKind === "body_range") {
      $("jparsehint").innerHTML = "<b class='w'>이건 신체 권장범위표예요.</b> 옷 실측표(단면·기장)를 올려주세요 — 못 입어보는 옷의 실제 치수가 필요해요.";
      $("jparsetable").innerHTML = ""; $("jrun").disabled = true; return;
    }
    var warn = p.truncated ? " <span class='w'>일부 사이즈가 가려졌어요 — 구매하는 사이즈가 없으면 다시 캡처해주세요.</span>" : "";
    $("jparsehint").innerHTML = "읽었어요 · <b>구매할 사이즈</b> 값이 맞는지 확인해주세요" + warn;
    renderCorrect(p.sizes || [], false);
  }

  // 보정 UI(둘 다 .jsl/.jce/.jbz 훅 유지 → buildCell 공용):
  //   직접입력 = 한 사이즈 '세로 폼' / 캡처 = 읽은 사이즈 '칩 요약 + 사이즈별 카드'(전 사이즈 판정)
  function renderCorrect(sizes, editableLabel) {
    var parts = correctParts(sizes, editableLabel);   // 직접입력이면 보조(허리)도 선택칸으로 노출
    var circParts = parts.filter(function (x) { return CIRC[x]; });
    var circPart = circParts[0];
    if (state.basis == null && circPart) {
      var vals = sizes.map(function (s) { return s.values ? s.values[circPart] : null; }).filter(function (v) { return v != null; });
      var mx = vals.length ? Math.max.apply(null, vals) : 0;
      state.basis = mx > (FLAT_MAX[circPart] || 78) ? "circ" : "flat";
    }
    var basisCtl = circPart
      ? "<div class='jbasis'><span class='jbasis-l'>" + circParts.map(koP).join("·") + " 값은</span>" +
        "<button class='jbz " + (state.basis === "flat" ? "on" : "") + "' data-b='flat'>단면</button>" +
        "<button class='jbz " + (state.basis === "circ" ? "on" : "") + "' data-b='circ'>둘레</button>" +
        "<span class='jbasis-n'>표에 적힌 그대로가 단면(반접어 잰 값)인지 둘레인지 골라주세요</span></div>" : "";
    var body = editableLabel ? manualForm(sizes[0] || {}, parts) : captureCards(sizes, parts);
    $("jparsetable").innerHTML = basisCtl + body;
    refreshRun();   // 무조건 활성 대신 입력값 검증(핵심 부위 값이 있어야 판정 가능)
  }
  // 직접 입력 — 한 사이즈, 부위마다 라벨 단 세로 입력(표 아님)
  function manualForm(size, parts) {
    var out = "<div class='jform'>" +
      "<div class='jf-line'><span class='jf-k'>사이즈</span><input class='jsl jf-in jf-sz' data-i='0' placeholder='예: M' value='" + esc(size.label || "") + "'></div>";
    parts.forEach(function (pt) {
      var v = size.values ? size.values[pt] : null;
      out += "<div class='jf-line'><span class='jf-k'>" + koP(pt) + (isOptPart(pt) ? " <span class='jopt'>선택</span>" : "") + "</span>" +
        "<input class='jce jf-in' data-i='0' data-p='" + pt + "' inputmode='decimal' value='" + (v == null ? "" : esc(v)) + "'>" +
        "<span class='jf-u'>cm</span></div>";
    });
    return out + "</div>";
  }
  // 캡처 후 — 읽은 사이즈표를 그대로 표로(행=사이즈, 열=부위). 업로드한 표와 같은 모양이라 확인·수정이 직관적
  function captureCards(sizes, parts) {
    var head = "<tr><th>사이즈</th>" + parts.map(function (pt) {
      return "<th>" + koP(pt) + (isOptPart(pt) ? " <span class='jopt'>선택</span>" : "") + "<span class='jctab-u'>cm</span></th>";
    }).join("") + "</tr>";
    var rows = sizes.map(function (s, i) {
      var cells = parts.map(function (pt) {
        var v = s.values ? s.values[pt] : null;
        return "<td><input class='jce' data-i='" + i + "' data-p='" + pt + "' inputmode='decimal' value='" + (v == null ? "" : esc(v)) + "'></td>";
      }).join("");
      return "<tr><td class='sl'><input class='jsl' data-i='" + i + "' value='" + esc(s.label || "") + "' placeholder='#" + (i + 1) + "'></td>" + cells + "</tr>";
    }).join("");
    return "<div class='jctab-wrap'><table class='jctab'>" + head + rows + "</table></div>";
  }

  // 판정 가능 여부 = 핵심 부위(JUDGE_PARTS) 값이 최소 하나 유효하게 입력됨. 캡처·직접입력 공통.
  function hasJudgeValue() {
    var core = JUDGE_PARTS[state.cat] || [], ok = false;
    document.querySelectorAll(".jce").forEach(function (el) {
      if (core.indexOf(el.getAttribute("data-p")) < 0) return;
      var v = el.value; if (v != null && String(v).trim() !== "" && !isNaN(+v) && +v > 0) ok = true;
    });
    return ok;
  }
  function brandFilled() { var b = $("jbrandin"); return !b || b.value.trim() !== ""; }   // 브랜드 필수(입력칸 없으면 통과)
  function refreshRun() { var r = $("jrun"); if (r) r.disabled = !(state.ready && hasJudgeValue() && brandFilled()); }   // 진단(state.ready) 없으면 판정 불가
  // 판정 후 입력부를 '사용됨'으로 흐리게 + 판정버튼 비활성. 결과 중엔 왼쪽 잠금(다른 옷 판정하기로만 해제).
  function setJudged(on) {
    var m = document.querySelector(".jsetup-main"); if (m) m.classList.toggle("judged", !!on);
    state.judged = !!on;
    if (on) { var r = $("jrun"); if (r) r.disabled = true; } else refreshRun();
  }
  // 다른 옷 판정하기 = 입력 내역 전부 초기화(브랜드·상품명·사이즈표·동의) 후 캡처 업로드로 복귀
  function resetJudge() {
    $("jresult").hidden = true; var fl = $("jflip"); if (fl) fl.classList.remove("on");
    var aside = $("jaside"); if (aside) aside.hidden = false;
    ["jbrandin", "jprodin"].forEach(function (id) { var el = $(id); if (el) el.value = ""; });
    var cs = $("jconsent"); if (cs) cs.checked = false;
    var sm = $("jsharemsg"); if (sm) { sm.hidden = true; sm.textContent = ""; }
    var pt = $("jparsetable"); if (pt) pt.innerHTML = "";
    state.lastCell = null;                                           // 체형 오차(state.err)는 진단값이라 보존
    try { sessionStorage.removeItem(SNAP_KEY); } catch (e) {}         // 초기화하면 복원 스냅샷도 폐기
    setJudged(false); showCapture();                                 // showCapture가 parsed/manual/버튼 리셋
    var cl = $("jcolsload");                                          // 리셋 = 2단 전체 덮는 로딩(결과 패널만 도는 어색함 방지)
    if (cl) { cl.hidden = false; setTimeout(function () { cl.hidden = true; }, 550); }
    var card = document.querySelector(".jcard");                      // 리셋 후 왼쪽 입력으로 부드럽게 이동
    if (card) card.scrollIntoView({ behavior: "smooth", block: "start" }); else window.scrollTo(0, 0);
  }

  /* 진단 수정 왕복 복원 — 판정 결과를 두고 '진단 수정'에 다녀와도(이전) 그 판정으로 되돌아오게 */
  var SNAP_KEY = "fitting.judge.snap", RETURN_KEY = "fitting.judge.return", NODX_KEY = "fitting.judge.nodx";
  function snapshotInputs() {                                         // 현재 입력표(라벨+부위값)를 그대로 직렬화(사용자 수정분 보존)
    var rows = {};
    document.querySelectorAll(".jsl").forEach(function (el) { var i = +el.getAttribute("data-i"); (rows[i] = rows[i] || { values: {} }).label = el.value; });
    document.querySelectorAll(".jce").forEach(function (el) { var i = +el.getAttribute("data-i"); (rows[i] = rows[i] || { values: {} }).values[el.getAttribute("data-p")] = el.value; });
    return Object.keys(rows).sort(function (a, b) { return a - b; }).map(function (k) { return { label: rows[k].label || "", values: rows[k].values }; });
  }
  function saveJudgeSnapshot() {
    try {
      sessionStorage.setItem(SNAP_KEY, JSON.stringify({
        cat: state.cat, basis: state.basis, manual: !!state.manual,
        brand: ($("jbrandin") && $("jbrandin").value) || "", product: ($("jprodin") && $("jprodin").value) || "",
        sizes: snapshotInputs()
      }));
    } catch (e) {}
  }
  function restoreJudge() {                                           // 부팅 때 복귀 표식+스냅샷 있으면 그 판정 재현
    var snap; try { snap = JSON.parse(sessionStorage.getItem(SNAP_KEY) || ""); } catch (e) {}
    if (!snap || !snap.sizes || !snap.sizes.length) return false;
    setCat(snap.cat); state.basis = snap.basis || null;
    var bi = $("jbrandin"); if (bi) bi.value = snap.brand || "";
    var pi = $("jprodin"); if (pi) pi.value = snap.product || "";
    state.parsed = { sizes: snap.sizes };
    if (snap.manual) { showManual(); renderCorrect(snap.sizes, true); }
    else {                                                            // 캡처 파싱 상태 흉내(썸네일 이미지는 저장 안 하므로 숨김)
      $("jcap").hidden = true; $("jcorrect").hidden = false; state.manual = false; markTab("capture");
      $("jcorrect").classList.remove("man");
      var th = $("jcapthumb"); if (th) { th.hidden = true; th.src = ""; }
      var ru = $("jreupload"); if (ru) ru.hidden = true;
      $("jparsehint").innerHTML = "이전 판정을 불러왔어요 · 값을 확인하고 다시 판정할 수 있어요";
      renderCorrect(snap.sizes, false);
    }
    run();                                                            // 저장된 값으로 판정 재계산 → 이전 결과 화면 복원
    return true;
  }

  function showManual() {
    $("jcap").hidden = true; $("jcorrect").hidden = false; $("jmiss").hidden = true;
    state.manual = true; markTab("manual");
    $("jcorrect").classList.add("man");                             // 직접입력: 이미지 없음(썸네일·다시올리기 숨김)
    var th = $("jcapthumb"); if (th) th.hidden = true;
    var ru = $("jreupload"); if (ru) ru.hidden = true;
    state.parsed = { sizes: [{ label: "" }] }; state.basis = "flat";
    $("jparsehint").innerHTML = "구매하는 <b>사이즈</b>와 <b>" + JUDGE_PARTS[state.cat].map(koP).join("·") + "</b> 치수를 적어주세요";
    renderCorrect(state.parsed.sizes, true);
  }

  // 보정값 → 셀(garments 규약: 단면). 렌더된 입력(핵심+보조)을 그대로 읽음.
  function readLabel(i) {
    var el = document.querySelector(".jsl[data-i='" + i + "']");
    return el ? (el.value != null ? el.value : el.textContent) : "";
  }
  function buildCell() {
    var brand = ($("jbrandin") && $("jbrandin").value || "").trim();
    var prod = ($("jprodin") && $("jprodin").value || "").trim();
    state.meta = { brand: brand, product: prod };
    var rows = {};
    document.querySelectorAll(".jce").forEach(function (el) {
      var i = +el.getAttribute("data-i"), pt = el.getAttribute("data-p");
      (rows[i] = rows[i] || { i: i })[pt] = el.value;
    });
    return Object.keys(rows).map(function (k) {
      var r = rows[k], g = {};
      Object.keys(r).forEach(function (pt) {                              // 렌더된 부위(핵심+보조) 전부
        if (pt === "i") return;
        var f = toFlat(pt, r[pt], CIRC[pt] ? state.basis : null); if (f != null) g[pt] = f;
      });
      return {
        category: state.cat, brandId: "user", brandName: brand || "내가 입력", product: prod || null, gender: "unisex",
        fitLine: "regular", silhouette: "straight", subtype: SUBTYPE[state.cat],
        sizeLabel: (readLabel(r.i) || "#" + (r.i + 1)).trim(), sizeOrder: r.i, garmentCm: g
      };
    }).filter(function (row) { return Object.keys(row.garmentCm).length; });
  }

  /* ── 판정 계산 ──────────────────────────────────────────── */
  function errForEngine() {
    var e = {};
    Object.keys(EBMAP).forEach(function (k) { var bmk = EBMAP[k]; if (state.err[bmk] != null) e[k] = state.err[bmk]; });
    // 세로축 오차 — 상의 총장=등길이 / 하의 기장=다리가쪽길이, 하의 밑위=몸밑위.
    var lenKey = state.cat === "BOTTOM" ? "legOuter" : "backLength";
    if (state.err[lenKey] != null) e.length = state.err[lenKey];
    if (state.cat === "BOTTOM" && state.err.bodyRise != null) e.rise = state.err.bodyRise;
    return e;
  }
  function run() {
    var cell = buildCell();
    if (!cell.length) return showMiss("판정할 값이 없어요. 구매하는 사이즈의 치수를 채워주세요.");
    state.lastCell = cell;
    $("jrun").disabled = true;
    showJudging(true);   // 판정 시작 → 결과 카드 자리에 카드 뒷면 로딩(결과 오면 그대로 뒤집힘)
    var canvas = $("jaside");   // 판정 누른 순간 결과 캔버스로 스크롤 → '판정 중' 로딩이 바로 보이게(버튼이 아래라 안 보이던 문제)
    if (canvas) canvas.scrollIntoView({ behavior: "smooth", block: "center" });
    computeJudgment({ category: state.cat, sex: state.sex, cm: state.cm, experiences: state.exps, errors: errForEngine(), cell: cell })
      .then(function (j) { showJudging(false); $("jrun").disabled = false; if (!j) return showMiss(); render(j); saveJudgeSnapshot(); var cs = $("jconsent"); if (cs && cs.checked) submitGarment(); })
      .catch(function () { showJudging(false); $("jrun").disabled = false; showMiss(); });
  }
  // api=서버(/api/judge, cell 전달·실측 비노출) / proto=클라 로컬(garments로 역산 + 캡처셀 판정)
  function computeJudgment(q) {
    if (window.FDATA && FDATA.mode === "api") {
      return FDATA.judge(q).then(function (resp) { return (resp && resp.covered) ? resp.judgment : null; });
    }
    return loadGarments().then(function (specs) {
      var eb = specs && E.bodyFromExperiences ? E.bodyFromExperiences(q.experiences, specs) : {};
      var mcm = {}; Object.keys(q.cm).forEach(function (k) { mcm[k] = q.cm[k]; });
      Object.keys(EBMAP).forEach(function (k) { if (eb[k] != null) mcm[EBMAP[k]] = eb[k]; });
      var bodyVec = q.category === "BOTTOM"
        ? { waist: mcm.waist, hip: mcm.hip, thigh: mcm.thigh, length: mcm.legOuter, rise: mcm.bodyRise }  // length=다리가쪽길이(기장), rise=몸밑위
        : { chest: mcm.chestFull, shoulder: mcm.shoulder, waist: mcm.waist, length: mcm.backLength };     // length=등길이(총장)
      var res = E.judge(bodyVec, q.cell, { errors: q.errors, category: q.category });
      return new Promise(function (r) { setTimeout(function () { r(res); }, 650); });   // 로컬: '판정 진행 중' 오버레이 보이게 짧은 지연(실제 api는 원래 시간 걸림)
    });
  }
  function loadGarments() {
    if (state.gj) return Promise.resolve(state.gj);
    return fetchJSON("data/garments.json").then(function (g) { state.gj = (g && g.specs) || null; return state.gj; })
      .catch(function () { return null; });
  }

  /* ── 렌더 ───────────────────────────────────────────────── */
  var PILLCLS = { TIGHT: "tight", SNUG: "snug", RELAXED: "relax", BIG: "big" };
  function render(j) {
    var pickSize = j.pick, sizes = j.sizes || [];
    var pick = sizes.filter(function (s) { return s.sizeLabel === pickSize; })[0] || sizes[0];

    // B 게이지 요약(결론) — 원형 게이지 채움=FIT점수, 가운데=추천 사이즈
    var unknown = !!(pick && pick.verdict && pick.verdict.unknown);
    var warn = !j.anyFit || unknown || (pick && pick.verdict && ["TIGHT", "BORDERLINE"].indexOf(pick.verdict.label) >= 0);
    var head = pick ? pick.verdict.ko : "판정할 수 없어요";
    var score = pick && pick.fitScore != null ? pick.fitScore : 0;
    var vlabel = pick && pick.verdict ? pick.verdict.label : "";
    var deg = Math.max(0, Math.min(100, score));
    var accCol = warn ? "var(--warn)" : "var(--g)";
    // say(2줄) = 구매 결정 가이드 (1줄 verdict과 역할 분리)
    var say = (unknown || !j.anyJudged)
        ? "판정에 필요한 " + (JUDGE_PARTS[state.cat] || []).map(koP).join("·") + " 치수가 표에 없어요"
      : !j.anyFit ? "다른 핏이나 브랜드를 보는 게 좋을 것 같아요"
      : warn ? "다른 핏이나 브랜드를 보는 게 좋을 것 같아요"
      : vlabel === "OK" ? "지금 사이즈로 사면 돼요"
      : vlabel === "BIG" ? "딱 붙는 걸 원하면 한 치수 작게도 봐요"
      : "여유로운 핏을 좋아하면 잘 맞아요";
    // 세로축(총장/기장·밑위) — 둘레 판정과 별개인 소프트 안내(#78). 점수 미반영, 요약 문장에 덧붙임.
    var isBottom = j.category === "BOTTOM";
    if (pick && pick.length && pick.length.level !== "FIT") {
      var lv = pick.length.level;
      say += isBottom
        ? (lv === "CROP" ? " · 기장 짧음" : lv === "LONG" ? " · 기장 긺" : " · 기장 많이 긺")
        : (lv === "CROP" ? " · 총장 크롭" : lv === "LONG" ? " · 총장 롱" : " · 총장 많이 긺");
    }
    if (pick && pick.rise && pick.rise.short) say += " · 밑위 짧음";
    else if (pick && pick.rise && pick.rise.shortMaybe) say += " · 밑위 짧을 수 있음";
    // 신뢰 메타 한 줄(구 신뢰도 2축을 압축)
    var expTxt = state.expCount >= 2 ? ["착용경험 " + state.expCount + "벌", "±2cm"]
               : state.expCount === 1 ? ["착용경험 1벌", "역산 일부"]
               : ["기본정보만", "±3cm 추정"];
    var missAll = uniqueMissing(sizes);
    var brandMeta = missAll.length ? (missAll.map(koPart).join("·") + " 미표기") : "브랜드 표기 미검증";
    var meta = expTxt[0] + " · " + expTxt[1] + " · " + brandMeta;
    $("jverdict").className = "jverdict rsum" + (warn ? " warn" : "");
    $("jverdict").innerHTML =
      '<div class="gg"><div class="ring" style="background:conic-gradient(' + accCol + ' 0 ' + deg + '%, var(--gl) ' + deg + '% 100%)"></div>' +
        '<div class="hole"><span class="m">' + (pick ? esc(pickSize) : "—") + '</span><span class="f">FIT ' + score + '</span></div></div>' +
      '<div class="rsum-r"><div class="rsum-vd">' + esc(head) + '</div>' +
        '<p class="rsum-say">' + say + '</p>' +
        '<div class="rsum-note">' + esc(meta) + '</div></div>';

    // 섹션 코너 배지: 판정 대상 셀 · 추천 사이즈
    $("jmxpill").textContent = cellLabel();
    $("jbandpill").textContent = pickSize ? "추천 " + pickSize : "";

    renderMatrix(j, pickSize);
    renderBands(j, pickSize);

    // 수집 opt-in 초기화(판정마다 리셋)
    state.lastPick = pickSize;
    var msg = $("jsharemsg"); if (msg) { msg.hidden = true; msg.textContent = ""; }   // 동의 체크는 판정 전에 고른 값이라 유지

    // 결과 노출 + 리빌(카드 뒷면 → 앞면 뒤집기). 아래 패널은 카드에 이어 순서대로 올라옴(띡 하고 안 바뀌게)
    var aside = $("jaside"); if (aside) aside.hidden = true;
    var rs = $("jresult");
    rs.hidden = false;
    rs.classList.remove("reveal"); void rs.offsetWidth; rs.classList.add("reveal");
    var fl = $("jflip");
    if (fl) {
      fl.classList.remove("on"); void fl.offsetWidth;
      // 판정 시작 때 이미 캔버스로 스크롤했으므로, 카드가 안 보일 때만 다시 이동(리빌 중 흔들림 방지)
      var r = fl.getBoundingClientRect(), vh = window.innerHeight || document.documentElement.clientHeight;
      if (r.top < 8 || r.bottom > vh - 8) fl.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(function () { fl.classList.add("on"); }, 240);
    } else {
      $("jresult").scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    setJudged(true);   // 입력부 흐리게 + 판정버튼 비활성
  }

  // 대안 사이즈 — 추천 기준 한 치수 작게(딱 붙는 핏)·크게(여유 핏). 인접 사이즈 없으면 숨김.
  function renderAlt(sizes, pickSize) {
    var box = $("jalt"); if (!box) return;
    var ordered = (sizes || []).slice().sort(function (a, b) { return (a.sizeOrder || 0) - (b.sizeOrder || 0); });
    var idx = -1;
    ordered.forEach(function (s, i) { if (s.sizeLabel === pickSize) idx = i; });
    var rows = [];
    if (idx > 0) { var sm = ordered[idx - 1]; rows.push({ sz: sm.sizeLabel, t: "딱 붙는 핏", d: sm.verdict ? sm.verdict.ko : "한 치수 작게" }); }
    if (idx >= 0 && idx < ordered.length - 1) { var lg = ordered[idx + 1]; rows.push({ sz: lg.sizeLabel, t: "여유 있는 핏", d: lg.verdict ? lg.verdict.ko : "한 치수 크게" }); }
    if (!rows.length) { box.hidden = true; box.innerHTML = ""; return; }
    box.hidden = false;
    box.innerHTML = '<div class="jalt-h">다른 핏으로 입고 싶다면</div>' +
      rows.map(function (r) {
        return '<div class="jalt-row"><span class="jalt-sz">' + esc(r.sz) + '</span>' +
          '<span class="jalt-tx"><b>' + esc(r.t) + '</b> — ' + esc(r.d) + '</span></div>';
      }).join("");
  }

  function submitGarment() {
    if (!(window.FDATA && FDATA.submitGarment) || !state.lastCell) return;
    var sub = $("jsubmit"), msg = $("jsharemsg");
    if (sub) sub.disabled = true;
    var m = state.meta || {};
    FDATA.submitGarment({
      brand: m.brand || null, product: m.product || null, category: state.cat, unit: "cm",
      chestBasis: state.basis || null, sizes: state.lastCell,
      parsedRaw: (state.parsed && state.parsed.sizes && !state.manual) ? state.parsed : null,
      source: state.manual ? "manual" : "capture", confirmedSize: state.lastPick || null, consent: true
    }).then(function (ok) {
      if (msg) { msg.hidden = false; msg.textContent = ok ? "고마워요 — 검수 후 반영돼요." : "지금은 저장되지 않았어요(데모)."; }
    });
  }

  // 실제 판정된 부위(핵심 + 표에 있던 보조 = 허리 등). 렌더가 CAT_PARTS만 보면 보조를 빼먹음.
  function judgedParts(category, sizes) {
    var core = (E.catParts && E.catParts[category]) || [];
    var seen = {};
    (sizes || []).forEach(function (s) { (s.parts || []).forEach(function (p) { if (core.indexOf(p.part) < 0) seen[p.part] = 1; }); });
    return core.concat(Object.keys(seen));
  }

  function renderMatrix(j, pickSize) {
    var sizes = j.sizes || [];
    var parts = judgedParts(j.category, sizes);
    // 헤더
    var head = "<thead><tr><th></th>" + sizes.map(function (s) {
      return '<th class="' + (s.sizeLabel === pickSize ? "pick" : "") + '">' + esc(s.sizeLabel) + "</th>";
    }).join("") + "</tr></thead>";
    // 부위별 행
    var rows = parts.map(function (part) {
      var anyMiss = sizes.some(function (s) { return s.missing.indexOf(part) >= 0; });
      var cells = sizes.map(function (s) {
        var isPick = s.sizeLabel === pickSize ? " pickcol" : "";
        var pj = s.parts.filter(function (p) { return p.part === part; })[0];
        if (!pj) return '<td class="' + isPick.trim() + '"><span class="fp na">—</span></td>';
        var cls = PILLCLS[pj.rating] || "na";
        if (pj.borderline) cls = "brd";
        var label = pj.borderline ? "아슬" : pj.fit;
        return '<td class="' + isPick.trim() + '"><span class="fp ' + cls + '">' + esc(label) + "</span></td>";
      }).join("");
      return "<tr><th>" + koPart(part) + (anyMiss ? ' <span style="font-weight:600;color:var(--sub2);font-size:11px">미표기</span>' : "") + "</th>" + cells + "</tr>";
    }).join("");
    $("jmatrix").innerHTML = head + "<tbody>" + rows + "</tbody>";

    var miss = uniqueMissing(sizes);
    $("jmxnote").innerHTML = miss.length
      ? "<b>" + esc(miss.map(koPart).join("·")) + "</b>은 이 브랜드가 사이즈표에 적지 않아 어느 사이즈도 판정할 수 없어요."
      : "";
  }

  // 자세히 = 사이즈 토글 + 체형 위 옷 테두리(바디핏). 기본 선택 = 추천 사이즈.
  function renderBands(j, pickSize) {
    $("jbandHead").textContent = "자세히 알고 싶다면";
    var sizes = (j.sizes || []).slice().sort(function (a, b) { return (a.sizeOrder || 0) - (b.sizeOrder || 0); });
    state.fitSizes = sizes; state.fitCat = j.category; state.fitPick = pickSize;
    if (!sizes.length) { $("jbands").innerHTML = ""; return; }
    var tog = sizes.map(function (s) {
      var rec = s.sizeLabel === pickSize;
      return '<button data-bfsz="' + esc(s.sizeLabel) + '">' + (rec ? '<span class="jbf-rec">추천</span>' : "") + esc(s.sizeLabel) + "</button>";
    }).join("");
    $("jbands").innerHTML =
      '<div class="jbf-tog" id="jbftog">' + tog + "</div>" +
      '<div class="jbf-say" id="jbfsay"></div>' +
      '<div class="bf"><div class="bf-fig" id="jbffig"></div><div class="bf-leg" id="jbfleg"></div></div>' +
      '<div class="jbf-key"><span class="jbf-kg"></span> 초록선 = 추천 옷 <span class="jbf-sep">|</span> <span class="jbf-kb"></span> 회색 = 내 몸 <span class="jbf-sep">|</span> <b>여유</b> = 옷이 내 몸보다 큰 정도(+뜸 / −낌)</div>';
    drawBodyFit(pickSize);   // 기본 = 추천 사이즈 고정
  }
  // 선택한 사이즈가 내 몸에 어떻게 걸리는지 그림·범례 갱신
  function drawBodyFit(sizeLabel) {
    var sizes = state.fitSizes || [], cat = state.fitCat;
    var size = sizes.filter(function (s) { return s.sizeLabel === sizeLabel; })[0];
    if (!size) return;
    var parts = judgedParts(cat, [size]).map(function (part) {
      var pj = (size.parts || []).filter(function (p) { return p.part === part; })[0];
      if (!pj) return null;
      return { key: part, ko: koPart(part), ease: Math.round(pj.easeCm),
               fit: pj.borderline ? "아슬" : pj.fit,
               tight: (pj.rating === "TIGHT") || !!pj.borderline,
               big: pj.rating === "BIG", snug: pj.rating === "SNUG" };
    }).filter(Boolean);
    var r = bodyFitSVG(cat, parts);
    var fig = $("jbffig"), leg = $("jbfleg"), say = $("jbfsay");
    if (fig) fig.innerHTML = r.svg;
    if (leg) leg.innerHTML = r.legend;
    if (say) {
      var isPick = sizeLabel === state.fitPick;
      // '다른 핏' 라이팅: {사이즈} {핏 유형} — {한줄 이유}
      var tightP = parts.filter(function (p) { return p.tight; });
      var fitType, reason;
      if (tightP.length) {
        var worst = tightP.reduce(function (a, b) { return b.ease < a.ease ? b : a; });
        fitType = "딱 붙는 핏"; reason = worst.ko + josaGa(worst.ko) + " 끼어요";
      } else if (parts.length && parts.every(function (p) { return p.big; })) {
        fitType = "넉넉한 핏"; reason = "넉넉하게 맞아요";
      } else if (parts.some(function (p) { return p.big || p.ease >= 4; })) {
        fitType = "여유 있는 핏"; reason = "여유 있게 맞아요";
      } else {
        fitType = "딱 맞는 핏"; reason = "딱 맞아요";
      }
      say.innerHTML = '<b>' + esc(sizeLabel) + "</b>" +
        '<span class="jbf-ft">' + fitType + "</span>" +
        '<span class="jbf-rs">— ' + esc(reason) + "</span>" +
        (isPick ? '<span class="jbf-recl">추천</span>' : "");
    }
    var tog = $("jbftog");
    if (tog) Array.prototype.forEach.call(tog.querySelectorAll("button"), function (b) {
      b.classList.toggle("on", b.getAttribute("data-bfsz") === sizeLabel);
    });
  }

  // 판정 데이터 → 체형(회색) 위에 추천 옷 테두리(초록). 부위별 여유만큼 밖으로, 끼임이면 안쪽(빨강).
  function bodyFitSVG(category, parts) {
    var G = "#2E4A3B", R = "#B0553F", FILL = "#E4E3DE";
    function off(e) { return Math.max(-9, Math.min(14, e * 2.1)); }
    function dc(t) { return t ? R : G; }
    var map = {}; parts.forEach(function (p) { map[p.key] = p; });
    var GS = parts.some(function (p) { return p.tight; }) ? R : G;
    // 데이터에 있는 부위만 점 — 없는 부위(예: 허리 미표기)엔 점 안 찍음
    function dot(k, cx, cy) { return map[k] ? '<circle cx="' + cx + '" cy="' + cy + '" r="4.5" fill="' + dc(map[k].tight) + '" stroke="#fff" stroke-width="2"/>' : ""; }
    var svg, order;
    if (category === "BOTTOM") {
      var w = off((map.waist || {}).ease || 0), h = off((map.hip || {}).ease || 0), t = off((map.thigh || {}).ease || 0);
      // 힙은 곡선(Q)으로 부드럽게 — 여유 크면 꼭짓점이 뾰족해지던 문제 해결. 밑단 왼쪽 좌표는 (72-t)로(다리 바깥과 일치, 이전엔 힙 좌표 50-h를 잘못 써서 왼쪽으로 삐침).
      svg = '<svg viewBox="0 0 200 280">' +
        '<path d="M70 24 L130 24 L144 78 L128 262 L106 262 L100 120 L94 262 L72 262 L56 78 Z" fill="' + FILL + '"/>' +
        '<path d="M' + (70 - w) + ' 20 L' + (130 + w) + ' 20 ' +
          'Q' + (150 + h) + ' 80 ' + (128 + t) + ' 250 ' +
          'L106 250 L100 122 L94 250 ' +
          'L' + (72 - t) + ' 250 ' +
          'Q' + (50 - h) + ' 80 ' + (70 - w) + ' 20 Z" fill="none" stroke="' + GS + '" stroke-width="2.4" stroke-linejoin="round"/>' +
        '<line x1="' + (72 - t) + '" y1="250" x2="98" y2="250" stroke="' + GS + '" stroke-width="2.4"/>' +
        '<line x1="102" y1="250" x2="' + (128 + t) + '" y2="250" stroke="' + GS + '" stroke-width="2.4"/>' +
        dot("waist", 132, 44) + dot("hip", 148, 82) + dot("thigh", 127, 150) +
        '</svg>';
      order = ["waist", "hip", "thigh"];
    } else {
      var sh = off((map.shoulder || {}).ease || 0), ch = off((map.chest || {}).ease || 0), ws = off((map.waist || {}).ease || 0);
      var SH = 46, CH = 40, WS = 36;
      svg = '<svg viewBox="0 0 200 250">' +
        '<circle cx="100" cy="30" r="20" fill="' + FILL + '"/>' +
        '<path d="M100 50 L112 58 L' + (100 + SH) + ' 64 L' + (100 + CH) + ' 92 L' + (100 + WS) + ' 196 Q100 206 ' + (100 - WS) + ' 196 L' + (100 - CH) + ' 92 L' + (100 - SH) + ' 64 L88 58 Z" fill="' + FILL + '"/>' +
        '<path d="M100 47 L114 56 L' + (100 + SH + sh) + ' 62 L' + (100 + CH + ch) + ' 90 L' + (100 + WS + ws) + ' 204 Q100 216 ' + (100 - WS - ws) + ' 204 L' + (100 - CH - ch) + ' 90 L' + (100 - SH - sh) + ' 62 L86 56 Z" fill="none" stroke="' + GS + '" stroke-width="2.4" stroke-linejoin="round"/>' +
        dot("shoulder", 100 - SH, 66) + dot("chest", 100 + CH, 112) + dot("waist", 100 + WS, 176) +
        '</svg>';
      order = ["shoulder", "chest", "waist"];
    }
    var leg = order.filter(function (k) { return map[k]; }).map(function (k) {
      var p = map[k], sign = p.ease >= 0 ? "+" : "";
      return '<div class="bf-item"><div class="bf-item-top"><span class="bf-dot" style="background:' + dc(p.tight) + '"></span>' +
        '<b>' + esc(p.ko) + '</b><span class="bf-st" style="color:' + dc(p.tight) + '">' + esc(p.fit) + '</span></div>' +
        '<p class="bf-cm">여유 ' + sign + p.ease + 'cm</p></div>';
    }).join("");
    return { svg: svg, legend: leg };
  }

  // 줄자: 여유 축 [tight−span*.6 .. big+span*.6]에 zone·눈금·'나' 마커·오차 whisk를 %로 배치.
  function rulerHTML(part, pj, band) {
    var span = band.big - band.tight;
    var lo = band.tight - span * 0.6, hi = band.big + span * 0.6, w = hi - lo;
    function pct(v) { return Math.max(0, Math.min(100, (v - lo) / w * 100)); }
    var e = pj.easeCm, zt = pct(band.tight), zs = pct(band.snug);
    // 눈금 9개(0~100% 균등), 짝수 인덱스는 major
    var ticks = "";
    for (var i = 0; i <= 8; i++) ticks += '<i class="' + (i % 2 === 0 ? "maj" : "") + '" style="left:' + (i * 12.5) + '%"></i>';
    // major 눈금(짝수)에 여유 cm 라벨
    var cmlab = "";
    for (var m2 = 0; m2 <= 8; m2 += 2) {
      var cv = Math.round(lo + m2 * 0.125 * w);
      var st = m2 === 0 ? "left:0" : m2 === 8 ? "right:0" : "left:" + (m2 * 12.5) + "%;transform:translateX(-50%)";
      cmlab += '<span style="' + st + '">' + (cv > 0 ? "+" + cv : cv) + "</span>";
    }
    var whisk = (pj.easeLo != null && pj.easeHi != null)
      ? '<span class="jrul-whisk" style="left:' + pct(pj.easeLo) + "%;width:" + (pct(pj.easeHi) - pct(pj.easeLo)) + '%"></span>' : "";
    var note = pj.borderline
      ? '<div class="jrul-note warn">추정 오차가 끼임 경계에 걸쳐 있어요 — 이 판정의 병목.</div>'
      : '<div class="jrul-note">' + esc(pj.fit) + (pj.easeLo != null ? " · 오차 ±" + fmt((pj.easeHi - pj.easeLo) / 2) + "cm" : "") + "</div>";
    return '<div class="jrul"><div class="jrul-hd"><span class="jrul-nm">' + koPart(part) +
      (pj.borderline ? '<span class="w">아슬</span>' : "") + '</span>' +
      '<span class="jrul-ev">여유 ' + (e >= 0 ? "+" : "") + fmt(e) + "cm</span></div>" +
      '<div class="jrul-track">' +
        '<div class="jrul-zone jz-t" style="left:0;width:' + zt + '%"></div>' +
        '<div class="jrul-zone jz-s" style="left:' + zt + "%;width:" + (zs - zt) + '%"></div>' +
        '<div class="jrul-zone jz-r" style="left:' + zs + "%;width:" + (100 - zs) + '%"></div>' +
        '<div class="jrul-znlab" style="left:2%;color:var(--warn)">끼임</div>' +
        '<div class="jrul-znlab" style="left:' + (zt + 1) + '%;color:var(--g)">딱</div>' +
        '<div class="jrul-znlab" style="left:' + (zs + 2) + '%">여유</div>' +
        '<div class="jrul-ticks">' + ticks + "</div>" +
        '<div class="jrul-cmlab">' + cmlab + "</div>" +
        whisk + '<span class="jrul-mark" style="left:' + pct(e) + '%"></span>' +
      "</div>" + note + "</div>";
  }

  /* ── 유틸 ───────────────────────────────────────────────── */
  function uniqueMissing(sizes) {
    var m = {}; (sizes || []).forEach(function (s) { (s.missing || []).forEach(function (p) { m[p] = 1; }); });
    return Object.keys(m);
  }
  function koPart(p) { return (E.partKo && E.partKo[p]) || p; }
  // 판정 대상 = 사용자가 입력한 표. 배지에 표시.
  function cellLabel() {
    var m = state.meta || {};
    if (m.brand || m.product) return [m.brand, m.product].filter(Boolean).join(" · ");
    return "내가 입력한 표";
  }
  function fmt(n) { return (Math.round(n * 10) / 10).toString(); }
  function josaGa(w) { if (!w) return "가"; var c = w.charCodeAt(w.length - 1); if (c < 0xAC00 || c > 0xD7A3) return "가"; return ((c - 0xAC00) % 28) ? "이" : "가"; }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }  // 홑따옴표 속성에도 쓰므로 ' 필수
  function readJSON(k, d) { try { return JSON.parse(sessionStorage.getItem(k) || "") || d; } catch (e) { return d; } }
  function fetchJSON(u) { return fetch(u).then(function (r) { return r.json(); }); }
  // 게이트는 자체 에디토리얼 헤드라인을 가지므로, 공통 제목/부제는 숨겨 이중 헤드라인 방지.
  function showGate() { $("jloading").hidden = true; $("jsetup").hidden = true; $("jgate").hidden = false;
    var t = document.querySelector(".jtitle"), s = $("jsub"); if (t) t.hidden = true; if (s) s.hidden = true; }
  // 진단 없는 신규 사용자 = 세팅 화면은 그대로 보여주되 ①을 '진단 시작하기' CTA로 교체, 판정은 비활성 유지
  function showNeedDx() {
    state.ready = false;
    $("jloading").hidden = true; $("jsetup").hidden = false;
    var mine = $("jmine"); if (mine) mine.hidden = true;
    var auto = $("jstepAuto"); if (auto) auto.hidden = true;
    var need = $("jneeddx"); if (need) need.hidden = false;
    var card = document.querySelector(".jcard"); if (card) card.classList.add("needdx");   // ②옷종류·③사이즈표 잠금(진단 먼저)
    showCapture();   // 판정하기·업로드는 state.ready 게이팅으로 잠김
  }
  function showMiss(msg) {
    $("jmiss").hidden = false;
    $("jmiss").textContent = msg || "판정할 수 없어요. 값을 확인해주세요.";
  }
  function fail(msg) { var l = $("jloading"); if (l) { l.hidden = false; l.textContent = msg; } }   // 화면을 먼저 띄우므로 오류 시 로딩영역을 다시 노출

  /* ── 이벤트 ─────────────────────────────────────────────── */
  document.addEventListener("click", function (ev) {
    // '진단 수정'·'진단 시작하기'로 나갈 때 표식 → diag에서 '이전' 누르면 Fit으로 복귀(수정이면 이전 판정 복원)
    if (ev.target.closest(".jmine-re, .jneeddx-cta")) { try { sessionStorage.setItem(RETURN_KEY, "1"); } catch (e) {} }
    var bfb = ev.target.closest("[data-bfsz]");
    if (bfb) { drawBodyFit(bfb.getAttribute("data-bfsz")); return; }   // 자세히 사이즈 토글
    var seg = ev.target.closest(".jseg-b");
    if (seg) {
      setCat(seg.getAttribute("data-cat"));
      if (!$("jcorrect").hidden && state.parsed) renderCorrect(state.parsed.sizes || [], !!state.manual);
      return;
    }
    var bz = ev.target.closest(".jbz");
    if (bz) {
      state.basis = bz.getAttribute("data-b");
      document.querySelectorAll(".jbz").forEach(function (b) { b.classList.toggle("on", b === bz); });
      return;
    }
    var jtab = ev.target.closest(".jtab");
    if (jtab) { if (jtab.getAttribute("data-tab") === "manual") showManual(); else showCapture(); return; }
    if (ev.target.closest(".jlink[data-act='manual']") || ev.target.id === "jmanuallink") { state.manual = true; showManual(); return; }
    if (ev.target.closest("#jcapzone")) { $("jcapfile").click(); return; }
    if (ev.target.id === "jreupload") { state.manual = false; showCapture(); var t = $("jcapthumb"); if (t) { t.hidden = true; t.src = ""; } return; }
    if (ev.target.id === "jrun") run();
    if (ev.target.closest("#jredo")) { resetJudge(); }
  });
  document.addEventListener("change", function (ev) {
    if (ev.target.id === "jconsent" && ev.target.checked && state.lastCell) submitGarment();   // 판정 후 다시 체크한 경우
  });
  // 치수 입력 중 실시간으로 판정 버튼 활성/비활성 갱신
  document.addEventListener("input", function (ev) {
    if (ev.target && (ev.target.id === "jbrandin" || (ev.target.classList && ev.target.classList.contains("jce")))) refreshRun();
  });
  // 파일 선택
  var fi = $("jcapfile"); if (fi) fi.addEventListener("change", function (e) { state.manual = false; onImageFile(e.target.files && e.target.files[0]); });
  // 드래그&드롭
  var dz = $("jcapzone");
  if (dz) {
    dz.addEventListener("dragover", function (e) { e.preventDefault(); dz.classList.add("over"); });
    dz.addEventListener("dragleave", function () { dz.classList.remove("over"); });
    dz.addEventListener("drop", function (e) { e.preventDefault(); dz.classList.remove("over");
      state.manual = false; onImageFile(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]); });
  }
  // 클립보드 붙여넣기 — 캡처 단계일 때만
  document.addEventListener("paste", function (e) {
    if ($("jcap") && $("jcap").hidden) return;
    var items = (e.clipboardData && e.clipboardData.items) || [];
    for (var i = 0; i < items.length; i++) { if (items[i].type.indexOf("image") === 0) { state.manual = false; onImageFile(items[i].getAsFile()); e.preventDefault(); return; } }
  });

  if (E && E._real) boot(); else fail("엔진을 불러오지 못했어요.");
})();
