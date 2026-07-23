# views

페이지 조립 레이어 (FSD의 `pages`. Next.js `app/`과 충돌 방지를 위해 `views`로 명명).
라우트 하나에 대응하는 화면을 widgets/features/entities를 조합해 완성한다.

- **import 가능**: `widgets`, `features`, `entities`, `shared`
- **import 금지**: 다른 `views` 슬라이스
- 각 슬라이스는 `index.ts`로만 노출한다.
