# web — 통합 프로토타입 (서비스 기반)

두 작업물을 하나로 합친 **딥그린 통합 프로토타입**. sohee 디자인을 기반으로, sangmin 엔진·진단 플로우를 이식해 나가는 substrate.
(구 경로 `_통합/app` → Vercel 배포용 ASCII 경로 `web/`로 이동)

## 실행 (로컬)
결과 카드가 `data/bodytypes.json`을 `fetch`하므로 **로컬 서버로 열어야 함**(file:// 직접 열기는 CORS로 데이터 로드 실패).

```bash
cd web
python3 -m http.server 8000
# 브라우저: http://localhost:8000/         (4탭 앱)
#           http://localhost:8000/card.html?type=HRG&g=female  (결과 카드 단독)
```

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
    bodytypes.json      # ★ 8유형 마스터 데이터 단일 출처 (원본: sohee 진단카드_8유형.json)
  js/
    survey.js           # 진단입력 4층 설문 스키마 미러 (category.ts·wearexperience.ts)
    engine-mock.js      # M2 엔진 계약 목업 (diagnose() — Phase D에 실엔진 교체)
```

## 진단 플로우
홈 "내 사이즈 진단 시작하기" → `diag-basic` → `diag-fit` → `diag-loading` → `result`.
진단 UI는 **sangmin 실제 화면(03·04·05)을 딥그린 재스킨**해 이식(로직 보존). 착용경험은 `sessionStorage(fitting.dx)`에 담겨 `result.html`이 `FittingEngine.diagnose()`에 넘김. 결과 카드는 sohee(다크+8유형색 예외), 사이즈표·신뢰도는 엔진 출력.

## 통합 상태
- ✅ **sohee 디자인 기반**: 4탭 셸·결과카드·마이·전문가 화면을 딥그린 토큰으로 재스킨.
- ✅ **8유형 데이터 단일출처**: `data/bodytypes.json` 하나에서 렌더(하드코딩 `T` 객체 제거).
- ✅ **sangmin 이식(⑥)**: 진단 UI = **sangmin 실제 화면(03·04·05) 딥그린 재스킨 이식** + 엔진 계약 목업(M2) + 결과 주입(M4) + 피드백 로깅(M5). 홈→기본정보→착용경험→로딩→결과 엔드투엔드 동작.
  - 참고: `index.html` 안의 구 오버레이 위저드 마크업/JS는 **미사용 잔재(legacy)** — 진단이 별도 화면으로 이동. 정리 대상.
- ⏳ **Phase D(실엔진)**: `engine-mock.js` → sangmin `src/lib/engine` 실연결. `garmentCm` 시드 수집. 하의 `EASE_BANDS` 정식화.
- ⏳ **8유형↔엔진 매핑(Phase C 전)**: 현재 `engine-mock.mapToBodyType()`는 스텁. 엔진 upper×lower → 8유형 `code` 정식 테이블 필요.

## 규칙
- 색·폰트는 `tokens.css` 변수만 참조. 블루는 폐기(→딥그린). 측정 수치는 `.num`(SUIT).
- **결과 카드는 예외**: 다크 배경 + 8유형 포인트색. 딥그린 토큰 적용 안 함.
- 8유형 표현(이름·색·프로필·핏·궁합·실루엣)은 오직 `data/bodytypes.json`에서. 화면 코드에 재기입 금지.

## 관련 문서
- 기획 전체 인덱스: [`../docs/README.md`](../docs/README.md)
- 정보구조·화면·흐름: [`../docs/ia.md`](../docs/ia.md) · 엔진: [`../docs/engine.md`](../docs/engine.md) · 디자인: [`../docs/design.md`](../docs/design.md)
</content>
