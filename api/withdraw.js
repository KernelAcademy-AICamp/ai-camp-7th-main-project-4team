/* api/withdraw.js — Vercel 서버리스 함수 (CJS).
   회원 탈퇴의 마지막 단계: Supabase Auth 계정(auth.users) 삭제.

   왜 서버인가: 계정 삭제는 admin 권한(service_role)이 필요해 클라이언트 키로는 불가능하다.
   순서: 클라이언트가 rpc('withdraw_account')로 개인정보 파기 + 진단 비식별화를 끝낸 뒤
         이 라우트를 호출한다. 여기서 계정을 지우면 되돌릴 수 없다.

   인증: 요청자의 access token을 그대로 받아 Supabase에 물어 uid를 확인한다.
         본인만 자기 계정을 지울 수 있게 하는 유일한 방어선 — body의 uid는 신뢰하지 않는다.

   env(Vercel): SUPABASE_URL · SUPABASE_SECRET_KEY(또는 SUPABASE_SERVICE_ROLE_KEY). */
var fetchT = require('./_fetch.js').fetchT;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  var URL = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!URL || !KEY) return res.status(500).json({ error: 'missing supabase env' });

  // 1) 토큰에서 본인 확인. Authorization 헤더가 없거나 유효하지 않으면 여기서 끝.
  var auth = req.headers && (req.headers.authorization || req.headers.Authorization);
  var token = auth && /^Bearer\s+(.+)$/i.test(auth) ? auth.replace(/^Bearer\s+/i, '') : null;
  if (!token) return res.status(401).json({ error: 'authorization required' });

  var who;
  try {
    who = await fetchT(URL + '/auth/v1/user', { headers: { apikey: KEY, Authorization: 'Bearer ' + token } });
  } catch (e) {
    return res.status(e && e.timeout ? 504 : 502).json({ error: e && e.timeout ? 'upstream timeout' : 'upstream unreachable' });
  }
  if (!who.ok) return res.status(401).json({ error: 'invalid token' });

  var user;
  try { user = JSON.parse(await who.text()); } catch (e) { return res.status(502).json({ error: 'bad user response' }); }
  var uid = user && user.id;
  if (!uid) return res.status(401).json({ error: 'invalid token' });

  // 2) 계정 삭제. profile은 FK(on delete cascade)로 함께, diagnosis.user_id는 on delete set null.
  //    진단 행 자체는 남는다 — withdraw_account()가 이미 세션 식별자까지 끊어 비식별 상태다.
  var del;
  try {
    del = await fetchT(URL + '/auth/v1/admin/users/' + encodeURIComponent(uid), {
      method: 'DELETE',
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
    });
  } catch (e) {
    return res.status(e && e.timeout ? 504 : 502).json({ error: e && e.timeout ? 'upstream timeout' : 'upstream unreachable' });
  }
  if (!del.ok) return res.status(502).json({ error: 'account delete failed', detail: await del.text() });

  return res.status(200).json({ ok: true });
};
