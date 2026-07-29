/* api/parse-size-table.js — Vercel 서버리스 함수 (CJS).  [구매 판정 · 캡처 입력]
   사용자가 올린 상품 사이즈표 이미지를 Claude 비전으로 읽어 구조화 JSON으로.
   ★ 원칙: AI는 '전사'만. 판정 계산은 engine.js 규칙(결정론). 단면/둘레 판정은 서버가 값 분포로(여기 아님, 배선 단계).
   ★ 키는 서버 전용(ANTHROPIC_API_KEY) — 절대 클라 노출 금지.
   무의존: SDK 없이 raw fetch(Node18+ 전역 fetch). 구조화 출력은 안정적인 강제 tool-use로.
   재사용: parseSizeTable(b64, mediaType, opts) 를 export → 로컬 테스트 스크립트도 같은 로직 사용. */
var F = require('./_fetch.js'), fetchT = F.fetchT, MS = F.MS;

var MODEL = process.env.PARSE_MODEL || 'claude-sonnet-5';   // 기본 sonnet(비전+비용). 정확도 부족 시 claude-opus-4-8.

// 우리 부위 키(engine.js와 동일): 표에 있는 것만 채움.
var PART_KEYS = ['chest', 'shoulder', 'sleeve', 'length', 'waist', 'hip', 'thigh', 'rise', 'hem'];

var SCHEMA = {
  type: 'object',
  properties: {
    tableKind: { type: 'string', enum: ['garment', 'body_range', 'mixed', 'unknown'],
      description: 'garment=옷 실측표(단면/길이). body_range=신체 권장범위표(가슴둘레 74-78 같은 범위값·"사이즈 선택 범위"). 판정엔 garment만 유효.' },
    category: { type: 'string', enum: ['TOP', 'BOTTOM', 'unknown'] },
    unit: { type: 'string', enum: ['cm', 'in'], description: 'CM/IN 토글이 있으면 선택된 쪽. 기본 cm.' },
    columns: { type: 'array', items: { type: 'string' }, description: '표에 실제로 있던 부위(열)의 원본 이름들(예: 가슴단면, 어깨너비, 품, 흉위).' },
    sizes: {
      type: 'array',
      description: '보이는 모든 사이즈 행. 값은 표에 인쇄된 원본 숫자 그대로(단면/둘레 변환 금지, 반올림 금지).',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string', description: '사이즈 표기 그대로. 예: "M", "M(095)", "95", "32".' },
          values: {
            type: 'object',
            description: '우리 부위키→숫자. 표에 있는 부위만. 키 매핑: 가슴/품/흉위/가슴둘레→chest, 어깨/어깨너비/견폭→shoulder, 소매/소매길이/암장→sleeve, 총장/기장/전체길이/앞면길이→length, 허리→waist, 엉덩이/힙→hip, 허벅지→thigh, 밑위→rise, 밑단→hem.',
            properties: {
              chest: { type: 'number' }, shoulder: { type: 'number' }, sleeve: { type: 'number' }, length: { type: 'number' },
              waist: { type: 'number' }, hip: { type: 'number' }, thigh: { type: 'number' }, rise: { type: 'number' }, hem: { type: 'number' }
            },
            additionalProperties: false
          }
        },
        required: ['label', 'values']
      }
    },
    labeledCircumference: { type: 'array', items: { type: 'string' },
      description: '열 이름이 "둘레"라고 명시적으로 적힌 부위키만(예: 가슴둘레 열이면 ["chest"]). 애매하거나 "단면"이면 비움 — 최종 단면/둘레 판정은 서버가 값으로 함.' },
    truncated: { type: 'boolean', description: '탭·스크롤로 일부 사이즈가 가려져 안 보이면 true(예: XXS-S 탭만 활성이라 M~XL 안 보임).' },
    notes: { type: 'string', description: '전치된 표/각주 단위/판독 애매 등 특이사항 한 줄.' }
  },
  required: ['tableKind', 'category', 'unit', 'sizes']
};

var PROMPT =
  '이 이미지는 온라인 쇼핑몰의 옷 사이즈표입니다. emit_size_table 도구로 정확히 전사하세요.\n' +
  '규칙:\n' +
  '1) 값은 표에 인쇄된 원본 숫자 그대로. 단면↔둘레 변환·단위 변환·반올림 금지.\n' +
  '2) 브랜드마다 부위 이름이 다릅니다(품·흉위·가슴단면=모두 chest 등). 스키마의 매핑대로 우리 키로.\n' +
  '3) 표가 전치돼 있을 수 있음(행=부위, 열=사이즈). 그래도 사이즈별로 묶어 출력.\n' +
  '4) 제목이 "사이즈 선택 범위"거나 값이 범위(74-78)이고 허리·가슴둘레 같은 신체치수면 tableKind=body_range.\n' +
  '5) 탭(레귤러/롱, S/M/XL 그룹)으로 일부 사이즈가 가려져 있으면 보이는 것만 넣고 truncated=true.\n' +
  '6) CM/IN 토글이 보이면 선택된 단위를 unit에. 확실치 않으면 cm.\n' +
  '추측하지 말고 보이는 것만. 안 보이는 칸은 비웁니다.';

// 핵심: base64 이미지 → 구조화 JSON. 순수 함수(핸들러·테스트 공용).
async function parseSizeTable(b64, mediaType, opts) {
  opts = opts || {};
  var KEY = opts.apiKey || process.env.ANTHROPIC_API_KEY;
  if (!KEY) throw new Error('missing ANTHROPIC_API_KEY');
  if (!b64) throw new Error('missing image');

  var body = {
    model: opts.model || MODEL,
    max_tokens: 4096,
    tools: [{ name: 'emit_size_table', description: '사이즈표를 구조화해 제출', input_schema: SCHEMA }],
    tool_choice: { type: 'tool', name: 'emit_size_table' },
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/png', data: b64 } },
        { type: 'text', text: PROMPT }
      ]
    }]
  };

  var r = await fetchT('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify(body)
  }, MS.LLM);   // 비전 파싱은 수 초~수십 초 — Supabase 기본(6s)이 아닌 별도 상한
  if (!r.ok) { var t = await r.text(); throw new Error('anthropic ' + r.status + ': ' + t.slice(0, 400)); }
  var j = await r.json();
  var tool = (j.content || []).filter(function (c) { return c.type === 'tool_use' && c.name === 'emit_size_table'; })[0];
  if (!tool) throw new Error('no tool_use in response');
  return { parsed: tool.input, usage: j.usage || null, model: j.model || body.model };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'missing anthropic key' });
  var b = req.body || {};
  var img = b.image || '';
  // "data:image/png;base64,...." 접두 허용
  var m = /^data:(image\/[a-z+]+);base64,(.*)$/i.exec(img);
  var mediaType = b.mediaType, b64 = img;
  if (m) { mediaType = m[1]; b64 = m[2]; }
  if (!b64) return res.status(400).json({ error: 'missing image' });
  try {
    var out = await parseSizeTable(b64, mediaType, { model: b.model });
    return res.status(200).json(out);
  } catch (e) {
    return res.status(502).json({ error: 'parse failed', detail: String(e && e.message || e) });
  }
};

module.exports.parseSizeTable = parseSizeTable;
module.exports.PART_KEYS = PART_KEYS;
module.exports.SCHEMA = SCHEMA;
