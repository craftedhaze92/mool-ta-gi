import type { QueryKey } from '@tanstack/react-query';

const CODE_PATTERN = /^\d{6}$/;

/**
 * 중복을 없애고 정렬한다.
 *
 * 위젯마다 보유 목록에서 코드를 뽑는 순서가 달라도 같은 키로 수렴시키기 위해서다.
 * 그래야 위젯 여섯 개가 각자 useQuotes를 불러도 React-Query가 하나의 쿼리로 합쳐
 * 네트워크 요청이 1건만 나간다.
 */
export function normalizeCodes(codes: readonly string[]): string[] {
  return [...new Set(codes.filter((code) => CODE_PATTERN.test(code)))].sort();
}

/**
 * 시세 쿼리 키.
 *
 * 정렬된 배열을 그대로 넣는다. join(',')으로 문자열 하나를 만들면
 * @tanstack/query/exhaustive-deps가 queryFn이 쓰는 codes가 키에 없다고 잡고,
 * devtools에서도 읽기 어려워진다.
 */
export function quotesQueryKey(codes: readonly string[]): QueryKey {
  return ['quotes', normalizeCodes(codes)];
}
