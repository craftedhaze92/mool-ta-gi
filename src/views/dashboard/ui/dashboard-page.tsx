import { Button } from '@/shared/ui/button';

export function DashboardPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">mool-ta-gi 🚀 세팅 완료</h1>
      <p className="text-muted-foreground max-w-md text-sm">
        국내 주식 포트폴리오 트래커 + 물타기 시뮬레이터. 아직 기능은 없습니다.
      </p>
      <Button disabled>포트폴리오 추가 (준비 중)</Button>
    </main>
  );
}
