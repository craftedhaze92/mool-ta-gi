import { describe, expect, it } from 'vitest';
import {
  calcAveraging,
  calcCostBasis,
  calcHoldingAllocation,
  calcHoldingMetrics,
  calcPortfolioSummary,
  calcPriceGapRate,
  calcQuantityForTargetAverage,
  calcSectorAllocation,
  calcWeightedAverage,
  pickNextSelectedId,
} from './calc';
import { HOLDING_FIXTURES, PRICE_FIXTURES } from './holdings.fixture';
import type { Holding, HoldingMetrics, PriceSnapshot } from './types';

const samsung = HOLDING_FIXTURES[0]; // 손실 구간
const hynix = HOLDING_FIXTURES[1]; // 수익 구간

/** 픽스처 종목의 시세. 없으면 픽스처가 깨진 것이므로 테스트에서 바로 터뜨린다. */
function priceOf(holding: Holding): PriceSnapshot {
  const price = PRICE_FIXTURES[holding.code];
  if (price === undefined) throw new Error(`PRICE_FIXTURES에 ${holding.code}가 없다`);
  return price;
}

/** 시세가 있는 종목의 지표. null 분기를 테스트마다 쓰지 않으려고 여기서 한 번만 좁힌다. */
function metricsOf(holding: Holding): HoldingMetrics {
  const metrics = calcHoldingMetrics(holding, priceOf(holding));
  expect(metrics).not.toBeNull();
  return metrics!;
}

describe('calcCostBasis', () => {
  it('시세 없이도 매입금액은 계산된다', () => {
    expect(calcCostBasis(samsung)).toBe(9_408_000); // 120 × 78,400
  });
});

describe('calcHoldingMetrics', () => {
  it('손실 종목의 지표를 계산한다', () => {
    const m = metricsOf(samsung);

    expect(m.costBasis).toBe(9_408_000); // 120 × 78,400
    expect(m.marketValue).toBe(8_544_000); // 120 × 71,200
    expect(m.profit).toBe(-864_000);
    expect(m.profitRate).toBeCloseTo(-9.1837, 3);
    expect(m.dayChange).toBe(-132_000); // 120 × (71,200 − 72,300)
  });

  it('수익 종목의 지표를 계산한다', () => {
    const m = metricsOf(hynix);

    expect(m.profit).toBe(787_500);
    expect(m.profitRate).toBeCloseTo(18.75, 5);
    expect(m.dayChange).toBe(37_500);
  });

  it('수량이 0이면 비율이 0이다', () => {
    const empty: Holding = { ...samsung, quantity: 0 };
    const m = calcHoldingMetrics(empty, priceOf(samsung));

    expect(m).not.toBeNull();
    expect(m!.profitRate).toBe(0);
    expect(m!.dayChangeRate).toBe(0);
  });

  it('시세가 없으면 null이다 (0을 채우면 ₩0과 구분되지 않는다)', () => {
    expect(calcHoldingMetrics(samsung, undefined)).toBeNull();
  });
});

describe('calcPortfolioSummary', () => {
  it('목데이터 전체를 합산한다', () => {
    const s = calcPortfolioSummary(HOLDING_FIXTURES, PRICE_FIXTURES);

    expect(s.totalCost).toBe(24_414_000);
    expect(s.pricedCost).toBe(24_414_000);
    expect(s.totalValue).toBe(23_653_500);
    expect(s.totalProfit).toBe(-760_500);
    expect(s.totalProfitRate).toBeCloseTo(-3.1149, 3);
    expect(s.totalDayChange).toBe(-166_500);
    expect(s.pricedCount).toBe(4);
    expect(s.missingCodes).toEqual([]);
  });

  it('빈 배열이면 전부 0이다', () => {
    const s = calcPortfolioSummary([], {});

    expect(s.totalValue).toBe(0);
    expect(s.totalProfitRate).toBe(0);
    expect(s.pricedCount).toBe(0);
  });

  it('시세가 하나도 없어도 매입금액은 살아 있다', () => {
    const s = calcPortfolioSummary(HOLDING_FIXTURES, {});

    expect(s.totalCost).toBe(24_414_000);
    expect(s.totalValue).toBe(0);
    expect(s.pricedCost).toBe(0);
    expect(s.pricedCount).toBe(0);
    expect(s.missingCodes).toHaveLength(4);
  });

  it('일부 시세가 빠지면 손익을 받은 종목 기준으로만 계산한다', () => {
    // 삼성전자(매입 9,408,000)를 빼고 나머지 3종목만 시세가 있는 상황
    const partial = { ...PRICE_FIXTURES, '005930': undefined };
    const s = calcPortfolioSummary(HOLDING_FIXTURES, partial);

    expect(s.pricedCount).toBe(3);
    expect(s.missingCodes).toEqual(['005930']);

    // 매입금액 전체는 그대로 보이되
    expect(s.totalCost).toBe(24_414_000);
    // 손익의 분모는 시세를 받은 3종목의 매입금액이다
    expect(s.pricedCost).toBe(24_414_000 - 9_408_000);
    expect(s.totalValue).toBe(23_653_500 - 8_544_000);
    expect(s.totalProfit).toBe(s.totalValue - s.pricedCost);

    // 103,500 / 15,006,000 = +0.69%
    // totalCost로 나눴다면 (15,109,500 − 24,414,000) / 24,414,000 = −38.1%로 폭락했을 값이다.
    expect(s.totalProfitRate).toBeCloseTo(0.6897, 3);
  });
});

