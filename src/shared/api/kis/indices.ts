import 'server-only';
import { getServerEnv } from '@/shared/config/env';
import { MARKET_INDICES, type MarketIndex } from '../indices-contract';
import { KisError } from './errors';
import { toMarketIndex } from './index-mapper';
import { paced } from './rate-limit';
import {
  indexPriceResponseSchema,
  RATE_LIMIT_MSG_CD,
  TOKEN_INVALID_MSG_CDS,
  type KisIndexPriceOutput,
} from './raw-types';
import { getAccessToken, invalidateToken } from './token';

/**
 * 국내 지수(KOSPI/KOSDAQ) 조회.
 *
 * 이 API는 **한 번에 한 지수만** 받는다. 시세처럼 묶어 보낼 방법이 없어 지수 수만큼
 * 호출한다. 호출 간격은 paced()가 전역으로 지킨다.
 */

const TR_ID_INDEX_PRICE = 'FHPUP02100000';
/** U: 업종 */
const MARKET_DIV_CODE = 'U';
const INDEX_TIMEOUT_MS = 5000;

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export interface FetchIndicesResult {
  indices: MarketIndex[];
  /** 조회에 실패한 지수 코드 */
  failed: string[];
}

/**
 * 조회 대상 지수 전부를 가져온다.
 *
 * 개별 지수의 실패는 failed에 모으고 나머지는 그대로 돌려준다. KOSDAQ이 안 온다고
 * KOSPI까지 감출 이유는 없다.
 *
 * 유량 초과·토큰 거절은 지수가 아니라 호출 전체의 문제라 위로 올린다. 토큰이 거절된
 * 경우에는 재발급 후 한 번 재시도한다 (quotes.ts와 같은 정책).
 */
export async function fetchIndices(): Promise<FetchIndicesResult> {
  const token = await getAccessToken();

  try {
    return await runIndices(token);
  } catch (error) {
    if (!(error instanceof KisError) || error.kind !== 'token-invalid') throw error;

    console.warn('[kis] 토큰이 거절되어 재발급 후 한 번 재시도한다. (지수)');
    await invalidateToken(token);
    return await runIndices(await getAccessToken());
  }
}

async function runIndices(token: string): Promise<FetchIndicesResult> {
  const env = getServerEnv();

  const indices: MarketIndex[] = [];
  const failed: string[] = [];

  for (const { code, name } of MARKET_INDICES) {
    try {
      const output = await paced(() => fetchOneIndex(code, token, env));
      indices.push(toMarketIndex(code, name, output));
    } catch (error) {
      if (
        error instanceof KisError &&
        (error.kind === 'rate-limit' || error.kind === 'token-invalid')
      ) {
        throw error;
      }

      console.error('[kis] %s(%s) 지수 조회 실패: %s', name, code, describe(error));
      failed.push(code);
    }
  }

  return { indices, failed };
}

async function fetchOneIndex(
  code: string,
  token: string,
  env: { KIS_BASE_URL: string; KIS_APP_KEY: string; KIS_APP_SECRET: string },
): Promise<KisIndexPriceOutput> {
  const url = new URL('/uapi/domestic-stock/v1/quotations/inquire-index-price', env.KIS_BASE_URL);
  url.searchParams.set('FID_COND_MRKT_DIV_CODE', MARKET_DIV_CODE);
  url.searchParams.set('FID_INPUT_ISCD', code);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        'content-type': 'application/json',
        accept: 'text/plain',
        authorization: `Bearer ${token}`,
        appkey: env.KIS_APP_KEY,
        appsecret: env.KIS_APP_SECRET,
        tr_id: TR_ID_INDEX_PRICE,
        custtype: 'P',
        tr_cont: '',
        'user-agent': USER_AGENT,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(INDEX_TIMEOUT_MS),
    });
  } catch (error) {
    throw new KisError('upstream', '지수 요청이 실패했습니다.', describe(error));
  }

  // 상태 코드가 아니라 본문으로 판단한다. 이유는 quotes.ts와 같다.
  const body: unknown = await response.json().catch(() => null);
  const parsed = indexPriceResponseSchema.safeParse(body);

  if (!parsed.success) {
    throw new KisError(
      'upstream',
      '지수 응답 형식이 예상과 다릅니다.',
      `HTTP ${response.status} ${JSON.stringify(body).slice(0, 200)}`,
    );
  }

  if (parsed.data.rt_cd !== '0') {
    const msgCd = parsed.data.msg_cd ?? '-';
    const detail = `HTTP ${response.status} rt_cd=${parsed.data.rt_cd} msg_cd=${msgCd} msg1=${parsed.data.msg1 ?? '-'}`;

    if (msgCd === RATE_LIMIT_MSG_CD) {
      throw new KisError('rate-limit', 'KIS 유량 제한을 초과했습니다.', detail);
    }
    if (TOKEN_INVALID_MSG_CDS.includes(msgCd)) {
      throw new KisError('token-invalid', 'KIS가 접근토큰을 거절했습니다.', detail);
    }
    throw new KisError('upstream', 'KIS가 지수 조회를 거절했습니다.', detail);
  }

  if (parsed.data.output === undefined) {
    throw new KisError('upstream', '지수 응답에 output이 없습니다.', `HTTP ${response.status}`);
  }

  return parsed.data.output;
}

/** 로그용 요약. KisError의 detail(원문 msg_cd/msg1)까지 남겨야 진단이 된다. */
function describe(error: unknown): string {
  if (error instanceof KisError) {
    return `${error.message}${error.detail === undefined ? '' : ` (${error.detail})`}`;
  }
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}
