import { z } from 'zod';

/**
 * /api/stocks 의 요청·응답 계약.
 *
 * quote-contract.ts와 같은 이유로 shared에 둔다 — 라우트 핸들러(app 레이어)와
 * 클라이언트가 함께 쓰는데, app은 entities를 import할 수 없다.
 */

/** 한 번에 돌려주는 검색 결과 상한. 드롭다운에서 훑어볼 수 있는 정도로 자른다 */
export const MAX_STOCK_SEARCH_RESULTS = 20;

/** 검색어 길이 상한. 종목명 중 가장 긴 것도 이보다 짧다 */
export const MAX_STOCK_QUERY_LENGTH = 40;

export const stockSchema = z.object({
  /** 6자리 종목코드 */
  code: z.string(),
  name: z.string(),
  market: z.enum(['KOSPI', 'KOSDAQ']),
});

export type Stock = z.output<typeof stockSchema>;

export const stockSearchResponseSchema = z.object({
  stocks: z.array(stockSchema),
});

export type StockSearchResponse = z.output<typeof stockSearchResponseSchema>;

export type ParseStockQueryResult = { ok: true; query: string } | { ok: false; message: string };

/**
 * `q` 쿼리 파라미터를 검증한다. 앞뒤 공백은 떼고, 빈 검색어는 실패로 본다.
 * 빈 검색어로 전 종목을 내려주면 응답이 수천 건이 되기 때문이다.
 */
export function parseStockQueryParam(raw: string | null): ParseStockQueryResult {
  const query = (raw ?? '').trim();

  if (query === '') return { ok: false, message: '검색어를 입력해주세요.' };
  if (query.length > MAX_STOCK_QUERY_LENGTH) {
    return { ok: false, message: `검색어는 ${MAX_STOCK_QUERY_LENGTH}자 이내로 입력해주세요.` };
  }

  return { ok: true, query };
}
