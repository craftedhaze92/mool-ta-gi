'use client';

import { motion, useReducedMotion } from 'motion/react';
import { calcHoldingAllocation, MOCK_HOLDINGS } from '@/entities/holding';
import { formatPercent } from '@/shared/lib/format-won';

/** 섹터 도넛과 같은 팔레트를 쓴다. */
const BAR_COLORS = ['#33415c', '#5a719c', '#93a6c6', '#cfd8e6'];

export function HoldingAllocation() {
  const slices = calcHoldingAllocation(MOCK_HOLDINGS);
  const prefersReducedMotion = useReducedMotion();

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
