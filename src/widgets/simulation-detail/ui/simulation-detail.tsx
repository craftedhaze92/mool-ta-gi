'use client';

import { useHoldingsStore, useSelectedHolding, type Holding } from '@/entities/holding';
import { useHoldingQuotes } from '@/features/holding-quotes';
import { resolveSimulation, useSimulationInputs } from '@/features/simulate-averaging';
import { AVERAGING_DETAIL_ID } from '@/shared/config/anchors';
import { cn } from '@/shared/lib/utils';
import { DETAIL_CARD } from '../lib/card';
import { SimulationComparison } from './simulation-comparison';

/**
 * 추가 매수 상세 — 시뮬레이터 결과의 전후 비교와 가정 가격별 손익.
 *
 * 입력은 시뮬레이터 패널이 받고 이 카드는 같은 입력으로 결과만 다시 계산해 그린다
 * (features/simulate-averaging). 패널에 함께 두지 않는 이유는 높이다 — 표 두 개가 붙으면
 * 패널이 왼쪽 열보다 훨씬 길어져 데스크톱에서 차트 아래가 크게 빈다. 표는 넓은 폭에서
 * 더 잘 읽히기도 한다.
 */
/**
 * @param className 대시보드 그리드 배치. 래퍼를 두지 않고 카드에 직접 단다 — 종목이 없어 카드가
 *   null일 때 빈 래퍼가 남으면 세로 배치에서 간격이 한 번 더 생긴다.
 */
export function SimulationDetail({ className }: { className?: string }) {
  const holding = useSelectedHolding();

  // 종목이 없으면 시뮬레이터도 비어 있다. 빈 카드를 하나 더 두지 않는다
  if (!holding) return null;

  // 입력 훅은 종목이 있어야 부를 수 있어 카드 본체를 따로 둔다 (훅은 조기 반환 전에 불러야 한다)
  return <SimulationDetailCard holding={holding} className={className} />;
}

function SimulationDetailCard({ holding, className }: { holding: Holding; className?: string }) {
  const holdings = useHoldingsStore((state) => state.holdings);
  const { prices } = useHoldingQuotes();
  const { inputs } = useSimulationInputs(holding);
  const { result, invalidReason } = resolveSimulation(holding, holdings, prices, inputs);

  return (
    <section id={AVERAGING_DETAIL_ID} className={cn(DETAIL_CARD, className)}>
      <h2 className="mb-4 flex items-baseline gap-2 text-[15px] font-bold">
        추가 매수 상세
        <span className="text-brand text-[13px] font-semibold">{holding.name}</span>
      </h2>

      {result ? (
        <SimulationComparison holding={holding} result={result} />
      ) : (
        // 패널과 같은 문구다. 입력은 패널에서 고치므로 여기서는 이유만 알려준다
        <p className="text-muted-foreground py-6 text-center text-[13px]">{invalidReason}</p>
      )}
    </section>
  );
}
