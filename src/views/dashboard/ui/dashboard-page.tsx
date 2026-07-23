'use client';

import { useHoldingsHydrated } from '@/entities/holding';
import { AveragingPanel } from '@/widgets/averaging-panel';
import { HoldingAllocation } from '@/widgets/holding-allocation';
import { HoldingsTable } from '@/widgets/holdings-table';
import { MarketHeader } from '@/widgets/market-header';
import { PortfolioSummary } from '@/widgets/portfolio-summary';
import { SectorChart } from '@/widgets/sector-chart';

/**
 * 본문 3덩어리(테이블 / 시뮬레이터 / 차트)의 배치.
 *
 * DOM 순서는 테이블 → 시뮬레이터 → 차트다. 모바일 스택 순서가 그대로 이 순서라야
 * 핵심 기능인 시뮬레이터가 차트 뒤로 밀리지 않는다. xl부터는 명시적 배치로
 * 시뮬레이터만 우측 열로 보내고 좌측 열에 테이블·차트를 세로로 쌓는다.
 */
const BODY_GRID = 'flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1fr)_372px] xl:items-start';

/**
 * localStorage 복원 전에 보여줄 자리. 실제 위젯과 같은 골격이라 복원 후 레이아웃이 튀지 않는다.
 * 수치를 그리지 않으므로 서버 HTML과 클라이언트 첫 렌더가 항상 일치한다.
 */
function DashboardSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="bg-card h-[96px] rounded-2xl lg:h-[108px]" />
        ))}
      </div>

      <div className={BODY_GRID}>
        <div className="bg-card h-[420px] rounded-2xl md:h-[340px] xl:col-start-1 xl:row-start-1" />
        <div className="bg-card h-[560px] rounded-2xl xl:col-start-2 xl:row-span-2 xl:row-start-1" />
        <div className="grid gap-4 md:grid-cols-[1fr_1.2fr] xl:col-start-1 xl:row-start-2">
          <div className="bg-card h-[236px] rounded-2xl" />
          <div className="bg-card h-[236px] rounded-2xl" />
        </div>
      </div>
    </>
  );
}

export function DashboardPage() {
  // 보유 종목은 localStorage에 있다. 복원 전에는 seed 상태라 화면에 그리면 안 된다.
  const hydrated = useHoldingsHydrated();

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 pb-8 sm:px-6 xl:gap-5 xl:px-10 xl:pb-10">
      <MarketHeader />

      {hydrated ? (
        <>
          <PortfolioSummary />

          <div className={BODY_GRID}>
            <div className="xl:col-start-1 xl:row-start-1">
              <HoldingsTable />
            </div>

            {/* self-stretch가 있어야 row-span 안에서 내부 aside의 sticky가 움직일 공간을 얻는다 */}
            <div className="xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:self-stretch">
              <AveragingPanel />
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_1.2fr] xl:col-start-1 xl:row-start-2">
              <SectorChart />
              <HoldingAllocation />
            </div>
          </div>
        </>
      ) : (
        <DashboardSkeleton />
      )}
    </div>
  );
}
