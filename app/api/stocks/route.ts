import { stockIndex } from '@/shared/api/stock-master';
import { parseStockQueryParam } from '@/shared/api/stock-search-contract';

/**
 * GET /api/stocks?q=삼성
 *
 * 종목명·종목코드 검색. KIS를 호출하지 않고 배포에 포함된 종목 마스터만 본다.
 *
 * 데이터가 배포 단위로 고정이라 CDN에 하루 묶어 둔다. 브라우저 캐시(max-age)는 짧게 둬서
 * 새로 배포한 마스터가 늦게 반영되는 시간을 줄인다.
 */

export const dynamic = 'force-dynamic';

export function GET(request: Request): Response {
  const parsed = parseStockQueryParam(new URL(request.url).searchParams.get('q'));

  if (!parsed.ok) {
    return Response.json(
      { error: { code: 'INVALID_REQUEST', message: parsed.message } },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  return Response.json(
    { stocks: stockIndex.search(parsed.query) },
    { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=86400' } },
  );
}
