-- =============================================================================
-- 핏팅 DB — lead (페이크도어 수요 신호)   [db/00 이후 추가 마이그레이션]
-- 스타일리스트찾기 페이크도어가 수집하는 수요(견적 요청 의향·오픈 알림 신청).
-- 실매칭은 v2 — 여기선 "얼마나 원하나"만 측정. is_admin()은 db/00에서 정의됨.
-- 적용: Supabase SQL Editor에 이 파일 실행(db/00 먼저 적용돼 있어야 함).
-- =============================================================================

create table lead (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  session_id  text,                              -- 익명 세션(진단과 연결 가능)
  kind        text not null check (kind in ('quote','notify')),  -- 견적요청 / 오픈알림
  service     text,                              -- online|shopping|image
  occasion    text,                              -- 상황(소개팅·면접 등)
  budget      text,
  note        text,
  stylist     text,                              -- 지명이면 스타일리스트명(옵션)
  contact     text                               -- 알림받을 연락(옵션)
);
create index on lead (created_at desc);
create index on lead (kind);

-- RLS: 쓰기=서버(service_role, /api/lead) · 읽기=관리자(수요 대시보드)
alter table lead enable row level security;
create policy lead_admin_read on lead for select using (is_admin());
-- insert 정책 없음 → anon/authenticated 쓰기 차단(서버 service_role만)

-- 수요 요약 뷰(관리자용) — 서비스·상황·kind별 집계
create view lead_summary with (security_invoker = true) as
select kind, service, occasion, count(*) as n
from lead group by kind, service, occasion order by n desc;
