import type {
  AllocationSlice,
  AveragingResult,
  Holding,
  HoldingMetrics,
  PortfolioSummary,
} from './types';

/** 0으로 나누는 것을 막는다. 분모가 0이면 0을 돌려준다. */
function safeRate(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return (numerator / denominator) * 100;
}

export function calcHoldingMetrics(holding: Holding): HoldingMetrics {
  const costBasis = holding.quantity * holding.avgPrice;
  const marketValue = holding.quantity * holding.currentPrice;
  const profit = marketValue - costBasis;
  const dayChange = holding.quantity * (holding.currentPrice - holding.prevClose);
  const prevValue = holding.quantity * holding.prevClose;

  return {
    costBasis,
    marketValue,
    profit,
    profitRate: safeRate(profit, costBasis),
    dayChange,
    dayChangeRate: safeRate(dayChange, prevValue),
  };
}

export function calcPortfolioSummary(holdings: Holding[]): PortfolioSummary {
  const totals = holdings.reduce(
    (acc, holding) => {
      const m = calcHoldingMetrics(holding);
      acc.totalCost += m.costBasis;
      acc.totalValue += m.marketValue;
      acc.totalDayChange += m.dayChange;
      acc.prevValue += holding.quantity * holding.prevClose;
      return acc;
    },
    { totalCost: 0, totalValue: 0, totalDayChange: 0, prevValue: 0 },
  );

  const totalProfit = totals.totalValue - totals.totalCost;

  return {
    totalCost: totals.totalCost,
    totalValue: totals.totalValue,
    totalProfit,
    totalProfitRate: safeRate(totalProfit, totals.totalCost),
    totalDayChange: totals.totalDayChange,
    totalDayChangeRate: safeRate(totals.totalDayChange, totals.prevValue),
  };
}

/** 평가금액 기준 섹터 비중. 비중 내림차순으로 정렬해 돌려준다. */
export function calcSectorAllocation(holdings: Holding[]): AllocationSlice[] {
  const bySector = new Map<string, number>();
  let total = 0;

  for (const holding of holdings) {
    const { marketValue } = calcHoldingMetrics(holding);
    bySector.set(holding.sector, (bySector.get(holding.sector) ?? 0) + marketValue);
    total += marketValue;
  }

  return [...bySector.entries()]
    .map(([sector, value]) => ({
      key: sector,
      label: sector,
      value,
      ratio: safeRate(value, total),
    }))
    .sort((a, b) => b.value - a.value);
}

/** 평가금액 기준 종목 비중. 비중 내림차순. */
export function calcHoldingAllocation(holdings: Holding[]): AllocationSlice[] {
  const total = holdings.reduce((sum, h) => sum + calcHoldingMetrics(h).marketValue, 0);

  return holdings
    .map((holding) => {
      const { marketValue } = calcHoldingMetrics(holding);
      return {
        key: holding.code,
        label: holding.name,
        value: marketValue,
        ratio: safeRate(marketValue, total),
      };
    })
    .sort((a, b) => b.value - a.value);
}

/**
 * 현재가에 addQuantity주를 추가 매수했을 때의 결과.
 * 시안의 계산식을 그대로 따른다: newAvg = (qty×avg + add×cur) / (qty + add)
 */
export function calcAveraging(holding: Holding, addQuantity: number): AveragingResult {
  const add = Math.max(0, Math.round(addQuantity));
  const totalQty = holding.quantity + add;

  const newAvgPrice =
    totalQty === 0
      ? holding.avgPrice
      : (holding.quantity * holding.avgPrice + add * holding.currentPrice) / totalQty;

  return {
    newAvgPrice,
    avgDropRate: Math.max(0, 100 - safeRate(newAvgPrice, holding.avgPrice)),
    requiredAmount: add * holding.currentPrice,
    breakEvenRate: safeRate(newAvgPrice - holding.currentPrice, holding.currentPrice),
  };
}

/**
 * 목표 평단가에 도달하기 위해 필요한 추가 매수 수량.
 *
 * 목표가가 현재 평단가 이상이거나 현재가 이하면 도달할 수 없으므로 null.
 * (현재가보다 낮은 평단은 아무리 사도 만들 수 없다)
 */
export function calcQuantityForTargetAverage(holding: Holding, targetAvg: number): number | null {
  if (!Number.isFinite(targetAvg)) return null;
  if (targetAvg >= holding.avgPrice) return null;
  if (targetAvg <= holding.currentPrice) return null;

  return Math.ceil(
    (holding.quantity * (holding.avgPrice - targetAvg)) / (targetAvg - holding.currentPrice),
  );
}

/** 현재가와 평단가 사이의 괴리율(%). 음수면 손실 구간이다. */
export function calcPriceGapRate(holding: Holding): number {
  return safeRate(holding.currentPrice - holding.avgPrice, holding.avgPrice);
}
