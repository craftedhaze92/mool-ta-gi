'use client';

import { useHoldingsHydrated } from '@/entities/holding';
import { AveragingPanel } from '@/widgets/averaging-panel';
import { HoldingAllocation } from '@/widgets/holding-allocation';
import { HoldingsTable } from '@/widgets/holdings-table';
import { MarketHeader } from '@/widgets/market-header';
import { PortfolioSummary } from '@/widgets/portfolio-summary';
import { SectorChart } from '@/widgets/sector-chart';

/**
 * localStorage 복원 전에 보여줄 자리. 실제 위젯과 같은 골격이라 복원 후 레이아웃이 튀지 않는다.
 * 수치를 그리지 않으므로 서버 HTML과 클라이언트 첫 렌더가 항상 일치한다.
 */
function DashboardSkeleton() {
  return (
    <>
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="bg-card h-[108px] rounded-2xl" />
        ))}
      </div>

      <div className="grid grid-cols-[1fr_372px] items-start gap-4">
        <div className="flex flex-col gap-4">
          <div className="bg-card h-[340px] rounded-2xl" />
          <div className="grid grid-cols-[1fr_1.2fr] gap-4">
            <div className="bg-card h-[236px] rounded-2xl" />
            <div className="bg-card h-[236px] rounded-2xl" />
          </div>
        </div>
        <div className="bg-card h-[560px] rounded-2xl" />
      </div>
    </>
  );
}

export function DashboardPage() {
  // 보유 종목은 localStorage에 있다. 복원 전에는 seed 상태라 화면에 그리면 안 된다.
  const hydrated = useHoldingsHydrated();

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-10 pb-10">
      <MarketHeader />

      {hydrated ? (
        <>
          <PortfolioSummary />

          <div className="grid grid-cols-[1fr_372px] items-start gap-4">
            <div className="flex flex-col gap-4">
              <HoldingsTable />

              <div className="grid grid-cols-[1fr_1.2fr] gap-4">
                <SectorChart />
                <HoldingAllocation />
              </div>
            </div>

            <AveragingPanel />
          </div>
        </>
      ) : (
        <DashboardSkeleton />
      )}
    </div>
  );
}
