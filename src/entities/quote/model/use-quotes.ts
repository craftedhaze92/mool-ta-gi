'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { Quote, QuotesResponse } from '@/shared/api/quote-contract';
import { isMarketOpen } from '@/shared/lib/market-hours';
import { fetchQuotes, QuoteFetchError } from '../api/fetch-quotes';
import { normalizeCodes, quotesQueryKey } from './query-keys';

/** 폴링 주기. 장중에만 돈다. */
const POLL_INTERVAL_MS = 30_000;

/**
 * 캐시를 신선하다고 보는 시간.
 *
 * 장중 여부로 분기하지 않는다. staleTime은 렌더 도중에 읽히는 값이라, 빌드 타임에
 * 프리렌더되는 서버와 클라이언트가 서로 다른 값을 계산해 hydration mismatch를 만든다.
 * 폴링 주기보다 짧게 두어 위젯이 재마운트돼도 직전 응답을 재사용하게 한다.
 */
const STALE_TIME_MS = 20_000;

export interface QuotesResult {
  /** 종목코드 → 시세. 시세를 못 받은 코드는 키가 없다 */
  byCode: Record<string, Quote | undefined>;
  /** 조회에 실패한 종목코드 */
  failed: string[];
  /** 서버가 시세를 확정한 시각 (ISO 8601). 아직 받은 적 없으면 undefined */
  fetchedAt: string | undefined;
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
}

/** 모듈 스코프 상수여야 React-Query가 함수 동일성으로 결과를 메모이즈한다. */
function selectQuotes(data: QuotesResponse) {
  const byCode: Record<string, Quote | undefined> = {};
  for (const quote of data.quotes) byCode[quote.code] = quote;

  return { byCode, failed: data.failed, fetchedAt: data.fetchedAt };
}

/**
 * 종목코드 배열의 시세를 구독한다.
 *
 * 여러 위젯이 각자 불러도 된다. 코드 목록이 같으면 queryKey가 같아 React-Query가
 * 하나의 쿼리로 합치고, 네트워크 요청은 1건만 나간다.
 */
export function useQuotes(
  codes: readonly string[],
  options: { enabled?: boolean } = {},
): QuotesResult {
  const normalized = normalizeCodes(codes);

  const query = useQuery({
    queryKey: quotesQueryKey(normalized),
    queryFn: ({ signal }) => fetchQuotes(normalized, signal),
    enabled: options.enabled !== false && normalized.length > 0,

    staleTime: STALE_TIME_MS,

    /*
     * 함수형이라 렌더가 아니라 타이머 컨텍스트에서 평가된다 → SSR 안전하다.
     * 덤으로 15:30을 지나는 순간 다음 tick에서 스스로 false로 떨어져 폴링이 멈춘다.
     */
    refetchInterval: () => (isMarketOpen(new Date()) ? POLL_INTERVAL_MS : false),
    // 숨은 탭까지 폴링하면 유량만 축낸다.
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: () => isMarketOpen(new Date()),

    /*
     * 429(유량 초과)는 재시도하지 않는다. 실측한 KIS 한도가 초당 약 1건이라, 곧바로
     * 다시 쏘면 한도를 더 악화시키기만 한다. 그 외의 실패만 한 번, 한도를 피할 만큼
     * 넉넉히 기다렸다가 재시도한다. 나머지는 사용자의 '다시 시도' 버튼에 맡긴다.
     */
    retry: (failureCount, error) => {
      if (error instanceof QuoteFetchError && error.status === 429) return false;
      return failureCount < 1;
    },
    retryDelay: 1500,

    /*
     * 종목을 추가·삭제하면 queryKey가 바뀐다. 이게 없으면 그 순간 대시보드 전체가
     * 스켈레톤으로 깜빡인다.
     */
    placeholderData: keepPreviousData,
    select: selectQuotes,
  });

  return {
    byCode: query.data?.byCode ?? {},
    failed: query.data?.failed ?? [],
    fetchedAt: query.data?.fetchedAt,
    // enabled가 false면 React-Query는 pending으로 두지만 화면 입장에서는 로딩이 아니다.
    isPending: query.isPending && query.fetchStatus !== 'idle',
    isError: query.isError,
    refetch: () => void query.refetch(),
  };
}
