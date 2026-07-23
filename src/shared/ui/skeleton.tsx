import { cn } from '@/shared/lib/utils';

/**
 * 로딩 자리 표시자.
 *
 * shadcn 기본값은 bg-muted(#f7f8fa)인데 카드가 흰색이라 대비가 거의 없어 형태가 안 읽힌다.
 * 게이지·비중 막대의 트랙과 같은 bg-track(#eef1f5)을 써서 톤을 맞추면서 눈에 걸리게 한다.
 *
 * pulse는 motion-safe로 감싼다. 감속을 선호하는 사용자에게는 정지한 회색 바로 보인다.
 */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('bg-track rounded-md motion-safe:animate-pulse', className)}
      {...props}
    />
  );
}

export { Skeleton };
