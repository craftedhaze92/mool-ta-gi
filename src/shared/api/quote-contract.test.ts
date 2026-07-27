import { describe, expect, it } from 'vitest';
import { MAX_QUOTE_CODES, parseCodesParam } from './quote-contract';

describe('parseCodesParam', () => {
  it('쉼표로 구분된 6자리 코드를 배열로 바꾼다', () => {
    expect(parseCodesParam('005930,000660')).toEqual({ ok: true, codes: ['000660', '005930'] });
  });

  it('중복을 제거하고 정렬한다 (같은 요청이 같은 URL로 수렴해야 캐시가 갈라지지 않는다)', () => {
    expect(parseCodesParam('035420,005930,005930')).toEqual({
      ok: true,
      codes: ['005930', '035420'],
    });
  });

  it('공백을 다듬고 빈 조각은 버린다', () => {
    expect(parseCodesParam(' 005930 , ,000660 ')).toEqual({
      ok: true,
      codes: ['000660', '005930'],
    });
  });

  it('파라미터가 없거나 비어 있으면 거절한다', () => {
    expect(parseCodesParam(null).ok).toBe(false);
    expect(parseCodesParam('').ok).toBe(false);
    expect(parseCodesParam('   ').ok).toBe(false);
  });

  it('쉼표만 있으면 거절한다', () => {
    const result = parseCodesParam(',,,');
    expect(result).toEqual({ ok: false, message: '종목코드를 최소 1개 넣어주세요.' });
  });

  it('6자리 숫자가 아니면 어떤 코드가 문제인지 알려준다', () => {
    const result = parseCodesParam('005930,abc');
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.message).toContain('abc');

    expect(parseCodesParam('12345').ok).toBe(false); // 5자리
    expect(parseCodesParam('1234567').ok).toBe(false); // 7자리
  });

  it(`상한 ${MAX_QUOTE_CODES}개까지 허용하고 넘으면 거절한다`, () => {
    const make = (count: number) =>
      Array.from({ length: count }, (_, i) => String(i).padStart(6, '0')).join(',');

    expect(parseCodesParam(make(MAX_QUOTE_CODES)).ok).toBe(true);

    const tooMany = parseCodesParam(make(MAX_QUOTE_CODES + 1));
    expect(tooMany.ok).toBe(false);
    expect(tooMany.ok === false && tooMany.message).toContain(String(MAX_QUOTE_CODES));
  });

  it('중복 제거 후 상한 안이면 통과한다', () => {
    const duplicated = Array.from({ length: MAX_QUOTE_CODES + 10 }, () => '005930').join(',');
    expect(parseCodesParam(duplicated)).toEqual({ ok: true, codes: ['005930'] });
  });
});
