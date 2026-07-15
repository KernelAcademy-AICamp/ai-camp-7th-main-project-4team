/* api/diagnose.js — Vercel 서버리스 함수 (CJS).
   진단 1건 기록(store) → diagnosis 행 생성, id 반환. [마일스톤1 §3·§4 · db/00]
   ※ 현재는 클라이언트 엔진 결과를 저장만. 엔진 서버 실행(단계 D)은 이후 이 함수 안으로.
   env(Vercel): SUPABASE_URL · SUPABASE_SECRET_KEY(서버 전용, RLS 우회). */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  var URL = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SECRET_KEY;
  if (!URL || !KEY) return res.status(500).json({ error: 'missing supabase env' });

  var b = req.body || {};
  if (b.input == null || b.result == null) return res.status(400).json({ error: 'input/result required' });

  var row = {
    session_id: b.session_id || ('anon-' + Date.now().toString(36)),
    category: b.category || 'TOP',
    input: b.input,               // {basic, prefs, experiences}
    result: b.result,             // {card, recs, confidenceTier}
    engine_version: b.engine_version || 'unknown'
  };

  var r = await fetch(URL + '/rest/v1/diagnosis', {
    method: 'POST',
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(row)
  });
  var t = await r.text();
  if (!r.ok) return res.status(502).json({ error: 'supabase insert failed', detail: t });
  var id = null; try { id = JSON.parse(t)[0].id; } catch (e) {}
  return res.status(201).json({ id: id });
};
