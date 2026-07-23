import type { Metadata } from 'next';
import './globals.css';
import { QueryProvider } from '@/shared/api';
import { ThemeProvider } from '@/shared/ui/theme-provider';

export const metadata: Metadata = {
  metadataBase: new URL('https://mool-ta-gi.vercel.app'),
  title: {
    default: '평단구조대 — 주식 물타기 시뮬레이터',
    template: '%s | 평단구조대',
  },
  description:
    '보유 종목의 평단가를 얼마나 낮출 수 있는지 계산해보세요. 국내 주식 포트폴리오 트래커와 물타기 시뮬레이터.',
  keywords: ['물타기', '평단가', '주식 포트폴리오', '평단 계산기', '국내주식'],
  openGraph: {
    title: '평단구조대 — 주식 물타기 시뮬레이터',
    description: '감으로 물타지 말고, 계산하고 물타세요.',
    url: '/',
    siteName: '평단구조대',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '평단구조대',
    description: '감으로 물타지 말고, 계산하고 물타세요.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning className="h-full antialiased">
      <head>
        {/* 시안 지정 서체. self-host 전환은 다음 단계. */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="bg-canvas flex min-h-full flex-col">
        {/* 이번 단계는 라이트 전용 — 다크모드 토글은 다음 단계 */}
        <ThemeProvider attribute="class" forcedTheme="light">
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
