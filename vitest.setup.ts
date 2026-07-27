import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './src/shared/testing/msw-server';

/**
 * jsdom에는 ResizeObserver가 없다.
 * Radix Slider와 recharts ResponsiveContainer가 마운트 시 이걸 요구하므로 스텁을 넣는다.
 */
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

/*
 * MSW 목 서버.
 *
 * onUnhandledRequest: 'error'로 두면 목이 없는 요청이 조용히 새어나가지 않는다.
 * 실수로 진짜 네트워크를 치는 테스트는 그 자리에서 드러나는 편이 낫다.
 */
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
// 한 테스트에서 server.use()로 갈아끼운 핸들러가 다음 테스트로 새지 않게 되돌린다.
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
