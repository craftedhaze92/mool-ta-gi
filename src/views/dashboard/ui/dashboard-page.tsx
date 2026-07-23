import { AveragingPanel } from '@/widgets/averaging-panel';
import { HoldingAllocation } from '@/widgets/holding-allocation';
import { HoldingsTable } from '@/widgets/holdings-table';
import { MarketHeader } from '@/widgets/market-header';
import { PortfolioSummary } from '@/widgets/portfolio-summary';
import { SectorChart } from '@/widgets/sector-chart';

export function DashboardPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-10 pb-10">
      <MarketHeader />
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
    </div>
  );
}
