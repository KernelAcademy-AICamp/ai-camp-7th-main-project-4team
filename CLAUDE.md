# CLAUDE.md — 핏팅(Fitting) 팀 작업 지침

> 팀원 전원이 **Claude Code**로 개발합니다. 이 파일은 모든 세션에서 자동으로 읽히는 **공통 규칙**이에요. 상세 협업 규칙은 [docs/협업가이드.md](docs/협업가이드.md).

## 브랜치 · 커밋 · PR 워크플로 (중요)

**역할별 개인 브랜치 하나를 계속 재사용합니다. 작업마다 새 브랜치를 파지 않습니다.**

| 역할 | 개인 브랜치 |
|---|---|
| 개발자 | `dev-working` |
| 디자이너 | `design-working` |
| 팀장 | `data-working` |

1. **새 브랜치를 임의로 만들지 않는다.** 자기 역할의 `-working` 브랜치에서 이어 작업하고, 내용은 **커밋 메시지로 구분**한다. (초기 단계라 기능마다 브랜치·PR을 남발하지 않음)
2. **push·PR을 자동으로 하지 않는다.** 커밋까지 한 뒤 멈추고, **올릴지(push/PR)는 사용자에게 물어본 뒤** 진행한다.
3. **PR은 필요할 때만** — main 통합이 필요하거나 리뷰가 필요한 큰/위험한 변경일 때. 물어보고 결정한다.
4. **머지 후 재동기화** — PR이 main에 머지되면 개인 브랜치를 최신 main에 맞춘 뒤 **같은 브랜치로 다음 작업을 이어간다**:
   - squash 머지 → `git fetch origin && git reset --hard origin/main && git push --force-with-lease` (※ 머지 완료·미푸시 작업 없음 확인 후)
   - merge/rebase 머지 → `git fetch origin && git merge origin/main`
5. **`main` 직접 커밋 금지** — 통합은 PR로.

## 소유 경로 (충돌 최소화 — "한 파일 = 한 역할")

상세·경계(계약)는 [docs/협업가이드.md](docs/협업가이드.md) §1~3.

| 역할 | 소유 경로 |
|---|---|
| 팀장 | `data/**` · 생성물 JSON(`web/data/{garments,body-*,archetypes,size-catalog}.json`) |
| 디자이너 | `web/*.html`(마크업) · `web/css/**`(`tokens.css` 포함) · `web/data/bodytypes.json` |
| 개발자 | `engine/**` · `web/js/**` · `api/**` · `db/**` · `scripts/**` |
| 공동 | `docs/**` |

> `web/data/size-catalog.json`은 `garments.json`에서 파생된 cm-free 생성물(`scripts/gen-catalog.js`) — 손수정 금지, 소스는 팀장 `garments`. `app/`은 배포 빌드 생성물(gitignore, `scripts/gen-app.js`) — 소유 없음.

- 남의 소유 경로를 바꿔야 하면 그 소유자에게 알리고 PR 리뷰어로 넣는다.
- 색·폰트·간격은 `web/css/tokens.css` 변수만 참조(하드코딩 금지). DOM `id`/`class`는 디자이너가 정의, JS가 참조 — 바꾸면 서로 알림.

## 개발 환경

