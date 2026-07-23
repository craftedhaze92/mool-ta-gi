'use client';

import { motion } from 'motion/react';
import { calcHoldingMetrics, useHoldingsStore, type Holding } from '@/entities/holding';
import { AddHoldingButton } from '@/features/add-holding';
import { HoldingRowActions } from '@/features/edit-holding';
import { AVERAGING_PANEL_ID, scrollToAnchor } from '@/shared/config/anchors';
import { formatPercent, formatQuantity, formatSignedWon, formatWon } from '@/shared/lib/format-won';
import { cn } from '@/shared/lib/utils';

/**
 * 시안 그리드: 종목명 / 보유수량 / 평단가 / 현재가 / 평가손익 / 액션.
 *
 * md 미만에서는 같은 셀 6개를 2열 3행으로 접어 카드처럼 보여준다. 마크업(셀 순서, role="row")은
 * 그대로 두고 배치 클래스만 바꾸는 방식이라, 화면 폭에 따라 DOM이 갈라지지 않는다.
 */
const GRID =
  'grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 md:grid-cols-[1.5fr_0.7fr_1fr_1fr_1.2fr_150px] md:gap-2';

/** md에서 원래의 자동 배치로 되돌린다. 셀마다 붙는 공통 꼬리표. */
const CELL_RESET = 'md:col-auto md:row-auto';

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
        'focus-visible:ring-brand cursor-pointer items-center border-b px-4 py-3 outline-none last:border-b-0 focus-visible:ring-2 focus-visible:ring-inset md:border-b-0 md:px-6 md:py-[13px]',
      )}
    >
      <span className={cn('col-start-1 row-start-1 flex flex-col', CELL_RESET)}>
        <span className="text-sm font-semibold">{holding.name}</span>
        <span className="text-muted-foreground text-[11.5px]">{holding.code}</span>
      </span>

      <span className={cn('col-start-1 row-start-3 text-sm md:text-right', CELL_RESET)}>
        {formatQuantity(holding.quantity)}
      </span>

      <span
        className={cn(
          'text-muted-strong col-start-1 row-start-2 text-sm md:text-right',
          CELL_RESET,
        )}
      >
        {/* 모바일은 헤더 행이 없어서 숫자만으로는 어떤 값인지 알 수 없다 */}
        <span className="md:hidden">평단 </span>
        {formatWon(holding.avgPrice)}
      </span>

      <span className={cn('col-start-2 row-start-1 text-right text-sm font-semibold', CELL_RESET)}>
        {formatWon(holding.currentPrice)}
      </span>

      <span className={cn('col-start-2 row-start-2 flex flex-col items-end', CELL_RESET)}>
        <span className={cn('text-sm font-bold', tone)}>
          {formatPercent(metrics.profitRate, { signed: true })}
        </span>
        <span className={cn('text-[11.5px]', tone)}>{formatSignedWon(metrics.profit)}</span>
      </span>

      <span
        className={cn(
          'col-start-2 row-start-3 flex items-center justify-end gap-1.5 pt-1 md:pt-0',
          CELL_RESET,
        )}
      >
        <motion.button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            selectHolding(holding.id);
            // 모바일에서는 시뮬레이터가 화면 밖에 있다. 눌렀는데 아무 일도 안 일어난 것처럼 보이면 안 된다.
            scrollToAnchor(AVERAGING_PANEL_ID);
          }}
          whileHover={{ borderColor: '#3182f6', backgroundColor: '#f2f7ff' }}
          whileTap={{ scale: 0.96 }}
          transition={{ duration: 0.12 }}
          className="border-hairline text-brand rounded-lg border bg-white px-2.5 py-2.5 text-xs font-semibold whitespace-nowrap md:py-[7px]"
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
    <div className="flex flex-col items-center gap-2 px-4 py-14 text-center md:px-6">
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
      <div className="flex items-center justify-between px-4 pt-4 pb-3 md:px-6">
        <span className="flex items-baseline gap-3">
          <h2 className="text-base font-bold">보유 종목</h2>
          {!isEmpty && (
            <span className="text-muted-foreground hidden text-xs sm:inline">
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
            /* 모바일은 셀마다 라벨을 인라인으로 달아 헤더 행이 필요 없다 */
            className={cn(
              GRID,
              'text-muted-foreground hidden border-b px-6 py-2 text-xs font-semibold md:grid',
            )}
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
