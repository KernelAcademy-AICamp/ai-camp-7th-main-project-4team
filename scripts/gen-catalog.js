#!/usr/bin/env node
/* scripts/gen-catalog.js — garments.json → size-catalog.json (cm-free 공개 카탈로그)  [단계 D · 해자 보호]
   목적: diag-fit 입력 화면은 브랜드·사이즈 라벨만 필요(실측치 불필요). 실측(garmentCm)·수집증거(product)를
        벗긴 카탈로그를 만들어 공개(app/)엔 이것만 배포. garments.json 원본은 서버(/api)에만.
   동일 구조({$meta.anchorBrands, specs:[...]})라 diag-fit는 fetch 대상만 바꾸면 그대로 동작.
   실행: node scripts/gen-catalog.js  → web/data/size-catalog.json 재생성(생성물, 손수정 금지). */
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

// $meta: 구조 맵만 유지. 수집 출처·시점·경위(provenance/source/collectedAt)는 공개 제외.
var m = G.$meta || {};
var meta = {
  purpose: 'size-catalog (cm-free) — 입력 UI용 브랜드·사이즈 라벨. 실측치 없음.',
  anchorBrands: m.anchorBrands || [],
  categories: m.categories, parts: m.parts, fitLineMap: m.fitLineMap, brandIdMap: m.brandIdMap
};
Object.keys(meta).forEach(function (k) { if (meta[k] === undefined) delete meta[k]; });

fs.writeFileSync(OUT, JSON.stringify({ $meta: meta, specs: specs }));
// 유출 가드 — 결과물에 cm/product 흔적이 남지 않았는지 확인
var txt = fs.readFileSync(OUT, 'utf8');
if (/garmentCm|"product"/.test(txt)) { console.error('✗ 카탈로그에 실측/증거 필드 잔존 — 생성 중단'); process.exit(1); }
console.log('✓ size-catalog.json 생성 — specs ' + specs.length + '종, cm/product 제거 확인. (' + Math.round(txt.length / 1024) + 'KB)');
