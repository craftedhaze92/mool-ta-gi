import { describe, expect, it } from 'vitest';
import {
  calcAveraging,
  calcHoldingAllocation,
  calcHoldingMetrics,
  calcPortfolioSummary,
  calcPriceGapRate,
  calcQuantityForTargetAverage,
  calcSectorAllocation,
} from './calc';
import { MOCK_HOLDINGS } from './mock';
import type { Holding } from './types';

const samsung = MOCK_HOLDINGS[0]; // 손실 구간
const hynix = MOCK_HOLDINGS[1]; // 수익 구간

describe('calcHoldingMetrics', () => {
  it('손실 종목의 지표를 계산한다', () => {
    const m = calcHoldingMetrics(samsung);

    expect(m.costBasis).toBe(9_408_000); // 120 × 78,400
    expect(m.marketValue).toBe(8_544_000); // 120 × 71,200
    expect(m.profit).toBe(-864_000);
    expect(m.profitRate).toBeCloseTo(-9.1837, 3);
    expect(m.dayChange).toBe(-132_000); // 120 × (71,200 − 72,300)
  });

  it('수익 종목의 지표를 계산한다', () => {
    const m = calcHoldingMetrics(hynix);

    expect(m.profit).toBe(787_500);
    expect(m.profitRate).toBeCloseTo(18.75, 5);
    expect(m.dayChange).toBe(37_500);
  });

  it('수량이 0이면 비율이 0이다', () => {
    const empty: Holding = { ...samsung, quantity: 0 };
    const m = calcHoldingMetrics(empty);

    expect(m.profitRate).toBe(0);
    expect(m.dayChangeRate).toBe(0);
  });
});

describe('calcPortfolioSummary', () => {
  it('목데이터 전체를 합산한다', () => {
    const s = calcPortfolioSummary(MOCK_HOLDINGS);

    expect(s.totalCost).toBe(24_414_000);
    expect(s.totalValue).toBe(23_653_500);
    expect(s.totalProfit).toBe(-760_500);
    expect(s.totalProfitRate).toBeCloseTo(-3.1149, 3);
    expect(s.totalDayChange).toBe(-166_500);
  });

  it('빈 배열이면 전부 0이다', () => {
    const s = calcPortfolioSummary([]);

    expect(s.totalValue).toBe(0);
    expect(s.totalProfitRate).toBe(0);
  });
});

describe('calcSectorAllocation', () => {
  it('섹터별로 묶고 비중 내림차순으로 정렬한다', () => {
    const slices = calcSectorAllocation(MOCK_HOLDINGS);

    expect(slices.map((s) => s.label)).toEqual(['반도체', '인터넷', '자동차']);
    expect(slices[0].value).toBe(8_544_000 + 4_987_500);
    expect(slices[0].ratio).toBeCloseTo(57.21, 1);
  });

  it('비중 합은 100%다', () => {
    const total = calcSectorAllocation(MOCK_HOLDINGS).reduce((sum, s) => sum + s.ratio, 0);
    expect(total).toBeCloseTo(100, 6);
  });
});

describe('calcHoldingAllocation', () => {
  it('종목별 비중을 내림차순으로 돌려준다', () => {
    const slices = calcHoldingAllocation(MOCK_HOLDINGS);

    expect(slices.map((s) => s.label)).toEqual(['삼성전자', 'NAVER', 'SK하이닉스', '현대차']);
    expect(slices[0].ratio).toBeCloseTo(36.12, 1);
  });
});

describe('calcAveraging', () => {
  it('추가 매수 후 평단가가 내려간다', () => {
    const r = calcAveraging(samsung, 30);

    // (120×78,400 + 30×71,200) / 150 = 76,960
    expect(r.newAvgPrice).toBeCloseTo(76_960, 6);
    expect(r.requiredAmount).toBe(2_136_000);
    expect(r.avgDropRate).toBeCloseTo(1.8367, 3);
    expect(r.breakEvenRate).toBeCloseTo(8.0899, 3);
  });

  it('추가 수량이 0이면 평단가가 그대로다', () => {
    const r = calcAveraging(samsung, 0);

    expect(r.newAvgPrice).toBe(samsung.avgPrice);
    expect(r.requiredAmount).toBe(0);
    expect(r.avgDropRate).toBe(0);
  });

  it('이미 수익권이면 손익분기 상승률이 음수다', () => {
    const r = calcAveraging(hynix, 10);
    expect(r.breakEvenRate).toBeLessThan(0);
  });

  it('음수 수량은 0으로 취급한다', () => {
    expect(calcAveraging(samsung, -5).requiredAmount).toBe(0);
  });
});

describe('calcQuantityForTargetAverage', () => {
  it('목표 평단가에 필요한 수량을 역산한다', () => {
    // 120 × (78,400 − 76,000) / (76,000 − 71,200) = 60
    expect(calcQuantityForTargetAverage(samsung, 76_000)).toBe(60);
  });

  it('결과를 올림해서 목표를 확실히 넘긴다', () => {
    const qty = calcQuantityForTargetAverage(samsung, 77_000);
    expect(qty).not.toBeNull();
    expect(calcAveraging(samsung, qty!).newAvgPrice).toBeLessThanOrEqual(77_000);
  });

  it('목표가가 현재 평단가 이상이면 도달 불가', () => {
    expect(calcQuantityForTargetAverage(samsung, 78_400)).toBeNull();
    expect(calcQuantityForTargetAverage(samsung, 80_000)).toBeNull();
  });

  it('목표가가 현재가 이하면 도달 불가', () => {
    expect(calcQuantityForTargetAverage(samsung, 71_200)).toBeNull();
    expect(calcQuantityForTargetAverage(samsung, 60_000)).toBeNull();
  });

  it('숫자가 아니면 null', () => {
    expect(calcQuantityForTargetAverage(samsung, Number.NaN)).toBeNull();
  });
});

describe('calcPriceGapRate', () => {
  it('손실 구간은 음수, 수익 구간은 양수다', () => {
    expect(calcPriceGapRate(samsung)).toBeCloseTo(-9.1837, 3);
    expect(calcPriceGapRate(hynix)).toBeCloseTo(18.75, 5);
  });
});
