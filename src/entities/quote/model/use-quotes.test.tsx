import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { quotesErrorHandler, quotesHandler, MOCK_FETCHED_AT } from '@/shared/api/mocks/quotes';
import { server } from '@/shared/testing/msw-server';
import { QueryTestProvider } from '@/shared/testing/render-with-query';
import { normalizeCodes, quotesQueryKey } from './query-keys';
import { useQuotes } from './use-quotes';

const wrapper = QueryTestProvider;

describe('normalizeCodes', () => {
  it('중복을 없애고 정렬한다', () => {
    expect(normalizeCodes(['035420', '005930', '005930'])).toEqual(['005930', '035420']);
  });

  it('6자리 숫자가 아닌 값은 버린다', () => {
    expect(normalizeCodes(['005930', '', '—', 'abc', '12345'])).toEqual(['005930']);
  });
});

describe('quotesQueryKey', () => {
  it('순서가 달라도 같은 키를 만든다 (위젯 여러 개가 한 요청으로 합쳐지는 근거)', () => {
    expect(quotesQueryKey(['035420', '005930'])).toEqual(quotesQueryKey(['005930', '035420']));
  });
});

describe('useQuotes', () => {
  it('시세를 코드별로 정리해 돌려준다', async () => {
    server.use(
      quotesHandler({
        '005930': { current: 71_200, prevClose: 72_300 },
        '000660': { current: 199_500, prevClose: 198_000 },
      }),
    );

    const { result } = renderHook(() => useQuotes(['005930', '000660']), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.byCode['005930']).toMatchObject({ current: 71_200, prevClose: 72_300 });
    expect(result.current.byCode['000660']?.current).toBe(199_500);
    expect(result.current.failed).toEqual([]);
    expect(result.current.fetchedAt).toBe(MOCK_FETCHED_AT);
    expect(result.current.isError).toBe(false);
  });

  it('일부 종목만 실패하면 나머지는 그대로 준다', async () => {
    server.use(
      quotesHandler({ '005930': { current: 71_200, prevClose: 72_300 } }, { failed: ['000660'] }),
    );

    const { result } = renderHook(() => useQuotes(['005930', '000660']), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.byCode['005930']?.current).toBe(71_200);
    expect(result.current.byCode['000660']).toBeUndefined();
    expect(result.current.failed).toEqual(['000660']);
    // 부분 실패는 전체 실패가 아니다.
    expect(result.current.isError).toBe(false);
  });

  it('전체 실패하면 목데이터로 채우지 않고 에러 상태가 된다', async () => {
    server.use(quotesErrorHandler());

    const { result } = renderHook(() => useQuotes(['005930']), { wrapper });

    // 502는 한 번 재시도한다(retryDelay 1.5초). 기본 waitFor 타임아웃으로는 모자라다.
    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });

    expect(result.current.byCode).toEqual({});
    expect(result.current.fetchedAt).toBeUndefined();
  });

  it('429(유량 초과)는 재시도하지 않고 곧바로 실패한다', async () => {
    /*
     * 실측한 KIS 한도가 초당 약 1건이라, 한도에 걸린 직후 다시 쏘면 악화시키기만 한다.
     * 재시도가 없으므로 retryDelay를 기다리지 않고 바로 에러가 되어야 한다.
     */
    server.use(quotesErrorHandler(429, 'RATE_LIMITED'));

    const { result } = renderHook(() => useQuotes(['005930']), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 1000 });
  });

  it('코드가 없으면 요청하지 않고 로딩으로도 보지 않는다', () => {
    const { result } = renderHook(() => useQuotes([]), { wrapper });

    expect(result.current.isPending).toBe(false);
    expect(result.current.byCode).toEqual({});
  });

  it('enabled가 false면 요청하지 않는다 (하이드레이션 전 seed 코드로 새는 것을 막는다)', () => {
    const { result } = renderHook(() => useQuotes(['005930'], { enabled: false }), { wrapper });

    expect(result.current.isPending).toBe(false);
  });
});
