'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { combine, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { calcWeightedAverage, pickNextSelectedId } from './calc';
import { MOCK_HOLDINGS } from './mock';
import { SECTORS, type Holding, type HoldingInput, type Sector } from './types';

const DEFAULT_ADD_QUANTITY = 30;

/** persist가 저장하는 부분. partialize와 짝을 이룬다. */
interface PersistedHoldings {
  holdings: Holding[];
}

const CODE_PATTERN = /^\d{6}$/;

/**
 * 옛 저장값을 현재 형태로 옮긴다.
 *
 * v2 이하는 종목마다 currentPrice/prevClose를 들고 있었고 종목코드가 선택 입력이었다.
 * 시세는 이제 서버에서 오므로 그냥 버리면 되지만, **종목코드가 없는 항목은 버린다.**
 * 코드가 없으면 시세를 붙일 방법이 없어 평가금액·손익·비중이 영원히 계산되지 않는
 * 유령 행이 되기 때문이다. 그런 행을 남겨두면 합계가 조용히 어긋난다.
 *
 * 수량·평단가는 사용자만 아는 값이라 최대한 지킨다. 형태가 깨진 항목만 걸러낸다.
 */
function migrateHoldings(persisted: unknown, version: number): PersistedHoldings {
  if (version >= 3) return (persisted as PersistedHoldings | undefined) ?? { holdings: [] };

  const raw = (persisted as { holdings?: unknown } | undefined)?.holdings;
  if (!Array.isArray(raw)) return { holdings: MOCK_HOLDINGS };

  const holdings = raw.flatMap((item) => {
    const holding = toMigratedHolding(item);
    return holding === null ? [] : [holding];
  });

  return { holdings };
}

function toMigratedHolding(item: unknown): Holding | null {
  if (typeof item !== 'object' || item === null) return null;

  const record = item as Record<string, unknown>;
  const { id, code, name, sector, quantity, avgPrice } = record;

  if (typeof code !== 'string' || !CODE_PATTERN.test(code)) return null;
  if (typeof name !== 'string' || name === '') return null;
  if (typeof quantity !== 'number' || !Number.isFinite(quantity)) return null;
  if (typeof avgPrice !== 'number' || !Number.isFinite(avgPrice)) return null;

  return {
    id: typeof id === 'string' && id !== '' ? id : `migrated-${code}`,
    code,
    name,
    // 섹터 목록이 바뀌었을 수 있다. 모르는 값은 '기타'로 떨어뜨린다.
    sector: SECTORS.includes(sector as Sector) ? (sector as Sector) : '기타',
    quantity,
    avgPrice,
  };
}

/**
 * 보유 종목의 단일 소스.
 *
 * 목록과 '시뮬레이터가 보고 있는 종목'을 한 스토어에 둔다. 삭제할 때 선택 보정을
 * 같은 set 안에서 원자적으로 끝낼 수 있기 때문이다.
 *
 * 미들웨어 순서: persist(immer(combine(...))).
 * combine이 초기 상태에서 타입을 추론하고, immer가 set 안에서의 직접 대입을 허용하며,
 * persist는 가장 바깥에서 localStorage 동기화만 담당한다.
 *
 * persist는 skipHydration으로 꺼둔다. Next.js SSR은 seed 상태로 HTML을 만드는데
 * 클라이언트가 곧바로 localStorage 값으로 렌더하면 hydration mismatch가 나기 때문이다.
 * 실제 복원은 useHoldingsHydrated()가 마운트 후에 트리거한다.
 */
