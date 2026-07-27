import type { Quote } from '../quote-contract';
import type { KisInquirePriceOutput } from './raw-types';

/*
 * KIS 원문 → Quote 정규화.
 *
 * 이 파일만 'server-only'를 붙이지 않는다. 순수 변환 함수라 네트워크도 자격증명도
 * 건드리지 않고, 그래야 Vitest에서 단독으로 테스트할 수 있다.
 */

/** 값이 없거나 숫자로 읽을 수 없음. 해당 종목만 실패 처리된다. */
export class QuoteMappingError extends Error {
  constructor(field: string, raw: unknown) {
    super(`KIS 응답의 ${field}를 숫자로 읽을 수 없습니다: ${JSON.stringify(raw)}`);
    this.name = 'QuoteMappingError';
  }
}

/** KIS는 모든 수치를 문자열로 준다. 쉼표가 섞여 오는 필드가 있어 함께 제거한다. */
function num(raw: string | undefined, field: string): number {
  if (raw === undefined || raw.trim() === '') throw new QuoteMappingError(field, raw);

  const parsed = Number(raw.replace(/,/g, ''));
  if (!Number.isFinite(parsed)) throw new QuoteMappingError(field, raw);

  return parsed;
}

/**
 * 전일 대비 부호 코드를 -1 / 0 / 1로 바꾼다.
 * 1 상한 · 2 상승 · 3 보합 · 4 하한 · 5 하락.
 */
function signOf(raw: string | undefined): -1 | 0 | 1 {
  switch (raw) {
    case '1':
    case '2':
      return 1;
    case '4':
    case '5':
      return -1;
    default:
      // '3'(보합)과 알 수 없는 값은 0으로 본다. 아래에서 곱해지므로 등락이 0이 된다.
      return 0;
  }
}

/**
 * inquire-price 응답 하나를 Quote로 바꾼다.
 *
 * 부호 처리가 이 함수의 핵심이다. KIS의 prdy_vrss는 부호를 달고 오기도 하고 절댓값으로만
 * 오기도 한다. 어느 쪽이든 옳게 나오도록 절댓값을 취한 뒤 prdy_vrss_sign을 곱한다.
 *
 * prevClose는 stck_sdpr(기준가)를 쓴다. 값이 없거나 0이면 current - change로 역산한다
 * (신규상장 등 기준가가 비는 경우가 있다). 기준가와 전일 종가의 차이는 raw-types.ts 주석 참고.
 *
 * 숫자로 읽을 수 없으면 throw한다. 호출부가 종목 단위로 잡아 failed에 넣는다.
 */
export function toQuote(code: string, output: KisInquirePriceOutput): Quote {
  const current = num(output.stck_prpr, 'stck_prpr(현재가)');
  const sign = signOf(output.prdy_vrss_sign);

  const change = sign * Math.abs(num(output.prdy_vrss, 'prdy_vrss(전일 대비)'));
  const changeRate = sign * Math.abs(num(output.prdy_ctrt, 'prdy_ctrt(전일 대비율)'));

  const basePrice = output.stck_sdpr === undefined ? 0 : Number(output.stck_sdpr.replace(/,/g, ''));
  const prevClose = Number.isFinite(basePrice) && basePrice > 0 ? basePrice : current - change;

  return { code, current, prevClose, change, changeRate };
}
