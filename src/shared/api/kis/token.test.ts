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
    invalidateToken(first);

    expect(await getAccessToken()).toBe('tok2');
    expect(kis.state.issued).toBe(2);
  });

  it('이미 교체된 옛 토큰의 거절은 새 토큰을 버리지 않는다', async () => {
    const kis = fakeKis();
    server.use(kis.tokenHandler);
    const { getAccessToken, invalidateToken } = await loadToken();

    const stale = await getAccessToken();
    // 요청 A가 먼저 거절을 겪고 재발급까지 마쳤다.
    invalidateToken(stale);
    const fresh = await getAccessToken();

    // 같은 옛 토큰을 들고 있던 요청 B가 뒤늦게 거절을 보고한다.
    invalidateToken(stale);

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
