import { http, HttpResponse } from 'msw';
import { parseCodesParam } from '../quote-contract';
import { createStockIndex } from '../stock-master/search';
import { parseStockQueryParam, type Stock } from '../stock-search-contract';

/**
 * /api/stocks 목 핸들러.
 *
 * 실제 BFF와 같은 검색 함수(createStockIndex)를 쓰고 목록만 작은 픽스처로 바꾼다.
 * 그래서 순위 규칙이 바뀌어도 목과 실제가 어긋나지 않는다.
 */

/** 테스트에 등장하는 종목. fixture(holdings.fixture.ts)의 보유 종목을 포함한다 */
export const MOCK_STOCKS: Stock[] = [
  { code: '005930', name: '삼성전자', market: 'KOSPI', sector: '전기·전자' },
  { code: '005935', name: '삼성전자우', market: 'KOSPI', sector: '전기·전자' },
  { code: '000660', name: 'SK하이닉스', market: 'KOSPI', sector: '전기·전자' },
  { code: '035420', name: 'NAVER', market: 'KOSPI', sector: 'IT 서비스' },
  { code: '005380', name: '현대차', market: 'KOSPI', sector: '운송장비·부품' },
  { code: '035720', name: '카카오', market: 'KOSPI', sector: 'IT 서비스' },
  { code: '323410', name: '카카오뱅크', market: 'KOSPI', sector: '금융' },
  { code: '247540', name: '에코프로비엠', market: 'KOSDAQ', sector: '전기·전자' },
];

export function stocksHandler(stocks: readonly Stock[] = MOCK_STOCKS) {
  const index = createStockIndex(stocks);

  return http.get('*/api/stocks', ({ request }) => {
    const params = new URL(request.url).searchParams;

    if (params.has('codes')) {
      const parsed = parseCodesParam(params.get('codes'));
      return parsed.ok
        ? HttpResponse.json({ stocks: index.findByCodes(parsed.codes) })
        : HttpResponse.json(
            { error: { code: 'INVALID_REQUEST', message: parsed.message } },
            { status: 400 },
          );
    }

    const parsed = parseStockQueryParam(params.get('q'));
    if (!parsed.ok) {
      return HttpResponse.json(
        { error: { code: 'INVALID_REQUEST', message: parsed.message } },
        { status: 400 },
      );
    }

    return HttpResponse.json({ stocks: index.search(parsed.query) });
  });
}

/** 검색 실패를 재현한다. */
export function stocksErrorHandler(status = 500) {
  return http.get('*/api/stocks', () =>
    HttpResponse.json(
      { error: { code: 'UPSTREAM_ERROR', message: '종목을 검색하지 못했습니다.' } },
      { status },
    ),
  );
}

export const stocksHandlers = [stocksHandler()];
