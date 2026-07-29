#!/usr/bin/env node
/* scripts/import-garments.js — web/data/garments.json → Supabase garment/garment_meta.  [db/03]
   해자 데이터(실측표)를 DB로 시드 → admin이 RLS로만 조회. 멱등(기존 행 지우고 재삽입).
   실행: set -a && . ./.env.local && set +a && node scripts/import-garments.js
   env: SUPABASE_URL · SUPABASE_SECRET_KEY(service-role, RLS 우회). ⚠️ 비밀키 — 커밋/출력 금지. */
var fs = require('fs');
var path = require('path');
var ROOT = path.resolve(__dirname, '..');
var URL = process.env.SUPABASE_URL;
var KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) { console.error('✗ SUPABASE_URL/SUPABASE_SECRET_KEY 필요(.env.local 소스)'); process.exit(1); }

var G = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/data/garments.json'), 'utf8'));
var specs = G.specs || [];
var meta = G.$meta || {};

function rest(method, pathq, body, prefer) {
  return fetch(URL + '/rest/v1/' + pathq, {
    method: method,
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: prefer || 'return=minimal' },
    body: body != null ? JSON.stringify(body) : undefined
  });
}

(async function () {
  // 1) 멱등: 기존 garment 행 전체 삭제 (id>0)
  var del = await rest('DELETE', 'garment?id=gt.0');
  if (!del.ok && del.status !== 404) { console.error('✗ garment 삭제 실패', del.status, await del.text()); process.exit(1); }

  // 2) 배치 삽입(payload 크기 대비 500행씩)
  var BATCH = 500, inserted = 0;
  for (var i = 0; i < specs.length; i += BATCH) {
    var rows = specs.slice(i, i + BATCH).map(function (s) { return { brand_id: s.brandId || null, category: s.category || null, spec: s }; });
    var r = await rest('POST', 'garment', rows);
    if (!r.ok) { console.error('✗ 삽입 실패(batch ' + i + ')', r.status, (await r.text()).slice(0, 300)); process.exit(1); }
    inserted += rows.length;
  }

  // 3) $meta upsert(단일 행 id=1)
  var m = await rest('POST', 'garment_meta', [{ id: 1, meta: meta }], 'resolution=merge-duplicates,return=minimal');
  if (!m.ok) { console.error('✗ garment_meta upsert 실패', m.status, (await m.text()).slice(0, 300)); process.exit(1); }

  // 4) brand 시드(순서=실착 접근성: 앵커 먼저 1..N, 그 외 100). 멱등이되 기존 admin 편집은 보존
  //    → resolution=ignore-duplicates(이미 있는 brand_id는 건드리지 않음).
  var anchors = meta.anchorBrands || [];
  var byBrand = {};
  specs.forEach(function (s) { if (s.brandId && !byBrand[s.brandId]) byBrand[s.brandId] = s.brandName || s.brandId; });
  var brandRows = Object.keys(byBrand).map(function (id) {
    var ai = anchors.indexOf(id);
    return { brand_id: id, brand_name: byBrand[id], display_order: ai >= 0 ? ai + 1 : 100, active: true };
  });
  var b = await rest('POST', 'brand', brandRows, 'resolution=ignore-duplicates,return=minimal');
  if (!b.ok) { console.error('✗ brand 시드 실패', b.status, (await b.text()).slice(0, 300)); process.exit(1); }

  console.log('✓ import 완료 — garment ' + inserted + '행, garment_meta 1행, brand ' + brandRows.length + '개 시드(기존 순서 보존). (anchorBrands: ' + JSON.stringify(anchors) + ')');
})();
