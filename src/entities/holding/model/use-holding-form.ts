'use client';

import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { calcWeightedAverage } from './calc';
import {
  EMPTY_HOLDING_FORM,
  findDuplicateByCode,
  holdingFormSchema,
  toFormValues,
  toHoldingInput,
  type HoldingFormValues,
} from './holding-form-schema';
import { useHoldingsStore } from './holdings-store';
import type { Holding, HoldingInput } from './types';

/** 필드 순서대로 첫 에러 하나만 보여주므로 우선순위를 고정해 둔다. */
const FIELD_ORDER = ['name', 'code', 'sector', 'quantity', 'avgPrice', 'currentPrice'] as const;

/** 같은 종목코드를 발견해 합산 확인 단계로 넘어갔을 때의 미리보기 값 */
export interface MergePreview {
  target: Holding;
  input: HoldingInput;
  /** 합산 후 평단가 */
  newAvgPrice: number;
  /** 합산 후 총 수량 */
  totalQuantity: number;
}

interface UseHoldingFormOptions {
  /** 수정 중인 종목. 없으면 신규 추가 모드다. */
  editing?: Holding;
  /** 저장이 끝나 다이얼로그를 닫아야 할 때 */
  onSaved: () => void;
}

/**
 * 종목 추가/수정 폼의 상태 기계.
 *
 * add-holding과 edit-holding은 같은 레이어라 서로 import할 수 없어서 여기(entities)에 둔다.
 * 두 기능의 차이는 '수정 중인 종목이 있는가' 하나뿐이라 모드 분기로 흡수했다.
 *
 * 흐름: 입력 → 저장 → (같은 종목코드가 있으면) 합산 미리보기 → 확정.
 *
 * 폼 초기화는 따로 하지 않는다. 다이얼로그를 열 때마다 새로 마운트하는 것이 호출 규약이라
 * 이전 입력이 남을 일이 없다.
 */
export function useHoldingForm({ editing, onSaved }: UseHoldingFormOptions) {
  const addHolding = useHoldingsStore((s) => s.addHolding);
  const updateHolding = useHoldingsStore((s) => s.updateHolding);
  const mergeHolding = useHoldingsStore((s) => s.mergeHolding);
  const removeHolding = useHoldingsStore((s) => s.removeHolding);
  const selectHolding = useHoldingsStore((s) => s.selectHolding);

  const [mergePreview, setMergePreview] = useState<MergePreview | null>(null);

  const form = useForm<HoldingFormValues>({
    resolver: zodResolver(holdingFormSchema),
    defaultValues: editing ? toFormValues(editing) : EMPTY_HOLDING_FORM,
    mode: 'onSubmit',
  });

  const save = useCallback(
    (input: HoldingInput) => {
      if (editing) {
        updateHolding(editing.id, input);
        selectHolding(editing.id);
      } else {
        addHolding(input);
      }
      onSaved();
    },
    [editing, updateHolding, selectHolding, addHolding, onSaved],
  );

  const submit = form.handleSubmit((values) => {
    const input = toHoldingInput(holdingFormSchema.parse(values));
    const holdings = useHoldingsStore.getState().holdings;
    const duplicate = findDuplicateByCode(holdings, input.code, editing?.id);

    if (!duplicate) {
      save(input);
      return;
    }

    setMergePreview({
      target: duplicate,
      input,
      newAvgPrice: calcWeightedAverage(
        duplicate.quantity,
        duplicate.avgPrice,
        input.quantity,
        input.avgPrice,
      ),
      totalQuantity: duplicate.quantity + input.quantity,
    });
  });

  /** 합산 확정. 수정 모드였다면 흡수된 원래 행은 목록에서 지운다. */
  const confirmMerge = useCallback(() => {
    if (!mergePreview) return;

    mergeHolding(mergePreview.target.id, mergePreview.input);
    if (editing) removeHolding(editing.id);
    selectHolding(mergePreview.target.id);

    setMergePreview(null);
    onSaved();
  }, [mergePreview, mergeHolding, editing, removeHolding, selectHolding, onSaved]);

  const cancelMerge = useCallback(() => setMergePreview(null), []);

  return {
    form,
    mergePreview,
    submit,
    confirmMerge,
    cancelMerge,
    errorMessage: firstErrorMessage(form.formState.errors),
  };
}

/** 시안은 에러를 폼 하단 한 줄로 모아 보여준다. 필드 순서상 첫 에러를 고른다. */
function firstErrorMessage(
  errors: Record<string, { message?: string } | undefined>,
): string | null {
  for (const field of FIELD_ORDER) {
    const message = errors[field]?.message;
    if (message) return message;
  }
  return null;
}
