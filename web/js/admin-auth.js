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

    // ── 관리자 초대·자동승격 [db/07] ──
    claimAdmin: async function () { try { var r = await client.rpc('claim_admin'); return r.data === true; } catch (e) { return false; } },
    listInvites: async function () { try { var r = await client.from('admin_invite').select('email,invited_by,invited_at').order('invited_at', { ascending: false }); return r.data || []; } catch (e) { return []; } },
    inviteAdmin: async function (email, by) { try { var r = await client.from('admin_invite').insert({ email: email, invited_by: by || null }); return { ok: !r.error, error: r.error && r.error.message }; } catch (e) { return { ok: false, error: String(e) }; } },
    cancelInvite: async function (email) { try { var r = await client.from('admin_invite').delete().eq('email', email); return !r.error; } catch (e) { return false; } },
    listAdmins: async function () { try { var r = await client.from('admin_user').select('id,email,role,added_at').order('added_at', { ascending: true }); return r.data || []; } catch (e) { return []; } },
    revokeAdmin: async function (id) { try { var r = await client.from('admin_user').delete().eq('id', id); return !r.error; } catch (e) { return false; } },

    // ── 대시보드 읽기 (RLS admin-only, 세션 JWT) ──
    killMetric: async function () { try { var r = await client.from('kill_metric').select('*').maybeSingle(); return r.data; } catch (e) { return null; } },
    // feedback + 임베드 diagnosis(input/result/카테고리/엔진버전) — 8유형·신뢰도·성별·앵커 분해용
    feedbackJoin: async function (limit) {
      try {
        var r = await client.from('feedback')
          .select('id,created_at,verdict,actual_size,aware_brand,engine_improve_consent,diagnosis(category,input,result,engine_version)')
          .order('created_at', { ascending: false }).limit(limit || 500);
        return r.data || [];
      } catch (e) { return []; }
    },

    // ── 브랜드 실측표(해자) 읽기 = garment/garment_meta [db/03] ──
    // 로그인 세션 JWT로 RLS(admin-only) 통과. garments.json과 동일 shape({specs, $meta}) 반환.
    // Supabase 기본 1000행 캡 대응 페이지네이션. DB 실패/미로그인 시 로컬 garments.json 폴백(프로토/로컬 dev용 —
    // 프로덕션 app/엔 파일 부재라 폴백=빈값 → admin 로그인 필수).
    garments: async function () {
      try {
        if (client) {
          var specs = [], from = 0, PAGE = 1000;
          while (true) {
            var r = await client.from('garment').select('spec').range(from, from + PAGE - 1);
            if (r.error || !r.data || !r.data.length) break;
            for (var i = 0; i < r.data.length; i++) specs.push(r.data[i].spec);
            if (r.data.length < PAGE) break;
            from += PAGE;
          }
          if (specs.length) {
            var m = await client.from('garment_meta').select('meta').eq('id', 1).maybeSingle();
            return { specs: specs, $meta: (m && m.data && m.data.meta) || {} };
          }
        }
      } catch (e) {}
      try { var f = await fetch('data/garments.json'); return await f.json(); } catch (e) { return { specs: [], $meta: {} }; }
    },

    // ── 브랜드 노출 순서(진단 추천 정렬) = brand 테이블 [db/04] ──
    // 읽기: {brand_id: {brand_id, brand_name, display_order, active}} · 쓰기: upsert(onConflict brand_id). RLS admin.
    brandOrder: async function () {
      try {
        var r = await client.from('brand').select('brand_id,brand_name,display_order,active').order('display_order', { ascending: true });
        var m = {}; (r.data || []).forEach(function (x) { m[x.brand_id] = x; }); return m;
      } catch (e) { return {}; }
    },
    saveBrand: async function (rows) {
      try { var r = await client.from('brand').upsert(rows, { onConflict: 'brand_id' }); return !r.error; }
      catch (e) { return false; }
    },

    // ── 사용자 제출 사이즈표 검수(garment_submission 테이블) [db/08] — admin RLS. 판정 ④⑤ ──
    // 읽기: 상태별(기본 pending) 최신순. 쓰기: status만 변경(verified|rejected|merged).
    submissions: async function (status) {
      if (!client) return [];
      try {
        var q = client.from('garment_submission').select('*').order('created_at', { ascending: false }).limit(500);
        if (status) q = q.eq('status', status);
        var r = await q; return r.data || [];
      } catch (e) { return []; }
    },
    setSubmissionStatus: async function (id, status) {
      if (!client) return false;
      try { var r = await client.from('garment_submission').update({ status: status }).eq('id', id); return !r.error; }
      catch (e) { return false; }
    },

    // ── 실측표 CRUD(garment 테이블) [db/05] — admin RLS 쓰기. 변경 시 rev 자동 증가(트리거)→진단 즉시 반영. ──
    // 저장 전략: 현재 뷰 행을 insert(무 id, identity 생성) 후 기존 id 삭제 → GENERATED ALWAYS upsert 충돌 회피.
    // rows: [{brand_id, category, spec}] (id 없음).
    insertGarment: async function (rows) {
      try { var r = await client.from('garment').insert(rows); return { ok: !r.error, error: r.error && r.error.message }; }
      catch (e) { return { ok: false, error: String(e) }; }
    },
    deleteGarment: async function (ids) {
      try { var r = await client.from('garment').delete().in('id', ids); return !r.error; }
      catch (e) { return false; }
    },
    // CRUD용: id 포함 전체 행(수정/삭제 대상 식별). 1000행 캡 페이지네이션.
    garmentRows: async function () {
      try {
        var rows = [], from = 0, PAGE = 1000;
        while (true) {
          var r = await client.from('garment').select('id,brand_id,category,spec').range(from, from + PAGE - 1);
          if (r.error || !r.data || !r.data.length) break;
          for (var i = 0; i < r.data.length; i++) rows.push(r.data[i]);
          if (r.data.length < PAGE) break;
          from += PAGE;
        }
        return rows;
      } catch (e) { return []; }
    },
    garmentMeta: async function () {
      try { var r = await client.from('garment_meta').select('meta').eq('id', 1).maybeSingle(); return (r.data && r.data.meta) || {}; }
      catch (e) { return {}; }
    },

    // ── 테스트 로그 초기화 [db/06] — admin RLS delete. 되돌릴 수 없음. (created_at 필터=전체 행) ──
    resetDiagnosisLogs: async function () {  // 진단+피드백 (FK: feedback→diagnosis, feedback 먼저)
      if (!client) return { ok: false, error: 'no client' };
      try {
        var f = await client.from('feedback').delete().gte('created_at', '1900-01-01');
        if (f.error) return { ok: false, error: f.error.message };
        var d = await client.from('diagnosis').delete().gte('created_at', '1900-01-01');
        return { ok: !d.error, error: d.error && d.error.message };
      } catch (e) { return { ok: false, error: String(e) }; }
    },
    resetLeadLogs: async function () {
      if (!client) return { ok: false, error: 'no client' };
      try { var r = await client.from('lead').delete().gte('created_at', '1900-01-01'); return { ok: !r.error, error: r.error && r.error.message }; }
      catch (e) { return { ok: false, error: String(e) }; }
    },

    // ── 전문가 수요(lead) 읽기 [db/02] — 웨이트리스트/견적요청 수요 + 진단 후 전환 측정 ──
    leads: async function (limit) {
      try {
        var r = await client.from('lead').select('id,created_at,session_id,kind,service,occasion,budget,note,stylist,contact')
          .order('created_at', { ascending: false }).limit(limit || 500);
        return r.data || [];
      } catch (e) { return []; }
    },
    // 진단(결과 시점 수집) + 임베드 feedback(정확도 응답 — 누르면 채워짐, 아니면 대기) — diagnosis 중심 로그.
    diagnosesJoin: async function (limit) {
      try {
        var r = await client.from('diagnosis')
          .select('id,created_at,session_id,category,input,result,engine_version,feedback(verdict,engine_improve_consent,created_at)')
          .order('created_at', { ascending: false }).limit(limit || 500);
        return r.data || [];
      } catch (e) { return []; }
    },
    // 진단 로그(input 포함) — 엔진 강화 분석용(painFlags·openNote·anchors). RLS admin.
    diagnoses: async function (limit) {
      try {
        var r = await client.from('diagnosis').select('id,created_at,session_id,category,input,result,engine_version')
          .order('created_at', { ascending: false }).limit(limit || 1000);
        return r.data || [];
      } catch (e) { return []; }
    },
    // 진단 세션 id(전환 분모/조인용) — distinct는 클라 dedupe. 1000행 캡 페이지네이션.
    diagnosisSessions: async function () {
      try {
        var seen = {}, from = 0, PAGE = 1000;
        while (true) {
          var r = await client.from('diagnosis').select('session_id').range(from, from + PAGE - 1);
          if (r.error || !r.data || !r.data.length) break;
          for (var i = 0; i < r.data.length; i++) if (r.data[i].session_id) seen[r.data[i].session_id] = 1;
          if (r.data.length < PAGE) break;
          from += PAGE;
        }
        return Object.keys(seen);
      } catch (e) { return []; }
    }
  };

  w.ADMINAUTH = A;
})(window);
