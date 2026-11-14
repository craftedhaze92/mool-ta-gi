import { describe, expect, it } from 'vitest';
import { calcSimulation } from './simulation';
import type { Holding } from './types';

const holding: Holding = {
  id: 'a',
  code: '005930',
  name: '삼성전자',
  sector: '전기·전자',
  quantity: 100,
  avgPrice: 1000,
};
const other: Holding = { ...holding, id: 'b', code: '000660', quantity: 100 };
const prices = {
  '005930': { current: 800, prevClose: 800 },
  '000660': { current: 800, prevClose: 800 },
};
const calculate = (amount: number, buyPrice = 800, mode: 'quantity' | 'budget' = 'quantity') =>
  calcSimulation(holding, [holding, other], prices, { amount, buyPrice, mode });

describe('calcSimulation', () => {
  it('예산에서 정수 수량과 잔액을 계산한다', () => {
    expect(calculate(10000, 800, 'budget')).toMatchObject({
      quantity: 12,
      requiredAmount: 9600,
      remainingBudget: 400,
    });
    expect(calculate(799, 800, 'budget')).toMatchObject({
      quantity: 0,
      remainingBudget: 799,
      newAvgPrice: 1000,
    });
  });
  it('가정 매수가와 현재 평가 시세를 분리한다', () => {
    const result = calculate(100, 600)!;
    expect(result.newAvgPrice).toBe(800);
    // 평단 1,000 → 800: −20%
    expect(result.avgChangeRate).toBeCloseTo(-20);
    expect(result.afterCost).toBe(160000);
    expect(result.portfolioAfterCost).toBe(260000);
    expect(result.allocation?.before).toBe(50);
    expect(result.allocation?.after).toBeCloseTo(66.6666667);
    expect(result.scenarios[1]).toMatchObject({
      price: 600,
      beforeProfit: -40000,
      afterProfit: -40000,
    });
    expect(result.scenarios[0].afterProfit).toBeLessThan(result.scenarios[0].beforeProfit);
  });
  it('0주와 200주 초과도 처리하고 잘못된 수치는 거절한다', () => {
    expect(calculate(0)?.afterCost).toBe(100000);
    expect(calculate(300)?.quantity).toBe(300);
    for (const amount of [-1, 1.5, Infinity, NaN, Number.MAX_SAFE_INTEGER])
      expect(calculate(amount)).toBeNull();
    for (const price of [0, -1, 1.5, Infinity, NaN]) expect(calculate(30, price)).toBeNull();
  });
  it('시세 누락 시 비중만 계산하지 않고 원금과 시나리오는 유지한다', () => {
    const result = calcSimulation(
      holding,
      [holding, other],
      {},
      { amount: 10, buyPrice: 800, mode: 'quantity' },
    );
    expect(result?.allocation).toBeNull();
    expect(result?.afterCost).toBe(108000);
    expect(result?.scenarios).toHaveLength(3);
  });
});
