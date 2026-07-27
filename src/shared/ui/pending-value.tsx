import type { ReactNode } from 'react';
import { Skeleton } from './skeleton';
import { cn } from '../lib/utils';

/**
 * 값 하나만 로딩으로 가리는 자리 표시자.
 *
 * 보유 종목 정보(종목명·수량·평단가)는 localStorage에 있어 즉시 그릴 수 있고, 시세에
 * 기대는 값만 나중에 온다. 화면 전체를 스켈레톤으로 덮는 대신 시세 칸만 가리려고 쓴다.
 *
 * role="status"를 달지 않는다. 그건 하이드레이션 게이트 스켈레톤 전용이다. 여기에도
 * 붙이면 '복원이 끝났는가'를 판정하는 신호가 흐려진다.
 */
export function PendingValue({
  pending,
  children,
  className,
}: {
  pending: boolean;
  children: ReactNode;
  /** 스켈레톤 크기. 값이 들어왔을 때의 글자 크기에 맞춘다 */
  className?: string;
}) {
  if (!pending) return children;

  return <Skeleton className={cn('h-5 w-24', className)} />;
}
