import { cn } from '@/shared/lib/utils';

interface ChartTooltipProps {
  /** 항목 이름. 섹터명 또는 종목명 */
  label: string;
  /** 강조할 주 수치. 보통 평가금액 */
  value: string;
  /** 보조 수치. 보통 비중(%) */
  sub?: string;
  /** 항목 색을 나타내는 점. 없으면 표시하지 않는다 */
  swatch?: string;
  className?: string;
}

/**
 * 차트 hover 시 뜨는 작은 정보 상자.
 *
 * 섹터 도넛(recharts)과 종목 막대(직접 만든 div)가 같은 모양을 써야 하는데
 * 두 위젯은 같은 레이어라 서로 import할 수 없어 여기 shared에 둔다.
 * 위치 잡기는 쓰는 쪽 책임이고, 이 컴포넌트는 상자 모양만 담당한다.
 */
export function ChartTooltip({ label, value, sub, swatch, className }: ChartTooltipProps) {
  return (
    <div
      className={cn(
        'border-hairline rounded-[10px] border bg-white px-3 py-2 shadow-[0_4px_16px_rgba(0,0,0,0.1)]',
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        {swatch && (
          <span
            className="size-2 shrink-0 rounded-[2px]"
            style={{ backgroundColor: swatch }}
            aria-hidden
          />
        )}
        <span className="text-muted-strong text-[12px] font-semibold whitespace-nowrap">
          {label}
        </span>
      </div>

      <div className="mt-0.5 flex items-baseline gap-1.5 whitespace-nowrap">
        <span className="text-[13.5px] font-bold">{value}</span>
        {sub && <span className="text-muted-foreground text-[12px] font-semibold">{sub}</span>}
      </div>
    </div>
  );
}
