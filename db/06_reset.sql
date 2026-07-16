-- =============================================================================
-- 핏팅 DB — 테스트 로그 초기화용 admin 삭제 정책   [db/00·02 이후]
-- 초반 테스트 기간에 진단·피드백·수요 로그를 admin이 정리할 수 있도록 delete RLS 추가.
-- ⚠️ 되돌릴 수 없음. admin(is_admin)만. 실서비스 데이터가 쌓이면 신중히(또는 정책 회수).
-- 적용: Supabase SQL Editor 실행(db/00·02 먼저).
-- =============================================================================

create policy diagnosis_admin_delete on diagnosis for delete using (is_admin());
create policy feedback_admin_delete  on feedback  for delete using (is_admin());
create policy lead_admin_delete      on lead      for delete using (is_admin());
