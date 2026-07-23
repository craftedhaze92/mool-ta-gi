import { MOCK_MARKET_INDICES, type MarketIndex } from '@/entities/market-index';
import { formatPercent } from '@/shared/lib/format-won';
import { cn } from '@/shared/lib/utils';

function IndexQuote({ quote }: { quote: MarketIndex }) {
  const direction = Math.sign(quote.change); // 1 | 0 | -1
  const tone = direction > 0 ? 'text-up' : direction < 0 ? 'text-down' : 'text-muted-foreground';
  const arrow = direction > 0 ? '▲' : direction < 0 ? '▼' : '−';

  return (
    // 지수 한 건은 통째로 붙어 있어야 한다. 좁아지면 지수끼리 줄이 나뉘지, 값과 등락률이 갈라지면 안 된다
    <div className="flex shrink-0 items-baseline gap-[7px] whitespace-nowrap">
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
    <header className="flex flex-col items-start gap-2 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-y-3 sm:pt-6">
      <div className="flex items-baseline gap-2.5">
        <h1 className="text-lg font-extrabold tracking-[-0.02em] sm:text-[22px]">평단구조대</h1>
        <p className="text-muted-foreground hidden text-[13px] font-medium sm:block">
          최적의 평단가를 찾아주는 주식 물타기 시뮬레이터
        </p>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs sm:gap-x-6 sm:text-[13px]">
        {MOCK_MARKET_INDICES.map((quote) => (
          <IndexQuote key={quote.name} quote={quote} />
        ))}
      </div>
    </header>
  );
}
