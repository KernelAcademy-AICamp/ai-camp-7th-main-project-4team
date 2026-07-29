-- =============================================================================
-- 핏팅 DB — garment (브랜드 실측표 = 해자)   [db/00 이후 · 단계 D 연장]
-- garments.json을 DB로 이관해 admin이 로그인 후 RLS로만 조회(공개 노출 0).
-- 진단 계산은 여전히 /api/diagnose가 서버 번들의 garments.json으로 수행(별개).
-- 이 테이블은 admin 콘솔(사이즈·데이터) 표시·관리용. is_admin()은 db/00 정의.
-- 적용: Supabase SQL Editor에 실행(db/00 먼저) → scripts/import-garments.js로 시드.
-- =============================================================================

create table garment (
  id         bigint generated always as identity primary key,
  brand_id   text,                 -- 필터/인덱스(원본 spec.brandId)
  category   text,                 -- 필터/인덱스(원본 spec.category)
  spec       jsonb not null        -- 원본 spec 객체 전체(garmentCm 포함) — 라운드트립 무손실
);
create index on garment (brand_id);
create index on garment (category);

-- $meta(anchorBrands·fitLineMap·brandIdMap 등) 단일 행 보관
create table garment_meta (
  id    int primary key default 1,
  meta  jsonb not null,
  check (id = 1)
);

-- RLS: 읽기=관리자(is_admin) · 쓰기 정책 없음 → service_role(import)만
alter table garment enable row level security;
alter table garment_meta enable row level security;
create policy garment_admin_read      on garment      for select using (is_admin());
create policy garment_meta_admin_read on garment_meta for select using (is_admin());
