import { apiErrorBodySchema } from '@/shared/api/error-contract';
import { indicesResponseSchema, type IndicesResponse } from '@/shared/api/indices-contract';

/** BFF가 정규화해 내려준 실패. status를 들고 있어 재시도 정책이 이걸 보고 판단한다. */
export class IndicesFetchError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'IndicesFetchError';
    this.status = status;
  }
}

/**
 * /api/indices를 호출한다.
 *
 * 브라우저는 KIS를 직접 부르지 않는다. 항상 우리 BFF만 본다 (API 키가 서버에 있으므로).
 * 성공 응답도 스키마로 검증한다 — 라우트 핸들러와 같은 zod 스키마를 공유하므로 계약이
 * 어긋나면 화면에 잘못된 숫자가 뜨기 전에 여기서 걸린다.
 */
export async function fetchIndices(signal?: AbortSignal): Promise<IndicesResponse> {
  const response = await fetch('/api/indices', { signal });

  if (!response.ok) {
    throw new IndicesFetchError(response.status, await readErrorMessage(response));
  }

  const parsed = indicesResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new IndicesFetchError(response.status, '지수 응답 형식이 올바르지 않습니다.');
  }

  return parsed.data;
}

/** BFF가 내려준 메시지를 쓰되, 형식이 어긋나면 일반 문구로 떨어진다. */
async function readErrorMessage(response: Response): Promise<string> {
  const parsed = apiErrorBodySchema.safeParse(await response.json().catch(() => null));
  return parsed.success ? parsed.data.error.message : '지수를 불러오지 못했습니다.';
}
