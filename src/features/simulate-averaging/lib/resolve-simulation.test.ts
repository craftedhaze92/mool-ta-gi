import { describe, expect, it } from 'vitest';
import type { Holding, PriceMap } from '@/entities/holding';
import { DEFAULT_SIMULATION_INPUTS } from '../model/simulation-inputs-store';
import { resolveSimulation } from './resolve-simulation';

const holding: Holding = {
  id: 'a',
  code: '005930',
  name: '삼성전자',
  sector: '전기·전자',
  quantity: 100,
  avgPrice: 1000,
};
const prices: PriceMap = { '005930': { current: 800, prevClose: 800 } };

const resolve = (patch: Partial<typeof DEFAULT_SIMULATION_INPUTS>, priceMap: PriceMap = prices) =>
  resolveSimulation(holding, [holding], priceMap, { ...DEFAULT_SIMULATION_INPUTS, ...patch });

describe('resolveSimulation', () => {
  it('직접 입력한 매수가가 없으면 현재가를 따른다', () => {
    const resolved = resolve({});

    expect(resolved.priceText).toBe('800');
    expect(resolved.result?.quantity).toBe(30);
    expect(resolved.invalidReason).toBeNull();
  });

  it('계산 기준에 맞는 입력값을 고른다', () => {
    expect(resolve({ mode: 'budget', budget: '8000' }).result?.quantity).toBe(10);
  });

  it('계산할 수 없으면 입력칸 순서대로 첫 원인 하나를 알려준다', () => {
    expect(resolve({}, {}).invalidReason).toBe('매수가를 입력하면 결과가 여기에 표시됩니다.');
    expect(resolve({ customPrice: '0' }).invalidReason).toBe(
      '매수가는 1원 이상의 정수로 입력해주세요.',
    );
    expect(resolve({ quantity: '' }).invalidReason).toBe(
      '추가 매수 수량을 입력하면 결과가 여기에 표시됩니다.',
    );
    expect(resolve({ mode: 'budget', budget: '-1' }).invalidReason).toBe(
      '투입 예산은 0 이상의 정수로 입력해주세요.',
    );
    expect(resolve({ quantity: String(Number.MAX_SAFE_INTEGER) }).invalidReason).toBe(
      '금액이 너무 커서 계산할 수 없습니다.',
    );
  });
});
