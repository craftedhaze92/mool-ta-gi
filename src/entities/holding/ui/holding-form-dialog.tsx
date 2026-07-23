'use client';

import { useHoldingForm } from '../model/use-holding-form';
import type { Holding } from '../model/types';
import { HoldingFormFields } from './holding-form-fields';
import { formatQuantity, formatWon } from '@/shared/lib/format-won';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';

/** 시안의 다이얼로그 버튼: 13px, radius 10px */
const ACTION = 'h-auto rounded-[10px] px-4 py-2.5 text-[13px] font-semibold';

interface HoldingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 수정 중인 종목. 없으면 신규 추가 모드 */
  editing?: Holding;
}

/**
 * 종목 추가/수정 다이얼로그.
 *
 * 추가와 수정은 폼·검증·합산 흐름이 전부 같고 제목만 다르다. add-holding과 edit-holding은
 * 같은 레이어라 서로 import할 수 없으므로, 공유하는 이 다이얼로그를 entities로 내렸다.
 * 두 feature는 각자의 진입점(버튼 / 케밥 메뉴)과 열림 상태만 책임진다.
 */
export function HoldingFormDialog({ open, onOpenChange, editing }: HoldingFormDialogProps) {
  const { form, mergePreview, submit, confirmMerge, cancelMerge, errorMessage } = useHoldingForm({
    editing,
    onSaved: () => onOpenChange(false),
  });

  const title = editing ? '종목 수정' : '종목 추가';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4 rounded-[20px] p-7 sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-[17px] font-bold">{title}</DialogTitle>
          <DialogDescription className="sr-only">
            종목명, 종목코드, 섹터, 보유수량, 평단가, 현재가를 입력합니다.
          </DialogDescription>
        </DialogHeader>

        {mergePreview ? (
          <>
            <p className="bg-subtle text-muted-strong rounded-xl px-4 py-3.5 text-[13px] leading-relaxed">
              <strong className="text-foreground font-semibold">{mergePreview.target.name}</strong>
              을(를) 이미 보유 중입니다. 기존 보유분과 합산됩니다 —{' '}
              <strong className="text-foreground font-semibold">
                새 평단가 {formatWon(mergePreview.newAvgPrice)}
              </strong>{' '}
              (총 {formatQuantity(mergePreview.totalQuantity)})
            </p>

            <div className="mt-1 flex justify-end gap-2">
              <Button type="button" variant="outline" className={ACTION} onClick={cancelMerge}>
                취소
              </Button>
              <Button
                type="button"
                className={`${ACTION} bg-brand hover:bg-brand-hover text-white`}
                onClick={confirmMerge}
              >
                합산하기
              </Button>
            </div>
          </>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
            <HoldingFormFields form={form} />

            {errorMessage && (
              <span role="alert" className="text-destructive text-[12.5px] font-semibold">
                {errorMessage}
              </span>
            )}

            <div className="mt-1 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className={ACTION}
                onClick={() => onOpenChange(false)}
              >
                취소
              </Button>
              <Button
                type="submit"
                className={`${ACTION} bg-brand hover:bg-brand-hover text-white`}
              >
                저장
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
