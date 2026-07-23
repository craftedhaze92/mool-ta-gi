/** 시장 지수 한 건 (KOSPI, KOSDAQ 등) */
export interface MarketIndex {
  name: string;
  /** 지수 값 */
  value: number;
  /** 전일 대비 변화량 */
  change: number;
  /** 전일 대비 변화율(%) */
  changeRate: number;
}
