'use client';

import { motion } from 'motion/react';
import { calcHoldingMetrics, useHoldingsStore, type Holding } from '@/entities/holding';
import { AddHoldingButton } from '@/features/add-holding';
import { HoldingRowActions } from '@/features/edit-holding';
import { formatPercent, formatQuantity, formatSignedWon, formatWon } from '@/shared/lib/format-won';
import { cn } from '@/shared/lib/utils';

/** 시안 그리드: 종목명 / 보유수량 / 평단가 / 현재가 / 평가손익 / 액션 */
const GRID = 'grid grid-cols-[1.5fr_0.7fr_1fr_1fr_1.2fr_150px] gap-2';

function HoldingRow({ holding, selected }: { holding: Holding; selected: boolean }) {
  const selectHolding = useHoldingsStore((state) => state.selectHolding);
  const metrics = calcHoldingMetrics(holding);
  const tone = metrics.profit >= 0 ? 'text-up' : 'text-down';

  return (
    <motion.div
      role="row"
      tabIndex={0}
      onClick={() => selectHolding(holding.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectHolding(holding.id);
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

      <span className="flex items-center justify-end gap-1.5">
        <motion.button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            selectHolding(holding.id);
          }}
          whileHover={{ borderColor: '#3182f6', backgroundColor: '#f2f7ff' }}
          whileTap={{ scale: 0.96 }}
          transition={{ duration: 0.12 }}
          className="border-hairline text-brand rounded-lg border bg-white px-2.5 py-[7px] text-xs font-semibold whitespace-nowrap"
        >
          물타기 계산
        </motion.button>

        <HoldingRowActions holding={holding} />
      </span>
    </motion.div>
  );
}

/** 종목이 하나도 없을 때. 시안에 정의가 없어 새로 만든 화면이다. */
function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14">
      <span className="text-[15px] font-semibold">아직 보유 종목이 없어요</span>
      <span className="text-muted-foreground text-[13px]">
        첫 종목을 추가하면 손익과 물타기 계산을 볼 수 있어요
      </span>
      <div className="mt-2">
        <AddHoldingButton variant="cta" />
      </div>
    </div>
  );
}

export function HoldingsTable() {
  const holdings = useHoldingsStore((state) => state.holdings);
  const selectedId = useHoldingsStore((state) => state.selectedId);
  const isEmpty = holdings.length === 0;

  return (
    <section className="bg-card rounded-2xl pt-2 pb-3">
      <div className="flex items-center justify-between px-6 pt-4 pb-3">
        <span className="flex items-baseline gap-3">
          <h2 className="text-base font-bold">보유 종목</h2>
          {!isEmpty && (
            <span className="text-muted-foreground text-xs">
              행을 누르면 시뮬레이터에 연동됩니다
            </span>
          )}
        </span>

        {!isEmpty && <AddHoldingButton />}
      </div>

      {isEmpty ? (
        <EmptyState />
      ) : (
        <>
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
            {holdings.map((holding) => (
              <HoldingRow key={holding.id} holding={holding} selected={holding.id === selectedId} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
