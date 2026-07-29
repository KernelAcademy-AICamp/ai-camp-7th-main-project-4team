-- =============================================================================
-- 핏팅 DB — garment_submission 멱등성(중복 제출 차단)   [db/08 이후]
-- 배경: 제출 API에 타임아웃이 생기면서(504) 클라가 재시도할 수 있는데, 원래 insert는
--      이미 성공했을 수 있다 → 같은 표가 두 번 쌓인다. 더블클릭·새로고침 재제출도 같은 문제.
-- 방식: 서버(api/submit-garment.js)가 제출 내용으로 dedupe_key(sha256)를 유도해 넣고,
--      유니크 인덱스가 중복을 막는다. 재시도는 409 → API가 200 {duplicate:true}로 정상 처리.
--      (클라이언트 변경 불필요 — 키는 내용에서 결정론적으로 나온다.)
-- 적용: Supabase SQL Editor 실행(db/08 먼저).
--      ⚠️ 미적용이어도 API는 키 없이 재시도하는 폴백이 있어 제출이 깨지지 않는다.
-- =============================================================================

alter table garment_submission add column if not exists dedupe_key text;

-- 부분 유니크: 기존(키 없는) 행들은 서로 충돌하지 않게 null 제외.
create unique index if not exists garment_submission_dedupe_uniq
  on garment_submission (dedupe_key) where dedupe_key is not null;
