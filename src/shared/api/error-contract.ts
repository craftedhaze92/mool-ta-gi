import { z } from 'zod';

/**
 * BFF가 내려주는 실패 응답의 공통 형태.
 *
 * 라우트가 무엇이든 `toErrorResponse`(shared/api/kis/errors.ts)가 이 모양 하나로
 * 정규화하므로 계약도 한 곳에 둔다. KIS 원문 메시지는 절대 여기 담기지 않는다.
 */
export const apiErrorBodySchema = z.object({
  error: z.object({
    code: z.enum(['INVALID_REQUEST', 'UPSTREAM_AUTH', 'RATE_LIMITED', 'UPSTREAM_ERROR']),
    message: z.string(),
  }),
});

export type ApiErrorBody = z.output<typeof apiErrorBodySchema>;
export type ApiErrorCode = ApiErrorBody['error']['code'];
