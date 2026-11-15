import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/shared/testing/msw-server';

/*
 * 호출 간격 제어는 이 테스트의 관심사가 아니다. 진짜 1.2초 간격을 기다리지 않도록
 * paced()를 즉시 실행으로 바꾼다. 호출 순서는 아래 가짜 KIS가 직접 조절한다.
 */
vi.mock('./rate-limit', () => ({
  paced: <T>(task: () => Promise<T>) => task(),
}));

const BASE_URL = 'https://kis.test';

type TokenModule = typeof import('./token');

/** token.ts와 env.ts는 모듈 스코프에 캐시를 들고 있어서 테스트마다 새로 불러온다. */
async function loadToken(): Promise<TokenModule> {
  return import('./token');
}

/**
 * 실측 동작을 흉내 낸 가짜 KIS.
 *
 * 토큰을 새로 발급하면 이전 토큰은 무효가 된다. 무효 토큰으로 시세·지수를 부르면
 * HTTP 500 + EGW00121을 돌려준다 (README.md '만료 시각만 믿으면 안 된다' 참고).
 */
function fakeKis() {
  const state = { issued: 0, valid: null as string | null };

  const tokenHandler = http.post(`${BASE_URL}/oauth2/tokenP`, () => {
    state.issued += 1;
    state.valid = `tok${state.issued}`;
    return HttpResponse.json({
      access_token: state.valid,
      token_type: 'Bearer',
      expires_in: 86400,
    });
  });

  /** 외부(다른 인스턴스, 로컬 dev)에서 발급한 것처럼 현재 토큰을 무효화한다. */
  function issueElsewhere() {
    state.issued += 1;
    state.valid = `external${state.issued}`;
  }

  function isValid(request: Request): boolean {
    return request.headers.get('authorization') === `Bearer ${state.valid}`;
  }

  return { state, tokenHandler, issueElsewhere, isValid };
}

const tokenRejected = () =>
  HttpResponse.json(
    { rt_cd: '1', msg_cd: 'EGW00121', msg1: '유효하지 않은 token 입니다.' },
    { status: 500 },
  );

const quoteRow = {
  inter_shrn_iscd: '005930',
  inter_kor_isnm: '삼성전자',
  inter2_prpr: '70000',
  inter2_prdy_vrss: '1000',
  prdy_vrss_sign: '2',
  prdy_ctrt: '1.45',
  inter2_sdpr: '69000',
  inter2_prdy_clpr: '69000',
};

const indexOutput = {
  bstp_nmix_prpr: '2500.12',
  bstp_nmix_prdy_vrss: '10.5',
  prdy_vrss_sign: '2',
  bstp_nmix_prdy_ctrt: '0.42',
};

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('KIS_APP_KEY', 'test-key');
  vi.stubEnv('KIS_APP_SECRET', 'test-secret');
  vi.stubEnv('KIS_BASE_URL', BASE_URL);
  // 기본은 공유 저장소 없음(인스턴스 로컬 캐시만). 저장소 테스트에서만 켠다.
  vi.stubEnv('KV_REST_API_URL', '');
  vi.stubEnv('KV_REST_API_TOKEN', '');
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('getAccessToken', () => {
  it('발급한 토큰을 캐시해 두 번째 호출에서는 발급하지 않는다', async () => {
    const kis = fakeKis();
    server.use(kis.tokenHandler);
    const { getAccessToken } = await loadToken();

    expect(await getAccessToken()).toBe('tok1');
    expect(await getAccessToken()).toBe('tok1');
    expect(kis.state.issued).toBe(1);
  });

  it('동시에 들어온 요청은 발급 한 번을 공유한다', async () => {
    const kis = fakeKis();
    server.use(kis.tokenHandler);
    const { getAccessToken } = await loadToken();

    const tokens = await Promise.all([getAccessToken(), getAccessToken(), getAccessToken()]);

    expect(tokens).toEqual(['tok1', 'tok1', 'tok1']);
    expect(kis.state.issued).toBe(1);
  });
});

describe('invalidateToken', () => {
  it('캐시에 든 토큰이 거절되면 버리고 새로 발급한다', async () => {
    const kis = fakeKis();
    server.use(kis.tokenHandler);
    const { getAccessToken, invalidateToken } = await loadToken();

    const first = await getAccessToken();
    await invalidateToken(first);

    expect(await getAccessToken()).toBe('tok2');
    expect(kis.state.issued).toBe(2);
  });

  it('이미 교체된 옛 토큰의 거절은 새 토큰을 버리지 않는다', async () => {
    const kis = fakeKis();
    server.use(kis.tokenHandler);
    const { getAccessToken, invalidateToken } = await loadToken();

    const stale = await getAccessToken();
    // 요청 A가 먼저 거절을 겪고 재발급까지 마쳤다.
    await invalidateToken(stale);
    const fresh = await getAccessToken();

    // 같은 옛 토큰을 들고 있던 요청 B가 뒤늦게 거절을 보고한다.
    await invalidateToken(stale);

    expect(await getAccessToken()).toBe(fresh);
    expect(kis.state.issued).toBe(2);
  });
});

