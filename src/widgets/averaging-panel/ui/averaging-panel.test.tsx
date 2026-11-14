import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useHoldingsStore, type Holding } from '@/entities/holding';
import { useSimulationInputsStore } from '@/features/simulate-averaging';
import { renderWithQuery } from '@/shared/testing/render-with-query';
import { AveragingPanel } from './averaging-panel';

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
  refetch: vi.fn(),
}));
vi.mock('@/features/holding-quotes', () => ({ useHoldingQuotes: () => quotes }));
beforeEach(() => {
  quotes.prices = { '005930': { current: 800, prevClose: 800 } };
  quotes.status = 'success';
  quotes.refetch.mockClear();
  useHoldingsStore.setState({ holdings: [fixture], selectedId: 'a' });
  // 입력 스토어는 모듈 싱글턴이라 이전 테스트의 입력이 남는다
  useSimulationInputsStore.getState().reset();
});

describe('AveragingPanel', () => {
  it('예산과 가정 매수가를 반영하고 현재가로 초기화한다', async () => {
    const user = userEvent.setup();
    renderWithQuery(<AveragingPanel />);
    await user.click(screen.getByRole('radio', { name: '예산' }));
    const budget = screen.getByLabelText('투입 예산 (원)');
    await user.clear(budget);
    await user.type(budget, '10000');
    expect(screen.getByText('12주')).toBeInTheDocument();
    // 남는 예산은 AnimatedNumber라 카운팅이 끝날 때까지 기다린다
    expect(await screen.findByText('₩400')).toBeInTheDocument();
    const price = screen.getByLabelText('매수가 (원)');
    await user.clear(price);
    await user.type(price, '600');
    expect(screen.getByText('16주')).toBeInTheDocument();
    expect(screen.getByText('직접 입력한 가정 가격입니다.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '현재가로 초기화' }));
    expect(price).toHaveValue(800);
    expect(useHoldingsStore.getState().holdings).toEqual([fixture]);
  });
  it('200주 초과 입력과 빈 입력을 처리한다', async () => {
    const user = userEvent.setup();
    renderWithQuery(<AveragingPanel />);
    const input = screen.getByLabelText('추가 매수 수량 (주)');
    await user.clear(input);
    expect(
      screen.getByText('추가 매수 수량을 입력하면 결과가 여기에 표시됩니다.'),
    ).toBeInTheDocument();
    await user.type(input, '300');
    expect(screen.getByText('300주')).toBeInTheDocument();
  });
  it('시세 실패 시 가정 가격으로 계산하며 종목 변경 시 입력을 초기화한다', async () => {
    quotes.prices = {};
    const user = userEvent.setup();
    const view = renderWithQuery(<AveragingPanel />);
    await user.type(screen.getByLabelText('매수가 (원)'), '600');
    // 시세 없이도 가정 매수가로 결과가 나온다 (기본 30주)
    expect(screen.getByText('30주')).toBeInTheDocument();
    useHoldingsStore.setState({
      holdings: [{ ...fixture, id: 'b', code: '000660' }],
      selectedId: 'b',
    });
    view.rerender(<AveragingPanel />);
    expect(screen.getByLabelText('매수가 (원)')).toHaveValue(null);
  });

  it('첫 시세를 기다리는 동안에는 스켈레톤을 보여준다', () => {
    quotes.prices = {};
    quotes.status = 'pending';

    renderWithQuery(<AveragingPanel />);

    expect(screen.queryByLabelText('매수가 (원)')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '물타기 시뮬레이터' })).not.toBeInTheDocument();
  });

  it('시세 조회에 실패하면 이유와 다음 행동을 안내한다', async () => {
    quotes.prices = {};
    quotes.status = 'error';
    const user = userEvent.setup();

    renderWithQuery(<AveragingPanel />);

    expect(screen.getByText(/시세를 불러오지 못했어요/)).toBeInTheDocument();
    // 입력 오류처럼 보이는 문구가 아니라 무엇을 하면 되는지 알려준다
    expect(screen.getByText('매수가를 입력하면 결과가 여기에 표시됩니다.')).toBeInTheDocument();
    // 돌아갈 현재가가 없으니 초기화 버튼은 누를 수 없다
    expect(screen.getByRole('button', { name: '현재가로 초기화' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(quotes.refetch).toHaveBeenCalled();
  });

  it('계산할 수 없는 입력은 원인별로 안내한다', async () => {
    const user = userEvent.setup();
    renderWithQuery(<AveragingPanel />);

    const price = screen.getByLabelText('매수가 (원)');
    await user.clear(price);
    await user.type(price, '0');
    expect(screen.getByText('매수가는 1원 이상의 정수로 입력해주세요.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '현재가로 초기화' }));
    const quantity = screen.getByLabelText('추가 매수 수량 (주)');
    await user.clear(quantity);
    await user.type(quantity, '1.5');
    expect(screen.getByText('추가 매수 수량은 0 이상의 정수로 입력해주세요.')).toBeInTheDocument();
  });

  it('종목이 없으면 비활성 미리보기와 종목 추가 버튼을 보여준다', async () => {
    useHoldingsStore.setState({ holdings: [], selectedId: null });
    const user = userEvent.setup();

    renderWithQuery(<AveragingPanel />);

    expect(screen.getByText(/종목을 추가하면 추가 매수 수량·예산으로/)).toBeInTheDocument();
    expect(screen.getByTestId('averaging-panel-preview')).toHaveAttribute('inert');
    // 실제 폼이 아니라 미리보기다
    expect(screen.queryByLabelText('매수가 (원)')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '＋ 종목 추가' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('새 평단가와 변화율, 손익분기 주가를 보여준다', () => {
    renderWithQuery(<AveragingPanel />);

    // 기본 30주 × 800원: (100×1,000 + 30×800) / 130 = 953.8… → −4.62%
    expect(screen.getByText('−4.62%')).toBeInTheDocument();
    // 손익분기 주가는 올림: ₩954, 현재가 800 대비 +19.25%
    const rowOf = (label: string) => screen.getByText(label).parentElement;
    expect(rowOf('새 평단가')).toHaveTextContent('₩954');
    expect(rowOf('손익분기 주가')).toHaveTextContent('₩954현재가 대비 +19.25%');
  });
});