export const useHoldingsStore = create(
  persist(
    immer(
      combine(
        {
          /** 저장된 값이 없을 때만 남는 seed */
          holdings: MOCK_HOLDINGS,
          /** 시뮬레이터가 보고 있는 종목 id. 목록이 비면 null */
          selectedId: MOCK_HOLDINGS[0].id as string | null,
          /** 추가 매수 수량 (슬라이더) */
          addQuantity: DEFAULT_ADD_QUANTITY,
          /** 목표 평단가 입력값. 빈 문자열이면 미입력 */
          targetAvgInput: '',
        },
        (set) => ({
          /** 새 종목을 추가하고 그 종목을 선택한다. 발급된 id를 돌려준다. */
          addHolding: (input: HoldingInput): string => {
            const id = crypto.randomUUID();

            set((state) => {
              state.holdings.push({ ...input, id });
              state.selectedId = id;
              state.addQuantity = DEFAULT_ADD_QUANTITY;
              state.targetAvgInput = '';
            });

            return id;
          },

          /** 기존 종목을 덮어쓴다. */
          updateHolding: (id: string, input: HoldingInput) =>
            set((state) => {
              const target = state.holdings.find((h) => h.id === id);
              if (!target) return;

              Object.assign(target, input);
            }),

          /**
           * 추가 매수 합산. 수량은 더하고 평단가는 가중평균으로 갱신한다.
           * 종목명·섹터는 새로 입력한 값을 따른다.
           */
          mergeHolding: (targetId: string, input: HoldingInput) =>
            set((state) => {
              const target = state.holdings.find((h) => h.id === targetId);
              if (!target) return;

              target.avgPrice = calcWeightedAverage(
                target.quantity,
                target.avgPrice,
                input.quantity,
                input.avgPrice,
              );
              target.quantity += input.quantity;
              target.name = input.name;
              target.code = input.code;
              target.sector = input.sector;
            }),

          removeHolding: (id: string) =>
            set((state) => {
              const nextSelectedId = pickNextSelectedId(state.holdings, id, state.selectedId);

              state.holdings = state.holdings.filter((h) => h.id !== id);

              if (nextSelectedId !== state.selectedId) {
                state.selectedId = nextSelectedId;
                state.addQuantity = DEFAULT_ADD_QUANTITY;
                state.targetAvgInput = '';
              }
            }),

          /** 종목을 바꾼다. 수량과 목표 평단가 입력은 초기화한다. */
          selectHolding: (id: string) =>
            set((state) => {
              state.selectedId = id;
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
    {
      name: 'multagi-holdings',
      /*
       * v3: 시세(currentPrice/prevClose)를 서버 상태로 분리하고 종목코드를 필수로 올렸다.
       *
       * v2까지는 저장값을 통째로 버리고 seed로 떨어뜨렸다. 목데이터 단계에서는 그래도
       * 됐지만, 이번에는 사용자가 직접 넣은 보유 내역을 지키면서 형태만 바꾼다.
       * 수량과 평단가는 사용자만 아는 값이라 다시 받아낼 방법이 없기 때문이다.
       */
      version: 3,
      skipHydration: true,
      // 선택 상태와 슬라이더 값은 세션 한정이라 저장하지 않는다.
      partialize: (state) => ({ holdings: state.holdings }),
      migrate: migrateHoldings,
    },
  ),
);

/**
 * localStorage 복원을 마운트 후로 미루고, 완료 여부를 돌려준다.
 *
 * false인 동안 스토어는 seed 상태를 들고 있으므로 화면에 실제 데이터를 그리면 안 된다.
 * 대시보드 뷰 한 곳에서만 이 훅을 쓰고, 위젯들은 이 사정을 모르게 둔다.
 */
/**
 * 복원 트리거가 한 번만 돌게 막는다.
 *
 * 이 훅을 부르는 곳이 대시보드 뷰 하나였을 때는 필요 없었지만, 시세 조회 피처도 같은
 * 신호를 쓰면서 호출부가 둘이 됐다. 가드가 없으면 마운트 때마다 rehydrate()가 중복으로
 * 걸린다.
 */
let rehydrateTriggered = false;

export function useHoldingsHydrated(): boolean {
  // persist는 React 바깥의 외부 저장소다. 구독은 useSyncExternalStore에 맡기고
  // 효과에서는 복원 트리거만 건다 (효과 안에서 setState 하지 않기 위해서다).
  const hydrated = useSyncExternalStore(
    (onStoreChange) => useHoldingsStore.persist.onFinishHydration(onStoreChange),
    () => useHoldingsStore.persist.hasHydrated(),
    () => false,
  );

  useEffect(() => {
    if (rehydrateTriggered || useHoldingsStore.persist.hasHydrated()) return;

    rehydrateTriggered = true;
    void useHoldingsStore.persist.rehydrate();
  }, []);

  return hydrated;
}

/**
 * 시뮬레이터가 보고 있는 종목.
 * selectedId가 가리키는 종목이 없으면 첫 종목으로, 목록이 비면 null로 떨어진다.
 */
export function useSelectedHolding(): Holding | null {
  return useHoldingsStore((state) => {
    const found = state.holdings.find((h) => h.id === state.selectedId);
    return found ?? state.holdings[0] ?? null;
  });
}
