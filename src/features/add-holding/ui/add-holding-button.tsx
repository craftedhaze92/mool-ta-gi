'use client';

import { useState } from 'react';
import { HoldingFormDialog } from '@/entities/holding';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';

interface AddHoldingButtonProps {
  /**
   * 'header'는 카드 헤더의 작은 버튼, 'cta'는 빈 상태 한가운데의 큰 버튼이다.
   * 색과 동작은 같고 크기·문구만 다르다.
   */
  variant?: 'header' | 'cta';
}

/**
 * 종목 추가 진입점. 트리거 버튼과 다이얼로그를 한 덩어리로 내보낸다.
 * 다이얼로그 본체는 수정과 공유하므로 entities/holding에 있다.
 */
export function AddHoldingButton({ variant = 'header' }: AddHoldingButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'bg-brand hover:bg-brand-hover h-auto rounded-lg text-white',
          variant === 'header'
            ? 'px-3.5 py-2 text-[12.5px] font-semibold'
            : 'px-5 py-2.5 text-sm font-semibold',
        )}
      >
        {variant === 'header' ? '＋ 종목 추가' : '첫 종목 추가하기'}
      </Button>

      {/* 열 때마다 새로 마운트해야 지난번 입력이 남지 않는다 */}
      {open && <HoldingFormDialog open onOpenChange={setOpen} />}
    </>
  );
}
