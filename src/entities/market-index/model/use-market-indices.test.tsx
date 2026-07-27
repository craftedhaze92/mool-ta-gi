import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { indicesErrorHandler, indicesHandler } from '@/shared/api/mocks/indices';
import { server } from '@/shared/testing/msw-server';
import { QueryTestProvider } from '@/shared/testing/render-with-query';
import { useMarketIndices } from './use-market-indices';

const wrapper = QueryTestProvider;

describe('useMarketIndices', () => {
  it('지수를 코드별로 정리해 돌려준다', async () => {
    server.use(
      indicesHandler({
        '0001': { value: 2712.14, change: 18.52, changeRate: 0.69 },
        '1001': { value: 861.3, change: -4.21, changeRate: -0.49 },
      }),
    );

    const { result } = renderHook(() => useMarketIndices(), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.byCode['0001']).toMatchObject({ name: 'KOSPI', value: 2712.14 });
    expect(result.current.byCode['1001']).toMatchObject({ name: 'KOSDAQ', change: -4.21 });
    expect(result.current.isError).toBe(false);
  });

  it('일부 지수만 실패하면 나머지는 그대로 준다', async () => {
    // KOSDAQ이 안 온다고 KOSPI까지 감출 이유는 없다.
    server.use(indicesHandler({}, { failed: ['1001'] }));

    const { result } = renderHook(() => useMarketIndices(), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.byCode['0001']).toBeDefined();
    expect(result.current.byCode['1001']).toBeUndefined();
    expect(result.current.isError).toBe(false);
  });

  it('전체 실패하면 목데이터로 채우지 않고 에러 상태가 된다', async () => {
    server.use(indicesErrorHandler());

    const { result } = renderHook(() => useMarketIndices(), { wrapper });

    // 502는 한 번 재시도한다(retryDelay 1.5초). 기본 waitFor 타임아웃으로는 모자라다.
    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });

    expect(result.current.byCode).toEqual({});
  });

  it('429는 재시도하지 않고 곧바로 실패한다', async () => {
    server.use(indicesErrorHandler(429, 'RATE_LIMITED'));

    const { result } = renderHook(() => useMarketIndices(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 1000 });
  });
});
