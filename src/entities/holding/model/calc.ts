import type {
  AllocationSlice,
  Holding,
  HoldingMetrics,
  PortfolioSummary,
  PriceMap,
  PriceSnapshot,
} from './types';

/*
 * 보유 종목에서 파생되는 계산.
 *
 * 시세는 인자로 받는다. 보유 종목은 클라이언트가 영속화하는 값이고 시세는 서버에서 오는
 * 값이라 수명이 다르기 때문이다. 이 파일은 시세가 어디서 왔는지 모른 채 순수하게 계산만
 * 한다 (React도 네트워크도 모른다).
 *
 * 인자 순서는 (종목, 시세, 스칼라)로 통일했다. 시세를 number 두 개로 풀어서 받으면
 * 인자가 뒤바뀌어도 타입이 잡아주지 못한다. PriceSnapshot 객체로 묶으면 잡힌다.
 */

/** 0으로 나누는 것을 막는다. 분모가 0이면 0을 돌려준다. */
function safeRate(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return (numerator / denominator) * 100;
}

/** 매입금액. 시세 없이 계산되는 유일한 금액이라 로딩 중에도 실값을 보여줄 수 있다. */
export function calcCostBasis(holding: Holding): number {
  return holding.quantity * holding.avgPrice;
}

/**
 * 종목 하나의 표시용 지표.
 *
 * **시세가 없으면 null이다.** 0을 채워 돌려주지 않는다. 0원은 '평가금액이 0원'과 구분이
 * 안 되고, 손익 부호로 색을 정하는 화면에서는 없는 손실을 빨갛게 칠하게 된다.
 * strict 모드라 호출부는 null 분기를 쓰지 않으면 컴파일되지 않는다.
 */
export function calcHoldingMetrics(
  holding: Holding,
  price: PriceSnapshot | undefined,
): HoldingMetrics | null {
  if (price === undefined) return null;

  const costBasis = calcCostBasis(holding);
  const marketValue = holding.quantity * price.current;
  const profit = marketValue - costBasis;
  const dayChange = holding.quantity * (price.current - price.prevClose);
  const prevValue = holding.quantity * price.prevClose;

  return {
    costBasis,
    marketValue,
    profit,
    profitRate: safeRate(profit, costBasis),
    dayChange,
    dayChangeRate: safeRate(dayChange, prevValue),
  };
}

/**
 * 포트폴리오 합계.
 *
 * 시세를 못 받은 종목은 평가 관련 집계에서 빠지되 totalCost에는 남는다. 매입금액은
 * 시세와 무관하게 우리가 아는 값이라 굳이 감출 이유가 없다.
 */
export function calcPortfolioSummary(holdings: Holding[], prices: PriceMap): PortfolioSummary {
  const totals = holdings.reduce(
    (acc, holding) => {
      acc.totalCost += calcCostBasis(holding);

      const price = prices[holding.code];
      const metrics = calcHoldingMetrics(holding, price);

      if (metrics === null || price === undefined) {
        acc.missingCodes.push(holding.code);
        return acc;
      }

      acc.pricedCost += metrics.costBasis;
      acc.totalValue += metrics.marketValue;
      acc.totalDayChange += metrics.dayChange;
      acc.prevValue += holding.quantity * price.prevClose;
      acc.pricedCount += 1;
      return acc;
    },
    {
      totalCost: 0,
      pricedCost: 0,
      totalValue: 0,
      totalDayChange: 0,
      prevValue: 0,
      pricedCount: 0,
      missingCodes: [] as string[],
    },
  );

  // 분모는 pricedCost다. totalCost를 쓰면 시세를 못 받은 종목의 매입금액이 손실로 둔갑한다.
  const totalProfit = totals.totalValue - totals.pricedCost;

  return {
    totalCost: totals.totalCost,
    pricedCost: totals.pricedCost,
    totalValue: totals.totalValue,
    totalProfit,
    totalProfitRate: safeRate(totalProfit, totals.pricedCost),
    totalDayChange: totals.totalDayChange,
    totalDayChangeRate: safeRate(totals.totalDayChange, totals.prevValue),
    pricedCount: totals.pricedCount,
    missingCodes: totals.missingCodes,
  };
}

/**
 * 평가금액 기준 섹터 비중. 비중 내림차순으로 정렬해 돌려준다.
 *
 * 시세가 없는 종목은 조용히 빠진다. 평가금액을 모르면 비중을 매길 수 없기 때문이다.
 * 그래서 결과가 빈 배열인 것과 보유 종목이 없는 것은 다른 상황이다 — 호출부가
 * holdings.length를 함께 봐야 한다.
 */
