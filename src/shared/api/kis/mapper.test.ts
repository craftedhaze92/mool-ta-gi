import { describe, expect, it } from 'vitest';
import { QuoteMappingError, toQuote } from './mapper';
import type { KisMultiPriceRow } from './raw-types';

/** 상승 중인 삼성전자 형태의 행 */
const RISING: KisMultiPriceRow = {
  inter_shrn_iscd: '005930',
  inter_kor_isnm: '삼성전자',
  inter2_prpr: '78400',
  inter2_prdy_vrss: '1200',
  prdy_vrss_sign: '2',
  prdy_ctrt: '1.55',
  inter2_sdpr: '77200',
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

  it('종목코드는 응답이 아니라 요청 순서에서 받는다', () => {
    // 조회 실패 행은 inter_shrn_iscd까지 비어 오므로 응답을 신뢰할 수 없다.
    const quote = toQuote('000660', { ...RISING, inter_shrn_iscd: '' });
    expect(quote.code).toBe('000660');
  });

  it('하락(sign=5)이면 절댓값으로 온 전일 대비에 음수 부호를 붙인다', () => {
    const quote = toQuote('005930', {
      inter2_prpr: '71200',
      inter2_prdy_vrss: '3500', // 부호 없이 절댓값만 왔다
      prdy_vrss_sign: '5',
      prdy_ctrt: '4.69',
      inter2_sdpr: '74700',
    });

    expect(quote.change).toBe(-3500);
    expect(quote.changeRate).toBe(-4.69);
  });

  it('전일 대비가 이미 음수 문자열로 와도 부호를 두 번 뒤집지 않는다', () => {
    const quote = toQuote('005930', {
      inter2_prpr: '71200',
      inter2_prdy_vrss: '-3500',
      prdy_vrss_sign: '5',
      prdy_ctrt: '-4.69',
      inter2_sdpr: '74700',
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
      inter2_prpr: '254000',
      inter2_prdy_vrss: '0',
      prdy_vrss_sign: '3',
      prdy_ctrt: '0.00',
      inter2_sdpr: '254000',
    });

    expect(quote.change).toBe(0);
    expect(quote.changeRate).toBe(0);
    expect(quote.prevClose).toBe(254_000);
  });

  it('쉼표가 섞인 숫자를 읽는다', () => {
    expect(toQuote('005930', { ...RISING, inter2_prpr: '1,234,000' }).current).toBe(1_234_000);
  });

  it('기준가가 0이면 현재가 − 등락으로 역산한다', () => {
    expect(toQuote('005930', { ...RISING, inter2_sdpr: '0' }).prevClose).toBe(78_400 - 1200);
  });

  it('기준가 필드가 아예 없어도 역산한다', () => {
    const quote = toQuote('005930', {
      inter2_prpr: '71200',
      inter2_prdy_vrss: '3500',
      prdy_vrss_sign: '5',
      prdy_ctrt: '4.69',
    });

    expect(quote.prevClose).toBe(71_200 + 3500);
  });

  it('조회 실패 행(값이 전부 빈 문자열)은 던진다', () => {
    // KIS는 없는 종목코드에도 행은 돌려준다. 값이 비어 있는 것으로만 구분할 수 있다.
    const emptyRow: KisMultiPriceRow = {
      inter_shrn_iscd: '',
      inter_kor_isnm: '',
      inter2_prpr: '',
      inter2_prdy_vrss: '',
      prdy_vrss_sign: '',
      prdy_ctrt: '',
      inter2_sdpr: '',
    };

    expect(() => toQuote('999999', emptyRow)).toThrow(QuoteMappingError);
  });

  it('현재가가 숫자가 아니면 던진다', () => {
    expect(() => toQuote('005930', { ...RISING, inter2_prpr: '조회불가' })).toThrow(
      QuoteMappingError,
    );
  });

  it('전일 대비율이 비어 있어도 던진다', () => {
    expect(() => toQuote('005930', { ...RISING, prdy_ctrt: '' })).toThrow(QuoteMappingError);
  });

  it('빈 행이어도 아무 값이나 지어내지 않는다', () => {
    expect(() => toQuote('999999', {})).toThrow(QuoteMappingError);
  });
});
