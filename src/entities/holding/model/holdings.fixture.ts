import type { Holding, PriceMap } from './types';

/**
 * 테스트 전용 고정 픽스처. 프로덕션 코드에서 쓰지 않으며 index.ts로도 내보내지 않는다.
 *
 * seed(mock.ts)와 일부러 분리했다. seed는 데모 화면에 보일 값이라 시세가 바뀔 때마다
 * 갱신되지만, 테스트는 손으로 검산한 수치 위에 서 있어야 한다. 둘을 한 배열로 겸하면
 * 시세를 고칠 때마다 무관한 단언이 우수수 깨진다.
 *
 * 그래서 값 자체는 '검산하기 좋은' 기준으로 고른다 (아래 수치는 v2 디자인 시안에서 왔다):
 *   - 삼성전자: 손실 구간. 120 × 78,400 매입 → 120 × 71,200 평가 = −864,000
 *   - SK하이닉스: 수익 구간. +787,500 (+18.75%)
 *   - NAVER: 손실 구간 / 현대차: 수익 구간
 * 이 값을 바꾸면 calc.test.ts의 기대값을 함께 다시 계산해야 한다.
 */
export const HOLDING_FIXTURES: Holding[] = [
  {
    id: 'seed-005930',
    code: '005930',
    name: '삼성전자',
    sector: '전기·전자',
    quantity: 120,
    avgPrice: 78_400,
  },
  {
    id: 'seed-000660',
    code: '000660',
    name: 'SK하이닉스',
    sector: '전기·전자',
    quantity: 25,
    avgPrice: 168_000,
  },
  {
    id: 'seed-035420',
    code: '035420',
    name: 'NAVER',
    sector: 'IT 서비스',
    quantity: 30,
    avgPrice: 215_000,
  },
  {
    id: 'seed-005380',
    code: '005380',
    name: '현대차',
    sector: '운송장비·부품',
    quantity: 18,
    avgPrice: 242_000,
  },
];

/**
 * HOLDING_FIXTURES에 물릴 시세.
 *
 * 시세가 Holding에서 떨어져 나오기 전의 currentPrice·prevClose를 그대로 옮겨 왔다.
 * 덕분에 calc.test.ts의 기대값(−864,000 / +787,500 / 76,960 …)이 하나도 바뀌지 않는다.
 */
export const PRICE_FIXTURES: PriceMap = {
  '005930': { current: 71_200, prevClose: 72_300 },
  '000660': { current: 199_500, prevClose: 198_000 },
  '035420': { current: 182_300, prevClose: 185_000 },
  '005380': { current: 258_500, prevClose: 258_000 },
};
