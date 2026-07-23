'use client';

import { Controller, type UseFormReturn } from 'react-hook-form';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { cn } from '@/shared/lib/utils';
import type { HoldingFormValues } from '../model/holding-form-schema';
import { SECTORS } from '../model/types';

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
  const { register, control } = form;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={LABEL}>
          종목명
          <Input {...register('name')} placeholder="예: 삼성전자" className={FIELD} />
        </label>

        <label className={LABEL}>
          종목코드
          <Input
            {...register('code')}
            placeholder="예: 005930"
            inputMode="numeric"
            maxLength={6}
            className={FIELD}
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

      <div className="grid grid-cols-3 gap-3">
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

        <label className={LABEL}>
          현재가
          <Input
            {...register('currentPrice')}
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
