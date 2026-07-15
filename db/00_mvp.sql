-- =============================================================================
-- 핏팅 DB 스키마 — ★ 측정 가능한 MVP (실제 구현 범위)   [v0]
-- 타깃: Supabase (PostgreSQL) · 근거: docs/마일스톤1-측정가능MVP.md §3
--
-- MVP 범위 (이 파일이 곧 MVP DB 전부):
--   ① 측정      : diagnosis · feedback · kill_metric(view)   ← 마일스톤1 §3 그대로
--   ② 관리자 대시보드 실배선 : admin-diagnostics 화면이 위 데이터를 조회
--   ③ 관리자 로그인          : admin_user(허용목록) + is_admin() + RLS
--
-- 저장 형태: 진단 입력/결과는 jsonb 블롭(측정 우선). 정규화(User·BodyProfile·
--            Anchor …)는 db/01(진단 도메인 목표) — MVP 이후.
-- 쓰기: 진단/피드백 insert는 서버 라우트가 service_role로 (RLS 우회).
-- 읽기: 관리자 대시보드는 로그인 관리자 JWT로 RLS 통과해서 조회.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ── ① 측정 (마일스톤1 §3) ────────────────────────────────────────────────────
create table diagnosis (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  session_id     text not null,              -- 익명 세션(쿠키 uuid) · 로그인 없음
  category       text not null default 'TOP',
  input          jsonb not null,             -- {basic, prefs, experiences}
  result         jsonb not null,             -- {card, recs, confidenceTier}
  engine_version text not null
);
create index on diagnosis (created_at desc);

create table feedback (
  id                     uuid primary key default gen_random_uuid(),
  created_at             timestamptz not null default now(),
  diagnosis_id           uuid not null references diagnosis(id) on delete cascade,
  verdict                text not null check (verdict in ('맞음','애매','틀림')),
  actual_size            text,
  other_brand_intent     boolean,
  aware_brand            boolean not null default true,   -- 아는 브랜드 검증(킬메트릭 조건)
  engine_improve_consent boolean not null default false,
  age_attested           boolean not null default false
);
create index on feedback (diagnosis_id);
create index on feedback (created_at desc);

-- 킬 메트릭: aware_brand 검증 중 '맞음' 비율  (security_invoker → 조회자 RLS 적용)
create view kill_metric with (security_invoker = true) as
select count(*)                                            as n,
       count(*) filter (where verdict='맞음')             as agree,
       round(100.0*count(*) filter (where verdict='맞음')/nullif(count(*),0),1) as accuracy_pct
from feedback where aware_brand;

-- ── ③ 관리자 로그인 (Google OAuth + 이메일 2FA는 Supabase Auth에서) ───────────
-- 허용목록: 여기에 있는 auth 사용자만 관리자. (가입 자유가입 아님 — 시드/초대)
create table admin_user (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  role       text not null default 'admin',   -- admin | analyst(읽기전용) 등 확장 여지
  added_at   timestamptz not null default now()
);

-- 현재 로그인 사용자가 관리자인가
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admin_user a where a.id = auth.uid());
$$;

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- 원칙: anon 정책 없음. 쓰기=service_role(서버) 우회. 읽기=관리자만(대시보드).
alter table diagnosis  enable row level security;
alter table feedback   enable row level security;
alter table admin_user enable row level security;

-- ② admin-diagnostics 실배선: 로그인 관리자에게만 SELECT 허용
create policy diagnosis_admin_read on diagnosis for select using (is_admin());
create policy feedback_admin_read  on feedback  for select using (is_admin());
-- 관리자 자신은 허용목록 확인 가능(로그인 게이트에서 사용)
create policy admin_self_read on admin_user for select using (id = auth.uid());
-- ※ insert/update 정책 없음 → anon·authenticated 쓰기 차단.
--    진단/피드백 insert·허용목록 관리·kill_metric 집계는 서버(service_role)가 담당.

-- =============================================================================
-- admin-diagnostics 화면 ↔ 쿼리 매핑 (실배선 가이드)
--   화면은 로그인 관리자 JWT(anon key)로 아래를 조회 → RLS가 관리자만 통과시킴.
-- =============================================================================
-- · 정확도 KPI (킬 메트릭)
--     select accuracy_pct, n, agree from kill_metric;
--
-- · 신뢰도 캘리브레이션 (confidenceTier × 정확도)
--     select d.result->>'confidenceTier' as tier,
--            count(*) as n,
--            round(100.0*count(*) filter (where f.verdict='맞음')/nullif(count(*),0),1) as acc
--     from feedback f join diagnosis d on d.id=f.diagnosis_id
--     where f.aware_brand group by 1 order by 1;
--
-- · 8유형 분해 (체형별 정확도)
--     select d.result->'card'->>'type' as body_type,
--            count(*) as n,
--            round(100.0*count(*) filter (where f.verdict='맞음')/nullif(count(*),0),1) as acc
--     from feedback f join diagnosis d on d.id=f.diagnosis_id
--     where f.aware_brand group by 1 order by 2 desc;
--
-- · 응답 로그 (최근)
--     select f.created_at, f.verdict, f.actual_size, d.category, d.engine_version
--     from feedback f join diagnosis d on d.id=f.diagnosis_id
--     order by f.created_at desc limit 100;
--
-- 관리자 로그인 흐름(admin-login):
--   Supabase Auth(Google provider) 로그인 → (선택) 이메일 OTP 2FA →
--   서버가 auth.uid() ∈ admin_user 확인 → 아니면 접근 거부.
--   허용목록 시드: insert into admin_user(id,email) values ('<auth uid>','kang@…');
-- =============================================================================
