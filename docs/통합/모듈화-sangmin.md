# sangmin 작업물 모듈화 — 엔진 계약 중심

> Phase A ⑤: sangmin 자산을 확정 뼈대에 맞춰 **이식 가능한 모듈**로 분해.
> 대원칙(`서비스구조-뼈대.md §6`): **엔진(schema/rules)을 고정 계약으로 두고** UI가 거기 붙는다. 셸에 맞춰 엔진을 깎지 않는다.
> substrate=HTML 프로토타입이라 **엔진 계산은 목업 어댑터**로 채우고(계약은 동일), 실제 엔진 연결은 Next.js(Phase D).

---

## 0. 모듈 지도

```
[M1 진단입력]  ──WearExperience[]──▶  [M2 엔진계약]  ──체형카드+recs──▶  [M4 결과주입]
 (설문·위저드)                         (compute)                          (sohee 화면에)
      ▲                                  │ 목업↔실엔진 교체점                    │
 BasicInfo·선호핏                   [M3 엔진데이터]                      [M5 피드백로그]
                                    (brand·body seed)                    (킬메트릭)
```

| 모듈 | 정본 소스(sangmin) | 프로토타입(⑥) | 실제(Next.js/Phase D) |
|---|---|---|---|
| **M1 진단 입력 플로우** | `schema/wearexperience.ts` + `04-fit-experience.html` | sohee 위저드 셸에 이식(딥그린) | 동일 로직 React화 |
| **M2 엔진 계약(compute)** | `src/lib/engine/rules/*` + `reverse-inference.md` | **목업 어댑터**(계약 충족) | 실 엔진(rules+역산 §1~8) |
| **M3 엔진 데이터** | `data/brand/*` · `data/body/derived/*` | 목업 recs 값 | 실 시드(garmentCm 채움) |
| **M4 결과 주입** | `06-result.html`(로직) + `reverse-inference §3~7` | 엔진출력→sohee 결과화면 | 동일 |
| **M5 피드백 로그** | `07-feedback.html` | localStorage 목업 | API 저장 |

---

## 1. M1 — 진단 입력 플로우 (착용경험 설문·위저드)

sohee 위저드 셸의 `TODO(⑤⑥)` 자리에 들어갈 **내용 모듈**. 스키마와 1:1이 정본.

**계약(입력 생성):**
```ts
// schema/wearexperience.ts (그대로 이식)
buildCategorySurvey(category, { sleeveType?, legLength? }) → SurveyGroup[]
//  SurveyGroup.layer = "fit" | "pain" | "length" | "open"   (4층)
//    ① fit   = accuracyParts(category)  → FIT_SCALE (큼/여유/딱맞음/끼임)
//    ② pain  = painFlags(category)      → TIGHT/OK (민소매→팔 skip, 반바지→종아리 skip)
//    ③ length= lengthParts(category)    → SHORT/GOOD/LONG (반팔→소매 취향 skip)
//    ④ open  = 자유서술 1행 (항상 유지)
// UI는 이 SurveyGroup[]을 렌더만. 부위 하드코딩 금지(카테고리 파생).
사용자 응답 → WearExperience[] (category·brandId·fitLine·sizeLabel·sleeveType?·legLength?·fits·painFlags?·lengthPrefs?·openNote?)
```

**위저드 구조(04에서 이식):** 카테고리 선택 → 카테고리별 선호핏 → 옷1 정보 → 옷1 느낌 → 입력점검 → 옷2…(최대 3벌). facet 조건화(민소매/반바지), 0벌 건너뛰기, "목록에 없음" 대안입력.

**카테고리 게이팅(결정: 상의+하의 기반):**
- 기반 = **상의·하의 둘 다 작동**. 둘 다 완료해야 `completeness{upper,lower}=true` → 체형카드 완성.
- 파생(아우터·원피스·치마) = 선호핏만(30초), 기반 완료 시 해금. 상의만 완료=상체 부분(아우터만 부분 해금).
- ⚠️ 현재 04 프로토타입·엔진은 상의 위주 → **하의 설문(허리·엉덩이·허벅지·밑위·기장)·하의 `EASE_BANDS` 정식화** 필요(현재 "미검증 목업").

## 2. M2 — 엔진 계약 (compute) · 고정 계약

