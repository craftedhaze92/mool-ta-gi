import type { Metadata } from 'next';
import './globals.css';
import { QueryProvider } from '@/shared/api';
import { ThemeProvider } from '@/shared/ui/theme-provider';

export const metadata: Metadata = {
  title: '물타기 | 감으로 말고 계산하고 물타세요',
  description: '국내 주식 포트폴리오 트래커 + 물타기 시뮬레이터',
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
