'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { IndicesResponse, MarketIndex } from '@/shared/api/indices-contract';
import { marketPollingOptions } from '@/shared/api/polling';
import { fetchIndices } from '../api/fetch-indices';

/**
 * 지수 쿼리 키.
 *
 * 상수다. 조회 대상이 보유 종목과 무관하게 고정되어 있으므로, 종목을 추가·삭제해도
 * 지수는 다시 불리지 않는다.
 */
export const INDICES_QUERY_KEY = ['indices'] as const;

export interface MarketIndicesResult {
  /** 지수 코드 → 지수. 못 받은 코드는 키가 없다 */
  byCode: Record<string, MarketIndex | undefined>;
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
}

/** 모듈 스코프 상수여야 React-Query가 함수 동일성으로 결과를 메모이즈한다. */
function selectIndices(data: IndicesResponse) {
  const byCode: Record<string, MarketIndex | undefined> = {};
  for (const index of data.indices) byCode[index.code] = index;
  return { byCode };
}

/**
 * KOSPI/KOSDAQ 지수를 구독한다.
 *
 * 폴링·재시도 정책은 시세와 같다(marketPollingOptions). 장중 30초, 마감 후 정지.
 */
export function useMarketIndices(): MarketIndicesResult {
  const query = useQuery({
    queryKey: INDICES_QUERY_KEY,
    queryFn: ({ signal }) => fetchIndices(signal),

    ...marketPollingOptions,

    // 폴링으로 값이 갱신될 때 헤더가 스켈레톤으로 깜빡이지 않게 한다.
    placeholderData: keepPreviousData,
    select: selectIndices,
  });

  return {
    byCode: query.data?.byCode ?? {},
    isPending: query.isPending,
    isError: query.isError,
    refetch: () => void query.refetch(),
  };
}
