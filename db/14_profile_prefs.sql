-- =============================================================================
-- db/14_profile_prefs.sql — 프로필의 핏 취향을 계정에 저장
--
-- 왜: 마이 > 프로필의 '상의/하의 핏 취향'만 서버로 가지 않았다. upsertProfile이
--     display_name·email·basic{gender,height,weight,age}만 보내고, 핏 취향은 브라우저
--     localStorage(fitting.user)에만 남았다. 저장 버튼은 "프로필을 저장했어요"라고
--     말하는데 기기를 바꾸거나 로컬을 지우면 그 두 값만 사라진다 — 말과 동작이 어긋난다.
--
-- 무엇: profile.prefs jsonb 추가. {fitTop, fitBottom} — 화면에서 쓰는 한글 라벨
--       그대로 넣는다('슬림'·'와이드'). 엔진 키(regular·wide 등)가 아니다:
--       이 값은 마이 프로필 표시용이고, 진단에 쓰는 선호 핏은 진단(diag-fit)에서
--       매번 따로 받아 diagnosis.input.prefs에 남는다. 둘을 같은 컬럼에 섞지 않는다.
--
-- basic에 넣지 않은 이유: basic은 '재진단 프리필'로 diag-basic 입력 형식과 1:1이다.
--   여기에 다른 성격의 키를 섞으면 프리필이 모르는 필드를 흘리게 된다.
--
-- 딸려오는 것(추가 작업 없음):
--   · export_my_data()는 to_jsonb(profile) 전체 행이라 내려받기 CSV에 자동 포함된다.
--   · withdraw_account()는 profile 행을 삭제하므로 탈퇴 시 함께 파기된다.
--
-- ⚠ 적용 순서: 이 SQL을 Supabase에 먼저 적용한 뒤 클라이언트를 배포할 것.
--   순서가 뒤집히면 upsert가 없는 컬럼을 써서 프로필 저장 전체가 실패한다(PGRST204).
-- =============================================================================

alter table profile add column if not exists prefs jsonb;

comment on column profile.prefs is
  '핏 취향 {fitTop, fitBottom} — 마이 프로필 표시용 한글 라벨. 진단이 쓰는 선호 핏은 diagnosis.input.prefs.';
