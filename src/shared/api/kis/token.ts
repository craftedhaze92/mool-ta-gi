import 'server-only';
import { EnvValidationError, getServerEnv } from '@/shared/config/env';
import { KisError } from './errors';
import { tokenErrorSchema, tokenResponseSchema } from './raw-types';
import { getTokenStore, TokenStoreError, type TokenStore } from './token-store';

/**
 * KIS 접근토큰 캐시.
 *
 * ── 왜 캐싱이 필수인가
 * KIS 토큰은 발급 후 24시간 유효하다. 발급할 때마다 계좌주에게 카카오톡 알림이 가고,
 * 발급 자체도 분당 1회로 제한된다(넘으면 HTTP 403). 그리고 새로 발급하면 앞서 발급된
 * 토큰이 무효화된다. 발급은 가능한 한 한 번만 나가야 한다.
 *
 * ── 2단 캐시
 * 1. 모듈 스코프(`cached`) — 인스턴스 로컬. 요청마다 저장소를 왕복하지 않기 위한 것이다.
 * 2. 공유 저장소(Upstash Redis, token-store.ts) — 인스턴스 간 공유. Vercel은 /api/quotes와
 *    /api/indices를 다른 인스턴스에서 돌리므로, 1번만 있으면 인스턴스마다 따로 발급한다
 *    (실측: 두 라우트가 30~60ms 차이로 각자 발급, 이어서 나머지 인스턴스가 403).
 *
 * 발급은 저장소의 락(`SET NX PX`)을 잡은 인스턴스만 한다. 못 잡은 인스턴스는 저장소에
 * 토큰이 올라올 때까지 기다린다.
 *
 * 저장소가 설정되지 않았거나(로컬·테스트) 장애가 나면 인스턴스 로컬 발급으로 물러선다.
 * 발급이 중복될 수는 있지만 서비스는 계속 돈다. 자세한 내용은 README.md 참고.
 */

interface CachedToken {
  accessToken: string;
  /** 이 시각이 지나면 다시 받아온다 (epoch ms). 만료 1시간 전이다. */
  refreshAt: number;
}

/** 만료 1시간 전에 미리 갱신한다. 요청 처리 도중 토큰이 죽는 상황을 피하기 위한 안전 마진이다. */
const REFRESH_MARGIN_MS = 60 * 60 * 1000;

/** expires_in이 응답에 없을 때의 보수적 폴백. */
const FALLBACK_TTL_MS = 6 * 60 * 60 * 1000;

const TOKEN_TIMEOUT_MS = 5000;

/** 발급 락 수명. 발급 요청 타임아웃보다 넉넉해야 발급 도중 락이 풀리지 않는다. */
const LOCK_TTL_MS = TOKEN_TIMEOUT_MS * 2;
/** 락을 못 잡은 쪽이 기다리는 최대 시간. 락 주인이 발급을 마치기에 충분해야 한다. */
const LOCK_WAIT_MS = TOKEN_TIMEOUT_MS + 2000;
const LOCK_POLL_MS = 200;

let cached: CachedToken | null = null;
/** 발급 중인 요청. 같은 인스턴스에 동시 요청이 몰려도 저장소 조회·발급은 한 번만 나가게 묶는다. */
let inFlight: Promise<string> | null = null;

/**
 * 유효한 접근토큰을 돌려준다.
 *
 * 시세 조회와 달리 이 호출은 paced()를 태우지 않는다. 토큰 발급은 별도 한도(분당 1회)를
 * 쓰는 데다 거의 나가지 않고, 무엇보다 paced() 안에서 다시 paced()를 부르는 중첩을 피하기
 * 위해서다.
 */
export async function getAccessToken(): Promise<string> {
  if (cached !== null && cached.refreshAt > Date.now()) {
    return cached.accessToken;
  }

  if (inFlight !== null) return inFlight;

  inFlight = resolveToken()
    .then((token) => {
      cached = token;
      return token.accessToken;
    })
    .finally(() => {
      // 실패했더라도 비워야 다음 요청이 재시도할 수 있다.
      inFlight = null;
    });

  return inFlight;
}

async function resolveToken(): Promise<CachedToken> {
  const store = getTokenStore();
  if (store === null) return issueLocally();

  try {
    return await resolveShared(store);
  } catch (error) {
    if (!(error instanceof TokenStoreError)) throw error;
    console.warn('[kis] 토큰 저장소 오류로 이 인스턴스에서 직접 발급한다: %s', error.message);
    return issueLocally();
  }
}

