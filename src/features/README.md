# features

사용자 행동 단위 (예: `add-holding`, `simulate-averaging`).
"사용자가 무엇을 할 수 있는가"에 대응하는 상호작용을 담는다.

- **import 가능**: `entities`, `shared`
- **import 금지**: `views`, `widgets`, 다른 `features` 슬라이스
- 각 슬라이스는 `index.ts`로만 노출한다.
