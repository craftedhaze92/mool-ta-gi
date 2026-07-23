import { MOCK_MARKET_INDICES, type MarketIndex } from '@/entities/market-index';
import { formatPercent } from '@/shared/lib/format-won';
import { cn } from '@/shared/lib/utils';

function IndexQuote({ index }: { index: MarketIndex }) {
  const isUp = index.change > 0;
  const tone = isUp ? 'text-up' : 'text-down';

  return (
    <div className="flex items-baseline gap-[7px]">
      <span className="text-muted-foreground font-semibold">{index.name}</span>
      <span className="font-bold">{index.value.toLocaleString('ko-KR')}</span>
      <span className={cn('font-semibold', tone)}>
        {isUp ? '▲' : '▼'}
        {Math.abs(index.change).toFixed(2)} {formatPercent(index.changeRate, { signed: true })}
      </span>
    </div>
  );
}

export function MarketHeader() {
  return (
    <header className="flex items-center justify-between pt-6">
      <div className="flex items-baseline gap-2.5">
        <span className="text-[22px] font-extrabold tracking-[-0.02em]">물타기</span>
        <span className="text-muted-foreground text-xs font-medium">
          mool-ta-gi · 포트폴리오 관제
        </span>
      </div>

      <div className="flex gap-6 text-[13px]">
        {MOCK_MARKET_INDICES.map((index) => (
          <IndexQuote key={index.name} index={index} />
        ))}
      </div>
    </header>
  );
}
