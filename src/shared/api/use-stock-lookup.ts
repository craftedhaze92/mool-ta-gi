'use client';

import { useQuery } from '@tanstack/react-query';
import { stockSearchResponseSchema, type Stock } from './stock-search-contract';

/** 6자리 국내 종목코드 */
const CODE_PATTERN = /^\d{6}$/;

async function fetchStocksByCodes(codes: string[], signal?: AbortSignal): Promise<Stock[]> {
  const response = await fetch(`/api/stocks?codes=${codes.join(',')}`, { signal });
  if (!response.ok) throw new Error('종목 정보를 불러오지 못했습니다.');

  const parsed = stockSearchResponseSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error('종목 정보 응답 형식이 올바르지 않습니다.');

  return parsed.data.stocks;
}

/**
 * 종목코드로 종목 마스터를 조회한다. 마스터에 없는 코드는 결과에서 빠진다.
 *
 * 종목 마스터는 배포 단위로 고정이라 한 번 받으면 다시 받지 않는다(staleTime Infinity).
 * 코드를 정렬·중복 제거해 키로 쓰므로, 같은 보유 목록이면 순서가 달라도 요청은 1건이다.
 */
export function useStockLookup(
  codes: readonly string[],
  options: { enabled?: boolean } = {},
): Stock[] | undefined {
  const normalized = [...new Set(codes.filter((code) => CODE_PATTERN.test(code)))].sort();

  const { data } = useQuery({
    queryKey: ['stock-lookup', normalized],
    queryFn: ({ signal }) => fetchStocksByCodes(normalized, signal),
    enabled: options.enabled !== false && normalized.length > 0,
    staleTime: Infinity,
    // 섹터 동기화는 화면을 막지 않는 보정 작업이다. 실패하면 저장된 섹터를 그대로 쓴다
    retry: false,
  });

  return data;
}
