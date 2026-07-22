/* web/js/config.js — 클라이언트 공개 설정 (커밋 OK · 공개값만).
   Supabase URL·Publishable 키는 공개 키라 클라이언트에 둬도 안전.
   ⚠️ Secret 키(sb_secret_...)는 절대 여기 두지 말 것 — 서버(Vercel env)에만.

   FITTING_MODE: 'proto'(로컬 데모·localStorage/클라엔진) / 'api'(서버·Supabase).
   기본 proto. 서버(Vercel env SUPABASE_SECRET_KEY) 준비되면 'api'로 스위치. */
(function (w) {
  w.SUPABASE_URL = 'https://mprdnzlzkmljblxracsj.supabase.co';
  w.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_dzmb3dYgDwZYWDoKt84uyA_J1MPfscJ';   // 공개 키(커밋 OK) — admin 클라이언트/RLS

  // 모드 스위치: 기본 proto. 배포에서 측정 켤 때 'api'로(gen-app이 이 기본값을 'api'로 주입).
  // (?mode=api 쿼리로 임시 강제 — 스모크/로컬 테스트. 한 번 지정하면 세션 내 페이지 이동에도 유지)
  var forced = (location.search.match(/[?&]mode=(proto|api)/) || [])[1];
  try {
    if (forced) sessionStorage.setItem('fitting.mode', forced);
    else forced = sessionStorage.getItem('fitting.mode') || undefined;
  } catch (e) {}
  // 로컬 `npm run dev:api`(vercel dev · 3000포트)는 ?mode=api 없이도 api 기본 — 서버 라우트 테스트용.
  // (`npm run serve`=8000포트는 proto 유지=화면 개발용.) 명시적 ?mode=·저장값이 있으면 그게 우선.
  if (!forced && location.port === '3000') forced = 'api';
  w.FITTING_MODE = forced || 'proto';   // ← gen-app이 'proto'→'api' 치환(프로덕션은 항상 api)
  try { console.log('[fitting] mode:', w.FITTING_MODE); } catch (e) {}
})(window);
