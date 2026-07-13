// scripts/serve.js — 로컬 정적 서버 (의존성 0 · 크로스플랫폼)
// 사용: npm run serve   → http://localhost:8000  (Ctrl+C로 종료)
// 포트 바꾸기: PORT=3000 npm run serve
// web/ 폴더를 그대로 서빙한다. 정적 사이트라 빌드 불필요.
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "web");
const PORT = process.env.PORT || 8000;

// vercel.json rewrites를 로컬에서도 반영 → 배포와 동일 URL(예: /pro.html → /expert/pro.html).
// exact-path rewrite만 지원(현재 사용 형태). 없거나 파싱 실패 시 무시.
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

http
  .createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p === "/" || p.endsWith("/")) p += "index.html";
    if (REWRITES[p]) p = REWRITES[p];   // 배포 리라이트 반영(URL은 그대로, 서빙 파일만 교체)
    const file = path.join(ROOT, path.normalize(p));
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end("forbidden"); }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end("not found: " + p); }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
      res.end(data);
    });
  })
  .listen(PORT, () => console.log(`web/ → http://localhost:${PORT}/   (Ctrl+C로 종료)`));
