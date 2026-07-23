#!/usr/bin/env node
/* scripts/gen-catalog.js — garments.json → size-catalog.json (cm-free 공개 카탈로그)  [단계 D · 해자 보호]
   목적: diag-fit 입력 화면은 브랜드·사이즈 라벨만 필요(실측치 불필요). 실측(garmentCm)·수집증거(product)를
        벗긴 카탈로그를 만들어 공개(app/)엔 이것만 배포. garments.json 원본은 서버(/api)에만.
   + anchorBrands 순서를 brand 테이블(display_order·실착 접근성)로 정렬 → diag-fit 브랜드 드롭다운이 진단 결과와 같은 순서.
     (build 시점 DB 조회. 런타임 admin 편집은 다음 build/deploy에 반영.)
     ※ env 없음·조회 실패·타임아웃이면 **기존 카탈로그의 순서를 그대로 보존**하고 경고한다.
        garments 원순서로 덮으면 env 없는 로컬 빌드가 브랜드 드롭다운 순서를 조용히 바꿔버린다(실제 발생).
   실행: node scripts/gen-catalog.js  (또는 env 소스 후 실행하면 DB순서 반영) → web/data/size-catalog.json 재생성. */
var fs = require('fs');
var path = require('path');
var ROOT = path.resolve(__dirname, '..');
var SRC = path.join(ROOT, 'web/data/garments.json');
var OUT = path.join(ROOT, 'web/data/size-catalog.json');

var G = JSON.parse(fs.readFileSync(SRC, 'utf8'));

// 스펙: 라벨·체계·핏라인만 유지. garmentCm(실측=해자)·product(수집증거)는 제거.
var KEEP = ['brandId', 'brandName', 'category', 'fitLine', 'gender', 'subtype', 'sizeLabel', 'sizeSystem', 'sizeCanonical', 'sizeOrder'];
var specs = (G.specs || []).map(function (s) {
  var o = {}; KEEP.forEach(function (k) { if (s[k] !== undefined) o[k] = s[k]; }); return o;
});
var m = G.$meta || {};

var DB_TIMEOUT_MS = 6000;   // DB가 응답 없을 때 빌드가 매달리지 않게

// 폴백 순서 = 이미 커밋된 카탈로그의 순서(직전 DB 반영분)를 보존.
//   garments 원순서로 덮으면 brand 드롭다운 순서가 조용히 바뀐다 — env 없는 로컬 빌드에서 실제로 발생했다.
//   브랜드가 추가/삭제됐으면 그것만 반영(기존 순서 유지 + 새 브랜드는 뒤에).
function previousOrder(anchors) {
  try {
    var prev = JSON.parse(fs.readFileSync(OUT, 'utf8'));
    var list = (prev && prev.$meta && prev.$meta.anchorBrands) || [];
    if (!list.length) return null;
    var known = anchors.filter(function (a) { return list.indexOf(a) >= 0; })
                       .sort(function (a, b) { return list.indexOf(a) - list.indexOf(b); });
    return known.concat(anchors.filter(function (a) { return list.indexOf(a) < 0; }));
  } catch (e) { return null; }
}
function fallbackOrder(anchors, why) {
  var prev = previousOrder(anchors);
  return prev ? { list: prev, src: '기존 카탈로그 순서 보존(' + why + ')', degraded: true }
              : { list: anchors, src: 'garments 원순서(' + why + ' · 기존 파일 없음)', degraded: true };
}

// brand 테이블 display_order로 anchorBrands 정렬(있으면). service_role 조회.
//   실패/무env면 기존 순서를 보존하고 경고 — 조용한 퇴화 금지.
async function orderedAnchors(anchors) {
  var URL = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!anchors.length) return { list: anchors, src: 'anchors 없음' };
  if (!URL || !KEY) return fallbackOrder(anchors, 'env 없음');
  var ac = new AbortController();
  var timer = setTimeout(function () { ac.abort(); }, DB_TIMEOUT_MS);
  try {
    var r = await fetch(URL + '/rest/v1/brand?select=brand_id,display_order,active',
      { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }, signal: ac.signal });
    if (!r.ok) return fallbackOrder(anchors, '조회실패 ' + r.status);
    var rows = await r.json(); var ord = {};
    rows.forEach(function (x) { ord[x.brand_id] = (x.active === false ? 9999 : x.display_order); });
    var sorted = anchors.slice().sort(function (a, b) { return (ord[a] == null ? 500 : ord[a]) - (ord[b] == null ? 500 : ord[b]); });
    return { list: sorted, src: 'brand 테이블(display_order)' };
  } catch (e) {
    return fallbackOrder(anchors, ac.signal.aborted ? ('타임아웃 ' + DB_TIMEOUT_MS + 'ms') : '예외');
  } finally { clearTimeout(timer); }
}

(async function () {
  var oa = await orderedAnchors(m.anchorBrands || []);
  var meta = {
    purpose: 'size-catalog (cm-free) — 입력 UI용 브랜드·사이즈 라벨. 실측치 없음.',
    anchorBrands: oa.list,
    categories: m.categories, parts: m.parts, fitLineMap: m.fitLineMap, brandIdMap: m.brandIdMap
  };
  Object.keys(meta).forEach(function (k) { if (meta[k] === undefined) delete meta[k]; });

  fs.writeFileSync(OUT, JSON.stringify({ $meta: meta, specs: specs }));
  var txt = fs.readFileSync(OUT, 'utf8');
  if (/garmentCm|"product"/.test(txt)) { console.error('✗ 카탈로그에 실측/증거 필드 잔존 — 생성 중단'); process.exit(1); }
  console.log('✓ size-catalog.json 생성 — specs ' + specs.length + '종 · anchorBrands 순서=' + oa.src + ' [' + oa.list.join(',') + '] · cm/product 제거 확인. (' + Math.round(txt.length / 1024) + 'KB)');
  if (oa.degraded) {
    console.warn('⚠ anchorBrands를 DB 순서로 갱신하지 못했습니다 — ' + oa.src);
    console.warn('  기존 순서를 유지했습니다(브랜드 드롭다운이 조용히 바뀌는 걸 막기 위해).');
    console.warn('  DB 순서를 반영하려면 SUPABASE_URL·SUPABASE_SECRET_KEY를 설정하고 다시 실행하세요.');
  }
})();
