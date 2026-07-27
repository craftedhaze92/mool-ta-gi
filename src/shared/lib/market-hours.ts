import { kst } from './dayjs';

/** 정규장 개장 시각(09:00)을 자정 기준 분으로 표현한 값 */
export const MARKET_OPEN_MINUTES = 9 * 60;
/** 정규장 마감 시각(15:30)을 자정 기준 분으로 표현한 값 */
export const MARKET_CLOSE_MINUTES = 15 * 60 + 30;

/**
 * KST 기준으로 국내 정규장이 열려 있는 순간인지 판정한다.
 *
 * 09:00은 포함하고 15:30은 제외한다. 15:30은 장이 '끝난' 시각이므로 그 순간부터
 * 마감으로 본다. 주말은 무조건 휴장이다.
 *
 * 인자에 기본값을 두지 않는다. 호출부마다 '어느 순간을 기준으로 판정하는가'를 명시하게
 * 만들어, 렌더 도중에 new Date()를 부르는 실수를 눈에 띄게 하기 위해서다. 장중 여부를
 * 렌더 출력에 그대로 쓰면 서버와 클라이언트가 서로 다른 순간을 계산해 hydration
 * mismatch가 난다 (use-market-open.ts 참고).
 *
 * TODO: 공휴일 휴장은 아직 반영하지 않는다. 신정·설·추석·임시공휴일·근로자의 날에도
 *       true를 낸다. KRX 휴장일 캘린더나 KIS 휴장일 조회 API를 붙이면 이 함수 한 곳만
 *       고치면 된다.
 */
export function isMarketOpen(at: Date): boolean {
  const at9 = kst(at);

  const day = at9.day();
  if (day === 0 || day === 6) return false;

  const minutes = at9.hour() * 60 + at9.minute();
  return minutes >= MARKET_OPEN_MINUTES && minutes < MARKET_CLOSE_MINUTES;
}
