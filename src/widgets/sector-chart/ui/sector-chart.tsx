'use client';

import { Pie, PieChart, ResponsiveContainer } from 'recharts';
import { calcSectorAllocation, SECTORS, useHoldingsStore, type Sector } from '@/entities/holding';
import { formatPercent } from '@/shared/lib/format-won';

/**
 * 섹터별 고정 색상. app/globals.css의 --color-sector-* 와 같은 값이다
 * (recharts와 인라인 style은 CSS 변수를 그대로 못 받아 여기 미러링한다).
 *
 * 슬라이스 인덱스가 아니라 **섹터 이름**으로 색을 잡는다. 슬라이스는 비중 내림차순으로
 * 정렬되므로 인덱스로 칠하면 주가가 변해 순위가 바뀔 때 섹터끼리 색을 주고받는다.
 */
const SECTOR_COLORS: Record<Sector, string> = {
  반도체: '#2a78d6',
  인터넷: '#eb6834',
  자동차: '#1baf7a',
  금융: '#eda100',
  바이오: '#e87ba4',
  '2차전지': '#008300',
  기타: '#4a3aa7',
};

/** SECTORS에 없는 섹터가 저장돼 있어도 화면이 깨지지 않게 한다. */
function colorOf(sector: string): string {
  return SECTOR_COLORS[sector as Sector] ?? SECTOR_COLORS[SECTORS[SECTORS.length - 1]];
}

export function SectorChart() {
  const holdings = useHoldingsStore((state) => state.holdings);
  const slices = calcSectorAllocation(holdings);

  /*
   * 조각 색은 데이터에 fill로 실어 보낸다. recharts는 데이터 객체를 sector props로
   * 펼치므로 이 값이 그대로 조각 색이 된다.
   * (Cell 컴포넌트는 recharts 4.0에서 제거 예정이라 쓰지 않는다)
   */
  const data = slices.map((slice) => ({ ...slice, fill: colorOf(slice.key) }));

  return (
    <section className="bg-card rounded-2xl px-6 py-5">
      <h2 className="mb-3.5 text-[15px] font-bold">섹터별 비중</h2>

      {slices.length === 0 ? (
        <p className="text-muted-foreground py-10 text-center text-[13px]">
          종목을 추가하면 비중이 표시됩니다
        </p>
      ) : (
        <div className="flex items-center gap-[22px]">
          <div className="h-[164px] w-[164px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={59}
                  outerRadius={81}
                  startAngle={90}
                  endAngle={-270}
                  /* 조각 사이 표면 색 간격 — 인접한 두 색이 맞닿지 않게 띄운다 */
                  paddingAngle={1.5}
                  stroke="none"
                  isAnimationActive
                  animationDuration={600}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="flex min-w-0 flex-1 flex-col gap-2.5 text-[13px]">
            {slices.map((slice) => (
              <li key={slice.key} className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-[3px]"
                  style={{ backgroundColor: colorOf(slice.key) }}
                />
                <span className="flex-1 whitespace-nowrap">{slice.label}</span>
                <span className="font-bold">{formatPercent(slice.ratio, { digits: 1 })}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
