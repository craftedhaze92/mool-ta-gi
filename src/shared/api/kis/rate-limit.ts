import 'server-only';

/**
 * KIS 호출 간격 제어.
 *
 * ── 왜 필요한가
 * 이 계정의 유량 제한은 실측 **초당 약 1건**이다(공식 샘플이 시사하는 20건이 아니다).
 * 한도를 넘기면 msg_cd EGW00201로 거절된다.
 *
 * 호출부마다 sleep을 넣는 방식으로는 부족하다. 우리 BFF는 요청마다 핸들러가 따로 도는데,
 * 브라우저가 /api/quotes와 /api/indices를 동시에 부르거나 사용자가 둘이기만 해도 서로의
 * 간격을 모른 채 동시에 KIS를 친다. 실제로 스모크 테스트에서 연속 3회 호출 중 2번째가
 * 429로 떨어졌다.
 *
 * 그래서 간격 제어를 호출부가 아니라 **모듈 스코프 한 곳**에 둔다. KIS로 나가는 모든
 * 요청이 이 게이트를 지나므로, 라우트가 몇 개든 동시 요청이 몇이든 시작 간격이 지켜진다.
 *
 * ── 한계
 * 토큰 캐시와 같다. 이 큐는 **인스턴스 로컬**이라 서버리스 인스턴스가 여러 개 뜨면 각자
 * 자기 큐를 가진다. 인스턴스 수만큼 한도를 넘길 수 있다. 지금은 BFF 응답의 s-maxage가
 * CDN에서 흡수해 주는 것에 기대고, 근본 해결은 토큰과 같이 공유 저장소(Upstash Redis 등)로
 * 옮기는 것이다. README.md 참고.
 */

/**
 * 호출 시작 사이의 최소 간격.
 *
 * 실측: 1000ms 간격 30회는 전부 성공, 500ms 간격은 10회 중 3회가 EGW00201.
 * 한도가 계정마다 다를 수 있어 여유를 두고 1200ms로 잡는다.
 */
const MIN_INTERVAL_MS = 1200;

/** 마지막으로 게이트를 통과한 시각 (epoch ms) */
let lastStartedAt = 0;

/**
 * 대기 중인 호출들의 줄.
 *
 * 게이트 획득만 직렬화한다. 통과한 뒤의 실제 요청은 겹쳐도 상관없다 — 우리가 지켜야 하는
 * 건 '초당 시작 횟수'이지 동시 접속 수가 아니다.
 */
let queue: Promise<void> = Promise.resolve();

/**
 * KIS 호출을 간격 제한 아래에서 실행한다.
 *
 * task가 던지면 그대로 전파되지만, 큐 자체는 끊기지 않는다(다음 호출이 영원히 막히면
 * 안 되므로). 순서는 호출한 순서 그대로 보장된다.
 */
export function paced<T>(task: () => Promise<T>): Promise<T> {
  const gate = queue.then(async () => {
    const waitMs = MIN_INTERVAL_MS - (Date.now() - lastStartedAt);
    if (waitMs > 0) await sleep(waitMs);
    lastStartedAt = Date.now();
  });

  // task의 실패가 뒤따르는 호출을 막지 않도록 큐에는 게이트만 이어 붙인다.
  queue = gate;

  return gate.then(task);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 테스트 전용. 간격 상태를 초기화한다. */
export function __resetRateLimit(): void {
  lastStartedAt = 0;
  queue = Promise.resolve();
}
