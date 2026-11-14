import { setupServer } from 'msw/node';
import { indicesHandlers } from '../api/mocks/indices';
import { quotesHandlers } from '../api/mocks/quotes';
import { stocksHandlers } from '../api/mocks/stocks';

/**
 * Vitest 전역 목 서버. vitest.setup.ts가 켜고 끈다.
 *
 * 앱이 부르는 모든 엔드포인트에 기본 핸들러가 있어야 한다. onUnhandledRequest가 'error'라
 * 하나라도 빠지면 그 엔드포인트를 건드리는 테스트가 전부 실패한다 — 예컨대 MarketHeader가
 * /api/indices를 부르므로 대시보드 테스트 전체가 여기에 걸린다.
 *
 * 개별 테스트에서 다른 상황이 필요하면 server.use(...)로 그 테스트에서만 갈아끼운다
 * (afterEach에서 되돌아간다).
 */
export const server = setupServer(...quotesHandlers, ...indicesHandlers, ...stocksHandlers);
