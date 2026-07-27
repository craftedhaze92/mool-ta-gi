'use client';

import { useHoldingsHydrated, useHoldingsStore, type PriceMap } from '@/entities/holding';
import { normalizeCodes, useQuotes } from '@/entities/quote';

/**
 * 시세 조회 상태.
 *
 * - idle: 조회할 이유가 없다 (복원 전이거나 보유 종목이 없다). 로딩이 아니다
 * - pending: 첫 응답을 기다리는 중
 * - error: 전체 실패. 목데이터로 채우지 않고 실패로 보여준다
 * - success: 응답을 받았다. 일부 종목이 빠졌을 수 있어 missingCodes를 함께 본다
 */
export type QuoteStatus = 'idle' | 'pending' | 'error' | 'success';

export interface HoldingQuotes {
  /** 종목코드 → 시세. 시세를 못 받은 코드는 키가 없다 */
  prices: PriceMap;
  status: QuoteStatus;
  /** 보유 중인데 시세를 못 받은 종목코드 */
  missingCodes: string[];
  /** 마지막으로 시세를 확정한 시각 (ISO 8601) */
  fetchedAt: string | undefined;
  refetch: () => void;
}

/**
 * 보유 종목(클라이언트 상태)과 시세(서버 상태)를 잇는다.
 *
 * 두 엔티티를 모두 알아야 하는 유일한 자리다. entities/holding과 entities/quote는 FSD
 * 규칙상 서로를 import할 수 없으므로 합성은 이 레이어에서 한다. 두 엔티티는 서로의 존재를
 * 모른 채 남는다 — 계산은 시세를 인자로 받고, 시세는 코드 배열만 받는다.
 *
 * 위젯마다 이 훅을 불러도 된다. 같은 코드 목록이면 queryKey가 같아 React-Query가 하나로
 * 합치므로 네트워크 요청은 1건이다.
 */
export function useHoldingQuotes(): HoldingQuotes {
  const hydrated = useHoldingsHydrated();
  const holdings = useHoldingsStore((state) => state.holdings);

  /*
   * 복원 전에는 조회하지 않는다. 그때 스토어는 seed 상태라, 이 가드가 없으면 seed
   * 종목코드로 한 번 요청하고 복원 직후 실제 코드로 또 요청하게 된다.
   */
  const codes = normalizeCodes(holdings.map((holding) => holding.code));
  const quotes = useQuotes(codes, { enabled: hydrated });

  /*
   * 응답의 failed가 아니라 지금 보유 목록을 기준으로 다시 계산한다. 응답을 받은 뒤에
   * 종목이 추가·삭제됐을 수 있고, 그러면 failed 목록은 이미 낡았다.
   */
  const missingCodes = codes.filter((code) => quotes.byCode[code] === undefined);

  return {
    prices: quotes.byCode,
    status: resolveStatus({
      hydrated,
      hasCodes: codes.length > 0,
      isPending: quotes.isPending,
      isError: quotes.isError,
    }),
    missingCodes,
    fetchedAt: quotes.fetchedAt,
    refetch: quotes.refetch,
  };
}

function resolveStatus({
  hydrated,
  hasCodes,
  isPending,
  isError,
}: {
  hydrated: boolean;
  hasCodes: boolean;
  isPending: boolean;
  isError: boolean;
}): QuoteStatus {
  if (!hydrated || !hasCodes) return 'idle';
  if (isError) return 'error';
  if (isPending) return 'pending';
  return 'success';
}
