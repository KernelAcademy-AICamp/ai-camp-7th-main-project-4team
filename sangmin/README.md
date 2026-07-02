# 핏팅(Fitting)

평소 입던 옷의 착용 경험을 기준으로 **브랜드를 가로질러 내 사이즈를 번역**해주는 AI 진단 서비스.

> 이 서비스의 가치는 **사이즈 번역 정확도 하나**에 걸려 있다. 화려한 UI보다 번역 정확도와 검증 루프를 항상 우선한다.

## 현재 단계

**Phase 0 — 엔진 타당성.** 데이터 → 엔진 → UI 순서. 아직 Next.js 앱은 없다.

## 저장소 구조

```
data/                엔진의 두 데이터 축
  brand/             A축: 브랜드 실측 시드 (brands·fitlines·rankings·anchor) — 커밋
  body/              B축: 인체(사이즈코리아)
    raw/*.xlsx         원본 소스(대용량) — 로컬 보관, gitignore
    clean/*.csv        raw → CSV 정규화 (재분석용) — 커밋
    derived/*.json     엔진 소비용 파생(회귀계수·분포·아키타입) — 커밋
src/lib/
  schema/            데이터 모델·타입 (category·sizespec …)
  engine/rules/      규칙 기반 변환·여유·주관 매핑
docs/                기획 문서 (인덱스는 CLAUDE.md)
  prototype/         클릭형 MVP 프로토타입 (HTML)
  engine/            판단 로직 스펙
  archive/           대체된 초기 탐색용 HTML 목업
```

## 시작

작업 맥락·규칙은 [CLAUDE.md](CLAUDE.md), 문서 인덱스도 그 안에 있다.

```
npm install
npm run check   # 타입체크
npm run demo    # 엔진 규칙 왕복 데모
```
