#!/usr/bin/env node
/* scripts/gen-app.js — web/(단일 소스) → app/(프로덕션 큐레이트 빌드)  [D-15 · 단계 D]
   목적:
     1) 목업 전용 화면(스타일리스트 포털 pro*·개발용 _reset)을 프로덕션에서 제외 — 화면만 있는 페이지 비노출.
     2) 측정 모드(FITTING_MODE='api') 주입 — 진단/피드백/수요가 서버(Supabase)로 기록.
     3) 해자 보호 — garments.json(실측표) 미배포. 진단 계산은 서버(/api/diagnose), 입력은 cm-free size-catalog.
   web/이 정본, app/은 생성물(손수정 금지). vercel.json outputDirectory=app.
   실행: node scripts/gen-app.js  (또는 npm run gen-app) */
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var ROOT = path.resolve(__dirname, '..');
var SRC = path.join(ROOT, 'web');
var OUT = path.join(ROOT, 'app');

// ── 노출 화면(화이트리스트). admin*은 로그인+noindex 뒤 — 숨기지 않고 포함(공개 노출 아님). ──
var PAGES = [
  'index.html', 'diag-basic.html', 'diag-fit.html', 'diag-loading.html', 'result.html', 'card.html',
  'about.html', 'faq.html', 'terms.html', 'privacy.html', 'body-type-guide.html', '404.html',
  'admin-login.html', 'admin.html', 'admin-diagnostics.html', 'admin-brands.html', 'admin-business.html',
  'admin-collect.html', 'admin-engine.html', 'admin-garments.html', 'admin-members.html', 'admin-ops.html', 'admin-api.html'
];
// ── 제외(목업 전용): 스타일리스트 포털 pro*, 개발 유틸 _reset ──
var HIDDEN = ['pro.html', 'pro-login.html', 'pro-signup.html', 'pro-quote.html', '_reset.html'];

// data/: garments.json(실측표=해자)만 제외 · js/: pro*.js(목업 포털 스크립트)만 제외
var DATA_SKIP = ['garments.json'];
var JS_SKIP = function (f) { return /^pro(-|\.)/.test(f); };   // pro.js, pro-login.js, pro-signup.js, pro-quote.js

function rmrf(p) { if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true }); }
function mkdirp(p) { fs.mkdirSync(p, { recursive: true }); }
function copyFile(s, d) { mkdirp(path.dirname(d)); fs.copyFileSync(s, d); }
function copyDir(name, filter) {
  var from = path.join(SRC, name), to = path.join(OUT, name);
  if (!fs.existsSync(from)) return 0;
  var n = 0;
  (function walk(rel) {
    fs.readdirSync(path.join(from, rel), { withFileTypes: true }).forEach(function (e) {
      var r = path.join(rel, e.name);
      if (e.isDirectory()) return walk(r);
      if (filter && !filter(e.name, r)) return;
      copyFile(path.join(from, r), path.join(to, r)); n++;
    });
  })('');
  return n;
}

console.log('· app/ 재생성 시작');
rmrf(OUT); mkdirp(OUT);

// 0) cm-free 카탈로그 최신화(garments.json 변경 반영)
cp.execFileSync('node', [path.join(__dirname, 'gen-catalog.js')], { stdio: 'inherit' });

// 1) 화이트리스트 HTML 복사 (+ 미분류 페이지 리포트)
var present = fs.readdirSync(SRC).filter(function (f) { return /\.html$/.test(f); });
var copiedPages = 0;
PAGES.forEach(function (p) {
  var s = path.join(SRC, p);
  if (fs.existsSync(s)) { copyFile(s, path.join(OUT, p)); copiedPages++; }
  else console.warn('  ⚠ 화이트리스트 페이지 없음: ' + p);
});
var unclassified = present.filter(function (f) { return PAGES.indexOf(f) < 0 && HIDDEN.indexOf(f) < 0; });
if (unclassified.length) console.warn('  ⚠ 미분류 페이지(노출/제외 결정 필요): ' + unclassified.join(', '));

