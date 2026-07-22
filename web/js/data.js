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

  /* 로컬/proto 화면 개발용 대표 사이즈표 — 캡처 인식(api=서버 Claude 비전)이 없을 때
     parseSizeTable가 이걸 돌려줘 캡처→보정→판정 플로우를 그대로 렌더한다.
     프로덕션 app/은 api 모드라 이 분기에 오지 않는다. api 응답과 동일 shape({parsed,usage}). */
  var SAMPLE_PARSED = {
    tableKind: 'garment', category: 'TOP', unit: 'cm',
    columns: ['가슴단면', '어깨너비', '소매길이', '총장'],
    sizes: [
      { label: 'S',  values: { chest: 50, shoulder: 43, sleeve: 61,   length: 68 } },
      { label: 'M',  values: { chest: 53, shoulder: 45, sleeve: 62.5, length: 70 } },
      { label: 'L',  values: { chest: 56, shoulder: 47, sleeve: 64,   length: 72 } },
      { label: 'XL', values: { chest: 59, shoulder: 49, sleeve: 65.5, length: 74 } }
    ],
    labeledCircumference: [], truncated: false, notes: '샘플(로컬 개발용) 사이즈표'
  };

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
    },

    /* ── 진단 계산+저장(단계 D) = /api/diagnose ───────────────
       api: 클라 추정 cm+착용경험을 서버로 → 서버가 specs(garments)로 역산·추천 계산.
            반환 {id, eb, topRecs, botRecs}. garments.json은 서버 전용(클라 미노출).
       proto: 로컬에서 계산(호출부가 garments.json 직접 로드) → null. */
    diagnose: function (d) {
      if (MODE === 'api') return postJSON('/api/diagnose', d).then(function (r) { return r.json(); });
      return Promise.resolve(null);
    },

    /* ── 구매 판정(단일 상품 셀) = /api/judge ─────────────────
       api: 클라 추정 cm+착용경험+대상 셀(브랜드·핏·종류)을 서버로 → 서버가 specs로 역산·판정.
            반환 {covered, judgment, eb}. garments.json은 서버 전용(실측 비노출).
       proto: 로컬 계산(호출부 judge.js가 garments.json 직접 로드) → null. */
    judge: function (d) {
      if (MODE === 'api') return postJSON('/api/judge', d).then(function (r) { return r.json(); });
      return Promise.resolve(null);
    },

    /* ── 사이즈표 캡처 인식 = /api/parse-size-table ───────────
       사용자가 올린 상품 사이즈표 이미지를 서버(Claude 비전)가 구조화 JSON으로.
       api: POST {image:base64|dataURL} → {parsed, usage}. 키는 서버 전용(비노출).
       proto: 서버 없음 → null(호출부가 '직접 입력' 폴백 유도). */
    parseSizeTable: function (imageDataUrl) {
      if (MODE === 'api') return postJSON('/api/parse-size-table', { image: imageDataUrl }).then(function (r) { return r.json(); });
      return Promise.resolve({ parsed: SAMPLE_PARSED, usage: { mock: true }, model: 'dev-sample' });   // 로컬 화면 개발용 대표 표
    },

    /* ── 사이즈표 제공(수집) = /api/submit-garment ────────────
       판정에서 사용자가 올린 표를 엔진 개선 opt-in 동의 시 저장(검수 큐행).
       api: consent=true일 때만 POST → {ok}. proto: 미저장(데모) → false. */
    submitGarment: function (payload) {
      if (MODE !== 'api') return Promise.resolve(false);
      var d = payload || {}; d.session_id = this.sessionId();
      return postJSON('/api/submit-garment', d).then(function (r) { return r.ok; }).catch(function () { return false; });
    },

    /* ── 수요 신호(스타일리스트찾기 페이크도어) = /api/lead ──────
       실매칭 없이 "얼마나 원하나"만 측정. api 모드에서만 서버 저장(목업 downstream 미개방).
       demand: {kind:'quote'|'notify', service, occasion, budget, note, stylist, contact}
       proto: 미저장(데모는 기존 목업 흐름 유지) → false. api: /api/lead POST → true. */
    saveLead: function (demand) {
      if (MODE !== 'api') return false;
      var d = demand || {}; d.session_id = this.sessionId();
      postJSON('/api/lead', d);
      return true;
    }
  };

  global.FDATA = FDATA;
})(window);
