import { describe, expect, it } from 'vitest';
import { formatKstDate, formatKstDateTime, formatKstTime, kst, KST } from './dayjs';

/**
 * 입력을 전부 UTC 순간(Z)으로 주므로, 이 테스트는 실행 환경의 타임존과 무관하게
 * 같은 결과를 낸다. 그게 이 모듈이 보장하려는 성질이기도 하다.
 */
const MORNING_UTC = '2026-07-23T00:30:00Z'; // KST 2026-07-23 09:30 (목)
const WINTER_UTC = '2026-01-15T00:30:00Z'; // KST 2026-01-15 09:30 (목)

describe('kst', () => {
  it('UTC 순간을 KST(+09:00)로 옮긴다', () => {
    expect(kst(MORNING_UTC).format('YYYY-MM-DD HH:mm')).toBe('2026-07-23 09:30');
  });

  it('UTC 기준 날짜가 바뀌는 경계를 KST 날짜로 정확히 넘긴다', () => {
    // UTC 2026-07-22 20:00 → KST 2026-07-23 05:00 (하루 넘어감)
    expect(kst('2026-07-22T20:00:00Z').format('YYYY-MM-DD HH:mm')).toBe('2026-07-23 05:00');
    // UTC 2026-07-23 15:30 → KST 2026-07-24 00:30
    expect(kst('2026-07-23T15:30:00Z').format('YYYY-MM-DD HH:mm')).toBe('2026-07-24 00:30');
  });

  it('서머타임이 없어 겨울에도 오프셋이 같다', () => {
    expect(kst(MORNING_UTC).utcOffset()).toBe(540); // 9시간
    expect(kst(WINTER_UTC).utcOffset()).toBe(540);
  });

  it('타임존 상수는 Asia/Seoul이다', () => {
    expect(KST).toBe('Asia/Seoul');
  });
});

describe('한글 로케일', () => {
  it('요일을 한글로 낸다', () => {
    expect(kst(MORNING_UTC).format('dddd')).toBe('목요일');
    expect(kst(MORNING_UTC).format('ddd')).toBe('목');
  });

  it('오전·오후를 한글로 낸다', () => {
    expect(kst(MORNING_UTC).format('A')).toBe('오전');
    expect(kst('2026-07-23T05:30:00Z').format('A')).toBe('오후'); // KST 14:30
  });
});

describe('포맷터', () => {
  it('formatKstDate', () => {
    expect(formatKstDate(MORNING_UTC)).toBe('2026년 7월 23일 (목)');
  });

  it('formatKstDateTime', () => {
    expect(formatKstDateTime(MORNING_UTC)).toBe('2026년 7월 23일 (목) 오전 9:30');
  });

  it('formatKstTime은 장중 표기라 24시간제로 0을 채운다', () => {
    expect(formatKstTime(MORNING_UTC)).toBe('09:30');
    expect(formatKstTime('2026-07-23T05:30:00Z')).toBe('14:30');
  });
});
