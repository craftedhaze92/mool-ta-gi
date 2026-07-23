'use client';

import { create } from 'zustand';
import { combine } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { MOCK_HOLDINGS } from './mock';

const DEFAULT_ADD_QUANTITY = 30;

/**
 * 보유 종목 테이블과 물타기 시뮬레이터가 공유하는 선택 상태.
 *
 * 두 위젯은 같은 레이어라 서로 import할 수 없으므로(FSD 규칙),
 * 이 스토어를 양쪽이 구독하는 방식으로 연동한다.
 *
 * combine으로 초기 상태에서 타입을 추론하고, immer로 set 안에서 직접 대입한다.
 * (미들웨어 순서상 immer가 바깥이어야 combine의 액션 생성자가 immer set을 받는다)
 */
export const useSelectedHoldingStore = create(
  immer(
    combine(
      {
        /** 시뮬레이터가 보고 있는 종목 코드 */
        selectedCode: MOCK_HOLDINGS[0].code,
        /** 추가 매수 수량 (슬라이더) */
        addQuantity: DEFAULT_ADD_QUANTITY,
        /** 목표 평단가 입력값. 빈 문자열이면 미입력 */
        targetAvgInput: '',
      },
      (set) => ({
        /** 종목을 바꾼다. 수량과 목표 평단가 입력은 초기화한다. */
        select: (code: string) =>
          set((state) => {
            state.selectedCode = code;
            state.addQuantity = DEFAULT_ADD_QUANTITY;
            state.targetAvgInput = '';
          }),

        setAddQuantity: (quantity: number) =>
          set((state) => {
            state.addQuantity = quantity;
          }),

        setTargetAvgInput: (value: string) =>
          set((state) => {
            state.targetAvgInput = value;
          }),
      }),
    ),
  ),
);
