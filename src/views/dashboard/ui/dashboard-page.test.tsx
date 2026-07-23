import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DashboardPage } from '../index';

describe('DashboardPage', () => {
  it('요약 카드에 목데이터 파생 수치를 표시한다', () => {
    render(<DashboardPage />);

    expect(screen.getByText('₩23,653,500')).toBeInTheDocument(); // 총 평가금액
    expect(screen.getByText('₩24,414,000')).toBeInTheDocument(); // 총 매입금액
  });

  it('보유 종목 4건을 모두 렌더한다', () => {
    render(<DashboardPage />);

    for (const name of ['삼성전자', 'SK하이닉스', 'NAVER', '현대차']) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }
  });

  it('행을 클릭하면 시뮬레이터가 해당 종목으로 바뀐다', async () => {
    const user = userEvent.setup();
    render(<DashboardPage />);

    const panel = screen.getByRole('complementary');
    expect(within(panel).getByText('삼성전자')).toBeInTheDocument();

    const rows = screen.getAllByRole('row');
    const hynixRow = rows.find((row) => within(row).queryByText('SK하이닉스'));
    expect(hynixRow).toBeDefined();

    await user.click(hynixRow!);

    expect(within(panel).getByText('SK하이닉스')).toBeInTheDocument();
  });
});
