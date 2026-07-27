import { z } from 'zod';

/**
 * KIS OpenAPI 원문 응답 스키마.
 *
 * KIS는 모든 값을 문자열로 준다. 숫자 변환은 mapper.ts가 담당한다.
 * 여기서는 '필요한 키가 문자열로 존재하는가'만 본다 — 우리가 쓰지 않는 수십 개 필드까지
 * 스키마로 묶으면 KIS가 필드를 하나 추가·삭제할 때마다 앱이 깨진다.
 */

/** POST /oauth2/tokenP */
export const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  /**
   * 만료까지 남은 초. 상대값이라 서버 타임존·시계 오차에 면역이다.
   * 응답에는 access_token_token_expired('YYYY-MM-DD HH:mm:ss')도 오지만, 타임존 표기가
   * 없는 KST naive 문자열이라 UTC 서버에서 9시간 어긋난다. 쓰지 않는다.
   */
  expires_in: z.number().optional(),
  token_type: z.string().optional(),
});

export type KisTokenResponse = z.output<typeof tokenResponseSchema>;

/**
 * GET /uapi/domestic-stock/v1/quotations/inquire-price (tr_id: FHKST01010100)
 *
 * output은 배열이 아니라 객체 하나다.
 */
export const inquirePriceOutputSchema = z.object({
  /** 주식 현재가 */
  stck_prpr: z.string(),
  /** 전일 대비 (부호가 붙어 오기도, 절댓값으로만 오기도 한다) */
  prdy_vrss: z.string(),
  /** 전일 대비 부호. 1 상한 · 2 상승 · 3 보합 · 4 하한 · 5 하락 */
  prdy_vrss_sign: z.string(),
  /** 전일 대비율(%) */
  prdy_ctrt: z.string(),
  /**
   * 주식 기준가.
   *
   * KIS에는 '전일 종가'라는 이름의 필드가 이 응답에 없다. 기준가는 평상시 전일 종가와
   * 같지만 권리락·액면분할·신규상장일에는 갈라진다. 그래도 prdy_vrss(전일 대비) 자체가
   * 기준가 대비로 계산된 값이라, 등락을 다루는 우리 화면에서는 기준가가 오히려 정합적이다.
   */
  stck_sdpr: z.string().optional(),
});

export type KisInquirePriceOutput = z.output<typeof inquirePriceOutputSchema>;

/**
 * KIS 공통 응답 봉투.
 *
 * HTTP 200이어도 rt_cd가 '0'이 아니면 실패다. 이 구분을 놓치면 에러 응답을 시세로
 * 오해하게 된다.
 */
export const inquirePriceResponseSchema = z.object({
  rt_cd: z.string(),
  msg_cd: z.string().optional(),
  msg1: z.string().optional(),
  output: inquirePriceOutputSchema.optional(),
});

/** 초당 거래건수 초과 */
export const RATE_LIMIT_MSG_CD = 'EGW00201';
