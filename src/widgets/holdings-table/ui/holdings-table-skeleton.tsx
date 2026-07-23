import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/shared/lib/utils';
import { CELL_RESET, GRID, ROW_PADDING } from '../lib/grid';

/** seed 종목 수와 맞춘다. 복원 후 행이 늘거나 줄어드는 폭을 최소로 두기 위해서다. */
const ROW_COUNT = 4;

/**
 * 한 행. 실제 HoldingRow와 같은 GRID·배치 클래스를 써서 md 미만에서는 2열 3행 카드로,
 * md 이상에서는 6칸 그리드로 똑같이 접힌다.
 */
function RowSkeleton() {
  return (
    <div className={cn(GRID, ROW_PADDING, 'items-center')}>
      {/* 종목명 + 종목코드 2줄. 실제 line-height(20px + 17.25px)에 맞춰 행 높이를 맞춘다 */}
      <span className={cn('col-start-1 row-start-1 flex flex-col gap-1', CELL_RESET)}>
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-3 w-12" />
      </span>

      {/* 보유수량 */}
      <span className={cn('col-start-1 row-start-3 md:flex md:justify-end', CELL_RESET)}>
        <Skeleton className="h-4 w-10" />
      </span>

      {/* 평단가 */}
      <span className={cn('col-start-1 row-start-2 md:flex md:justify-end', CELL_RESET)}>
        <Skeleton className="h-4 w-20" />
      </span>

      {/* 현재가 */}
      <span className={cn('col-start-2 row-start-1 flex justify-end', CELL_RESET)}>
        <Skeleton className="h-4 w-20" />
      </span>

      {/* 평가손익 — 손익률 / 손익액 2줄 */}
      <span className={cn('col-start-2 row-start-2 flex flex-col items-end gap-1', CELL_RESET)}>
        <Skeleton className="h-5 w-14" />
        <Skeleton className="h-3 w-16" />
      </span>

      {/* 액션 — 물타기 계산 버튼 + 케밥 */}
      <span
        className={cn(
          'col-start-2 row-start-3 flex items-center justify-end gap-1.5 pt-1 md:pt-0',
          CELL_RESET,
        )}
      >
        <Skeleton className="h-9 w-[74px] rounded-lg md:h-[30px]" />
        <Skeleton className="size-10 rounded-lg md:size-8" />
      </span>
    </div>
  );
}

export function HoldingsTableSkeleton() {
  return (
    <section className="bg-card rounded-2xl pt-2 pb-3">
      {/* 섹션 헤더: 제목 자리 + 종목 추가 버튼 자리 */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 md:px-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-9 w-[92px] rounded-lg" />
      </div>

      {/* 헤더 행 — 실제와 같이 md 이상에서만 보인다 */}
      <div className={cn(GRID, 'hidden border-b px-6 py-2 md:grid')}>
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className={cn('h-3 w-12', i > 0 && 'justify-self-end')} />
        ))}
        <span />
      </div>

      <div>
        {Array.from({ length: ROW_COUNT }, (_, i) => (
          <RowSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}
