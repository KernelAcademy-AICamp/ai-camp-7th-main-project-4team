# data — 엔진 데이터 소스 (파이프라인 지도)

> **이 폴더는 무엇?** 엔진이 쓰는 두 축의 **원천 데이터와 정규화 산출물**이 있습니다. 여기(`data/`)는 소스·스크립트, 런타임이 실제로 fetch하는 **파생 JSON은 `web/data/`** 에 있습니다. 엔진 규칙 설명은 [`../docs/6_사이즈엔진.md`](../docs/6_사이즈엔진.md).

## 두 축

| 축 | 무엇 | 소스 | → 파생물(런타임) |
|---|---|---|---|
| **B축 — 인체 시드** | 성별·키·몸무게로 몸을 추정하는 회귀·분포·체형 라벨 | `data/body/` (+ `build-bodyseed.py`) | `web/data/body-base-model·body-distribution·archetypes.json` |
| **A축 — 브랜드 실측** | 브랜드×핏×사이즈 옷 치수(garmentCm) | `data/brand/` | `web/data/garments.json` |

```
data/
  body/
    raw/*.xlsx        원본(사이즈코리아 8차). 공개데이터라 git 제외(.gitignore) — 아래 '출처'에서 재다운로드
    clean/*.csv       raw→정규화(cm) + 체형분류. git 추적. 분석/재생성 기반 (설명: body/clean/README.md)
    build-bodyseed.py B축 시드 빌더 (clean/*.csv → web/data 3종 JSON)
  brand/
    raw/*.csv         브랜드 사이즈표 수동 수집(긴팔·반팔). git 추적
    build-sizespec.py A축 시드 빌더 (raw csv → web/data/garments.json)
    *.json            보조 데이터(anchor-brands·brand-rankings·brands·fitlines)
→ web/data/*.json     엔진이 fetch하는 파생 산출물 (여기가 아니라 web/에 산다)
```

## 재생성

**A축(브랜드 garmentCm) — 재현 가능 ✅**
```bash
python3 data/brand/build-sizespec.py     # raw/*.csv → web/data/garments.json
```

**B축(인체 시드) — 재현 가능 ✅**
```bash
python3 data/body/build-bodyseed.py       # clean/*.csv → web/data 3종 JSON
```
- `body-base-model.json` = 성별별 부위 OLS 회귀(`부위 = a·키 + b·몸무게 + c·나이 + intercept`, r²·rmse·n 포함).
- `body-distribution.json` = 성별×부위 mean/sd/p5·p50·p95.
- `archetypes.json` = 표준체형 38 + 비만체형 32 = 70종 실측 라벨.
- 입력: `data/body/clean/통합_직접측정.csv`(6,106명) + `표준체형.csv` + `비만체형.csv`.
- **코호트**: 현재 산출물은 스크립트 상수 `COHORT='1-2차'`로 생성됨(어깨가쪽사이길이가 3차 미측정이라). 통합본 전체로 넓히면 표본↑ 대신 값이 달라진다 — 상수만 바꾸면 됨.
- 검증: 이 스크립트는 기존 체크인 3종을 **byte 단위로 재현**한다(archetypes의 체형명 공백 정규화 1건만 소스에 맞게 교정됨).

**raw xlsx → clean csv**: 이 변환 스크립트도 일회성이었다. clean CSV가 이미 git에 있으니 평소엔 불필요하고, 무손실 mm 원본이 필요할 때만 xlsx에서 재생성.

## 출처 · 표기 의무

- **인체 데이터**: 사이즈코리아 **제8차 인체치수조사(2020~2024)** / 국가기술표준원. **출처표기 의무.** raw xlsx는 공개데이터로 [사이즈코리아](https://sizekorea.kr)에서 재다운로드.
- **브랜드 데이터**: 각 브랜드 자사몰 사이즈표 수동 수집. 수집 시점·방식은 `build-sizespec.py`가 `provenance`로 함께 기록.

## 참고

- 한글 파일명(`통합_직접측정.csv` 등)을 씀 — 한국어 서비스라 유지하되, CI·도구가 인코딩을 지원하는지 확인.
- 데이터 계층 상세는 [`body/clean/README.md`](body/clean/README.md).
