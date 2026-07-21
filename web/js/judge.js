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
      return fetchJSON("data/size-catalog.json").then(function (c) {
        state.catalog = (c && c.specs) || c || [];
        state.ready = true;
        $("jloading").hidden = true;
        $("jsetup").hidden = false;
        populateBrands();
      });
    }).catch(function (e) { fail("불러오는 중 문제가 생겼어요. 새로고침해 주세요."); });
  }

  /* ── 셀 선택 UI ─────────────────────────────────────────── */
  function catalogFor(cat) {
    var sub = SUBTYPE[cat];
    return state.catalog.filter(function (s) {
      return s.category === cat && (s.subtype === sub || !s.subtype) &&
             (s.gender === state.sex || s.gender === "unisex");
    });
  }
  function populateBrands() {
    var rows = catalogFor(state.cat);
    var seen = {}, brands = [];
    rows.forEach(function (s) { if (!seen[s.brandId]) { seen[s.brandId] = 1; brands.push({ id: s.brandId, name: s.brandName }); } });
    brands.sort(function (a, b) { return a.name.localeCompare(b.name, "ko"); });
    var sel = $("jbrand");
    sel.innerHTML = '<option value="">브랜드 선택</option>' +
      brands.map(function (b) { return '<option value="' + esc(b.id) + '">' + esc(b.name) + "</option>"; }).join("");
    state.brandId = null; state.fit = null;
    $("jfit").innerHTML = ""; $("jmiss").hidden = true; syncRun();
  }
  function populateFits() {
    var isBottom = state.cat === "BOTTOM";
    $("jfitLabel").textContent = isBottom ? "실루엣" : "핏";
    var rows = catalogFor(state.cat).filter(function (s) { return s.brandId === state.brandId; });
    var key = isBottom ? "silhouette" : "fitLine", map = isBottom ? SIL_KO : FIT_KO;
    var seen = {}, fits = [];
    rows.forEach(function (s) { var v = s[key]; if (v && !seen[v]) { seen[v] = 1; fits.push(v); } });
    state.fit = null;
    $("jfit").innerHTML = fits.length
      ? fits.map(function (f) { return '<button class="jchip" data-fit="' + esc(f) + '">' + esc(map[f] || f) + "</button>"; }).join("")
      : '<span class="jmiss">이 브랜드는 아직 수집된 ' + (isBottom ? "하의" : "상의") + "가 없어요.</span>";
    syncRun();
  }
  function syncRun() { $("jrun").disabled = !(state.brandId && state.fit); }

  /* ── 판정 계산 ──────────────────────────────────────────── */
  function errForEngine() {
    var e = {};
    Object.keys(EBMAP).forEach(function (k) { var bmk = EBMAP[k]; if (state.err[bmk] != null) e[k] = state.err[bmk]; });
    return e;
  }
  function run() {
    $("jrun").disabled = true;
    var cat = state.cat, isBottom = cat === "BOTTOM";
    var query = {
      category: cat, sex: state.sex, cm: state.cm, experiences: state.exps,
      brandId: state.brandId, subtype: SUBTYPE[cat], errors: errForEngine()
    };
    if (isBottom) query.silhouette = state.fit; else query.fitLine = state.fit;

    computeJudgment(query).then(function (j) {
      $("jrun").disabled = false;
      if (!j) return showMiss();
      render(j);
    }).catch(function () { $("jrun").disabled = false; showMiss(); });
  }
  // proto=클라 로컬 계산(garments 직접) / api=서버(/api/judge, 실측 비노출)
  function computeJudgment(q) {
    if (window.FDATA && FDATA.mode === "api") {
      return FDATA.judge(q).then(function (resp) { return (resp && resp.covered) ? resp.judgment : null; });
    }
    return loadGarments().then(function (specs) {
      if (!specs) return null;
      var eb = E.bodyFromExperiences ? E.bodyFromExperiences(q.experiences, specs) : {};
      var mcm = {}; Object.keys(q.cm).forEach(function (k) { mcm[k] = q.cm[k]; });
      Object.keys(EBMAP).forEach(function (k) { if (eb[k] != null) mcm[EBMAP[k]] = eb[k]; });
      var bodyVec = q.category === "BOTTOM"
        ? { waist: mcm.waist, hip: mcm.hip, thigh: mcm.thigh }
        : { chest: mcm.chestFull, shoulder: mcm.shoulder };
      var cell = specs.filter(function (s) {
        if (s.category !== q.category || s.brandId !== q.brandId) return false;
        if (!(s.gender === q.sex || s.gender === "unisex")) return false;
        if (q.subtype && s.subtype !== q.subtype) return false;
        return q.category === "BOTTOM" ? s.silhouette === q.silhouette : s.fitLine === q.fitLine;
      });
      if (!cell.length) return null;
      return E.judge(bodyVec, cell, { errors: q.errors, category: q.category });
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

    $("jsetup").hidden = true;
    $("jresult").hidden = false;
    window.scrollTo(0, 0);
  }

  function renderMatrix(j, pickSize) {
    var sizes = j.sizes || [];
    var parts = (E.catParts && E.catParts[j.category]) || [];
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
    var parts = (E.catParts && E.catParts[category]) || [];
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
  // 판정 대상 셀 라벨: "브랜드명 · 핏". 배지에 표시.
  function cellLabel() {
    var row = (state.catalog || []).filter(function (s) { return s.brandId === state.brandId; })[0];
    var name = row ? row.brandName : state.brandId;
    var map = state.cat === "BOTTOM" ? SIL_KO : FIT_KO;
    return name + (state.fit ? " · " + (map[state.fit] || state.fit) : "");
  }
  function fmt(n) { return (Math.round(n * 10) / 10).toString(); }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }
  function readJSON(k, d) { try { return JSON.parse(sessionStorage.getItem(k) || "") || d; } catch (e) { return d; } }
  function fetchJSON(u) { return fetch(u).then(function (r) { return r.json(); }); }
  // 게이트는 자체 에디토리얼 헤드라인을 가지므로, 공통 제목/부제는 숨겨 이중 헤드라인 방지.
  function showGate() { $("jloading").hidden = true; $("jsetup").hidden = true; $("jgate").hidden = false;
    var t = document.querySelector(".jtitle"), s = $("jsub"); if (t) t.hidden = true; if (s) s.hidden = true; }
  function showMiss() {
    $("jmiss").hidden = false;
    $("jmiss").textContent = "이 조합은 아직 수집된 실측이 없어요. 다른 핏이나 브랜드를 선택해 보세요.";
  }
  function fail(msg) { $("jloading").textContent = msg; }

  /* ── 이벤트 ─────────────────────────────────────────────── */
  document.addEventListener("click", function (ev) {
    var seg = ev.target.closest(".jseg-b");
    if (seg) {
      document.querySelectorAll(".jseg-b").forEach(function (b) { b.classList.remove("on"); });
      seg.classList.add("on"); state.cat = seg.getAttribute("data-cat"); populateBrands();
      return;
    }
    var chip = ev.target.closest(".jchip");
    if (chip && chip.hasAttribute("data-fit")) {
      document.querySelectorAll(".jchip").forEach(function (c) { c.classList.remove("on"); });
      chip.classList.add("on"); state.fit = chip.getAttribute("data-fit"); syncRun();
      return;
    }
    if (ev.target.id === "jrun") run();
    if (ev.target.id === "jredo") { $("jresult").hidden = true; $("jsetup").hidden = false; window.scrollTo(0, 0); }
  });
  $("jbrand").addEventListener("change", function (e) { state.brandId = e.target.value || null; populateFits(); });

  if (E && E._real) boot(); else fail("엔진을 불러오지 못했어요.");
})();
