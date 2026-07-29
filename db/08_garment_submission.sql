-- =============================================================================
-- 핏팅 DB — garment_submission (사용자가 캡처로 올린 상품 사이즈표)  [판정 ④ 수집 자산화]
-- 구매 판정(judge)에서 사용자가 올린 표를 opt-in 동의 시 저장 → 관리자 검수(⑤) → 정본 garment 승격.
-- 판정 자체는 동의 없이 클라에서 계산(서비스 제공). 이 저장은 '엔진 개선 활용' opt-in일 때만.
-- provenance: source(capture|manual) + confirmed_size(사용자가 눈으로 본 줄=신뢰↑). 나머지는 ocr.
-- 실측표는 해자 — 공개 노출 0. RLS 읽기=관리자, 쓰기=service_role(api/submit-garment)만.
-- 적용: Supabase SQL Editor에 실행(db/00 먼저). is_admin()은 db/00 정의.
-- =============================================================================

create table garment_submission (
  id             bigint generated always as identity primary key,
  session_id     text,                    -- 익명 세션(중복·재제출 추적)
  brand          text,                    -- 사용자 입력(선택)
  product        text,                    -- 사용자 입력(선택)
  category       text,                    -- TOP | BOTTOM
  unit           text default 'cm',       -- cm | in
  chest_basis    text,                    -- flat | circ (사용자 판정: 단면/둘레)
  sizes          jsonb not null,          -- [{sizeLabel, garmentCm:{...}}] — garments 규약(단면) 셀
  parsed_raw     jsonb,                    -- AI 원본 파싱(감사·재검용). 직접입력이면 null
  source         text default 'capture',  -- capture | manual
  confirmed_size text,                     -- 사용자가 확인한 사이즈 라벨(user_confirmed = 신뢰↑)
  consent        boolean default false,    -- 엔진 개선 활용 동의(opt-in) — false면 애초에 저장 안 함
  status         text default 'pending',   -- pending | verified | rejected | merged
  created_at     timestamptz default now()
);
create index on garment_submission (status);
create index on garment_submission (brand);
create index on garment_submission (category);

-- RLS: 읽기=관리자(is_admin) · 공개 쓰기 정책 없음 → service_role(api)만 insert/update
alter table garment_submission enable row level security;
create policy gsub_admin_read   on garment_submission for select using (is_admin());
create policy gsub_admin_update on garment_submission for update using (is_admin());
