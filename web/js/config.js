/* web/js/config.js — 클라이언트 공개 설정 (커밋 OK · 공개값만).
   Supabase URL·Publishable 키는 공개 키라 클라이언트에 둬도 안전.
   ⚠️ Secret 키(sb_secret_...)는 절대 여기 두지 말 것 — 서버(Vercel env)에만.

   FITTING_MODE: 'proto'(로컬 데모·localStorage/클라엔진) / 'api'(서버·Supabase).
   기본 proto. 서버(Vercel env SUPABASE_SECRET_KEY) 준비되면 'api'로 스위치. */
(function (w) {
  w.SUPABASE_URL = 'https://mprdnzlzkmljblxracsj.supabase.co';
  w.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_dzmb3dYgDwZYWDoKt84uyA_J1MPfscJ';   // 공개 키(커밋 OK) — admin 클라이언트/RLS

  // 모드 스위치: 기본 proto. 배포에서 측정 켤 때 'api'로.
  // (?mode=api 쿼리로 임시 강제 가능 — 예: 배포 후 스모크 테스트)
  var forced = (location.search.match(/[?&]mode=(proto|api)/) || [])[1];
  w.FITTING_MODE = forced || 'proto';
})(window);
