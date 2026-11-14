import { act, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useHoldingsStore, type Holding } from '@/entities/holding';
import {
  holdingKey,
  useSimulationInputsStore,
  type SimulationInputs,
} from '@/features/simulate-averaging';
import { renderWithQuery } from '@/shared/testing/render-with-query';
import { SimulationDetail } from '../index';

const fixture: Holding = {
  id: 'a',
  code: '005930',
  name: '삼성전자',
  sector: '전기·전자',
  quantity: 100,
  avgPrice: 1000,
};

const quotes = vi.hoisted(() => ({
  prices: {} as Record<string, { current: number; prevClose: number }>,
  status: 'success',
  refetch: () => {},
}));
vi.mock('@/features/holding-quotes', () => ({ useHoldingQuotes: () => quotes }));

beforeEach(() => {
  quotes.prices = { '005930': { current: 800, prevClose: 800 } };
  useHoldingsStore.setState({ holdings: [fixture], selectedId: 'a' });
  useSimulationInputsStore.getState().reset();
});

/**
 * 입력은 시뮬레이터 패널이 받는다. 패널은 같은 레이어라 여기서 import할 수 없으므로
 * 패널이 하는 일(입력 스토어 갱신)을 직접 한다. 둘이 실제로 이어지는지는 대시보드 테스트가 본다.
 */
function typeIntoPanel(patch: Partial<SimulationInputs>) {
  act(() => useSimulationInputsStore.getState().update(holdingKey(fixture), patch));
}

describe('SimulationDetail', () => {
  it('시뮬레이터 입력으로 전후 비교 표를 그린다', () => {
    renderWithQuery(<SimulationDetail />);

    typeIntoPanel({ quantity: '300' });

    const table = screen.getByRole('table', { name: '추가 매수 전후 비교' });
    expect(within(table).getByText('400주')).toBeInTheDocument();
    // (100×1,000 + 300×800) / 400 = 850
    expect(within(table).getByText('₩850')).toBeInTheDocument();
  });

  it('시세가 없어도 가정 매수가로 손익 표를 그리고, 비중은 계산 불가로 둔다', () => {
    quotes.prices = {};
    renderWithQuery(<SimulationDetail />);

    typeIntoPanel({ customPrice: '600' });

    expect(screen.getByRole('table', { name: '가정 가격별 종목 손익' })).toBeInTheDocument();
    expect(screen.getByText(/일부 종목의 시세가 없어/)).toBeInTheDocument();
  });

  it('계산할 수 없는 입력이면 표 대신 패널과 같은 이유를 보여준다', () => {
    renderWithQuery(<SimulationDetail />);

    typeIntoPanel({ quantity: '' });

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(
      screen.getByText('추가 매수 수량을 입력하면 결과가 여기에 표시됩니다.'),
    ).toBeInTheDocument();
  });

  it('보유 종목이 없으면 카드를 그리지 않는다', () => {
    useHoldingsStore.setState({ holdings: [], selectedId: null });

    renderWithQuery(<SimulationDetail />);

    expect(screen.queryByRole('heading', { name: /추가 매수 상세/ })).not.toBeInTheDocument();
  });
});
