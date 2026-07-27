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
        .then(function (r) { return { ok: !r.error, error: r.error && r.error.message }; });
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
    upsertProfile: async function (patch) {   // {display_name?, basic?, engine_improve_consent?, age_attested?, agreed_at?}
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
    deleteMyData: async function () { if (!client) return { ok: false }; try { var r = await client.rpc('delete_my_data'); return { ok: !r.error, error: r.error && r.error.message }; } catch (e) { return { ok: false, error: String(e) }; } }
  };

  w.FITAUTH = A;
})(window);
