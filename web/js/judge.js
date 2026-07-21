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

  /* ── 부팅: 체형 복원 ─────────────────────────────────────── */
  function boot() {
    var payload = readJSON("fitting.dx", {});
    var basic = payload.basic || readJSON("fitting.basic", {});
    state.exps = Array.isArray(payload.experiences) ? payload.experiences : [];
    state.expCount = state.exps.length;

    if (!window.BodyModel) return fail("체형 엔진을 불러오지 못했어요.");
    BodyModel.load().then(function () {
      var est = BodyModel.estimate(basic);
      if (!est || !est.ready) { showGate(); return; }
      state.sex = est.sex;
      est.parts.forEach(function (p) { state.cm[p.key] = p.cm; if (p.rmse != null) state.err[p.key] = p.rmse; });
      state.ready = true;
      $("jloading").hidden = true;
      $("jsetup").hidden = false;
      showCapture();
    }).catch(function (e) { fail("불러오는 중 문제가 생겼어요. 새로고침해 주세요."); });
  }

  /* ── 캡처 입력 → 인식 → 보정 ──────────────────────────────
     둘레 부위(가슴·허리·엉덩이·허벅지)는 garments 규약(단면)으로 저장 — 판정 시 ×2로 복원.
     라벨이 아닌 값 분포로 단면/둘레 자동판정(FLAT_MAX 초과=둘레), 사용자가 토글로 override. */
  var CIRC = { chest: 1, waist: 1, hip: 1, thigh: 1, belly: 1 };
  var FLAT_MAX = { chest: 78, waist: 70, hip: 78, thigh: 44 };
  var JUDGE_PARTS = { TOP: ["chest", "shoulder"], BOTTOM: ["waist", "hip", "thigh"] };
  var JUDGE_PARTS_OPT = { TOP: ["waist"], BOTTOM: [] };   // 표에 있을 때만 쓰는 보조 부위(상의 허리)
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
  function showCapture() { $("jcap").hidden = false; $("jcorrect").hidden = true; var m = $("jmiss"); if (m) m.hidden = true; state.parsed = null; }

  // 붙여넣기/드롭/파일 → dataURL → 인식
  function onImageFile(file) {
    if (!file || file.type.indexOf("image") !== 0) return;
    var r = new FileReader(); r.onload = function () { parseImage(r.result); }; r.readAsDataURL(file);
  }
  function parseImage(dataUrl) {
    state.capture = dataUrl; state.parsed = null; state.basis = null;
    $("jcap").hidden = true; $("jcorrect").hidden = false;
    var th = $("jcapthumb"); if (th) { th.src = dataUrl; th.hidden = false; }
    $("jparsehint").innerHTML = "사이즈표를 읽는 중…"; $("jparsetable").innerHTML = ""; $("jrun").disabled = true;
    if (!(window.FDATA && FDATA.parseSizeTable)) return parseUnavailable();
    FDATA.parseSizeTable(dataUrl).then(function (resp) {
      if (!resp) return parseUnavailable();
      if (resp.error || !resp.parsed) return parseFailed();
      onParsed(resp.parsed);
    }).catch(function () { parseFailed(); });
  }
  function parseUnavailable() { $("jparsehint").innerHTML = "이 환경에선 자동 인식이 안 돼요. <a class='jlink' data-act='manual'>직접 입력</a>으로 진행하세요."; }
  function parseFailed() { $("jparsehint").innerHTML = "표를 못 읽었어요. 더 또렷한 캡처로 다시 하거나 <a class='jlink' data-act='manual'>직접 입력</a>하세요."; }

  function onParsed(p) {
    state.parsed = p;
    if (p.category === "TOP" || p.category === "BOTTOM") setCat(p.category);
    if (p.tableKind === "body_range") {
      $("jparsehint").innerHTML = "<b class='w'>이건 신체 권장범위표예요.</b> 옷 실측표(단면·기장)를 올려주세요 — 못 입어보는 옷의 실제 치수가 필요해요.";
      $("jparsetable").innerHTML = ""; $("jrun").disabled = true; return;
    }
    var warn = p.truncated ? " <span class='w'>일부 사이즈가 가려졌어요 — 사려는 사이즈가 없으면 다시 캡처해주세요.</span>" : "";
    $("jparsehint").innerHTML = "읽었어요. <b>사려는 사이즈의 값</b>을 확인·수정해주세요." + warn;
    renderCorrect(p.sizes || [], false);
  }

  // 보정 테이블: 사이즈 × 판정부위(핵심+표에있는보조, 편집 가능) + 단면/둘레 토글. editableLabel=직접입력 모드.
  function renderCorrect(sizes, editableLabel) {
    var parts = correctParts(sizes, editableLabel);   // 직접입력이면 보조(허리)도 선택칸으로 노출
    var circParts = parts.filter(function (x) { return CIRC[x]; });
    var circPart = circParts[0];
    if (state.basis == null && circPart) {
      var vals = sizes.map(function (s) { return s.values ? s.values[circPart] : null; }).filter(function (v) { return v != null; });
      var mx = vals.length ? Math.max.apply(null, vals) : 0;
      state.basis = mx > (FLAT_MAX[circPart] || 78) ? "circ" : "flat";
    }
    var head = "<tr><th>사이즈</th>" + parts.map(function (pt) {
      return "<th>" + koP(pt) + (isOptPart(pt) ? "<span class='jopt'>선택</span>" : "") + "</th>";
    }).join("") + "</tr>";
    var rows = sizes.map(function (s, i) {
      var lbl = editableLabel
        ? "<input class='jsl' data-i='" + i + "' placeholder='예: M' value='" + esc(s.label || "") + "'>"
        : "<span class='jsl' data-i='" + i + "'>" + esc(s.label) + "</span>";
      return "<tr><td class='sl'>" + lbl + "</td>" + parts.map(function (pt) {
        var v = s.values ? s.values[pt] : null;
        return "<td><input class='jce' data-i='" + i + "' data-p='" + pt + "' inputmode='decimal' value='" + (v == null ? "" : esc(v)) + "'></td>";
      }).join("") + "</tr>";
    }).join("");
    var basisCtl = circPart
      ? "<div class='jbasis'><span class='jbasis-l'>" + circParts.map(koP).join("·") + " 값은</span>" +
        "<button class='jbz " + (state.basis === "flat" ? "on" : "") + "' data-b='flat'>단면</button>" +
        "<button class='jbz " + (state.basis === "circ" ? "on" : "") + "' data-b='circ'>둘레</button>" +
        "<span class='jbasis-n'>표에 적힌 그대로가 단면(반접어 잰 값)인지 둘레인지</span></div>" : "";
    $("jparsetable").innerHTML = "<table class='jctab'>" + head + rows + "</table>" + basisCtl;
    $("jrun").disabled = false;
  }

  function showManual() {
    $("jcap").hidden = true; $("jcorrect").hidden = false; $("jmiss").hidden = true;
    var th = $("jcapthumb"); if (th) th.hidden = true;
    state.parsed = { sizes: [{ label: "" }] }; state.basis = "flat";
    $("jparsehint").innerHTML = "사려는 <b>사이즈</b>와 <b>" + JUDGE_PARTS[state.cat].map(koP).join("·") + "</b>을 표에서 그대로 옮겨 적어주세요.";
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
    return e;
  }
  function run() {
    var cell = buildCell();
    if (!cell.length) return showMiss("판정할 값이 없어요. 사려는 사이즈의 치수를 채워주세요.");
    state.lastCell = cell;
    $("jrun").disabled = true;
    computeJudgment({ category: state.cat, sex: state.sex, cm: state.cm, experiences: state.exps, errors: errForEngine(), cell: cell })
      .then(function (j) { $("jrun").disabled = false; if (!j) return showMiss(); render(j); })
      .catch(function () { $("jrun").disabled = false; showMiss(); });
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
        ? { waist: mcm.waist, hip: mcm.hip, thigh: mcm.thigh }
        : { chest: mcm.chestFull, shoulder: mcm.shoulder, waist: mcm.waist };  // 상의 허리(보조) 대비
      return E.judge(bodyVec, q.cell, { errors: q.errors, category: q.category });
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

    // 다크 판정 히어로(결론)
    var warn = !j.anyFit || (pick && pick.verdict && ["TIGHT", "BORDERLINE"].indexOf(pick.verdict.label) >= 0);
    var head = pick ? pick.verdict.ko : "판정할 수 없어요";
    var score = pick && pick.fitScore != null ? pick.fitScore : 0;
    var brandNm = cellLabel().split(" · ")[0];
    var vlabel = pick && pick.verdict ? pick.verdict.label : "";
    var body = !j.anyFit
      ? "이 상품은 어느 사이즈도 편하게 맞지 않아요. 다른 핏이나 브랜드를 보는 게 좋겠어요."
      : warn ? "가장 나은 건 " + esc(pickSize) + "지만 살짝 걸리는 데가 있어요. 아래 눈금에서 확인해 보세요."
      : vlabel === "OK" ? esc(pickSize) + "가 딱 맞는 구간에 들어와요. 아래에서 부위별로 자세히 볼 수 있어요."
      : vlabel === "BIG" ? esc(pickSize) + "가 넉넉하게 맞아요. 여유로운 핏을 좋아하면 괜찮아요."
      : esc(pickSize) + "가 여유 있게 맞아요. 딱 붙는 걸 원하면 한 치수 작게도 봐요.";
    var chips = pick ? pick.parts.slice(0, 3).map(function (p) {
      return '<span class="vchip">' + esc(p.ko) + " " + (p.easeCm >= 0 ? "+" : "") + fmt(p.easeCm) + "cm " + esc(p.fit) + "</span>";
    }).join("") : "";
    var acc = warn ? "#E8A08A" : "#8FD6A8";
    var deg = Math.max(0, Math.min(100, score)); // 게이지 채움 %
    $("jverdict").className = "jhero" + (warn ? " warn" : "");
    $("jverdict").innerHTML =
      '<div class="vtop"><div><div class="vey">추천 사이즈</div>' +
        '<div class="vsize">' + (pick ? esc(pickSize) : "—") + "<small> / " + esc(brandNm) + "</small></div></div>" +
        '<div class="vgauge" style="background:conic-gradient(' + acc + " 0 " + deg + "%, rgba(255,255,255,.12) " + deg + '% 100%)">' +
          '<div><div class="gv num">' + score + '</div><span class="gl">FIT</span></div></div></div>' +
      '<div class="vverdict">' + esc(head) + "</div>" +
      '<div class="vbody">' + body + "</div>" +
      (chips ? '<div class="vchips">' + chips + "</div>" : "");

    // 신뢰도 2축
    var tier = state.expCount >= 2 ? ["착용경험 " + state.expCount + "벌", "오차 ±2cm까지 좁혀짐", ""]
             : state.expCount === 1 ? ["착용경험 1벌", "역산 일부 반영", ""]
             : ["기본정보만", "키·몸무게 회귀 추정(±3cm)", "lo"];
    var missAll = uniqueMissing(sizes);
    var brandNote = missAll.length ? (missAll.map(koPart).join("·") + " 미표기") : "표기 치수 기준";
    $("jconf").innerHTML =
      '<div class="' + tier[2] + '"><b>내 데이터</b><strong>' + tier[0] + "</strong><span>" + tier[1] + "</span></div>" +
      '<div class="lo"><b>브랜드 표기</b><strong>검증 안 됨</strong><span>착용 결과 0건 · ' + esc(brandNote) + "</span></div>";

    // 섹션 코너 초록 배지(result 모티프): 판정 대상 셀 · 추천 사이즈
    $("jmxpill").textContent = cellLabel();
    $("jbandpill").textContent = pickSize ? "추천 " + pickSize : "";

    renderMatrix(j, pickSize);
    renderBands(pick, j.category, pickSize);

    // 수집 opt-in 초기화(판정마다 리셋)
    state.lastPick = pickSize;
    var cb = $("jconsent"), sub = $("jsubmit"), msg = $("jsharemsg");
    if (cb) cb.checked = false; if (sub) sub.disabled = true;
    if (msg) { msg.hidden = true; msg.textContent = ""; }

    $("jsetup").hidden = true;
    $("jresult").hidden = false;
    window.scrollTo(0, 0);
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
      : "추천 사이즈는 끼임 없는 것 중 가장 잘 맞는 하나예요.";
  }

  function renderBands(pick, category, pickSize) {
    $("jbandHead").textContent = "추천 사이즈(" + (pickSize || "-") + ") 자세히";
    if (!pick) { $("jbands").innerHTML = ""; return; }
    var parts = judgedParts(category, [pick]);   // 핵심 + 판정된 보조(허리)
    $("jbands").innerHTML = parts.map(function (part) {
      var pj = pick.parts.filter(function (p) { return p.part === part; })[0];
      var band = E.bands[category + ":" + part];
      if (!pj) {
        return '<div class="jrul miss"><div class="jrul-hd"><span class="jrul-nm" style="color:var(--sub)">' + koPart(part) +
          '</span><span class="jrul-ev">미표기</span></div><div class="jrul-track"></div>' +
          '<div class="jrul-note">이 브랜드는 ' + koPart(part) + " 치수를 적지 않아요.</div></div>";
      }
      return rulerHTML(part, pj, band);
    }).join("");
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
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }
  function readJSON(k, d) { try { return JSON.parse(sessionStorage.getItem(k) || "") || d; } catch (e) { return d; } }
  function fetchJSON(u) { return fetch(u).then(function (r) { return r.json(); }); }
  // 게이트는 자체 에디토리얼 헤드라인을 가지므로, 공통 제목/부제는 숨겨 이중 헤드라인 방지.
  function showGate() { $("jloading").hidden = true; $("jsetup").hidden = true; $("jgate").hidden = false;
    var t = document.querySelector(".jtitle"), s = $("jsub"); if (t) t.hidden = true; if (s) s.hidden = true; }
  function showMiss(msg) {
    $("jmiss").hidden = false;
    $("jmiss").textContent = msg || "판정할 수 없어요. 값을 확인해주세요.";
  }
  function fail(msg) { $("jloading").textContent = msg; }

  /* ── 이벤트 ─────────────────────────────────────────────── */
  document.addEventListener("click", function (ev) {
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
    if (ev.target.closest(".jlink[data-act='manual']") || ev.target.id === "jmanuallink") { state.manual = true; showManual(); return; }
    if (ev.target.closest("#jcapzone")) { $("jcapfile").click(); return; }
    if (ev.target.id === "jreupload") { state.manual = false; showCapture(); var t = $("jcapthumb"); if (t) { t.hidden = true; t.src = ""; } return; }
    if (ev.target.id === "jrun") run();
    if (ev.target.id === "jsubmit") submitGarment();
    if (ev.target.id === "jredo") { $("jresult").hidden = true; $("jsetup").hidden = false; showCapture(); window.scrollTo(0, 0); }
  });
  document.addEventListener("change", function (ev) {
    if (ev.target.id === "jconsent") { var s = $("jsubmit"); if (s) s.disabled = !ev.target.checked; }
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
