'use client';

import { create } from 'zustand';
import type { SimulationInput } from '@/entities/holding';

/** 시뮬레이터 입력값. 입력칸이 들고 있는 그대로라 숫자도 문자열이다 */
export interface SimulationInputs {
  mode: SimulationInput['mode'];
  quantity: string;
  budget: string;
  /** 직접 입력한 매수가. null이면 '현재가를 따른다'는 뜻이다 */
  customPrice: string | null;
  /** 목표 평단가 역산 입력 */
  target: string;
}

/** 처음 열었을 때의 입력값. 수량은 예전 슬라이더의 기본값(30주)을 잇는다 */
export const DEFAULT_SIMULATION_INPUTS: SimulationInputs = {
  mode: 'quantity',
  quantity: '30',
  budget: '1000000',
  customPrice: null,
  target: '',
};

interface SimulationInputsState extends SimulationInputs {
  /**
   * 이 입력값이 어느 종목의 것인지. holdingKey()의 결과다.
   * 선택 종목과 다르면 입력값은 무시되고 기본값이 쓰인다 (use-simulation-inputs.ts).
   */
  ownerKey: string | null;
  update: (ownerKey: string, patch: Partial<SimulationInputs>) => void;
  reset: () => void;
}

/**
 * 시뮬레이터 입력값 스토어.
 *
 * 입력은 시뮬레이터 패널이 받고, 그 결과의 상세(전후 비교·가정 가격별 손익)는 왼쪽 열의 별도
 * 카드가 그린다. 둘은 같은 레이어(widgets)라 서로 import할 수 없으므로 입력을 여기에 둔다.
 *
 * 영속화하지 않는다. 시뮬레이션은 '만약에'를 따져보는 일회성 입력이라 새로고침하면 처음부터다.
 */
export const useSimulationInputsStore = create<SimulationInputsState>()((set) => ({
  ...DEFAULT_SIMULATION_INPUTS,
  ownerKey: null,

  update: (ownerKey, patch) =>
    set((state) => ({
      // 다른 종목의 입력이 남아 있으면 버리고 기본값 위에 덮어쓴다
      ...(state.ownerKey === ownerKey ? {} : DEFAULT_SIMULATION_INPUTS),
      ...patch,
      ownerKey,
    })),

  reset: () => set({ ...DEFAULT_SIMULATION_INPUTS, ownerKey: null }),
}));
