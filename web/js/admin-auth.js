/* web/js/admin-auth.js — 관리자 Supabase Auth(Google OAuth) + is_admin + 메트릭 읽기.
   필요: supabase-js(UMD, CDN) + config.js(SUPABASE_URL·PUBLISHABLE).
   진짜 방어는 DB RLS(admin-only) — 여기 읽기는 로그인 세션 JWT로 RLS 통과. */
(function (w) {
  "use strict";
  var url = w.SUPABASE_URL, key = w.SUPABASE_PUBLISHABLE_KEY;
  var client = (w.supabase && w.supabase.createClient && url && key) ? w.supabase.createClient(url, key) : null;

  var A = {
    client: client,
    ready: function () { return !!client; },

    signInGoogle: function (redirectTo) {
      return client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo || location.href } });
    },
    signOut: function () { return client ? client.auth.signOut() : Promise.resolve(); },
    getSession: async function () { try { var r = await client.auth.getSession(); return r.data.session; } catch (e) { return null; } },

    // admin_user 멤버십(RLS admin_self_read = 본인 행만). 있으면 관리자.
    isAdmin: async function () {
      var s = await A.getSession(); if (!s) return false;
      try { var r = await client.from('admin_user').select('id').eq('id', s.user.id).maybeSingle(); return !!(r.data && r.data.id); }
      catch (e) { return false; }
    },
    email: async function () { var s = await A.getSession(); return s && s.user && s.user.email; },

    // ── 대시보드 읽기 (RLS admin-only, 세션 JWT) ──
    killMetric: async function () { try { var r = await client.from('kill_metric').select('*').maybeSingle(); return r.data; } catch (e) { return null; } },
    // feedback + 임베드 diagnosis(result/카테고리/엔진버전) — 8유형·신뢰도 분해용
    feedbackJoin: async function (limit) {
      try {
        var r = await client.from('feedback')
          .select('id,created_at,verdict,actual_size,aware_brand,engine_improve_consent,diagnosis(category,result,engine_version)')
          .order('created_at', { ascending: false }).limit(limit || 500);
        return r.data || [];
      } catch (e) { return []; }
    }
  };

  w.ADMINAUTH = A;
})(window);