export function calcSectorAllocation(holdings: Holding[], prices: PriceMap): AllocationSlice[] {
  const bySector = new Map<string, number>();
  let total = 0;

  for (const holding of holdings) {
    const metrics = calcHoldingMetrics(holding, prices[holding.code]);
    if (metrics === null) continue;

    bySector.set(holding.sector, (bySector.get(holding.sector) ?? 0) + metrics.marketValue);
    total += metrics.marketValue;
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

/** 평가금액 기준 종목 비중. 비중 내림차순. 시세가 없는 종목은 빠진다. */
export function calcHoldingAllocation(holdings: Holding[], prices: PriceMap): AllocationSlice[] {
  const priced = holdings.flatMap((holding) => {
    const metrics = calcHoldingMetrics(holding, prices[holding.code]);
    return metrics === null ? [] : [{ holding, marketValue: metrics.marketValue }];
  });

  const total = priced.reduce((sum, item) => sum + item.marketValue, 0);

  return priced
    .map(({ holding, marketValue }) => ({
      key: holding.code,
      label: holding.name,
      value: marketValue,
      ratio: safeRate(marketValue, total),
    }))
    .sort((a, b) => b.value - a.value);
}

/**
 * 가중평균 평단가. 물타기 시뮬레이터와 '추가 매수' 합산이 함께 쓴다.
 *
 *   newAvg = (baseQty × baseAvg + addQty × addPrice) / (baseQty + addQty)
 *
 * 평단가는 표시·저장 모두 원 단위 정수이므로 반올림은 여기서 한 번만 한다.
 * 총 수량이 0이면 나눌 것이 없으므로 baseAvgPrice를 그대로 돌려준다.
 */
export function calcWeightedAverage(
  baseQuantity: number,
  baseAvgPrice: number,
  addQuantity: number,
  addPrice: number,
): number {
  const totalQuantity = baseQuantity + addQuantity;
  if (totalQuantity === 0) return Math.round(baseAvgPrice);

  return Math.round((baseQuantity * baseAvgPrice + addQuantity * addPrice) / totalQuantity);
}

/**
 * 목표 평단가에 도달하기 위해 buyPrice에 추가 매수해야 하는 수량.
 *
 *   qty = ceil(보유수량 × (평단 − 목표) / (목표 − 매수가))
 *
 * 매수가는 현재가일 수도, 시뮬레이터에서 가정한 가격일 수도 있다. 시세(PriceSnapshot)가
 * 아니라 단가 하나만 필요하므로 그것만 받는다. 숫자 두 개를 나란히 받으면 순서가 뒤바뀌어도
 * 타입이 잡지 못하므로 이름 붙은 객체로 받는다.
 *
 * 다음은 null이다.
 * - 목표가가 현재 평단가 이상이거나 매수가 이하 (매수가보다 낮은 평단은 아무리 사도 만들 수 없다)
 * - 필요한 수량이나 금액이 안전한 정수 범위를 넘는다 (목표가가 매수가에 바짝 붙은 경우)
 */
export function calcQuantityForTargetAverage(
  holding: Holding,
  { buyPrice, targetAvg }: { buyPrice: number; targetAvg: number },
): number | null {
  if (!Number.isFinite(targetAvg)) return null;
  if (targetAvg >= holding.avgPrice) return null;
  if (targetAvg <= buyPrice) return null;

  const quantity = Math.ceil(
    (holding.quantity * (holding.avgPrice - targetAvg)) / (targetAvg - buyPrice),
  );
  if (!Number.isSafeInteger(quantity) || !Number.isSafeInteger(quantity * buyPrice)) return null;

  return quantity;
}

/** 현재가와 평단가 사이의 괴리율(%). 음수면 손실 구간이다. */
export function calcPriceGapRate(holding: Holding, price: PriceSnapshot): number {
  return safeRate(price.current - holding.avgPrice, holding.avgPrice);
}

/**
 * removedId를 지운 뒤 선택되어 있어야 할 종목 id.
 *
 * 선택 중이 아닌 종목이 지워졌다면 선택은 그대로 둔다. 선택 중인 종목이 지워졌다면
 * 삭제된 자리로 인접 행을 끌어온다(마지막 행이었으면 그 앞 행). 목록이 비면 null.
 *
 * @param holdings 삭제 **전** 목록
 */
export function pickNextSelectedId(
  holdings: Holding[],
  removedId: string,
  selectedId: string | null,
): string | null {
  const remaining = holdings.filter((h) => h.id !== removedId);
  if (remaining.length === 0) return null;

  // 지운 게 선택 대상이 아니면 선택을 건드릴 이유가 없다.
  if (selectedId !== null && selectedId !== removedId) {
    return remaining.some((h) => h.id === selectedId) ? selectedId : remaining[0].id;
  }

  const removedIndex = holdings.findIndex((h) => h.id === removedId);
  if (removedIndex === -1) return remaining[0].id;

  // 삭제 후 배열에서 같은 인덱스가 곧 '다음 행'이다. 범위를 벗어나면 앞 행으로.
  const nextIndex = Math.min(removedIndex, remaining.length - 1);
  return remaining[nextIndex].id;
}
