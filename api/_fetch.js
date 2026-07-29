/* api/_fetch.js — 외부 호출 공용 타임아웃 래퍼 (CJS).
   `_` 접두사라 Vercel이 라우트로 배포하지 않는다(공용 모듈 전용).

   왜: 서버리스에서 응답 없는 fetch는 함수가 그대로 매달려 실행시간을 태우고,
       사용자는 원인 모를 지연 끝에 플랫폼 타임아웃을 받는다. 상한을 우리가 정한다.
   무엇: AbortController로 상한을 걸고, 타임아웃을 일반 네트워크 오류와 구분해 던진다
        (err.timeout=true) — 호출부가 폴백/재시도를 판단할 수 있게. */

var MS = {
  SUPABASE: 6000,    // REST 단건·페이지 조회·insert. 정상 응답은 수백 ms.
  LLM: 30000         // Anthropic 비전 호출(사이즈표 파싱) — 본래 수 초~수십 초.
};

/** fetch + 타임아웃. 초과 시 err.timeout=true 인 Error를 던진다. */
async function fetchT(url, opts, ms) {
  opts = opts || {};
  ms = ms || MS.SUPABASE;
  var ac = new AbortController();
  var timer = setTimeout(function () { ac.abort(); }, ms);
  try {
    return await fetch(url, Object.assign({}, opts, { signal: ac.signal }));
  } catch (e) {
    if ((e && e.name === 'AbortError') || ac.signal.aborted) {
      var err = new Error('upstream timeout after ' + ms + 'ms');
      err.name = 'TimeoutError';
      err.timeout = true;
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { fetchT: fetchT, MS: MS };
