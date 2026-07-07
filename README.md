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

## 문서 · 협업

- 기획·설계 전체 인덱스: [`docs/README.md`](docs/README.md)
- 협업 규칙(3인 분담·파일 소유·브랜치/PR): [`docs/협업가이드.md`](docs/협업가이드.md)
- 다음 개발 계획: [`docs/마일스톤1-측정가능MVP.md`](docs/마일스톤1-측정가능MVP.md)
