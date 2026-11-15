import 'server-only';
import { getServerEnv } from '@/shared/config/env';
import type { Quote } from '../quote-contract';
import { KisError } from './errors';
import { toQuote } from './mapper';
import { paced } from './rate-limit';
import type { KisMultiPriceRow } from './raw-types';
import {
  MULTI_PRICE_CHUNK_SIZE,
  multiPriceResponseSchema,
  RATE_LIMIT_MSG_CD,
  TOKEN_INVALID_MSG_CDS,
} from './raw-types';
import { getAccessToken, invalidateToken } from './token';

/**
 * 국내주식 시세 조회.
 *
 * 관심종목(멀티종목) 시세조회 API를 쓴다. 한 번에 30종목까지 받는다.
 *
 * 단건 API(inquire-price)를 쓰지 않는 이유는 유량 제한이다. 실측해 보니 이 계정의
 * 한도는 문서가 시사하는 초당 20건이 아니라 **초당 약 1건**이었다(1초 간격 30회는
 * 전부 성공, 0.5초 간격은 10회 중 3회가 EGW00201). 단건으로 가면 10종목 조회에만
 * 10초가 넘게 걸려 쓸 수 없다. 배치는 같은 10종목을 호출 1회로 끝낸다.
 *
 * 종목 단위 실패 격리는 배치에서도 유지된다 — 아래 mapChunk 주석 참고.
 */

const TR_ID_MULTI_PRICE = 'FHKST11300006';
/** J: KRX 주식·ETF·ETN */
const MARKET_DIV_CODE = 'J';
const QUOTE_TIMEOUT_MS = 5000;

/**
 * 실제 브라우저 User-Agent.
 * KIS는 기본 라이브러리 UA(python-requests 등)에 이상 응답을 주는 사례가 보고돼 있어
 * 공식 샘플도 실제 UA를 명시하도록 안내한다.
 */
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export interface FetchQuotesResult {
  quotes: Quote[];
  /** 조회에 실패한 종목코드 */
  failed: string[];
}

/**
 * 종목코드 배열의 시세를 가져온다.
 *
 * 토큰은 종목 수와 무관하게 한 번만 얻는다. 개별 종목의 실패는 failed에 모으고 나머지는
 * 그대로 돌려준다 — 한 종목이 상장폐지·거래정지여도 포트폴리오 전체가 빈 화면이 되면 안 된다.
 *
 * 반대로 토큰 발급 실패나 유량 제한은 종목별로 회복할 수 없는 문제라 그대로 throw한다.
 */
export async function fetchQuotes(codes: string[]): Promise<FetchQuotesResult> {
  if (codes.length === 0) return { quotes: [], failed: [] };

  const token = await getAccessToken();

  try {
    return await runBatches(codes, token);
  } catch (error) {
    if (!(error instanceof KisError) || error.kind !== 'token-invalid') throw error;

    /*
     * 들고 있던 토큰이 거절됐다. 만료 시각으로는 알 수 없는 상황이라(다른 프로세스가
     * 발급하면 우리 토큰이 무효화된다) 캐시를 버리고 딱 한 번 다시 시도한다.
     * 두 번째도 실패하면 진짜 인증 문제이므로 그대로 올려보낸다.
     *
     * 거절당한 토큰을 넘겨야 한다. 지수 쪽이 먼저 재발급을 마쳤다면 캐시는 이미 새 토큰이고,
     * 그걸 버리지 않고 그대로 받아 재시도한다.
     */
    console.warn('[kis] 토큰이 거절되어 재발급 후 한 번 재시도한다.');
    invalidateToken(token);
    return await runBatches(codes, await getAccessToken());
  }
}

async function runBatches(codes: string[], token: string): Promise<FetchQuotesResult> {
  const env = getServerEnv();
  const chunks = chunk(codes, MULTI_PRICE_CHUNK_SIZE);

  const quotes: Quote[] = [];
  const failed: string[] = [];

  /*
   * 청크는 순차로 돈다. 호출 간격은 paced()가 전역으로 지킨다 — 다른 라우트나 다른
   * 사용자의 요청과도 간격이 맞춰져야 하기 때문이다 (rate-limit.ts 참고).
   *
   * 한도 초과와 토큰 거절은 종목이 아니라 호출 전체의 문제이므로 여기서 잡지 않고
   * 위로 올린다 — 삼켰다가는 전 종목이 '시세 없음'으로 표시되고 원인은 로그에만 남는다.
   */
  for (const part of chunks) {
    const rows = await paced(() => fetchChunk(part, token, env));
    mapChunk(part, rows, quotes, failed);
  }

  return { quotes, failed };
}

