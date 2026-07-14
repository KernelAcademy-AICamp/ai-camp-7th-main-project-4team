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
**화면 26개** · 🟡구현 17 · 🟠시안 5 · 🟢실연결 2 · 🟢완료 2 · ⚑ 이슈 0개 · 전체·비고·이동그래프 → [docs/화면-현황.md](docs/화면-현황.md)

| 화면 | 상태 | JS | 최근 변경 | 이슈 |
|---|---|---|---|---|
| 오류·빈 상태(G.7) | 🟡구현 | — | `f3331fa` trubard·2026-07-14 | — |
| 데모 초기화 | 🟡구현 | — | `2a3141c` trubard·2026-07-13 | — |
| 서비스 소개·작동원리 | 🟡구현 | — | `2a3141c` trubard·2026-07-13 | — |
| 관리자 · B2B API(3.D) | 🟠시안 | ✅ | `0107b9d` trubard·2026-07-13 | — |
| 관리자 · 브랜드 관리(3.A.1) | 🟡구현 | ✅ | `0107b9d` trubard·2026-07-13 | — |
| 관리자 · 사업현황(3.C) | 🟡구현 | ✅ | `0107b9d` trubard·2026-07-13 | — |
| 관리자 · 이미지 붙여넣기 수집(3.A.1) | 🟡구현 | ✅ | `0107b9d` trubard·2026-07-13 | — |
| 관리자 · 진단 응답·정확도(3.C.2) | 🟠시안 | ✅ | `0107b9d` trubard·2026-07-13 | — |
| 관리자 · 엔진 시뮬레이터·튜닝(3.A.3) | 🟡구현 | ✅ | `f3331fa` trubard·2026-07-14 | — |
| 관리자 · 브랜드·제품 실측표(3.A.1) | 🟡구현 | ✅ | `0107b9d` trubard·2026-07-13 | — |
| 관리자 로그인(구글+이메일2FA) | 🟠시안 | ✅ | `0107b9d` trubard·2026-07-13 | — |
| 관리자 · 회원·거래(3.B) | 🟡구현 | ✅ | `0107b9d` trubard·2026-07-13 | — |
| 관리자 · 내부운영(3.E) | 🟠시안 | ✅ | `0107b9d` trubard·2026-07-13 | — |
| 관리자 · 사이즈/데이터(3.A) | 🟡구현 | ✅ | `0107b9d` trubard·2026-07-13 | — |
| 결과 공유 카드 | 🟠시안 | ✅ | `fffc58c` Sohee lee·2026-07-13 | — |
| 기본 정보 입력 | 🟡구현 | ✅ | `bf6cd1f` Sohee lee·2026-07-13 | — |
| 착용경험 보정 입력 | 🟢실연결 | ✅ | `fffc58c` Sohee lee·2026-07-13 | — |
| 진단 로딩 | 🟡구현 | ✅ | `fffc58c` Sohee lee·2026-07-13 | — |
| 자주 묻는 질문·도움말(G.2) | 🟡구현 | — | `f3331fa` trubard·2026-07-14 | — |
| 홈·허브(탭 홈/쇼퍼찾기/마이) | 🟡구현 | ✅ | `3429385` trubard·2026-07-14 | — |
| 개인정보 처리방침 | 🟢완료 | — | `2a3141c` trubard·2026-07-13 | — |
| 견적 요청 | 🟡구현 | ✅ | `3429385` trubard·2026-07-14 | — |
| 쇼퍼 가입 | 🟡구현 | ✅ | `d859d1e` geonhyoung·2026-07-13 | — |
| 쇼퍼 지원(공급자) 포털 | 🟡구현 | ✅ | `3429385` trubard·2026-07-14 | — |
| 진단 결과 | 🟢실연결 | ✅ | `f3331fa` trubard·2026-07-14 | — |
| 이용약관 | 🟢완료 | — | `2a3141c` trubard·2026-07-13 | — |
<!-- SCREENS:END -->

## 문서 · 협업

- 기획·설계 전체 인덱스: [`docs/README.md`](docs/README.md)
- 협업 규칙(3인 분담·파일 소유·브랜치/PR): [`docs/협업가이드.md`](docs/협업가이드.md)
- 다음 개발 계획: [`docs/마일스톤1-측정가능MVP.md`](docs/마일스톤1-측정가능MVP.md)
