/* admin-submissions.js — 사용자 제출 사이즈표 검수 큐(판정 ⑤). 소유: 개발자(web/js/**).
   garment_submission(db/08)을 상태별로 조회 → 검증/반려/승격. ADMINAUTH(로그인 JWT·RLS admin).
   실측표는 해자 — 화면은 관리자 전용(noindex), 값은 검수용으로만. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  function fmt(ts) { try { var d = new Date(ts); return (d.getMonth() + 1) + "/" + d.getDate() + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); } catch (e) { return ts || ""; } }
  function kpi(n, l) { return '<div class="kpi"><div class="n">' + n + '</div><div class="l">' + l + "</div></div>"; }

  var CATKO = { TOP: "상의", BOTTOM: "하의" };
  var PARTKO = { chest: "가슴", shoulder: "어깨", waist: "허리", hip: "엉덩이", thigh: "허벅지", sleeve: "소매", length: "기장", rise: "밑위", hem: "밑단" };
  var state = { status: "pending" };

  // 셀 요약: "S 가슴53·어깨45 / M …"
  function sizesSummary(sizes) {
    return (sizes || []).map(function (s) {
      var g = s.garmentCm || {};
      var parts = Object.keys(g).map(function (k) { return (PARTKO[k] || k) + (g[k]); }).join("·");
      return "<b>" + esc(s.sizeLabel) + "</b> " + esc(parts);
    }).join("<br>");
  }

  function load() {
    if (!(window.ADMINAUTH && ADMINAUTH.ready())) {
      $("subTable").innerHTML = '<tr><td>실 DB(api·admin 구글 로그인) 상태에서만 보입니다.</td></tr>';
      return;
    }
    ADMINAUTH.submissions(state.status).then(render).catch(function () {
      $("subTable").innerHTML = '<tr><td>로드 실패 · admin 로그인 필요</td></tr>';
    });
  }

  function render(rows) {
    rows = rows || [];
    // 같은 브랜드·상품·사이즈 중복 제출 = 신뢰 신호(집계)
    var dupKey = {};
    rows.forEach(function (r) { var k = (r.brand || "") + "|" + (r.product || "") + "|" + (r.category || ""); dupKey[k] = (dupKey[k] || 0) + 1; });

    $("subKpis").innerHTML = kpi(rows.length, state.status + " 제출") +
      kpi(rows.filter(function (r) { return r.source === "capture"; }).length, "캡처 인식") +
      kpi(rows.filter(function (r) { return r.confirmed_size; }).length, "사용자 확인 줄 있음");

    var head = "<tr><th>제출</th><th>브랜드·상품</th><th>종류</th><th>사이즈 값(단면)</th><th>출처</th><th>확인줄</th><th>중복</th><th>조치</th></tr>";
    var body = rows.map(function (r) {
      var k = (r.brand || "") + "|" + (r.product || "") + "|" + (r.category || "");
      var dup = dupKey[k] > 1 ? '<span class="pill">×' + dupKey[k] + "</span>" : "—";
      var src = r.source === "manual" ? "직접입력" : "캡처(" + (r.chest_basis === "circ" ? "둘레" : "단면") + ")";
      var actions = state.status === "pending"
        ? '<button class="abtn sm" data-act="verified" data-id="' + r.id + '">검증</button> ' +
          '<button class="abtn ghost sm" data-act="rejected" data-id="' + r.id + '">반려</button>'
        : state.status === "verified"
          ? '<button class="abtn sm" data-act="merged" data-id="' + r.id + '">승격 표시</button>'
          : "—";
      return "<tr>" +
        "<td>" + fmt(r.created_at) + "</td>" +
        "<td><b>" + esc(r.brand || "—") + "</b><br>" + esc(r.product || "") + "</td>" +
        "<td>" + (CATKO[r.category] || r.category) + "</td>" +
        '<td style="line-height:1.7">' + sizesSummary(r.sizes) + "</td>" +
        "<td>" + esc(src) + "</td>" +
        "<td>" + (r.confirmed_size ? "<b>" + esc(r.confirmed_size) + "</b>" : "—") + "</td>" +
        "<td>" + dup + "</td>" +
        "<td>" + actions + "</td>" +
        "</tr>";
    }).join("");
    $("subTable").innerHTML = head + (body || '<tr><td colspan="8">없음</td></tr>');
  }

  document.addEventListener("click", function (ev) {
    var f = ev.target.closest(".filters .abtn");
    if (f && f.getAttribute("data-st")) {
      state.status = f.getAttribute("data-st");
      document.querySelectorAll(".filters .abtn").forEach(function (b) { b.classList.toggle("ghost", b !== f); });
      load(); return;
    }
    var a = ev.target.closest("[data-act]");
    if (a && a.getAttribute("data-id")) {
      var id = a.getAttribute("data-id"), st = a.getAttribute("data-act");
      a.disabled = true;
      ADMINAUTH.setSubmissionStatus(id, st).then(function (ok) { if (ok) load(); else a.disabled = false; });
    }
  });

  load();   // 로그인 게이트는 admin-common.js가 처리. ADMINAUTH.ready()면 실DB, 아니면 안내.
})();
