# entities

도메인 모델 (예: `stock`, `holding`, `portfolio`).
타입, 스키마, 도메인 계산 로직(평단가 등), 해당 도메인 전용 표시 컴포넌트를 둔다.

- **import 가능**: `shared`
- **import 금지**: `views`, `widgets`, `features`, 다른 `entities` 슬라이스
- 각 슬라이스는 `index.ts`로만 노출한다.
