'use client';

import { useId } from 'react';
import {
  calcPriceGapRate,
  calcQuantityForTargetAverage,
  useHoldingsStore,
  useSelectedHolding,
  type Holding,
  type PriceMap,
  type SimulationInput,
  type SimulationResult,
} from '@/entities/holding';
import { useHoldingQuotes } from '@/features/holding-quotes';
import { resolveSimulation, useSimulationInputs } from '@/features/simulate-averaging';
import { AVERAGING_DETAIL_ID, AVERAGING_PANEL_ID, scrollToAnchor } from '@/shared/config/anchors';
import { formatPercent, formatQuantity, formatWon } from '@/shared/lib/format-won';
import { cn } from '@/shared/lib/utils';
import { AnimatedNumber } from '@/shared/ui/animated-number';
import { Button } from '@/shared/ui/button';
import { FORM_FIELD, FORM_LABEL } from '@/shared/ui/form-field';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group';
import { PANEL, PANEL_RIGHT_COLUMN, PANEL_SPLIT } from '../lib/panel';
import { AveragingPanelPreview } from './averaging-panel-preview';
import { AveragingPanelSkeleton } from './averaging-panel-skeleton';
import { GapGauge } from './gap-gauge';
import { ResultRow, StatCell } from './panel-rows';

type Mode = SimulationInput['mode'];

const MODES: { value: Mode; label: string }[] = [
  { value: 'quantity', label: '수량' },
  { value: 'budget', label: '예산' },
];

export function AveragingPanel() {
  const holding = useSelectedHolding();
  const holdings = useHoldingsStore((s) => s.holdings);
  const { prices, status, refetch } = useHoldingQuotes();

  // 훅은 전부 위에서 부른다. 조기 반환은 그 뒤에.
  if (!holding) return <AveragingPanelPreview />;

  /*
   * 첫 시세를 기다리는 동안은 스켈레톤이다. 매수가의 기본값이 현재가라 아직 계산할 것이 없고,
   * 이때 폼을 먼저 그리면 '시세 없음'이 잠깐 비쳤다가 숫자로 바뀐다.
   */
  const hasPrice = prices[holding.code] !== undefined;
  if (!hasPrice && (status === 'pending' || status === 'idle')) return <AveragingPanelSkeleton />;

  return (
    /*
     * 입력값은 features/simulate-averaging 스토어가 종목별로 들고 있다. 종목을 바꾸면 그 훅이
     * 기본값을 돌려주므로 따로 초기화하거나 다시 마운트할 필요가 없다.
     */
    <SimulationForm holding={holding} holdings={holdings} prices={prices} onRetry={refetch} />
  );
}

interface SimulationFormProps {
  holding: Holding;
  holdings: Holding[];
  prices: PriceMap;
  onRetry: () => void;
}

/**
 * 시뮬레이터 본체.
 *
 * 매수가는 기본으로 현재가를 따라가고(폴링으로 갱신되면 같이 바뀐다), 사용자가 고치는 순간
 * 그 값으로 고정된다. customPrice가 null이면 '현재가를 따른다'는 뜻이다.
 *
 * 시세를 못 받아도 패널을 막지 않는다. 가정 매수가를 넣으면 원금·평단·손익은 시세 없이
 * 계산되기 때문이다. 시세가 꼭 필요한 값(갭 게이지, 비중)만 빠진다.
 */
function SimulationForm({ holding, holdings, prices, onRetry }: SimulationFormProps) {
  const { inputs, update } = useSimulationInputs(holding);
  const { mode, customPrice, target } = inputs;
  const { priceText, amountText, result, invalidReason } = resolveSimulation(
    holding,
    holdings,
    prices,
    inputs,
  );

  const price = prices[holding.code];
  const current = price?.current;
  const gapRate = price === undefined ? null : calcPriceGapRate(holding, price);

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
      <div className={PANEL_SPLIT}>
        <SimulationInputs
          holding={holding}
          current={current}
          gapRate={gapRate}
          mode={mode}
          onModeChange={(next) => update({ mode: next })}
          priceText={priceText}
          isCustomPrice={customPrice !== null}
          onPriceChange={(value) => update({ customPrice: value })}
          onPriceReset={() => update({ customPrice: null })}
          amountText={amountText}
          onAmountChange={(value) =>
            update(mode === 'quantity' ? { quantity: value } : { budget: value })
          }
          target={target}
          onTargetChange={(value) => update({ target: value })}
          onRetry={onRetry}
        />

        {/* 2단일 때는 위아래 구분선 대신 좌우 구분선이 두 덩어리를 가른다 */}
        <div className={cn(PANEL_RIGHT_COLUMN, 'min-w-0')}>
          {result ? (
            <SimulationResultView holding={holding} current={current} mode={mode} result={result} />
          ) : (
            <p aria-live="polite" className="text-muted-foreground text-[13px] leading-relaxed">
              {invalidReason}
            </p>
          )}
        </div>
      </div>

      <p className="text-muted-foreground text-xs">
        수수료·세금 제외 · 시뮬레이션은 실제 보유 내역에 반영되지 않습니다.
      </p>
    </aside>
  );
}

