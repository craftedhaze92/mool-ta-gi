import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useHoldingsStore } from '@/entities/holding';
import { DashboardPage } from '../index';

/**
 * 스토어는 싱글턴이고 persist가 localStorage를 물고 있어서
 * 테스트마다 저장소와 상태를 seed로 되돌린다.
 */
beforeEach(() => {
  localStorage.clear();
  const seed = useHoldingsStore.getInitialState();
  useHoldingsStore.setState({
    ...seed,
    holdings: seed.holdings.map((h) => ({ ...h })),
  });
});

/** 하이드레이션 게이트가 열린 뒤의 화면을 얻는다. */
async function renderDashboard() {
  render(<DashboardPage />);
  await screen.findByText('보유 종목');
}

function rowOf(name: string) {
  const row = screen.getAllByRole('row').find((r) => within(r).queryByText(name));
  expect(row).toBeDefined();
  return row!;
}

describe('DashboardPage', () => {
  it('요약 카드에 스토어 파생 수치를 표시한다', async () => {
    await renderDashboard();

    expect(screen.getByText('₩23,653,500')).toBeInTheDocument(); // 총 평가금액
    expect(screen.getByText('₩24,414,000')).toBeInTheDocument(); // 총 매입금액
  });

  it('보유 종목 4건을 모두 렌더한다', async () => {
    await renderDashboard();

    for (const name of ['삼성전자', 'SK하이닉스', 'NAVER', '현대차']) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }
  });

  it('행을 클릭하면 시뮬레이터가 해당 종목으로 바뀐다', async () => {
    const user = userEvent.setup();
    await renderDashboard();

    const panel = screen.getByRole('complementary');
    expect(within(panel).getByText('삼성전자')).toBeInTheDocument();

    await user.click(rowOf('SK하이닉스'));

    expect(within(panel).getByText('SK하이닉스')).toBeInTheDocument();
  });

  it('종목을 추가하면 테이블과 시뮬레이터에 반영된다', async () => {
    const user = userEvent.setup();
    await renderDashboard();

    await user.click(screen.getByRole('button', { name: '＋ 종목 추가' }));

    await user.type(screen.getByPlaceholderText('예: 삼성전자'), '카카오');
    await user.type(screen.getByPlaceholderText('예: 005930'), '035720');
    await user.type(screen.getByPlaceholderText('주'), '90');
    const [avgInput, curInput] = screen.getAllByPlaceholderText('원');
    await user.type(avgInput, '58200');
    await user.type(curInput, '41850');

    await user.click(screen.getByRole('button', { name: '저장' }));

    // 테이블에 행이 생기고, 추가한 종목이 곧바로 시뮬레이터에 물린다
    expect(within(rowOf('카카오')).getByText('90주')).toBeInTheDocument();
    expect(within(screen.getByRole('complementary')).getByText('카카오')).toBeInTheDocument();
  });

  it('필수값이 비면 폼 하단에 에러를 보여주고 저장하지 않는다', async () => {
    const user = userEvent.setup();
    await renderDashboard();

    await user.click(screen.getByRole('button', { name: '＋ 종목 추가' }));
    await user.click(screen.getByRole('button', { name: '저장' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('종목명을 입력해주세요.');
    expect(useHoldingsStore.getState().holdings).toHaveLength(4);
  });

  it('이미 보유한 종목코드로 추가하면 합산 미리보기를 거쳐 기존 행을 갱신한다', async () => {
    const user = userEvent.setup();
    await renderDashboard();

    await user.click(screen.getByRole('button', { name: '＋ 종목 추가' }));

    await user.type(screen.getByPlaceholderText('예: 삼성전자'), '삼성전자');
    await user.type(screen.getByPlaceholderText('예: 005930'), '005930');
    await user.type(screen.getByPlaceholderText('주'), '30');
    const [avgInput, curInput] = screen.getAllByPlaceholderText('원');
    await user.type(avgInput, '71200');
    await user.type(curInput, '71200');

    await user.click(screen.getByRole('button', { name: '저장' }));

    // (120×78,400 + 30×71,200) / 150 = 76,960
    expect(await screen.findByText(/새 평단가 ₩76,960/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '합산하기' }));

    const holdings = useHoldingsStore.getState().holdings;
    expect(holdings).toHaveLength(4); // 행이 늘지 않는다
    expect(holdings[0]).toMatchObject({ quantity: 150, avgPrice: 76_960 });
  });

  it('종목을 삭제하면 목록에서 사라진다', async () => {
    const user = userEvent.setup();
    await renderDashboard();

    await user.click(screen.getByRole('button', { name: 'NAVER 더보기' }));
    await user.click(await screen.findByRole('menuitem', { name: '종목 삭제' }));
    await user.click(await screen.findByRole('button', { name: '삭제' }));

    expect(useHoldingsStore.getState().holdings.map((h) => h.name)).toEqual([
      '삼성전자',
      'SK하이닉스',
      '현대차',
    ]);
  });

  it('종목이 하나도 없으면 빈 상태를 보여준다', async () => {
    useHoldingsStore.setState({ holdings: [], selectedId: null });
    await renderDashboard();

    expect(screen.getByText('아직 보유 종목이 없어요')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '첫 종목 추가하기' })).toBeInTheDocument();
    expect(screen.getAllByText('종목을 추가하면 비중이 표시됩니다')).toHaveLength(2);
    expect(screen.getByText(/왼쪽에서 종목을 추가하면/)).toBeInTheDocument();
  });
});
