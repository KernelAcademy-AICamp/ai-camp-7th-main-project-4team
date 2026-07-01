# 수집 엔진 — 규칙·스키마 (Phase 0)

사이즈 번역 엔진의 **A축(브랜드 실측)** 토대. 빌드플랜 Phase 1의 "스키마 + 변환규칙"에 해당.
지금 단계는 **규칙·스키마만** — 수집/정규화 코드(collect·extract·normalize…)는 다음 턴.

## 구조

```
schema/
  category.ts   카테고리·부위 모델. 부위마다 둘레/너비/길이 성격(comparison)을 박음.
                상의(TOP)만 작동, 5종 모두 표현(잠금 금지). ACTIVE_CATEGORIES=['TOP'].
  sizespec.ts   A축: Brand·FitLine·SizeSpec(부위별 의류 실측 cm) + 출처·시점·신뢰도 메타.
                원본(단면/길이) 그대로 저장 — 환산·여유는 조회 시 규칙이 수행.
engine/rules/   build.md §4-0 핵심 규칙(이게 없으면 수집해도 비교 불가)
  convert.ts    ① 인체↔의류 변환. 둘레는 단면×2, 너비/길이는 그대로.
  ease.ts       ② 여유(ease)=의류환산−인체. 역산용 bodyFromEase 포함.
  subjective.ts ③ 주관(큼/여유/딱맞음/불편)↔cm. 키=(category,part) — 부위마다 폭이 다름. 가설값.
  demo.ts       착용경험→인체 역산→다른 사이즈 투영 왕복 스모크. `npm run demo`.
```

## 실행

```
npm install
npm run check   # 타입체크
npm run demo    # 규칙 왕복 데모
```

## 다음

1. 유니클로 상의 사이즈표를 SizeSpec 시드(JSON)로 수동 입력 (1브랜드 수직 관통, build.md §4-4).
2. collect/extract/normalize/validate/store 스테이지 추가(브랜드별 어댑터 + 공통 정규화).
3. 가설값(EASE_BANDS) 보정 — FeedbackLog 연결 후 킬 메트릭으로 판정.
