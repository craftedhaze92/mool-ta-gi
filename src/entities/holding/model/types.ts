/** 선택 가능한 섹터. 폼 select의 옵션이자 섹터 비중 집계의 분류축이다. */
export const SECTORS = ['반도체', '인터넷', '자동차', '금융', '바이오', '2차전지', '기타'] as const;

export type Sector = (typeof SECTORS)[number];

/** 종목코드 미입력을 나타내는 자리 표시자. 이 값끼리는 중복 판정하지 않는다. */
export const NO_CODE = '—';

/** 보유 종목 한 건. 모든 금액 단위는 원(KRW). */
export interface Holding {
  /**
   * 안정 식별자. 종목코드는 미입력('—')일 수 있어 식별자로 쓸 수 없으므로
   * 별도로 둔다. 선택 상태·수정·삭제가 모두 이 값을 기준으로 동작한다.
   */
  id: string;
  /** 6자리 종목 코드. 예: '005930'. 미입력이면 NO_CODE */
  code: string;
  name: string;
  /** 섹터명. 섹터 비중 집계 기준이다. */
  sector: Sector;
  quantity: number;
  /** 평균 매입 단가 */
  avgPrice: number;
  /**
   * 현재가.
   *
   * 다음 단계에서 React-Query 서버 상태(시세 API)로 분리할 필드다.
   * 그때까지는 사용자가 폼에 직접 입력한 값을 들고 있는다.
   */
  currentPrice: number;
  /** 전일 종가. '오늘 등락' 계산에 쓴다. */
  prevClose: number;
}

/**
 * 폼에서 넘어오는 입력값.
 * id는 스토어가 발급하고, prevClose는 스토어가 채운다
 * (신규는 currentPrice와 동일, 수정은 기존값 유지).
 */
export type HoldingInput = Omit<Holding, 'id' | 'prevClose'>;

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
