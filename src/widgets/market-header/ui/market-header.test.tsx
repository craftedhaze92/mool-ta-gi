import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  indicesErrorHandler,
  indicesHandler,
  indicesPendingHandler,
} from '@/shared/api/mocks/indices';
import { server } from '@/shared/testing/msw-server';
import { renderWithQuery } from '@/shared/testing/render-with-query';
import { MarketHeader } from '../index';

describe('MarketHeader 지수 표시', () => {
  it('지수 값과 등락을 표시한다', async () => {
    server.use(
      indicesHandler({
        '0001': { value: 2712.14, change: 18.52, changeRate: 0.69 },
        '1001': { value: 861.3, change: -4.21, changeRate: -0.49 },
      }),
    );

    renderWithQuery(<MarketHeader />);

    expect(await screen.findByText('2,712.14')).toBeInTheDocument();
    expect(screen.getByText('861.30')).toBeInTheDocument();

    // 등락은 절댓값으로 그리고 방향은 화살표와 색으로 표현한다
    expect(screen.getByText(/18\.52 \(\+0\.69%\)/)).toBeInTheDocument();
    expect(screen.getByText(/4\.21 \(−0\.49%\)/)).toBeInTheDocument();
    // 화살표는 aria-hidden인 별도 span이라 따로 확인한다
    expect(screen.getByText('▲')).toBeInTheDocument();
    expect(screen.getByText('▼')).toBeInTheDocument();
  });

  /*
   * 이름은 조회 전에도 아는 값이라 항상 보여야 한다. 값 자리만 가린다.
   */
  it('로딩 중에도 지수 이름은 보이고 값 자리만 스켈레톤이다', () => {
    server.use(indicesPendingHandler());

    const { container } = renderWithQuery(<MarketHeader />);

    expect(screen.getByText('KOSPI')).toBeInTheDocument();
    expect(screen.getByText('KOSDAQ')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it('지수를 못 받으면 목데이터가 아니라 —를 보여준다', async () => {
    server.use(indicesErrorHandler());

    renderWithQuery(<MarketHeader />);

    // 502는 한 번 재시도하므로 여유를 준다.
    expect(await screen.findAllByText('—', {}, { timeout: 5000 })).toHaveLength(2);
    expect(screen.getByText('KOSPI')).toBeInTheDocument();
  });

  it('일부 지수만 실패하면 그 지수만 —로 표시한다', async () => {
    server.use(indicesHandler({}, { failed: ['1001'] }));

    renderWithQuery(<MarketHeader />);

    await screen.findByText('2,712.14'); // KOSPI는 정상
    expect(screen.getAllByText('—')).toHaveLength(1); // KOSDAQ만 실패
  });
});

describe('MarketHeader 시세 상태', () => {
  it('장 상태를 모르는 첫 렌더에서는 배지를 그리지 않는다', () => {
    renderWithQuery(<MarketHeader marketOpen={null} />);
    expect(screen.queryByText('장 마감')).not.toBeInTheDocument();
  });

  it('장이 닫혔을 때만 장 마감 배지를 보여준다', () => {
    const { unmount } = renderWithQuery(<MarketHeader marketOpen={false} />);
    expect(screen.getByText('장 마감')).toBeInTheDocument();
    unmount();

    renderWithQuery(<MarketHeader marketOpen />);
    expect(screen.queryByText('장 마감')).not.toBeInTheDocument();
  });

  it('마지막 갱신 시각을 KST로 표시한다', () => {
    // UTC 00:30 → KST 09:30
    renderWithQuery(<MarketHeader fetchedAt="2026-07-23T00:30:00.000Z" />);
    expect(screen.getByText('마지막 갱신 09:30')).toBeInTheDocument();
  });

  it('첫 조회 전에는 갱신 시각을 그리지 않는다', () => {
    renderWithQuery(<MarketHeader />);
    expect(screen.queryByText(/마지막 갱신/)).not.toBeInTheDocument();
  });

  it('시세가 실패하면 갱신 시각 대신 재시도 버튼을 보여준다', () => {
    renderWithQuery(<MarketHeader fetchedAt="2026-07-23T00:30:00.000Z" quoteFailed />);

    expect(screen.getByRole('button', { name: '시세 다시 불러오기' })).toBeInTheDocument();
    expect(screen.queryByText(/마지막 갱신/)).not.toBeInTheDocument();
  });
});
