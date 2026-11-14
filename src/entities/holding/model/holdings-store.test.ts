import { beforeEach, describe, expect, it } from 'vitest';
import { useHoldingsStore } from './holdings-store';
import { HOLDING_FIXTURES } from './holdings.fixture';
// 마이그레이션 테스트는 'seed로 떨어지는가'를 확인하므로 seed 자체를 참조해야 한다.
import { MOCK_HOLDINGS } from './mock';
import type { HoldingInput } from './types';

const KAKAO: HoldingInput = {
  name: '카카오',
  code: '035720',
  sector: 'IT 서비스',
  quantity: 90,
  avgPrice: 58_200,
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

  it('선택을 바꾸면서 시뮬레이터 입력을 초기화한다', () => {
    state().setAddQuantity(150);
    state().setTargetAvgInput('70000');

    state().addHolding(KAKAO);

    expect(state().addQuantity).toBe(30);
    expect(state().targetAvgInput).toBe('');
  });
});

describe('updateHolding', () => {
  it('입력값으로 덮어쓴다', () => {
    const target = HOLDING_FIXTURES[0];

    state().updateHolding(target.id, {
      name: '삼성전자',
      code: '005930',
      sector: '반도체',
      quantity: 200,
      avgPrice: 75_000,
    });

    expect(state().holdings[0]).toMatchObject({
      id: target.id,
      quantity: 200,
      avgPrice: 75_000,
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
    state().addHolding(KAKAO);

    const saved = JSON.parse(localStorage.getItem('multagi-holdings') ?? '{}');

    expect(Object.keys(saved.state)).toEqual(['holdings']);
    expect(saved.state.holdings).toHaveLength(5);
  });

  /** 저장된 payload를 직접 심어 rehydrate가 어떻게 처리하는지 본다. */
  const seedStorage = (version: number, holdings: unknown[]) =>
    localStorage.setItem('multagi-holdings', JSON.stringify({ version, state: { holdings } }));

  /** v2까지 저장되던 형태. 시세를 품고 있고 종목코드가 선택 입력이었다. */
  const legacy = (over: Record<string, unknown> = {}) => ({
    id: 'legacy-1',
    code: '005930',
    name: '삼성전자',
    sector: '반도체',
    quantity: 120,
    avgPrice: 78_400,
    currentPrice: 71_200,
    prevClose: 72_300,
    ...over,
  });

  it('현재 version 저장값은 그대로 복원한다', async () => {
    seedStorage(3, [{ ...HOLDING_FIXTURES[0], name: '옛날데이터', quantity: 999 }]);

    await useHoldingsStore.persist.rehydrate();

    expect(state().holdings).toHaveLength(1);
    expect(state().holdings[0]).toMatchObject({ name: '옛날데이터', quantity: 999 });
  });

  describe('v2 → v3 마이그레이션', () => {
    it('보유 내역은 지키고 시세 필드만 떼어낸다', async () => {
      // 수량·평단가는 사용자만 아는 값이라 다시 받아낼 방법이 없다. 반드시 살아남아야 한다.
      seedStorage(2, [legacy({ quantity: 999, avgPrice: 12_345 })]);

      await useHoldingsStore.persist.rehydrate();

      expect(state().holdings).toHaveLength(1);
      expect(state().holdings[0]).toEqual({
        id: 'legacy-1',
        code: '005930',
        name: '삼성전자',
        sector: '반도체',
        quantity: 999,
        avgPrice: 12_345,
      });
      expect(state().holdings[0]).not.toHaveProperty('currentPrice');
      expect(state().holdings[0]).not.toHaveProperty('prevClose');
    });

    /*
     * 종목코드가 없으면 시세를 붙일 수 없다. 남겨두면 평가금액도 비중도 영원히 계산되지
     * 않는 유령 행이 되어 합계를 조용히 어긋나게 만든다.
     */
    it('종목코드가 없던 항목은 버린다', async () => {
      seedStorage(2, [legacy(), legacy({ id: 'legacy-2', code: '—', name: '코드없음' })]);

      await useHoldingsStore.persist.rehydrate();

      expect(state().holdings.map((h) => h.name)).toEqual(['삼성전자']);
    });

    it('6자리가 아닌 종목코드도 버린다', async () => {
      seedStorage(2, [legacy({ code: '12345' }), legacy({ id: 'x', code: '' })]);

      await useHoldingsStore.persist.rehydrate();

      expect(state().holdings).toEqual([]);
    });

    it('형태가 깨진 항목은 건너뛰고 나머지를 살린다', async () => {
      seedStorage(2, [null, 'garbage', legacy({ quantity: 'abc' }), legacy({ id: 'ok' })]);

      await useHoldingsStore.persist.rehydrate();

      expect(state().holdings.map((h) => h.id)).toEqual(['ok']);
    });

    /*
     * 옛 섹터는 사용자가 고른 값이라 버리지 않는다. 실제 업종은 종목 마스터를 조회해야 알 수
     * 있으므로 여기서는 손대지 않고, 섹터 동기화(syncSectors)가 첫 화면에서 맞춘다.
     */
    it('섹터는 그대로 두고, 비어 있거나 문자열이 아니면 기타로 떨어뜨린다', async () => {
      seedStorage(2, [
        legacy({ id: 'a', sector: '없어진섹터' }),
        legacy({ id: 'b', sector: '' }),
        legacy({ id: 'c', sector: 42 }),
      ]);

      await useHoldingsStore.persist.rehydrate();

      expect(state().holdings.map((h) => h.sector)).toEqual(['없어진섹터', '기타', '기타']);
    });

    it('저장 형태 자체가 깨졌으면 seed로 떨어진다', async () => {
      seedStorage(1, 'not-an-array' as unknown as unknown[]);

      await useHoldingsStore.persist.rehydrate();

      expect(state().holdings).toEqual(MOCK_HOLDINGS);
    });
  });
});

describe('syncSectors', () => {
  it('종목 마스터의 업종으로 섹터를 맞추고, 맵에 없는 종목은 그대로 둔다', () => {
    useHoldingsStore.setState({
      holdings: [
        { ...HOLDING_FIXTURES[0], sector: '반도체' },
        { ...HOLDING_FIXTURES[2], sector: '인터넷' },
      ],
    });

    state().syncSectors({ '005930': '전기·전자' });

    expect(state().holdings.map((h) => h.sector)).toEqual(['전기·전자', '인터넷']);
  });

  it('바뀐 것이 없으면 상태 객체를 새로 만들지 않는다', () => {
    const before = state().holdings;

    state().syncSectors({ [before[0].code]: before[0].sector });

    expect(state().holdings).toBe(before);
  });
});
