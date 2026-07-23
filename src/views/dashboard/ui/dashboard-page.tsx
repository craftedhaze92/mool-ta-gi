'use client';

import { useHoldingsHydrated } from '@/entities/holding';
import { AveragingPanel, AveragingPanelSkeleton } from '@/widgets/averaging-panel';
import { HoldingAllocation, HoldingAllocationSkeleton } from '@/widgets/holding-allocation';
import { HoldingsTable, HoldingsTableSkeleton } from '@/widgets/holdings-table';
import { MarketHeader } from '@/widgets/market-header';
import { PortfolioSummary, PortfolioSummarySkeleton } from '@/widgets/portfolio-summary';
import { SectorChart, SectorChartSkeleton } from '@/widgets/sector-chart';

/**
 * 본문 3덩어리(테이블 / 시뮬레이터 / 차트)의 배치.
 *
 * DOM 순서는 테이블 → 시뮬레이터 → 차트다. 모바일 스택 순서가 그대로 이 순서라야
 * 핵심 기능인 시뮬레이터가 차트 뒤로 밀리지 않는다. xl부터는 명시적 배치로
 * 시뮬레이터만 우측 열로 보내고 좌측 열에 테이블·차트를 세로로 쌓는다.
 */
const BODY_GRID = 'flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1fr)_372px] xl:items-start';

/**
 * localStorage 복원 전에 보여줄 자리.
 *
 * 이 화면은 잠깐 스치는 게 아니다. persist가 skipHydration이라 서버는 항상 게이트가
 * 닫힌 상태로 HTML을 만들고, JS 하이드레이션이 끝날 때까지 이게 계속 보인다.
 * 느린 회선에서는 몇 초씩 이어지므로 '로딩 중'으로 읽히게 만들어야 한다.
 *
 * 배치는 실제 렌더와 같은 BODY_GRID·배치 클래스를 그대로 쓴다. 위젯 스켈레톤들도
 * 각자 실제 위젯의 컨테이너 클래스를 공유하므로, 높이를 하드코딩하지 않아도
 * 반응형 높이가 따라오고 복원 순간 레이아웃이 튀지 않는다.
 *
 * 수치는 물론 실제 문구도 그리지 않으므로 서버 HTML과 클라이언트 첫 렌더가 항상 일치한다.
 */
function DashboardSkeleton() {
  return (
    /*
     * 바깥이 flex flex-col gap-4라 래퍼가 하나 끼면 간격이 어긋난다.
     * display:contents로 래퍼를 레이아웃에서 지우고 role만 남긴다.
     */
    <div role="status" aria-busy="true" className="contents">
      <span className="sr-only">불러오는 중</span>

      <PortfolioSummarySkeleton />

      <div className={BODY_GRID}>
        <div className="xl:col-start-1 xl:row-start-1">
          <HoldingsTableSkeleton />
        </div>

        <div className="xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:self-stretch">
          <AveragingPanelSkeleton />
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_1.2fr] xl:col-start-1 xl:row-start-2">
          <SectorChartSkeleton />
          <HoldingAllocationSkeleton />
        </div>
      </div>
    </div>
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
