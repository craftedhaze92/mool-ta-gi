# mool-ta-gi (물타기)

> "물타기"는 보유 종목의 주가가 하락했을 때 추가 매수로
> 평균 단가를 낮추는 주식 투자 은어입니다.
> (영어로는 Averaging Down)

하락장에서 감으로 물타지 말고, 계산하고 물타세요.
국내 주식 포트폴리오 관리 + 물타기 시뮬레이터.

## 시작하기

```bash
pnpm install
cp .env.example .env.local   # KIS 앱키·시크릿을 채운다
pnpm dev
```

`.env.local`이 없어도 앱은 뜬다. 시세만 "불러오지 못했습니다"로 표시된다.

## 상태를 두 갈래로 나눈다

이 앱의 데이터는 성격이 다른 두 종류이고, 저장 위치도 다르다.

|                     | 무엇                             | 어디에                 | 수명             |
| ------------------- | -------------------------------- | ---------------------- | ---------------- |
| **클라이언트 상태** | 보유 종목 (종목코드·수량·평단가) | Zustand + localStorage | 내가 팔기 전까지 |
| **서버 상태**       | 시세 (현재가·전일종가·등락)      | React-Query            | 몇 초면 낡는다   |

그래서 `Holding` 타입에는 현재가가 없다. 평가금액·손익·비중은 둘을 조합해 **매번 계산**하고
저장하지 않는다.

이 분리가 화면에도 그대로 드러난다. 종목명·수량·평단가는 localStorage에서 오므로 즉시
보이고, 시세에 기대는 칸만 스켈레톤으로 가린다. 시세 조회가 실패해도 보유 내역은 그대로
남는다. **실패했을 때 목데이터로 채우지 않는다** — 잘못된 시세는 없는 시세보다 나쁘다.

## 시세는 BFF를 거친다

```
브라우저 ──> /api/quotes   ──┐
        └──> /api/indices  ──┴──> 한국투자증권 OpenAPI
             (우리 서버)
```

브라우저는 KIS를 직접 부르지 않는다. API 키가 클라이언트 번들에 들어가면 안 되기 때문이다.
`src/shared/api/kis/`는 전부 `import 'server-only'`로 시작해서, 클라이언트 컴포넌트가 실수로
import하면 `next build`가 실패한다.

| 엔드포인트                                               | 응답                             |
| -------------------------------------------------------- | -------------------------------- |
| `GET /api/quotes?codes=005930,000660` (6자리, 최대 50개) | `{ quotes, failed, fetchedAt }`  |
| `GET /api/indices` (파라미터 없음)                       | `{ indices, failed, fetchedAt }` |

두 라우트를 나눠 둔 이유가 있다. 시세 쿼리 키에는 보유 종목코드가 들어가는데, 지수를 여기
합치면 종목을 추가·삭제할 때마다 지수까지 다시 불린다. 지수는 보유 종목과 무관하므로 캐시
키가 상수여야 한다.

KIS 원문 에러(`msg_cd`/`msg1`)는 응답에 나가지 않는다. 서버 로그에만 남고 사용자에게는
정규화된 문구가 간다.

KIS 연동의 세부 사항 — 토큰 캐시의 한계, 실측한 유량 제한, 배치 API를 쓰는 이유, 전일 종가로
기준가를 쓰는 이유 — 는 **[`src/shared/api/kis/README.md`](src/shared/api/kis/README.md)** 에
정리해 두었다. 이 연동을 건드리기 전에 읽는 것을 권한다.

### 알아둘 것 두 가지

**1. 토큰 캐시는 인스턴스 로컬이다.** 서버리스에서 인스턴스가 여러 개 뜨면 각자 토큰을
발급한다. KIS가 6시간 이내 재요청에 같은 토큰을 돌려주기 때문에 지금은 감수하고 있다.
근본 해결은 Upstash Redis / Vercel KV로 옮기는 것이고, `getAccessToken()`의 시그니처를 바꾸지
않고 내부만 교체하면 되도록 설계했다.

