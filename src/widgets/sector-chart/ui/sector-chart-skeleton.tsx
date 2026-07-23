import { Skeleton } from '@/shared/ui/skeleton';

/**
 * 섹터 도넛 로딩 자리.
 *
 * 실제 차트와 같은 @container / @min-[300px] 전환을 쓴다. 카드 안쪽이 300px 미만이면
 * 도넛과 범례가 위아래로 쌓이는데, 스켈레톤도 같이 접혀야 높이가 맞는다.
 */
export function SectorChartSkeleton() {
  return (
    <section className="bg-card @container rounded-2xl px-4 py-4 md:px-6 md:py-5">
      <Skeleton className="mb-3.5 h-5 w-24" />

      <div className="flex flex-col items-center gap-4 @min-[300px]:flex-row @min-[300px]:gap-[22px]">
        {/* 도넛. 가운데가 뚫린 형태라 원 안에 카드색 원을 겹쳐 링으로 만든다 */}
        <div className="relative size-[140px] shrink-0 @min-[300px]:size-[164px]">
          <Skeleton className="size-full rounded-full" />
          <div className="bg-card absolute inset-[27%] rounded-full" />
        </div>

        {/* 범례 3줄 — 색 스와치 / 섹터명 / 비중 */}
        <ul className="grid w-full min-w-0 grid-cols-2 gap-x-4 gap-y-2 @min-[300px]:flex @min-[300px]:flex-1 @min-[300px]:flex-col @min-[300px]:gap-2.5">
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i} className="flex items-center gap-2">
              <Skeleton className="size-2.5 rounded-[3px]" />
              <Skeleton className="h-3.5 flex-1" />
              <Skeleton className="h-3.5 w-10" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
