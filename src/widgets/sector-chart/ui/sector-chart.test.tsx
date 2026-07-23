import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useHoldingsStore, type Holding } from '@/entities/holding';
import { SectorChart } from '../index';

function holding(partial: Partial<Holding> & Pick<Holding, 'id' | 'sector'>): Holding {
  return {
    code: '000000',
    name: partial.id,
    quantity: 1,
    avgPrice: 1_000,
    currentPrice: 1_000,
    prevClose: 1_000,
    ...partial,
  };
}

/** 범례 스와치는 li 안의 첫 span이다. 인라인 style에서 배경색을 읽는다. */
function swatchColorOf(sectorLabel: string): string {
  const item = screen.getByText(sectorLabel).closest('li');
  expect(item).not.toBeNull();
  const swatch = item!.querySelector('span');
  return (swatch as HTMLElement).style.backgroundColor;
}

const BLUE = 'rgb(42, 120, 214)'; // #2a78d6 — 반도체
const YELLOW = 'rgb(237, 161, 0)'; // #eda100 — 금융

beforeEach(() => {
  localStorage.clear();
});

describe('SectorChart 색상 배정', () => {
  it('섹터 색은 비중 순위가 아니라 섹터 이름을 따른다', () => {
    // 금융이 1위, 반도체가 2위 — 순위 순서와 팔레트 슬롯 순서가 어긋나는 배치
    useHoldingsStore.setState({
      holdings: [
        holding({ id: 'a', sector: '반도체', quantity: 10 }),
        holding({ id: 'b', sector: '금융', quantity: 90 }),
      ],
    });

    render(<SectorChart />);

    // 인덱스로 칠했다면 1위인 금융이 슬롯1(파랑)을 가져갔을 것이다
    expect(swatchColorOf('금융')).toBe(YELLOW);
    expect(swatchColorOf('반도체')).toBe(BLUE);
  });

  it('비중이 뒤집혀도 각 섹터의 색이 그대로다', () => {
    const initial = [
      holding({ id: 'a', sector: '반도체', quantity: 90 }),
      holding({ id: 'b', sector: '금융', quantity: 10 }),
    ];

    useHoldingsStore.setState({ holdings: initial });
    const { unmount } = render(<SectorChart />);
    expect(swatchColorOf('반도체')).toBe(BLUE);
    expect(swatchColorOf('금융')).toBe(YELLOW);
    unmount();

    // 주가가 움직여 순위가 뒤바뀐 상황
    useHoldingsStore.setState({
      holdings: [
        holding({ id: 'a', sector: '반도체', quantity: 10 }),
        holding({ id: 'b', sector: '금융', quantity: 90 }),
      ],
    });
    render(<SectorChart />);

    expect(swatchColorOf('반도체')).toBe(BLUE);
    expect(swatchColorOf('금융')).toBe(YELLOW);
  });
});
