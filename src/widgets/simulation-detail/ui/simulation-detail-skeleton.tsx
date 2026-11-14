import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/shared/lib/utils';
import { DETAIL_CARD } from '../lib/card';

/** 표 한 개 자리: 캡션 + 헤더 + 행들 */
function TableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-3 w-full" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-5 w-full" />
      ))}
    </div>
  );
}

/** 추가 매수 상세 로딩 자리. 표 배치(@2xl에서 좌우)는 SimulationComparison과 같다 */
export function SimulationDetailSkeleton({ className }: { className?: string }) {
  return (
    <section className={cn(DETAIL_CARD, className)}>
      <Skeleton className="mb-4 h-5 w-36" />
      <div className="@container">
        <div className="grid gap-6 @2xl:grid-cols-2 @2xl:gap-8">
          <TableSkeleton rows={5} />
          <TableSkeleton rows={3} />
        </div>
      </div>
    </section>
  );
}
