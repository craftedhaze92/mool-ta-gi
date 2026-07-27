'use client';

import { calcPortfolioSummary, useHoldingsStore } from '@/entities/holding';
import { useHoldingQuotes } from '@/features/holding-quotes';
import { formatPercent, formatSignedWon, formatWon } from '@/shared/lib/format-won';
import { cn } from '@/shared/lib/utils';
import { PendingValue } from '@/shared/ui/pending-value';

interface SummaryCardProps {
  label: string;
  value: string;
  /** 손익률 등 보조 수치 */
  sub?: string;
  /** 값에 손익 색상을 입힐지 결정한다. undefined면 중립(검정) */
  tone?: 'up' | 'down';
  /** 시세를 기다리는 중이면 값 자리를 스켈레톤으로 둔다 */
  pending?: boolean;
}

function SummaryCard({ label, value, sub, tone, pending = false }: SummaryCardProps) {
  const toneClass = tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : undefined;

  return (
    <div className="bg-card flex flex-col gap-1.5 rounded-2xl px-4 py-4 tabular-nums lg:gap-2 lg:px-[22px] lg:py-5">
      <span className="text-muted-foreground text-xs font-medium lg:text-[13px]">{label}</span>
      {/*
       * 카드가 가장 좁아지는 건 4칸이 되는 lg 직후다. 거기서 ₩24,414,000이 카드를 넘지 않는
       * 크기가 상한이고, nowrap이 있어야 부호(−)가 숫자와 따로 떨어지지 않는다.
       */}
      <span
        className={cn(
          'text-xl font-bold tracking-[-0.01em] whitespace-nowrap xl:text-2xl',
          toneClass,
        )}
      >
        <PendingValue pending={pending} className="h-7 w-32 xl:h-8">
          {value}
        </PendingValue>
      </span>
      {sub && (
        <span className={cn('text-xs font-semibold lg:text-[13px]', toneClass)}>
          <PendingValue pending={pending} className="h-4 w-16">
            {sub}
          </PendingValue>
        </span>
      )}
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
  const { prices, status } = useHoldingQuotes();
  const summary = calcPortfolioSummary(holdings, prices);

  const isEmpty = holdings.length === 0;
  const pending = status === 'pending';
  /*
   * 시세를 한 종목도 못 받았으면 평가 관련 값은 아예 그리지 않는다. 그 상태의 합계는
   * 전부 0인데, ₩0은 '평가금액이 0원'과 구분되지 않아 오해를 부른다.
   */
  const hasValue = summary.pricedCount > 0;

  // 종목이 없으면 손익률은 계산할 대상이 없다. 0.00%보다 '—'가 정직하다.
  const rate = (value: number) =>
    isEmpty || !hasValue ? '—' : formatPercent(value, { signed: true });
  const amount = (value: number, format: (v: number) => string) => (hasValue ? format(value) : '—');

  return (
    <div className="flex flex-col gap-2">
      {/* 4칸은 lg부터. md(768)에서 4칸으로 나누면 카드 폭이 금액을 못 담는다 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <SummaryCard
          label="총 평가금액"
          value={amount(summary.totalValue, formatWon)}
          pending={pending}
        />
        {/* 매입금액은 시세가 필요 없다. 로딩 중에도 실값을 보여준다 */}
        <SummaryCard label="총 매입금액" value={formatWon(summary.totalCost)} />
        <SummaryCard
          label="평가손익"
          value={amount(summary.totalProfit, formatSignedWon)}
          sub={rate(summary.totalProfitRate)}
          tone={hasValue ? toneOf(summary.totalProfit) : undefined}
          pending={pending}
        />
        <SummaryCard
          label="오늘 등락"
          value={amount(summary.totalDayChange, formatSignedWon)}
          sub={rate(summary.totalDayChangeRate)}
          tone={hasValue ? toneOf(summary.totalDayChange) : undefined}
          pending={pending}
        />
      </div>

      {/*
       * 부분 실패를 숨기지 않는다. 몇 종목이 빠진 채로 계산된 합계를 전체인 양 보여주면
       * 사용자가 잘못된 판단을 하게 된다.
       */}
      {status === 'success' && summary.missingCodes.length > 0 && (
        <p className="text-muted-foreground px-1 text-xs">
          시세를 못 받은 {summary.missingCodes.length}개 종목은 평가금액에서 제외했습니다
        </p>
      )}
    </div>
  );
}
