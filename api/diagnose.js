/* api/diagnose.js — Vercel 서버리스 함수 (CJS).  [단계 D · 해자 보호]
   garments.json(브랜드 실측표)은 서버 전용 — 여기서만 require해 계산하고, 클라(app/)엔 배포 안 함.
   클라가 보낸 체형 추정 cm + 착용경험으로 ①역산(bodyFromExperiences) ②추천(recommend)만 서버 계산 →
   {eb, topRecs, botRecs} 반환 + diagnosis 1건 저장(id 반환 → 피드백 FK).
   ※ 체형 추정·8유형 분류·렌더는 클라 유지(민감치 아님). engine.js는 node 호환(무의존).
   env(Vercel): SUPABASE_URL · SUPABASE_SECRET_KEY(서버 전용, RLS 우회). */
var FitEngine = require('../web/js/engine.js').FitEngine;
var FitBodyType = require('../web/js/bodytype.js').FitBodyType;   // 8유형 분류(node 호환) — 저장 시점 카드 채움
var fetchT = require('./_fetch.js').fetchT;
var GARMENTS = require('../web/data/garments.json');
var SPECS_FILE = GARMENTS && GARMENTS.specs;   // 폴백(garment 테이블 조회 실패 시)
var CORRELATION = require('../web/data/body-correlation.json');   // 잔차공분산 — 미관측 둘레 조건부추정
if (FitEngine.seedCorrelation) FitEngine.seedCorrelation(CORRELATION);
var _specsCache = null, _specsRev = -1;
var EBMAP = { chest: 'chestFull', shoulder: 'shoulder', waist: 'waist', hip: 'hip', thigh: 'thigh' };

// 진단 실측표 = garment 테이블(admin CRUD). garment_meta.rev로 캐시 무효화 → 편집 즉시 반영.
// 정상: rev 1행만 조회(가벼움) · 변경 시에만 전체 재조회(1000행 캡 페이지네이션). 실패 시 직전 캐시/번들 파일 폴백.
async function getSpecs(URL, KEY) {
  var hdr = { apikey: KEY, Authorization: 'Bearer ' + KEY };
  try {
    var rv = await fetchT(URL + '/rest/v1/garment_meta?id=eq.1&select=rev', { headers: hdr });
    var rev = null; if (rv.ok) { var jr = await rv.json(); rev = (jr[0] || {}).rev; }
    if (rev != null && rev === _specsRev && _specsCache) return _specsCache;
    var specs = [], from = 0, PAGE = 1000, complete = false;
    while (true) {
      var r = await fetchT(URL + '/rest/v1/garment?select=spec&limit=' + PAGE + '&offset=' + from, { headers: hdr });
      if (!r.ok) break;                                   // 페이지 실패 → complete=false로 남김
      var rows = await r.json();
      for (var i = 0; i < rows.length; i++) specs.push(rows[i].spec);
      if (rows.length < PAGE) { complete = true; break; }  // 마지막 페이지까지 정상 수신
      from += PAGE;
    }
    // 중간에 끊긴 목록을 캐시하면 잘린 실측표가 rev 바뀔 때까지 추천·판정에 계속 쓰인다.
    //   전 페이지를 다 받은 경우에만 캐시하고, 아니면 직전 캐시/번들 파일로 폴백.
    if (complete && specs.length) { _specsCache = specs; _specsRev = rev; return specs; }
  } catch (e) {}
  return _specsCache || SPECS_FILE;
}

