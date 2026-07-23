import { beforeEach, describe, expect, it } from 'vitest';
import { useHoldingsStore } from './holdings-store';
import { HOLDING_FIXTURES } from './holdings.fixture';
// 마이그레이션 테스트는 'seed로 떨어지는가'를 확인하므로 seed 자체를 참조해야 한다.
import { MOCK_HOLDINGS } from './mock';
import { NO_CODE, type HoldingInput } from './types';

const KAKAO: HoldingInput = {
  name: '카카오',
  code: '035720',
  sector: '인터넷',
  quantity: 90,
  avgPrice: 58_200,
  currentPrice: 41_850,
};

/** 스토어는 모듈 스코프 싱글턴이라 테스트마다 seed 상태로 되돌린다. */
beforeEach(() => {
  localStorage.clear();
  useHoldingsStore.setState({
    holdings: HOLDING_FIXTURES.map((h) => ({ ...h })),
    selectedId: HOLDING_FIXTURES[0].id,
    addQuantity: 30,
    targetAvgInput: '',
  });
});

const state = () => useHoldingsStore.getState();

describe('addHolding', () => {
  it('목록 끝에 추가하고 그 종목을 선택한다', () => {
    const id = state().addHolding(KAKAO);
    const holdings = state().holdings;

    expect(holdings).toHaveLength(5);
    expect(holdings[4]).toMatchObject({ id, name: '카카오', quantity: 90 });
    expect(state().selectedId).toBe(id);
  });

  it('전일 종가를 알 수 없으므로 현재가와 같게 둔다', () => {
    state().addHolding(KAKAO);
    expect(state().holdings[4].prevClose).toBe(KAKAO.currentPrice);
  });

  it('선택을 바꾸면서 시뮬레이터 입력을 초기화한다', () => {
    state().setAddQuantity(150);
    state().setTargetAvgInput('70000');

    state().addHolding(KAKAO);

    expect(state().addQuantity).toBe(30);
    expect(state().targetAvgInput).toBe('');
  });
});

describe('updateHolding', () => {
  it('입력값으로 덮어쓰되 전일 종가는 보존한다', () => {
    const target = HOLDING_FIXTURES[0];

    state().updateHolding(target.id, {
      name: '삼성전자',
      code: '005930',
      sector: '반도체',
      quantity: 200,
      avgPrice: 75_000,
      currentPrice: 70_000,
    });

    expect(state().holdings[0]).toMatchObject({
      quantity: 200,
      avgPrice: 75_000,
      currentPrice: 70_000,
      prevClose: target.prevClose,
    });
  });

  it('없는 id면 아무것도 바꾸지 않는다', () => {
    state().updateHolding('unknown', KAKAO);
    expect(state().holdings).toHaveLength(4);
    expect(state().holdings[0].name).toBe('삼성전자');
  });
});

describe('mergeHolding', () => {
  it('수량은 더하고 평단가는 가중평균으로 갱신한다', () => {
    const samsung = HOLDING_FIXTURES[0]; // 120주 @ 78,400

    state().mergeHolding(samsung.id, { ...KAKAO, quantity: 30, avgPrice: 71_200 });

    expect(state().holdings).toHaveLength(4);
    expect(state().holdings[0]).toMatchObject({
      id: samsung.id,
      quantity: 150,
      avgPrice: 76_960, // (120×78,400 + 30×71,200) / 150
    });
  });

  it('전일 종가는 기존값을 유지한다', () => {
    const samsung = HOLDING_FIXTURES[0];
    state().mergeHolding(samsung.id, { ...KAKAO, quantity: 10, avgPrice: 70_000 });

    expect(state().holdings[0].prevClose).toBe(samsung.prevClose);
  });
});

describe('removeHolding', () => {
  it('선택 중이 아닌 종목을 지우면 선택이 유지된다', () => {
    state().selectHolding(HOLDING_FIXTURES[1].id);
    state().removeHolding(HOLDING_FIXTURES[3].id);

    expect(state().holdings).toHaveLength(3);
    expect(state().selectedId).toBe(HOLDING_FIXTURES[1].id);
  });

  it('선택 중인 종목을 지우면 인접 종목으로 옮겨간다', () => {
    state().selectHolding(HOLDING_FIXTURES[0].id);
    state().removeHolding(HOLDING_FIXTURES[0].id);

    expect(state().selectedId).toBe(HOLDING_FIXTURES[1].id);
  });

  it('마지막 한 건까지 지우면 선택이 없어진다', () => {
    for (const holding of HOLDING_FIXTURES) state().removeHolding(holding.id);

    expect(state().holdings).toHaveLength(0);
    expect(state().selectedId).toBeNull();
  });
});

describe('persist', () => {
  it('종목만 저장하고 선택 상태는 저장하지 않는다', () => {
    state().addHolding({ ...KAKAO, code: '' });

    const saved = JSON.parse(localStorage.getItem('multagi-holdings') ?? '{}');

    expect(Object.keys(saved.state)).toEqual(['holdings']);
    expect(saved.state.holdings).toHaveLength(5);
  });

  /** 저장된 payload를 직접 심어 rehydrate가 어떻게 처리하는지 본다. */
  const seedStorage = (version: number) =>
    localStorage.setItem(
      'multagi-holdings',
      JSON.stringify({
        version,
        state: { holdings: [{ ...HOLDING_FIXTURES[0], name: '옛날데이터', quantity: 999 }] },
      }),
    );

  it('현재 version 저장값은 그대로 복원한다', async () => {
    seedStorage(2);

    await useHoldingsStore.persist.rehydrate();

    expect(state().holdings).toHaveLength(1);
    expect(state().holdings[0]).toMatchObject({ name: '옛날데이터', quantity: 999 });
  });

  /*
   * seed를 갱신해도 기존 사용자가 옛 종목을 계속 보는 문제를 version으로 끊는다.
   * 값이 아니라 'seed와 같아지는가'로 단언해야 seed를 또 고쳐도 이 테스트가 살아남는다.
   */
  it('옛 version 저장값은 버리고 seed로 떨어진다', async () => {
    seedStorage(1);

    await useHoldingsStore.persist.rehydrate();

    expect(state().holdings).toEqual(MOCK_HOLDINGS);
    expect(state().holdings.map((h) => h.name)).not.toContain('옛날데이터');
  });
});

describe('NO_CODE', () => {
  it('종목코드 자리 표시자는 저장 값과 구분된다', () => {
    state().addHolding({ ...KAKAO, code: NO_CODE });
    expect(state().holdings[4].code).toBe(NO_CODE);
  });
});
