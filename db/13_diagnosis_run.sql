-- =============================================================================
-- db/13_diagnosis_run.sql — 진단 저장을 '진단 실행' 단위로 (멱등)
--
-- 왜: 저장이 '진단 실행'이 아니라 '결과 렌더'에 묶여 있었다. result.html이 그려질 때마다
--     /api/diagnose가 호출되고 그때마다 행이 INSERT된다 —
--       · 마이 > 내 진단 결과 진입(iframe 로드)
--       · 새로고침 · 탭 재진입
--       · 계정 하이드레이션(index.js)이 iframe을 리로드할 때
--     그 결과 189건 중 68건이 같은 진단의 복사본이었고(고유 121건), 킬메트릭인 '진단 수'가
--     38% 부풀었다. 한 세션이 같은 진단으로 11행을 만든 경우도 있었다.
--
-- 무엇: 클라가 진단 실행 식별자(fitting.dxRun — diag-loading.js가 진단마다 1회 발급)를
--       run_id로 함께 보내고, 서버는 같은 실행이면 새로 만들지 않고 기존 행을 돌려준다.
--       클라 가드만으로는 부족하다 — 오늘 두 번(demo-session 소비 경로, 하이드레이션
--       자기복제) 모두 클라 조건이 우회된 사례였다. 경계는 DB에 새긴다.
--
-- 키를 (session_id, run_id, category)로 잡은 이유:
--   · run_id 단독 = 시각+난수라 이론상 다른 브라우저와 충돌 가능. session_id를 함께 묶어 격리.
--   · category 포함 = 한 번의 진단 실행이 상의·하의 결과를 각각 남길 수 있다(정상). 이건 중복이 아니다.
-- run_id가 없는 행(구 데이터·미갱신 클라)은 제약 대상이 아니다 — partial unique index.
-- =============================================================================

alter table diagnosis add column if not exists run_id text;

comment on column diagnosis.run_id is
  '진단 실행 식별자(클라 sessionStorage fitting.dxRun). 같은 실행의 재렌더는 새 행을 만들지 않는다.';

-- 부분 유니크: run_id가 있는 행만 (session_id, run_id, category) 유일.
create unique index if not exists diagnosis_run_uniq
  on diagnosis (session_id, run_id, category)
  where run_id is not null;

-- 조회용(서버가 삽입 전/충돌 후 기존 행을 찾는다) — 위 유니크 인덱스가 그대로 쓰인다.

-- =============================================================================
-- 적용 후 확인
--   select count(*) from diagnosis where run_id is not null;   -- 배포 후 새 진단부터 채워짐
--   \d diagnosis                                               -- run_id 컬럼 + diagnosis_run_uniq 확인
--
-- ※ 기존 중복 68건 정리는 이 파일이 아니라 별도 정리 스크립트로(scratchpad/dedupe-diagnosis.sql).
--   순서: 이 마이그레이션 + 코드 배포가 먼저, 그다음 정리. 반대로 하면 그 사이에 또 쌓인다.
-- =============================================================================
