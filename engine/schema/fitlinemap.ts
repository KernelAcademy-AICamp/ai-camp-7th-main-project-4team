/**
 * 핏라인 매핑 카탈로그 스키마 (data/brand/fitlines.json).
 *
 * 역할: 브랜드 × 카테고리별 핏/실루엣의 '원본 명칭'(brandNative)을 정규화 FitLine으로 잇는 사전.
 * A축 실측(SizeSpec.fitLine)을 채울 때 이 카탈로그로 brandNative → FitLine을 해석한다.
 *
 * 설계 메모(수집 2026-06-30, build.md Phase1(A)·§4):
 *  - 핏라인의 정체는 곧 '여유값'(ease.ts) — normalized(-2..2)는 그 여유 경향의 서열일 뿐,
 *    실제 cm 여유는 실측(SizeSpec.garmentCm) 결합 후에 확정한다. 여기엔 cm을 넣지 않는다.
 *  - ★ 이름 ≠ 여유: 폴로 'Classic Fit'은 명칭과 달리 브랜드 내 가장 넉넉(loose). normalized는
 *    명칭이 아니라 실측 여유로 잡아야 하므로 매핑엔 사람 검수(confidence)가 동반된다.
 *  - 치마/원피스는 핏라인이 아니라 실루엣. fitLine은 여유경향 근사치이고 silhouette이 1차 정보.
 *    wrap/shirt/tweed처럼 여밈·디자인 유형은 정규화 보류(fitLine=null, designType=true).
 *  - 시즌: 핏 명칭은 거의 perennial. 시즌성은 핏이 아니라 소재/발매버전/코드접두에 있다(§7-3 시점 메타).
 */

import type { Category } from "./category.js";
import type { FitLine } from "./sizespec.js";

/** 정규화 서열: 여유 경향의 순서값. FitLine enum과 1:1 (skinny -2 … oversize +2). */
export type NormalizedRank = -2 | -1 | 0 | 1 | 2 | null;

/** 핏 토큰이 브랜드 데이터에 '어떻게 붙는가' — 수집 파이프라인 분기 키. */
export type AttachMode =
  | "filterUrl" // 공식 필터/카테고리 URL 슬러그 (수집 최용이)
  | "category" // 사이트 1급 카테고리
  | "productName" // 상품명 문자열에 토큰이 박힘 (정규식 파싱)
  | "sku" // 핏이 별도 상품(SKU)으로 갈림
  | "modelNumber"; // 모델 번호가 곧 핏라인 (리바이스/디키즈)

/** 핏 명칭의 시즌 성격. 핏 자체는 상시이며 시즌은 부수 태그에 있다는 구분. */
export type FitSeason =
  | "perennial" // 시즌 무관 상시 표준 어휘 (대다수)
  | "material" // 소재 태그가 시즌성 (쿨=여름 등). 핏은 상시
  | "versioned" // 동일 핏을 발매 버전 태그로 재출시 ([23FW ver.] 등)
  | "code-prefix"; // 상품코드 접두가 시즌 (PR2/PS2/PQ2 등)

/** 한 (브랜드·카테고리)의 핏/실루엣 한 종. */
export interface FitLineEntry {
  /** 브랜드 표기 원본 명칭 그대로 (예: "오버사이즈", "511 Slim", "Classic Fit"). 원본 보존. */
  brandNative: string;
  /** 정규화 FitLine. 정규화 보류(여밈/디자인유형)면 null. */
  fitLine: FitLine | null;
  /** 여유 경향 서열(-2..2). fitLine과 동반 이동, 보류면 null. */
  normalized: NormalizedRank;
  /** 치마/원피스 1차 정보. 실루엣 토큰(a-line/h-line/pencil/flare/mermaid/bodycon/shift/...). */
  silhouette?: string;
  /** true면 실루엣이 아니라 디자인 유형(wrap/shirt/tweed) → 정규화 보류 표시. */
  designType?: boolean;
  attachMode: AttachMode;
  season: FitSeason;
  /** 0~1. 0.9=공식 필터/핏가이드 · 0.8=공식 상품명 · 0.7=입점몰 · 0.5=리세일. (Provenance.confidence와 동의어) */
  confidence: number;
  /** 적용 옷 종류(있으면). 예: ["티셔츠","셔츠"]. */
  applies?: string[];
  note?: string;
  /** 확인 출처 URL(축약 가능). */
  source: string;
}

export interface FitLineBrand {
  id: string;
  name: string;
  /** 전반적으로 저신뢰(공식 수집 막힘)면 표시 — 시드 승격 전 사람 재수집 필요. */
  lowConfidence?: boolean;
  /** 카테고리 → 핏 엔트리 목록. 부분 카테고리만 있을 수 있다. */
  fits: Partial<Record<Category, FitLineEntry[]>>;
  /** 미수집/한계 메모(있으면). */
  gap?: string;
}

/** 브랜드 식별 실패 등으로 카탈로그에 못 올린 항목(정직 보존). */
export interface UnresolvedBrand {
  id: string;
  name: string;
  categories: Category[];
  reason: string;
}

export interface FitLineCatalog {
  $meta: Record<string, unknown>;
  brands: FitLineBrand[];
  unresolved: UnresolvedBrand[];
}

/** normalized 서열 → FitLine enum (둘은 동기). 보류면 null. */
export const RANK_TO_FITLINE: Record<Exclude<NormalizedRank, null>, FitLine> = {
  [-2]: "skinny",
  [-1]: "slim",
  0: "regular",
  1: "loose",
  2: "oversize",
};
