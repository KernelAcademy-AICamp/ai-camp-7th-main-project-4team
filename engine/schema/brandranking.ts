/**
 * 카테고리별 브랜드 순위 시드 (data/brand/brand-rankings.json).
 *
 * 역할: '기본 아이템 판매량' 대리지표(build.md §4-1). 판매량은 비공개라 시장 통념 기반 순위로 대체하고,
 * 대표상품 선정·수집 우선순위에만 쓴다(추천 수치 근거 아님 → isProxy).
 *
 * 메모:
 *  - 카테고리 1급 축(§6). 한 브랜드가 여러 카테고리에 다른 순위로 등장한다(유니클로=전 카테고리).
 *  - sizeChartStandardized(◎): 실측표 공개·표준화 브랜드 → 엔진 역산 검증에 유리(시드 착수 우선).
 *  - brandId가 null이면 미해결(brands.json에 없음, fitlines.json#unresolved). 순위는 보존하되 엔티티는 없음.
 */

import type { Category } from "./category.js";

export interface RankedBrand {
  rank: number;
  /** brands.json의 Brand.id. 미해결이면 null. */
  brandId: string | null;
  name: string;
  /** ◎ 실측표 공개·표준화 여부(있을 때만 true). */
  sizeChartStandardized?: boolean;
  note?: string;
}

export type CategoryRanking = Partial<Record<Category, RankedBrand[]>>;

export interface BrandRankingSeed {
  $meta: Record<string, unknown>;
  rankings: CategoryRanking;
}
