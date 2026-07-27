import { isMarketOpen } from '@/shared/lib/market-hours';

/**
 * 장 시간에 맞춘 폴링 정책.
 *
 * 시세와 지수가 같은 규칙을 쓴다. 두 벌로 두면 한쪽만 고쳐 정책이 갈라진다 —
 * 특히 아래의 SSR 안전 조건과 429 처리는 이유를 모르면 되돌리기 쉬운 것들이다.
 */

/** 폴링 주기. 장중에만 돈다. */
export const POLL_INTERVAL_MS = 30_000;

/**
 * 캐시를 신선하다고 보는 시간.
 *
 * 장중 여부로 분기하지 않는다. staleTime은 렌더 도중에 읽히는 값이라, 빌드 타임에
 * 프리렌더되는 서버와 클라이언트가 서로 다른 값을 계산해 hydration mismatch를 만든다.
 * 폴링 주기보다 짧게 두어 위젯이 재마운트돼도 직전 응답을 재사용하게 한다.
 */
export const STALE_TIME_MS = 20_000;

/** 429를 판별하기 위한 최소 조건. fetch 계층의 에러가 status를 들고 있어야 한다. */
interface HttpStatusError {
  status: number;
}

function isRateLimited(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    (error as HttpStatusError).status === 429
  );
}

/**
 * useQuery에 펼쳐 넣는 폴링 옵션.
 *
 * refetchInterval과 refetchOnWindowFocus를 함수형으로 두는 게 핵심이다. 함수형이면
 * 렌더가 아니라 타이머·이벤트 컨텍스트에서 평가되므로 SSR 결과에 영향을 주지 않는다.
 * 덤으로 15:30을 지나는 순간 다음 tick에서 스스로 false로 떨어져 폴링이 멈춘다.
 */
export const marketPollingOptions = {
  staleTime: STALE_TIME_MS,

  refetchInterval: () => (isMarketOpen(new Date()) ? POLL_INTERVAL_MS : false),
  // 숨은 탭까지 폴링하면 유량만 축낸다.
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: () => isMarketOpen(new Date()),

  /*
   * 429(유량 초과)는 재시도하지 않는다. 실측한 KIS 한도가 초당 약 1건이라, 곧바로
   * 다시 쏘면 한도를 더 악화시키기만 한다. 그 외의 실패만 한 번, 한도를 피할 만큼
   * 넉넉히 기다렸다가 재시도한다. 나머지는 사용자의 '다시 시도' 버튼에 맡긴다.
   */
  retry: (failureCount: number, error: unknown) => {
    if (isRateLimited(error)) return false;
    return failureCount < 1;
  },
  retryDelay: 1500,
} as const;
