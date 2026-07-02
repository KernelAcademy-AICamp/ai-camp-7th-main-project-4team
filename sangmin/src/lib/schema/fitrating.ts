/**
 * 착용감 응답 어휘 (설문 선택지 ↔ 엔진 값).
 *
 * 규칙 ③(engine/rules/subjective)의 역산 입력이자 진단 설문의 선택지 원천.
 * 스키마 층에 두어 **엔진(규칙) · 데이터(WearExperience) · UI 설문**이 같은 어휘를 공유한다.
 */

/** ① 주 부위 착용감 4단계. 가장 쪼임 → 가장 헐렁. */
export type FitRating = "TIGHT" | "SNUG" | "RELAXED" | "BIG";

export const FIT_RATING_LABEL: Record<FitRating, string> = {
  TIGHT: "불편(쪼임)",
  SNUG: "딱맞음",
  RELAXED: "여유",
  BIG: "큼",
};

/** 설문 노출용 4지선다(쪼임→헐렁 순, UI 카피). value가 엔진 값. */
export const FIT_SCALE: ReadonlyArray<{ value: FitRating; label: string }> = [
  { value: "TIGHT", label: "끼임" },
  { value: "SNUG", label: "딱맞음" },
  { value: "RELAXED", label: "여유" },
  { value: "BIG", label: "큼" },
];

/**
 * ② 병목 플래그 판정(검열관측). 경계 추정을 위해 **최소 2값(음성 OK 포함)** —
 * 불평만 모으면 임계를 못 찾는다(A축 검열추정 §).
 */
export type PainVerdict = "TIGHT" | "OK";
export const PAIN_VERDICT_LABEL: Record<PainVerdict, string> = {
  TIGHT: "꼈어요",
  OK: "괜찮았어요",
};

/** ③ 기장 선호(체형 아님 — 취향·키). 핏 추천 출력에만 쓰고 역산엔 안 넣는다. */
export type LengthPref = "SHORT" | "GOOD" | "LONG";
export const LENGTH_PREF_LABEL: Record<LengthPref, string> = {
  SHORT: "짧음",
  GOOD: "딱 좋음",
  LONG: "긺",
};