async function resolveShared(store: TokenStore): Promise<CachedToken> {
  const { token } = await store.peek();
  if (token !== null) return fromShared(token.accessToken, token.ttlMs);

  const owner = crypto.randomUUID();
  if (!(await store.acquireLock(owner, LOCK_TTL_MS))) return waitForShared(store);

  try {
    // 락을 잡기 직전에 다른 인스턴스가 발급을 마쳤을 수 있다.
    const again = await store.peek();
    if (again.token !== null) return fromShared(again.token.accessToken, again.token.ttlMs);

    const issued = await issueLocally();
    try {
      await store.save(issued.accessToken, issued.refreshAt - Date.now());
    } catch (error) {
      // 발급은 이미 나갔다. 저장 실패로 또 발급하면 안 되므로 이 토큰을 그대로 쓴다.
      console.warn('[kis] 발급한 토큰을 저장소에 넣지 못했다: %s', describe(error));
    }
    return issued;
  } finally {
    await store.releaseLock(owner).catch(() => {
      // 못 지워도 LOCK_TTL_MS 뒤에 저절로 풀린다.
    });
  }
}

/** 다른 인스턴스가 발급 중이다. 저장소에 토큰이 올라올 때까지 기다린다. */
async function waitForShared(store: TokenStore): Promise<CachedToken> {
  const deadline = Date.now() + LOCK_WAIT_MS;

  while (Date.now() < deadline) {
    await sleep(LOCK_POLL_MS);
    const { token, locked } = await store.peek();
    if (token !== null) return fromShared(token.accessToken, token.ttlMs);
    // 토큰 없이 락이 풀렸다 = 락 주인의 발급이 실패했다. 곧바로 재시도하면 분당 1회 한도에
    // 걸릴 뿐이라 여기서 실패로 끝내고, 다음 요청에 맡긴다.
    if (!locked) break;
  }

  throw new KisError('auth', '다른 인스턴스의 접근토큰 발급을 기다렸지만 받지 못했습니다.');
}

function fromShared(accessToken: string, ttlMs: number): CachedToken {
  return { accessToken, refreshAt: Date.now() + ttlMs };
}

async function issueLocally(): Promise<CachedToken> {
  const { accessToken, ttlMs } = await issueToken();
  return { accessToken, refreshAt: Date.now() + ttlMs - REFRESH_MARGIN_MS };
}

async function issueToken(): Promise<{ accessToken: string; ttlMs: number }> {
  const env = readEnv();

  let response: Response;
  try {
    response = await fetch(`${env.KIS_BASE_URL}/oauth2/tokenP`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        appkey: env.KIS_APP_KEY,
        appsecret: env.KIS_APP_SECRET,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(TOKEN_TIMEOUT_MS),
    });
  } catch (error) {
    throw new KisError('auth', '접근토큰 발급 요청이 실패했습니다.', describe(error));
  }

  if (!response.ok) {
    // 본문에 appkey가 되비쳐 올 수 있으므로 상태 코드와 에러 코드만 남긴다.
    // (예: EGW00133 = 분당 1회 발급 한도 초과)
    const body = tokenErrorSchema.safeParse(await response.json().catch(() => null));
    const code = body.success && body.data.error_code ? ` ${body.data.error_code}` : '';
    throw new KisError('auth', '접근토큰 발급이 거절되었습니다.', `HTTP ${response.status}${code}`);
  }

  const parsed = tokenResponseSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    throw new KisError('auth', '접근토큰 응답 형식이 예상과 다릅니다.');
  }

  const ttlMs =
    parsed.data.expires_in === undefined ? FALLBACK_TTL_MS : parsed.data.expires_in * 1000;

  // 토큰 값은 절대 로그에 남기지 않는다.
  console.info('[kis] 접근토큰 발급 (유효 %d시간)', Math.round(ttlMs / 3_600_000));

  return { accessToken: parsed.data.access_token, ttlMs };
}

function readEnv() {
  try {
    return getServerEnv();
  } catch (error) {
    if (error instanceof EnvValidationError) throw new KisError('config', error.message);
    throw error;
  }
}

function describe(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 거절당한 토큰을 버린다.
 *
 * 만료 시각만 믿을 수 없어서 필요하다. KIS는 토큰을 새로 발급하면 앞서 발급된 토큰을
 * 무효화하므로, 다른 프로세스(로컬 스크립트, 같은 앱키를 쓰는 다른 앱)가 한 번만 발급해도
 * 우리 토큰이 조용히 죽는다. 그때 KIS는 EGW00121을 돌려준다. 이 함수를 부르고 다시
 * 받아오면 회복된다.
 *
 * 거절당한 토큰이 **지금 들고 있는 토큰일 때만** 버린다 — 로컬 캐시도, 저장소도 마찬가지다.
 * 여러 요청(또는 인스턴스)이 같은 옛 토큰으로 함께 거절당하면, 먼저 거절된 쪽이 이미
 * 재발급을 마친 뒤에 나머지가 거절을 보고한다. 이때 무조건 비우면 방금 받은 새 토큰을
 * 버리고 또 발급하게 된다.
 */
export async function invalidateToken(rejected: string): Promise<void> {
  if (cached?.accessToken === rejected) cached = null;

  const store = getTokenStore();
  if (store === null) return;

  try {
    await store.deleteIfEquals(rejected);
  } catch (error) {
    console.warn('[kis] 저장소의 거절된 토큰을 지우지 못했다: %s', describe(error));
  }
}
