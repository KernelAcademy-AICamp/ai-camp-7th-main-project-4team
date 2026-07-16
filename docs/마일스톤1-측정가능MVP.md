# 마일스톤 1 — 측정 가능한 MVP (Next.js + Supabase)

> **목표 한 줄:** 실사용자에게서 **킬 메트릭(사이즈 정확도 ≥65%)이 실제로 측정되게** 만든다. 나머지는 전부 뒤로 미룬다.
> 배경·판정은 [의사결정기록.md](의사결정기록.md) D-13, 제품 기준은 [1_제품정의.md](1_제품정의.md) §9. 이 문서는 그걸 만드는 실행 계획이다.

## 0. In / Out (규율)

**In** — 진단 → **서버 엔진** → 결과 → **피드백 DB 저장** → **킬 메트릭 집계**. 이게 전부.
**Out** — 로그인/계정 · 전문가 매칭 · 결제 · SEO 페이지 · 8유형 LLM 서술 · 파생 카테고리. *하나라도 끌려오면 측정이 늦어진다.*

> **진행 현황(2026-07 갱신 · D-15/D-16 상회):** 측정 경로 실배선 완료 — 아래는 **구현 방식이 문서 초안과 달라진 부분**.
> - **구현 방식 = D-15 어댑터 스왑**: Next.js 이식이 아니라 **`web/` 단일 소스 + 데이터 어댑터(`FITTING_MODE`)** → `gen-app`이 `app/`(FITTING_MODE api·목업/pro 미배포·garments 서버전용) 생성. `web/js/data.js`가 seam.
> - **측정 2축**: ① 진단 정확도(킬메트릭·`feedback`) ② **매칭 수요**(`lead` 웨이트리스트 이메일·페이크도어). 진단→수요 전환은 `session_id` 조인.
> - **DB 테이블**: `diagnosis` · `feedback` · **`lead`**(db/02) · **`garment`/`garment_meta`**(db/03·실측표=진단 런타임 소스, rev 캐시) · **`brand`**(db/04·노출순서). RLS admin, 서버는 service_role.
> - **서버 엔진**: `/api/diagnose`가 `garment` 테이블로 역산+추천 계산(garments.json 클라 미노출=해자). 브랜드 노출순서 반영.
> - **어드민 UI = In(수정)**: MVP 4메뉴 실배선 — 사이즈·데이터(garment CRUD)·진단·정확도(+추세)·전문가 수요·엔진 강화. Google OAuth 로그인. v2 섹션은 숨김·미배포. → 문서 초안의 "어드민 UI = Out"은 **철회**.

## 1. 스택 (확정 · 운영비 $0)

| 층 | 선택 | 비용 |
|---|---|---|
| 앱·API·호스팅 | **Next.js(App Router) + TypeScript** on **Vercel Hobby** | $0 · 비상업(수업) OK |
| DB | **Supabase Free** (Postgres 500MB) | $0 · 카드 불필요 |
| CI | **GitHub Actions**(공개 레포) | $0 |
| 엔진 | **engine.js → TS 포팅, API에서 실행**(클라이언트 노출 X) | — |

> Supabase Free는 1주 미사용 시 일시정지 → 대시보드 클릭으로 복구. 팀장이 **SQL 편집기·테이블 뷰어로 킬 메트릭을 직접** 소유.

## 2. 아키텍처

```
[진단 UI] --POST /api/diagnose--> [서버 엔진(TS)] --insert--> diagnosis
                                       └--> {diagnosisId, card, recs, tier} 반환
[결과 화면] "맞았나?" --POST /api/feedback--> feedback
[팀장] Supabase SQL: SELECT * FROM kill_metric  → 정확도 %
```
전환의 핵심: 지금 `web/js/result.js`의 `localStorage` 피드백 → **`POST /api/feedback`**. 이 한 지점이 "측정 불가 → 가능"의 경계.

## 3. Supabase 스키마 (SQL 편집기에 그대로 실행)

```sql
create extension if not exists "pgcrypto";

create table diagnosis (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  session_id     text not null,                 -- 익명 세션(쿠키 uuid) · 로그인 없음
  category       text not null default 'TOP',
  input          jsonb not null,                -- {basic, prefs, experiences}
  result         jsonb not null,                -- {card, recs, confidenceTier}
  engine_version text not null
);

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

-- 킬 메트릭: aware_brand 검증 중 '맞음' 비율
create view kill_metric as
select count(*) as n,
       count(*) filter (where verdict='맞음') as agree,
       round(100.0*count(*) filter (where verdict='맞음')/nullif(count(*),0),1) as accuracy_pct
from feedback where aware_brand;
```

