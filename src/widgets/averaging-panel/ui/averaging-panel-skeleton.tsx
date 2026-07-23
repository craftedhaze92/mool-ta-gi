import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/shared/lib/utils';
import { PANEL, PANEL_RIGHT_COLUMN, PANEL_SPLIT } from '../lib/panel';

/** 결과 행 한 줄 — 라벨(좌) / 값(우) */
function ResultRowSkeleton({ valueWidth }: { valueWidth: string }) {
  return (
    <div className="flex justify-between">
      <Skeleton className="h-4 w-16" />
      <Skeleton className={cn('h-4', valueWidth)} />
    </div>
  );
}

/**
 * 시뮬레이터 로딩 자리.
 *
 * PANEL·PANEL_SPLIT을 실제 패널과 공유하는 게 핵심이다. md~xl 구간에서 패널이
 * 컨테이너 쿼리로 2단 분할되며 높이가 절반 가까이 줄어드는데, 예전처럼 높이를
 * 하드코딩하면 그 구간에서 하이드레이션 때 200px 넘게 튄다.
 */
export function AveragingPanelSkeleton() {
  return (
    <aside className={cn(PANEL, 'gap-[18px]')}>
      {/* 제목 + 종목명·코드 */}
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>

      <div className={PANEL_SPLIT}>
        <div className="flex flex-col gap-[18px]">
          {/* 현재가 / 평단가 / 평단 대비 3칸 스탯 */}
          <div className="bg-subtle grid grid-cols-3 gap-2 rounded-xl px-4 py-3.5">
            {Array.from({ length: 3 }, (_, i) => (
              <span key={i} className="flex flex-col gap-[3px]">
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-4 w-16" />
              </span>
            ))}
          </div>

          {/* 현재가·평단 갭 게이지. 라벨이 위아래로 붙어 실제 여백(mt-8 mb-7)을 흉내낸다 */}
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-24" />
            <div className="mx-1.5 mt-8 mb-7">
              <Skeleton className="h-1.5 rounded-[3px]" />
            </div>
          </div>

          {/* 추가 매수 슬라이더 */}
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-10" />
            </div>
            <Skeleton className="h-1.5 rounded-full" />
          </div>
        </div>

        <div className={PANEL_RIGHT_COLUMN}>
          <div className="flex flex-col gap-2.5 border-t pt-4 @2xl:border-t-0 @2xl:pt-0">
            <ResultRowSkeleton valueWidth="w-28" />
            <ResultRowSkeleton valueWidth="w-24" />
            <ResultRowSkeleton valueWidth="w-32" />
          </div>

          {/* 목표 평단가 역산 — 라벨 / 입력칸 / 안내문 2줄 */}
          <div className="flex flex-col gap-2 border-t pt-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-[42px] rounded-[10px]" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      </div>
    </aside>
  );
}
