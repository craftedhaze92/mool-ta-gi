import { parseCodesParam } from '@/shared/api/quote-contract';
import { stockIndex } from '@/shared/api/stock-master';
import { parseStockQueryParam, type Stock } from '@/shared/api/stock-search-contract';

/**
 * GET /api/stocks?q=삼성             종목명·종목코드 검색 (종목 추가 폼)
 * GET /api/stocks?codes=005930,000660 종목코드로 조회 (보유 종목의 섹터 동기화)
 *
 * KIS를 호출하지 않고 배포에 포함된 종목 마스터만 본다. 두 쿼리 모두 응답 형태가 같다.
 *
 * 데이터가 배포 단위로 고정이라 CDN에 하루 묶어 둔다. 브라우저 캐시(max-age)는 짧게 둬서
 * 새로 배포한 마스터가 늦게 반영되는 시간을 줄인다.
 */

export const dynamic = 'force-dynamic';

export function GET(request: Request): Response {
  const params = new URL(request.url).searchParams;

  if (params.has('codes')) {
    const parsed = parseCodesParam(params.get('codes'));
    return parsed.ok ? ok(stockIndex.findByCodes(parsed.codes)) : badRequest(parsed.message);
  }

  const parsed = parseStockQueryParam(params.get('q'));
  return parsed.ok ? ok(stockIndex.search(parsed.query)) : badRequest(parsed.message);
}

function ok(stocks: Stock[]): Response {
  return Response.json(
    { stocks },
    { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=86400' } },
  );
}

function badRequest(message: string): Response {
  return Response.json(
    { error: { code: 'INVALID_REQUEST', message } },
    { status: 400, headers: { 'Cache-Control': 'no-store' } },
  );
}
