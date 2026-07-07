// scripts/serve.js — 로컬 정적 서버 (의존성 0 · 크로스플랫폼)
// 사용: npm run serve   → http://localhost:8000  (Ctrl+C로 종료)
// 포트 바꾸기: PORT=3000 npm run serve
// web/ 폴더를 그대로 서빙한다. 정적 사이트라 빌드 불필요.
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "web");
const PORT = process.env.PORT || 8000;
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
    const file = path.join(ROOT, path.normalize(p));
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end("forbidden"); }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end("not found: " + p); }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
      res.end(data);
    });
  })
  .listen(PORT, () => console.log(`web/ → http://localhost:${PORT}/   (Ctrl+C로 종료)`));
