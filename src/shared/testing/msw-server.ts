import { setupServer } from 'msw/node';
import { quotesHandlers } from '../api/mocks/quotes';

/**
 * Vitest 전역 목 서버. vitest.setup.ts가 켜고 끈다.
 *
 * 기본 핸들러는 /api/quotes를 결정적인 시세로 응답한다. 개별 테스트에서 다른 상황이
 * 필요하면 server.use(...)로 그 테스트에서만 갈아끼운다 (afterEach에서 되돌아간다).
 */
export const server = setupServer(...quotesHandlers);
