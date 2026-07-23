/* api/judge.js — Vercel 서버리스 함수 (CJS).  [구매 판정 · 해자 보호]
   추천(diagnose)이 "브랜드에서 몇 사이즈"라면, 판정은 "내가 고른 이 상품(셀), 나한테 맞나".
   garments.json(실측표)은 서버 전용 — 여기서만 require해 계산하고 클라(app/)엔 실측을 안 내린다.
   클라가 보낸 체형 추정 cm + 착용경험 + 대상 셀(브랜드·핏·종류)로:
     ① 역산(bodyFromExperiences)으로 prior 덮어쓰기  ② 그 셀의 전 사이즈를 judge()로 판정
   → { judgment } 만 반환(사이즈별 여유·등급·병목 — 원본 실측표는 안 보냄).
   env(Vercel): SUPABASE_URL · SUPABASE_SECRET_KEY(서버 전용, RLS 우회). */
var FitEngine = require('../web/js/engine.js').FitEngine;
var fetchT = require('./_fetch.js').fetchT;
var GARMENTS = require('../web/data/garments.json');
var SPECS_FILE = GARMENTS && GARMENTS.specs;
var _specsCache = null, _specsRev = -1;
var EBMAP = { chest: 'chestFull', shoulder: 'shoulder', waist: 'waist', hip: 'hip', thigh: 'thigh' };

// diagnose.js와 동일한 garment 테이블 조회(rev 캐시). 실패 시 번들 파일 폴백.
async function getSpecs(URL, KEY) {
  var hdr = { apikey: KEY, Authorization: 'Bearer ' + KEY };
  try {
    var rv = await fetchT(URL + '/rest/v1/garment_meta?id=eq.1&select=rev', { headers: hdr });
    var rev = null; if (rv.ok) { var jr = await rv.json(); rev = (jr[0] || {}).rev; }
    if (rev != null && rev === _specsRev && _specsCache) return _specsCache;
    var specs = [], from = 0, PAGE = 1000, complete = false;
    while (true) {
      var r = await fetchT(URL + '/rest/v1/garment?select=spec&limit=' + PAGE + '&offset=' + from, { headers: hdr });
      if (!r.ok) break;                                   // 페이지 실패 → complete=false로 남김
      var rows = await r.json();
      for (var i = 0; i < rows.length; i++) specs.push(rows[i].spec);
      if (rows.length < PAGE) { complete = true; break; }  // 마지막 페이지까지 정상 수신
      from += PAGE;
    }
    // 중간에 끊긴 목록을 캐시하면 잘린 실측표가 rev 바뀔 때까지 추천·판정에 계속 쓰인다.
    //   전 페이지를 다 받은 경우에만 캐시하고, 아니면 직전 캐시/번들 파일로 폴백.
    if (complete && specs.length) { _specsCache = specs; _specsRev = rev; return specs; }
  } catch (e) {}
  return _specsCache || SPECS_FILE;
}

// 대상 셀로 좁히기: category·brandId·gender(or unisex)·subtype + 핏(TOP=fitLine / BOTTOM=silhouette).
function pickCell(specs, q) {
  var cat = q.category === 'BOTTOM' ? 'BOTTOM' : 'TOP';
  return (specs || []).filter(function (s) {
    if (s.category !== cat || s.brandId !== q.brandId) return false;
    if (!(s.gender === q.gender || s.gender === 'unisex')) return false;
    if (q.subtype && s.subtype !== q.subtype) return false;
    if (cat === 'BOTTOM') return q.silhouette ? s.silhouette === q.silhouette : true;
    return q.fitLine ? s.fitLine === q.fitLine : true;
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  var URL = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!URL || !KEY) return res.status(500).json({ error: 'missing supabase env' });
  if (!FitEngine || !FitEngine._real || !FitEngine.judge) return res.status(500).json({ error: 'engine unavailable' });
  var SPECS = await getSpecs(URL, KEY);
  if (!SPECS || !SPECS.length) return res.status(500).json({ error: 'garments unavailable' });

  var b = req.body || {};
  var cat = b.category === 'BOTTOM' ? 'BOTTOM' : 'TOP';
  var sex = b.sex === 'male' ? 'male' : 'female';
  var exps = Array.isArray(b.experiences) ? b.experiences : [];

  // ① 역산으로 prior 덮어쓰기(추천과 동일 규칙) → 판정에 쓸 인체 cm 확정.
  var eb = (FitEngine.bodyFromExperiences ? FitEngine.bodyFromExperiences(exps, SPECS) : {}) || {};
  var cm = {};
  var srcCm = b.cm || {};
  Object.keys(srcCm).forEach(function (k) { cm[k] = srcCm[k]; });
  Object.keys(EBMAP).forEach(function (k) { if (eb[k] != null) cm[EBMAP[k]] = eb[k]; });

  var bodyVec = cat === 'BOTTOM'
    ? { waist: cm.waist, hip: cm.hip, thigh: cm.thigh }
    : { chest: cm.chestFull, shoulder: cm.shoulder, waist: cm.waist };   // 상의 허리(보조 부위) 대비

  // 판정 대상 셀: ① 클라가 캡처로 만든 셀(본류) 우선, ② 없으면 우리 garments에서 브랜드 필터(앵커 지름길·폴백).
  //   캡처 셀은 사용자 소유 데이터라 그대로 판정에 씀 — 우리 실측표(SPECS)는 여기에 안 섞이고 노출도 안 됨.
  var cell = Array.isArray(b.cell) && b.cell.length
    ? b.cell.filter(function (s) { return s && s.garmentCm; })
    : pickCell(SPECS, { category: cat, brandId: b.brandId, gender: sex,
        subtype: b.subtype, fitLine: b.fitLine, silhouette: b.silhouette });
  if (!cell.length) return res.status(200).json({ covered: false, category: cat, brandId: b.brandId });

  var judgment = FitEngine.judge(bodyVec, cell, { errors: b.errors || {}, category: cat });
  // 실측표 원본은 반환하지 않음 — 판정 결과(사이즈별 여유·등급·병목)만.
  return res.status(200).json({ covered: true, judgment: judgment, eb: eb });
};
