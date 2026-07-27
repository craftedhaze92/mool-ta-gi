import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';

/**
 * React-Query가 필요한 컴포넌트를 렌더한다.
 *
 * 앱의 QueryProvider를 그대로 쓰지 않는 이유는 테스트용 기본값이 달라야 하기 때문이다.
 * retry를 끄지 않으면 실패 테스트가 재시도를 기다리다 느려지고, 재시도 중간 상태가
 * 단언을 흔든다.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}

/** 테스트마다 새 QueryClient를 준다. 캐시가 테스트 사이에 새지 않게 하려는 것이다. */
export function QueryTestProvider({
  children,
  client,
}: {
  children: ReactNode;
  client?: QueryClient;
}) {
  const [queryClient] = [client ?? createTestQueryClient()];
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export function renderWithQuery(
  ui: ReactElement,
  options: Omit<RenderOptions, 'wrapper'> & { client?: QueryClient } = {},
): RenderResult {
  const client = options.client ?? createTestQueryClient();

  return render(ui, {
    ...options,
    wrapper: ({ children }) => <QueryTestProvider client={client}>{children}</QueryTestProvider>,
  });
}
