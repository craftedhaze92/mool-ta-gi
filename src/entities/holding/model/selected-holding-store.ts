'use client';

import { create } from 'zustand';
import { MOCK_HOLDINGS } from './mock';

const DEFAULT_ADD_QUANTITY = 30;

interface SelectedHoldingState {
  /** 시뮬레이터가 보고 있는 종목 코드 */
  selectedCode: string;
  /** 추가 매수 수량 (슬라이더) */
  addQuantity: number;
  /** 목표 평단가 입력값. 빈 문자열이면 미입력 */
  targetAvgInput: string;

  /** 종목을 바꾼다. 수량과 목표 평단가 입력은 초기화한다. */
  select: (code: string) => void;
  setAddQuantity: (quantity: number) => void;
  setTargetAvgInput: (value: string) => void;
}

/**
 * 보유 종목 테이블과 물타기 시뮬레이터가 공유하는 선택 상태.
 *
 * 두 위젯은 같은 레이어라 서로 import할 수 없으므로(FSD 규칙),
 * 이 스토어를 양쪽이 구독하는 방식으로 연동한다.
 */
export const useSelectedHoldingStore = create<SelectedHoldingState>((set) => ({
  selectedCode: MOCK_HOLDINGS[0].code,
  addQuantity: DEFAULT_ADD_QUANTITY,
  targetAvgInput: '',

  select: (code) =>
    set({ selectedCode: code, addQuantity: DEFAULT_ADD_QUANTITY, targetAvgInput: '' }),
  setAddQuantity: (addQuantity) => set({ addQuantity }),
  setTargetAvgInput: (targetAvgInput) => set({ targetAvgInput }),
}));
