import 'server-only';
import { z } from 'zod';

/**
 * 서버 환경변수 스키마.
 *
 * 여기 있는 값은 전부 서버 전용이다. NEXT_PUBLIC_ 접두사를 붙이는 순간 Next.js가
 * 클라이언트 번들에 인라인해 버리므로, API 키에는 절대 붙이지 않는다.
 */
const serverEnvSchema = z.object({
  KIS_APP_KEY: z.string().min(1, 'KIS_APP_KEY가 비어 있습니다.'),
  KIS_APP_SECRET: z.string().min(1, 'KIS_APP_SECRET이 비어 있습니다.'),
  KIS_BASE_URL: z
    .url('KIS_BASE_URL이 올바른 URL이 아닙니다.')
    .default('https://openapi.koreainvestment.com:9443'),
});

export type ServerEnv = z.output<typeof serverEnvSchema>;

/** 환경변수 검증 실패. 라우트 핸들러가 이걸 잡아 503으로 정규화한다. */
export class EnvValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvValidationError';
  }
}

let cached: ServerEnv | null = null;

/**
 * 검증된 서버 환경변수를 돌려준다.
 *
 * 모듈 스코프에서 즉시 검증하지 않고 호출 시점으로 미룬다. 모듈 로드 중에 throw하면
 * 키가 없는 CI·프리뷰 환경에서 `next build`의 page data 수집 단계가 통째로 실패한다.
 * 실제로 KIS를 호출하는 경로에서만 터지게 두고, 그 실패는 503으로 정규화해 내보낸다.
 *
 * process.env는 빌드 타임에 인라인될 수 있으므로 구조분해가 아니라 개별 참조로 읽는다.
 */
export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverEnvSchema.safeParse({
    KIS_APP_KEY: process.env.KIS_APP_KEY,
    KIS_APP_SECRET: process.env.KIS_APP_SECRET,
    KIS_BASE_URL: process.env.KIS_BASE_URL,
  });

  if (!parsed.success) {
    const detail = parsed.error.issues.map((issue) => issue.message).join(' ');
    throw new EnvValidationError(
      `서버 환경변수 설정이 올바르지 않습니다. .env.example을 참고해 .env.local을 채워주세요. ${detail}`,
    );
  }

  cached = parsed.data;
  return cached;
}

export interface TokenStoreEnv {
  url: string;
  token: string;
}

/**
 * KIS 토큰 공유 저장소(Upstash Redis REST) 설정.
 *
 * Vercel Marketplace의 Upstash for Redis를 연결하면 KV_REST_API_URL / KV_REST_API_TOKEN이
 * 주입된다. 둘 중 하나라도 없으면 null — 저장소 없이 인스턴스 로컬 캐시로만 동작한다
 * (로컬 개발, 테스트, CI). 필수가 아니므로 getServerEnv()와 달리 throw하지 않는다.
 */
export function getTokenStoreEnv(): TokenStoreEnv | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ''), token };
}
