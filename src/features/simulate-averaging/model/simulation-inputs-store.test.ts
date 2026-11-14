import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Holding } from '@/entities/holding';
import { DEFAULT_SIMULATION_INPUTS, useSimulationInputsStore } from './simulation-inputs-store';
import { useSimulationInputs } from './use-simulation-inputs';

const samsung: Holding = {
  id: 'a',
  code: '005930',
  name: '삼성전자',
  sector: '전기·전자',
  quantity: 100,
  avgPrice: 1000,
};

beforeEach(() => useSimulationInputsStore.getState().reset());

describe('useSimulationInputs', () => {
  it('입력은 그 종목에만 묶이고, 다른 종목을 보면 기본값이다', () => {
    const { result, rerender } = renderHook(({ holding }) => useSimulationInputs(holding), {
      initialProps: { holding: samsung },
    });

    act(() => result.current.update({ quantity: '50', customPrice: '700' }));
    expect(result.current.inputs).toMatchObject({ quantity: '50', customPrice: '700' });

    // 다른 종목으로 바꾸면 기본값
    rerender({ holding: { ...samsung, id: 'b', code: '000660' } });
    expect(result.current.inputs).toEqual(DEFAULT_SIMULATION_INPUTS);

    // 같은 행이라도 종목을 다른 종목으로 수정했다면 다른 종목이다
    rerender({ holding: { ...samsung, code: '035420' } });
    expect(result.current.inputs).toEqual(DEFAULT_SIMULATION_INPUTS);
  });

  it('다른 종목에서 입력을 시작하면 이전 종목의 나머지 값은 버린다', () => {
    const { result, rerender } = renderHook(({ holding }) => useSimulationInputs(holding), {
      initialProps: { holding: samsung },
    });
    act(() => result.current.update({ quantity: '50', target: '900' }));

    rerender({ holding: { ...samsung, id: 'b', code: '000660' } });
    act(() => result.current.update({ quantity: '10' }));

    expect(result.current.inputs).toEqual({ ...DEFAULT_SIMULATION_INPUTS, quantity: '10' });
  });
});
