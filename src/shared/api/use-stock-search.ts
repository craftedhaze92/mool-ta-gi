'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '@/shared/lib/use-debounced-value';
import { stockSearchResponseSchema, type Stock } from './stock-search-contract';

/**
 * 종목 검색 훅.
 *
 * 시세(entities/quote)와 달리 shared에 둔다. 이걸 쓰는 곳이 entities/holding의 폼인데,
 * entities끼리는 서로 import할 수 없기 때문이다. 도메인 계산이 없는 단순 조회라
 * shared에 있어도 어색하지 않다.
 */

/** 타이핑이 멈춘 뒤 이만큼 기다렸다 요청한다 */
const SEARCH_DEBOUNCE_MS = 200;

async function fetchStocks(query: string, signal?: AbortSignal): Promise<Stock[]> {
  const response = await fetch(`/api/stocks?q=${encodeURIComponent(query)}`, { signal });
  if (!response.ok) throw new Error('종목을 검색하지 못했습니다.');

  const parsed = stockSearchResponseSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error('종목 검색 응답 형식이 올바르지 않습니다.');

  return parsed.data.stocks;
}

export interface StockSearchResult {
  stocks: Stock[];
  /**
   * 목록이 아직 현재 검색어의 결과가 아니다. 디바운스 대기 중이거나, 요청 중이거나,
   * 이전 검색어의 결과를 자리 채움으로 보여주는 중이다. 이때 목록은 보이기만 하고 고를 수 없어야 한다.
   */
  isSearching: boolean;
  isError: boolean;
  /** 검색어가 비어 있어 아무것도 조회하지 않은 상태 */
  isIdle: boolean;
}

export function useStockSearch(keyword: string): StockSearchResult {
  const trimmed = keyword.trim();
  const query = useDebouncedValue(trimmed, SEARCH_DEBOUNCE_MS);
  const enabled = query !== '';

  const result = useQuery({
    queryKey: ['stock-search', query],
    queryFn: ({ signal }) => fetchStocks(query, signal),
    enabled,
    // 종목 마스터는 배포 단위로 고정이다. 한 번 받은 검색 결과는 다시 받을 이유가 없다
    staleTime: Infinity,
    // 글자를 더 칠 때마다 목록이 비었다 채워지며 깜빡이지 않게 한다
    placeholderData: keepPreviousData,
  });

  return {
    stocks: enabled ? (result.data ?? []) : [],
    /*
     * isPlaceholderData까지 봐야 한다. keepPreviousData는 새 키의 응답이 올 때까지 이전 키의
     * 데이터를 그대로 돌려주는데, 이걸 현재 결과로 착각하면 '카카오'를 치고 바로 Enter를 눌렀을 때
     * '삼성' 결과가 선택된다.
     */
    isSearching: trimmed !== query || (enabled && (result.isFetching || result.isPlaceholderData)),
    isError: result.isError,
    isIdle: trimmed === '',
  };
}
