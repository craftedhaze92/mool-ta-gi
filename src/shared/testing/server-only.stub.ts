/**
 * Vitest 전용 'server-only' 대체 모듈.
 *
 * 'server-only'는 서버 전용 모듈이 클라이언트 번들에 섞이는 것을 막는 표식이다.
 * Next.js는 타입(next/types/global.d.ts)과 번들러 alias를 이미 제공하므로 패키지를
 * 따로 설치하지 않는다. 다만 Vitest는 그 alias를 모르기 때문에, 서버 모듈을 단위
 * 테스트하려면 import를 해소해 줄 빈 모듈이 필요하다.
 *
 * 실제 'server-only' 패키지를 설치하면 안 된다. 그 패키지는 브라우저 조건부 export가
 * 곧바로 throw하도록 만들어져 있어 jsdom 환경의 Vitest에서 터진다.
 *
 * 연결 지점: vitest.config.ts의 resolve.alias
 */
export {};
