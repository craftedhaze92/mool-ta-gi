<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## 프로젝트 규칙

이 저장소의 규칙은 [CLAUDE.md](CLAUDE.md)에 있다. 작업을 시작하기 전에 읽고, 코드를 작성할 때와
검토할 때 모두 그 규칙을 기준으로 삼는다. 내용을 여기에 옮겨 적지 않는다. 두 벌로 두면 한쪽만
고쳐져 규칙이 갈라진다.

### 코드 검토 시 확인할 것

- FSD 의존 방향과 Public API(`index.ts`) 규칙을 지켰는가. `eslint-disable`로 경계 검사를 우회하지 않았는가
- 네이밍·파일 위치·테스트 파일 위치가 CLAUDE.md의 컨벤션과 맞는가
- `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test`, `pnpm build`가 통과하는가
- 커밋 메시지가 CLAUDE.md의 커밋 컨벤션을 따르는가
