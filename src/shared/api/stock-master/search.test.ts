import { describe, expect, it } from 'vitest';
import type { Stock } from '../stock-search-contract';
import { createStockIndex } from './search';

const STOCKS: Stock[] = [
  { code: '000810', name: '삼성화재', market: 'KOSPI' },
  { code: '005930', name: '삼성전자', market: 'KOSPI' },
  { code: '005935', name: '삼성전자우', market: 'KOSPI' },
  { code: '009150', name: '삼성전기', market: 'KOSPI' },
  { code: '000660', name: 'SK하이닉스', market: 'KOSPI' },
  { code: '123456', name: '한국삼성테크', market: 'KOSDAQ' },
];

const names = (stocks: Stock[]) => stocks.map((s) => s.name);

describe('createStockIndex', () => {
  const index = createStockIndex(STOCKS);

  it('이름이 앞부분부터 맞는 종목이 중간에 포함된 종목보다 먼저 온다', () => {
    const result = names(index.search('삼성'));

    expect(result.at(-1)).toBe('한국삼성테크');
    expect(result).toHaveLength(5);
  });

  it('같은 등급에서는 이름이 짧은 종목이 먼저다', () => {
    expect(names(index.search('삼성전자'))).toEqual(['삼성전자', '삼성전자우']);
  });

  it('공백과 영문 대소문자를 무시한다', () => {
    expect(names(index.search('sk 하이'))).toEqual(['SK하이닉스']);
  });

  it('숫자로 종목코드 앞자리를 찾는다', () => {
    expect(names(index.search('00593'))).toEqual(['삼성전자', '삼성전자우']);
    expect(names(index.search('005930'))).toEqual(['삼성전자']);
  });

  it('빈 검색어는 아무것도 돌려주지 않는다', () => {
    expect(index.search('   ')).toEqual([]);
  });

  it('결과 수를 limit으로 자른다', () => {
    expect(index.search('삼성', 2)).toHaveLength(2);
  });
});
