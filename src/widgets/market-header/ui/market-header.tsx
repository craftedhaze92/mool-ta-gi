import { MOCK_MARKET_INDICES, type MarketIndex } from '@/entities/market-index';
import { formatPercent } from '@/shared/lib/format-won';
import { cn } from '@/shared/lib/utils';

function IndexQuote({ quote }: { quote: MarketIndex }) {
  const direction = Math.sign(quote.change); // 1 | 0 | -1
  const tone = direction > 0 ? 'text-up' : direction < 0 ? 'text-down' : 'text-muted-foreground';
  const arrow = direction > 0 ? '▲' : direction < 0 ? '▼' : '−';

  return (
    <div className="flex items-baseline gap-[7px]">
      <span className="text-muted-foreground font-semibold">{quote.name}</span>
      <span className="font-bold">
        {quote.value.toLocaleString('ko-KR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </span>
      <span className={cn('font-semibold', tone)}>
        <span aria-hidden="true">{arrow}</span>
        {Math.abs(quote.change).toFixed(2)} {formatPercent(quote.changeRate, { signed: true })}
      </span>
    </div>
  );
}

export function MarketHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-y-3 pt-6">
      <div className="flex items-baseline gap-2.5">
        <h1 className="text-[22px] font-extrabold tracking-[-0.02em]">평단구조대</h1>
        <p className="text-muted-foreground hidden text-[13px] font-medium sm:block">
          최적의 평단가를 찾아주는 주식 물타기 시뮬레이터
        </p>
      </div>

      <div className="flex gap-6 text-[13px]">
        {MOCK_MARKET_INDICES.map((quote) => (
          <IndexQuote key={quote.name} quote={quote} />
        ))}
      </div>
    </header>
  );
}
