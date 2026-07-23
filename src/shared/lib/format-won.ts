/**
 * 원화 표시 포맷터 모음. 전부 순수 함수다.
 *
 * 음수 부호는 하이픈(-)이 아니라 U+2212 MINUS SIGN(−)을 쓴다.
 * 시안이 그렇게 쓰고 있고, 숫자 옆에서 하이픈보다 시각적으로 안정적이다.
 */

const MINUS = '−';
const MAN = 10_000;
const EOK = 100_000_000;

/** 부호 없는 정수 문자열. 1234000 → '1,234,000' */
function group(value: number): string {
  return Math.round(Math.abs(value)).toLocaleString('ko-KR');
}

/** 1234000 → '₩1,234,000' / -1234000 → '−₩1,234,000' */
export function formatWon(value: number): string {
  const sign = value < 0 ? MINUS : '';
  return `${sign}₩${group(value)}`;
}

/** 양수에도 부호를 붙인다. 787500 → '+₩787,500' */
export function formatSignedWon(value: number): string {
  if (value === 0) return '₩0';
  return `${value > 0 ? '+' : MINUS}₩${group(value)}`;
}

/**
 * 만·억 단위 축약. 좁은 자리에 큰 금액을 넣을 때 쓴다.
 *
 * - 1만 미만: 그대로 (예: '₩9,999')
 * - 1만 이상 1억 미만: 만 단위 반올림 정수 (예: '3,099만원')
 * - 1억 이상: 억 단위 소수 1자리, 소수부가 0이면 생략 (예: '1.3억원', '2억원')
 */
export function formatWonCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? MINUS : '';

  if (abs < MAN) return `${sign}₩${group(value)}`;

  if (abs < EOK) {
    const man = Math.round(abs / MAN);
    // 반올림으로 1억에 닿으면 억 표기로 넘긴다 (99,999,999 → '1억원')
    if (man >= EOK / MAN) return `${sign}1억원`;
    return `${sign}${man.toLocaleString('ko-KR')}만원`;
  }

  const eok = abs / EOK;
  const rounded = Math.round(eok * 10) / 10;
  const body = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${sign}${body}억원`;
}

interface PercentOptions {
  /** 양수에 '+'를 붙일지. 기본값 false */
  signed?: boolean;
  /** 소수 자릿수. 기본값 2 */
  digits?: number;
}

/** -9.184 → '−9.18%' / signed로 주면 18.75 → '+18.75%' */
export function formatPercent(value: number, options: PercentOptions = {}): string {
  const { signed = false, digits = 2 } = options;
  const body = Math.abs(value).toFixed(digits);

  if (value < 0) return `${MINUS}${body}%`;
  return `${signed && value > 0 ? '+' : ''}${body}%`;
}

/** 120 → '120주' */
export function formatQuantity(value: number): string {
  return `${Math.round(value).toLocaleString('ko-KR')}주`;
}
