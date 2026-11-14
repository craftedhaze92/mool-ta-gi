'use client';

import type { Holding } from '@/entities/holding';
import {
  DEFAULT_SIMULATION_INPUTS,
  useSimulationInputsStore,
  type SimulationInputs,
} from './simulation-inputs-store';

/**
 * 입력값을 묶을 종목 식별자.
 *
 * 코드까지 넣는 이유는 같은 행에서 종목을 다른 종목으로 수정한 경우도 '다른 종목'이기
 * 때문이다. 그때 이전 종목의 매수가가 새 종목에 묻어가면 안 된다.
 */
export function holdingKey(holding: Pick<Holding, 'id' | 'code'>): string {
  return `${holding.id}:${holding.code}`;
}

export interface SimulationInputsHandle {
  inputs: SimulationInputs;
  /** 입력값 일부를 바꾼다 */
  update: (patch: Partial<SimulationInputs>) => void;
}

/**
 * 선택 종목의 시뮬레이터 입력값.
 *
 * 스토어에 다른 종목의 입력이 남아 있으면 기본값을 돌려준다. 그래서 종목을 바꾸면 따로
 * 초기화하지 않아도 입력이 처음 상태로 보인다 — effect로 지우면 한 프레임 동안 이전 종목의
 * 숫자가 새 종목에 비친다.
 */
export function useSimulationInputs(holding: Holding): SimulationInputsHandle {
  const key = holdingKey(holding);
  const state = useSimulationInputsStore();
  const owned = state.ownerKey === key;

  const inputs: SimulationInputs = owned
    ? {
        mode: state.mode,
        quantity: state.quantity,
        budget: state.budget,
        customPrice: state.customPrice,
        target: state.target,
      }
    : DEFAULT_SIMULATION_INPUTS;

  return { inputs, update: (patch) => state.update(key, patch) };
}
