import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import boundaries from 'eslint-plugin-boundaries';
import pluginQuery from '@tanstack/eslint-plugin-query';
import unusedImports from 'eslint-plugin-unused-imports';
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
  /*
   * 미사용 import 자동 제거.
   *
   * @typescript-eslint/no-unused-vars도 미사용 import를 잡아내지만 auto-fix가 없어서
   * `--fix`로 지워지지 않는다. 그 자리를 이 플러그인이 대신하므로 import에 대해서는
   * 원래 규칙을 끄고 중복 보고를 막는다.
   *
   * import는 지워도 동작이 변하지 않으니 error로 올려 자동 정리하고,
   * 지역 변수·인자는 지우는 순간 의미가 바뀔 수 있어 warn으로 남겨 사람이 판단하게 둔다.
   */
  {
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    plugins: { 'unused-imports': unusedImports },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          args: 'after-used',
          // _ 접두사는 '의도적으로 안 쓴다'는 표시로 통용된다
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  /*
   * dayjs는 plugin/locale 등록이 전역 부수효과라, 설정을 거치지 않은 인스턴스를 쓰면
   * 타임존과 한글 로케일이 빠진 채로 동작한다. 설정 모듈을 통해서만 쓰도록 강제한다.
   * (설정 모듈 자신은 당연히 예외다)
   */
  {
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    ignores: ['src/shared/lib/dayjs.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'dayjs',
              message:
                "dayjs를 직접 import하지 말고 '@/shared/lib/dayjs'의 kst()를 쓰세요. 직접 쓰면 타임존·한글 로케일 설정이 적용되지 않습니다.",
            },
          ],
          patterns: [
            {
              group: ['dayjs/*'],
              message: "dayjs 플러그인·로케일 등록은 '@/shared/lib/dayjs'에서 한 번만 합니다.",
            },
          ],
        },
      ],
    },
  },
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
