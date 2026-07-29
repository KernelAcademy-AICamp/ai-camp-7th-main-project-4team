-- =============================================================================
-- 핏팅 DB — 관리자 초대(허용목록) + 로그인 시 자동 승격   [db/00 이후]
-- 흐름: 기존 admin이 이메일 초대 → 그 계정이 구글 로그인하면 claim_admin()이 자동으로
--       admin_user에 승격(초대 소진). 브라우저는 auth.users를 못 읽으니 초대(이메일) 방식.
-- 보안: 초대 쓰기=admin만(RLS) · claim_admin은 "이메일이 초대목록에 있을 때만" 삽입(SECURITY DEFINER).
-- 적용: Supabase SQL Editor 실행(db/00 먼저).
-- =============================================================================

create table admin_invite (
  email       text primary key,
  invited_by  text,
  invited_at  timestamptz not null default now()
);
alter table admin_invite enable row level security;
create policy admin_invite_admin_read   on admin_invite for select using (is_admin());
create policy admin_invite_admin_insert on admin_invite for insert with check (is_admin());
create policy admin_invite_admin_delete on admin_invite for delete using (is_admin());

-- admin_user: 관리자 관리 페이지가 전체 목록 조회 + 해제(delete)하도록 정책 추가.
-- (기존 admin_self_read=본인만. insert 정책은 없음 — 승격은 claim_admin()만.)
create policy admin_user_admin_read   on admin_user for select using (is_admin());
create policy admin_user_admin_delete on admin_user for delete using (is_admin());

-- 로그인 후 호출: 내 이메일이 초대목록에 있으면 admin_user로 승격하고 초대 소진. 반환=승격여부.
-- SECURITY DEFINER라 RLS 우회하되, 조건(초대목록 존재)으로만 삽입 → 비초대자 호출은 무해.
create or replace function claim_admin() returns boolean
language plpgsql security definer set search_path = public as $$
declare em text; promoted boolean := false;
begin
  em := auth.email();
  if em is null then return false; end if;
  if exists (select 1 from admin_invite where lower(email) = lower(em))
     and not exists (select 1 from admin_user where id = auth.uid()) then
    insert into admin_user (id, email) values (auth.uid(), em) on conflict (id) do nothing;
    delete from admin_invite where lower(email) = lower(em);
    promoted := true;
  end if;
  return promoted;
end $$;
grant execute on function claim_admin() to authenticated;
