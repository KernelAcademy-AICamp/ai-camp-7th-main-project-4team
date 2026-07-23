/* api/submit-garment.js — Vercel 서버리스 함수 (CJS).  [판정 ④ 수집 자산화]
   구매 판정에서 사용자가 올린 상품 사이즈표를, 엔진 개선 활용 opt-in 동의 시 저장.
   판정 자체는 클라 계산(동의 불필요). 이 저장은 consent=true일 때만 — 아니면 400.
   provenance: source(capture|manual) + confirmed_size(사용자 확인 줄). 검수(⑤)·승격 대상.
   실측표는 해자 — 반환 최소, 공개 노출 0. env: SUPABASE_URL · SUPABASE_SECRET_KEY(서버 전용). */
var fetchT = require('./_fetch.js').fetchT;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  var URL = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!URL || !KEY) return res.status(500).json({ error: 'missing supabase env' });

  var b = req.body || {};
  if (!b.consent) return res.status(400).json({ error: 'consent required' });   // opt-in 없으면 저장 안 함
  var sizes = Array.isArray(b.sizes) ? b.sizes.filter(function (s) { return s && s.garmentCm; }) : [];
  if (!sizes.length) return res.status(400).json({ error: 'sizes required' });

  var cat = b.category === 'BOTTOM' ? 'BOTTOM' : 'TOP';
  var row = {
    session_id: b.session_id || null,
    brand: b.brand ? String(b.brand).slice(0, 120) : null,
    product: b.product ? String(b.product).slice(0, 200) : null,
    category: cat,
    unit: b.unit === 'in' ? 'in' : 'cm',
    chest_basis: b.chestBasis === 'circ' ? 'circ' : b.chestBasis === 'flat' ? 'flat' : null,
    sizes: sizes,                                  // garments 규약(단면) 셀
    parsed_raw: b.parsedRaw != null ? b.parsedRaw : null,
    source: b.source === 'manual' ? 'manual' : 'capture',
    confirmed_size: b.confirmedSize != null ? String(b.confirmedSize).slice(0, 40) : null,
    consent: true,
    status: 'pending'
  };

  var r;
  try {
    r = await fetchT(URL + '/rest/v1/garment_submission', {
      method: 'POST',
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(row)
    });
  } catch (e) {
    // 상한 초과/네트워크 실패를 처리되지 않은 예외로 흘리지 않는다(500 대신 명시적 응답).
    return res.status(e && e.timeout ? 504 : 502).json({ error: e && e.timeout ? 'upstream timeout' : 'upstream unreachable' });
  }
  if (!r.ok) return res.status(502).json({ error: 'supabase insert failed', detail: await r.text() });
  return res.status(201).json({ ok: true });
};
