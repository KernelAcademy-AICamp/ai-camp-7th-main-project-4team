# docs — 기획 문서 지도

> 어디부터 읽어야 할지 헷갈릴 때 여기부터. 각 문서가 **하나의 질문**에 답한다.

## 읽는 순서

| # | 문서 | 답하는 질문 | 한 줄 |
|---|------|------------|-------|
| 1 | [product.md](product.md) | **왜 만드나** | 문제·페르소나·MVP·킬 메트릭(≥65%). 발표 서사(As-is/To-be) 포함 |
| 2 | [build.md](build.md) | **무엇부터·어떻게 만드나** | 의존성 원칙 + Phase 0~3 + 데이터 수집·정규화 파이프라인. 구현 맥락 |
| 3 | [screens.md](screens.md) | **무슨 화면이 있고 어디로 흐르나** | IA 트리·화면 리스트(★/○) + 사용자 흐름(전환·분기·state) |
| 4 | [engine/](engine/) | **어떻게 판단하나** | 진단 입력·역산·추천의 판단 로직 (아래 3종) |

### engine/ — 엔진 스펙 (판단 로직)

| 문서 | 답하는 질문 |
|------|------------|
| [engine/diagnosis-questions.md](engine/diagnosis-questions.md) | **뭘 물어야 하나** — 착용경험 진단 입력 스펙(카테고리·앵커·위→아래 질문) |
| [engine/hidden-fit-dimensions.md](engine/hidden-fit-dimensions.md) | **뭘 역산/경고해야 하나** — 맞춤×기성복 측정 차이 = 숨은 치수 레지스트리 |
| [engine/reverse-inference.md](engine/reverse-inference.md) | **어떻게 판단하나** — 신호→역산→추천→경고 규칙 + 체형진단 카드 스키마 |

## 기타

- [fitting-ia.xlsx](fitting-ia.xlsx) — IA 원본 스프레드시트(screens.md의 소스).
- [prototype/](prototype/) — 클릭형 MVP 프로토타입(HTML). 진입점 `index.html`.
- [archive/](archive/) — 대체된 초기 탐색용 HTML 목업.
- `핏팅 IR 덱.pdf` — IR 발표 자료(로컬 보관, gitignore).

## 통합 이력

기존 9개 문서가 주제별로 겹쳐 있어 5개로 병합(2026-07). 매핑:
- `fitting-1pager-prd` + `fitting-deck-content` → **product.md**
- `fitting-build-plan` + `claude-code-kickoff` → **build.md**
- `fitting-ia` + `fitting-user-flow` → **screens.md**
- `diagnosis-questions` · `hidden-fit-dimensions` → **engine/** 로 이동(reverse-inference와 합류)
