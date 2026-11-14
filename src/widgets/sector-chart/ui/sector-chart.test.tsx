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

const BLUE = 'rgb(42, 120, 214)'; // #2a78d6 — 팔레트 1번
const ORANGE = 'rgb(235, 104, 52)'; // #eb6834 — 팔레트 2번
const VIOLET = 'rgb(74, 58, 167)'; // #4a3aa7 — '기타' 전용

/** 시세가 도착해 범례가 그려질 때까지 기다린다. 그 전에는 스켈레톤이다. */
async function renderChart() {
  renderWithQuery(<SectorChart />);
  await screen.findByText('전기·전자');
}

beforeEach(() => {
  localStorage.clear();
});

describe('SectorChart 색상 배정', () => {
  /*
   * 색은 보유 섹터의 이름순(금융 < 전기·전자)으로 정해진다. 아래 배치는 비중 1위가 전기·전자라
   * 순위로 칠했다면 전기·전자가 파랑을 가져갔을 것이다.
   */
  it('섹터 색은 비중 순위가 아니라 섹터 이름순을 따른다', async () => {
    useHoldingsStore.setState({
      holdings: [
        holding({ id: 'a', code: '000001', sector: '전기·전자', quantity: 90 }),
        holding({ id: 'b', code: '000002', sector: '금융', quantity: 10 }),
      ],
    });

    await renderChart();

    expect(swatchColorOf('금융')).toBe(BLUE);
    expect(swatchColorOf('전기·전자')).toBe(ORANGE);
  });

  it('비중이 뒤집혀도 각 섹터의 색이 그대로다', async () => {
    useHoldingsStore.setState({
      holdings: [
        holding({ id: 'a', code: '000001', sector: '전기·전자', quantity: 90 }),
        holding({ id: 'b', code: '000002', sector: '금융', quantity: 10 }),
      ],
    });
    const { unmount } = renderWithQuery(<SectorChart />);
    await screen.findByText('전기·전자');
    expect(swatchColorOf('금융')).toBe(BLUE);
    expect(swatchColorOf('전기·전자')).toBe(ORANGE);
    unmount();

    // 주가가 움직여 순위가 뒤바뀐 상황
    useHoldingsStore.setState({
      holdings: [
        holding({ id: 'a', code: '000001', sector: '전기·전자', quantity: 10 }),
        holding({ id: 'b', code: '000002', sector: '금융', quantity: 90 }),
      ],
    });
    await renderChart();

    expect(swatchColorOf('금융')).toBe(BLUE);
    expect(swatchColorOf('전기·전자')).toBe(ORANGE);
  });

  it("'기타'는 이름순과 무관하게 전용 색이다", async () => {
    useHoldingsStore.setState({
      holdings: [
        holding({ id: 'a', code: '000001', sector: '전기·전자', quantity: 10 }),
        holding({ id: 'b', code: '000002', sector: '기타', quantity: 10 }),
      ],
    });

    await renderChart();

    expect(swatchColorOf('전기·전자')).toBe(BLUE);
    expect(swatchColorOf('기타')).toBe(VIOLET);
  });
});
