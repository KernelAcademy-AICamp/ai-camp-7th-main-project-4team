/* api/lead.js — Vercel 서버리스 함수 (CJS).
   스타일리스트찾기 페이크도어 수요 신호 저장 → lead 행 생성. [db/02_lead.sql]
   실매칭 없이 "얼마나 원하나"만 측정. 목업 downstream은 열지 않음.
   env(Vercel): SUPABASE_URL · SUPABASE_SECRET_KEY(서버 전용, RLS 우회). */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  var URL = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!URL || !KEY) return res.status(500).json({ error: 'missing supabase env' });

  var b = req.body || {};
  var kind = b.kind === 'notify' ? 'notify' : 'quote';
  var row = {
    session_id: b.session_id || null,
    kind: kind,
    service: b.service || null,
    occasion: b.occasion || null,
    budget: b.budget || null,
    note: b.note || null,
    stylist: b.stylist || null,
    contact: b.contact || null
  };

  var r = await fetch(URL + '/rest/v1/lead', {
    method: 'POST',
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(row)
  });
  if (!r.ok) return res.status(502).json({ error: 'supabase insert failed', detail: await r.text() });
  return res.status(201).json({ ok: true });
};
