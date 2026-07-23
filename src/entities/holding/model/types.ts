/** 보유 종목 한 건. 모든 금액 단위는 원(KRW). */
export interface Holding {
  /** 6자리 종목 코드. 예: '005930' */
  code: string;
  name: string;
  /** 섹터명. 섹터 비중 집계 기준이다. */
  sector: string;
  quantity: number;
  /** 평균 매입 단가 */
  avgPrice: number;
  currentPrice: number;
  /** 전일 종가. '오늘 등락' 계산에 쓴다. */
  prevClose: number;
}

/** Holding에서 파생되는 표시용 지표. 저장하지 않고 매번 계산한다. */
export interface HoldingMetrics {
  /** 매입금액 = quantity × avgPrice */
  costBasis: number;
  /** 평가금액 = quantity × currentPrice */
  marketValue: number;
  /** 평가손익 = marketValue − costBasis */
  profit: number;
  /** 손익률(%) */
  profitRate: number;
  /** 오늘 등락 금액 = quantity × (currentPrice − prevClose) */
  dayChange: number;
  /** 오늘 등락률(%) */
  dayChangeRate: number;
}

export interface PortfolioSummary {
  totalCost: number;
  totalValue: number;
  totalProfit: number;
  totalProfitRate: number;
  totalDayChange: number;
  totalDayChangeRate: number;
}

/** 비중 집계 한 항목. 섹터별·종목별 모두 이 형태를 쓴다. */
export interface AllocationSlice {
  /** 섹터명 또는 종목 코드 */
  key: string;
  label: string;
  /** 평가금액 */
  value: number;
  /** 전체 대비 비중(%) */
  ratio: number;
}

/** 물타기 시뮬레이션 결과 */
export interface AveragingResult {
  /** 추가 매수 후 평단가 */
  newAvgPrice: number;
  /**
   * 평단가 변화율(%). 음수면 평단이 내려간 것(물타기 성공),
   * 양수면 현재가가 평단보다 높아 오히려 평단이 올라간 경우다.
   */
  avgChangeRate: number;
  /** 추가 매수에 필요한 금액 */
  requiredAmount: number;
  /** 본전까지 필요한 상승률(%). 음수면 이미 수익권 */
  breakEvenRate: number;
}
