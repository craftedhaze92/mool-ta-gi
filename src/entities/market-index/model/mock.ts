import type { MarketIndex } from './types';

/** 목데이터. 수치는 docs/design/v2 시안 그대로. */
export const MOCK_MARKET_INDICES: MarketIndex[] = [
  { name: 'KOSPI', value: 3214.56, change: -18.24, changeRate: -0.56 },
  { name: 'KOSDAQ', value: 912.34, change: 4.12, changeRate: 0.45 },
];
