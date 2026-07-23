# shared

도메인에 의존하지 않는 공통 코드. 어떤 레이어에서든 import할 수 있다.

| 세그먼트 | 역할 |
| --- | --- |
| `api/` | HTTP 클라이언트, React Query Provider·설정 |
| `config/` | 환경변수, 상수 |
| `lib/` | 순수 유틸 (`cn`, 포맷터 등) |
| `ui/` | Shadcn UI 컴포넌트 및 공통 프리미티브 |

- **import 가능**: `shared` 내부 (유일하게 동일 레이어 import가 허용되는 레이어)
- **import 금지**: 상위 레이어 전부 (`views`, `widgets`, `features`, `entities`)
- 예외적으로 하위 경로 직접 import를 허용한다: `import { Button } from '@/shared/ui/button'`
