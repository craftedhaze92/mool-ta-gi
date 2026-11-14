'use client';

import { useEffect } from 'react';
import { useHoldingsHydrated, useHoldingsStore } from '@/entities/holding';
import { useStockLookup } from '@/shared/api/use-stock-lookup';

/**
 * 저장된 보유 종목의 섹터를 종목 마스터(KRX 업종)에 맞춘다.
 *
 * 섹터는 종목을 고를 때 마스터에서 따라오지만, 그 전에 저장된 값은 맞춰 줄 길이 없다.
 * - 섹터를 직접 고르던 시절의 값('반도체', '2차전지' 같은 테마 분류)
 * - 마스터가 갱신되며 업종이 바뀐 종목
 * 마스터는 서버에만 있어(약 140KB) localStorage 복원 시점에는 알 수 없으므로, 화면이 뜬 뒤
 * 보유 종목코드로 한 번 조회해 다른 값만 고친다.
 *
 * 화면을 막지 않는다. 조회가 실패하면 저장된 섹터가 그대로 보일 뿐이다.
 */
export function useSyncHoldingSectors(): void {
  const hydrated = useHoldingsHydrated();
  // 셀렉터에서 map하면 매번 새 배열이라 zustand가 무한히 다시 그린다. 밖에서 뽑는다
  const holdings = useHoldingsStore((state) => state.holdings);
  const codes = holdings.map((holding) => holding.code);
  const syncSectors = useHoldingsStore((state) => state.syncSectors);

  // 복원 전에는 seed 종목코드라 조회할 이유가 없다 (useHoldingQuotes와 같은 이유)
  const stocks = useStockLookup(codes, { enabled: hydrated });

  useEffect(() => {
    if (!stocks) return;

    syncSectors(Object.fromEntries(stocks.map((stock) => [stock.code, stock.sector])));
  }, [stocks, syncSectors]);
}