// 브랜드 노출 순서(admin 관리, brand 테이블) — service_role로 읽음. [db/04]
// 반환 map: brand_id → display_order(작을수록 상위) · active=false면 null(추천 제외).
var _brandMapCache = null;   // 직전 성공 맵 — 조회 실패 시 폴백(관리자의 비활성 설정을 잃지 않게)
async function brandOrderMap(URL, KEY) {
  try {
    var r = await fetchT(URL + '/rest/v1/brand?select=brand_id,display_order,active', { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } });
    if (!r.ok) return _brandMapCache || {};
    var rows = await r.json(); var m = {};
    rows.forEach(function (x) { m[x.brand_id] = (x.active === false) ? null : x.display_order; });
    _brandMapCache = m;
    return m;
  } catch (e) { return _brandMapCache || {}; }   // 빈 맵으로 떨어지면 비활성 브랜드가 다시 추천된다(fail-open)
}
// recs에 order 부여(미등록 브랜드=9999 뒤로) + 비활성(null) 제외. 최종 정렬·상위N은 클라(result.js)가 fit 자격 후 order로.
function decorateRecs(recs, ord) {
  return (recs || [])
    .filter(function (r) { return ord[r.brandId] !== null; })
    .map(function (r) { r.order = (ord[r.brandId] == null ? 9999 : ord[r.brandId]); return r; });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  var URL = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!URL || !KEY) return res.status(500).json({ error: 'missing supabase env' });
  if (!FitEngine || !FitEngine._real) return res.status(500).json({ error: 'engine unavailable' });
  var SPECS = await getSpecs(URL, KEY);   // garment 테이블(admin CRUD) · rev 캐시
  if (!SPECS || !SPECS.length) return res.status(500).json({ error: 'garments unavailable' });

  var b = req.body || {};

  /* 데모 목업 차단(서버 최종 방어선) — 클라 가드는 우회된다.
     demo-session.js가 api에서 '심지 않는다'만 지켰더니, 같은 탭이 앞서 proto로 열렸을 때
     이미 심긴 시드가 남아 result.js가 그걸 진짜 진단으로 POST했다(실 DB에 가짜 12건 유입,
     로그인 시 claim으로 계정에까지 귀속). 클라만 믿을 수 없으므로 여기서도 막는다.
     판별 기준은 age 타입 하나 — 실제 입력(diag-basic)은 '30대' 같은 연령대 문자열만 보내고,
     숫자 age를 만드는 코드는 데모 시드뿐이었다. 172/68·경험0 같은 값 조합으로 거르면
     '경험 0벌 진단'(정상 플로우)을 쓰는 실사용자를 오탐한다. */
  var _age = b.basic && b.basic.age;
  if (typeof _age === 'number') {
    return res.status(400).json({ error: 'invalid basic.age (연령대 문자열이어야 함) — 데모 목업으로 판단해 저장하지 않음' });
  }

  var sex = b.sex === 'male' ? 'male' : 'female';
  var prefs = b.prefs || {};
  var exps = Array.isArray(b.experiences) ? b.experiences : [];

  // ① 역산: 착용경험 → 부위별 인체 cm(prior 덮어쓰기용). ② 추천은 병합 cm으로.
  var eb = (FitEngine.bodyFromExperiences ? FitEngine.bodyFromExperiences(exps, SPECS, b.cm || {}) : {}) || {};  // b.cm=클라 회귀 몸 → 밴딩 허리 앵커링(B-2)
  var cm = {};
  var srcCm = b.cm || {};
  Object.keys(srcCm).forEach(function (k) { cm[k] = srcCm[k]; });     // 클라 추정 cm
  Object.keys(EBMAP).forEach(function (k) { if (eb[k] != null) cm[EBMAP[k]] = eb[k]; });  // 역산 덮어쓰기
  // 미관측 둘레부위 조건부 추정(앵커 잔차→상관) — 교차카테고리 추천·배 신호 개선. 앵커/시드 없으면 무동작.
  if (FitEngine.imputeGirths) {
    var imp = FitEngine.imputeGirths(srcCm, eb, sex);
    Object.keys(imp).forEach(function (k) { cm[k] = imp[k]; });
  }

  // 신뢰도 tier = 표시 4부위(가슴·어깨·허리·엉덩이) 중 실제 역산(eb)된 개수 — 클라 result.js confTier와 동일 규칙(부위기반).
  //   클라가 POST한 b.confidenceTier는 역산 전(경험수 기반)이라 부풀 수 있어, 서버 역산 결과로 정직화해 대체(표시·피드백과 일치).
  var ebShown = ['chest', 'shoulder', 'waist', 'hip'].filter(function (k) { return eb[k] != null; }).length;
  var confidenceTier = ebShown <= 0 ? 'low' : (ebShown < 4 ? 'mid' : 'high');

  // 8유형 분류 = 저장 시점에 서버가 계산(전엔 클라가 POST 이후 계산 → result.card null "?"). 클라와 동일 입력.
  var card = null;
  if (FitBodyType && FitBodyType.classify) {
    card = FitBodyType.classify({ gender: sex,
      heightCm: (b.basic && b.basic.height), weightKg: (b.basic && b.basic.weight),
      chestFull: cm.chestFull, chestUpper: cm.chestUpper, waist: cm.waist, hip: cm.hip });
  }

  var topRecs = (cm.chestFull != null)
    ? FitEngine.recommend({ chest: cm.chestFull, shoulder: cm.shoulder }, prefs.TOP || 'regular', sex, 'long_sleeve', SPECS) : [];
  var botRecs = (FitEngine.recommendBottom && cm.waist != null)
    ? FitEngine.recommendBottom({ waist: cm.waist, hip: cm.hip, thigh: cm.thigh }, prefs.BOTTOM || 'regular', sex, 'long_pants', SPECS) : [];

  // 브랜드 노출 순서(admin) 반영 — recs에 order 부여 + 비활성 제외. 클라는 fit 자격 후 order로 정렬.
  var ord = await brandOrderMap(URL, KEY);
  topRecs = decorateRecs(topRecs, ord);
  botRecs = decorateRecs(botRecs, ord);

  // 진단 저장 — 입력 원본 + 결과(카드·신뢰도·추천). 추천은 브랜드×사이즈만(실측표 원본 아님).
  var sid = b.session_id || ('anon-' + Date.now().toString(36));
  var cat = b.category || 'TOP';
  var runId = (typeof b.run_id === 'string' && b.run_id) ? b.run_id : null;
  var row = {
    session_id: sid,
    category: cat,
    run_id: runId,
    input: b.input != null ? b.input : { basic: b.basic, prefs: prefs, experiences: exps },
    result: { card: b.card || card || null, confidenceTier: confidenceTier, recs: { top: topRecs, bottom: botRecs } },
    engine_version: b.engine_version || 'server-1'
  };

  /* 같은 진단 실행이면 새 행을 만들지 않는다(db/13 · 진단 실행 단위 저장).
     계산 결과(eb·추천)는 매 요청 돌려줘야 하므로 위에서 그대로 계산하고, 저장만 건너뛴다.
     클라도 같은 조건을 갖지만 여기서 한 번 더 막는다 — 오늘 두 번 다 클라 가드가 우회됐다. */
  async function findExisting() {
    if (!runId) return null;
    try {
      var q = URL + '/rest/v1/diagnosis?select=id&limit=1'
        + '&session_id=eq.' + encodeURIComponent(sid)
        + '&run_id=eq.' + encodeURIComponent(runId)
        + '&category=eq.' + encodeURIComponent(cat);
      var rr = await fetchT(q, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } });
      if (!rr.ok) return null;
      var jj = await rr.json();
      return (jj && jj[0] && jj[0].id) || null;
    } catch (e) { return null; }
  }

  /* 보기 전용 요청(마이 embed·옛 결과 되불러오기)은 계산만 하고 저장하지 않는다.
     클라가 명시적으로 보낼 때만 적용 — 필드가 없는 구 클라는 종전대로 저장한다(회귀 방지). */
  if (b.view_only === true) {
    return res.status(200).json({ id: null, saved: false, eb: eb, card: card, topRecs: topRecs, botRecs: botRecs });
  }

  var dup = await findExisting();
  if (dup) return res.status(200).json({ id: dup, reused: true, eb: eb, card: card, topRecs: topRecs, botRecs: botRecs });

  var r;
  try {
    r = await fetchT(URL + '/rest/v1/diagnosis', {
      method: 'POST',
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(row)
    });
  } catch (e) {
    // 상한 초과/네트워크 실패를 처리되지 않은 예외로 흘리지 않는다(500 대신 명시적 응답).
    return res.status(e && e.timeout ? 504 : 502).json({ error: e && e.timeout ? 'upstream timeout' : 'upstream unreachable' });
  }
  var t = await r.text();
  if (!r.ok) {
    // 동시 요청이 겹치면(iframe 리로드가 앞 요청과 경합) 유니크 인덱스가 23505로 막는다 —
    // 이건 실패가 아니라 '이미 저장됨'이므로 그 행을 찾아 정상 응답한다.
    if (r.status === 409 || /23505|duplicate key/i.test(t)) {
      var again = await findExisting();
      if (again) return res.status(200).json({ id: again, reused: true, eb: eb, card: card, topRecs: topRecs, botRecs: botRecs });
    }
    return res.status(502).json({ error: 'supabase insert failed', detail: t });
  }
  var id = null; try { id = JSON.parse(t)[0].id; } catch (e) {}
  return res.status(201).json({ id: id, eb: eb, card: card, topRecs: topRecs, botRecs: botRecs });
};
