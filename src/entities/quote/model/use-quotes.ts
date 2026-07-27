'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { marketPollingOptions } from '@/shared/api/polling';
import type { Quote, QuotesResponse } from '@/shared/api/quote-contract';
import { fetchQuotes } from '../api/fetch-quotes';
import { normalizeCodes, quotesQueryKey } from './query-keys';

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

    // 장 시간에 맞춘 폴링·재시도 정책. 지수 조회와 같은 규칙을 쓴다.
    ...marketPollingOptions,

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