- **Node 버전 정본은 [.nvmrc](.nvmrc)** (현재 `24`). CI도 이 파일을 읽어 같은 버전으로 돈다.
- 이 저장소에서 `npm`·`node` 명령을 처음 쓰기 전에 **`node -v`가 `.nvmrc`와 메이저 버전이 같은지 확인**한다.
  다르면 조용히 진행하지 말고 사용자에게 알리고 이걸 안내한다.
  - 맥·리눅스: 저장소 루트에서 `nvm install && nvm use` (`.nvmrc`를 자동으로 읽는다)
  - 윈도우: `nvm install 24 && nvm use 24` (nvm-windows는 `.nvmrc` 자동 인식을 기대하지 말 것)
  - nvm이 없으면: 맥은 `brew install nvm`, 윈도우는 [nvm-windows](https://github.com/coreybutler/nvm-windows/releases)
- `package.json`의 `engines.node`(`>=18`)는 **배포 런타임 하한**이라 `.nvmrc`와 역할이 다르다. Vercel은 `engines`를 따르고 `.nvmrc`는 안 읽는다 — 둘을 같은 값으로 맞추려 하지 말 것.
- **`.nvmrc` 변경은 팀 전원에게 영향**을 준다. 임의로 고치지 말고 사용자에게 확인받는다.
- Python 스크립트(`npm run screens`·`stamp-assets`, pre-commit 훅)는 맥에서 `python3`, 윈도우에서 `py -3`으로 자동 해석된다([scripts/py.js](scripts/py.js)). 직접 `python3`을 새로 박지 말 것.

## 건드리기 전에 읽을 것

지뢰가 있는 자리는 **그 자리의 주석이 정본**이다. 아래는 색인일 뿐이니, 해당 영역을 고치기 전에 원본을 열어보고 그 결론 위에서 작업한다(요약본을 여기 옮겨 적지 말 것 — 사본은 원본보다 먼저 틀린다).

| 무엇 | 어디 |
|---|---|
| **진단 저장은 '진단 실행' 단위**(렌더 단위 아님) — 과거 진단 불러오기·비교는 이 경계 위에서 | [db/13_diagnosis_run.sql](db/13_diagnosis_run.sql) 헤더 |
| **데모 목업이 실 DB로 새는 것 차단** — 판별은 `basic.age` 타입 하나(값 조합으로 거르면 실사용자 오탐) | [api/diagnose.js](api/diagnose.js) `데모 목업 차단` 주석 |
| **모드(`?mode=proto\|api`)는 탭에 고정** — 배포본 proto에서 추천이 비는 건 정상(실측표 미배포) | [web/js/config.js](web/js/config.js) `모드 스위치`·`proto 표시 배지` 주석 |
| **핏 취향은 `profile.prefs`**(진단이 쓰는 선호 핏과 별개 값) | [db/14_profile_prefs.sql](db/14_profile_prefs.sql) 헤더 |

**QA 공용 테스트 계정** — 로그인 기능을 볼 때 개인 계정을 쓰면 실 사용자 데이터와 섞인다(진단 건수가 킬메트릭). 계정은 `qa@fitting-kr.dev`, 비밀번호는 `.env.local`의 `QA_ACCOUNT_PASSWORD`(**git 제외** — 팀 채널로 전달). 화면에 비밀번호 로그인이 없고 이 주소는 실제 메일함도 아니라, 콘솔에서 세션을 만든 뒤 새로고침한다:

```js
await FITAUTH.client.auth.signInWithPassword({ email:'qa@fitting-kr.dev', password:'…' })
location.reload()
```

> ⚠️ 이 계정으로 진단을 돌리면 `diagnosis`에 실 행이 쌓인다 — 킬메트릭을 셀 때 이 `user_id`를 빼거나 테스트 뒤 지운다.

## 검증

- **엔진 변경** → `npm test` (무의존성 골든 테스트, 초록불 확인).
- **화면 변경** → `npm run serve`로 해당 화면 로드 확인.
- **화면 추가/수정** → [docs/화면-현황.source.json](docs/화면-현황.source.json) 상태 한 줄 갱신 후 `npm run screens`로 [docs/화면-현황.md](docs/화면-현황.md) 재생성(전체 진행상황판 — 소유·JS연결·최근커밋·IA 이슈는 자동, 상태·비고만 손관리).
- **CSS·JS 수정** → `npm run stamp-assets`로 `<link>`·`<script>`에 `?v=<내용해시>` 재스탬프(캐시버스트). pre-commit 훅이 `web/css/**`·`web/js/**` 커밋 시 자동 실행하니 보통 신경 안 써도 됨. (CSS=`web/css/`, JS=`web/js/`)
- `web/data/*.json`은 **생성물** — 손으로 고치지 말고 소스+생성기로 재생성(협업가이드 §4). 예외: `bodytypes.json`(디자이너 직접 관리).
