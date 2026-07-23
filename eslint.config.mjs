import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import boundaries from 'eslint-plugin-boundaries';
import pluginQuery from '@tanstack/eslint-plugin-query';
import eslintConfigPrettier from 'eslint-config-prettier/flat';

/**
 * FSD 레이어 의존성 방향 (단방향):
 *   app → views → widgets → features → entities → shared
 *
 * - 역방향 import 금지
 * - 동일 레이어 내 슬라이스 간 import 금지 (shared 내부만 예외)
 * - views/widgets/features/entities 슬라이스는 index.ts(public API)로만 import 가능
 * - shared는 하위 경로 직접 import 허용 (Shadcn이 컴포넌트 단위로 파일을 생성하므로)
 */
const LAYER_DEPENDENCIES = {
  app: ['views'],
  views: ['widgets', 'features', 'entities'],
  widgets: ['features', 'entities'],
  features: ['entities'],
};

const layerPolicies = Object.entries(LAYER_DEPENDENCIES).map(([from, to]) => ({
  from: { element: { types: from } },
  allow: { to: { element: { types: to, fileInternalPath: 'index.ts' } } },
  message:
    `'${from}' 레이어는 [${to.join(', ')}] 의 public API(index.ts)와 shared만 import할 수 있습니다. ` +
    '(동일 레이어 슬라이스 간 import 금지)',
}));

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...pluginQuery.configs['flat/recommended'],
  {
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
      },
      'boundaries/elements': [
        { type: 'app', pattern: 'app' },
        { type: 'views', pattern: 'src/views/*', capture: ['slice'] },
        { type: 'widgets', pattern: 'src/widgets/*', capture: ['slice'] },
        { type: 'features', pattern: 'src/features/*', capture: ['slice'] },
        { type: 'entities', pattern: 'src/entities/*', capture: ['slice'] },
        { type: 'shared', pattern: 'src/shared' },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          message: 'FSD 레이어 규칙 위반: 이 파일은 해당 모듈을 import할 수 없습니다.',
          policies: [
            // 외부 패키지는 자유롭게 사용
            { allow: { to: { module: { origin: 'external' } } } },
            // 같은 요소(슬라이스) 내부 파일끼리는 자유롭게 import
            { allow: { dependency: { relationship: { to: 'internal' } } } },
            // 모든 레이어는 shared를 하위 경로까지 직접 import 가능
            { allow: { to: { element: { types: 'shared' } } } },
            // 레이어 간 단방향 의존성 (public API 경유)
            ...layerPolicies,
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // 디자인 시안은 참고 자료 전용 — 빌드/린트 대상이 아니다
    'docs/**',
  ]),
  eslintConfigPrettier,
]);

export default eslintConfig;
