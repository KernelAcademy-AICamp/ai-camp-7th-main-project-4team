-- =============================================================================
-- 핏팅 DB — garment CRUD(admin 직접 편집) + 진단 DB 소스 전환   [db/03·db/04 이후]
-- ① garment에 admin 쓰기(입력/수정/삭제) RLS 추가
-- ② garment 변경 시 garment_meta.rev 자동 증가 → /api/diagnose가 rev로 캐시 무효화(즉시 반영)
-- 적용: Supabase SQL Editor 실행(db/03 먼저).
-- =============================================================================

-- 진단 캐시 버전(garment 변경마다 +1). /api/diagnose가 이 값으로 실측표 캐시 갱신 판단.
alter table garment_meta add column if not exists rev bigint not null default 0;

-- garment INSERT/UPDATE/DELETE 시 rev 증가. security definer라 쓰는 admin의 RLS와 무관하게 갱신.
create or replace function bump_garment_rev() returns trigger
  language plpgsql security definer as $$
begin
  update garment_meta set rev = rev + 1 where id = 1;
  return null;
end $$;
drop trigger if exists garment_rev_bump on garment;
create trigger garment_rev_bump after insert or update or delete on garment
  for each statement execute function bump_garment_rev();

-- admin 쓰기(입력/수정/삭제). 읽기 정책(garment_admin_read)은 db/03에 이미 있음. 진단은 service_role(RLS 우회).
create policy garment_admin_insert on garment for insert with check (is_admin());
create policy garment_admin_update on garment for update using (is_admin()) with check (is_admin());
create policy garment_admin_delete on garment for delete using (is_admin());
