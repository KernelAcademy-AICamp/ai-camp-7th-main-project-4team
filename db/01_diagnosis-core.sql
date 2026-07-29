-- =============================================================================
-- 핏팅 DB 스키마 — 진단 도메인 (정규화 목표)   [초안 v0]  ※ MVP 아님
-- 타깃: Supabase (PostgreSQL)
--
-- ★ 이건 MVP가 아니라 "MVP 이후" 정규화 목표 모델이다.
--   · 실제 MVP DB = db/00_mvp.sql (diagnosis·feedback jsonb + admin + kill_metric)
--   · 이 파일은 로그인·저장·재진단이 실기능이 될 때 그 jsonb 블롭을 정규화해
--     들어갈 목표(User·BodyProfile·Anchor …). 조기 적용 금지, 폐기도 아님.
--   · ⚠ db/00_mvp.sql과 같은 DB에 동시 실행 금지 — diagnosis/feedback 이름 충돌.
--     (00=MVP jsonb 버전 / 01=정규화 버전, 상호 배타)
--
-- 도출: 화면 localStorage 계약 + 생성물 JSON(garments/bodytypes/body-model)
--        + docs/5_정책·데이터.md §4 · 엔티티 맵(존별)
-- 범위: User · BodyProfile · Consent · Diagnosis · Anchor · SizeRecommendation
--        · Feedback + 마스터(Brand · Garment · BodyType)
-- 주의: 매칭/공급자/신뢰지원은 별도 파일(02~), 결제·B2B(v2/v3)는 미포함.
-- 소유 주의: DB는 팀장(data/**) 경계 — 이 초안은 검토·조율용.
-- =============================================================================

-- ── 확장 ─────────────────────────────────────────────────────────────────────
create extension if not exists pgcrypto;   -- gen_random_uuid()

-- ── ENUM (화면 코드의 status/enum에서 그대로) ────────────────────────────────
create type gender            as enum ('male','female');
create type fit_pref          as enum ('타이트','슬림','레귤러','여유','오버');
create type garment_category  as enum ('TOP','BOTTOM');
create type wear_feel         as enum ('딱맞음','큼','작음');
create type consent_basis     as enum ('service','improve');   -- 서비스제공(기본) vs 엔진개선(opt-in)

-- =============================================================================
-- 마스터 데이터 (생성물 · 버저닝 레퍼런스) — 사용자 트랜잭션과 분리
-- =============================================================================

-- 브랜드
create table brand (
  id         text primary key,                 -- 'uniqlo','musinsa-standard',...
  name       text not null,
  is_anchor  boolean not null default false,   -- 앵커 브랜드(착용경험 수집 대상)
  tier       text                              -- garment실측 / 신체범위 등 수집형태
);

-- 8체형 (표현 데이터 · 단일출처 bodytypes.json)
create table body_type (
  code         text primary key,               -- STR,TRI,INV,HRG,BAL,DIA,RND,TUB
  name         text not null,                  -- '시크 스트레이트'
  size_korea   text,                           -- 사이즈코리아 분류(사각체형 등)
  silhouette   text,                           -- straight/triangle/...
  point_color  text,                           -- 유형색 #2E4A3B
  content      jsonb not null                  -- gender.{female,male}.{profile,fitOk,fitNo,insight,match,signature}
);

-- 브랜드 실측 스펙 (★ 비노출 — 수집증거·해자. 공개 API/화면 금지)
create table garment (
  id          bigint generated always as identity primary key,
  brand_id    text not null references brand(id),
  category    garment_category not null,
  gender      gender,
  fit_line    text,                            -- 브랜드 핏라인(레귤러/슬림/오버 등)
  subtype     text,                            -- 셔츠/니트/데님/슬랙스 ...
  size_label  text not null,                   -- S/M/L, 28/30/32 ...
  size_order  smallint,                        -- 정렬용
  garment_cm  jsonb not null,                  -- TOP:{length,shoulder,chest,sleeve} / BOTTOM:{length,waist,hip,thigh,rise,hem}
  product     text,
  unique (brand_id, category, gender, fit_line, subtype, size_label)
);
create index on garment (brand_id, category);

-- =============================================================================
-- 사용자 — 신원(User) ↔ 신체(BodyProfile) 분리
--   신체=민감정보(별도 파기·RLS) · 시점 버저닝 · 비로그인 진단 vs lazy 가입
-- =============================================================================

-- 계정·신원  (실 Supabase: id → auth.users(id), email/phone은 auth.users가 정본)
create table app_user (
  id                uuid primary key default gen_random_uuid(),
  name              text,
  email             text unique,
  phone             text,
  connected_account text,                       -- '카카오' 등 소셜
  created_at        timestamptz not null default now()
);

-- 신체 프로필 (민감 · 현재값 · 버전) — 비로그인 세션 허용(가입 시 user_id 병합)
create table body_profile (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references app_user(id) on delete cascade,   -- nullable: 비로그인
  session_key  text,                             -- 비로그인 식별(가입 시 user_id로 승격)
  gender       gender  not null,
  age          smallint,
  height_cm    smallint not null,
  weight_kg    smallint not null,
  fit          fit_pref,                         -- 선호핏
  type_code    text references body_type(code),  -- 최신 진단 결과(비정규 캐시)
  version      int not null default 1,
  updated_at   timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  check (user_id is not null or session_key is not null)
);
create index on body_profile (user_id);

-- 동의 (진단=서비스제공 근거로 동의 불요 / 엔진개선만 opt-in)
create table consent (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references app_user(id) on delete cascade,
  session_key    text,
  engine_improve boolean not null default false, -- opt-in
  basis          consent_basis not null default 'service',
  created_at     timestamptz not null default now()
);
create index on consent (user_id);

-- =============================================================================
-- 진단 (이벤트 · 불변) — 진단 시점 신체를 스냅샷으로 보관(시점 버저닝의 실체)
-- =============================================================================
create table diagnosis (
  id              uuid primary key default gen_random_uuid(),
  body_profile_id uuid references body_profile(id) on delete set null,  -- 출처(provenance)
  user_id         uuid references app_user(id) on delete set null,
  -- ── 진단 시점 신체 스냅샷(불변) ──
  gender          gender not null,
  height_cm       smallint not null,
  weight_kg       smallint not null,
  age             smallint,
  -- ── 결과 ──
  result_type     text references body_type(code),   -- 8유형 판정
  confidence      numeric(4,3),                        -- 0.000~1.000 (착용경험 수↑ → ↑)
  created_at      timestamptz not null default now()
);
create index on diagnosis (user_id, created_at desc);
create index on diagnosis (body_profile_id);

-- 착용경험 앵커 (정규화 — 진단당 N개) : A축 실측 특정 + 앵커 통계·검열추정 재사용
create table anchor (
  id           uuid primary key default gen_random_uuid(),
  diagnosis_id uuid not null references diagnosis(id) on delete cascade,
  brand_id     text references brand(id),
  category     garment_category not null,
  fit_line     text,
  size_label   text,
  feel         wear_feel not null,               -- 딱맞음/큼/작음
  subtype      text
);
create index on anchor (diagnosis_id);
create index on anchor (brand_id, category);

-- 브랜드별 추천 (파생 · 엔진 산출) — 실시간 계산 가능, 캐시/이력용 테이블
create table size_recommendation (
  diagnosis_id     uuid not null references diagnosis(id) on delete cascade,
  brand_id         text not null references brand(id),
  category         garment_category not null,
  recommended_size text not null,
  fit_score        numeric(4,3),                 -- 적합도(파생)
  basis            text,                         -- '가슴 기준' 등
  ease             jsonb,                        -- 부위별 여유
  primary key (diagnosis_id, brand_id, category)
);

-- 진단 정확도 응답 (킬 메트릭 ≥65%)
create table feedback (
  id           uuid primary key default gen_random_uuid(),
  diagnosis_id uuid not null references diagnosis(id) on delete cascade,
  accurate     boolean,                          -- 맞음/틀림
  rating       smallint,                         -- optional 1~5
  brand_id     text references brand(id),
  pain_point   text,                             -- 미표기∩페인 축
  created_at   timestamptz not null default now()
);
create index on feedback (diagnosis_id);

-- =============================================================================
-- RLS (Row Level Security)
--   · 사용자 소유 데이터: 본인만 (auth.uid())  ※ 비로그인 세션은 앱/anon-auth 처리
--   · 마스터: brand/body_type = 공개 읽기 / garment = 비노출(관리자·service_role만)
-- =============================================================================

-- 사용자 소유 — 본인 전용
alter table app_user     enable row level security;
create policy app_user_self   on app_user   for all
  using (id = auth.uid()) with check (id = auth.uid());

alter table body_profile enable row level security;
create policy body_profile_own on body_profile for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table consent      enable row level security;
create policy consent_own on consent for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table diagnosis    enable row level security;
create policy diagnosis_own on diagnosis for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 진단 자식 테이블 — 부모 diagnosis의 소유자로 판정
alter table anchor              enable row level security;
create policy anchor_own on anchor for all
  using (exists (select 1 from diagnosis d where d.id = anchor.diagnosis_id and d.user_id = auth.uid()))
  with check (exists (select 1 from diagnosis d where d.id = anchor.diagnosis_id and d.user_id = auth.uid()));

alter table size_recommendation enable row level security;
create policy sizerec_own on size_recommendation for all
  using (exists (select 1 from diagnosis d where d.id = size_recommendation.diagnosis_id and d.user_id = auth.uid()))
  with check (exists (select 1 from diagnosis d where d.id = size_recommendation.diagnosis_id and d.user_id = auth.uid()));

alter table feedback            enable row level security;
create policy feedback_own on feedback for all
  using (exists (select 1 from diagnosis d where d.id = feedback.diagnosis_id and d.user_id = auth.uid()))
  with check (exists (select 1 from diagnosis d where d.id = feedback.diagnosis_id and d.user_id = auth.uid()));

-- 마스터 — 공개 콘텐츠는 읽기 허용
alter table brand     enable row level security;
create policy brand_read      on brand      for select using (true);

alter table body_type enable row level security;
create policy body_type_read  on body_type  for select using (true);

-- garment: 원본 실측 비노출(해자). SELECT 정책을 열지 않음 → anon/authenticated 기본 거부.
--          service_role은 RLS 우회(서버 진단 계산), 관리자는 role 클레임으로만.
alter table garment   enable row level security;
create policy garment_admin_read on garment for select
  using (coalesce(auth.jwt() ->> 'role','') = 'admin');

-- =============================================================================
-- 비고 / 다음 단계
--   · 비로그인 세션(session_key) → 가입 시 body_profile/consent/diagnosis.user_id 병합 함수 필요.
--   · Diagnosis는 신체 스냅샷 보관으로 §3 시점 버저닝 충족(BodyProfile 편집/삭제와 무관).
--   · size_recommendation은 엔진 실시간 계산이 정본 — 이 테이블은 캐시/분석용(선택).
--   · 실 Supabase: app_user.id → auth.users(id), email/phone은 auth.users 정본으로 이관.
--   · 후속: 02_matching-lifecycle.sql (통합 Request→Match), 03_supplier-trust.sql
-- =============================================================================
