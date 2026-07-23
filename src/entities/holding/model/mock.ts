import type { Holding } from './types';

/**
 * 최초 seed 데이터. 수치는 docs/design/v2 시안에서 그대로 가져왔다.
 *
 * localStorage에 저장된 값이 없을 때만 스토어의 초기 상태로 쓰인다.
 * id는 SSR/테스트에서 값이 흔들리지 않도록 고정 문자열로 박아둔다.
 */
export const MOCK_HOLDINGS: Holding[] = [
  {
    id: 'seed-005930',
    code: '005930',
    name: '삼성전자',
    sector: '반도체',
    quantity: 120,
    avgPrice: 78_400,
    currentPrice: 71_200,
    prevClose: 72_300,
  },
  {
    id: 'seed-000660',
    code: '000660',
    name: 'SK하이닉스',
    sector: '반도체',
    quantity: 25,
    avgPrice: 168_000,
    currentPrice: 199_500,
    prevClose: 198_000,
  },
  {
    id: 'seed-035420',
    code: '035420',
    name: 'NAVER',
    sector: '인터넷',
    quantity: 30,
    avgPrice: 215_000,
    currentPrice: 182_300,
    prevClose: 185_000,
  },
  {
    id: 'seed-005380',
    code: '005380',
    name: '현대차',
    sector: '자동차',
    quantity: 18,
    avgPrice: 242_000,
    currentPrice: 258_500,
    prevClose: 258_000,
  },
];
