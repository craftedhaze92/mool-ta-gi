'use client';

import { useHoldingsStore, type Holding } from '@/entities/holding';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';

interface DeleteHoldingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  holding: Holding;
}

/** 삭제 확인. 확정하면 스토어가 삭제와 선택 보정을 함께 처리한다. */
export function DeleteHoldingDialog({ open, onOpenChange, holding }: DeleteHoldingDialogProps) {
  const removeHolding = useHoldingsStore((s) => s.removeHolding);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="gap-3.5 rounded-[20px] p-5 sm:max-w-[340px] sm:p-7">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[17px] font-bold">종목 삭제</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-strong text-[13.5px] leading-relaxed">
            <strong className="text-foreground font-bold">{holding.name}</strong> 종목을 목록에서
            삭제할까요? 이 작업은 되돌릴 수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-1 gap-2">
          <AlertDialogCancel className="h-auto rounded-[10px] px-4 py-2.5 text-[13px] font-semibold">
            취소
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => removeHolding(holding.id)}
            className="bg-destructive h-auto rounded-[10px] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#d63340]"
          >
            삭제
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
