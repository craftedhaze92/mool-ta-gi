import { MAX_STOCK_SEARCH_RESULTS, type Stock } from '../stock-search-contract';

/**
 * 종목 검색.
 *
 * 순수 함수라 목록을 인자로 받는다. 서버는 stocks.json 전체를, 테스트와 MSW 목은 작은
 * 픽스처를 넘긴다. 같은 함수를 쓰므로 목의 검색 결과가 실제 BFF와 어긋나지 않는다.
 */

/** 공백을 무시하고 영문 대소문자를 구분하지 않는다. 'sk 하이닉스'로도 'SK하이닉스'가 찾아진다 */
function normalize(text: string): string {
  return text.replace(/\s+/g, '').toLowerCase();
}

/**
 * 낮을수록 위에 온다. 매칭되지 않으면 null.
 *
 * 이름이 정확히 같으면 맨 위, 앞부분이 같으면 그다음, 중간에 포함되면 그 뒤다.
 * '삼성'을 치면 '삼성전자'가 '한국삼성...'보다 먼저 나와야 하기 때문이다.
 * 숫자를 치면 종목코드 앞자리로도 찾는다.
 */
function rank(stock: Stock, normalizedName: string, query: string): number | null {
  if (normalizedName === query) return 0;
  if (stock.code === query) return 0;
  if (normalizedName.startsWith(query)) return 1;
  if (/^\d+$/.test(query) && stock.code.startsWith(query)) return 1;
  if (normalizedName.includes(query)) return 2;
  return null;
}

export interface StockIndex {
  search: (query: string, limit?: number) => Stock[];
  /** 종목코드로 찾는다. 마스터에 없는 코드는 결과에서 빠진다 */
  findByCodes: (codes: readonly string[]) => Stock[];
}

/** 정규화한 이름과 코드 색인을 미리 만들어 두고, 요청마다 다시 만들지 않는다. */
export function createStockIndex(stocks: readonly Stock[]): StockIndex {
  const entries = stocks.map((stock) => ({ stock, normalizedName: normalize(stock.name) }));
  const byCode = new Map(stocks.map((stock) => [stock.code, stock]));

  return {
    findByCodes(codes) {
      return codes.flatMap((code) => {
        const stock = byCode.get(code);
        return stock ? [stock] : [];
      });
    },

    search(rawQuery, limit = MAX_STOCK_SEARCH_RESULTS) {
      const query = normalize(rawQuery);
      if (query === '') return [];

      const matches: { stock: Stock; score: number; nameLength: number }[] = [];
      for (const { stock, normalizedName } of entries) {
        const score = rank(stock, normalizedName, query);
        if (score !== null) matches.push({ stock, score, nameLength: normalizedName.length });
      }

      // 같은 등급 안에서는 이름이 짧은 쪽이 먼저다. '삼성전자'가 '삼성전자우'보다 위에 온다
      matches.sort(
        (a, b) =>
          a.score - b.score ||
          a.nameLength - b.nameLength ||
          a.stock.code.localeCompare(b.stock.code),
      );

      return matches.slice(0, limit).map(({ stock }) => stock);
    },
  };
}
