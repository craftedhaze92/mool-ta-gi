import { describe, expect, it } from 'vitest';
import { isMarketOpen, MARKET_CLOSE_MINUTES, MARKET_OPEN_MINUTES } from './market-hours';

/**
 * 입력을 전부 UTC 순간(Z)으로 준다. 실행 환경의 타임존과 무관하게 같은 결과가 나와야
 * 하고, 그게 이 함수가 보장하려는 성질이다. KST = UTC + 9h.
 */
const at = (utc: string) => new Date(utc);

describe('isMarketOpen', () => {
  it('개장 시각 09:00은 장중으로 본다', () => {
    expect(isMarketOpen(at('2026-07-23T00:00:00Z'))).toBe(true); // 목 09:00:00
  });

  it('개장 1초 전은 장 마감이다', () => {
    expect(isMarketOpen(at('2026-07-22T23:59:59Z'))).toBe(false); // 목 08:59:59
  });

  it('마감 시각 15:30은 장 마감으로 본다', () => {
    expect(isMarketOpen(at('2026-07-23T06:30:00Z'))).toBe(false); // 목 15:30:00
  });

  it('마감 1초 전은 아직 장중이다', () => {
    expect(isMarketOpen(at('2026-07-23T06:29:59Z'))).toBe(true); // 목 15:29:59
  });

  it('평일 장중 시간대는 장중이다', () => {
    expect(isMarketOpen(at('2026-07-23T03:00:00Z'))).toBe(true); // 목 12:00
    expect(isMarketOpen(at('2026-07-27T00:30:00Z'))).toBe(true); // 월 09:30
  });

  it('주말은 장 시간대여도 휴장이다', () => {
    expect(isMarketOpen(at('2026-07-25T02:00:00Z'))).toBe(false); // 토 11:00
    expect(isMarketOpen(at('2026-07-26T02:00:00Z'))).toBe(false); // 일 11:00
  });

  it('KST 자정은 장 마감이다', () => {
    expect(isMarketOpen(at('2026-07-22T15:00:00Z'))).toBe(false); // 목 00:00
  });

  it('UTC 날짜 경계에서 KST 요일이 넘어가는 경우도 요일로 판정한다', () => {
    // UTC 금 15:00 → KST 토 00:00. UTC 기준으로는 평일이지만 KST로는 주말이다.
    expect(isMarketOpen(at('2026-07-24T15:00:00Z'))).toBe(false);
    // UTC 일 23:30 → KST 월 08:30. UTC 기준으로는 주말이지만 KST로는 평일 개장 전이다.
    expect(isMarketOpen(at('2026-07-26T23:30:00Z'))).toBe(false);
    // UTC 일 23:59:59 + 1초 → KST 월 09:00. 개장.
    expect(isMarketOpen(at('2026-07-27T00:00:00Z'))).toBe(true);
  });

  it.todo('공휴일을 휴장으로 판정한다 (휴장일 캘린더 도입 후)');
});

describe('장 시간 상수', () => {
  it('09:00 ~ 15:30을 분 단위로 표현한다', () => {
    expect(MARKET_OPEN_MINUTES).toBe(540);
    expect(MARKET_CLOSE_MINUTES).toBe(930);
  });
});
