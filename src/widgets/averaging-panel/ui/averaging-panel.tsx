'use client';

import {
  calcAveraging,
  calcPriceGapRate,
  calcQuantityForTargetAverage,
  MOCK_HOLDINGS,
  useSelectedHoldingStore,
} from '@/entities/holding';
import { formatPercent, formatQuantity, formatWon } from '@/shared/lib/format-won';
import { AnimatedNumber } from '@/shared/ui/animated-number';
import { Slider } from '@/shared/ui/slider';
import { cn } from '@/shared/lib/utils';
import { GapGauge } from './gap-gauge';

const SLIDER_MAX = 200;

function StatCell({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <span className="flex flex-col gap-[3px]">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('text-sm font-bold', tone)}>{value}</span>
    </span>
  );
}

export function AveragingPanel() {
  const { selectedCode, addQuantity, targetAvgInput, setAddQuantity, setTargetAvgInput } =
    useSelectedHoldingStore();

  const holding = MOCK_HOLDINGS.find((h) => h.code === selectedCode) ?? MOCK_HOLDINGS[0];
  const result = calcAveraging(holding, addQuantity);
  const gapRate = calcPriceGapRate(holding);
  const isProfit = result.breakEvenRate <= 0;

  const targetQuantity = calcQuantityForTargetAverage(holding, Number(targetAvgInput));
  const targetMessage = buildTargetMessage(
    targetAvgInput,
    targetQuantity,
    holding.avgPrice,
    holding.currentPrice,
  );

  return (
    <aside className="bg-panel sticky top-5 flex flex-col gap-[18px] rounded-[20px] p-[26px] text-white">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-bold">물타기 시뮬레이터</h2>
        <span className="flex items-baseline gap-[7px]">
          <span className="text-panel-accent text-[15px] font-bold">{holding.name}</span>
          <span className="text-muted-foreground text-xs">{holding.code}</span>
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-xl bg-white/6 px-4 py-3.5 text-xs">
        <StatCell label="현재가" value={formatWon(holding.currentPrice)} />
        <StatCell label="평단가" value={formatWon(holding.avgPrice)} />
        <StatCell
          label="평단 대비"
          value={formatPercent(gapRate, { signed: true })}
          tone={gapRate >= 0 ? 'text-up' : 'text-down'}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground text-xs font-semibold">현재가 · 평단 갭</span>
        <GapGauge
          currentPrice={holding.currentPrice}
          avgPrice={holding.avgPrice}
          newAvgPrice={result.newAvgPrice}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="text-panel-label text-[13px] font-semibold">현재가에 추가 매수</span>
          <span className="text-panel-accent text-base font-extrabold">
            {formatQuantity(addQuantity)}
          </span>
        </div>
        <Slider
          value={[addQuantity]}
          min={1}
          max={SLIDER_MAX}
          step={1}
          onValueChange={([value]) => setAddQuantity(value)}
          aria-label="추가 매수 수량"
          // 다크 카드 위라 shadcn 기본 트랙/레인지 색을 덮어쓴다
          className="[&_[data-slot=slider-range]]:bg-panel-accent [&_[data-slot=slider-track]]:bg-white/12"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1 rounded-xl bg-white/6 p-3.5">
          <span className="text-muted-foreground text-[11.5px]">새 평단가</span>
          <AnimatedNumber
            value={result.newAvgPrice}
            format={formatWon}
            className="text-[17px] font-extrabold"
          />
          <span className="text-panel-accent text-[11.5px] font-semibold">
            −{result.avgDropRate.toFixed(2)}%
          </span>
        </div>

        <div className="flex flex-col gap-1 rounded-xl bg-white/6 p-3.5">
          <span className="text-muted-foreground text-[11.5px]">필요 금액</span>
          <AnimatedNumber
            value={result.requiredAmount}
            format={formatWon}
            className="text-[17px] font-extrabold"
          />
          <span className="text-muted-foreground text-[11.5px]">
            손익분기{' '}
            <span className={cn('font-bold', isProfit ? 'text-up' : 'text-white')}>
              {isProfit ? '이미 수익권' : `+${result.breakEvenRate.toFixed(2)}%`}
            </span>
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
        <label htmlFor="target-avg" className="text-panel-label text-[13px] font-semibold">
          목표 평단가 역산
        </label>
        <input
          id="target-avg"
          type="number"
          inputMode="numeric"
          placeholder="목표 평단가 (원)"
          value={targetAvgInput}
          onChange={(event) => setTargetAvgInput(event.target.value)}
          className="focus:border-panel-accent rounded-[10px] border border-white/18 bg-white/6 px-3 py-2.5 text-sm outline-none placeholder:text-white/40"
        />
        <span className="text-[12.5px] leading-relaxed text-white/70">{targetMessage}</span>
      </div>
    </aside>
  );
}

/** 목표 평단가 입력에 대한 안내 문구. 도달 불가능한 경우 이유를 알려준다. */
function buildTargetMessage(
  input: string,
  quantity: number | null,
  avgPrice: number,
  currentPrice: number,
): string {
  if (input.trim() === '') {
    return '"평단을 얼마까지 내리고 싶은지" 입력하면 필요한 매수량을 역산합니다.';
  }

  const target = Number(input);
  if (!Number.isFinite(target)) return '숫자를 입력해 주세요.';
  if (target >= avgPrice) return `목표가는 현재 평단(${formatWon(avgPrice)})보다 낮아야 합니다.`;
  if (target <= currentPrice) {
    return `현재가(${formatWon(currentPrice)})보다 높은 목표가만 가능합니다.`;
  }
  if (quantity === null) return '도달할 수 없는 목표가입니다.';

  return `${formatQuantity(quantity)} 추가 매수 시 평단 ${formatWon(target)} 달성 — ${formatWon(
    quantity * currentPrice,
  )} 필요`;
}
