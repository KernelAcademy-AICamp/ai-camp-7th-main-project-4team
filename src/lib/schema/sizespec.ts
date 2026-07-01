/**
 * A축: 브랜드 실측 데이터 스키마 (build.md Phase1(A)·§4).
 *  - 형태: 브랜드 × 카테고리 × 핏라인 × 사이즈 × 부위별 실측치(cm).
 *  - 모든 실측치에 출처·수집시점·신뢰도 메타(§7-3): 브랜드는 시즌마다 실측을 바꾸므로
 *    시점 메타 없으면 낡은 데이터로 오추천.
 *  - 판매량은 비공개 → 대리지표(리뷰 수·별점·인기순)로 프록시. 스키마에 '프록시'임을 명시(§7-1).
 */

import type { Category } from "./category.js";

/** 핏라인. 정체는 곧 '여유값'(§7-0) — 슬림/레귤러/루즈의 차이가 ease 차이다. */
export type FitLine = "skinny" | "slim" | "regular" | "loose" | "oversize";

export interface Brand {
  id: string;
  name: string;
  /** 추천용 메타(§7-1): 컨셉·타겟. 분석 단계에서 '이 핏은 이 체형' 경향성에 쓰임. */
  concept?: string;
  target?: string;
  /** 1차 출처 = 자사몰. 크롤링 안전·정확(§7-3). */
  officialMallUrl?: string;
}

/** 출처·시점·신뢰도 메타. 모든 적재 실측치에 동반(§7-3). */
export interface Provenance {
  /** 실측치를 끌어온 정확한 URL(사이즈표 페이지/이미지). */
  sourceUrl: string;
  /** 수집 시점(ISO). 시즌 변동 추적용. Phase 0에선 수동 입력. */
  collectedAt: string;
  /** 추출 방식 — 검수 우선순위/신뢰도에 영향. OCR은 육안 검수 필수(§7-2 validate). */
  method: "manual" | "html" | "ocr";
  /**
   * 신뢰도 0~1. 수동/HTML 고신뢰, OCR 미검수는 저신뢰.
   * validate 통과 시 상향. store는 신뢰도·시점 동반 적재(§7-2).
   */
  confidence: number;
  /**
   * 이 레코드가 '대표상품 선정' 등에서 프록시 지표에 의존했는지 표시(§7-1 ⚠).
   * 예: 판매량 대신 리뷰 수·인기순으로 대표상품을 골랐다 → true.
   */
  isProxy?: boolean;
  proxyNote?: string;
}

/**
 * 한 (브랜드·카테고리·핏·사이즈)의 부위별 의류 실측치.
 * 값은 브랜드 사이즈표에 적힌 '의류 치수'(단면/길이) 그대로 저장한다(원본 보존).
 * 인체 둘레 환산·여유 계산은 규칙 모듈(engine/rules)이 조회 시점에 수행 — 원본을 가공해 박지 않는다.
 */
export interface SizeSpec {
  brandId: string;
  category: Category;
  fitLine: FitLine;
  /** 브랜드 표기 사이즈 라벨 (예: "M", "095", "L"). */
  sizeLabel: string;
  /**
   * 부위 key → 의류 실측치(cm). key는 CATEGORY_PARTS[category]의 part.key.
   * circumference 부위는 '단면(flat)' 값이 일반적 — 규칙 모듈이 ×2 환산.
   */
  garmentCm: Record<string, number>;
  provenance: Provenance;
  /** 대표상품 추적용(선택) — 어떤 상품의 사이즈표에서 왔는지. */
  productRef?: { name: string; productUrl?: string };
}
