import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 홈 디렉토리의 다른 lockfile을 워크스페이스 루트로 오인하지 않도록 고정
  turbopack: {
    root: path.resolve(__dirname),
  },
  // React Compiler로 리렌더링 자동 최적화 (babel-plugin-react-compiler 필요)
  reactCompiler: true,
};

export default nextConfig;
