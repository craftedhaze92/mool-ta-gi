import { Skeleton } from '@/shared/ui/skeleton';

/** seed 종목 수와 맞춘다. */
const ROW_COUNT = 4;

/**
 * 종목별 비중 막대 로딩 자리.
 * 실제 목록과 같은 3칸 그리드(종목명 / 막대 / 비중)를 쓴다.
 */
export function HoldingAllocationSkeleton() {
  return (
    <section className="bg-card rounded-2xl px-4 py-4 md:px-6 md:py-5">
      <Skeleton className="mb-4 h-5 w-24" />

      <ul className="flex flex-col gap-[11px]">
        {Array.from({ length: ROW_COUNT }, (_, i) => (
          <li
            key={i}
            className="grid grid-cols-[64px_1fr_40px] items-center gap-2 sm:grid-cols-[76px_1fr_44px] sm:gap-2.5"
          >
            <Skeleton className="h-3.5" />
            {/* 막대는 트랙 위에 얹히므로 실제와 같은 h-2 */}
            <Skeleton className="h-2 rounded" />
            <Skeleton className="h-3.5" />
          </li>
        ))}
      </ul>
    </section>
  );
}
