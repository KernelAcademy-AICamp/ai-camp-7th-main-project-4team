/* web/js/auth.js — 소비자 계정 Supabase Auth (Phase 0a: 로그인+개인화).
   필요: supabase-js(UMD CDN) + config.js(SUPABASE_URL·PUBLISHABLE). admin-auth.js와 같은 클라 패턴.
   방어는 DB RLS('본인 행 소유', db/11) — 여기 읽기/쓰기는 로그인 JWT로 RLS 통과.
   진단은 익명 가능, 로그인은 '저장' 시점에만(킬메트릭 전환 보호). 로그인 시 익명 진단을 계정으로 claim. */
(function (w) {
  "use strict";
  var url = w.SUPABASE_URL, key = w.SUPABASE_PUBLISHABLE_KEY;
  var client = (w.supabase && w.supabase.createClient && url && key) ? w.supabase.createClient(url, key) : null;

  var A = {
    client: client,
    ready: function () { return !!client; },

    // ── 로그인/세션 ──
    signInEmail: function (email, redirectTo) {   // 이메일 매직링크(비밀번호 없음)
      if (!client) return Promise.resolve({ ok: false, error: 'auth 미초기화' });
      return client.auth.signInWithOtp({ email: email, options: { emailRedirectTo: redirectTo || location.href } })
        .then(function (r) { return { ok: !r.error, error: r.error && r.error.message }; })
        // reject(네트워크·CORS·SDK 예외)까지 잡아 항상 {ok:false,error}로 귀결 — 안 잡으면 호출부 토스트가 통째로 안 뜬다(무반응).
        .catch(function (e) { return { ok: false, error: (e && e.message) || String(e) }; });
    },
    signInGoogle: function (redirectTo) {
      if (!client) return Promise.resolve({ ok: false });
      return client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo || location.href } });
    },
    // 카카오 — 이메일 scope를 요청하되(account_email), 사용자가 거부/미승인이면 email 없이도 로그인 성립.
    //   계정 식별은 email이 아니라 auth.uid()(db/11 전부 uid 키잉)라 email null이어도 저장·이력·개인정보 정상.
    signInKakao: function (redirectTo) {
      if (!client) return Promise.resolve({ ok: false });
      return client.auth.signInWithOAuth({ provider: 'kakao', options: { redirectTo: redirectTo || location.href, scopes: 'account_email' } });
    },
    // 표시명 — email에 의존하지 않는다(카카오 무이메일 대비). 메타데이터 닉네임 우선, 없으면 email 앞부분, 그것도 없으면 '회원'.
    displayName: function (user) {
      if (!user) return '회원';
      var m = user.user_metadata || {};
      return m.name || m.full_name || m.nickname || m.user_name || m.preferred_username
        || (user.email ? String(user.email).split('@')[0] : null) || '회원';
    },
    // 연결 계정 표시용 provider 라벨 — app_metadata.provider(google/kakao/email) 기준. 모르면 원문/'계정'.
    providerLabel: function (user) {
      var p = (user && user.app_metadata && user.app_metadata.provider) || '';
      return { google: '구글', kakao: '카카오', email: '이메일' }[p] || p || '계정';
    },
    signOut: function () { return client ? client.auth.signOut() : Promise.resolve(); },
    getSession: async function () { try { var r = await client.auth.getSession(); return r.data.session; } catch (e) { return null; } },
    user: async function () { var s = await A.getSession(); return s && s.user; },
    // 세션 변화 구독(SIGNED_IN / SIGNED_OUT). cb(event, session).
    onChange: function (cb) { if (client) client.auth.onAuthStateChange(function (e, s) { cb(e, s); }); },

    // ── 익명 진단 → 계정 귀속 (db/11 claim_diagnoses) ──
    claimDiagnoses: async function (sessionId) {
      if (!client || !sessionId) return 0;
      try { var r = await client.rpc('claim_diagnoses', { p_session_id: sessionId }); return r.data || 0; }
      catch (e) { return 0; }
    },

    // ── 프로필 (RLS owner) ──
    getProfile: async function () {
      if (!client) return null;
      var u = await A.user(); if (!u) return null;
      try { var r = await client.from('profile').select('*').eq('id', u.id).maybeSingle(); return r.data || null; }
      catch (e) { return null; }
    },
    upsertProfile: async function (patch) {   // {display_name?, email?, basic?}
      if (!client) return { ok: false };
      var u = await A.user(); if (!u) return { ok: false, error: '로그인 필요' };
      var row = Object.assign({ id: u.id }, patch || {});
      try { var r = await client.from('profile').upsert(row).select().maybeSingle(); return { ok: !r.error, data: r.data, error: r.error && r.error.message }; }
      catch (e) { return { ok: false, error: String(e) }; }
    },

    // ── 내 진단 이력 (RLS owner_read = 본인 것만) ──
    myDiagnoses: async function (limit) {
      if (!client) return [];
      try {
        var r = await client.from('diagnosis').select('id,created_at,category,input,result')
          .order('created_at', { ascending: false }).limit(limit || 50);
        return r.data || [];
      } catch (e) { return []; }
    },

    // ── 개인정보 (db/11 RPC) ──
    exportMyData: async function () { if (!client) return null; try { var r = await client.rpc('export_my_data'); return r.data || null; } catch (e) { return null; } },
    deleteMyData: async function () { if (!client) return { ok: false }; try { var r = await client.rpc('delete_my_data'); return { ok: !r.error, error: r.error && r.error.message }; } catch (e) { return { ok: false, error: String(e) }; } },

    /* 회원 탈퇴 — 세 단계를 순서대로. 중간에 실패하면 거기서 멈추고 사실대로 알린다
       (예전엔 아무것도 안 하고 '완료됐어요'만 띄웠다).
         ① rpc('withdraw_account')  개인정보(profile) 파기 + 진단 비식별화(db/12)
         ② POST /api/withdraw       auth 계정 삭제 — service_role이 필요해 서버에서만 가능
         ③ signOut                  로컬 세션 정리
       ②가 실패해도 ①은 이미 끝났다(개인정보는 파기됨) → partial로 구분해 알린다. */
    withdraw: async function () {
      if (!client) return { ok: false, error: 'auth 미초기화' };
      var anonymized = 0;
      try {
        var r = await client.rpc('withdraw_account');
        if (r.error) return { ok: false, error: r.error.message };
        if (r.data && r.data.ok === false) return { ok: false, error: r.data.error || 'withdraw_account 실패' };
        anonymized = (r.data && r.data.anonymized) || 0;
      } catch (e) { return { ok: false, error: String(e) }; }

      var s = await A.getSession();
      var token = s && s.access_token;
      if (!token) return { ok: false, partial: true, anonymized: anonymized, error: '세션이 없어 계정 삭제를 못 했어요' };

      try {
        var resp = await fetch('/api/withdraw', { method: 'POST', headers: { Authorization: 'Bearer ' + token } });
        if (!resp.ok) {
          var detail = ''; try { detail = (await resp.json()).error || ''; } catch (e2) {}
          return { ok: false, partial: true, anonymized: anonymized, error: detail || ('계정 삭제 실패(' + resp.status + ')') };
        }
      } catch (e) { return { ok: false, partial: true, anonymized: anonymized, error: String(e) }; }

      try { await client.auth.signOut(); } catch (e) {}
      return { ok: true, anonymized: anonymized };
    }
  };

  w.FITAUTH = A;
})(window);
