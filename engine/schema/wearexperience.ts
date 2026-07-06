/**
 * 착용경험 1건 — 진단 설문의 응답 레코드(입력 축).
 *
 * 4층 구조:
 *   ① 주 부위 착용감(fits)      — 둘레·너비 → 체형 역산 신호
 *   ② 병목 플래그(painFlags)    — 미표기 ∩ 페인. B역산 안 함, A(브랜드 실측) 검열추정 전용
 *   ③ 기장 선호(lengthPrefs)    — 길이축. 체형 아닌 취향·키 → 핏 추천 출력에만
 *   ④ 개방 인테이크(openNote)   — 예측 못 한 페인 자유서술 → 반복되면 ②로 승격(성장형)
 *
 * 시점·체중은 이 레코드가 아니라 **진단 스냅샷 레벨**에 태그한다(규칙 7: 현재 자동, append-only).
 * 최근 옷으로 유도하므로 per-item 시점은 묻지 않는다.
 */

import type { Category } from "./category.js";
import type { FitLine } from "./sizespec.js";
import type { FitRating, PainVerdict, LengthPref } from "./fitrating.js";
import { accuracyParts, lengthParts, painFlags } from "./category.js";
import {
  FIT_SCALE,
  PAIN_VERDICT_LABEL,
  LENGTH_PREF_LABEL,
} from "./fitrating.js";

/**
 * 소매 길이 facet(TOP·OUTER·DRESS). **긴팔이 기본·권장** — 긴팔 한 벌이 팔둘레(팔 끼임)·
 * 팔길이(소매)까지 담아 신호가 최대이고, 팔 경험을 늘 같은 접점(이두·전완)에서 받아
 * **브랜드 경향성이 오염되지 않는다**(반팔=상완과 섞이면 뒤죽박죽). short/sleeveless는 예외:
 *   long=팔 flag+소매 취향 / short=팔 flag만(소매 취향은 손목 기준 없어 스킵) / sleeveless=둘 다 스킵.
 * 옷 특정은 품목이 하고(반팔 티≠긴팔 셔츠), facet은 **질문 조건화 + 신호 완성도**용. ① 체형 역산엔 무관.
 */
export type SleeveType = "long" | "short" | "sleeveless";

/**
 * 하의 길이 facet(BOTTOM) — 소매의 대칭. **긴바지가 기본·권장**(종아리·기장까지 담음).
 *   long=종아리 flag 유지 / short(반바지)=종아리 flag 제거. 단 기장 취향은 둘 다 유지
 *   (하의 기장은 밑단 기준이 항상 있어, 소매 기장이 반팔에서 무의미했던 것과 다르다).
 */
export type LegLength = "long" | "short";

export interface WearExperience {
  /** 조회 키: 어떤 옷인지 특정 → SizeSpec(garmentCm) 조회. */
  category: Category;
  brandId: string;
  fitLine: FitLine;
  sizeLabel: string;
  /** 소매 있는 카테고리에서만. 긴팔 권장(신호 최대·경향성 오염 방지). ②③ 조건화, ①엔 무관. */
  sleeveType?: SleeveType;
  /** 하의에서만. 긴바지 권장. 반바지면 종아리 flag 제거. ①엔 무관. */
  legLength?: LegLength;

  /** ① partKey(accuracyParts) → 착용감 등급. 지금 역산되는 체형 신호(브랜드 실측 있음). */
  fits: Partial<Record<string, FitRating>>;
  /**
   * ② flagKey(PAIN_FLAGS) → 판정. 체형(팔둘레·목둘레)이나 **브랜드가 실측을 안 적어**
   * 지금은 역산 대신 **브랜드 경향성에 축적**(A축 검열추정). 데이터 쌓이면 정식 부위로 승격.
   */
  painFlags?: Partial<Record<string, PainVerdict>>;
  /** ③ partKey(lengthParts) → 기장 취향. 세로 체형이나 키로 대부분 커버 → 추천 보조. */
  lengthPrefs?: Partial<Record<string, LengthPref>>;
  /** ④ 개방 인테이크 — 자유서술. 승격 대기 큐. */
  openNote?: string;
}

/* ─── 설문(질문·선택지) 코드화 — UI는 이 서술을 렌더링한다 ─── */

export type SurveyLayer = "fit" | "pain" | "length" | "open";

export interface SurveyRow {
  key: string;
  label: string;
  /** open 층은 선택지 없음(자유입력). */
  options?: ReadonlyArray<{ value: string; label: string }>;
  /** 기본 선택 value(없으면 미선택). */
  default?: string;
}

export interface SurveyGroup {
  layer: SurveyLayer;
  title: string;
  help: string;
  rows: SurveyRow[];
}

const PAIN_OPTIONS = [
  { value: "TIGHT", label: PAIN_VERDICT_LABEL.TIGHT },
  { value: "OK", label: PAIN_VERDICT_LABEL.OK },
] as const;

const LENGTH_OPTIONS = [
  { value: "SHORT", label: LENGTH_PREF_LABEL.SHORT },
  { value: "GOOD", label: LENGTH_PREF_LABEL.GOOD },
  { value: "LONG", label: LENGTH_PREF_LABEL.LONG },
] as const;

/**
 * 카테고리 → 설문 그룹. 부위 집합은 카테고리 파생이라 하드코딩하지 않는다(규칙 6):
 * ① = accuracyParts(길이 제외), ③ = lengthParts, ② = PAIN_FLAGS 레지스트리.
 */
export function buildCategorySurvey(
  category: Category,
  opts: { sleeveType?: SleeveType; legLength?: LegLength } = {},
): SurveyGroup[] {
  const { sleeveType, legLength } = opts;
  const groups: SurveyGroup[] = [
    {
      layer: "fit",
      title: "착용감 · 부위별",
      help: "한 부위씩 떠오르는 느낌 하나",
      rows: accuracyParts(category).map((p) => ({
        key: p.key,
        label: p.label,
        options: FIT_SCALE.map((o) => ({ value: o.value, label: o.label })),
        default: "SNUG",
      })),
    },
    {
      layer: "pain",
      title: "혹시 걸린 곳",
      help: "없으면 괜찮았어요 — 이 신호가 브랜드 치수를 채워요",
      // ② 민소매면 팔 flag / 반바지면 종아리 flag 스킵(그 부위를 안 감쌈). 나머지 유지.
      rows: painFlags(category)
        .filter((f) => !(f.key === "arm" && sleeveType === "sleeveless"))
        .filter((f) => !(f.key === "calf" && legLength === "short"))
        .map((f) => ({
          key: f.key,
          label: f.label,
          options: PAIN_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
          default: "OK",
        })),
    },
    {
      layer: "length",
      title: "기장",
      help: "취향 · 선택",
      // ③ 소매 기장 취향은 긴팔에서만 의미. 반팔·민소매면 소매 행 제거.
      rows: lengthParts(category)
        .filter((p) => !(p.key === "sleeve" && sleeveType !== undefined && sleeveType !== "long"))
        .map((p) => ({
          key: p.key,
          label: p.label,
          options: LENGTH_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
          default: "GOOD",
        })),
    },
    {
      layer: "open",
      title: "그 외",
      help: "선택 · 자유롭게",
      rows: [{ key: "openNote", label: "그 외 걸린 곳" }],
    },
  ];
  // 빈 그룹(예: 병목 없는 카테고리) 제거 — open은 항상 유지.
  return groups.filter((g) => g.layer === "open" || g.rows.length > 0);
}