describe('토큰 거절 후 시세·지수 동시 재시도', () => {
  /*
   * 회귀 테스트: 대시보드가 /api/quotes와 /api/indices를 동시에 부르는데 들고 있던 토큰이
   * 외부 발급으로 죽어 있는 상황. 예전에는 두 쪽이 각자 캐시를 비우고 재발급해서 토큰이
   * 연속 2번 발급됐고(카카오톡 알림 2회), 두 번째 발급이 첫 번째 토큰을 죽여 시세 재시도까지
   * 실패했다.
   */
  it('재발급은 한 번만 일어나고 양쪽 모두 성공한다', async () => {
    const kis = fakeKis();

    /*
     * 순서를 실제 상황대로 고정한다. 지수 요청은 paced() 간격 때문에 시세보다 늦게
     * 나가므로, 옛 토큰을 든 지수 요청은 시세 쪽 재발급이 끝난 뒤에야 거절을 받는다.
     */
    let markReissued!: () => void;
    const reissued = new Promise<void>((resolve) => {
      markReissued = resolve;
    });

    server.use(
      http.post(`${BASE_URL}/oauth2/tokenP`, () => {
        kis.state.issued += 1;
        kis.state.valid = `tok${kis.state.issued}`;
        // 첫 발급(tok1) 이후의 발급 = 거절을 겪은 쪽의 재발급
        if (kis.state.issued > 1) setTimeout(markReissued, 10);
        return HttpResponse.json({ access_token: kis.state.valid, expires_in: 86400 });
      }),
      http.get(`${BASE_URL}/uapi/domestic-stock/v1/quotations/intstock-multprice`, ({ request }) =>
        kis.isValid(request)
          ? HttpResponse.json({ rt_cd: '0', output: [quoteRow] })
          : tokenRejected(),
      ),
      http.get(
        `${BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-index-price`,
        async ({ request }) => {
          if (kis.isValid(request)) return HttpResponse.json({ rt_cd: '0', output: indexOutput });
          await reissued;
          return tokenRejected();
        },
      ),
    );

    const { getAccessToken } = await loadToken();
    const { fetchQuotes } = await import('./quotes');
    const { fetchIndices } = await import('./indices');

    await getAccessToken(); // tok1 캐시
    kis.issueElsewhere(); // tok1 사망

    const [quotes, indices] = await Promise.all([fetchQuotes(['005930']), fetchIndices()]);

    expect(quotes.quotes).toHaveLength(1);
    expect(indices.indices).toHaveLength(2);
    // tok1 + 외부 발급 1회 + 재발급 1회
    expect(kis.state.issued).toBe(3);
  });
});

/*
 * ── 공유 저장소 (Upstash Redis)
 *
 * Vercel은 /api/quotes와 /api/indices를 다른 인스턴스에서 돌린다. 모듈을 따로 불러온
 * 두 사본을 두 인스턴스로 삼고, 둘이 같은 가짜 Redis를 보게 한다.
 */

const UPSTASH_URL = 'https://upstash.test';

/** token-store.ts가 쓰는 명령만 흉내 낸 가짜 Upstash REST API. */
function fakeRedis() {
  const data = new Map<string, { value: string; expiresAt: number }>();
  const state = { down: false };

  function entry(key: string) {
    const found = data.get(key);
    if (found === undefined) return undefined;
    if (found.expiresAt <= Date.now()) {
      data.delete(key);
      return undefined;
    }
    return found;
  }

  function exec(command: unknown): unknown {
    const [op, ...args] = (command as (string | number)[]).map(String);
    switch (op) {
      case 'GET':
        return entry(args[0])?.value ?? null;
      case 'PTTL': {
        const found = entry(args[0]);
        return found === undefined ? -2 : found.expiresAt - Date.now();
      }
      case 'EXISTS':
        return entry(args[0]) === undefined ? 0 : 1;
      case 'SET': {
        const [key, value, ...options] = args;
        if (options.includes('NX') && entry(key) !== undefined) return null;
        const ttl = Number(options[options.indexOf('PX') + 1]);
        data.set(key, { value, expiresAt: Date.now() + ttl });
        return 'OK';
      }
      case 'EVAL': {
        // DELETE_IF_EQUALS: EVAL <script> 1 <key> <value>
        const [, , key, value] = args;
        if (entry(key)?.value !== value) return 0;
        data.delete(key);
        return 1;
      }
      default:
        throw new Error(`가짜 Redis가 모르는 명령: ${op}`);
    }
  }

  const handlers = [
    http.post(`${UPSTASH_URL}/pipeline`, async ({ request }) => {
      if (state.down) return new HttpResponse(null, { status: 500 });
      const commands = (await request.json()) as unknown[];
      return HttpResponse.json(commands.map((command) => ({ result: exec(command) })));
    }),
    http.post(`${UPSTASH_URL}/`, async ({ request }) => {
      if (state.down) return new HttpResponse(null, { status: 500 });
      return HttpResponse.json({ result: exec(await request.json()) });
    }),
  ];

  return { data, state, handlers };
}

