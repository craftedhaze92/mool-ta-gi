'use client';

import { useHoldingsHydrated, useHoldingsStore } from '@/entities/holding';
import { useHoldingQuotes } from '@/features/holding-quotes';
import { useSyncHoldingSectors } from '@/features/sync-holding-sectors';
import { useMarketOpen } from '@/shared/lib/use-market-open';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { AveragingPanel, AveragingPanelSkeleton } from '@/widgets/averaging-panel';
import { HoldingAllocation, HoldingAllocationSkeleton } from '@/widgets/holding-allocation';
import { HoldingsTable, HoldingsTableSkeleton } from '@/widgets/holdings-table';
import { MarketHeader } from '@/widgets/market-header';
import { PortfolioSummary, PortfolioSummarySkeleton } from '@/widgets/portfolio-summary';
import { SectorChart, SectorChartSkeleton } from '@/widgets/sector-chart';
import { SimulationDetail, SimulationDetailSkeleton } from '@/widgets/simulation-detail';

/**
 * 본문 4덩어리(테이블 / 시뮬레이터 / 추가 매수 상세 / 차트)의 배치.
 *
 * DOM 순서는 테이블 → 시뮬레이터 → 상세 → 차트다. 모바일 스택 순서가 그대로 이 순서라야
 * 핵심 기능인 시뮬레이터가 차트 뒤로 밀리지 않고, 상세가 시뮬레이터 바로 아래 붙는다.
 * xl부터는 명시적 배치로 시뮬레이터만 우측 열로 보내고 좌측 열에 테이블 → 차트 → 상세를
 * 세로로 쌓는다. 상세를 좌측 맨 아래에 두는 이유는 시뮬레이터가 좌측 열보다 길어 생기는
 * 빈자리를 메우기 위해서다.
 */
const BODY_GRID =
  'flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1fr)_372px] xl:grid-rows-[min-content_min-content_1fr] xl:items-start';

/** 좌측 열 각 칸의 xl 배치. 실제 화면과 스켈레톤이 공유한다 */
const SLOT = {
  table: 'xl:col-start-1 xl:row-start-1',
  // self-stretch가 있어야 row-span 안에서 내부 aside의 sticky가 움직일 공간을 얻는다
  panel: 'xl:col-start-2 xl:row-span-3 xl:row-start-1 xl:self-stretch',
  detail: 'xl:col-start-1 xl:row-start-3',
  charts: 'grid gap-4 md:grid-cols-[1fr_1.2fr] xl:col-start-1 xl:row-start-2',
  /*
   * 보유 종목이 없으면 상세 카드가 그려지지 않아 3행이 빈다. 그때는 차트가 2·3행을 함께
   * 차지하고 늘어나, 차트 카드 하단이 우측 시뮬레이터 하단과 맞는다.
   */
  chartsFill: 'xl:row-span-2 xl:self-stretch',
};

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
        <div className={SLOT.table}>
          <HoldingsTableSkeleton />
        </div>

        <div className={SLOT.panel}>
          <AveragingPanelSkeleton />
        </div>

        <SimulationDetailSkeleton className={SLOT.detail} />

        <div className={SLOT.charts}>
          <SectorChartSkeleton />
          <HoldingAllocationSkeleton />
        </div>
      </div>
    </div>
  );
}

/**
 * 시세를 통째로 못 받았을 때.
 *
 * 목데이터로 폴백하지 않는다. 잘못된 시세는 없는 시세보다 나쁘다 — 사용자가 그 숫자를
 * 믿고 실제로 매매할 수 있기 때문이다.
 */
function QuoteErrorBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="border-hairline flex items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3"
    >
      <span className="text-[13px] font-medium">시세를 불러오지 못했습니다</span>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        다시 시도
      </Button>
    </div>
  );
}

export function DashboardPage() {
  // 보유 종목은 localStorage에 있다. 복원 전에는 seed 상태라 화면에 그리면 안 된다.
  const hydrated = useHoldingsHydrated();
  /*
   * 시세 로딩은 하이드레이션 게이트와 별개의 축이다. 게이트가 열리면 시세가 아직
   * 안 왔어도 위젯을 그린다 — 종목명·수량·평단가는 이미 알고 있으니 즉시 보여주고,
   * 시세에 기대는 값만 각 위젯이 스켈레톤으로 가린다.
   */
  const { status, fetchedAt, refetch } = useHoldingQuotes();
  const marketOpen = useMarketOpen();
  // 저장된 섹터를 KRX 업종에 맞춘다. 화면을 막지 않는 보정 작업이다
  useSyncHoldingSectors();
  const isEmpty = useHoldingsStore((state) => state.holdings.length === 0);

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 pb-8 sm:px-6 xl:gap-5 xl:px-10 xl:pb-10">
      <MarketHeader
        fetchedAt={fetchedAt}
        marketOpen={marketOpen}
        quoteFailed={status === 'error'}
        onRetry={refetch}
      />

      {hydrated ? (
        <>
          {status === 'error' && <QuoteErrorBanner onRetry={refetch} />}

          <PortfolioSummary />

          <div className={BODY_GRID}>
            <div className={SLOT.table}>
              <HoldingsTable />
            </div>

            <div className={SLOT.panel}>
              <AveragingPanel />
            </div>

            <SimulationDetail className={SLOT.detail} />

            <div className={cn(SLOT.charts, isEmpty && SLOT.chartsFill)}>
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
