/* api/diagnose.js — Vercel 서버리스 함수 (CJS).  [단계 D · 해자 보호]
   garments.json(브랜드 실측표)은 서버 전용 — 여기서만 require해 계산하고, 클라(app/)엔 배포 안 함.
   클라가 보낸 체형 추정 cm + 착용경험으로 ①역산(bodyFromExperiences) ②추천(recommend)만 서버 계산 →
   {eb, topRecs, botRecs} 반환 + diagnosis 1건 저장(id 반환 → 피드백 FK).
   ※ 체형 추정·8유형 분류·렌더는 클라 유지(민감치 아님). engine.js는 node 호환(무의존).
   env(Vercel): SUPABASE_URL · SUPABASE_SECRET_KEY(서버 전용, RLS 우회). */
var FitEngine = require('../web/js/engine.js').FitEngine;
var GARMENTS = require('../web/data/garments.json');
var SPECS_FILE = GARMENTS && GARMENTS.specs;   // 폴백(garment 테이블 조회 실패 시)
var _specsCache = null, _specsRev = -1;
var EBMAP = { chest: 'chestFull', shoulder: 'shoulder', waist: 'waist', hip: 'hip', thigh: 'thigh' };

// 진단 실측표 = garment 테이블(admin CRUD). garment_meta.rev로 캐시 무효화 → 편집 즉시 반영.
// 정상: rev 1행만 조회(가벼움) · 변경 시에만 전체 재조회(1000행 캡 페이지네이션). 실패 시 직전 캐시/번들 파일 폴백.
async function getSpecs(URL, KEY) {
  var hdr = { apikey: KEY, Authorization: 'Bearer ' + KEY };
  try {
    var rv = await fetch(URL + '/rest/v1/garment_meta?id=eq.1&select=rev', { headers: hdr });
    var rev = null; if (rv.ok) { var jr = await rv.json(); rev = (jr[0] || {}).rev; }
    if (rev != null && rev === _specsRev && _specsCache) return _specsCache;
    var specs = [], from = 0, PAGE = 1000;
    while (true) {
      var r = await fetch(URL + '/rest/v1/garment?select=spec&limit=' + PAGE + '&offset=' + from, { headers: hdr });
      if (!r.ok) break;
      var rows = await r.json();
      for (var i = 0; i < rows.length; i++) specs.push(rows[i].spec);
      if (rows.length < PAGE) break;
      from += PAGE;
    }
    if (specs.length) { _specsCache = specs; _specsRev = rev; return specs; }
  } catch (e) {}
  return _specsCache || SPECS_FILE;
}

// 브랜드 노출 순서(admin 관리, brand 테이블) — service_role로 읽음. [db/04]
// 반환 map: brand_id → display_order(작을수록 상위) · active=false면 null(추천 제외).
async function brandOrderMap(URL, KEY) {
  try {
    var r = await fetch(URL + '/rest/v1/brand?select=brand_id,display_order,active', { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } });
    if (!r.ok) return {};
    var rows = await r.json(); var m = {};
    rows.forEach(function (x) { m[x.brand_id] = (x.active === false) ? null : x.display_order; });
    return m;
  } catch (e) { return {}; }
}
// recs에 order 부여(미등록 브랜드=9999 뒤로) + 비활성(null) 제외. 최종 정렬·상위N은 클라(result.js)가 fit 자격 후 order로.
function decorateRecs(recs, ord) {
  return (recs || [])
    .filter(function (r) { return ord[r.brandId] !== null; })
    .map(function (r) { r.order = (ord[r.brandId] == null ? 9999 : ord[r.brandId]); return r; });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  var URL = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!URL || !KEY) return res.status(500).json({ error: 'missing supabase env' });
  if (!FitEngine || !FitEngine._real) return res.status(500).json({ error: 'engine unavailable' });
  var SPECS = await getSpecs(URL, KEY);   // garment 테이블(admin CRUD) · rev 캐시
  if (!SPECS || !SPECS.length) return res.status(500).json({ error: 'garments unavailable' });

  var b = req.body || {};
  var sex = b.sex === 'male' ? 'male' : 'female';
  var prefs = b.prefs || {};
  var exps = Array.isArray(b.experiences) ? b.experiences : [];

  // ① 역산: 착용경험 → 부위별 인체 cm(prior 덮어쓰기용). ② 추천은 병합 cm으로.
  var eb = (FitEngine.bodyFromExperiences ? FitEngine.bodyFromExperiences(exps, SPECS) : {}) || {};
  var cm = {};
  var srcCm = b.cm || {};
  Object.keys(srcCm).forEach(function (k) { cm[k] = srcCm[k]; });     // 클라 추정 cm
  Object.keys(EBMAP).forEach(function (k) { if (eb[k] != null) cm[EBMAP[k]] = eb[k]; });  // 역산 덮어쓰기

  var topRecs = (cm.chestFull != null)
    ? FitEngine.recommend({ chest: cm.chestFull, shoulder: cm.shoulder }, prefs.TOP || 'regular', sex, 'long_sleeve', SPECS) : [];
  var botRecs = (FitEngine.recommendBottom && cm.waist != null)
    ? FitEngine.recommendBottom({ waist: cm.waist, hip: cm.hip, thigh: cm.thigh }, prefs.BOTTOM || 'regular', sex, 'long_pants', SPECS) : [];

  // 브랜드 노출 순서(admin) 반영 — recs에 order 부여 + 비활성 제외. 클라는 fit 자격 후 order로 정렬.
  var ord = await brandOrderMap(URL, KEY);
  topRecs = decorateRecs(topRecs, ord);
  botRecs = decorateRecs(botRecs, ord);

  // 진단 저장 — 입력 원본 + 결과(카드·신뢰도·추천). 추천은 브랜드×사이즈만(실측표 원본 아님).
  var row = {
    session_id: b.session_id || ('anon-' + Date.now().toString(36)),
    category: b.category || 'TOP',
    input: b.input != null ? b.input : { basic: b.basic, prefs: prefs, experiences: exps },
    result: { card: b.card || null, confidenceTier: b.confidenceTier || null, recs: { top: topRecs, bottom: botRecs } },
    engine_version: b.engine_version || 'server-1'
  };
  var r = await fetch(URL + '/rest/v1/diagnosis', {
    method: 'POST',
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(row)
  });
  var t = await r.text();
  if (!r.ok) return res.status(502).json({ error: 'supabase insert failed', detail: t });
  var id = null; try { id = JSON.parse(t)[0].id; } catch (e) {}
  return res.status(201).json({ id: id, eb: eb, topRecs: topRecs, botRecs: botRecs });
};
