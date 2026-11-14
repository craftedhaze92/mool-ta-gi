'use client';

import { Controller, type UseFormReturn } from 'react-hook-form';
import type { Stock } from '@/shared/api/stock-search-contract';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { cn } from '@/shared/lib/utils';
import type { HoldingFormValues } from '../model/holding-form-schema';
import { SECTORS } from '../model/types';
import { StockSearchCombobox } from './stock-search-combobox';

/** 시안의 입력 필드 스펙: 14px, radius 10px, 헤어라인 테두리, 포커스 시 브랜드 컬러 */
const FIELD =
  'border-hairline focus-visible:border-brand h-auto rounded-[10px] border px-3 py-2.5 text-sm focus-visible:ring-0';

const LABEL = 'text-muted-foreground flex flex-col gap-1.5 text-xs font-semibold';

/**
 * 종목 추가와 종목 수정이 공유하는 폼 필드 묶음.
 *
 * 두 feature는 같은 레이어라 서로 import할 수 없으므로 공통 부분을 entities로 내렸다.
 * 에러 표시는 여기서 하지 않는다 — 시안이 폼 하단에 한 줄로 모으는 형태라
 * 다이얼로그 쪽에서 처리한다.
 */
export function HoldingFormFields({ form }: { form: UseFormReturn<HoldingFormValues> }) {
  const { register, control, setValue, formState } = form;

  /*
   * 종목은 검색 목록에서만 고른다. 고르는 순간 종목명과 종목코드를 함께 채운다.
   * 한 번 저장을 시도한 뒤라면 바로 다시 검증해, 남아 있던 '종목을 선택해주세요'를 지운다.
   */
  const selectStock = (stock: Stock) => {
    const options = { shouldDirty: true, shouldValidate: formState.isSubmitted };
    setValue('name', stock.name, options);
    setValue('code', stock.code, options);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <div className={LABEL}>
              <span id="holding-name-label">종목명</span>
              <StockSearchCombobox
                value={field.value}
                onSelect={selectStock}
                aria-labelledby="holding-name-label"
                className={cn(FIELD, 'text-foreground font-normal')}
              />
            </div>
          )}
        />

        {/* 종목코드는 종목을 고르면 따라 채워진다. 직접 고치면 이름과 어긋날 수 있어 읽기 전용이다 */}
        <label className={LABEL}>
          종목코드
          <Input
            {...register('code')}
            readOnly
            tabIndex={-1}
            placeholder="자동 입력"
            className={cn(FIELD, 'bg-subtle text-muted-strong cursor-default tabular-nums')}
          />
        </label>
      </div>

      <Controller
        control={control}
        name="sector"
        render={({ field }) => (
          <div className={LABEL}>
            <span id="holding-sector-label">섹터</span>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger
                aria-labelledby="holding-sector-label"
                className={cn(FIELD, 'text-foreground w-full font-normal')}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SECTORS.map((sector) => (
                  <SelectItem key={sector} value={sector}>
                    {sector}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      />

      {/* 현재가 입력은 없다. 시세는 종목코드로 서버에서 가져온다 */}
      <div className="grid grid-cols-2 gap-3">
        <label className={LABEL}>
          보유수량
          <Input
            {...register('quantity')}
            type="number"
            inputMode="numeric"
            placeholder="주"
            className={FIELD}
          />
        </label>

        <label className={LABEL}>
          평단가
          <Input
            {...register('avgPrice')}
            type="number"
            inputMode="numeric"
            placeholder="원"
            className={FIELD}
          />
        </label>
      </div>
    </div>
  );
}
