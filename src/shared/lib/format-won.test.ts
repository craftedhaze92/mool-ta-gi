import { describe, expect, it } from 'vitest';
import {
  formatPercent,
  formatQuantity,
  formatSignedWon,
  formatWon,
  formatWonCompact,
} from './format-won';

const MINUS = '−';

describe('formatWon', () => {
  it('천 단위 콤마와 ₩ 기호를 붙인다', () => {
    expect(formatWon(1234000)).toBe('₩1,234,000');
    expect(formatWon(0)).toBe('₩0');
    expect(formatWon(999)).toBe('₩999');
  });

  it('음수는 U+2212 부호를 ₩ 앞에 붙인다', () => {
    expect(formatWon(-1560000)).toBe(`${MINUS}₩1,560,000`);
  });

  it('소수는 반올림한다', () => {
    expect(formatWon(1234.6)).toBe('₩1,235');
  });
});

describe('formatSignedWon', () => {
  it('양수에도 부호를 붙인다', () => {
    expect(formatSignedWon(787500)).toBe('+₩787,500');
  });

  it('음수는 U+2212를 쓴다', () => {
    expect(formatSignedWon(-864000)).toBe(`${MINUS}₩864,000`);
  });

  it('0은 부호 없이 표시한다', () => {
    expect(formatSignedWon(0)).toBe('₩0');
  });
});

describe('formatWonCompact', () => {
  it('1만 미만은 축약하지 않는다', () => {
    expect(formatWonCompact(0)).toBe('₩0');
    expect(formatWonCompact(9999)).toBe('₩9,999');
  });

  it('1만 이상 1억 미만은 만 단위로 축약한다', () => {
    expect(formatWonCompact(10000)).toBe('1만원');
    expect(formatWonCompact(30992000)).toBe('3,099만원');
    expect(formatWonCompact(12340000)).toBe('1,234만원');
  });

  it('반올림이 1억에 닿으면 억 표기로 넘어간다', () => {
    expect(formatWonCompact(99999999)).toBe('1억원');
  });

  it('1억 이상은 억 단위 소수 1자리로 축약한다', () => {
    expect(formatWonCompact(100000000)).toBe('1억원');
    expect(formatWonCompact(130000000)).toBe('1.3억원');
    expect(formatWonCompact(200000000)).toBe('2억원');
  });

  it('음수도 축약한다', () => {
    expect(formatWonCompact(-30992000)).toBe(`${MINUS}3,099만원`);
  });
});

describe('formatPercent', () => {
  it('기본은 소수 2자리, 양수에 부호를 붙이지 않는다', () => {
    expect(formatPercent(4.79)).toBe('4.79%');
    expect(formatPercent(18.754)).toBe('18.75%');
  });

  it('signed 옵션이면 양수에 +를 붙인다', () => {
    expect(formatPercent(18.75, { signed: true })).toBe('+18.75%');
    expect(formatPercent(0, { signed: true })).toBe('0.00%');
  });

  it('음수는 U+2212를 쓴다', () => {
    expect(formatPercent(-9.184)).toBe(`${MINUS}9.18%`);
  });

  it('digits 옵션으로 자릿수를 바꾼다', () => {
    expect(formatPercent(-0.56, { digits: 1 })).toBe(`${MINUS}0.6%`);
  });
});

describe('formatQuantity', () => {
  it('수량에 주 단위를 붙인다', () => {
    expect(formatQuantity(120)).toBe('120주');
    expect(formatQuantity(1200)).toBe('1,200주');
  });
});
