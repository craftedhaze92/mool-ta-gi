# widgets

독립적으로 동작하는 UI 블록 (예: `portfolio-summary`, `holdings-table`).
그 자체로 의미 있는 화면 조각이며, 어느 페이지에 놓여도 동작해야 한다.

- **import 가능**: `features`, `entities`, `shared`
- **import 금지**: `views`, 다른 `widgets` 슬라이스
- 각 슬라이스는 `index.ts`로만 노출한다.
