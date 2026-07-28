-- =============================================================================
-- db/12 — 회원 탈퇴 (Phase 0a 후속)
--
-- 정책: 탈퇴 시 **개인정보는 파기**하되, **진단을 위해 제출된 정보는 비식별 처리해 보존**한다.
--   · 파기   = profile(이메일·표시명·신체 프로필) + auth 계정(서버 라우트 /api/withdraw)
--   · 비식별 = diagnosis(input·result)는 남기되 사람과의 연결선을 전부 끊는다
--       - user_id   → null            (계정 연결 해제)
--       - session_id → 무작위 치환      (브라우저 세션과의 상관·재귀속 차단)
--     남는 건 성별·연령대·키·몸무게·착용경험·결과뿐 — 특정 개인을 알아볼 수 없다.
--
-- 왜 보존하나: 진단 데이터는 엔진(사이즈 번역) 정확도의 원천이다. 탈퇴자마다 통째로
--   지우면 축적이 무너진다. 개인정보보호법상 **알아볼 수 없게 처리한 정보는 개인정보가
--   아니므로** 보존·활용할 수 있다. 단 그 전제(재식별 불가)를 코드가 실제로 지켜야 한다.
--
-- ⚠ 잔여 위험: input.experiences[].openNote는 사용자 자유서술이라 이론상 식별정보가
--   섞일 수 있다. 페인 발굴의 핵심 원천이라 남기되, 실제 노출 위험이 확인되면
--   여기서 함께 비우도록 확장할 것(정책 결정 필요).
--
-- 적용: Supabase SQL Editor에서 실행. 멱등(create or replace).
-- =============================================================================

-- 탈퇴: 개인정보 파기 + 진단 비식별화. auth 계정 삭제는 서버 라우트가 이어서 수행한다
--   (클라이언트 키로는 auth.users를 지울 수 없음 — service_role 필요).
-- ※ 계정만 지워도 FK가 profile을 cascade 삭제하고 user_id를 null로 만들지만,
--    session_id는 그대로 남아 브라우저 세션과 연결이 유지된다 → 이 함수가 반드시 필요.
create or replace function withdraw_account() returns json
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); n integer := 0;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'no session'); end if;

  update diagnosis
     set user_id    = null,
         session_id = 'withdrawn:' || gen_random_uuid()   -- not null 컬럼이라 비우지 못한다 → 무작위 치환
   where user_id = uid;
  get diagnostics n = row_count;

  delete from profile where id = uid;   -- 이메일·표시명·신체 프로필 파기

  return json_build_object('ok', true, 'anonymized', n);
end $$;
grant execute on function withdraw_account() to authenticated;

-- =============================================================================
-- delete_my_data(db/11) 권한 회수 — 진단 데이터 통삭제 경로를 없앤다.
--
-- 정책 결정: 진단 기록은 서비스(사이즈 번역 정확도)의 원천이고, 이용자가 서비스를 쓰기
--   위해 치르는 최소한의 대가다. 탈퇴자마다 통째로 지우면 축적이 무너진다.
--   대신 이용자에게 두 가지를 보장한다:
--     ① 로그인 없이 진단을 끝까지 이용할 수 있다(계정을 만들 이유가 없으면 안 만들면 된다)
--     ② 가입·저장 시점에 '탈퇴해도 진단 기록은 비식별 처리해 보관한다'고 미리 알린다
--   개인정보(계정·이메일·표시명·프로필)는 탈퇴 시 즉시 파기하므로 삭제권은 보장된다.
--
-- ⚠ 버튼만 없애면 정책이 강제되지 않는다 — RPC는 토큰만 있으면 클라이언트가 직접 호출할 수
--   있다. 실행 권한 자체를 회수해야 코드가 정책과 일치한다.
-- ⚠⚠ authenticated에서만 회수하면 소용없다 — PostgreSQL은 함수를 만들 때 EXECUTE를 **PUBLIC에
--   기본 부여**하므로 그 경로가 그대로 남는다. (anon 키로 호출해 204가 떨어지는 것으로 확인했다.)
--   PUBLIC까지 회수해야 실제로 막힌다.
revoke execute on function delete_my_data() from public;
revoke execute on function delete_my_data() from anon;
revoke execute on function delete_my_data() from authenticated;
-- ※ 함수는 남겨둔다(운영자가 service_role로 개별 대응할 여지 — 법령상 삭제 의무 등).
-- =============================================================================
