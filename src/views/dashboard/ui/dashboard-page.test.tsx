import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DashboardPage } from '../index';

describe('DashboardPage', () => {
  it('세팅 완료 placeholder를 렌더한다', () => {
    render(<DashboardPage />);

    expect(screen.getByRole('heading', { name: /mool-ta-gi/ })).toBeInTheDocument();
  });
});