// 2) 자산 복사 (data: garments.json 제외 · js: pro*.js 제외 · css/img/photos: 전체)
var nData = copyDir('data', function (f) { return DATA_SKIP.indexOf(f) < 0; });
var nJs = copyDir('js', function (f) { return !JS_SKIP(f); });
copyDir('css'); copyDir('img'); copyDir('photos');

// 3) config.js — 기본 모드 proto → api 주입 (배포는 항상 측정 모드)
var cfgPath = path.join(OUT, 'js/config.js');
if (fs.existsSync(cfgPath)) {
  var cfg = fs.readFileSync(cfgPath, 'utf8');
  var swapped = cfg.replace(/forced \|\| 'proto'/, "forced || 'api'");
  if (swapped === cfg) console.warn('  ⚠ config.js 모드 주입 실패 — proto 기본값 패턴 불일치(수동 확인)');
  fs.writeFileSync(cfgPath, swapped);
}

// 4) 소비자 화면 → 스타일리스트 포털(pro*) 링크 중화. 페이크도어는 소비자 수요 수집만, 포털은 미노출.
function neutralize(file, pairs) {
  var p = path.join(OUT, file); if (!fs.existsSync(p)) return;
  var t = fs.readFileSync(p, 'utf8');
  pairs.forEach(function (pr) {
    if (t.indexOf(pr[0]) < 0) { console.warn('  ⚠ 링크 중화 패턴 불일치(' + file + ') — 소스 변경됨, 가드 확인'); return; }
    t = t.split(pr[0]).join(pr[1]);
  });
  fs.writeFileSync(p, t);
}
neutralize('index.html', [
  ['<span class="sup" style="cursor:pointer" onclick="location.href=\'pro-signup.html\'">스타일리스트 지원</span><span class="navdiv"></span>', '']
]);
neutralize('faq.html', [
  ['<a href="pro-signup.html">스타일리스트 지원</a>', '스타일리스트 지원(준비 중)']
]);

// 5) 유출 가드 — garments.json 파일이 app/에 절대 없어야 함(해자). 참조는 파일 부재로 무해하지만 리포트.
var moat = path.join(OUT, 'data/garments.json');
if (fs.existsSync(moat)) { console.error('✗ [FATAL] app/data/garments.json 존재 — 해자 유출. 빌드 중단.'); process.exit(1); }
function grepApp(needle) {
  var hits = [];
  (function walk(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach(function (e) {
      var fp = path.join(dir, e.name);
      if (e.isDirectory()) return walk(fp);
      if (!/\.(html|js)$/.test(e.name)) return;
      if (fs.readFileSync(fp, 'utf8').indexOf(needle) >= 0) hits.push(path.relative(OUT, fp));
    });
  })(OUT);
  return hits;
}
var refG = grepApp('data/garments.json');
// diag-fit(입력 화면)은 cm-free 카탈로그 전용이어야 함 — garments 직접 로드로 회귀하면 FATAL.
var badFit = refG.filter(function (f) { return /^js\/diag-fit\.js$/.test(f); });
if (badFit.length) { console.error('✗ [FATAL] diag-fit.js가 garments.json 직접 로드 — size-catalog로 회귀 필요.'); process.exit(1); }
// result.js(proto 폴백)·admin 목업의 참조는 파일 부재로 무해(api 모드=서버 계산). 정보성 리포트만.
if (refG.length) console.log('  · garments.json 참조(무해·파일부재·proto폴백/admin목업): ' + refG.join(', '));
var proRefs = grepApp("pro-signup.html").concat(grepApp("'pro.html'")).filter(function (f, i, a) { return a.indexOf(f) === i; });
if (proRefs.length) console.warn('  ⚠ pro* 잔여 참조(중화 확인): ' + proRefs.join(', '));

console.log('✓ app/ 생성 완료 — 페이지 ' + copiedPages + ' · data ' + nData + ' · js ' + nJs + ' · 모드 api · garments.json 비배포(해자 보호)');
