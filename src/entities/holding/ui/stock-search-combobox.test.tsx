import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { MOCK_STOCKS, stocksErrorHandler } from '@/shared/api/mocks/stocks';
import { createStockIndex } from '@/shared/api/stock-master/search';
import { server } from '@/shared/testing/msw-server';
import { renderWithQuery } from '@/shared/testing/render-with-query';
import { StockSearchCombobox } from './stock-search-combobox';

async function openAndType(keyword: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole('combobox', { name: '종목' }));
  await user.type(screen.getByRole('combobox', { name: '종목 검색어' }), keyword);
  return user;
}

function renderCombobox(onSelect = vi.fn()) {
  renderWithQuery(
    <>
      <span id="label">종목</span>
      <StockSearchCombobox value="" onSelect={onSelect} aria-labelledby="label" />
    </>,
  );
  return onSelect;
}

describe('StockSearchCombobox', () => {
  it('서버가 매긴 순서대로 보여주고, 고르면 종목명과 코드를 함께 넘긴다', async () => {
    const onSelect = renderCombobox();
    const user = await openAndType('카카오');

    const options = await screen.findAllByRole('option');
    expect(options.map((o) => o.getAttribute('aria-label'))).toEqual([
      '카카오 (035720, KOSPI)',
      '카카오뱅크 (323410, KOSPI)',
    ]);

    await user.click(options[1]);
    expect(onSelect).toHaveBeenCalledWith({ code: '323410', name: '카카오뱅크', market: 'KOSPI' });
    // 고르면 목록이 닫힌다
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('결과가 없으면 안내 문구를 보여준다', async () => {
    renderCombobox();
    await openAndType('없는종목');

    expect(await screen.findByText('검색 결과가 없습니다.')).toBeInTheDocument();
  });

  it('검색이 실패하면 에러를 보여준다', async () => {
    server.use(stocksErrorHandler());
    renderCombobox();
    await openAndType('삼성');

    expect(await screen.findByRole('alert')).toHaveTextContent('종목을 검색하지 못했습니다.');
  });

  /*
   * 회귀: 검색어를 바꾼 직후에는 이전 검색어의 결과가 목록에 남아 있다(keepPreviousData).
   * 이 결과는 보이기만 하고 고를 수 없어야 한다. 종목코드가 시세 조회 키라서 여기서 잘못 고르면
   * 다른 종목의 시세가 붙는다.
   */
  describe('검색어가 바뀐 뒤 결과가 준비되기 전', () => {
    const option = (name: string) =>
      screen.findByRole('option', { name: new RegExp(`^${name} \\(`) });

    it('바로 Enter를 눌러도 이전 결과가 선택되지 않고, 결과가 준비되면 다시 선택된다', async () => {
      const onSelect = renderCombobox();
      const user = await openAndType('삼성');
      await option('삼성전자');

      const input = screen.getByRole('combobox', { name: '종목 검색어' });
      await user.clear(input);
      await user.type(input, '카카오');
      await user.keyboard('{Enter}');

      expect(onSelect).not.toHaveBeenCalled();

      // 현재 검색어의 결과가 오면 첫 항목이 하이라이트되고 Enter로 고를 수 있다
      await waitFor(() =>
        expect(screen.getByRole('option', { name: /^카카오 \(/ })).toHaveAttribute(
          'aria-selected',
          'true',
        ),
      );
      await user.keyboard('{Enter}');

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith({ code: '035720', name: '카카오', market: 'KOSPI' });
    });

    it('응답이 늦는 동안 이전 결과를 클릭해도 선택되지 않는다', async () => {
      const index = createStockIndex(MOCK_STOCKS);
      let release!: () => void;
      const gate = new Promise<void>((resolve) => (release = resolve));
      let delayedRequested = false;

      // '카카오' 응답만 붙잡아 둔다. 다른 검색어는 바로 응답한다
      server.use(
        http.get('*/api/stocks', async ({ request }) => {
          const query = new URL(request.url).searchParams.get('q') ?? '';
          if (query === '카카오') {
            delayedRequested = true;
            await gate;
          }
          return HttpResponse.json({ stocks: index.search(query) });
        }),
      );

      const onSelect = renderCombobox();
      const user = await openAndType('삼성');
      await option('삼성전자');

      const input = screen.getByRole('combobox', { name: '종목 검색어' });
      await user.clear(input);
      await user.type(input, '카카오');
      // 디바운스가 끝나 요청이 실제로 나간 상태를 만든다
      await waitFor(() => expect(delayedRequested).toBe(true));

      expect(screen.getByRole('status')).toHaveTextContent('검색 중');
      const stale = screen.getByRole('option', { name: /^삼성전자 \(/ });
      expect(stale).toHaveAttribute('aria-disabled', 'true');

      await user.click(stale);
      expect(onSelect).not.toHaveBeenCalled();

      release();

      await user.click(await option('카카오'));
      expect(onSelect).toHaveBeenCalledWith({ code: '035720', name: '카카오', market: 'KOSPI' });
    });
  });
});
