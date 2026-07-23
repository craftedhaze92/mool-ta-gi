'use client';

import { motion } from 'motion/react';
import {
  calcHoldingMetrics,
  MOCK_HOLDINGS,
  useSelectedHoldingStore,
  type Holding,
} from '@/entities/holding';
import { formatPercent, formatQuantity, formatSignedWon, formatWon } from '@/shared/lib/format-won';
import { cn } from '@/shared/lib/utils';

/** 시안 그리드: 종목명 / 보유수량 / 평단가 / 현재가 / 평가손익 / 액션 */
const GRID = 'grid grid-cols-[1.5fr_0.7fr_1fr_1fr_1.2fr_118px] gap-2';

function HoldingRow({ holding, selected }: { holding: Holding; selected: boolean }) {
  const select = useSelectedHoldingStore((state) => state.select);
  const metrics = calcHoldingMetrics(holding);
  const tone = metrics.profit >= 0 ? 'text-up' : 'text-down';

  return (
    <motion.div
      role="row"
      tabIndex={0}
      onClick={() => select(holding.code)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          select(holding.code);
        }
      }}
      animate={{ backgroundColor: selected ? '#f2f7ff' : 'rgba(242,247,255,0)' }}
      whileHover={{ backgroundColor: selected ? '#f2f7ff' : '#f7f9fc' }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={cn(
        GRID,
        'focus-visible:ring-brand cursor-pointer items-center px-6 py-[13px] outline-none focus-visible:ring-2 focus-visible:ring-inset',
      )}
    >
      <span className="flex flex-col">
        <span className="text-sm font-semibold">{holding.name}</span>
        <span className="text-muted-foreground text-[11.5px]">{holding.code}</span>
      </span>

      <span className="text-right text-sm">{formatQuantity(holding.quantity)}</span>
      <span className="text-muted-strong text-right text-sm">{formatWon(holding.avgPrice)}</span>
      <span className="text-right text-sm font-semibold">{formatWon(holding.currentPrice)}</span>

      <span className="flex flex-col items-end">
        <span className={cn('text-sm font-bold', tone)}>
          {formatPercent(metrics.profitRate, { signed: true })}
        </span>
        <span className={cn('text-[11.5px]', tone)}>{formatSignedWon(metrics.profit)}</span>
      </span>

      <motion.button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          select(holding.code);
        }}
        whileHover={{ borderColor: '#3182f6', backgroundColor: '#f2f7ff' }}
        whileTap={{ scale: 0.96 }}
        transition={{ duration: 0.12 }}
        className="border-hairline text-brand justify-self-end rounded-lg border bg-white px-2.5 py-[7px] text-xs font-semibold whitespace-nowrap"
      >
        물타기 계산
      </motion.button>
    </motion.div>
  );
}

export function HoldingsTable() {
  const selectedCode = useSelectedHoldingStore((state) => state.selectedCode);

  return (
    <section className="bg-card rounded-2xl pt-2 pb-3">
      <div className="flex items-baseline justify-between px-6 pt-4 pb-3">
        <h2 className="text-base font-bold">보유 종목</h2>
        <span className="text-muted-foreground text-xs">행을 누르면 시뮬레이터에 연동됩니다</span>
      </div>

      <div
        role="row"
        className={cn(GRID, 'text-muted-foreground border-b px-6 py-2 text-xs font-semibold')}
      >
        <span>종목명</span>
        <span className="text-right">보유수량</span>
        <span className="text-right">평단가</span>
        <span className="text-right">현재가</span>
        <span className="text-right">평가손익</span>
        <span />
      </div>

      <div role="rowgroup">
        {MOCK_HOLDINGS.map((holding) => (
          <HoldingRow
            key={holding.code}
            holding={holding}
            selected={holding.code === selectedCode}
          />
        ))}
      </div>
    </section>
  );
}
