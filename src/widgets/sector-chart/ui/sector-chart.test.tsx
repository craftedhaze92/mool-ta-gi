import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useHoldingsStore, type Holding } from '@/entities/holding';
import { renderWithQuery } from '@/shared/testing/render-with-query';
import { SectorChart } from '../index';

/**
 * 종목코드는 서로 달라야 한다. 시세는 코드로 조회되므로 같은 코드를 쓰면 두 종목이
 * 한 종목으로 합쳐진다.
 */
function holding(partial: Partial<Holding> & Pick<Holding, 'id' | 'sector' | 'code'>): Holding {
  return {
    name: partial.id,
    quantity: 1,
    avgPrice: 1_000,
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

/** 시세가 도착해 범례가 그려질 때까지 기다린다. 그 전에는 스켈레톤이다. */
async function renderChart() {
  renderWithQuery(<SectorChart />);
  await screen.findByText('반도체');
}

beforeEach(() => {
  localStorage.clear();
});

describe('SectorChart 색상 배정', () => {
  it('섹터 색은 비중 순위가 아니라 섹터 이름을 따른다', async () => {
    // 금융이 1위, 반도체가 2위 — 순위 순서와 팔레트 슬롯 순서가 어긋나는 배치
    useHoldingsStore.setState({
      holdings: [
        holding({ id: 'a', code: '000001', sector: '반도체', quantity: 10 }),
        holding({ id: 'b', code: '000002', sector: '금융', quantity: 90 }),
      ],
    });

    await renderChart();

    // 인덱스로 칠했다면 1위인 금융이 슬롯1(파랑)을 가져갔을 것이다
    expect(swatchColorOf('금융')).toBe(YELLOW);
    expect(swatchColorOf('반도체')).toBe(BLUE);
  });

  it('비중이 뒤집혀도 각 섹터의 색이 그대로다', async () => {
    const initial = [
      holding({ id: 'a', code: '000001', sector: '반도체', quantity: 90 }),
      holding({ id: 'b', code: '000002', sector: '금융', quantity: 10 }),
    ];

    useHoldingsStore.setState({ holdings: initial });
    const { unmount } = renderWithQuery(<SectorChart />);
    await screen.findByText('반도체');
    expect(swatchColorOf('반도체')).toBe(BLUE);
    expect(swatchColorOf('금융')).toBe(YELLOW);
    unmount();

    // 주가가 움직여 순위가 뒤바뀐 상황
    useHoldingsStore.setState({
      holdings: [
        holding({ id: 'a', code: '000001', sector: '반도체', quantity: 10 }),
        holding({ id: 'b', code: '000002', sector: '금융', quantity: 90 }),
      ],
    });
    await renderChart();

    expect(swatchColorOf('반도체')).toBe(BLUE);
    expect(swatchColorOf('금융')).toBe(YELLOW);
  });
});
