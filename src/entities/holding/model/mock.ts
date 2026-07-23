import type { Holding } from './types';

/**
 * 최초 seed 데이터. 현재 시세를 기준으로 잡은 데모용 포트폴리오다.
 *
 * localStorage에 저장된 값이 없을 때만 스토어의 초기 상태로 쓰인다.
 * id는 SSR/테스트에서 값이 흔들리지 않도록 고정 문자열로 박아둔다.
 *
 * 값을 고를 때 지킨 것:
 *   - 손실·수익 종목을 섞는다. 첫 화면에 상승(빨강)과 하락(파랑)이 둘 다 나와야 한다.
 *   - 기본 선택 종목(삼성전자)은 손실 구간에 둔다. 물타기 시뮬레이터가 첫 화면부터
 *     의미 있게 동작해야 하기 때문이다.
 *   - 한 종목이 비중을 독식하지 않게 수량을 잡는다. 그러지 않으면 섹터 도넛이
 *     사실상 단색이 되어 차트 위젯이 죽는다. (현재 반도체 60 / 인터넷 20 / 자동차 20%)
 *
 * 이 값은 테스트가 참조하지 않는다. 시세를 갱신해도 테스트는 깨지지 않는다.
 * (테스트 픽스처는 holdings.fixture.ts에 따로 있다)
 */
export const MOCK_HOLDINGS: Holding[] = [
  {
    id: 'seed-005930',
    code: '005930',
    name: '삼성전자',
    sector: '반도체',
    quantity: 60,
    avgPrice: 300_000,
    currentPrice: 272_000,
    prevClose: 275_500,
  },
  {
    id: 'seed-000660',
    code: '000660',
    name: 'SK하이닉스',
    sector: '반도체',
    quantity: 5,
    avgPrice: 1_640_000,
    currentPrice: 1_944_000,
    prevClose: 1_920_000,
  },
  {
    id: 'seed-035420',
    code: '035420',
    name: 'NAVER',
    sector: '인터넷',
    quantity: 40,
    avgPrice: 259_000,
    currentPrice: 219_500,
    prevClose: 222_000,
  },
  {
    id: 'seed-005380',
    code: '005380',
    name: '현대차',
    sector: '자동차',
    quantity: 20,
    avgPrice: 404_000,
    currentPrice: 432_000,
    prevClose: 429_500,
  },
];
