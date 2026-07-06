# engine — 사이즈 엔진 (정본 위치 안내)

이 폴더는 **엔진의 실행 코드를 담지 않습니다.** 사이즈 엔진의 유일 구현은
[`../web/js/engine.js`](../web/js/engine.js) 한 곳이며, 브라우저(`<script>`)와
node(`require()`) 양쪽에서 같은 파일이 돕니다. 규칙을 고칠 땐 그 파일만 고칩니다.

## 세 층의 역할

| 무엇 | 어디 | 성격 |
|---|---|---|
| **규칙 명세(정본)** | [`docs/3_사이즈엔진.md`](../docs/3_사이즈엔진.md) | 밴드 값·변환/여유/역산 규칙의 원본 서술 |
| **규칙 구현(유일)** | [`../web/js/engine.js`](../web/js/engine.js) | convert①·ease②·subjective③ + recommend·scoreFit·역산 |
| **회귀 안전망** | [`test.js`](test.js) | 명세와 어긋나면 실패 (`npm test`, 무의존성) |
| **데이터 계약(형)** | [`schema/`](schema) | TypeScript 타입 참조용 — **빌드/실행하지 않음** |

> 과거 `engine/rules/*.ts`는 engine.js와 **중복된 두 번째 구현**이라 드리프트의 원천이었고
> (커밋 470d72f에서 수동 정렬), 제거했습니다. 규칙은 이제 engine.js 한 곳에서만 삽니다.

## 실행

```bash
npm test            # 골든 테스트 (node engine/test.js) — 설치 불필요
node engine/test.js # 위와 동일
```

`test.js`는 가슴 `2/8/16`·어깨 `0/1.5/4`·배 `0/8/18` 밴드를 **동작으로 잠가**,
누군가 값을 건드리면 CI가 잡습니다.

## schema/ 는 왜 남겼나

`schema/*.ts`는 실행 규칙의 복제가 아니라 **데이터 모양(Brand·SizeSpec·WearExperience·
Category…)의 타입 계약**입니다. 지금은 컴파일하지 않고 문서형 참조로만 둡니다.
엔진 규칙이 충분히 커져 타입 안전성이 실이익이 될 때(예: A축 검열추정·하의 밴드 정식화),
engine.js를 TS로 옮기고 `tsc`로 `engine.js`를 산출하는 방식으로 졸업합니다 — 그전엔 빌드 없음.

## 다음

1. `garmentCm` 시드 확장(브랜드·핏라인·사이즈별 A축 실측).
2. 하의 `EASE_BANDS` 정식화 — 현재 상의만 활성(docs/3 §, 가설값은 하의도 명세돼 있음).
3. FeedbackLog 연결 후 밴드 가설값을 킬 메트릭으로 보정.
