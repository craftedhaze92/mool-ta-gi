import { fetchIndices, toErrorResponse } from '@/shared/api/kis';
import { marketCacheControl } from '@/shared/api/cache-control';
import { isMarketOpen } from '@/shared/lib/market-hours';

/**
 * GET /api/indices
 *
 * KOSPI/KOSDAQ 지수. 조회 대상은 서버가 정하므로(indices-contract의 MARKET_INDICES)
 * 요청 파라미터가 없고, 따라서 검증할 것도 없다.
 *
 * /api/quotes와 합치지 않는 이유: 시세 쿼리 키에는 보유 종목코드가 들어간다. 합치면
 * 종목을 추가·삭제할 때마다 지수까지 다시 불러 KIS 호출이 불필요하게 늘어난다.
 * 지수는 보유 종목과 무관하므로 캐시 키가 상수여야 한다.
 */

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  try {
    const { indices, failed } = await fetchIndices();

    return Response.json(
      { indices, failed, fetchedAt: new Date().toISOString() },
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
    const { status, body } = toErrorResponse(error);
    return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
  }
}
