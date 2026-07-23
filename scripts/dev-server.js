// scripts/dev-server.js — 로컬 개발 서버 (의존성 0 · 크로스플랫폼 · vercel CLI 불필요)
// 사용: npm run dev:api   → http://localhost:3000  (Ctrl+C로 종료)
//
// 왜: `vercel dev`는 (1) vercel 로그인 (2) 개인 계정 프로젝트 링크 (3) bash 전용 `set -a`
//     구문을 요구해서 윈도우 팀원 자리에서 구동이 안 된다. api/*.js는 의존성 없는 CJS
//     핸들러(req.body / res.status().json())라 여기서 직접 호출하면 배포와 동일하게 동작한다.
// 무엇: web/ 정적 서빙(serve.js와 동일) + /api/* → api/<name>.js 핸들러 호출.
//       .env.local을 노드가 직접 파싱해 process.env에 채운다(셸 문법 의존 없음 = 윈도우 OK).
// 포트 3000 = web/js/config.js가 ?mode= 없이도 api 모드로 붙는 포트.
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "web");
const API_DIR = path.join(__dirname, "..", "api");
const PORT = process.env.PORT || 3000;

// ── .env.local 로드 (KEY=VALUE · # 주석 · 따옴표 · 인라인주석 지원) ─────────
// 이미 셸에 있는 값은 덮지 않는다(CI·일회성 오버라이드 우선).
function loadEnv(file) {
  let text;
  try { text = fs.readFileSync(file, "utf8"); } catch (_) { return false; }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim().replace(/^export\s+/, "");
    let val = line.slice(eq + 1).trim();
    const q = val[0];
    if (q === '"' || q === "'") {
      const end = val.indexOf(q, 1);
      val = end < 0 ? val.slice(1) : val.slice(1, end);
    } else {
      val = val.replace(/\s+#.*$/, "").trim();   // 인라인 주석 제거(따옴표 없을 때만)
    }
    if (!(key in process.env)) process.env[key] = val;
  }
  return true;
}
const ENV_FILE = path.join(__dirname, "..", ".env.local");
const hasEnv = loadEnv(ENV_FILE);

// 필수 env 점검 — 없으면 뜨기 전에 무엇을 채워야 하는지 알려준다(런타임 500 대신).
const MISSING = ["SUPABASE_URL", "SUPABASE_SECRET_KEY"].filter((k) => !process.env[k]);
if (MISSING.length) {
  console.error(
    (hasEnv ? ".env.local에 값이 비었습니다" : ".env.local이 없습니다") +
      ` — 필요한 키: ${MISSING.join(", ")}\n` +
      "  1) cp .env.example .env.local   (윈도우: copy .env.example .env.local)\n" +
      "  2) Supabase → Project Settings → API Keys 에서 값 복사\n" +
      "  ※ DB 없이 화면만 볼 땐 `npm run serve`(8000포트 · proto 모드).",
  );
  process.exit(1);
}

// ── 정적 서빙 (scripts/serve.js와 동일 규칙) ───────────────────────────────
let REWRITES = {};
try {
  const vj = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "vercel.json"), "utf8"));
  for (const r of vj.rewrites || []) if (r.source && r.destination) REWRITES[r.source] = r.destination;
} catch (_) {}
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".webp": "image/webp",
};

// ── /api/* → api/<name>.js ────────────────────────────────────────────────
// `_` 접두사 파일은 공용 모듈(배포에서도 라우트 아님) → 노출 금지.
function resolveHandler(pathname) {
  const name = pathname.replace(/^\/api\//, "").replace(/\/+$/, "");
  if (!/^[a-z0-9-]+$/i.test(name) || name.startsWith("_")) return null;
  const file = path.join(API_DIR, name + ".js");
  if (!fs.existsSync(file)) return null;
  delete require.cache[require.resolve(file)];   // 저장하면 즉시 반영(핫리로드)
  return require(file);
}

function readBody(req) {
  return new Promise((resolve) => {
    let buf = "";
    req.on("data", (c) => { buf += c; if (buf.length > 8e6) req.destroy(); });
    req.on("end", () => resolve(buf));
  });
}

// Vercel 런타임이 주는 편의 API(res.status().json(), req.body/query)를 흉내낸다.
function shim(req, res, url, raw) {
  req.query = Object.fromEntries(url.searchParams);
  const ct = String(req.headers["content-type"] || "");
  if (raw && ct.includes("application/json")) {
    try { req.body = JSON.parse(raw); } catch (_) { req.body = {}; }
  } else req.body = raw || undefined;

  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(obj));
    return res;
  };
  res.send = (data) => { res.end(data); return res; };
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost:" + PORT);

    if (url.pathname.startsWith("/api/")) {
      const handler = resolveHandler(url.pathname);
      if (typeof handler !== "function") {
        res.statusCode = 404;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.end(JSON.stringify({ error: "no such api route" }));
      }
      const raw = await readBody(req);
      shim(req, res, url, raw);
      try {
        await handler(req, res);
      } catch (e) {
        console.error(`[api] ${url.pathname} 실패:`, e);
        if (!res.headersSent) res.status(500).json({ error: "handler threw", detail: String((e && e.message) || e) });
        else res.end();
      }
      return;
    }

    let p = decodeURIComponent(url.pathname);
    if (p === "/" || p.endsWith("/")) p += "index.html";
    if (REWRITES[p]) p = REWRITES[p];
    const file = path.join(ROOT, path.normalize(p));
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end("forbidden"); }
    fs.readFile(file, (err, data) => {
      if (err) {
        return fs.readFile(path.join(ROOT, "404.html"), (e2, page) => {
          res.writeHead(404, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache, no-store, must-revalidate" });
          res.end(page || "not found");
        });
      }
      res.writeHead(200, {
        "Content-Type": TYPES[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      });
      res.end(data);
    });
  })
  .listen(PORT, () =>
    console.log(
      `web/ + /api/* → http://localhost:${PORT}/   (api 모드 · Ctrl+C로 종료)\n` +
        `  DB: ${process.env.SUPABASE_URL}`,
    ),
  );
