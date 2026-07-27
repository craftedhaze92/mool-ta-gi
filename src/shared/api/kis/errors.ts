import 'server-only';
import type { QuoteErrorCode, QuotesErrorBody } from '../quote-contract';

/**
 * 실패 종류.
 *
 * - config: 환경변수 누락·오류
 * - auth: 접근토큰 발급 실패
 * - rate-limit: KIS 유량 제한 초과 (EGW00201)
 * - upstream: 그 밖의 KIS 응답 실패, 타임아웃, 네트워크 오류
 */
export type KisErrorKind = 'config' | 'auth' | 'rate-limit' | 'upstream';

/**
 * KIS 호출 실패.
 *
 * `detail`에는 진단용 원문(msg_cd, msg1 등)을 담되 절대 응답 body로 내보내지 않는다.
 * 서버 로그에서만 본다.
 */
export class KisError extends Error {
  readonly kind: KisErrorKind;
  readonly detail: string | undefined;

  constructor(kind: KisErrorKind, message: string, detail?: string) {
    super(message);
    this.name = 'KisError';
    this.kind = kind;
    this.detail = detail;
  }
}

const RESPONSE_BY_KIND: Record<KisErrorKind, { status: number; code: QuoteErrorCode; message: string }> =
  {
    config: { status: 503, code: 'UPSTREAM_AUTH', message: '시세 서버 인증에 실패했습니다.' },
    auth: { status: 503, code: 'UPSTREAM_AUTH', message: '시세 서버 인증에 실패했습니다.' },
    'rate-limit': {
      status: 429,
      code: 'RATE_LIMITED',
      message: '시세 요청이 몰렸습니다. 잠시 후 다시 시도해주세요.',
    },
    upstream: { status: 502, code: 'UPSTREAM_ERROR', message: '시세를 불러오지 못했습니다.' },
  };

/**
 * 어떤 실패든 사용자에게 보여줄 수 있는 형태로 정규화한다.
 *
 * KIS 원문 메시지(msg_cd/msg1)와 appkey·토큰은 여기서 걸러진다. 응답에 나가는 문구는
 * 전부 우리가 쓴 것이다. 진단 정보는 이 함수 안에서 서버 로그로만 흘린다.
 */
export function toErrorResponse(error: unknown): { status: number; body: QuotesErrorBody } {
  const kind: KisErrorKind = error instanceof KisError ? error.kind : 'upstream';
  const mapped = RESPONSE_BY_KIND[kind];

  if (error instanceof KisError) {
    console.error('[kis] %s: %s%s', kind, error.message, error.detail ? ` (${error.detail})` : '');
  } else {
    console.error('[kis] 예상치 못한 오류:', error);
  }

  return { status: mapped.status, body: { error: { code: mapped.code, message: mapped.message } } };
}