describe('calcSectorAllocation', () => {
  it('섹터별로 묶고 비중 내림차순으로 정렬한다', () => {
    const slices = calcSectorAllocation(HOLDING_FIXTURES, PRICE_FIXTURES);

    expect(slices.map((s) => s.label)).toEqual(['반도체', '인터넷', '자동차']);
    expect(slices[0].value).toBe(8_544_000 + 4_987_500);
    expect(slices[0].ratio).toBeCloseTo(57.21, 1);
  });

  it('비중 합은 100%다', () => {
    const total = calcSectorAllocation(HOLDING_FIXTURES, PRICE_FIXTURES).reduce(
      (sum, s) => sum + s.ratio,
      0,
    );
    expect(total).toBeCloseTo(100, 6);
  });

  it('시세가 없는 종목은 빠지고 나머지 비중 합이 다시 100%가 된다', () => {
    const partial = { ...PRICE_FIXTURES, '005930': undefined };
    const slices = calcSectorAllocation(HOLDING_FIXTURES, partial);

    // 반도체에는 SK하이닉스만 남는다
    expect(slices.find((s) => s.label === '반도체')?.value).toBe(4_987_500);
    expect(slices.reduce((sum, s) => sum + s.ratio, 0)).toBeCloseTo(100, 6);
  });

  it('시세가 하나도 없으면 빈 배열이다', () => {
    expect(calcSectorAllocation(HOLDING_FIXTURES, {})).toEqual([]);
  });
});

describe('calcHoldingAllocation', () => {
  it('종목별 비중을 내림차순으로 돌려준다', () => {
    const slices = calcHoldingAllocation(HOLDING_FIXTURES, PRICE_FIXTURES);

    expect(slices.map((s) => s.label)).toEqual(['삼성전자', 'NAVER', 'SK하이닉스', '현대차']);
    expect(slices[0].ratio).toBeCloseTo(36.12, 1);
  });

  it('시세가 없는 종목은 목록에서 빠진다', () => {
    const partial = { ...PRICE_FIXTURES, '005930': undefined };
    const slices = calcHoldingAllocation(HOLDING_FIXTURES, partial);

    expect(slices.map((s) => s.label)).not.toContain('삼성전자');
    expect(slices).toHaveLength(3);
    expect(slices.reduce((sum, s) => sum + s.ratio, 0)).toBeCloseTo(100, 6);
  });
});

describe('calcAveraging', () => {
  it('추가 매수 후 평단가가 내려간다', () => {
    const r = calcAveraging(samsung, priceOf(samsung), 30);

    // (120×78,400 + 30×71,200) / 150 = 76,960
    expect(r.newAvgPrice).toBeCloseTo(76_960, 6);
    expect(r.requiredAmount).toBe(2_136_000);
    expect(r.avgChangeRate).toBeCloseTo(-1.8367, 3);
    expect(r.breakEvenRate).toBeCloseTo(8.0899, 3);
  });

  it('추가 수량이 0이면 평단가가 그대로다', () => {
    const r = calcAveraging(samsung, priceOf(samsung), 0);

    expect(r.newAvgPrice).toBe(samsung.avgPrice);
    expect(r.requiredAmount).toBe(0);
    expect(r.avgChangeRate).toBe(0);
  });

  it('현재가가 평단보다 높으면 평단이 오히려 올라간다', () => {
    // 현대차: 평단 242,000 < 현재가 258,500
    const hyundai = HOLDING_FIXTURES[3];
    const r = calcAveraging(hyundai, priceOf(hyundai), 30);

    expect(r.newAvgPrice).toBeGreaterThan(hyundai.avgPrice);
    expect(r.avgChangeRate).toBeGreaterThan(0);
  });

  it('이미 수익권이면 손익분기 상승률이 음수다', () => {
    const r = calcAveraging(hynix, priceOf(hynix), 10);
    expect(r.breakEvenRate).toBeLessThan(0);
  });

  it('음수 수량은 0으로 취급한다', () => {
    expect(calcAveraging(samsung, priceOf(samsung), -5).requiredAmount).toBe(0);
  });
});

