import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useHoldingsStore, type Holding } from '@/entities/holding';
import { PortfolioSummary } from './portfolio-summary';

const fixture: Holding = {
  id: 'a',
  code: '005930',
  name: '삼성전자',
  sector: '전기·전자',
  quantity: 10,
  avgPrice: 1000,
};
const quotes = vi.hoisted(() => ({
  prices: {} as Record<string, { current: number; prevClose: number }>,
  status: 'success',
}));
vi.mock('@/features/holding-quotes', () => ({ useHoldingQuotes: () => quotes }));
beforeEach(() => {
  quotes.prices = {};
  quotes.status = 'success';
});

describe('PortfolioSummary', () => {
  it('종목이 없으면 금액은 ₩0, 손익률은 0.00%로 보여준다', () => {
    useHoldingsStore.setState({ holdings: [], selectedId: null });
    // 빈 상태에서 시세 쿼리가 대기 중이어도 스켈레톤 대신 값을 그린다
    quotes.status = 'pending';

    render(<PortfolioSummary />);

    expect(screen.getAllByText('₩0')).toHaveLength(4);
    expect(screen.getAllByText('0.00%')).toHaveLength(2);
    expect(screen.queryByText('—')).not.toBeInTheDocument();
  });

  it('종목은 있는데 시세를 하나도 못 받으면 평가 값을 —로 둔다', () => {
    useHoldingsStore.setState({ holdings: [fixture], selectedId: 'a' });
    quotes.status = 'error';

    render(<PortfolioSummary />);

    // 총 평가금액·평가손익·오늘 등락 금액 3개 + 손익률 2개
    expect(screen.getAllByText('—')).toHaveLength(5);
    expect(screen.getByText('₩10,000')).toBeInTheDocument();
  });
});
