import { Skeleton } from '@/shared/ui/skeleton';

/**
 * 요약 카드 로딩 자리.
 *
 * 실제 카드(portfolio-summary.tsx)와 같은 컨테이너 클래스를 쓴다. 높이를 따로
 * 지정하지 않아야 반응형 여백이 그대로 따라오고 하이드레이션 때 레이아웃이 튀지 않는다.
 */
function SummaryCardSkeleton() {
  return (
    <div className="bg-card flex flex-col gap-1.5 rounded-2xl px-4 py-4 lg:gap-2 lg:px-[22px] lg:py-5">
      {/* 라벨(12~13px) */}
      <Skeleton className="h-3.5 w-16" />
      {/* 금액(20~24px). 실제 텍스트 줄높이만큼 잡아 카드 높이를 맞춘다 */}
      <Skeleton className="h-7 w-32 xl:h-8" />
      {/* 손익률 보조 줄 — 4장 중 2장에만 있지만 그리드가 높이를 맞추므로 모두 그린다 */}
      <Skeleton className="h-3.5 w-12" />
    </div>
  );
}

export function PortfolioSummarySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {Array.from({ length: 4 }, (_, i) => (
        <SummaryCardSkeleton key={i} />
      ))}
    </div>
  );
}
