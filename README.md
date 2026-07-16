[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/ERWdZ46N)

# FITTING

AI Camp 7기 메인 프로젝트 - 4팀

**안 입어본 브랜드에서도 "내 사이즈"를, 평소 잘 맞는 옷의 착용 경험을 기준으로 번역해 주는 AI 사이즈 진단 서비스.**
자세한 기획·설계는 👉 [`docs/README.md`](docs/README.md) · 라이브 프로토타입: https://fitting-kr.vercel.app

---

## 빠른 시작

**필요한 것**: [Node.js](https://nodejs.org) (버전은 `.nvmrc`에 고정 — nvm 쓰면 `nvm use`).

```bash
git clone https://github.com/KernelAcademy-AICamp/ai-camp-7th-main-project-4team.git
cd ai-camp-7th-main-project-4team
npm run serve      # 로컬 서버 → http://localhost:8000 접속 (실행만 하면 설치 불필요)
npm test           # 엔진 골든 테스트(36건)
```

**기여할 때(개발 환경 통일)**: `npm install` 한 번 → 포매터(Prettier) 준비됨.
- 에디터 설정은 `.editorconfig`, 줄바꿈은 `.gitattributes`(LF)로 3인 PC 자동 통일.
- **VS Code**: 저장소 열면 권장 확장(Prettier·EditorConfig·Live Server) 안내가 뜸 → 설치하면 **저장 시 자동 포맷**.
- 수동 포맷: `npm run format` (검사만: `npm run format:check`).

## 로컬에서 앱 실행하기

정적 사이트라 **빌드 없이** 로컬 서버만 띄우면 됩니다. 셋 중 편한 방법:

| 방법 | 명령 | 비고 |
|---|---|---|
| **npm (권장)** | `npm run serve` | Node만 있으면 **어떤 OS든 동일**. → http://localhost:8000 |
| **VS Code** | Live Server 확장 설치 → `web/index.html` 우클릭 → *Open with Live Server* | CLI 없이 클릭만 |
| **Python** | `cd web` 후 · mac/Linux: `python3 -m http.server 8000` · Windows: `python -m http.server 8000` | Node 없을 때 |

> **왜 서버가 필요한가?** 결과 화면이 `data/*.json`을 `fetch`하는데, HTML을 **더블클릭(`file://`)** 으로 열면 브라우저 보안정책(CORS)이 그 로드를 막아 화면이 깨집니다. 반드시 `http://localhost`로 띄우세요.
> **포트 8000이 이미 쓰이면**: mac/Linux `PORT=3000 npm run serve`, 또는 `scripts/serve.js`의 기본 포트를 바꾸세요.

## 🎛️ 화면 현황

> 아래 표는 **자동 생성**입니다 — 화면 추가/수정 시 `docs/화면-현황.source.json` 상태 갱신 후 `npm run screens`로 재생성(사실 층은 코드+git에서 자동).

<!-- SCREENS:START -->
<!-- 자동 생성 — 손대지 마세요. `npm run screens`로 갱신됩니다. -->
**화면 30개** · 🟡구현 8 · ⚪보류 8 · 🟠시안 1 · 🟢실연결 11 · 🟢완료 2 · ⚑ 이슈 2개 · 전체·비고·이동그래프 → [docs/화면-현황.md](docs/화면-현황.md)

| 화면 | 상태 | JS | 최근 변경 | 이슈 |
|---|---|---|---|---|
| 오류·빈 상태(G.7) | 🟡구현 | — | `d021b74` trubard·2026-07-14 | — |
| 데모 초기화 — 비배포 | 🟡구현 | — | `5e0a399` Sohee lee·2026-07-14 | — |
| 서비스 소개·작동원리 | 🟡구현 | — | `d021b74` trubard·2026-07-14 | — |
| 관리자 · B2B API(3.D) — v3 | ⚪보류 | ✅ | `8bccffa` trubard·2026-07-16 | — |
| 관리자 · 브랜드 관리·노출순서(3.A.1) | 🟢실연결 | ✅ | `8bccffa` trubard·2026-07-16 | — |
| 관리자 · 사업현황(3.C.1) — v2 | ⚪보류 | ✅ | `8bccffa` trubard·2026-07-16 | — |
| 관리자 · 이미지 붙여넣기 수집(3.A.1) | 🟡구현 | ✅ | `8bccffa` trubard·2026-07-16 | — |
| 관리자 · 진단 응답·정확도(3.C.2) | 🟢실연결 | ✅ | `8bccffa` trubard·2026-07-16 | — |
| 관리자 · 엔진 시뮬레이터·튜닝(3.A.3) | 🟢실연결 | ✅ | `8bccffa` trubard·2026-07-16 | — |
| 관리자 · 브랜드·제품 실측표 CRUD(3.A.1) | 🟢실연결 | ✅ | `8bccffa` trubard·2026-07-16 | — |
| 관리자 · 엔진 강화(3.C.4) | 🟢실연결 | ✅ | — | 🕳️고아(들어오는 링크 없음) |
| 관리자 · 전문가 수요(3.C.3) | 🟢실연결 | ✅ | — | 🕳️고아(들어오는 링크 없음) |
| 관리자 로그인(구글 OAuth) | 🟢실연결 | ✅ | `8bccffa` trubard·2026-07-16 | — |
| 관리자 · 회원·거래(3.B) — v2 | ⚪보류 | ✅ | `8bccffa` trubard·2026-07-16 | — |
| 관리자 · 내부운영(3.E) — v2 | ⚪보류 | ✅ | `8bccffa` trubard·2026-07-16 | — |
| 관리자 · 사이즈/데이터(3.A) | 🟢실연결 | ✅ | `8bccffa` trubard·2026-07-16 | — |
| 체형별 스타일 가이드(4.3) | 🟡구현 | — | `d021b74` trubard·2026-07-14 | — |
| 결과 공유 카드 | 🟠시안 | ✅ | `4f23cb5` geonhyoung·2026-07-14 | — |
| 기본 정보 입력 | 🟡구현 | ✅ | `3ba6870` geonhyoung·2026-07-15 | — |
| 착용경험 보정 입력 | 🟢실연결 | ✅ | `8bccffa` trubard·2026-07-16 | — |
| 진단 로딩 | 🟡구현 | ✅ | `3ba6870` geonhyoung·2026-07-15 | — |
| 자주 묻는 질문·도움말(G.2) | 🟡구현 | — | `d021b74` trubard·2026-07-14 | — |
| 홈·허브(탭 홈/쇼퍼찾기/마이) | 🟢실연결 | ✅ | `8bccffa` trubard·2026-07-16 | — |
| 개인정보 처리방침 | 🟢완료 | — | `d021b74` trubard·2026-07-14 | — |
| 스타일리스트 로그인 — 비배포 | ⚪보류 | ✅ | `d021b74` trubard·2026-07-14 | — |
| 견적 요청·상세 — 비배포 | ⚪보류 | ✅ | `8bccffa` trubard·2026-07-16 | — |
| 쇼퍼 가입 — 비배포 | ⚪보류 | ✅ | `d021b74` trubard·2026-07-14 | — |
| 쇼퍼 지원(공급자) 포털 — 페이크도어(비배포) | ⚪보류 | ✅ | `8e0b686` Sohee lee·2026-07-15 | — |
| 진단 결과 | 🟢실연결 | ✅ | `8bccffa` trubard·2026-07-16 | — |
| 이용약관 | 🟢완료 | — | `d021b74` trubard·2026-07-14 | — |
<!-- SCREENS:END -->

## 문서 · 협업

- 기획·설계 전체 인덱스: [`docs/README.md`](docs/README.md)
- 협업 규칙(3인 분담·파일 소유·브랜치/PR): [`docs/협업가이드.md`](docs/협업가이드.md)
- 다음 개발 계획: [`docs/마일스톤1-측정가능MVP.md`](docs/마일스톤1-측정가능MVP.md)
