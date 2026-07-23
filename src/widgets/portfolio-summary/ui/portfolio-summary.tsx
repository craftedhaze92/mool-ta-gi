'use client';

import { calcPortfolioSummary, useHoldingsStore } from '@/entities/holding';
import { formatPercent, formatSignedWon, formatWon } from '@/shared/lib/format-won';
import { cn } from '@/shared/lib/utils';

interface SummaryCardProps {
  label: string;
  value: string;
  /** 손익률 등 보조 수치 */
  sub?: string;
  /** 값에 손익 색상을 입힐지 결정한다. undefined면 중립(검정) */
  tone?: 'up' | 'down';
}

function SummaryCard({ label, value, sub, tone }: SummaryCardProps) {
  const toneClass = tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : undefined;

  return (
    <div className="bg-card flex flex-col gap-2 rounded-2xl px-[22px] py-5">
      <span className="text-muted-foreground text-[13px] font-medium">{label}</span>
      <span className={cn('text-2xl font-bold tracking-[-0.01em]', toneClass)}>{value}</span>
      {sub && <span className={cn('text-[13px] font-semibold', toneClass)}>{sub}</span>}
    </div>
  );
}

/** 손익 부호로 색상 톤을 고른다. 0은 중립. */
function toneOf(amount: number): SummaryCardProps['tone'] {
  if (amount > 0) return 'up';
  if (amount < 0) return 'down';
  return undefined;
}

export function PortfolioSummary() {
  const holdings = useHoldingsStore((state) => state.holdings);
  const summary = calcPortfolioSummary(holdings);

  // 종목이 없으면 손익률은 계산할 대상이 없다. 0.00%보다 '—'가 정직하다.
  const isEmpty = holdings.length === 0;
  const rate = (value: number) => (isEmpty ? '—' : formatPercent(value, { signed: true }));

  return (
    <div className="grid grid-cols-4 gap-4">
      <SummaryCard label="총 평가금액" value={formatWon(summary.totalValue)} />
      <SummaryCard label="총 매입금액" value={formatWon(summary.totalCost)} />
      <SummaryCard
        label="평가손익"
        value={formatSignedWon(summary.totalProfit)}
        sub={rate(summary.totalProfitRate)}
        tone={toneOf(summary.totalProfit)}
      />
      <SummaryCard
        label="오늘 등락"
        value={formatSignedWon(summary.totalDayChange)}
        sub={rate(summary.totalDayChangeRate)}
        tone={toneOf(summary.totalDayChange)}
      />
    </div>
  );
}
