-- =============================================================================
-- 핏팅 DB — brand (진단 추천 브랜드 노출 순서 · admin 관리)   [db/00·db/03 이후]
-- 진단 결과의 추천 브랜드 = 핏 자격(잘 맞는 브랜드)을 먼저 거른 뒤, 이 테이블의
-- display_order 순으로 노출. admin이 순서·노출여부(active)를 편집 → 재배포 없이 반영.
-- /api/diagnose가 service_role로 읽어 recs에 order 부여. is_admin()은 db/00 정의.
-- 적용: Supabase SQL Editor 실행(db/00 먼저) → scripts/import-garments.js가 브랜드 시드.
-- =============================================================================

-- 기본 순서 원칙: 사용자의 '실착 접근성'(오프라인 시착 편의)이 높은 브랜드를 위로.
-- 앵커 브랜드가 그 이유로 선정된 집합이라 앵커=상위(1..N), 비앵커=100. admin이 접근성 기준으로 조정.
create table brand (
  brand_id      text primary key,          -- garments.brandId (예: uniqlo, zara)
  brand_name    text,
  display_order int  not null default 100,  -- 작을수록 먼저 노출(실착 접근성 높은 순)
  active        boolean not null default true,  -- false면 진단 추천에서 제외
  updated_at    timestamptz not null default now()
);

-- RLS: admin 읽기+쓰기(순서 편집). /api/diagnose는 service_role(RLS 우회) 읽기. anon 차단.
alter table brand enable row level security;
create policy brand_admin_read   on brand for select using (is_admin());
create policy brand_admin_insert on brand for insert with check (is_admin());
create policy brand_admin_update on brand for update using (is_admin()) with check (is_admin());
