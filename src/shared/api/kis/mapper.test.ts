import { describe, expect, it } from 'vitest';
import { QuoteMappingError, toQuote } from './mapper';
import type { KisInquirePriceOutput } from './raw-types';

/** 상승 중인 삼성전자 형태의 응답 */
const RISING: KisInquirePriceOutput = {
  stck_prpr: '78400',
  prdy_vrss: '1200',
  prdy_vrss_sign: '2',
  prdy_ctrt: '1.55',
  stck_sdpr: '77200',
};

describe('toQuote', () => {
  it('문자열 숫자를 number로 정규화한다', () => {
    expect(toQuote('005930', RISING)).toEqual({
      code: '005930',
      current: 78_400,
      prevClose: 77_200,
      change: 1200,
      changeRate: 1.55,
    });
  });

  it('하락(sign=5)이면 절댓값으로 온 전일 대비에 음수 부호를 붙인다', () => {
    const quote = toQuote('005930', {
      stck_prpr: '71200',
      prdy_vrss: '3500', // 부호 없이 절댓값만 왔다
      prdy_vrss_sign: '5',
      prdy_ctrt: '4.69',
      stck_sdpr: '74700',
    });

    expect(quote.change).toBe(-3500);
    expect(quote.changeRate).toBe(-4.69);
  });

  it('전일 대비가 이미 음수 문자열로 와도 부호를 두 번 뒤집지 않는다', () => {
    const quote = toQuote('005930', {
      stck_prpr: '71200',
      prdy_vrss: '-3500',
      prdy_vrss_sign: '5',
      prdy_ctrt: '-4.69',
      stck_sdpr: '74700',
    });

    expect(quote.change).toBe(-3500);
    expect(quote.changeRate).toBe(-4.69);
  });

  it('상한가(sign=1)와 하한가(sign=4)도 각각 상승·하락으로 본다', () => {
    expect(toQuote('000000', { ...RISING, prdy_vrss_sign: '1' }).change).toBe(1200);
    expect(toQuote('000000', { ...RISING, prdy_vrss_sign: '4' }).change).toBe(-1200);
  });

  it('보합(sign=3)이면 등락이 0이다', () => {
    const quote = toQuote('005930', {
      stck_prpr: '78400',
      prdy_vrss: '0',
      prdy_vrss_sign: '3',
      prdy_ctrt: '0.00',
      stck_sdpr: '78400',
    });

    expect(quote.change).toBe(0);
    expect(quote.changeRate).toBe(0);
    expect(quote.prevClose).toBe(78_400);
  });

  it('쉼표가 섞인 숫자를 읽는다', () => {
    expect(toQuote('005930', { ...RISING, stck_prpr: '1,234,000' }).current).toBe(1_234_000);
  });

  it('기준가가 0이면 현재가 − 등락으로 역산한다', () => {
    const quote = toQuote('005930', { ...RISING, stck_sdpr: '0' });
    expect(quote.prevClose).toBe(78_400 - 1200);
  });

  it('기준가 필드가 아예 없어도 역산한다', () => {
    const quote = toQuote('005930', {
      stck_prpr: '71200',
      prdy_vrss: '3500',
      prdy_vrss_sign: '5',
      prdy_ctrt: '4.69',
    });

    expect(quote.prevClose).toBe(71_200 + 3500);
  });

  it('현재가가 빈 문자열이면 던진다 (해당 종목만 실패로 떨어진다)', () => {
    expect(() => toQuote('005930', { ...RISING, stck_prpr: '' })).toThrow(QuoteMappingError);
  });

  it('현재가가 숫자가 아니면 던진다', () => {
    expect(() => toQuote('005930', { ...RISING, stck_prpr: '조회불가' })).toThrow(
      QuoteMappingError,
    );
  });

  it('전일 대비율이 비어 있어도 던진다', () => {
    expect(() => toQuote('005930', { ...RISING, prdy_ctrt: '' })).toThrow(QuoteMappingError);
  });
});
