import { fetchQuotes, toErrorResponse } from '@/shared/api/kis';
import { marketCacheControl } from '@/shared/api/cache-control';
import { parseCodesParam } from '@/shared/api/quote-contract';
import { isMarketOpen } from '@/shared/lib/market-hours';

/**
 * GET /api/quotes?codes=005930,000660
 *
 * 브라우저와 KIS 사이의 BFF. API 키를 서버에 가둬두는 것이 존재 이유다.
 *
 * app/은 라우팅 껍데기라는 원칙을 지켜, 여기서는 파라미터 검증·호출·응답 변환만 한다.
 * 실제 로직은 @/shared/api/kis 와 @/shared/api/quote-contract 에 있다.
 */

// request.url을 읽으므로 어차피 동적이다. 의도를 명시해 둔다.
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const parsed = parseCodesParam(new URL(request.url).searchParams.get('codes'));

  if (!parsed.ok) {
    return Response.json(
      { error: { code: 'INVALID_REQUEST', message: parsed.message } },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    const { quotes, failed } = await fetchQuotes(parsed.codes);

    return Response.json(
      { quotes, failed, fetchedAt: new Date().toISOString() },
      {
        headers: {
          'Cache-Control': marketCacheControl({
            open: isMarketOpen(new Date()),
            hasFailures: failed.length > 0,
          }),
        },
      },
    );
  } catch (error) {
    // KIS 원문 메시지(msg_cd/msg1)와 자격증명은 여기서 걸러진다. 서버 로그에만 남는다.
    const { status, body } = toErrorResponse(error);
    return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
  }
}
