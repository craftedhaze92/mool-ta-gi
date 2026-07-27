import 'server-only';
import { EnvValidationError, getServerEnv } from '@/shared/config/env';
import { KisError } from './errors';
import { tokenResponseSchema } from './raw-types';

/**
 * KIS 접근토큰 캐시.
 *
 * ── 왜 캐싱이 필수인가
 * KIS 토큰은 발급 후 24시간 유효하고, **발급 후 6시간 이내 재요청에는 같은 토큰을 그대로
 * 돌려준다**. 그리고 실제로 새 토큰이 발급될 때마다 계좌주에게 카카오톡 알림이 간다.
 * 즉 캐싱 없이 매 요청마다 발급을 시도하면 사용자에게 알림이 쏟아지고 유량 제한에도 걸린다.
 *
 * ── 이 캐시의 한계 (중요)
 * 모듈 스코프 캐시는 **인스턴스 로컬**이다. Vercel serverless는 트래픽에 따라 인스턴스를
 * 여러 개 띄우고, 각 인스턴스가 자기 토큰을 따로 발급한다. 콜드 스타트마다 발급 요청이
 * 한 번씩 나간다.
 *
 * 지금 이걸 감수하는 근거는 위의 '6시간 이내 재요청 = 같은 토큰' 규칙이다. 인스턴스가
 * 몇 개든 KIS 쪽에서는 대부분 기존 토큰을 되돌려주므로 실질 발급은 하루 1~2회이고
 * 알림도 그만큼만 간다. 개인 사용 규모에서는 충분하다.
 *
 * 근본 해결은 인스턴스 간 공유 저장소다 — Upstash Redis / Vercel KV에 `kis:token`을 두고
 * `SET NX`로 발급 락을 잡는 방식. getAccessToken()의 시그니처를 바꾸지 않고 이 파일 내부만
 * 교체하면 되도록 설계해 두었다. 자세한 내용은 이 디렉터리의 README.md 참고.
 */

interface CachedToken {
  accessToken: string;
  /** 만료 시각 (epoch ms) */
  expiresAt: number;
}

/** 만료 1시간 전에 미리 갱신한다. 요청 처리 도중 토큰이 죽는 상황을 피하기 위한 안전 마진이다. */
const REFRESH_MARGIN_MS = 60 * 60 * 1000;

/** expires_in이 응답에 없을 때의 보수적 폴백. 6시간 안에는 어차피 같은 토큰이 돌아온다. */
const FALLBACK_TTL_MS = 6 * 60 * 60 * 1000;

const TOKEN_TIMEOUT_MS = 5000;

let cached: CachedToken | null = null;
/** 발급 중인 요청. 동시 요청이 몰려도 발급은 한 번만 나가게 묶는다. */
let inFlight: Promise<string> | null = null;

/**
 * 유효한 접근토큰을 돌려준다.
 *
 * 캐시가 살아 있으면 그대로, 이미 발급 중이면 그 promise를 공유한다. 후자가 없으면
 * 동시에 들어온 N개의 요청이 각각 발급을 시도해 유량 제한과 알림 폭탄을 부른다.
 */
export async function getAccessToken(): Promise<string> {
  if (cached !== null && cached.expiresAt - REFRESH_MARGIN_MS > Date.now()) {
    return cached.accessToken;
  }

  if (inFlight !== null) return inFlight;

  inFlight = issueToken()
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

async function issueToken(): Promise<CachedToken> {
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
    // 본문에 appkey가 되비쳐 올 수 있으므로 상태 코드만 남긴다.
    throw new KisError('auth', '접근토큰 발급이 거절되었습니다.', `HTTP ${response.status}`);
  }

  const parsed = tokenResponseSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    throw new KisError('auth', '접근토큰 응답 형식이 예상과 다릅니다.');
  }

  const ttlMs =
    parsed.data.expires_in === undefined ? FALLBACK_TTL_MS : parsed.data.expires_in * 1000;

  // 토큰 값은 절대 로그에 남기지 않는다.
  console.info('[kis] 접근토큰 발급 (유효 %d시간)', Math.round(ttlMs / 3_600_000));

  return { accessToken: parsed.data.access_token, expiresAt: Date.now() + ttlMs };
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

/** 테스트 전용. 모듈 스코프 캐시를 비운다. */
export function __resetTokenCache(): void {
  cached = null;
  inFlight = null;
}
