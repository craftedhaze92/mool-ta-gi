import { http, HttpResponse } from 'msw';
import { parseCodesParam, type Quote, type QuoteErrorCode } from '../quote-contract';

/**
 * /api/quotes 목 핸들러.
 *
 * Vitest에서 쓴다 (src/shared/testing/msw-server.ts). 프로덕션 번들에 섞이지 않도록
 * shared/api/index.ts에서 re-export하지 않는다 — 앱 코드가 이 파일에 닿을 경로가 없다.
 *
 * 브라우저(dev) 워커는 도입하지 않았다. NEXT_PUBLIC_ 환경변수가 필요해지는데 그건 API
 * 키를 클라이언트에 노출하지 않는다는 방침과 부딪히고, 로컬에는 실제 KIS 키가 있어
 * dev에서 진짜 BFF가 돌기 때문이다.
 */

/** 코드만 주면 결정적인 시세를 만들어 준다. 테스트가 매직넘버를 직접 들 필요가 없을 때 쓴다. */
export function quoteFixture(code: string, over: Partial<Quote> = {}): Quote {
  const current = 10_000;
  const prevClose = 9800;

  return { code, current, prevClose, change: current - prevClose, changeRate: 2.04, ...over };
}

export interface QuotePrice {
  current: number;
  prevClose: number;
}

export interface QuotesHandlerOptions {
  /** 이 코드들은 시세를 못 받은 것으로 응답한다 (부분 실패 재현) */
  failed?: string[];
  /** 응답에 박을 시각. 지정하지 않으면 고정값을 쓴다 (스냅샷이 흔들리지 않도록) */
  fetchedAt?: string;
}

/** 테스트가 시각을 단언할 수 있도록 고정한다. KST로 09:30. */
export const MOCK_FETCHED_AT = '2026-07-23T00:30:00.000Z';

/**
 * 코드 → 시세 표를 받아 핸들러를 만든다.
 *
 * 표에 없는 코드는 quoteFixture로 채운다. 테스트가 관심 있는 종목만 적으면 된다.
 * 등락(change/changeRate)은 current와 prevClose에서 계산하므로 서로 어긋날 일이 없다.
 */
export function quotesHandler(
  prices: Record<string, QuotePrice> = {},
  options: QuotesHandlerOptions = {},
) {
  const failedCodes = new Set(options.failed ?? []);

  return http.get('*/api/quotes', ({ request }) => {
    const parsed = parseCodesParam(new URL(request.url).searchParams.get('codes'));

    if (!parsed.ok) {
      return errorResponse(400, 'INVALID_REQUEST', parsed.message);
    }

    const quotes = parsed.codes
      .filter((code) => !failedCodes.has(code))
      .map((code) => {
        const price = prices[code];
        if (price === undefined) return quoteFixture(code);

        const change = price.current - price.prevClose;
        return {
          code,
          current: price.current,
          prevClose: price.prevClose,
          change,
          changeRate: price.prevClose === 0 ? 0 : (change / price.prevClose) * 100,
        };
      });

    return HttpResponse.json({
      quotes,
      failed: parsed.codes.filter((code) => failedCodes.has(code)),
      fetchedAt: options.fetchedAt ?? MOCK_FETCHED_AT,
    });
  });
}

/** 전체 실패를 재현한다. 기본은 업스트림 장애(502). */
export function quotesErrorHandler(status = 502, code: QuoteErrorCode = 'UPSTREAM_ERROR') {
  return http.get('*/api/quotes', () => errorResponse(status, code, '시세를 불러오지 못했습니다.'));
}

/** 응답이 아주 늦는 상황. 로딩 UI를 확인할 때 쓴다. */
export function quotesPendingHandler() {
  return http.get('*/api/quotes', () => new Promise<never>(() => {}));
}

function errorResponse(status: number, code: QuoteErrorCode, message: string) {
  return HttpResponse.json({ error: { code, message } }, { status });
}

/** 기본 핸들러. 어떤 6자리 코드든 결정적인 시세를 돌려준다. */
export const quotesHandlers = [quotesHandler()];
