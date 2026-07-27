import type { Quote } from '../quote-contract';
import type { KisMultiPriceRow } from './raw-types';

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

/**
 * KIS는 모든 수치를 문자열로 준다. 쉼표가 섞여 오는 필드가 있어 함께 제거한다.
 *
 * 지수 매퍼(index-mapper.ts)도 같은 규칙을 쓰므로 export한다. 두 벌로 두면 한쪽만 고치는
 * 실수가 난다.
 */
export function num(raw: string | undefined, field: string): number {
  if (raw === undefined || raw.trim() === '') throw new QuoteMappingError(field, raw);

  const parsed = Number(raw.replace(/,/g, ''));
  if (!Number.isFinite(parsed)) throw new QuoteMappingError(field, raw);

  return parsed;
}

/** 숫자로 읽히면 그 값을, 아니면 0을 준다. 있으면 좋고 없어도 되는 필드에 쓴다. */
function numOrZero(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === '') return 0;

  const parsed = Number(raw.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * 전일 대비 부호 코드를 -1 / 0 / 1로 바꾼다.
 * 1 상한 · 2 상승 · 3 보합 · 4 하한 · 5 하락.
 *
 * 지수 응답도 같은 부호 체계를 쓰므로 export한다.
 */
export function signOf(raw: string | undefined): -1 | 0 | 1 {
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
 * 멀티시세 응답의 한 행을 Quote로 바꾼다.
 *
 * 종목코드는 행이 아니라 **요청 순서**에서 받는다. 조회에 실패한 종목도 행 자체는
 * 돌아오는데 그때는 inter_shrn_iscd까지 빈 문자열이라, 응답만 보고는 그 행이 어느
 * 종목이었는지 알 수 없다. output이 요청과 같은 순서로 오는 성질에 기대어 인덱스로 맞춘다.
 *
 * 부호 처리가 이 함수의 핵심이다. KIS의 전일 대비는 부호를 달고 오기도 하고 절댓값으로만
 * 오기도 한다. 어느 쪽이든 옳게 나오도록 절댓값을 취한 뒤 부호 코드를 곱한다.
 *
 * prevClose는 기준가(inter2_sdpr)를 쓴다. 비어 있거나 0이면 현재가 − 등락으로 역산한다.
 * 진짜 전일 종가가 필요하면 inter2_prdy_clpr로 바꿀 수 있다 (raw-types.ts 주석 참고).
 *
 * 숫자로 읽을 수 없으면 throw한다. 호출부가 종목 단위로 잡아 failed에 넣는다.
 */
export function toQuote(code: string, row: KisMultiPriceRow): Quote {
  const current = num(row.inter2_prpr, 'inter2_prpr(현재가)');
  const sign = signOf(row.prdy_vrss_sign);

  const change = sign * Math.abs(num(row.inter2_prdy_vrss, 'inter2_prdy_vrss(전일 대비)'));
  const changeRate = sign * Math.abs(num(row.prdy_ctrt, 'prdy_ctrt(전일 대비율)'));

  const basePrice = numOrZero(row.inter2_sdpr);
  const prevClose = basePrice > 0 ? basePrice : current - change;

  return { code, current, prevClose, change, changeRate };
}
