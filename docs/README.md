# 핏팅(Fitting) — 기획 문서

두 사람(sohee·sangmin)의 작업 + 통합 과정을 **주제별 단일 정본**으로 모았다. 프로토타입 코드는 [`../web/`](../web/), 옛 목업/기여 원본은 `sohee/`·`sangmin/`에 아카이브로 남아 있다.

라이브 프로토타입: **https://fitting-kr.vercel.app**

---

## 한눈에 (정본)

| 영역 | 정본 문서 | 무엇 |
|---|---|---|
| **제품/PRD** | [`product.md`](product.md) | 문제·페르소나·MVP·킬 메트릭(≥65%)·발표 서사 |
| **IA·화면** | [`ia/03_IA구조.md`](ia/03_IA구조.md) | 4탭 IA 골격(정본) |
| | [`ia/screens.md`](ia/screens.md) | 진단 화면·흐름·state 상세(엔진 정합) |
| | [`ia/04_IA_쇼퍼찾기.md`](ia/04_IA_쇼퍼찾기.md) | 전문가 매칭 도메인 |
| **엔진** | [`engine/reverse-inference.md`](engine/reverse-inference.md) | 역산·추천·경고 규칙 + 체형카드 스키마 |
| | [`engine/diagnosis-questions.md`](engine/diagnosis-questions.md) | 착용경험 입력 스펙(카테고리·부위) |
| | [`engine/hidden-fit-dimensions.md`](engine/hidden-fit-dimensions.md) | 숨은 치수 레지스트리(A축 검열추정) |
| | [`engine/build.md`](engine/build.md) | 데이터→엔진→UI 빌드 플랜(Phase 0~3) |
| **디자인** | [`design/디자인언어.md`](design/디자인언어.md) + [`design/tokens.css`](design/tokens.css) | 딥그린 디자인 언어·토큰(정본) |
| | [`design/디자인가이드.html`](design/디자인가이드.html) · [`design/UX라이팅가이드.html`](design/UX라이팅가이드.html) | 원본 소스(딥그린·보이스) |
| **통합** | [`통합/통합-설계정리.md`](통합/통합-설계정리.md) | 통합 방향·화면매핑·겹침해소 마스터 |
| | [`통합/서비스구조-뼈대.md`](통합/서비스구조-뼈대.md) | PRD/IA 대조 → 확정 4탭 구조·결정 로그 |
| | [`통합/구조화-sohee.md`](통합/구조화-sohee.md) · [`통합/모듈화-sangmin.md`](통합/모듈화-sangmin.md) | sohee 컴포넌트 구조화 / sangmin 엔진 모듈화 |

## 폴더
```
docs/
  product.md          # PRD 정본
  ia/                 # IA·화면 (03 정본골격·screens 진단스펙·04 전문가 + IA 표/시각화)
  engine/             # 엔진 스펙(역산·질문·숨은치수·빌드) + 진단카드 로직설계(탐색기록)
  design/             # 디자인 언어·토큰(정본) + 원본 가이드(html)
  통합/               # 통합 합성 문서 (설계정리·뼈대·구조화·모듈화)
  ir/                 # IR 덱(로컬 보관, git 제외)
  archive/            # 구버전 — 핏메이트 PRD(00~02)·구 스타일가이드(블루) 등 참고 보존
```

## 핵심 맥락(요약)
- **피벗**: 핏메이트(쇼퍼 매칭 중심, `archive/00~02`) → **핏팅(브랜드 교차 사이즈 번역 중심)**. 정본 PRD는 `product.md`.
- **분담**: sohee = 디자인·결과카드·마이·전문가 / sangmin = 엔진·나머지 진단 플로우.
- **엔진 원칙**: 사이즈 계산=규칙 기반, 서술만 LLM. 진단은 카테고리 단위(기반=상의+하의). 킬 메트릭 = "내 사이즈와 맞다" ≥65%.
- **디자인**: 오프화이트 + 딥그린 1포인트 + 잉크블랙. 결과카드만 다크+8유형색(예외).
- 현재 앱(`web/`)의 엔진은 **목업**(`web/js/engine-mock.js`) — 실엔진 연결은 후속(Phase D).
</content>
