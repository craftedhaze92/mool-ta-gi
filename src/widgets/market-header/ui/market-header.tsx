import { RefreshCw } from 'lucide-react';
import { MOCK_MARKET_INDICES, type MarketIndex } from '@/entities/market-index';
import { formatKstTime } from '@/shared/lib/dayjs';
import { formatPercent } from '@/shared/lib/format-won';
import { cn } from '@/shared/lib/utils';
import { Badge } from '@/shared/ui/badge';

function IndexQuote({ quote }: { quote: MarketIndex }) {
  const direction = Math.sign(quote.change); // 1 | 0 | -1
  const tone = direction > 0 ? 'text-up' : direction < 0 ? 'text-down' : 'text-muted-foreground';
  const arrow = direction > 0 ? '▲' : direction < 0 ? '▼' : '−';

  return (
    // 지수 한 건은 통째로 붙어 있어야 한다. 좁아지면 지수끼리 줄이 나뉘지, 값과 등락률이 갈라지면 안 된다
    <div className="flex shrink-0 items-baseline gap-[7px] whitespace-nowrap">
      <span className="text-muted-foreground font-semibold">{quote.name}</span>
      <span className="font-bold">
        {quote.value.toLocaleString('ko-KR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </span>
      <span className={cn('font-semibold', tone)}>
        <span aria-hidden="true">{arrow}</span>
        {Math.abs(quote.change).toFixed(2)} ({formatPercent(quote.changeRate, { signed: true })})
      </span>
    </div>
  );
}

export interface MarketHeaderProps {
  /** 마지막으로 시세를 확정한 시각 (ISO 8601). 아직 받은 적 없으면 undefined */
  fetchedAt?: string;
  /**
   * 장 운영 여부. 아직 모르면 null.
   *
   * null일 때 아무것도 그리지 않는 게 중요하다. 이 페이지는 빌드 타임에 프리렌더되므로
   * 서버가 판정한 '지금'은 빌드 시각이다. 판정을 마운트 이후로 미뤄야 SSR 결과와 어긋나지 않는다.
   */
  marketOpen?: boolean | null;
  quoteFailed?: boolean;
  onRetry?: () => void;
}

/**
 * 시세 상태는 props로 받는다.
 *
 * 이 위젯을 프레젠테이셔널로 두고 시세 배선은 views/dashboard 한 곳에 모으기 위해서다.
 * KOSPI/KOSDAQ 지수는 아직 목데이터다 — 지수는 별도 엔드포인트라 이번 범위 밖이다.
 */
export function MarketHeader({
  fetchedAt,
  marketOpen = null,
  quoteFailed = false,
  onRetry,
}: MarketHeaderProps = {}) {
  return (
    <header className="flex flex-col items-start gap-2 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-y-3 sm:pt-6">
      <div className="flex items-baseline gap-2.5">
        {/*
         * 워드마크만 도현체. 단일 굵기이고 기본 획이 두꺼워 굵기 유틸리티를 붙이지 않는다
         * (synthetic bold가 걸리면 획이 뭉갠다). 자폭이 넓어 22px/-0.02em은 답답해 보여
         * 24px/-0.01em으로 키우고 자간을 푼다.
         */}
        <h1 className="font-display text-[24px] tracking-[-0.01em]">평단구조대</h1>
        {/*
         * 도현체는 x-height와 한글 글자틀이 Pretendard와 달라 items-baseline만으로는
         * 태그라인이 2px 떠 보인다. 둘 다 받침 없는 한글이라 잉크 하단이 곧 시각적
         * 기준선이므로, 실제 렌더링에서 잉크 하단 차이가 0이 되는 값으로 맞췄다.
         */}
        <p className="text-muted-foreground relative top-[2px] hidden text-[13px] font-medium sm:block">
          최적의 평단가를 찾아주는 주식 물타기 시뮬레이터
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs tabular-nums sm:gap-x-6 sm:text-[13px]">
        {MOCK_MARKET_INDICES.map((quote) => (
          <IndexQuote key={quote.name} quote={quote} />
        ))}

        <div className="flex items-center gap-2">
          {/* 장 상태를 모르는 첫 렌더에서는 배지를 아예 그리지 않는다 */}
          {marketOpen === false && (
            <Badge variant="outline" className="text-muted-foreground font-semibold">
              장 마감
            </Badge>
          )}

          {quoteFailed ? (
            <button
              type="button"
              onClick={onRetry}
              aria-label="시세 다시 불러오기"
              className="text-muted-foreground hover:text-foreground focus-visible:ring-brand rounded-md p-1 outline-none focus-visible:ring-2"
            >
              <RefreshCw className="size-3.5" />
            </button>
          ) : (
            /* 첫 조회 전에는 자리만 비운다. 가짜 시각을 보여줄 바에야 없는 편이 낫다 */
            fetchedAt !== undefined && (
              <span className="text-muted-foreground font-medium">
                마지막 갱신 {formatKstTime(fetchedAt)}
              </span>
            )
          )}
        </div>
      </div>
    </header>
  );
}
