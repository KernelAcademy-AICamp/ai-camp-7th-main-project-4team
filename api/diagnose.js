/* api/diagnose.js — Vercel 서버리스 함수 (CJS).  [단계 D · 해자 보호]
   garments.json(브랜드 실측표)은 서버 전용 — 여기서만 require해 계산하고, 클라(app/)엔 배포 안 함.
   클라가 보낸 체형 추정 cm + 착용경험으로 ①역산(bodyFromExperiences) ②추천(recommend)만 서버 계산 →
   {eb, topRecs, botRecs} 반환 + diagnosis 1건 저장(id 반환 → 피드백 FK).
   ※ 체형 추정·8유형 분류·렌더는 클라 유지(민감치 아님). engine.js는 node 호환(무의존).
   env(Vercel): SUPABASE_URL · SUPABASE_SECRET_KEY(서버 전용, RLS 우회). */
var FitEngine = require('../web/js/engine.js').FitEngine;
var GARMENTS = require('../web/data/garments.json');
var SPECS = GARMENTS && GARMENTS.specs;
var EBMAP = { chest: 'chestFull', shoulder: 'shoulder', waist: 'waist', hip: 'hip', thigh: 'thigh' };

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  var URL = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!URL || !KEY) return res.status(500).json({ error: 'missing supabase env' });
  if (!SPECS || !FitEngine || !FitEngine._real) return res.status(500).json({ error: 'engine/garments unavailable' });

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
