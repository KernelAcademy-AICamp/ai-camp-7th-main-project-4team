/* scripts/parse-check.js — 캡처 파서 로컬 검증 CLI.
   사용법:  node scripts/parse-check.js <이미지경로> [모델]
   예:      node scripts/parse-check.js data/brand/raw/size-tables/cos_tee_garment.png
            node scripts/parse-check.js data/brand/raw/size-tables/cos_tee_garment.png claude-opus-4-8
   ANTHROPIC_API_KEY는 .env.local에서 자동 로드. 실제 캡처로 인식 정확도를 찍어본다(배선 전 검증용).
   단면/둘레는 garments.json 분포로 sanity 체크(라벨 아닌 값으로). */
"use strict";
var fs = require("fs"), path = require("path");
var repo = path.resolve(__dirname, "..");

// .env.local에서 키만 로드(의존성 없이)
(function loadEnv() {
  if (process.env.ANTHROPIC_API_KEY) return;
  try {
    fs.readFileSync(path.join(repo, ".env.local"), "utf8").split("\n").forEach(function (line) {
      var m = /^\s*ANTHROPIC_API_KEY\s*=\s*(.+?)\s*$/.exec(line);
      if (m) process.env.ANTHROPIC_API_KEY = m[1].replace(/^["']|["']$/g, "");
    });
  } catch (e) {}
})();

var MEDIA = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" };

// garments.json TOP chest 분포(단면 기준) — 값이 이 범위 크게 밖이면 둘레로 의심.
function distro() {
  try {
    var g = require(path.join(repo, "web/data/garments.json"));
    var chest = (g.specs || []).filter(function (s) { return s.category === "TOP" && s.garmentCm && s.garmentCm.chest != null; })
      .map(function (s) { return s.garmentCm.chest; }).sort(function (a, b) { return a - b; });
    return { min: chest[0], max: chest[chest.length - 1] };
  } catch (e) { return { min: 34, max: 83 }; }
}

async function main() {
  var img = process.argv[2], model = process.argv[3];
  if (!img) { console.error("사용법: node scripts/parse-check.js <이미지경로> [모델]"); process.exit(1); }
  if (!process.env.ANTHROPIC_API_KEY) { console.error("✗ ANTHROPIC_API_KEY 없음 (.env.local 확인)"); process.exit(1); }
  if (!fs.existsSync(img)) { console.error("✗ 파일 없음: " + img); process.exit(1); }

  var buf = fs.readFileSync(img), b64 = buf.toString("base64");
  var mediaType = MEDIA[path.extname(img).toLowerCase()] || "image/png";
  var parseSizeTable = require(path.join(repo, "api/parse-size-table.js")).parseSizeTable;

  console.log("· " + path.basename(img) + " (" + Math.round(buf.length / 1024) + "KB) → " + (model || "claude-sonnet-5"));
  var t0 = Date.now();
  var out;
  try { out = await parseSizeTable(b64, mediaType, { model: model }); }
  catch (e) { console.error("✗ 파싱 실패: " + e.message); process.exit(1); }
  var p = out.parsed;

  console.log("  " + (Date.now() - t0) + "ms · " + out.model + (out.usage ? " · in " + out.usage.input_tokens + " / out " + out.usage.output_tokens + " tok" : ""));
  console.log("  tableKind=" + p.tableKind + " · category=" + p.category + " · unit=" + p.unit +
    (p.truncated ? " · ⚠truncated" : "") + (p.labeledCircumference && p.labeledCircumference.length ? " · 라벨둘레=" + p.labeledCircumference.join(",") : ""));
  console.log("  columns: " + (p.columns || []).join(" · "));
  if (p.notes) console.log("  notes: " + p.notes);

  // 표 출력
  var keys = [];
  (p.sizes || []).forEach(function (s) { Object.keys(s.values || {}).forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); }); });
  console.log("\n  " + "size".padEnd(9) + keys.map(function (k) { return k.padStart(8); }).join(""));
  (p.sizes || []).forEach(function (s) {
    console.log("  " + String(s.label).padEnd(9) + keys.map(function (k) { return String(s.values[k] == null ? "-" : s.values[k]).padStart(8); }).join(""));
  });

  // 단면/둘레 sanity (값 분포)
  var d = distro();
  if (p.category === "TOP" && keys.indexOf("chest") >= 0) {
    var chestVals = (p.sizes || []).map(function (s) { return s.values.chest; }).filter(function (v) { return v != null; });
    var mx = Math.max.apply(null, chestVals), mn = Math.min.apply(null, chestVals);
    var likelyCirc = mn > d.max + 8;   // 기존 단면 최대(≈83)+여유 밖이면 둘레로 의심
    console.log("\n  [단면/둘레] chest " + mn + "~" + mx + " vs 기존단면 " + d.min + "~" + d.max +
      " → " + (likelyCirc ? "⚠둘레로 의심(÷2 필요) — 라벨=" + (p.labeledCircumference && p.labeledCircumference.indexOf("chest") >= 0 ? "둘레明示" : "미명시") : "단면 범위 OK"));
  }
  if (p.tableKind === "body_range") console.log("\n  ⚠ 신체범위표 — 판정 불가(옷 실측 아님). 다른 표 필요.");
  if (p.truncated) console.log("  ⚠ 일부 사이즈 가려짐 — 사용자가 사려는 사이즈가 없으면 다시 캡처 유도.");

  console.log("\n  raw JSON ↓\n" + JSON.stringify(p, null, 2));
}
main();
