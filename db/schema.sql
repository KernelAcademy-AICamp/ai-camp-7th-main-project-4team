-- 핏팅 — 마일스톤1 "측정 가능한 MVP" 스키마
-- 사용법: Supabase 프로젝트 생성 → SQL Editor에 이 파일 전체를 붙여넣고 Run.
-- 설계 배경: docs/마일스톤1-측정가능MVP.md §3
--
-- 목적: 진단 스냅샷 + 피드백을 저장해 킬 메트릭(사이즈 정확도 ≥65%)을 측정 가능하게.

create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ── 진단 스냅샷 ────────────────────────────────────────────────
create table if not exists diagnosis (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  session_id     text not null,                 -- 익명 세션(쿠키 uuid) · 로그인 없음
  category       text not null default 'TOP',
  input          jsonb not null,                -- {basic, prefs, experiences}
  result         jsonb not null,                -- {card, recs, confidenceTier}
  engine_version text not null
);
create index if not exists diagnosis_created_idx on diagnosis (created_at);

-- ── 피드백(킬 메트릭 원천) ─────────────────────────────────────
create table if not exists feedback (
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
create index if not exists feedback_diagnosis_idx on feedback (diagnosis_id);

-- ── 킬 메트릭 뷰: aware_brand 검증 중 '맞음' 비율 ───────────────
create or replace view kill_metric as
select count(*)                                as n,
       count(*) filter (where verdict='맞음')  as agree,
       round(100.0 * count(*) filter (where verdict='맞음') / nullif(count(*),0), 1) as accuracy_pct
from feedback
where aware_brand;

-- ── 보안(RLS) ──────────────────────────────────────────────────
-- RLS를 켜되 anon 정책은 만들지 않는다. 모든 읽기/쓰기는 서버 라우트가
-- service_role 키로만 수행(키는 서버 전용·절대 클라이언트 노출/커밋 금지).
-- → 브라우저에서 DB 직접 접근 불가 = 체형 등 민감정보 보호.
alter table diagnosis enable row level security;
alter table feedback  enable row level security;

-- 측정 확인(팀장): SELECT * FROM kill_metric;
