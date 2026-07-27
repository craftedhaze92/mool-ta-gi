import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    // tsconfig.json의 "@/*" alias를 그대로 사용
    tsconfigPaths: true,
    alias: {
      /*
       * 'server-only'는 Next.js 번들러가 해소하는 표식 모듈이라 node_modules에 실체가 없다.
       * Vitest에서 서버 모듈(shared/api/kis 등)을 단위 테스트하려면 여기서 빈 모듈로 돌려준다.
       */
      'server-only': path.resolve(dirname, 'src/shared/testing/server-only.stub.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