/**
 * 응답 행을 요청 종목에 맞춰 Quote로 옮긴다.
 *
 * **행은 요청 순서로 온다.** 조회에 실패한 종목도 행 자체는 돌아오는데, 그때는
 * inter_shrn_iscd까지 빈 문자열이라 응답만 보고는 어느 종목이었는지 알 수 없다.
 * 실측으로 확인한 동작이다 — ['005930','999999','000660']을 넣으면 행이
 * [005930, (전부 빈 값), 000660] 순서로 온다. 그래서 코드가 아니라 인덱스로 맞춘다.
 *
 * 행이 모자라면(있어선 안 되지만) 남은 종목은 실패로 처리한다. 지어낸 값을 그리느니
 * '시세 없음'이 낫다.
 */
function mapChunk(
  codes: string[],
  rows: KisMultiPriceRow[],
  quotes: Quote[],
  failed: string[],
): void {
  codes.forEach((code, index) => {
    const row = rows[index];

    if (row === undefined) {
      console.error('[kis] %s 시세 없음: 응답 행이 모자랍니다.', code);
      failed.push(code);
      return;
    }

    try {
      quotes.push(toQuote(code, row));
    } catch (error) {
      console.error('[kis] %s 시세 조회 실패: %s', code, describe(error));
      failed.push(code);
    }
  });
}

async function fetchChunk(
  codes: string[],
  token: string,
  env: { KIS_BASE_URL: string; KIS_APP_KEY: string; KIS_APP_SECRET: string },
): Promise<KisMultiPriceRow[]> {
  const url = new URL('/uapi/domestic-stock/v1/quotations/intstock-multprice', env.KIS_BASE_URL);
  codes.forEach((code, index) => {
    // 파라미터는 1부터 시작하는 번호쌍이다. 30번까지 있고 1번만 필수다.
    url.searchParams.set(`FID_COND_MRKT_DIV_CODE_${index + 1}`, MARKET_DIV_CODE);
    url.searchParams.set(`FID_INPUT_ISCD_${index + 1}`, code);
  });

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        'content-type': 'application/json',
        // KIS 공식 샘플이 application/json이 아니라 text/plain을 보낸다. 그대로 따른다.
        accept: 'text/plain',
        authorization: `Bearer ${token}`,
        appkey: env.KIS_APP_KEY,
        // 베어러 토큰이 있어도 appkey/appsecret을 매 호출마다 함께 보내야 한다.
        appsecret: env.KIS_APP_SECRET,
        tr_id: TR_ID_MULTI_PRICE,
        // P: 개인·법인 고객. B(제휴사)일 때만 personalseckey가 추가로 필요하다.
        custtype: 'P',
        // 연속 조회용 필드. 첫 요청은 빈 문자열을 '보낸다' (생략이 아니다).
        tr_cont: '',
        'user-agent': USER_AGENT,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(QUOTE_TIMEOUT_MS),
    });
  } catch (error) {
    throw new KisError('upstream', '시세 요청이 실패했습니다.', describe(error));
  }

  /*
   * 상태 코드로 먼저 갈라지지 않는다. KIS는 HTTP 500으로 응답하면서 본문에 진짜 원인을
   * 담아 보낸다(예: 500 + msg_cd EGW00121 '유효하지 않은 token'). 상태 코드만 보고
   * upstream 오류로 뭉뚱그리면 유량 초과와 토큰 만료를 구분할 수 없고, 회복할 수 있는
   * 실패를 종목별 '시세 없음'으로 조용히 묻어버리게 된다.
   */
  const body: unknown = await response.json().catch(() => null);
  const parsed = multiPriceResponseSchema.safeParse(body);

  if (!parsed.success) {
    throw new KisError(
      'upstream',
      '시세 응답 형식이 예상과 다릅니다.',
      `HTTP ${response.status} ${JSON.stringify(body).slice(0, 200)}`,
    );
  }

  // HTTP 200이어도 rt_cd가 '0'이 아니면 실패다. 이 구분을 놓치면 에러를 시세로 오해한다.
  if (parsed.data.rt_cd !== '0') {
    const msgCd = parsed.data.msg_cd ?? '-';
    const detail = `HTTP ${response.status} rt_cd=${parsed.data.rt_cd} msg_cd=${msgCd} msg1=${parsed.data.msg1 ?? '-'}`;

    if (msgCd === RATE_LIMIT_MSG_CD) {
      throw new KisError('rate-limit', 'KIS 유량 제한을 초과했습니다.', detail);
    }
    if (TOKEN_INVALID_MSG_CDS.includes(msgCd)) {
      throw new KisError('token-invalid', 'KIS가 접근토큰을 거절했습니다.', detail);
    }
    throw new KisError('upstream', 'KIS가 시세 조회를 거절했습니다.', detail);
  }

  return parsed.data.output ?? [];
}

/** KIS가 한 번에 처리하는 종목 수를 넘기면 조용히 잘라내므로 우리가 먼저 나눈다. */
function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

/** 로그용 요약. KisError의 detail(원문 msg_cd/msg1)까지 남겨야 진단이 된다. */
function describe(error: unknown): string {
  if (error instanceof KisError) {
    return `${error.message}${error.detail === undefined ? '' : ` (${error.detail})`}`;
  }
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}