/** 발급에 시간이 걸리는 가짜 KIS. 그동안 다른 인스턴스가 끼어들 틈이 생긴다. */
function slowTokenHandler(kis: ReturnType<typeof fakeKis>) {
  return http.post(`${BASE_URL}/oauth2/tokenP`, async () => {
    kis.state.issued += 1;
    const token = `tok${kis.state.issued}`;
    kis.state.valid = token;
    await new Promise((resolve) => setTimeout(resolve, 50));
    return HttpResponse.json({ access_token: token, expires_in: 86400 });
  });
}

/** 모듈 캐시를 비우고 불러와, 모듈 스코프 상태를 따로 가진 '다른 인스턴스'를 만든다. */
async function loadInstance(): Promise<TokenModule> {
  vi.resetModules();
  return import('./token');
}

describe('공유 저장소로 인스턴스 간 토큰 공유', () => {
  beforeEach(() => {
    vi.stubEnv('KV_REST_API_URL', UPSTASH_URL);
    vi.stubEnv('KV_REST_API_TOKEN', 'test-redis-token');
  });

  /*
   * 회귀 테스트: 배포 로그에서 /api/quotes와 /api/indices가 30~60ms 차이로 각자 발급했다
   * (알림 2회). 인스턴스 로컬 캐시만으로는 막을 수 없었다.
   */
  it('두 인스턴스가 동시에 토큰을 요청해도 발급은 한 번이다', async () => {
    const kis = fakeKis();
    const redis = fakeRedis();
    server.use(slowTokenHandler(kis), ...redis.handlers);

    const quotesInstance = await loadInstance();
    const indicesInstance = await loadInstance();

    const tokens = await Promise.all([
      quotesInstance.getAccessToken(),
      indicesInstance.getAccessToken(),
    ]);

    expect(tokens).toEqual(['tok1', 'tok1']);
    expect(kis.state.issued).toBe(1);
  });

  it('콜드 스타트한 인스턴스는 저장소의 토큰을 발급 없이 쓴다', async () => {
    const kis = fakeKis();
    const redis = fakeRedis();
    server.use(kis.tokenHandler, ...redis.handlers);

    expect(await (await loadInstance()).getAccessToken()).toBe('tok1');
    expect(await (await loadInstance()).getAccessToken()).toBe('tok1');
    expect(kis.state.issued).toBe(1);
  });

  it('다른 인스턴스가 이미 재발급했다면, 같은 옛 토큰의 거절은 새 토큰을 버리지 않는다', async () => {
    const kis = fakeKis();
    const redis = fakeRedis();
    server.use(kis.tokenHandler, ...redis.handlers);

    const a = await loadInstance();
    const b = await loadInstance();
    const stale = await a.getAccessToken();
    expect(await b.getAccessToken()).toBe(stale);

    // A가 먼저 거절을 겪고 재발급까지 마쳤다.
    await a.invalidateToken(stale);
    const fresh = await a.getAccessToken();
    expect(fresh).not.toBe(stale);

    // B가 같은 옛 토큰의 거절을 뒤늦게 보고한다.
    await b.invalidateToken(stale);

    expect(await b.getAccessToken()).toBe(fresh);
    expect(kis.state.issued).toBe(2);
  });

  it('락 주인의 발급이 실패하면 기다리던 인스턴스는 따로 발급하지 않고 실패한다', async () => {
    const redis = fakeRedis();
    let attempts = 0;
    server.use(
      ...redis.handlers,
      http.post(`${BASE_URL}/oauth2/tokenP`, async () => {
        attempts += 1;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return HttpResponse.json(
          { error_description: '1분당 1회', error_code: 'EGW00133' },
          { status: 403 },
        );
      }),
    );

    const a = await loadInstance();
    const b = await loadInstance();
    const results = await Promise.allSettled([a.getAccessToken(), b.getAccessToken()]);

    expect(results.map((result) => result.status)).toEqual(['rejected', 'rejected']);
    expect(attempts).toBe(1);
    // 발급 실패 원인 코드는 진단용으로 남긴다.
    const reasons = results.map((result) => (result as PromiseRejectedResult).reason.detail);
    expect(reasons).toContain('HTTP 403 EGW00133');
  });

  it('저장소가 죽어 있으면 인스턴스에서 직접 발급해 서비스를 유지한다', async () => {
    const kis = fakeKis();
    const redis = fakeRedis();
    redis.state.down = true;
    server.use(kis.tokenHandler, ...redis.handlers);

    const { getAccessToken } = await loadInstance();

    expect(await getAccessToken()).toBe('tok1');
    expect(kis.state.issued).toBe(1);
  });
});
