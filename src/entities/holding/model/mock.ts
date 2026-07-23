import type { Holding } from './types';

/**
 * 목데이터. 수치는 docs/design/v2 시안에서 그대로 가져왔다.
 * 다음 단계에서 실제 시세 API로 교체된다.
 */
export const MOCK_HOLDINGS: Holding[] = [
  {
    code: '005930',
    name: '삼성전자',
    sector: '반도체',
    quantity: 120,
    avgPrice: 78_400,
    currentPrice: 71_200,
    prevClose: 72_300,
  },
  {
    code: '000660',
    name: 'SK하이닉스',
    sector: '반도체',
    quantity: 25,
    avgPrice: 168_000,
    currentPrice: 199_500,
    prevClose: 198_000,
  },
  {
    code: '035420',
    name: 'NAVER',
    sector: '인터넷',
    quantity: 30,
    avgPrice: 215_000,
    currentPrice: 182_300,
    prevClose: 185_000,
  },
  {
    code: '005380',
    name: '현대차',
    sector: '자동차',
    quantity: 18,
    avgPrice: 242_000,
    currentPrice: 258_500,
    prevClose: 258_000,
  },
];
