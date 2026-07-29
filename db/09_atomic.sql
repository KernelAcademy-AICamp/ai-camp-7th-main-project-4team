-- =============================================================================
-- 핏팅 DB — 원자적 admin 조작 + SECURITY DEFINER 하드닝 + spec 쓰기 검증  [db/03·05·06 이후]
-- 배경: PostgREST는 여러 요청을 한 트랜잭션으로 묶지 못한다. "삭제 후 삽입" 같은 조작이
--      중간에 실패하면 중복 행·부분 초기화가 남는다. 트랜잭션이 필요한 것만 RPC로 내린다.
-- 적용: Supabase SQL Editor 실행(db/00·03·05·06 먼저).
--      ⚠️ 클라이언트(admin-auth.js)는 RPC가 없으면 기존 경로로 폴백하므로, 적용 전에도 동작한다.
-- =============================================================================

-- ① SECURITY DEFINER search_path 고정 [db/05에서 누락]
--    정의자 권한으로 도는 함수가 search_path를 호출자에게 맡기면, 공격자가 자기 스키마의
--    가짜 garment_meta를 앞세워 정의자 권한 작업을 가로챌 수 있다(Supabase 린터 경고 항목).
create or replace function bump_garment_rev() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  update garment_meta set rev = rev + 1 where id = 1;
  return null;
end $$;

-- ② 진단 로그 초기화(진단+피드백)를 한 트랜잭션에서.
--    기존: feedback 삭제 성공 후 diagnosis 삭제 실패 → 피드백만 사라진 부분 초기화.
create or replace function admin_reset_diagnosis_logs()
  returns json language plpgsql security definer set search_path = public as $$
declare f_cnt int; d_cnt int;
begin
  if not is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  delete from feedback;  get diagnostics f_cnt = row_count;   -- FK(feedback→diagnosis) 때문에 먼저
  delete from diagnosis; get diagnostics d_cnt = row_count;
  return json_build_object('feedback', f_cnt, 'diagnosis', d_cnt);
end $$;
revoke all on function admin_reset_diagnosis_logs() from public;
grant execute on function admin_reset_diagnosis_logs() to authenticated;

-- ③ 실측표 셀 교체(구행 삭제 + 신행 삽입)를 한 트랜잭션에서.
--    기존: insert 성공 후 delete 실패 → 같은 셀에 구·신 행이 함께 남아 추천/판정이 뒤섞인다.
--    new_rows = [{brand_id, category, spec}, ...] (id 없음 — identity 생성)
create or replace function admin_replace_garment(old_ids bigint[], new_rows jsonb)
  returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if old_ids is not null and array_length(old_ids, 1) is not null then
    delete from garment where id = any(old_ids);
  end if;
  insert into garment (brand_id, category, spec)
    select r->>'brand_id', r->>'category', r->'spec'
    from jsonb_array_elements(coalesce(new_rows, '[]'::jsonb)) r;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function admin_replace_garment(bigint[], jsonb) from public;
grant execute on function admin_replace_garment(bigint[], jsonb) to authenticated;

-- ④ spec 최소 엔진 계약을 쓰기 경계에서 검증.
--    엔진(engine.js)이 반드시 읽는 키가 빠진 spec은 조용히 추천/판정에서 누락된다 → 저장 자체를 막는다.
--    not valid = 기존 행은 건드리지 않고 신규/수정 행부터 적용(운영 중 안전).
--    기존 행까지 검사하려면: alter table garment validate constraint garment_spec_contract;
alter table garment drop constraint if exists garment_spec_contract;
alter table garment add constraint garment_spec_contract check (
  spec ? 'category' and spec ? 'brandId' and spec ? 'sizeLabel'
  and jsonb_typeof(spec -> 'garmentCm') = 'object'
  and spec ->> 'category' in ('TOP', 'BOTTOM', 'OUTER', 'SKIRT', 'DRESS')
) not valid;
