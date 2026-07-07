# web — 통합 프로토타입 (서비스 기반)

두 작업물을 하나로 합친 **딥그린 통합 프로토타입**. sohee 디자인을 기반으로, sangmin 엔진·진단 플로우를 이식해 나가는 substrate.
(구 경로 `_통합/app` → Vercel 배포용 ASCII 경로 `web/`로 이동)

## 실행 (로컬)
실행 방법은 **루트 [`../README.md`](../README.md) "로컬에서 앱 실행하기"** 로 통일(크로스플랫폼). 요약:

```bash
npm run serve      # 저장소 루트에서 → http://localhost:8000
# 결과 카드 단독:  http://localhost:8000/card.html?type=HRG&g=female
```
> `data/*.json`을 `fetch`하므로 반드시 로컬 서버로 열 것(file:// 더블클릭은 CORS로 로드 실패).

## 배포 (Vercel)
빌드 없는 정적 사이트. Vercel 프로젝트에서 **Root Directory = `web`**, Framework Preset = **Other**로 설정하면 그대로 서빙된다(빌드 명령·output 불필요).

## 구조
```
web/
  index.html            # 4탭 셸 (홈·쇼퍼찾기·마이) — sohee 핏팅_전체화면 재스킨
  card.html             # 결과 카드 (8유형, 다크+포인트색 예외) — JSON 단일출처 렌더
  tokens.css            # 디자인 토큰 (딥그린) — 셸/카드용
  fitting.css           # sangmin 진단 화면 공용 CSS (원본 그대로)
  diag.css              # fitting.css를 딥그린으로 덮는 재스킨 오버라이드
  diag-basic.html       # 진단 ① 기본정보  (sangmin 03 재스킨)
  diag-fit.html         # 진단 ② 착용경험  (sangmin 04 재스킨 — 카테고리 게이팅·1~3벌·facet·파생)
  diag-loading.html     # 진단 ③ 로딩      (sangmin 05 재스킨)
  result.html           # 진단 ④ 결과      (sohee 카드 iframe + 엔진 recs·신뢰도·피드백)
  data/
    bodytypes.json      # ★ 8유형 마스터 데이터 단일 출처 (표시용)
    body-base-model.json / body-distribution.json / archetypes.json  # 인체 시드(B축, 파생물 — data/ 참조)
    garments.json       # 브랜드 실측 garmentCm(A축, data/brand/build-sizespec.py 산출)
  js/
    body-model.js       # 0벌 체형 추정(사이즈코리아 8차 회귀) — 실계산
    engine.js           # ★ 사이즈 엔진 유일 구현 — 추천·역산·핏지수(규칙①②③). 브라우저·node 공용
    bodytype.js         # 8유형 체형 분류(KS드롭+로우데이터 절단값) — FitBodyType.classify. 스텁 mapToBodyType 대체
    engine-mock.js      # diagnose() 계약 어댑터(카드·신뢰도 조립) — 사이즈 계산은 FitEngine, 8유형은 bodytype에 위임.
                        #   아직 목업: character 서술(LLM 자리)
    index/result/card/diag-*.js  # 각 화면 로직 — HTML에서 분리(디자이너=마크업 / 개발자=이 JS)
```
> 화면 로직은 인라인 `<script>`가 아니라 `js/<화면>.js`로 분리돼 있습니다(역할 분담·충돌 최소화 — [`../docs/협업가이드.md`](../docs/협업가이드.md)). HTML은 `<script src="js/<화면>.js">`로 로드.
> 엔진 규칙 명세·구현 관계는 [`../docs/6_사이즈엔진.md`](../docs/6_사이즈엔진.md), 회귀 테스트는 `../engine/test.js`(`npm test`).

## 진단 플로우
홈 "내 사이즈 진단 시작하기" → `diag-basic` → `diag-fit` → `diag-loading` → `result`.
진단 UI는 **sangmin 실제 화면(03·04·05)을 딥그린 재스킨**해 이식(로직 보존). 착용경험은 `sessionStorage(fitting.dx)`에 담겨 `result.html`이 `FittingEngine.diagnose()`에 넘김. 결과 카드는 sohee(다크+8유형색 예외), 사이즈표·신뢰도는 엔진 출력.

## 통합 상태
- ✅ **sohee 디자인 기반**: 4탭 셸·결과카드·마이·전문가 화면을 딥그린 토큰으로 재스킨.
- ✅ **8유형 데이터 단일출처**: `data/bodytypes.json` 하나에서 렌더(하드코딩 `T` 객체 제거).
- ✅ **진단 UI 이식**: 진단 화면(기본정보·착용경험·로딩) 딥그린 재스킨 + 결과 주입 + 피드백 로깅. 홈→기본정보→착용경험→로딩→결과 엔드투엔드 동작.
  - 참고: `index.html` 안의 구 오버레이 위저드 마크업/JS는 **미사용 잔재(legacy)** — 진단이 별도 화면으로 이동. 정리 대상.
- ✅ **실엔진 연결**: 추천·역산·핏지수는 `engine.js`, **8유형 판정은 `bodytype.js`**(KS드롭+로우데이터)가 실계산. 남은 목업은 `engine-mock.js`의 character 서술뿐.
- ⏳ **남은 작업**: `garmentCm` 시드 확장 · 하의 `EASE_BANDS`·하체 역산 정식화 · character 서술(LLM) · 분류기 절단값 실피드백 튜닝.

## 규칙
- 색·폰트는 `tokens.css` 변수만 참조. 블루는 폐기(→딥그린). 측정 수치는 `.num`(SUIT).
- **결과 카드는 예외**: 다크 배경 + 8유형 포인트색. 딥그린 토큰 적용 안 함.
- 8유형 표현(이름·색·프로필·핏·궁합·실루엣)은 오직 `data/bodytypes.json`에서. 화면 코드에 재기입 금지.

## 관련 문서
- 기획 전체 인덱스: [`../docs/README.md`](../docs/README.md)
- 정보구조: [`../docs/2_정보구조.md`](../docs/2_정보구조.md) · 흐름: [`../docs/3_사용자플로우.md`](../docs/3_사용자플로우.md) · 화면: [`../docs/4_화면정의.md`](../docs/4_화면정의.md) · 엔진: [`../docs/6_사이즈엔진.md`](../docs/6_사이즈엔진.md) · 디자인: [`../docs/8_디자인가이드.md`](../docs/8_디자인가이드.md)
- 데이터 파이프라인: [`../data/README.md`](../data/README.md)
</content>
