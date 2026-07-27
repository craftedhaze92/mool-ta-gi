import { describe, expect, it } from 'vitest';
import { toMarketIndex } from './index-mapper';
import { QuoteMappingError } from './mapper';
import type { KisIndexPriceOutput } from './raw-types';

/** 상승 중인 KOSPI 형태의 응답 */
const RISING: KisIndexPriceOutput = {
  bstp_nmix_prpr: '2712.14',
  bstp_nmix_prdy_vrss: '18.52',
  prdy_vrss_sign: '2',
  bstp_nmix_prdy_ctrt: '0.69',
};

describe('toMarketIndex', () => {
  it('문자열 숫자를 number로 정규화한다', () => {
    expect(toMarketIndex('0001', 'KOSPI', RISING)).toEqual({
      code: '0001',
      name: 'KOSPI',
      value: 2712.14,
      change: 18.52,
      changeRate: 0.69,
    });
  });

  it('코드와 이름은 응답이 아니라 요청 값에서 받는다', () => {
    // KIS 지수 응답에는 지수를 식별할 필드가 없다.
    const index = toMarketIndex('1001', 'KOSDAQ', RISING);
    expect(index.code).toBe('1001');
    expect(index.name).toBe('KOSDAQ');
  });

  it('하락(sign=5)이면 절댓값으로 온 전일 대비에 음수 부호를 붙인다', () => {
    const index = toMarketIndex('0001', 'KOSPI', {
      bstp_nmix_prpr: '2650.00',
      bstp_nmix_prdy_vrss: '62.14', // 부호 없이 절댓값만 왔다
      prdy_vrss_sign: '5',
      bstp_nmix_prdy_ctrt: '2.29',
    });

    expect(index.change).toBe(-62.14);
    expect(index.changeRate).toBe(-2.29);
  });

  it('전일 대비가 이미 음수 문자열로 와도 부호를 두 번 뒤집지 않는다', () => {
    const index = toMarketIndex('0001', 'KOSPI', {
      bstp_nmix_prpr: '2650.00',
      bstp_nmix_prdy_vrss: '-62.14',
      prdy_vrss_sign: '5',
      bstp_nmix_prdy_ctrt: '-2.29',
    });

    expect(index.change).toBe(-62.14);
    expect(index.changeRate).toBe(-2.29);
  });

  it('보합(sign=3)이면 등락이 0이다', () => {
    // 장 시작 전 실제 응답 형태다.
    const index = toMarketIndex('0001', 'KOSPI', {
      bstp_nmix_prpr: '6755.75',
      bstp_nmix_prdy_vrss: '0.00',
      prdy_vrss_sign: '3',
      bstp_nmix_prdy_ctrt: '0.00',
    });

    expect(index.value).toBe(6755.75);
    expect(index.change).toBe(0);
    expect(index.changeRate).toBe(0);
  });

  it('쉼표가 섞인 숫자를 읽는다', () => {
    expect(toMarketIndex('0001', 'KOSPI', { ...RISING, bstp_nmix_prpr: '6,755.75' }).value).toBe(
      6755.75,
    );
  });

  it('현재지수가 비어 있으면 던진다 (해당 지수만 실패로 떨어진다)', () => {
    expect(() => toMarketIndex('0001', 'KOSPI', { ...RISING, bstp_nmix_prpr: '' })).toThrow(
      QuoteMappingError,
    );
  });

  it('빈 응답이어도 아무 값이나 지어내지 않는다', () => {
    expect(() => toMarketIndex('0001', 'KOSPI', {})).toThrow(QuoteMappingError);
  });
});
