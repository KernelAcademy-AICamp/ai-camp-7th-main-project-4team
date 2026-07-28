/* web/js/config.js — 클라이언트 공개 설정 (커밋 OK · 공개값만).
   Supabase URL·Publishable 키는 공개 키라 클라이언트에 둬도 안전.
   ⚠️ Secret 키(sb_secret_...)는 절대 여기 두지 말 것 — 서버(Vercel env)에만.

   FITTING_MODE: 'proto'(로컬 데모·localStorage/클라엔진) / 'api'(서버·Supabase).
   기본 proto. 서버(Vercel env SUPABASE_SECRET_KEY) 준비되면 'api'로 스위치. */
(function (w) {
  w.SUPABASE_URL = 'https://mprdnzlzkmljblxracsj.supabase.co';
  w.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_dzmb3dYgDwZYWDoKt84uyA_J1MPfscJ';   // 공개 키(커밋 OK) — admin 클라이언트/RLS

  // 소비자 계정(Phase 0a: 로그인+개인화) 노출 플래그.
  //   활성 provider(Supabase Auth): Google·이메일 매직링크·카카오. (네이버=미지원→'준비 중')
  //
  //   2026-07-28 true로 전환 — 학원 팀플 발표용이라는 판단(사용자 결정). 켜면 실제 Supabase
  //   계정·profile 행이 생긴다(진짜 PII). 아래 둘은 여전히 미해결이며, 알고 켠 것이다:
  //     · 개인정보 처리방침 법적 검토 보류(privacy.html에 '검토 전 초안' 고지는 유지)
  //     · 커스텀 SMTP 미연결 — 내장 메일은 시간당 발송 한도가 낮아 이메일 로그인이 막힐 수 있다.
  //       발표 시연은 구글·카카오 로그인을 주 경로로 쓸 것(그쪽은 한도 없음).
  //   ↩︎ 되돌리려면 이 한 줄을 false로. 배포되면 인증 표면이 다시 전부 숨겨진다.
  w.ACCOUNTS_ENABLED = true;
  // (?accounts=on|off 쿼리로 임시 강제 — 기본값을 안 건드리고 로그인 흐름을 라이브 테스트하려고. mode와 같은 방식으로 세션 유지)
  //   ⚠️ on으로 켜면 실제 Supabase 계정·profile 행이 생긴다(진짜 PII). 처리방침 갱신 전에는 테스트 계정으로만 쓸 것.
  var acc = (location.search.match(/[?&]accounts=(on|off)/) || [])[1];
  try {
    if (acc) sessionStorage.setItem('fitting.accounts', acc);
    else acc = sessionStorage.getItem('fitting.accounts') || undefined;
  } catch (e) {}
  if (acc) w.ACCOUNTS_ENABLED = (acc === 'on');

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
