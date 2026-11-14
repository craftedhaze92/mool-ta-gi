import {
  calcSimulation,
  type Holding,
  type PriceMap,
  type SimulationResult,
} from '@/entities/holding';
import type { SimulationInputs } from '../model/simulation-inputs-store';

export interface ResolvedSimulation {
  /** 매수가 입력칸에 보일 값. 직접 입력이 없으면 현재가(없으면 빈 칸)다 */
  priceText: string;
  /** 현재 계산 기준(수량/예산)의 입력값 */
  amountText: string;
  /** 계산 결과. 입력이 계산할 수 없는 상태면 null */
  result: SimulationResult | null;
  /** result가 null인 이유. 화면에 그대로 보여줄 문구다 */
  invalidReason: string | null;
}

/**
 * 입력값(문자열) → 계산 결과 + 안 될 때의 이유.
 *
 * 시뮬레이터 패널과 상세 카드가 같은 입력으로 각자 부른다. 두 위젯이 서로를 모르므로
 * 결과를 넘겨줄 수 없고, 같은 판단을 하려면 같은 함수를 거쳐야 한다. 순수 계산이라 두 번
 * 불러도 비용이 작다.
 */
export function resolveSimulation(
  holding: Holding,
  holdings: Holding[],
  prices: PriceMap,
  inputs: SimulationInputs,
): ResolvedSimulation {
  const current = prices[holding.code]?.current;
  const priceText = inputs.customPrice ?? (current === undefined ? '' : String(current));
  const amountText = inputs.mode === 'quantity' ? inputs.quantity : inputs.budget;

  const result =
    priceText.trim() === '' || amountText.trim() === ''
      ? null
      : calcSimulation(holding, holdings, prices, {
          mode: inputs.mode,
          amount: Number(amountText),
          buyPrice: Number(priceText),
        });

  return {
    priceText,
    amountText,
    result,
    invalidReason: result ? null : describeInvalidInput(priceText, amountText, inputs.mode),
  };
}

/**
 * 계산 결과가 없을 때 그 원인을 하나만 골라 알려준다.
 *
 * 입력칸 순서(매수가 → 수량/예산)대로 확인한다. 한꺼번에 나열하면 무엇부터 고칠지 흐려진다.
 * 모든 입력이 형식상 맞는데도 결과가 없다면 금액이 계산 범위를 넘은 경우뿐이다.
 */
function describeInvalidInput(
  priceText: string,
  amountText: string,
  mode: SimulationInputs['mode'],
): string {
  const amountLabel = mode === 'quantity' ? '추가 매수 수량' : '투입 예산';

  if (priceText.trim() === '') return '매수가를 입력하면 결과가 여기에 표시됩니다.';

  const buyPrice = Number(priceText);
  if (!Number.isSafeInteger(buyPrice) || buyPrice <= 0) {
    return '매수가는 1원 이상의 정수로 입력해주세요.';
  }

  if (amountText.trim() === '') return `${amountLabel}을 입력하면 결과가 여기에 표시됩니다.`;

  const amount = Number(amountText);
  if (!Number.isSafeInteger(amount) || amount < 0) {
    return `${amountLabel}은 0 이상의 정수로 입력해주세요.`;
  }

  return '금액이 너무 커서 계산할 수 없습니다.';
}
