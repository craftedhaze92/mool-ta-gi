import 'server-only';

import type { Stock } from '../stock-search-contract';
import { createStockIndex } from './search';
import master from './stocks.json';

/**
 * 종목 마스터 검색. /api/stocks 라우트만 쓴다.
 *
 * stocks.json(3,500여 종목, 약 140KB)이 클라이언트 번들에 섞이지 않도록 server-only로 막는다.
 * 브라우저는 BFF에 검색어만 보내고 결과 20건만 받는다.
 *
 * 데이터 갱신: `pnpm stocks:update` (scripts/update-stock-master.mjs)
 */

const stocks: Stock[] = master.stocks.map(([code, name, market]) => ({
  code,
  name,
  market: market === 'KOSDAQ' ? 'KOSDAQ' : 'KOSPI',
}));

export const stockIndex = createStockIndex(stocks);

/** 마스터 파일을 받은 날짜 (YYYY-MM-DD) */
export const STOCK_MASTER_UPDATED_AT = master.updatedAt;
