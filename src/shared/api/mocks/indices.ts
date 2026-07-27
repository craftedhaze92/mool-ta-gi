import { http, HttpResponse } from 'msw';
import type { ApiErrorCode } from '../error-contract';
import { MARKET_INDICES, type MarketIndex } from '../indices-contract';

/**
 * /api/indices 목 핸들러.
 *
 * quotes.ts와 같은 이유로 shared/api/index.ts에서 re-export하지 않는다 —
 * 앱 코드가 닿을 경로가 없어야 프로덕션 번들이 오염되지 않는다.
 */

/** 테스트가 시각을 단언할 수 있도록 고정한다. */
export const MOCK_INDICES_FETCHED_AT = '2026-07-23T00:30:00.000Z';

/** 기본 지수 값. 상승 하나, 하락 하나를 섞어 톤 분기가 둘 다 그려지게 한다. */
const DEFAULT_VALUES: Record<string, Pick<MarketIndex, 'value' | 'change' | 'changeRate'>> = {
  '0001': { value: 2712.14, change: 18.52, changeRate: 0.69 },
  '1001': { value: 861.3, change: -4.21, changeRate: -0.49 },
};

export interface IndicesHandlerOptions {
  /** 이 코드들은 조회에 실패한 것으로 응답한다 (부분 실패 재현) */
  failed?: string[];
}

/**
 * 코드 → 지수 값 표를 받아 핸들러를 만든다.
 * 표에 없는 코드는 기본값으로 채운다.
 */
export function indicesHandler(
  values: Record<string, Pick<MarketIndex, 'value' | 'change' | 'changeRate'>> = {},
  options: IndicesHandlerOptions = {},
) {
  const failedCodes = new Set(options.failed ?? []);

  return http.get('*/api/indices', () => {
    const indices = MARKET_INDICES.filter(({ code }) => !failedCodes.has(code)).map(
      ({ code, name }) => ({ code, name, ...(values[code] ?? DEFAULT_VALUES[code]) }),
    );

    return HttpResponse.json({
      indices,
      failed: MARKET_INDICES.filter(({ code }) => failedCodes.has(code)).map(({ code }) => code),
      fetchedAt: MOCK_INDICES_FETCHED_AT,
    });
  });
}

/** 전체 실패를 재현한다. */
export function indicesErrorHandler(status = 502, code: ApiErrorCode = 'UPSTREAM_ERROR') {
  return http.get('*/api/indices', () =>
    HttpResponse.json({ error: { code, message: '지수를 불러오지 못했습니다.' } }, { status }),
  );
}

/** 응답이 아주 늦는 상황. 로딩 UI를 확인할 때 쓴다. */
export function indicesPendingHandler() {
  return http.get('*/api/indices', () => new Promise<never>(() => {}));
}

export const indicesHandlers = [indicesHandler()];
