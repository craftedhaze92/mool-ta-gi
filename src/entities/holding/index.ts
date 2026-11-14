export type {
  AllocationSlice,
  AveragingResult,
  Holding,
  HoldingInput,
  HoldingMetrics,
  PortfolioSummary,
  PriceMap,
  PriceSnapshot,
  SimulationInput,
  SimulationResult,
  SimulationScenario,
} from './model/types';

export {
  calcAveraging,
  calcCostBasis,
  calcHoldingAllocation,
  calcHoldingMetrics,
  calcPortfolioSummary,
  calcPriceGapRate,
  calcQuantityForTargetAverage,
  calcSectorAllocation,
  calcWeightedAverage,
  pickNextSelectedId,
} from './model/calc';

export { useHoldingsHydrated, useHoldingsStore, useSelectedHolding } from './model/holdings-store';

export type { MergePreview } from './model/use-holding-form';
export { useHoldingForm } from './model/use-holding-form';

export { HoldingFormDialog } from './ui/holding-form-dialog';

export { calcSimulation } from './model/simulation';
