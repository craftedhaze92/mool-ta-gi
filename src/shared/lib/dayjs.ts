import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import 'dayjs/locale/ko';

/**
 * 한국 표준시. 국내 증시만 다루므로 앱 전체가 이 타임존 하나로 고정된다.
 * KST는 서머타임이 없어 연중 UTC+09:00으로 일정하다.
 */
export const KST = 'Asia/Seoul';

/*
 * dayjs 설정은 전역을 한 번 바꾸는 부수효과다. 이 모듈을 거쳐야만 설정된 dayjs를
 * 쓰게 하려고, 앱 코드에서 'dayjs'를 직접 import하는 것은 ESLint로 막아두었다
 * (eslint.config.mjs의 no-restricted-imports).
 */
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('ko');
dayjs.tz.setDefault(KST);

/**
 * KST 기준 dayjs 객체를 만든다.
 *
 * 그냥 `dayjs()`를 쓰면 실행 환경의 로컬 타임존을 따른다. 그러면 해외에서 접속한
 * 사용자에게 장 시간이 어긋나 보이고, 서버(대개 UTC)와 브라우저(KST)의 렌더 결과가
 * 달라져 hydration mismatch가 난다. 날짜를 다룰 때는 항상 이 함수를 쓴다.
 *
 * @param input 미지정이면 현재 시각
 */
export function kst(input?: dayjs.ConfigType): dayjs.Dayjs {
  return dayjs(input).tz(KST);
}

/** '2026년 7월 23일 (목)' */
export function formatKstDate(input?: dayjs.ConfigType): string {
  return kst(input).format('YYYY년 M월 D일 (ddd)');
}

/** '2026년 7월 23일 (목) 오전 9:30' */
export function formatKstDateTime(input?: dayjs.ConfigType): string {
  return kst(input).format('YYYY년 M월 D일 (ddd) A h:mm');
}

/** 장중 시각 표기. '09:30' */
export function formatKstTime(input?: dayjs.ConfigType): string {
  return kst(input).format('HH:mm');
}

export type { Dayjs } from 'dayjs';
