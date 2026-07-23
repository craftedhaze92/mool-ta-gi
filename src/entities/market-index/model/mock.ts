import type { MarketIndex } from './types';

/** 목데이터. 현재 지수 기준. 다음 단계에서 시세 API로 교체할 자리다. */
export const MOCK_MARKET_INDICES: MarketIndex[] = [
  { name: 'KOSPI', value: 7096.89, change: 299.19, changeRate: 4.4 },
  { name: 'KOSDAQ', value: 790.28, change: 39.19, changeRate: 5.22 },
];
