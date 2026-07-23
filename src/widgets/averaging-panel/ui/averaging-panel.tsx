'use client';

import {
  calcAveraging,
  calcPriceGapRate,
  calcQuantityForTargetAverage,
  useHoldingsStore,
  useSelectedHolding,
} from '@/entities/holding';
import { AVERAGING_PANEL_ID } from '@/shared/config/anchors';
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

function ResultRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold">{children}</span>
    </div>
  );
}

/**
 * 패널 루트. sticky는 우측 사이드바가 되는 xl 이상에서만 의미가 있다.
 * @container를 걸어 내부 배치가 뷰포트가 아니라 패널 자기 폭에 반응하게 한다
 * (md~xl 구간에서는 전폭이라 2단, xl 이상에서는 372px이라 1단).
 */
const PANEL =
  '@container bg-card flex flex-col rounded-2xl p-5 tabular-nums md:p-6 xl:sticky xl:top-5';

/** 계산할 종목이 없을 때. 시뮬레이터 UI 전체를 감추고 안내만 남긴다. */
function EmptyPanel() {
  return (
    <aside id={AVERAGING_PANEL_ID} className={cn(PANEL, 'gap-3')}>
      <h2 className="text-base font-bold">물타기 시뮬레이터</h2>
      <p className="text-muted-foreground text-[13px] leading-relaxed">
        아직 계산할 종목이 없어요. 왼쪽에서 종목을 추가하면 평단가 시뮬레이션을 할 수 있습니다.
      </p>
    </aside>
  );
}

export function AveragingPanel() {
  const holding = useSelectedHolding();
  const addQuantity = useHoldingsStore((s) => s.addQuantity);
  const targetAvgInput = useHoldingsStore((s) => s.targetAvgInput);
  const setAddQuantity = useHoldingsStore((s) => s.setAddQuantity);
  const setTargetAvgInput = useHoldingsStore((s) => s.setTargetAvgInput);

  if (!holding) return <EmptyPanel />;

  const result = calcAveraging(holding, addQuantity);
  const gapRate = calcPriceGapRate(holding);
  const needsRise = result.breakEvenRate > 0;

  const targetQuantity = calcQuantityForTargetAverage(holding, Number(targetAvgInput));
  const targetMessage = buildTargetMessage(
    targetAvgInput,
    targetQuantity,
    holding.avgPrice,
    holding.currentPrice,
  );

  return (
    <aside id={AVERAGING_PANEL_ID} className={cn(PANEL, 'gap-[18px]')}>
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-bold">물타기 시뮬레이터</h2>
        <span className="flex items-baseline gap-[7px]">
          <span className="text-brand text-[15px] font-bold">{holding.name}</span>
          <span className="text-muted-foreground text-xs">{holding.code}</span>
        </span>
      </div>

      {/*
       * 패널이 672px보다 넓어지면(md~xl 구간의 전폭 배치) 입력부와 결과부를 좌우로 나눈다.
       * 그러지 않으면 짧은 행들이 가로로 늘어져 읽는 거리가 쓸데없이 길어진다.
       */}
      <div className="flex flex-col gap-[18px] @2xl:grid @2xl:grid-cols-2 @2xl:items-start @2xl:gap-6">
        <div className="flex flex-col gap-[18px]">
          <div className="bg-subtle grid grid-cols-3 gap-2 rounded-xl px-4 py-3.5 text-xs">
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
              <span className="text-[13px] font-semibold">현재가에 추가 매수</span>
              <span className="text-brand text-[15px] font-extrabold">
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
              className="[&_[data-slot=slider-track]]:bg-track"
            />
          </div>
        </div>

        {/* 2단일 때는 위아래 구분선 대신 좌우 구분선이 두 덩어리를 가른다 */}
        <div className="flex flex-col gap-[18px] @2xl:border-l @2xl:pl-6">
          <div className="flex flex-col gap-2.5 border-t pt-4 text-[13.5px] @2xl:border-t-0 @2xl:pt-0">
            <ResultRow label="새 평단가">
              <AnimatedNumber value={result.newAvgPrice} format={formatWon} />{' '}
              <span
                className={cn(
                  'text-xs font-semibold',
                  result.avgChangeRate > 0 ? 'text-up' : 'text-down',
                )}
              >
                {formatPercent(result.avgChangeRate, { signed: true })}
              </span>
            </ResultRow>

            <ResultRow label="필요 금액">
              <AnimatedNumber value={result.requiredAmount} format={formatWon} />
            </ResultRow>

            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground shrink-0">손익분기</span>
              <span className={cn('text-right font-bold', needsRise ? 'text-up' : 'text-down')}>
                {needsRise
                  ? `+${result.breakEvenRate.toFixed(2)}% 상승 시 본전`
                  : '이미 수익권 (평단 < 현재가)'}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t pt-4">
            <label htmlFor="target-avg" className="text-[13px] font-semibold">
              목표 평단가 역산
            </label>
            <input
              id="target-avg"
              type="number"
              inputMode="numeric"
              placeholder="목표 평단가 (원)"
              value={targetAvgInput}
              onChange={(event) => setTargetAvgInput(event.target.value)}
              className="border-hairline focus:border-brand placeholder:text-muted-foreground rounded-[10px] border px-3 py-2.5 text-sm outline-none"
            />
            <span className="text-muted-strong text-[12.5px] leading-relaxed">{targetMessage}</span>
          </div>
        </div>
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
