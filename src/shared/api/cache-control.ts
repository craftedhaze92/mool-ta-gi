/**
 * 시세·지수 응답의 Cache-Control.
 *
 * /api/quotes와 /api/indices가 같은 정책을 쓴다. 두 벌로 두면 한쪽만 고치는 실수가 난다.
 */

/**
 * 장중 15초 / 장 마감 후 5분.
 *
 * max-age는 항상 0이다. 브라우저 HTTP 캐시가 끼면 '다시 시도' 버튼이 죽은 응답을
 * 되돌려준다. 신선도 관리는 React-Query와 CDN에만 맡긴다.
 *
 * 장중 15초는 클라이언트 폴링 주기(30초)의 절반이다. 사용자가 이미 감수하는 지연 안에서,
 * 탭이 몇 개든 KIS 업스트림 호출을 15초에 1회로 눌러준다.
 *
 * 마감 후에는 가격이 고정이라 더 길게 잡아도 되지만 300초로 묶는다. 다음 날 09:00 개장
 * 직후에 전날 시세가 서빙되는 시간을 5분으로 제한하기 위해서다.
 *
 * 부분 실패는 마감 후에도 15초로 강제한다. 실패한 응답을 CDN이 5분간 붙들고 있으면
 * 사용자의 재시도가 그 시간 동안 무의미해진다.
 */
export function marketCacheControl({
  open,
  hasFailures,
}: {
  open: boolean;
  hasFailures: boolean;
}): string {
  if (open || hasFailures) return 'public, max-age=0, s-maxage=15, stale-while-revalidate=30';
  return 'public, max-age=0, s-maxage=300, stale-while-revalidate=600';
}
