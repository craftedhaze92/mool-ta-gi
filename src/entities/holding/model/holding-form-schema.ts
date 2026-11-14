import { z } from 'zod';
import { SECTORS, type Holding, type HoldingInput } from './types';

/** 수량·평단가는 같은 규칙을 쓰므로 메시지도 하나로 묶는다. */
const POSITIVE_MESSAGE = '수량과 평단가는 0보다 큰 숫자여야 합니다.';

/**
 * 6자리 숫자. 빈 값을 허용하지 않는다.
 *
 * 종목코드는 이제 시세 조회 키다. 없으면 현재가를 알 수 없어 평가금액·손익·비중이 전부
 * 계산되지 않으므로, 선택 입력이 아니라 필수다.
 */
const CODE_PATTERN = /^\d{6}$/;

/**
 * 폼은 input 요소에서 온 문자열을 다루고, 검증 결과는 숫자다.
 * 그래서 입력 타입(HoldingFormValues)과 출력 타입이 다르다.
 */
export const holdingFormSchema = z.object({
  name: z.string().trim().min(1, '종목을 검색해 선택해주세요.'),
  code: z.string().trim().regex(CODE_PATTERN, '목록에서 종목을 선택해주세요.'),
  sector: z.enum(SECTORS),
  quantity: z.coerce.number(POSITIVE_MESSAGE).positive(POSITIVE_MESSAGE),
  avgPrice: z.coerce.number(POSITIVE_MESSAGE).positive(POSITIVE_MESSAGE),
});

/** react-hook-form이 들고 있는 값. 숫자 필드도 입력 중에는 문자열이다. */
export type HoldingFormValues = z.input<typeof holdingFormSchema>;

/** 새 종목 폼의 기본값 */
export const EMPTY_HOLDING_FORM: HoldingFormValues = {
  name: '',
  code: '',
  sector: '기타',
  quantity: '',
  avgPrice: '',
};

/** 기존 종목 → 폼 기본값 */
export function toFormValues(holding: Holding): HoldingFormValues {
  return {
    name: holding.name,
    code: holding.code,
    sector: holding.sector,
    quantity: String(holding.quantity),
    avgPrice: String(holding.avgPrice),
  };
}

/** 검증을 통과한 폼 값 → 스토어에 넣을 입력 */
export function toHoldingInput(values: z.output<typeof holdingFormSchema>): HoldingInput {
  return {
    name: values.name,
    code: values.code,
    sector: values.sector,
    quantity: values.quantity,
    avgPrice: values.avgPrice,
  };
}

/**
 * 같은 종목코드를 가진 다른 보유 종목. 있으면 신규 추가가 아니라 '추가 매수'다.
 *
 * 종목코드가 필수가 되면서 판정이 단순해졌다. 예전에는 코드 없는 항목끼리 서로 다른
 * 종목일 수 있어 예외 처리가 필요했다.
 *
 * @param excludeId 수정 중인 자기 자신은 후보에서 뺀다
 */
export function findDuplicateByCode(
  holdings: Holding[],
  code: string,
  excludeId?: string,
): Holding | null {
  if (code === '') return null;

  return holdings.find((h) => h.code === code && h.id !== excludeId) ?? null;
}
