'use client';

import { motion, useReducedMotion } from 'motion/react';
import { calcHoldingAllocation, useHoldingsStore } from '@/entities/holding';
import { formatPercent } from '@/shared/lib/format-won';

/** 섹터 도넛과 같은 팔레트를 쓴다. */
const BAR_COLORS = ['#33415c', '#5a719c', '#93a6c6', '#cfd8e6'];

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

            <div className="bg-track h-2 rounded">
              <motion.div
                className="h-2 rounded"
                style={{ backgroundColor: BAR_COLORS[index % BAR_COLORS.length] }}
                initial={prefersReducedMotion ? false : { width: 0 }}
                animate={{ width: `${slice.ratio}%` }}
                transition={{ duration: 0.5, ease: 'easeOut', delay: index * 0.05 }}
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
