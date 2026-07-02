# _통합/app — 통합 프로토타입 (서비스 기반)

두 작업물을 하나로 합친 **딥그린 통합 프로토타입**. sohee 디자인을 기반으로, sangmin 엔진·진단 플로우를 이식해 나가는 substrate.

## 실행
결과 카드가 `data/bodytypes.json`을 `fetch`하므로 **로컬 서버로 열어야 함**(file:// 직접 열기는 CORS로 데이터 로드 실패).

```bash
cd _통합/app
python3 -m http.server 8000
# 브라우저: http://localhost:8000/         (4탭 앱)
#           http://localhost:8000/card.html?type=HRG&g=female  (결과 카드 단독)
```

## 구조
```
_통합/app/
  index.html            # 4탭 셸 (홈·체형진단·쇼퍼찾기·마이) — sohee 핏팅_전체화면 재스킨
  card.html             # 결과 카드 (8유형, 다크+포인트색 예외) — JSON 단일출처 렌더
  tokens.css            # 디자인 토큰 (딥그린) — _통합/tokens.css 사본
  data/
    bodytypes.json      # ★ 8유형 마스터 데이터 단일 출처 (원본: sohee 진단카드_8유형.json)
  js/                   # (예정) 공용 스크립트
```

## 통합 상태
- ✅ **sohee 디자인 기반**: 4탭 셸·결과카드·마이·전문가 화면을 딥그린 토큰으로 재스킨.
- ✅ **8유형 데이터 단일출처**: `data/bodytypes.json` 하나에서 렌더(하드코딩 `T` 객체 제거).
- ⏳ **sangmin 이식 대기(⑤⑥)**: 진단 입력 내용(착용경험 스키마)·엔진 계산·엔진 데이터 주입.
- ⏳ **8유형↔엔진 매핑(Phase C 전)**: 엔진 upper×lower 역산 결과 → 8유형 `code` 매핑 테이블.

## 규칙
- 색·폰트는 `tokens.css` 변수만 참조. 블루는 폐기(→딥그린). 측정 수치는 `.num`(SUIT).
- **결과 카드는 예외**: 다크 배경 + 8유형 포인트색. 딥그린 토큰 적용 안 함.
- 8유형 표현(이름·색·프로필·핏·궁합·실루엣)은 오직 `data/bodytypes.json`에서. 화면 코드에 재기입 금지.

## 다음
- ⑤ sangmin 작업물 모듈화 → ⑥ 서비스 기반에 이식(진단 입력·엔진 연결).
- 상세: `_통합/통합-설계정리.md`, `_통합/구조화-sohee.md`.
</content>
