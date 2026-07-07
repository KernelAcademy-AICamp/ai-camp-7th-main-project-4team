/**
 * Anchor 축: 착용경험 질문 기본 브랜드 (data/brand/anchor-brands.json).
 *
 * 역할: 사용자의 '평소 입던 옷' 핏 진술을 받을 **입력(기준점) 브랜드 축**(build.md Phase1(B), CLAUDE.md 진단 입력).
 *   실측 없이도 착용경험을 만드는 가장 넓은 깔때기 = 오프라인 시착. 그래서 선정 최상위 게이트는
 *   '오프라인 매장 시착 편의'다(온라인 실측 제공은 anchor 자격이 아니라 엔진 수집 편의 스코어로 강등).
 *
 * 메모:
 *  - 입력 축 ≠ 추천 카탈로그. 이 7종은 착용경험 *입력*이지, 진단 다음 단계의 추천 브랜드/핏/사이즈
 *    *출력* 목록이 아니다(그쪽은 brands.json A축 카탈로그가 방대하게 담당). 혼동 금지.
 *  - brandId는 brands.json(Brand.id)을 참조한다 — 엔티티 중복 금지(brand-rankings.json과 동일 패턴).
 *  - offlineFitting(게이트)과 sizeStandard(번역 품질 스코어)는 다른 축이다. 자라/H&M은 시착 편의는
 *    통과하나 유럽핏이라 사이즈 편차가 커 translationVariance로 플래그(입력 자격은 주되 역산 신뢰도 하향).
 */

/** 오프라인 시착 편의(선정 게이트). high=전국 매장 밀도 높음, mid=제한적/온라인 중심. */
export type OfflineFitting = "high" | "mid";

export interface AnchorBrand {
  /** brands.json의 Brand.id 참조. */
  brandId: string;
  name: string;
  /** 선정 최상위 게이트: 오프라인 매장 시착 편의. */
  offlineFitting: OfflineFitting;
  /** 사이즈 표준성(게이트 아님, 번역 품질 스코어). low면 역산 편차 큼. */
  sizeStandard: "high" | "low";
  /** 유럽핏 등으로 사이즈가 튀어 '번역 편차 큼'인 경우 true(자라·H&M). */
  translationVariance?: boolean;
  /** 실측표가 깨끗해 엔진 역산 검증(부트스트랩) 1차 배치에 유리하면 true. */
  engineBootstrap?: boolean;
  note?: string;
}

export interface AnchorBrandSeed {
  $meta: Record<string, unknown>;
  /** 선정 게이트·스코어 기준을 문서화(정성). */
  criteria: Record<string, unknown>;
  anchors: AnchorBrand[];
}
