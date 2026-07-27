import type { MarketIndex } from '../indices-contract';
import { num, signOf } from './mapper';
import type { KisIndexPriceOutput } from './raw-types';

/*
 * KIS 지수 응답 → MarketIndex 정규화.
 *
 * mapper.ts와 같은 이유로 'server-only'를 붙이지 않는다 — 순수 변환 함수라 단독 테스트가 된다.
 * 숫자 파싱과 부호 처리는 주식 매퍼의 num/signOf를 그대로 재사용한다. 지수라고 규칙이
 * 다르지 않고, 두 벌로 두면 한쪽만 고치는 실수가 난다.
 */

/**
 * 지수 응답 하나를 MarketIndex로 바꾼다.
 *
 * 코드와 이름은 응답이 아니라 **요청할 때 쓴 값**에서 받는다. KIS 지수 응답에는 지수를
 * 식별할 필드가 아예 없다(업종명도 오지 않는다).
 *
 * 부호 처리는 주식과 같다 — 전일 대비가 부호를 달고 오든 절댓값으로만 오든 옳게 나오도록
 * 절댓값을 취한 뒤 prdy_vrss_sign을 곱한다.
 *
 * 숫자로 읽을 수 없으면 throw한다. 호출부가 지수 단위로 잡아 failed에 넣는다.
 */
export function toMarketIndex(
  code: string,
  name: string,
  output: KisIndexPriceOutput,
): MarketIndex {
  const value = num(output.bstp_nmix_prpr, 'bstp_nmix_prpr(현재지수)');
  const sign = signOf(output.prdy_vrss_sign);

  const change = sign * Math.abs(num(output.bstp_nmix_prdy_vrss, 'bstp_nmix_prdy_vrss(전일 대비)'));
  const changeRate =
    sign * Math.abs(num(output.bstp_nmix_prdy_ctrt, 'bstp_nmix_prdy_ctrt(전일 대비율)'));

  return { code, name, value, change, changeRate };
}
