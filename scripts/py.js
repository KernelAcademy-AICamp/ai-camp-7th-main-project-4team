#!/usr/bin/env node
// Python 실행기 해석 — 맥/리눅스는 python3, 윈도우는 py 런처.
// 왜: package.json·.githooks/pre-commit 이 python3 을 직접 부르면 윈도우에서 깨진다
//     (윈도우엔 python3 이 없고 py 가 표준 런처). 부르는 쪽은 여기만 거치면 된다.
// 사용: node scripts/py.js <스크립트.py> [인자...]
// 주의: 이 저장소의 .py 는 전부 표준 라이브러리만 쓴다(가상환경 불필요).

const { spawnSync } = require("child_process");

// 후보를 순서대로 시도한다. 윈도우의 python 은 3.10 등 구버전이 잡힐 수 있어
// py -3 을 먼저 둔다(런처가 최신 3.x 를 고름).
const candidates =
  process.platform === "win32"
    ? [["py", ["-3"]], ["python", []], ["python3", []]]
    : [["python3", []], ["python", []]];

function works(cmd, pre) {
  const r = spawnSync(cmd, [...pre, "--version"], { stdio: "ignore", shell: false });
  return r.status === 0;
}

const found = candidates.find(([cmd, pre]) => works(cmd, pre));
if (!found) {
  console.error(
    "✗ Python 을 찾을 수 없습니다. 시도한 것: " +
      candidates.map(([c, p]) => [c, ...p].join(" ")).join(", ")
  );
  process.exit(1);
}

const [cmd, pre] = found;
const r = spawnSync(cmd, [...pre, ...process.argv.slice(2)], { stdio: "inherit", shell: false });
process.exit(r.status === null ? 1 : r.status);