describe('calcQuantityForTargetAverage', () => {
  const samsungPrice = priceOf(samsung);

  it('목표 평단가에 필요한 수량을 역산한다', () => {
    // 120 × (78,400 − 76,000) / (76,000 − 71,200) = 60
    expect(calcQuantityForTargetAverage(samsung, samsungPrice, 76_000)).toBe(60);
  });

  it('결과를 올림해서 목표를 확실히 넘긴다', () => {
    const qty = calcQuantityForTargetAverage(samsung, samsungPrice, 77_000);
    expect(qty).not.toBeNull();
    expect(calcAveraging(samsung, samsungPrice, qty!).newAvgPrice).toBeLessThanOrEqual(77_000);
  });

  it('목표가가 현재 평단가 이상이면 도달 불가', () => {
    expect(calcQuantityForTargetAverage(samsung, samsungPrice, 78_400)).toBeNull();
    expect(calcQuantityForTargetAverage(samsung, samsungPrice, 80_000)).toBeNull();
  });

  it('목표가가 현재가 이하면 도달 불가', () => {
    expect(calcQuantityForTargetAverage(samsung, samsungPrice, 71_200)).toBeNull();
    expect(calcQuantityForTargetAverage(samsung, samsungPrice, 60_000)).toBeNull();
  });

  it('숫자가 아니면 null', () => {
    expect(calcQuantityForTargetAverage(samsung, samsungPrice, Number.NaN)).toBeNull();
  });
});

describe('calcPriceGapRate', () => {
  it('손실 구간은 음수, 수익 구간은 양수다', () => {
    expect(calcPriceGapRate(samsung, priceOf(samsung))).toBeCloseTo(-9.1837, 3);
    expect(calcPriceGapRate(hynix, priceOf(hynix))).toBeCloseTo(18.75, 5);
  });
});

describe('calcWeightedAverage', () => {
  it('수량으로 가중한 평균 단가를 낸다', () => {
    // (120×78,400 + 30×71,200) / 150 = 76,960
    expect(calcWeightedAverage(120, 78_400, 30, 71_200)).toBe(76_960);
  });

  it('기존 수량이 0이면 추가 단가가 그대로 평단이 된다', () => {
    expect(calcWeightedAverage(0, 78_400, 10, 71_200)).toBe(71_200);
  });

  it('추가 수량이 0이면 기존 평단이 유지된다', () => {
    expect(calcWeightedAverage(120, 78_400, 0, 71_200)).toBe(78_400);
  });

  it('양쪽 수량이 모두 0이면 기존 평단을 그대로 돌려준다', () => {
    expect(calcWeightedAverage(0, 78_400, 0, 71_200)).toBe(78_400);
  });

  it('단가가 같으면 아무리 합산해도 평단이 변하지 않는다', () => {
    expect(calcWeightedAverage(120, 50_000, 999, 50_000)).toBe(50_000);
  });

  it('원 단위로 반올림한다', () => {
    // (1×100 + 2×101) / 3 = 100.666… → 101
    expect(calcWeightedAverage(1, 100, 2, 101)).toBe(101);
    // (1×100 + 1×101) / 2 = 100.5 → 101 (.5는 올림)
    expect(calcWeightedAverage(1, 100, 1, 101)).toBe(101);
    // (3×100 + 1×101) / 4 = 100.25 → 100
    expect(calcWeightedAverage(3, 100, 1, 101)).toBe(100);
  });
});

describe('pickNextSelectedId', () => {
  const [a, b, c] = HOLDING_FIXTURES;
  const list = [a, b, c];

  it('선택 중이 아닌 종목을 지우면 선택은 그대로다', () => {
    expect(pickNextSelectedId(list, a.id, b.id)).toBe(b.id);
    expect(pickNextSelectedId(list, c.id, b.id)).toBe(b.id);
  });

  it('선택 중인 종목을 지우면 뒤 종목으로 옮겨간다', () => {
    expect(pickNextSelectedId(list, a.id, a.id)).toBe(b.id);
    expect(pickNextSelectedId(list, b.id, b.id)).toBe(c.id);
  });

  it('마지막 종목을 지우면 앞 종목으로 옮겨간다', () => {
    expect(pickNextSelectedId(list, c.id, c.id)).toBe(b.id);
  });

  it('하나 남은 종목을 지우면 선택할 것이 없다', () => {
    expect(pickNextSelectedId([a], a.id, a.id)).toBeNull();
  });

  it('선택 id가 목록에 없으면 첫 종목으로 떨어진다', () => {
    expect(pickNextSelectedId(list, a.id, 'unknown')).toBe(b.id);
    expect(pickNextSelectedId(list, a.id, null)).toBe(b.id);
  });
});
