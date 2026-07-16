#!/usr/bin/env node
/* scripts/gen-catalog.js — garments.json → size-catalog.json (cm-free 공개 카탈로그)  [단계 D · 해자 보호]
   목적: diag-fit 입력 화면은 브랜드·사이즈 라벨만 필요(실측치 불필요). 실측(garmentCm)·수집증거(product)를
        벗긴 카탈로그를 만들어 공개(app/)엔 이것만 배포. garments.json 원본은 서버(/api)에만.
   + anchorBrands 순서를 brand 테이블(display_order·실착 접근성)로 정렬 → diag-fit 브랜드 드롭다운이 진단 결과와 같은 순서.
     (build 시점 DB 조회. env 없으면 garments 원순서 유지. 런타임 admin 편집은 다음 build/deploy에 반영.)
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

// brand 테이블 display_order로 anchorBrands 정렬(있으면). service_role 조회. 실패/무env면 원순서.
async function orderedAnchors(anchors) {
  var URL = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!URL || !KEY || !anchors.length) return { list: anchors, src: 'garments(원순서)' };
  try {
    var r = await fetch(URL + '/rest/v1/brand?select=brand_id,display_order,active', { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } });
    if (!r.ok) return { list: anchors, src: 'garments(원순서·조회실패)' };
    var rows = await r.json(); var ord = {};
    rows.forEach(function (x) { ord[x.brand_id] = (x.active === false ? 9999 : x.display_order); });
    var sorted = anchors.slice().sort(function (a, b) { return (ord[a] == null ? 500 : ord[a]) - (ord[b] == null ? 500 : ord[b]); });
    return { list: sorted, src: 'brand 테이블(display_order)' };
  } catch (e) { return { list: anchors, src: 'garments(원순서·예외)' }; }
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
})();
