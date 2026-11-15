import 'server-only';
import { getTokenStoreEnv } from '@/shared/config/env';

/**
 * 인스턴스 간 KIS 토큰 공유 저장소 (Upstash Redis REST API).
 *
 * Vercel은 /api/quotes와 /api/indices를 서로 다른 인스턴스에서 돌린다. 모듈 스코프 캐시만
 * 쓰면 인스턴스마다 따로 발급해서 발급이 연달아 나가고(알림 여러 번), KIS 발급 한도(분당
 * 1회)에 걸려 나머지가 403을 받는다. 이 저장소에 토큰을 두고 발급 락을 잡아 발급을 한 번으로
 * 묶는다.
 *
 * 쓰는 명령이 몇 개뿐이라 SDK 없이 REST API를 직접 부른다.
 * https://upstash.com/docs/redis/features/restapi
 */

const TOKEN_KEY = 'kis:token';
const LOCK_KEY = 'kis:token:lock';
const STORE_TIMEOUT_MS = 2000;

/** 값이 기대한 값일 때만 지운다. 남의 락이나 다른 인스턴스가 새로 넣은 토큰을 지우지 않기 위해서다. */
const DELETE_IF_EQUALS = `if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end`;

export class TokenStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenStoreError';
  }
}

export interface SharedToken {
  accessToken: string;
  /** 저장소에 남은 수명 (ms). 갱신 시점이 되면 저장소에서 사라지도록 TTL을 잡아 둔다. */
  ttlMs: number;
}

export interface SharedTokenState {
  token: SharedToken | null;
  /** 누군가 발급 락을 쥐고 있는지 */
  locked: boolean;
}

export interface TokenStore {
  peek(): Promise<SharedTokenState>;
  save(accessToken: string, ttlMs: number): Promise<void>;
  /** 락을 잡았으면 true. */
  acquireLock(owner: string, ttlMs: number): Promise<boolean>;
  releaseLock(owner: string): Promise<void>;
  /** 저장된 토큰이 `accessToken`일 때만 지운다. */
  deleteIfEquals(accessToken: string): Promise<void>;
}

/** 저장소가 설정되지 않았으면 null. */
export function getTokenStore(): TokenStore | null {
  const env = getTokenStoreEnv();
  if (env === null) return null;

  async function call(path: string, body: unknown): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(`${env!.url}${path}`, {
        method: 'POST',
        headers: { authorization: `Bearer ${env!.token}`, 'content-type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
        signal: AbortSignal.timeout(STORE_TIMEOUT_MS),
      });
    } catch (error) {
      throw new TokenStoreError(`요청 실패: ${error instanceof Error ? error.message : error}`);
    }
    if (!response.ok) throw new TokenStoreError(`HTTP ${response.status}`);
    return response.json().catch(() => {
      throw new TokenStoreError('응답이 JSON이 아닙니다.');
    });
  }

  async function command(...args: (string | number)[]): Promise<unknown> {
    return unwrap(await call('', args));
  }

  return {
    async peek() {
      const results = await call('/pipeline', [
        ['GET', TOKEN_KEY],
        ['PTTL', TOKEN_KEY],
        ['EXISTS', LOCK_KEY],
      ]);
      if (!Array.isArray(results) || results.length !== 3) {
        throw new TokenStoreError('pipeline 응답 형식이 예상과 다릅니다.');
      }
      const [value, pttl, exists] = results.map(unwrap);

      const token =
        typeof value === 'string' && typeof pttl === 'number' && pttl > 0
          ? { accessToken: value, ttlMs: pttl }
          : null;
      return { token, locked: exists === 1 };
    },

    async save(accessToken, ttlMs) {
      await command('SET', TOKEN_KEY, accessToken, 'PX', Math.max(1, Math.floor(ttlMs)));
    },

    async acquireLock(owner, ttlMs) {
      return (await command('SET', LOCK_KEY, owner, 'NX', 'PX', ttlMs)) === 'OK';
    },

    async releaseLock(owner) {
      await command('EVAL', DELETE_IF_EQUALS, 1, LOCK_KEY, owner);
    },

    async deleteIfEquals(accessToken) {
      await command('EVAL', DELETE_IF_EQUALS, 1, TOKEN_KEY, accessToken);
    },
  };
}

function unwrap(entry: unknown): unknown {
  if (typeof entry !== 'object' || entry === null) {
    throw new TokenStoreError('응답 형식이 예상과 다릅니다.');
  }
  if ('error' in entry) throw new TokenStoreError(String(entry.error));
  if (!('result' in entry)) throw new TokenStoreError('응답에 result가 없습니다.');
  return entry.result;
}