interface SimulationInputsProps {
  holding: Holding;
  current: number | undefined;
  /** 현재가와 평단의 괴리율(%). 시세가 없으면 null */
  gapRate: number | null;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  priceText: string;
  isCustomPrice: boolean;
  onPriceChange: (value: string) => void;
  onPriceReset: () => void;
  amountText: string;
  onAmountChange: (value: string) => void;
  target: string;
  onTargetChange: (value: string) => void;
  onRetry: () => void;
}

/** 입력부: 현재 상태 요약 → 매수가 → 계산 기준 → 수량/예산 → 목표 평단 역산 */
function SimulationInputs({
  holding,
  current,
  gapRate,
  mode,
  onModeChange,
  priceText,
  isCustomPrice,
  onPriceChange,
  onPriceReset,
  amountText,
  onAmountChange,
  target,
  onTargetChange,
  onRetry,
}: SimulationInputsProps) {
  const id = useId();

  return (
    <div className="flex min-w-0 flex-col gap-[18px]">
      <div className="bg-subtle grid grid-cols-3 gap-2 rounded-xl px-4 py-3.5 text-xs">
        <StatCell label="현재가" value={current === undefined ? '—' : formatWon(current)} />
        <StatCell label="평단가" value={formatWon(holding.avgPrice)} />
        <StatCell
          label="평단 대비"
          value={gapRate === null ? '—' : formatPercent(gapRate, { signed: true })}
          tone={gapRate === null ? undefined : gapRate >= 0 ? 'text-up' : 'text-down'}
        />
      </div>

      {/*
       * 시세를 못 받았을 때. 실패를 숨기지 않되 막다른 길로 두지도 않는다 — 다시 시도하거나,
       * 매수가를 직접 넣으면 시세 없이도 계산이 된다는 걸 함께 알려준다.
       */}
      {current === undefined && (
        <div className="bg-subtle flex flex-col gap-2.5 rounded-xl px-4 py-3.5 text-[12.5px] leading-relaxed">
          <p className="text-muted-strong">
            <strong className="text-foreground font-semibold">{holding.name}</strong>의 시세를
            불러오지 못했어요. 다시 시도하거나, 매수가를 직접 입력하면 가정 가격으로 계산할 수
            있어요.
          </p>
          <div>
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              다시 시도
            </Button>
          </div>
        </div>
      )}

      <div className={FORM_LABEL}>
        <Label htmlFor={`${id}-price`} className="text-xs font-semibold">
          매수가 (원)
        </Label>
        <Input
          id={`${id}-price`}
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          placeholder="가정 매수가 (원)"
          value={priceText}
          onChange={(event) => onPriceChange(event.target.value)}
          className={cn(FORM_FIELD, 'text-foreground')}
        />
        <div className="flex items-center justify-between gap-2 font-normal">
          <span>
            {isCustomPrice ? '직접 입력한 가정 가격입니다.' : '현재가를 따라 계산합니다.'}
          </span>
          {/* 돌아갈 현재가가 없으면 누를 이유도 없다 */}
          <Button
            type="button"
            variant="link"
            size="xs"
            className="text-brand h-auto shrink-0 px-0"
            disabled={!isCustomPrice || current === undefined}
            onClick={onPriceReset}
          >
            현재가로 초기화
          </Button>
        </div>
      </div>

      <div className={FORM_LABEL}>
        <span id={`${id}-mode`}>계산 기준</span>
        <ToggleGroup
          type="single"
          variant="outline"
          spacing={0}
          value={mode}
          // 이미 눌린 항목을 다시 누르면 Radix는 빈 값을 준다. 선택 해제는 허용하지 않는다
          onValueChange={(value) => value && onModeChange(value as Mode)}
          aria-labelledby={`${id}-mode`}
          className="w-full"
        >
          {MODES.map(({ value, label }) => (
            <ToggleGroupItem
              key={value}
              value={value}
              className="text-foreground data-[state=on]:bg-brand h-9 flex-1 data-[state=on]:text-white"
            >
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className={FORM_LABEL}>
        <Label htmlFor={`${id}-amount`} className="text-xs font-semibold">
          {mode === 'quantity' ? '추가 매수 수량 (주)' : '투입 예산 (원)'}
        </Label>
        <Input
          id={`${id}-amount`}
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={amountText}
          onChange={(event) => onAmountChange(event.target.value)}
          className={cn(FORM_FIELD, 'text-foreground')}
        />
      </div>

      <TargetAverageField
        holding={holding}
        priceText={priceText}
        target={target}
        onChange={onTargetChange}
      />
    </div>
  );
}

/**
 * 목표 평단가 역산.
 *
 * 기준 단가는 현재가가 아니라 위에서 고른 매수가다. 가정 매수가를 넣었다면 그 가격에
 * 몇 주를 사야 목표 평단에 닿는지를 묻는 것이기 때문이다.
 */
function TargetAverageField({
  holding,
  priceText,
  target,
  onChange,
}: {
  holding: Holding;
  priceText: string;
  target: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const buyPrice = Number(priceText);
  const hasValidPrice = priceText.trim() !== '' && Number.isSafeInteger(buyPrice) && buyPrice > 0;

  return (
    <div className={cn(FORM_LABEL, 'border-t pt-4')}>
      <Label htmlFor={id} className="text-xs font-semibold">
        목표 평단가 역산 (매수가 기준)
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        placeholder="목표 평단가 (원)"
        value={target}
        onChange={(event) => onChange(event.target.value)}
        className={cn(FORM_FIELD, 'text-foreground')}
      />
      <span className="text-muted-strong text-[12.5px] leading-relaxed font-normal">
        {hasValidPrice
          ? buildTargetMessage(target, holding, buyPrice)
          : '매수가를 입력하면 목표 평단가까지 필요한 수량을 역산합니다.'}
      </span>
    </div>
  );
}

/** 결과부: 핵심 숫자 카드 → 갭 게이지 → 전후 비교 표 */
function SimulationResultView({
  holding,
  current,
  mode,
  result,
}: {
  holding: Holding;
  current: number | undefined;
  mode: Mode;
  result: SimulationResult;
}) {
  /*
   * 손익분기 주가는 '이 가격 이상이면 본전'이라 원 단위 올림이다. 반올림하면 1원 모자란
   * 가격을 본전이라고 안내하게 된다.
   */
  const breakEvenPrice = Math.ceil(result.newAvgPrice);
  const breakEvenRate = current === undefined ? null : ((breakEvenPrice - current) / current) * 100;

  return (
    <>
      <div className="flex flex-col gap-2.5 text-[13.5px]">
        <ResultRow label="추가 매수 수량">{formatQuantity(result.quantity)}</ResultRow>
        <ResultRow label="필요 금액">
          <AnimatedNumber value={result.requiredAmount} format={formatWon} />
        </ResultRow>
        {result.remainingBudget !== null && (
          <ResultRow label="남는 예산">
            <AnimatedNumber value={result.remainingBudget} format={formatWon} />
          </ResultRow>
        )}
        {mode === 'budget' && result.quantity === 0 && (
          <p className="text-muted-foreground text-xs">
            예산이 1주 매수가보다 적어 추가 매수할 수 없습니다.
          </p>
        )}

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

        <ResultRow label="손익분기 주가">
          {formatWon(breakEvenPrice)}
          {breakEvenRate !== null && (
            <span className="text-muted-foreground block text-xs font-semibold">
              {breakEvenRate > 0
                ? `현재가 대비 ${formatPercent(breakEvenRate, { signed: true })}`
                : '현재가 기준 이미 수익권'}
            </span>
          )}
        </ResultRow>
      </div>

      {/* 게이지는 현재가 위에 그린다. 시세가 없으면 기준점이 없어 그리지 않는다 */}
      {current !== undefined && (
        <div className="flex flex-col gap-2 border-t pt-4">
          <span className="text-muted-foreground text-xs font-semibold">현재가 · 평단 갭</span>
          <GapGauge
            currentPrice={current}
            avgPrice={holding.avgPrice}
            newAvgPrice={result.newAvgPrice}
          />
        </div>
      )}

      {/*
       * 전후 비교·가정 가격별 손익 표는 왼쪽 열의 '추가 매수 상세' 카드에 있다. 패널에 함께
       * 두면 왼쪽 열보다 훨씬 길어져 데스크톱에서 차트 아래가 크게 빈다.
       * 모바일은 카드가 패널 바로 아래 쌓이므로 안내가 필요 없다.
       */}
      <Button
        type="button"
        variant="link"
        size="xs"
        className="text-brand hidden h-auto justify-start px-0 xl:inline-flex"
        onClick={() => scrollToAnchor(AVERAGING_DETAIL_ID)}
      >
        전후 비교·가정 가격별 손익 보기 →
      </Button>
    </>
  );
}

/** 목표 평단가 입력에 대한 안내 문구. 도달할 수 없으면 그 이유를 알려준다. */
function buildTargetMessage(input: string, holding: Holding, buyPrice: number): string {
  if (input.trim() === '') {
    return '"평단을 얼마까지 내리고 싶은지" 입력하면 필요한 매수량을 역산합니다.';
  }

  const targetAvg = Number(input);
  if (!Number.isFinite(targetAvg)) return '숫자를 입력해 주세요.';
  if (targetAvg >= holding.avgPrice) {
    return `목표가는 현재 평단(${formatWon(holding.avgPrice)})보다 낮아야 합니다.`;
  }
  if (targetAvg <= buyPrice) return `매수가(${formatWon(buyPrice)})보다 높은 목표가만 가능합니다.`;

  const quantity = calcQuantityForTargetAverage(holding, { buyPrice, targetAvg });
  if (quantity === null) return '계산 가능한 범위를 벗어난 목표가입니다.';

  return `${formatQuantity(quantity)} 추가 매수 시 평단 ${formatWon(targetAvg)} 달성 — ${formatWon(
    quantity * buyPrice,
  )} 필요`;
}
