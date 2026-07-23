# CLAUDE.md

이 파일은 Claude Code가 이 저장소에서 작업할 때 따라야 할 규칙을 정의한다.

## 프로젝트 개요

**mool-ta-gi (물타기)** — 국내 주식 포트폴리오 트래커 + 물타기 시뮬레이터.

"물타기"는 보유 종목의 주가가 하락했을 때 추가 매수로 평균 단가를 낮추는 투자 은어다
(영어로는 Averaging Down). 이 앱의 목적은 감이 아니라 계산에 근거해 물타기 시나리오를
시뮬레이션하고, 포트폴리오 전체를 한눈에 관리하는 것이다.

## 기술 스택 (고정 — 변경 금지)

| 영역            | 선택                                            |
| --------------- | ----------------------------------------------- |
| 프레임워크      | Next.js (App Router)                            |
| 언어            | TypeScript (`strict: true`)                     |
| 패키지 매니저   | **pnpm 전용** (npm / yarn 사용 금지)            |
| 서버 상태       | TanStack React-Query v5                         |
| 클라이언트 상태 | Zustand (persist 미들웨어)                      |
| UI              | Shadcn UI + TailwindCSS                         |
| 폼 / 검증       | react-hook-form + zod                           |
| 차트            | recharts                                        |
| 테스트          | Vitest + React Testing Library                  |
| 린트            | ESLint 9 Flat Config + eslint-plugin-boundaries |
| 포맷터          | Prettier                                        |

새로운 라이브러리를 도입할 때는 위 스택으로 해결되지 않는지 먼저 확인한다.

### Shadcn UI 설정 (components.json)

- 베이스: **Radix UI**, 프리셋 `nova`(style `radix-nova`), 아이콘 `lucide`
- base color `neutral`, CSS variables 사용, 다크모드는 `next-themes`(`attribute="class"`)
- 컴포넌트 추가: `pnpm dlx shadcn@latest add <component>` → `src/shared/ui/`에 생성된다
- 생성된 컴포넌트가 `createContext` 등 클라이언트 API를 쓰면 파일 맨 위에 `'use client'`를 붙인다
  (예: `src/shared/ui/button.tsx`). 붙이지 않으면 `next build`의 page data 수집 단계에서 실패한다.

## 아키텍처: FSD (Feature-Sliced Design) 경량 5레이어

Next.js의 `app/` 디렉토리는 **라우팅 전용 얇은 껍데기**다. 실제 코드는 전부 `src/` 아래
FSD 구조에 둔다. `app/page.tsx`는 `src/views/*`를 import해서 렌더하는 것 외의 로직을
가지지 않는다.

```
app/          Next.js 라우팅 껍데기 (로직 없음)
src/
├── views/     페이지 조립 (FSD의 pages 레이어. Next.js와 충돌 방지를 위해 views로 명명)
├── widgets/   독립적으로 동작하는 UI 블록 (portfolio-summary, holdings-table ...)
├── features/  사용자 행동 단위 (add-holding, simulate-averaging ...)
├── entities/  도메인 모델 (stock, holding, portfolio)
└── shared/    공통 코드 (api, config, lib, ui)
```

### 의존성 방향 (단방향, ESLint로 강제)

```
app → views → widgets → features → entities → shared
```

| 레이어     | import 가능한 대상                  |
| ---------- | ----------------------------------- |
| `app`      | views, shared                       |
| `views`    | widgets, features, entities, shared |
| `widgets`  | features, entities, shared          |
| `features` | entities, shared                    |
| `entities` | shared                              |
| `shared`   | shared (내부끼리만)                 |

- **역방향 import 금지.** 아래 레이어는 위 레이어를 절대 모른다.
- **동일 레이어 내 슬라이스 간 import 금지.** 예: `widgets/holdings-table` → `widgets/portfolio-summary` 불가.
  공유가 필요하면 공통 부분을 **아래 레이어로 내린다**. (`shared` 내부만 예외)
- 위 규칙은 `eslint-plugin-boundaries`가 검사한다. 규칙을 우회하려고
  `eslint-disable`을 붙이지 말고, 구조를 고쳐라.

### Public API 규칙

- 각 슬라이스는 `index.ts`로만 외부에 노출한다.
  - ✅ `import { DashboardPage } from '@/views/dashboard'`
  - ❌ `import { DashboardPage } from '@/views/dashboard/ui/dashboard-page'`
- `shared`는 예외로 하위 경로 직접 import를 허용한다
  (`@/shared/ui/button` — Shadcn이 컴포넌트 단위로 파일을 생성하므로).

### 슬라이스 내부 구조 (segments)

```
src/features/add-holding/
├── ui/          컴포넌트
├── model/       상태, 훅, 비즈니스 로직
├── lib/         슬라이스 전용 유틸
├── api/         서버 통신
└── index.ts     public API
```

필요한 세그먼트만 만든다. 미리 빈 폴더를 만들어두지 않는다.

## 경로 alias

`@/*` → `./src/*`

```ts
import { DashboardPage } from '@/views/dashboard';
import { Button } from '@/shared/ui/button';
```

## 네이밍 컨벤션

| 대상                   | 규칙                             | 예시                                 |
| ---------------------- | -------------------------------- | ------------------------------------ |
| 슬라이스 / 폴더 / 파일 | kebab-case                       | `add-holding/`, `dashboard-page.tsx` |
| React 컴포넌트         | PascalCase                       | `DashboardPage`, `HoldingsTable`     |
| 타입 / 인터페이스      | PascalCase                       | `Holding`, `PortfolioSummary`        |
| 훅                     | 파일 `use-xxx.ts`, 함수 `useXxx` | `use-portfolio.ts` → `usePortfolio`  |
| 상수                   | UPPER_SNAKE_CASE                 | `DEFAULT_CURRENCY`                   |
| 함수 / 변수            | camelCase                        | `calcAverageCost`                    |

- 컴포넌트는 named export를 기본으로 한다 (`app/` 하위의 Next.js 규약 파일 제외 —
  `page.tsx`, `layout.tsx` 등은 default export 필수).
- 테스트 파일은 대상 파일 옆에 `*.test.ts(x)`로 둔다.

## 커밋 컨벤션

Conventional Commits를 따른다. 작업은 단계별로 쪼개서 커밋한다.

```
<type>: <설명>
```

| type       | 용도                     |
| ---------- | ------------------------ |
| `feat`     | 기능 추가                |
| `fix`      | 버그 수정                |
| `refactor` | 동작 변화 없는 구조 개선 |
| `chore`    | 설정, 구조, 잡무         |
| `build`    | 의존성 / 빌드 시스템     |
| `test`     | 테스트 추가·수정         |
| `docs`     | 문서                     |
| `style`    | 포맷팅                   |

## 명령어

```bash
pnpm dev            # 개발 서버
pnpm build          # 프로덕션 빌드
pnpm lint           # ESLint (FSD 경계 검사 포함)
pnpm test           # Vitest 1회 실행
pnpm test:watch     # Vitest watch
pnpm format         # Prettier 적용
pnpm exec tsc --noEmit   # 타입 체크
```

작업을 완료했다고 보고하기 전에 최소한 `pnpm lint`와 `pnpm build`를 통과시킨다.
