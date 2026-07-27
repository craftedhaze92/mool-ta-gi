import { fetchQuotes, toErrorResponse } from '@/shared/api/kis';
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
          'Cache-Control': quotesCacheControl({
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

/**
 * 장중 15초 / 장 마감 후 5분.
 *
 * max-age는 항상 0이다. 브라우저 HTTP 캐시가 끼면 '다시 시도' 버튼이 죽은 응답을
 * 되돌려준다. 신선도 관리는 React-Query와 CDN에만 맡긴다.
 *
 * 장중 15초는 클라이언트 폴링 주기(30초)의 절반이다. 사용자가 이미 감수하는 지연 안에서,
 * 탭이 몇 개든 KIS 업스트림 호출을 코드 조합당 15초 1회로 눌러준다.
 *
 * 마감 후에는 가격이 고정이라 더 길게 잡아도 되지만 300초로 묶는다. 다음 날 09:00 개장
 * 직후에 전날 마감 시세가 서빙되는 시간을 5분으로 제한하기 위해서다.
 * (더 정밀하게는 다음 개장 시각에 정확히 만료시킬 수 있다. 지금은 그만한 이득이 없다.)
 *
 * 부분 실패는 마감 후에도 15초로 강제한다. 실패한 응답을 CDN이 5분간 붙들고 있으면
 * 사용자의 재시도가 그 시간 동안 무의미해진다.
 */
function quotesCacheControl({
  open,
  hasFailures,
}: {
  open: boolean;
  hasFailures: boolean;
}): string {
  if (open || hasFailures) return 'public, max-age=0, s-maxage=15, stale-while-revalidate=30';
  return 'public, max-age=0, s-maxage=300, stale-while-revalidate=600';
}