**2. 유량 제한이 문서보다 훨씬 빡빡하다.** 공식 샘플은 초당 20건을 시사하지만 실측값은
**초당 약 1건**이었다. 그래서 단건 조회 대신 30종목을 한 번에 받는 배치 API를 쓴다.
계정마다 다를 수 있다.

그리고 KIS로 나가는 모든 요청은 `rate-limit.ts`의 전역 게이트를 지난다. 호출부마다 sleep을
넣는 방식으로는 부족하다 — BFF는 요청마다 핸들러가 따로 돌기 때문에, 브라우저가 두 라우트를
동시에 부르거나 **사용자가 둘이기만 해도** 서로의 간격을 모른 채 KIS를 친다.

## 아키텍처

FSD(Feature-Sliced Design) 경량 5레이어. 자세한 규칙은 [CLAUDE.md](CLAUDE.md) 참고.

```
app → views → widgets → features → entities → shared
```

시세 관련 코드가 이 구조에 놓인 자리:

| 위치                             | 역할                                                        |
| -------------------------------- | ----------------------------------------------------------- |
| `shared/api/kis/`                | KIS 어댑터 (서버 전용). 간격 제어·토큰 캐시 포함            |
| `shared/api/quote-contract.ts`   | `/api/quotes` 계약 (서버·클라이언트 공유)                   |
| `shared/api/indices-contract.ts` | `/api/indices` 계약 + 조회 대상 지수 목록                   |
| `shared/api/polling.ts`          | 장 시간에 맞춘 폴링·재시도 정책 (시세·지수 공용)            |
| `shared/api/stock-master/`       | 종목 마스터 + 검색 (서버 전용). `pnpm stocks:update`로 갱신 |
| `shared/api/use-stock-search.ts` | `/api/stocks` 종목 검색 훅 (종목 추가 폼에서 사용)          |
| `shared/lib/market-hours.ts`     | KST 장 운영시간 판정 (순수 함수)                            |
| `entities/quote`                 | `Quote` 타입 + `useQuotes` 훅                               |
| `entities/market-index`          | `MarketIndex` 타입 + `useMarketIndices` 훅                  |
| `entities/holding`               | 보유 종목 + 파생 계산 (시세를 인자로 받는다)                |
| `features/holding-quotes`        | 보유 종목 × 시세 조합                                       |

**두 엔티티는 서로를 import하지 않는다.** FSD가 동일 레이어 슬라이스 간 import를 금지하기
때문이다. `entities/holding`이 `PriceSnapshot { current, prevClose }`라는 구조적 타입을 선언하고,
`entities/quote`의 `Quote`가 그 형태를 만족한다. 조합은 `features/holding-quotes` 한 곳에서만 한다.

계약 타입이 `entities`가 아니라 `shared`에 있는 것도 같은 이유다 — `app` 레이어(라우트 핸들러)는
`entities`를 import할 수 없다.

위젯 여섯 개가 각자 `useHoldingQuotes()`를 불러도 네트워크 요청은 1건이다. 정렬·중복 제거한
종목코드 배열이 queryKey라 React-Query가 하나의 쿼리로 합친다.

## 명령어

```bash
pnpm dev            # 개발 서버
pnpm build          # 프로덕션 빌드
pnpm lint           # ESLint (FSD 경계 검사 포함)
pnpm test           # Vitest
pnpm exec tsc --noEmit
pnpm format
```

테스트는 MSW로 BFF 라우트를 가로챈다(`src/shared/api/mocks/`). 실제 네트워크를 치는 테스트가
생기면 `onUnhandledRequest: 'error'`가 즉시 잡아낸다. 뒤집어 말하면 **새 엔드포인트를 추가할
때 기본 핸들러도 함께 등록해야 한다** — 안 그러면 그 엔드포인트를 건드리는 테스트가 전부 깨진다
(`src/shared/testing/msw-server.ts`).

## 아직 하지 않은 것

- **공휴일 휴장** — `isMarketOpen`은 평일 09:00~15:30만 본다. 신정·설·추석에도 장중으로 판정한다.
- **토큰·간격 제어 공유 저장소** — 둘 다 인스턴스 로컬이다. 위 참고.
