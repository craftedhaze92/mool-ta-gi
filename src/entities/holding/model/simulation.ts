import type { Holding, PriceMap, SimulationInput, SimulationResult } from './types';

/** 매수가 대비 손익을 비교할 가정 주가 지점(%) */
const SCENARIO_CHANGES = [-10, 0, 10] as const;

/** 0으로 나누는 것을 막는다. 분모가 0이면 0을 돌려준다. */
function safeRate(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return (numerator / denominator) * 100;
}

/** 금액 계산 결과가 정밀도를 잃지 않는 범위인가. 넘어가면 원 단위가 틀어진다. */
function isSafeAmount(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER;
}

/**
 * 물타기 시뮬레이션.
 *
 * 추가 매수는 정수 주 단위다. 예산 모드는 예산 ÷ 매수가를 내림해 살 수 있는 만큼만 사고
 * 나머지를 남는 예산으로 돌려준다.
 *
 *   newAvg = (보유수량 × 평단 + 추가수량 × 매수가) / (보유수량 + 추가수량)
 *
 * 가정:
 * - 매수가(buyPrice)와 평가 시세(prices)를 분리한다. 매수가는 사용자가 가정한 가격일 수 있지만
 *   비중은 매수 전후 모두 현재 시세로 평가해야 비교가 공정하다.
 * - 추가 매수 자금은 외부에서 들어온다. 다른 종목을 팔아 마련하지 않는다.
 * - 평단은 반올림하지 않는다. 손익은 반올림한 평단이 아니라 투입금으로 계산하므로,
 *   여기서 반올림하면 표시 금액과 손익이 1원씩 어긋난다.
 * - 수수료·세금은 제외한다.
 *
 * 입력이 정수가 아니거나 음수면, 또는 금액이 안전한 정수 범위를 넘으면 null이다.
 * 화면은 null을 받으면 원인을 따로 안내한다.
 */
export function calcSimulation(
  holding: Holding,
  holdings: Holding[],
  prices: PriceMap,
  input: SimulationInput,
): SimulationResult | null {
  const { mode, amount, buyPrice } = input;

  if (!Number.isSafeInteger(amount) || amount < 0) return null;
  if (!Number.isSafeInteger(buyPrice) || buyPrice <= 0) return null;

  const quantity = mode === 'budget' ? Math.floor(amount / buyPrice) : amount;
  const requiredAmount = quantity * buyPrice;

  const beforeCost = holding.quantity * holding.avgPrice;
  const afterCost = beforeCost + requiredAmount;
  const totalQuantity = holding.quantity + quantity;

  const portfolioCost = holdings.reduce((sum, item) => sum + item.quantity * item.avgPrice, 0);
  const portfolioAfterCost = portfolioCost + requiredAmount;

  if (![requiredAmount, afterCost, totalQuantity, portfolioAfterCost].every(isSafeAmount)) {
    return null;
  }
  // 보유 0주에 0주를 더하면 평단을 정의할 수 없다
  if (totalQuantity === 0) return null;

  const newAvgPrice = afterCost / totalQuantity;

  return {
    quantity,
    requiredAmount,
    remainingBudget: mode === 'budget' ? amount - requiredAmount : null,
    beforeCost,
    afterCost,
    totalQuantity,
    newAvgPrice,
    avgChangeRate: safeRate(newAvgPrice - holding.avgPrice, holding.avgPrice),
    portfolioCost,
    portfolioAfterCost,
    allocation: calcAllocation(holding, holdings, prices, quantity),
    scenarios: SCENARIO_CHANGES.map((change) => {
      const price = Math.round(buyPrice * (1 + change / 100));

      return {
        change,
        price,
        beforeProfit: holding.quantity * price - beforeCost,
        afterProfit: totalQuantity * price - afterCost,
      };
    }),
  };
}

/**
 * 매수 전후의 종목 비중(%).
 *
 * 전후 모두 현재 시세로 평가한다. 추가 자금이 외부에서 들어오므로 매수 후 전체 평가금액은
 * '추가 수량 × 현재가'만큼 커진다.
 *
 * 시세가 하나라도 없으면 null이다. 빠진 종목을 0원으로 치면 분모가 작아져 비중이
 * 부풀려진다 — 틀린 숫자보다 '계산 불가'가 낫다.
 */
function calcAllocation(
  holding: Holding,
  holdings: Holding[],
  prices: PriceMap,
  addQuantity: number,
): SimulationResult['allocation'] {
  const current = prices[holding.code]?.current;
  if (current === undefined) return null;
  if (holdings.some((item) => prices[item.code] === undefined)) return null;

  const totalValue = holdings.reduce(
    (sum, item) => sum + item.quantity * (prices[item.code]?.current ?? 0),
    0,
  );
  if (totalValue <= 0) return null;

  return {
    before: ((holding.quantity * current) / totalValue) * 100,
    after:
      (((holding.quantity + addQuantity) * current) / (totalValue + addQuantity * current)) * 100,
  };
}