**계약 = 이 시그니처. 목업이든 실엔진이든 이걸 충족한다.**
```ts
diagnose(input: {
  basic: { gender, age, heightCm, weightKg },
  prefs: Partial<Record<Category, FitLine>>,   // 카테고리별 선호핏
  experiences: WearExperience[],
}): {
  card: BodyTypeCard,     // reverse-inference §3 (upper/lower/completeness/character)
  recs: SizeRec[],        // §4~5 (brand·category·size·confidence·병목·경고[])
  confidenceTier: "low"|"mid"|"high",  // 0벌/1벌/2+벌
}
```
- **수치·판정 = 규칙(결정론)**, `character` 한 줄만 LLM (원칙 2). 목업도 이 분리를 흉내.
- 현 실엔진 성숙도: `convert/ease/subjective` 왕복 **동작**. 역산 파이프라인 §1~8은 **문서 설계만·미구현** → 실연결은 Phase D.
- **프로토타입 목업 어댑터**: 위 시그니처로 canned `card`(예: HRG upper/lower)·`recs`(브랜드별 사이즈)·`confidenceTier`를 반환. UI가 실엔진과 동일하게 호출 → 나중에 어댑터만 교체.
- 원칙: **UI는 이 계약만 안다.** 엔진 내부(EASE_BANDS·δ 튜닝)를 UI가 참조하지 않음.

## 3. M3 — 엔진 데이터 (seed)
- brand: `brands`(28) · `fitlines`(495줄 핏 사전) · `anchor-brands`(7) · `brand-rankings`.
- body: `body-base-model`(회귀 prior) · `body-distribution` · `archetypes`(nearest-archetype 라벨).
- ⚠️ **갭: `SizeSpec.garmentCm`(브랜드 부위 실측 cm) 비어있음** → recs 실계산 불가. 프로토타입=목업 recs, 실계산 전 유니클로 상의부터 수집.

## 4. M4 — 결과 주입 (엔진출력 → sohee 결과화면)
엔진 `{card, recs, confidenceTier}` → sohee 결과화면 컴포넌트에 매핑:
| 엔진 출력 | sohee UI |
|---|---|
| `card.upper × card.lower` | **→ 8유형 `code`**(⚠️ Phase C 전 매핑 테이블, 뼈대 §6) → `card.html?type=CODE&g=gender` |
| `recs[]`(brand·size·병목·경고) | 브랜드별 추천 사이즈표(값=`.num` SUIT) + 경고 문구 |
| `confidenceTier` | 신뢰도 배너(0벌 저/1벌 보통/2+ 없음) |
| `card.upper/lower` 수치 | (06-result의) 4축 스펙트럼 막대 |
| `completeness` | 진단현황(옷장)·파생 해금 표시 |
- **부분 카드**: 상의만 완료 시 8유형 미확정 → "상체 부분" 표현 규칙 필요(Phase C 매핑과 함께).

## 5. M5 — 피드백 로그 (킬메트릭)
`07-feedback`: "실제 내 사이즈와 맞나?"(맞음/애매/틀림) + "안 사본 브랜드도 사보겠다?"(의향) + 자유.
```ts
FeedbackLog { cardId, verdict:"맞음"|"애매"|"틀림", crossBrandIntent:bool, note? }
```
- 프로토타입=localStorage 적재(측정 시늉), 실제=API. **처음부터 심는다(원칙 3)** — 결과화면에 항상 붙음. 킬메트릭 ≥65% 원천.

## 6. 진단 스냅샷 (시점 버저닝, 원칙 7)
개별 WearExperience엔 시점 안 태그(최근 옷 유도). **스냅샷 레벨**에 `effective_date`·`weight_version` 태그. 재진단=덮어쓰기 금지, 새 버전 append. 카드 재사용은 체중 불변일 때만. → M2 출력 `card`가 이미 이 필드 포함.

---

## 7. ⑥(이식)에서 할 일 — 이 모듈화의 실행
1. **M1** 04 위저드 내용을 sohee 위저드 셸(`index.html` TODO)에 딥그린으로 이식. `buildCategorySurvey` 로직을 프로토타입용 JS로 포팅(부위 하드코딩 금지).
2. **M2 목업 어댑터** `js/engine-mock.js` 작성 — `diagnose()` 계약 충족(canned card/recs/tier). UI는 이것만 호출.
3. **M4** 엔진출력을 결과화면(card iframe·사이즈표·신뢰도배너)에 주입. 8유형 매핑은 임시 스텁 → Phase C에서 정식 테이블.
4. **M5** 피드백 위젯을 localStorage 로깅과 연결.
5. **M3** 목업 recs 값 채움(유니클로 상의 등 예시). 실 seed·garmentCm은 Phase D.
6. 하의 설문·엔진(EASE_BANDS) 정식화는 별도 작업(기반 상의+하의 결정의 파급).
</content>
