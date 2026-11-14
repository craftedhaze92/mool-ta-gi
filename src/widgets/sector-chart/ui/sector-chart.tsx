'use client';

import { Pie, PieChart, ResponsiveContainer, Tooltip, type TooltipContentProps } from 'recharts';
import { calcSectorAllocation, useHoldingsStore, type AllocationSlice } from '@/entities/holding';
import { useHoldingQuotes } from '@/features/holding-quotes';
import { formatPercent, formatWon } from '@/shared/lib/format-won';
import { ChartTooltip } from '@/shared/ui/chart-tooltip';
import { cn } from '@/shared/lib/utils';
import { EMPTY_CARD, EMPTY_MESSAGE } from '@/shared/ui/chart-empty';
import { Skeleton } from '@/shared/ui/skeleton';

/**
 * 섹터 팔레트. app/globals.css의 --color-sector-1..7 과 같은 값이다
 * (recharts와 인라인 style은 CSS 변수를 그대로 못 받아 여기 미러링한다).
 * 마지막 색(보라)은 '기타' 전용이다.
 */
const PALETTE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'];
const UNKNOWN_SECTOR_COLOR = '#4a3aa7';
const UNKNOWN_SECTOR = '기타';

/**
 * 섹터 → 색.
 *
 * 섹터는 KRX 업종(28종)이라 이름마다 색을 미리 정해 둘 수 없다. 대신 지금 보유한 섹터를
 * **이름순**으로 세워 팔레트를 차례로 준다. 비중 순위가 아니라 이름으로 정하는 게 핵심이다 —
 * 슬라이스는 비중 내림차순이라 순위로 칠하면 주가가 변할 때마다 섹터끼리 색을 주고받는다.
 * 섹터를 새로 사거나 다 팔아 목록이 바뀔 때만 색이 다시 배정된다.
 *
 * '기타'는 이름순과 무관하게 항상 같은 색이다. 섹터가 팔레트(6색)보다 많으면 색이 반복된다.
 */
function buildSectorColors(sectors: readonly string[]): Map<string, string> {
  const named = [...new Set(sectors)]
    .filter((sector) => sector !== UNKNOWN_SECTOR)
    .sort((a, b) => a.localeCompare(b, 'ko'));

  const colors = new Map(named.map((sector, i) => [sector, PALETTE[i % PALETTE.length]]));
  colors.set(UNKNOWN_SECTOR, UNKNOWN_SECTOR_COLOR);
  return colors;
}

/**
 * hover한 조각의 평가금액을 띄운다.
 *
 * 비중(%)은 범례가 이미 모든 섹터에 대해 보여주고 있으므로, 툴팁은 범례에 없는
 * 금액을 주 수치로 둔다. 그러지 않으면 같은 정보를 두 번 말하는 셈이 된다.
 */
function SectorTooltip({ active, payload }: TooltipContentProps) {
  if (!active || payload.length === 0) return null;

  // 색은 데이터에 fill로 실려 온다 (아래 SectorChart 참고)
  const slice = payload[0].payload as AllocationSlice & { fill: string };

  return (
    <ChartTooltip
      label={slice.label}
      value={formatWon(slice.value)}
      sub={formatPercent(slice.ratio, { digits: 1 })}
      swatch={slice.fill}
    />
  );
}

/**
 * 차트 자리만 가리는 로딩 표시.
 *
 * 슬라이스의 SectorChartSkeleton을 재사용하지 않는다. 그건 하이드레이션 전에 화면 전체를
 * 대신하는 용도라 제목까지 스켈레톤인데, 여기서는 '섹터별 비중'이라는 제목을 이미 알고
 * 있으므로 가짜 막대로 덮을 이유가 없다.
 */
function ChartBodySkeleton() {
  return (
    <div className="flex flex-col items-center gap-4 @min-[300px]:flex-row @min-[300px]:gap-[22px]">
      <div className="relative size-[140px] shrink-0 @min-[300px]:size-[164px]">
        <Skeleton className="size-full rounded-full" />
        <div className="bg-card absolute inset-[27%] rounded-full" />
      </div>
      <ul className="grid w-full min-w-0 grid-cols-2 gap-x-4 gap-y-2 @min-[300px]:flex @min-[300px]:flex-1 @min-[300px]:flex-col @min-[300px]:gap-2.5">
        {Array.from({ length: 3 }, (_, i) => (
          <li key={i} className="flex items-center gap-2">
            <Skeleton className="size-2.5 rounded-[3px]" />
            <Skeleton className="h-3.5 flex-1" />
            <Skeleton className="h-3.5 w-10" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SectorChart() {
  const holdings = useHoldingsStore((state) => state.holdings);
  const { prices, status } = useHoldingQuotes();
  const slices = calcSectorAllocation(holdings, prices);
  const colors = buildSectorColors(slices.map((slice) => slice.key));
  const colorOf = (sector: string) => colors.get(sector) ?? UNKNOWN_SECTOR_COLOR;

  /*
   * 조각 색은 데이터에 fill로 실어 보낸다. recharts는 데이터 객체를 sector props로
   * 펼치므로 이 값이 그대로 조각 색이 된다.
   * (Cell 컴포넌트는 recharts 4.0에서 제거 예정이라 쓰지 않는다)
   */
  const data = slices.map((slice) => ({ ...slice, fill: colorOf(slice.key) }));

  return (
    <section
      className={cn(
        'bg-card @container rounded-2xl px-4 py-4 md:px-6 md:py-5',
        holdings.length === 0 && EMPTY_CARD,
      )}
    >
      <h2 className="mb-3.5 text-[15px] font-bold">섹터별 비중</h2>

      {holdings.length === 0 ? (
        <p className={EMPTY_MESSAGE}>종목을 추가하면 비중이 표시됩니다</p>
      ) : status === 'pending' ? (
        <ChartBodySkeleton />
      ) : slices.length === 0 ? (
        // 보유 종목은 있는데 비중을 못 그린다 = 시세를 하나도 못 받았다.
        <p className="text-muted-foreground py-10 text-center text-[13px]">
          시세를 불러오지 못했습니다
        </p>
      ) : (
        /*
         * 도넛(164) + 간격(22) 옆에 "전기·전자 57.2%" 한 줄이 들어가려면 카드 안쪽으로 300px이 필요하다.
         * 이 카드는 1440에서도 380px밖에 안 되므로 기준을 @sm(384)로 잡으면 데스크톱에서도 쌓인다.
         */
        <div className="flex flex-col items-center gap-4 @min-[300px]:flex-row @min-[300px]:gap-[22px]">
          <div className="size-[140px] shrink-0 @min-[300px]:size-[164px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="label"
                  /* 컨테이너가 줄어도 도넛 두께 비율이 유지되도록 반경을 %로 잡는다 */
                  innerRadius="73%"
                  outerRadius="100%"
                  startAngle={90}
                  endAngle={-270}
                  /* 조각 사이 표면 색 간격 — 인접한 두 색이 맞닿지 않게 띄운다 */
                  paddingAngle={1.5}
                  stroke="none"
                  isAnimationActive
                  animationDuration={600}
                />
                <Tooltip content={SectorTooltip} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* 세로로 쌓일 때는 범례가 한 줄씩 늘어지지 않게 2열로 접는다 */}
          <ul className="grid w-full min-w-0 grid-cols-2 gap-x-4 gap-y-2 text-[13px] tabular-nums @min-[300px]:flex @min-[300px]:flex-1 @min-[300px]:flex-col @min-[300px]:gap-2.5">
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
