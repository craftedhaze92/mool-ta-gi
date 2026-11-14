/**
 * 보유 종목 한 건. 모든 금액 단위는 원(KRW).
 *
 * 시세(현재가·전일종가)는 여기 없다. 그건 서버에서 오는 값이라 React-Query가 들고 있고,
 * 이 타입은 사용자가 직접 입력해 localStorage에 남기는 것만 담는다. 두 상태는 수명이
 * 다르다 — 보유 내역은 내가 팔기 전까지 그대로고, 시세는 몇 초 만에 낡는다.
 */
export interface Holding {
  /**
   * 안정 식별자.
   *
   * 종목코드가 필수가 된 뒤에도 id를 따로 두는 이유는 코드가 바뀔 수 있기 때문이다
   * (수정 폼에서 오타를 고치는 경우). 선택 상태·수정·삭제는 이 값을 기준으로 동작한다.
   */
  id: string;
  /** 6자리 종목 코드. 예: '005930'. 시세 조회 키라서 필수다 */
  code: string;
  name: string;
  /**
   * KRX 업종명. 예: '전기·전자', '금융', 'ETF'. 섹터 비중 집계 기준이다.
   *
   * 사용자가 고르지 않는다. 종목을 검색해 고를 때 종목 마스터에서 따라오고, 마스터가
   * 갱신되면 섹터 동기화(features/sync-holding-sectors)가 저장값을 맞춰 준다.
   * 업종이 정해지지 않은 종목은 '기타'다.
   */
  sector: string;
  quantity: number;
  /** 평균 매입 단가 */
  avgPrice: number;
}

/** 폼에서 넘어오는 입력값. id는 스토어가 발급한다. */
export type HoldingInput = Omit<Holding, 'id'>;

/**
 * 시세 한 종목분.
 *
 * entities/quote의 Quote가 이 타입을 **구조적으로** 만족한다. 이름이 아니라 형태로 맞추는
 * 이유는 FSD 규칙상 동일 레이어 슬라이스끼리 import할 수 없기 때문이다. 덕분에
 * entities/holding은 시세가 어디서 오는지 전혀 모른 채 계산만 한다.
 */
export interface PriceSnapshot {
  current: number;
  prevClose: number;
}

/**
 * 종목코드 → 시세.
 *
 * 시세를 못 받은 코드는 키가 없다. tsconfig에 noUncheckedIndexedAccess가 없으므로
 * 값 타입에 undefined를 명시해, 조회 결과를 그냥 쓰지 못하게 한다.
 */
export type PriceMap = Readonly<Record<string, PriceSnapshot | undefined>>;

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

/**
 * 포트폴리오 합계.
 *
 * 시세를 일부만 받았을 때를 위해 '전 종목 기준'과 '시세를 받은 종목 기준'을 나눠 담는다.
 * 손익을 totalCost가 아니라 pricedCost로 나누는 것이 핵심이다. 그러지 않으면 시세를 못
 * 받은 종목의 매입금액이 평가금액에는 없는 채 분모에만 남아, 멀쩡한 포트폴리오가 큰 손실로
 * 둔갑한다.
 */
export interface PortfolioSummary {
  /** 전 종목 매입금액. 시세와 무관하므로 항상 실값이다 */
  totalCost: number;
  /** 시세를 받은 종목만의 매입금액. 손익 계산의 기준액이다 */
  pricedCost: number;
  /** 시세를 받은 종목만의 평가금액 */
  totalValue: number;
  /** totalValue − pricedCost */
  totalProfit: number;
  totalProfitRate: number;
  totalDayChange: number;
  totalDayChangeRate: number;
  /** 시세가 반영된 종목 수. 0이면 평가 관련 값을 화면에 그리면 안 된다 */
  pricedCount: number;
  /** 시세를 못 받은 종목코드 */
  missingCodes: string[];
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
