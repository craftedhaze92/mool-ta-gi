import localFont from 'next/font/local';

/**
 * 배달의민족 도현체 — 워드마크 전용 브랜드 서체.
 *
 * 워드마크에 쓰는 글자만 담은 서브셋이라(6KB) 본문에 쓰면 글자가 깨진다.
 * 데이터가 말하는 자리(본문·라벨·숫자)는 전부 Pretendard(--font-sans)를 쓴다.
 * 서브셋 재생성은 `pnpm font:subset`, 라이선스는 app/fonts/OFL.txt.
 *
 * 단일 굵기이고 기본 획이 두꺼워 굵기 유틸리티(font-bold ...)와 조합하지 않는다.
 */
export const dohyeon = localFont({
  src: './fonts/BMDOHYEON-subset.woff2',
  variable: '--font-dohyeon',
  display: 'swap',
  preload: true,
});
