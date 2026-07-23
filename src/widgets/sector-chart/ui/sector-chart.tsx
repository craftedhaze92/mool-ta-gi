'use client';

import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { calcSectorAllocation, MOCK_HOLDINGS } from '@/entities/holding';
import { formatPercent } from '@/shared/lib/format-won';

/** 시안 섹터 팔레트. 항목이 4개를 넘으면 순환한다. */
const SECTOR_COLORS = ['#33415c', '#5a719c', '#93a6c6', '#cfd8e6'];

export function SectorChart() {
  const slices = calcSectorAllocation(MOCK_HOLDINGS);

  return (
    <section className="bg-card rounded-2xl px-6 py-5">
      <h2 className="mb-3.5 text-[15px] font-bold">섹터별 비중</h2>

      <div className="flex items-center gap-[22px]">
        <div className="h-[164px] w-[164px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="label"
                innerRadius={59}
                outerRadius={81}
                startAngle={90}
                endAngle={-270}
                paddingAngle={0}
                stroke="none"
                isAnimationActive
                animationDuration={600}
              >
                {slices.map((slice, index) => (
                  <Cell key={slice.key} fill={SECTOR_COLORS[index % SECTOR_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <ul className="flex flex-col gap-2.5 text-[13px]">
          {slices.map((slice, index) => (
            <li key={slice.key} className="flex items-center gap-2">
              <span
                className="size-2.5 rounded-[3px]"
                style={{ backgroundColor: SECTOR_COLORS[index % SECTOR_COLORS.length] }}
              />
              <span className="flex-1">{slice.label}</span>
              <span className="font-bold">{formatPercent(slice.ratio, { digits: 1 })}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
