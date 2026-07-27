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
 * GET /uapi/domestic-stock/v1/quotations/intstock-multprice (tr_id: FHKST11300006)
 * 관심종목(멀티종목) 시세조회. 한 번에 최대 30종목.
 *
 * 요청은 FID_COND_MRKT_DIV_CODE_1..30 / FID_INPUT_ISCD_1..30 쌍으로 보내고,
 * output은 요청 순서와 같은 순서의 배열로 온다.
 *
 * 모든 필드를 optional로 둔다. 조회에 실패한 종목도 행 자체는 돌아오는데, 그때는 값이
 * 전부 빈 문자열이다. 필수로 잡으면 그 한 행 때문에 배열 전체 파싱이 실패한다.
 */
export const multiPriceRowSchema = z.object({
  /** 관심 단축 종목코드. 조회 실패 시 빈 문자열 */
  inter_shrn_iscd: z.string().optional(),
  /** 관심 한글 종목명 */
  inter_kor_isnm: z.string().optional(),
  /** 현재가 */
  inter2_prpr: z.string().optional(),
  /** 전일 대비 (부호가 붙어 오기도, 절댓값으로만 오기도 한다) */
  inter2_prdy_vrss: z.string().optional(),
  /** 전일 대비 부호. 1 상한 · 2 상승 · 3 보합 · 4 하한 · 5 하락 */
  prdy_vrss_sign: z.string().optional(),
  /** 전일 대비율(%) */
  prdy_ctrt: z.string().optional(),
  /**
   * 주식 기준가.
   *
   * 평상시 전일 종가와 같지만 권리락·액면분할·신규상장일에는 갈라진다. 그래도
   * inter2_prdy_vrss(전일 대비) 자체가 기준가 대비로 계산된 값이라, 등락을 다루는
   * 화면에서는 기준가가 정합적이다.
   */
  inter2_sdpr: z.string().optional(),
  /**
   * 진짜 전일 종가.
   *
   * 단건 API(inquire-price)에는 없고 이 배치 응답에만 있다. 지금은 쓰지 않지만,
   * 기준가와의 차이가 문제가 되면 여기로 갈아탈 수 있다.
   */
  inter2_prdy_clpr: z.string().optional(),
});

export type KisMultiPriceRow = z.output<typeof multiPriceRowSchema>;

/**
 * KIS 공통 응답 봉투.
 *
 * HTTP 200이어도 rt_cd가 '0'이 아니면 실패다. 이 구분을 놓치면 에러 응답을 시세로
 * 오해하게 된다.
 */
export const multiPriceResponseSchema = z.object({
  rt_cd: z.string(),
  msg_cd: z.string().optional(),
  msg1: z.string().optional(),
  output: z.array(multiPriceRowSchema).optional(),
});

/** 한 번의 호출에 넣을 수 있는 종목 수. 넘기면 KIS가 조용히 30개까지만 처리한다. */
export const MULTI_PRICE_CHUNK_SIZE = 30;

/**
 * KIS 오류 코드.
 *
 * KIS는 HTTP 500으로 응답하면서 본문에 진짜 원인을 담아 보낸다. 상태 코드만 보고
 * 판단하면 유량 초과와 토큰 만료를 구분할 수 없으니 반드시 본문을 읽어야 한다.
 */
/** 초당 거래건수 초과 */
export const RATE_LIMIT_MSG_CD = 'EGW00201';

/**
 * 토큰이 더 이상 유효하지 않다.
 *
 * EGW00121 유효하지 않은 token / EGW00123 기간이 만료된 token.
 * 토큰을 새로 발급하면 앞서 발급된 토큰이 무효화되므로, 다른 프로세스가 발급을 한 번만
 * 해도 우리 캐시가 조용히 죽는다. 만료 시각만 믿고 있으면 그때부터 모든 조회가 실패한다.
 */
export const TOKEN_INVALID_MSG_CDS = ['EGW00121', 'EGW00123'];