**보안(RLS)**: 두 테이블에 RLS **켜고 anon 정책은 만들지 않는다.** 모든 읽기/쓰기는 서버 라우트가 `service_role` 키로만 수행(키는 서버 전용, 절대 클라이언트 노출·커밋 금지). → 브라우저에서 DB 직접 접근 불가 = 민감정보 안전.

## 4. API 계약

```
POST /api/diagnose
  body: { sessionId, basic, prefs, experiences }
  →     { diagnosisId, card, recs, confidenceTier }     // 서버 엔진 실행 + diagnosis insert

POST /api/feedback
  body: { diagnosisId, verdict, actualSize?, otherBrandIntent?,
          awareBrand, engineImproveConsent, ageAttested }
  →     { ok: true }                                     // feedback insert
```
화면은 이 계약만 안다(엔진 내부 미노출). 계약 모양은 [6_사이즈엔진.md](6_사이즈엔진.md) §5의 `diagnose()`와 일치시킨다.

## 5. 레포 마이그레이션 전략 (dual-source 재발 방지)

| 현재 | → 이관 후 | 주의 |
|---|---|---|
| `web/js/engine.js`(정본) | `engine/`의 **TS 모듈이 정본**, API가 import | JS는 더 이상 손수 유지 X — TS 단일 정본. 골든테스트도 TS로 이관 |
| `web/js/body-model.js` | TS 모듈 | 〃 |
| `web/js/engine-mock.js` | `/api/diagnose` 안의 서버 스텁(서술·8유형 매핑) | 실LLM 전까지 스텁 유지 |
| `web/*.html` + `web/js/<화면>.js` | `app/`의 Next 페이지/컴포넌트 | 디자이너가 이식, `tokens.css`는 전역 스타일로 |
| `web/data/*.json` | 서버에서 import(초기) → 이후 DB | garments·body 시드는 당분간 JSON import |

> 원칙: 엔진을 **TS 하나로** 올리고 web/js/engine.js는 은퇴시킨다(둘 다 유지 금지 — [의사결정기록.md](의사결정기록.md) D-11의 연장).

## 6. 단계 · 분담 · 완료기준

| 단계 | 내용 | 주 담당 | 완료기준(DoD) |
|---|---|---|---|
| **A 스캐폴드** | create-next-app(TS) · Vercel 연결 · Supabase 프로젝트+스키마 | 개발자 + 팀장 | 빈 앱 배포됨 · DB 연결됨 |
| **B 엔진 졸업** | engine·body-model → TS 정본, 골든테스트 TS 이관, CI 연결 | 개발자 | `npm test` CI 그린 · dual-source 없음 |
| **C 측정 경로 ★** | `/api/feedback` + 결과화면 피드백 POST → DB | 개발자 + 팀장(쿼리) | 피드백이 DB에 쌓임 · `kill_metric`이 % 반환 |
| **D 서버 엔진** | `/api/diagnose` 서버 실행 · 결과화면 연결 | 개발자 | 엔진이 클라이언트 번들에 없음 |
| **E UI 이식** | 진단·결과 화면 Next 컴포넌트화 | 디자이너 | 전체 플로우가 Next 앱에서 동작 |

**임계 경로**: A→B→**C**면 킬 메트릭 측정 시작. D·E는 슬라이스 완성.

## 7. 셋업 런북 (계정 필요 — 팀이 하는 부분)

1. **팀장**: Supabase 무료 프로젝트 생성 → §3 SQL 실행 → `SUPABASE_URL`·`SUPABASE_SERVICE_ROLE_KEY` 확보.
2. **개발자**: `npx create-next-app@latest`(TS) → Vercel에 레포 연결 → 환경변수 등록:
   ```
   SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...   # 서버 전용 · .env.local(gitignore) · Vercel/GH secret
   ```
3. **CI**: `.github/workflows/test.yml` — push마다 `npm test`(공개 레포 무료).

## 8. 완료 기준 (마일스톤 전체)
- 실사용자가 진단→피드백 제출 → **DB에 행이 쌓인다.**
- **`SELECT * FROM kill_metric` 하나로 현재 정확도 %** 를 본다.
- 엔진이 **서버에서** 돈다(노출 X), 골든테스트 CI 그린.
- Vercel 배포 + Supabase 연결, 운영비 $0.
