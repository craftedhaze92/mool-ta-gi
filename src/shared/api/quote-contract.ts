import { z } from 'zod';

/**
 * /api/quotes 의 요청·응답 계약.
 *
 * 라우트 핸들러(app 레이어)와 클라이언트(entities 레이어)가 함께 쓴다. app 레이어는
 * FSD 규칙상 entities를 import할 수 없어서(eslint.config.mjs의 LAYER_DEPENDENCIES)
 * 이 계약은 반드시 shared에 있어야 한다.
 *
 * 서버 전용 코드가 아니므로 'server-only'를 붙이지 않는다.
 */

/** 한 번에 조회할 수 있는 종목 수 상한. KIS 유량 제한과 응답 지연을 함께 고려한 값이다. */
export const MAX_QUOTE_CODES = 50;

/** 6자리 국내 종목코드 */
const CODE_PATTERN = /^\d{6}$/;

export const quoteSchema = z.object({
  /** 6자리 종목코드 */
  code: z.string(),
  /** 현재가 */
  current: z.number(),
  /** 등락 계산의 기준이 되는 전일 종가(정확히는 KIS의 '기준가') */
  prevClose: z.number(),
  /** 전일 대비 등락 금액. 하락이면 음수 */
  change: z.number(),
  /** 전일 대비 등락률(%). 하락이면 음수 */
  changeRate: z.number(),
});

export const quotesResponseSchema = z.object({
  quotes: z.array(quoteSchema),
  /** 조회에 실패한 종목코드. 나머지 종목은 정상 응답한다 */
  failed: z.array(z.string()),
  /** 서버가 시세를 확정한 시각 (ISO 8601) */
  fetchedAt: z.string(),
});

export const quotesErrorBodySchema = z.object({
  error: z.object({
    code: z.enum(['INVALID_REQUEST', 'UPSTREAM_AUTH', 'RATE_LIMITED', 'UPSTREAM_ERROR']),
    message: z.string(),
  }),
});

export type Quote = z.output<typeof quoteSchema>;
export type QuotesResponse = z.output<typeof quotesResponseSchema>;
export type QuotesErrorBody = z.output<typeof quotesErrorBodySchema>;
export type QuoteErrorCode = QuotesErrorBody['error']['code'];

export type ParsedCodes = { ok: true; codes: string[] } | { ok: false; message: string };

/**
 * `?codes=005930,000660` 쿼리 파라미터를 검증된 종목코드 배열로 바꾼다.
 *
 * 중복을 제거하고 정렬해서 돌려준다. 호출부가 순서를 어떻게 넘기든 같은 URL로 수렴해야
 * CDN 캐시와 React-Query 캐시가 갈라지지 않기 때문이다.
 *
 * 라우트 핸들러를 얇게 유지하려고 검증을 여기로 빼두었다. 순수 함수라 단독으로 테스트된다.
 */
export function parseCodesParam(raw: string | null): ParsedCodes {
  if (raw === null || raw.trim() === '') {
    return { ok: false, message: 'codes 파라미터가 필요합니다.' };
  }

  const codes = raw
    .split(',')
    .map((code) => code.trim())
    .filter((code) => code !== '');

  if (codes.length === 0) {
    return { ok: false, message: '종목코드를 최소 1개 넣어주세요.' };
  }

  const invalid = codes.find((code) => !CODE_PATTERN.test(code));
  if (invalid !== undefined) {
    return { ok: false, message: `종목코드는 6자리 숫자여야 합니다: ${invalid}` };
  }

  const unique = [...new Set(codes)].sort();
  if (unique.length > MAX_QUOTE_CODES) {
    return { ok: false, message: `한 번에 최대 ${MAX_QUOTE_CODES}개까지 조회할 수 있습니다.` };
  }

  return { ok: true, codes: unique };
}
