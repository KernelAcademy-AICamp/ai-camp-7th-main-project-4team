-- =============================================================================
-- 핏팅 DB — 소비자 계정 + 개인화(진단 저장·이력·프로필·개인정보)   [db/00 이후]
--   ※ Phase 0a — 스타일리스트 마켓(요청·찜) 제외. 로그인+개인화만.
--
-- 무엇: 익명 세션(session_id)으로만 남던 진단을 '계정'에 귀속시켜 저장·이력·기기간
--       동기화·개인정보(내려받기/삭제/동의)를 가능케 한다. 진단 자체는 여전히 익명 가능 —
--       로그인은 '저장' 시점에만(킬메트릭 전환 보호).
--
-- ★ 새 RLS 패턴: 지금까지 RLS는 is_admin() / service_role뿐이었다. 여기서 처음으로
--   '로그인 최종사용자가 자기 행만 소유(auth.uid() = 소유자)'를 도입한다.
--
-- 인증: Supabase Auth — 소비자는 이메일 매직링크 + Google. (관리자와 같은 프로젝트,
--   admin-auth.js OAuth 흐름 재사용.) ※Supabase 대시보드에서 Email/Google provider
--   활성화 + 리다이렉트 URL 등록이 선결(팀장 스텝).
--
-- claim: 익명 진단(session_id)을 로그인 시 계정으로 귀속 — claim_admin() 패턴 복제.
--   "익명 진단 → 로그인하니 내 이력에 있음"을 무마찰로.
--
-- 개인정보(PII): 실계정은 개인정보 → 처리방침·동의 갱신이 배포 선결(docs/5·법적).
-- 적용: Supabase SQL Editor 실행(db/00 먼저). service_role은 계속 RLS 우회(서버 쓰기).
-- =============================================================================

-- ── ① 프로필 (계정 1행 = auth 사용자 1명) ────────────────────────────────────
create table profile (
  id                     uuid primary key references auth.users(id) on delete cascade,
  display_name           text,
  email                  text,                               -- 필수 연락처. provider가 주면 그 값, 카카오 무이메일이면 로그인 시 입력받아 저장. (식별은 email 아니라 id=auth.uid)
  basic                  jsonb,                              -- {gender, height, weight, age} — 재진단 프리필
  engine_improve_consent boolean not null default false,     -- 진단 개선 활용 동의(opt-in) — 계정 단위 1회
  age_attested           boolean not null default false,     -- 만 14세↑/법정대리인 확인
  agreed_at              timestamptz,                        -- 약관·처리방침 동의 시점(가입 플로우가 set)
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
-- 이미 profile을 적용한 DB에 email 컬럼 추가(멱등) — 신규 설치는 위 create에 이미 있어 no-op.
alter table profile add column if not exists email text;

-- updated_at 자동 갱신
create or replace function touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
drop trigger if exists profile_touch on profile;
create trigger profile_touch before update on profile
  for each row execute function touch_updated_at();

alter table profile enable row level security;
-- 본인 행만 소유 — 조회·생성·수정. (삭제는 계정탈퇴 RPC 또는 auth.users 삭제 cascade로.)
create policy profile_owner_read   on profile for select using (id = auth.uid());
create policy profile_owner_insert on profile for insert with check (id = auth.uid());
create policy profile_owner_update on profile for update using (id = auth.uid()) with check (id = auth.uid());

-- ── ② 진단을 계정에 귀속 ──────────────────────────────────────────────────────
-- 기존 diagnosis(db/00)는 익명 session_id만. nullable user_id 추가(로그인 저장 시 채움).
alter table diagnosis add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists diagnosis_user_idx on diagnosis (user_id, created_at desc);

-- 소유자(로그인 사용자)는 자기 진단을 조회·삭제 가능. (기존 admin read·service_role write 유지 — 추가만.)
create policy diagnosis_owner_read   on diagnosis for select using (user_id is not null and user_id = auth.uid());
create policy diagnosis_owner_delete on diagnosis for delete using (user_id is not null and user_id = auth.uid());
-- ※ feedback(db/00)은 diagnosis에 FK(on delete cascade) — 진단 삭제 시 함께 삭제됨.
--    feedback 자체의 소유자 조회/내보내기는 아래 export RPC로(직접 RLS 대신).

-- ── ③ 익명 세션 진단 → 계정 귀속 (claim) ─────────────────────────────────────
-- 로그인 후 호출: 현재 브라우저 세션(session_id)의 아직 주인 없는(user_id null) 진단을
--   내 계정으로 귀속. SECURITY DEFINER로 RLS 우회하되, 조건(해당 session_id·미귀속)만.
--   반환 = 귀속된 건수. 여러 익명 세션이 있으면 로그인 시마다 해당 세션분을 흡수.
create or replace function claim_diagnoses(p_session_id text) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer := 0;
begin
  if auth.uid() is null or p_session_id is null or p_session_id = '' then return 0; end if;
  update diagnosis
     set user_id = auth.uid()
   where session_id = p_session_id and user_id is null;
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on function claim_diagnoses(text) to authenticated;

-- ── ④ 개인정보 — 내려받기(export) · 삭제(delete) ──────────────────────────────
-- 내 데이터 전부(프로필·진단·피드백)를 한 번에 json으로. SECURITY DEFINER(본인분만).
create or replace function export_my_data() returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return null; end if;
  return jsonb_build_object(
    'profile',   (select to_jsonb(p) from profile p where p.id = uid),
    'diagnoses', (select coalesce(jsonb_agg(to_jsonb(d) order by d.created_at desc), '[]'::jsonb)
                    from diagnosis d where d.user_id = uid),
    'feedback',  (select coalesce(jsonb_agg(to_jsonb(f)), '[]'::jsonb)
                    from feedback f join diagnosis d on d.id = f.diagnosis_id where d.user_id = uid)
  );
end $$;
grant execute on function export_my_data() to authenticated;

-- 내 데이터 삭제: 내 진단(→feedback cascade) + 프로필. auth 계정 자체 삭제는 Auth API로 별도.
create or replace function delete_my_data() returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return; end if;
  delete from diagnosis where user_id = uid;   -- feedback은 FK on delete cascade
  delete from profile   where id = uid;
end $$;
grant execute on function delete_my_data() to authenticated;

-- =============================================================================
-- 클라이언트 배선 가이드 (개발자 lane)
--   로그인: supabase.auth.signInWithOtp({email}) / signInWithOAuth({provider:'google'})
--   최초 로그인: upsert profile(id=auth.uid, display_name, basic)  ← RLS owner_insert 통과
--   귀속:   await supabase.rpc('claim_diagnoses', { p_session_id: FITTING.session })
--   이력:   select id, created_at, category, result from diagnosis
--             where user_id = auth.uid() order by created_at desc   ← owner_read 통과
--   프리필: profile.basic → diag-basic 초기값
--   개인정보: rpc('export_my_data') / rpc('delete_my_data')  (mp-privacy 패널)
--
-- 게이팅(0a.7): api+계정ON에서 My는 mp-diag/mp-profile/mp-privacy만 노출.
--   mp-req/mp-fav/mp-support/mp-noti는 마켓·지원 백엔드 전까지 숨김('준비 중').
--
-- ※ 검증: anon(비로그인) 조회 차단 · 사용자 A가 B의 진단 조회 불가(owner_read).
--         service_role 서버 쓰기 계속 통과. is_admin() 대시보드 조회 유지.
-- =============================================================================
