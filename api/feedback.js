/* api/feedback.js — Vercel 서버리스 함수 (CJS).
   진단 정확도 피드백 기록(킬 메트릭 원천) → feedback 행 생성. [마일스톤1 §3 · db/00]
   verdict 매핑: 프로토타입(맞음/보통/안맞음) → 스키마(맞음/애매/틀림).
   env(Vercel): SUPABASE_URL · SUPABASE_SECRET_KEY(서버 전용, RLS 우회). */
var VERDICT_MAP = { '맞음': '맞음', '보통': '애매', '애매': '애매', '안맞음': '틀림', '틀림': '틀림' };

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  var URL = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SECRET_KEY;
  if (!URL || !KEY) return res.status(500).json({ error: 'missing supabase env' });

  var b = req.body || {};
  if (!b.diagnosis_id) return res.status(400).json({ error: 'diagnosis_id required' });
  var verdict = VERDICT_MAP[b.verdict];
  if (!verdict) return res.status(400).json({ error: 'invalid verdict' });

  var row = {
    diagnosis_id: b.diagnosis_id,
    verdict: verdict,
    actual_size: b.actual_size != null ? b.actual_size : null,
    other_brand_intent: b.other_brand_intent != null ? b.other_brand_intent : null,
    aware_brand: b.aware_brand !== false,               // 기본 true(아는 브랜드 검증 = 킬메트릭 조건)
    engine_improve_consent: !!b.engine_improve_consent,
    age_attested: !!b.age_attested
  };

  var r = await fetch(URL + '/rest/v1/feedback', {
    method: 'POST',
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(row)
  });
  if (!r.ok) return res.status(502).json({ error: 'supabase insert failed', detail: await r.text() });
  return res.status(201).json({ ok: true });
};
