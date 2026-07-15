/* web/js/data.js — 데이터 접근 어댑터(seam).  [D-15]
   목적: web/ 단일 소스. app/ 생성 시 여기 mode만 'api'로 스왑하면
         localStorage/클라이언트 → /api/*(서버 엔진·Supabase)로 전환.
   원칙: 화면·마크업은 그대로. "어디서 읽고 쓰나"만 이 파일이 결정.
   proto(기본): localStorage/sessionStorage + 클라이언트 엔진
   api(생성):   서버 라우트. FITTING_MODE='api' 를 생성 스크립트가 주입.
   ※ 1차 증분 = 측정 쓰기 경로(피드백·결과저장·인증). diagnose(엔진 경계)와
     admin 읽기(loadFeedback)는 인터페이스만 두고 다음 증분에서 배선. */
(function (global) {
  var MODE = global.FITTING_MODE === 'api' ? 'api' : 'proto';

  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function postJSON(url, body) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  }

  var FDATA = {
    mode: MODE,

    /* 익명 세션 id(진단 기록용) — get-or-create, localStorage 유지 */
    sessionId: function () {
      var k = 'fitting.session', v = null;
      try { v = localStorage.getItem(k); } catch (e) {}
      if (!v) { v = 's-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); try { localStorage.setItem(k, v); } catch (e) {} }
      return v;
    },

    /* ── 피드백 (킬 메트릭 원천) ───────────────────────────────
       rec(canonical): {verdict, engineImprove, ageAttested, diagnosisId, bodyType, confidenceTier, ts}
       proto: 동기 localStorage push / api: /api/feedback 로 매핑 POST(diagnosis_id 필수) */
    saveFeedback: function (rec) {
      if (MODE === 'api') {
        if (!rec.diagnosisId) return;   // 진단 미기록 시 스킵(안전)
        postJSON('/api/feedback', {
          diagnosis_id: rec.diagnosisId, verdict: rec.verdict, aware_brand: true,
          engine_improve_consent: !!rec.engineImprove, age_attested: !!rec.ageAttested
        });
        return;
      }
      var arr = lsGet('fitting.feedback', []); arr.push(rec); lsSet('fitting.feedback', arr);
    },
    // admin-diagnostics 읽기. proto: 동기 배열 / api: 다음 증분에서 async 배선(GET /api/admin/feedback)
    loadFeedback: function () { return MODE === 'api' ? [] /*TODO async*/ : lsGet('fitting.feedback', []); },
    clearFeedback: function () { if (MODE !== 'api') { try { localStorage.removeItem('fitting.feedback'); } catch (e) {} } },

    /* ── 동의(진단 개선 opt-in) ──────────────────────────────
       transient 입력 — 양 모드 sessionStorage. 값은 피드백 rec에 포함돼 서버로 감. */
    readConsent: function () { try { return JSON.parse(sessionStorage.getItem('fitting.consent') || '{}'); } catch (e) { return {}; } },
    saveConsent: function (c) { try { sessionStorage.setItem('fitting.consent', JSON.stringify(c)); } catch (e) {} },

    /* ── 결과 저장 · 인증 게이트 ─────────────────────────────── */
    isAuthed: function () { try { return localStorage.getItem('fitting.auth') !== 'false'; } catch (e) { return true; } },
    saveUser: function (u) { lsSet('fitting.user', u); },

    /* ── 진단 기록(store) = /api/diagnose ────────────────────
       클라이언트 계산 결과({session_id,category,input,result,engine_version})를 서버에
       저장하고 diagnosis id 반환(→ 이후 saveFeedback의 diagnosis_id).
       proto: 서버 미기록(클라 계산만) → null.
       ※ 엔진을 서버에서 '계산'까지 하는 건 단계 D(이 함수 안으로 흡수). */
    recordDiagnosis: function (d) {
      if (MODE === 'api') return postJSON('/api/diagnose', d).then(function (r) { return r.json(); }).then(function (j) { return j && j.id; });
      return Promise.resolve(null);
    }
  };

  global.FDATA = FDATA;
})(window);
