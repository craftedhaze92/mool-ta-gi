import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

/** 현재가·평단가·평단 대비 3칸 스탯의 한 칸. 실제 패널과 빈 상태 미리보기가 함께 쓴다 */
export function StatCell({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <span className="flex flex-col gap-[3px]">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('text-sm font-bold', tone)}>{value}</span>
    </span>
  );
}

/** 결과 한 줄 — 라벨(좌) / 값(우) */
export function ResultRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right font-bold">{children}</span>
    </div>
  );
}
