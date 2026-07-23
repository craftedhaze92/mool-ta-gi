'use client';

import { motion, useReducedMotion } from 'motion/react';
import { calcHoldingAllocation, useHoldingsStore } from '@/entities/holding';
import { formatPercent, formatWon } from '@/shared/lib/format-won';
import { ChartTooltip } from '@/shared/ui/chart-tooltip';

/**
 * 순차(ordinal) 램프. app/globals.css의 --color-ramp-* 와 같은 값이다.
 *
 * 막대는 길이가 이미 비중을 보여주므로 색까지 크기를 다시 표현하면 채널이 겹친다.
 * 대신 한 가지 색상의 명도만 바꿔 '비중 내림차순 정렬'을 색으로 보강한다.
 * 섹터 도넛이 색상을 나누는 것과 역할이 달라 팔레트를 공유하지 않는다.
 */
const BAR_RAMP = ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#104281'];

/**
 * 정렬된 목록의 i번째 막대 색. 종목 수와 무관하게 램프 전체 폭을 쓰도록 펼친다.
 *
 * 목록은 비중 내림차순이고 램프는 옅은 색에서 시작하므로 뒤집어서 읽는다.
 * 순차 램프의 관례가 '진할수록 큰 값'이라, 비중 1위가 가장 진한 색을 받아야 한다.
 *
 * 종목이 램프 단계보다 많으면 이웃한 막대가 같은 색을 공유하지만,
 * 길이와 % 라벨이 이미 둘을 구분해 준다.
 */
function rampColor(index: number, total: number): string {
  const darkest = BAR_RAMP.length - 1;
  if (total <= 1) return BAR_RAMP[darkest];

  const position = (index / (total - 1)) * darkest;
  return BAR_RAMP[darkest - Math.round(position)];
}

export function HoldingAllocation() {
  const holdings = useHoldingsStore((state) => state.holdings);
  const slices = calcHoldingAllocation(holdings);
  const prefersReducedMotion = useReducedMotion();

  if (slices.length === 0) {
    return (
      <section className="bg-card rounded-2xl px-6 py-5">
        <h2 className="mb-4 text-[15px] font-bold">종목별 비중</h2>
        <p className="text-muted-foreground py-10 text-center text-[13px]">
          종목을 추가하면 비중이 표시됩니다
        </p>
      </section>
    );
  }

  return (
    <section className="bg-card rounded-2xl px-6 py-5">
      <h2 className="mb-4 text-[15px] font-bold">종목별 비중</h2>

      <ul className="flex flex-col gap-[11px] text-[12.5px]">
        {slices.map((slice, index) => (
          <li key={slice.key} className="grid grid-cols-[76px_1fr_44px] items-center gap-2.5">
            <span className="truncate">{slice.label}</span>

            {/*
             * 툴팁을 hover뿐 아니라 focus에도 띄운다. hover 전용으로 두면 키보드
             * 사용자는 금액을 볼 방법이 없다(비중 %는 오른쪽에 항상 보인다).
             */}
            <div
              tabIndex={0}
              aria-label={`${slice.label} 평가금액 ${formatWon(slice.value)}`}
              className="group/bar focus-visible:ring-brand relative rounded outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              <div className="bg-track h-2 rounded">
                <motion.div
                  className="h-2 rounded"
                  style={{ backgroundColor: rampColor(index, slices.length) }}
                  initial={prefersReducedMotion ? false : { width: 0 }}
                  animate={{ width: `${slice.ratio}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut', delay: index * 0.05 }}
                />
              </div>

              <ChartTooltip
                label={slice.label}
                value={formatWon(slice.value)}
                sub={formatPercent(slice.ratio, { digits: 1 })}
                swatch={rampColor(index, slices.length)}
                className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 group-hover/bar:block group-focus-visible/bar:block"
              />
            </div>

            <span className="text-right font-semibold">
              {formatPercent(slice.ratio, { digits: 1 })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
