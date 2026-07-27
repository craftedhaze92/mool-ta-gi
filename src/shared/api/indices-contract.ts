import { z } from 'zod';

/**
 * /api/indices 의 응답 계약.
 *
 * quote-contract.ts와 같은 이유로 shared에 둔다 — 라우트 핸들러(app 레이어)와
 * 클라이언트(entities 레이어)가 함께 쓰는데, app은 entities를 import할 수 없다.
 */

/**
 * 조회 대상 지수. 화면 표시 순서이기도 하다.
 *
 * 서버(조회할 코드)와 클라이언트(그릴 목록)의 단일 출처다. 코드는 KIS의 업종 코드이고
 * 이름은 우리가 붙인다 — KIS 지수 응답에는 지수 이름 필드가 없다.
 */
export const MARKET_INDICES = [
  { code: '0001', name: 'KOSPI' },
  { code: '1001', name: 'KOSDAQ' },
] as const;

export type MarketIndexCode = (typeof MARKET_INDICES)[number]['code'];

export const marketIndexSchema = z.object({
  /** KIS 업종 코드. '0001' | '1001' */
  code: z.string(),
  /** 'KOSPI' | 'KOSDAQ' */
  name: z.string(),
  /** 현재 지수 */
  value: z.number(),
  /** 전일 대비 변화량. 하락이면 음수 */
  change: z.number(),
  /** 전일 대비 변화율(%). 하락이면 음수 */
  changeRate: z.number(),
});

export const indicesResponseSchema = z.object({
  indices: z.array(marketIndexSchema),
  /** 조회에 실패한 지수 코드. 나머지 지수는 정상 응답한다 */
  failed: z.array(z.string()),
  /** 서버가 지수를 확정한 시각 (ISO 8601) */
  fetchedAt: z.string(),
});

export type MarketIndex = z.output<typeof marketIndexSchema>;
export type IndicesResponse = z.output<typeof indicesResponseSchema>;
