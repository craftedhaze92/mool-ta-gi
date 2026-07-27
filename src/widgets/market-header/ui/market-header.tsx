'use client';

import { RefreshCw } from 'lucide-react';
import { MARKET_INDICES, useMarketIndices, type MarketIndex } from '@/entities/market-index';
import { formatKstTime } from '@/shared/lib/dayjs';
import { formatPercent } from '@/shared/lib/format-won';
import { cn } from '@/shared/lib/utils';
import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';

/**
 * 지수 한 건.
 *
 * 이름은 조회 전에도 아는 값이라 항상 그린다. 값만 상태에 따라 갈린다 —
 * 로딩 중이면 스켈레톤, 못 받았으면 '—'. 블록을 통째로 감추면 뭐가 없어졌는지 알 수 없다.
 */
function IndexQuote({
  name,
  index,
  pending,
}: {
  name: string;
  index: MarketIndex | undefined;
  pending: boolean;
}) {
  // 지수 한 건은 통째로 붙어 있어야 한다. 좁아지면 지수끼리 줄이 나뉘지, 값과 등락률이 갈라지면 안 된다
  const shell = (children: React.ReactNode) => (
    <div className="flex shrink-0 items-baseline gap-[7px] whitespace-nowrap">
      <span className="text-muted-foreground font-semibold">{name}</span>
      {children}
    </div>
  );

  if (index === undefined) {
    return shell(
      pending ? (
        <Skeleton className="h-3.5 w-28" />
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
    );
  }

  const direction = Math.sign(index.change); // 1 | 0 | -1
  const tone = direction > 0 ? 'text-up' : direction < 0 ? 'text-down' : 'text-muted-foreground';

  /*
   * 보합일 때는 화살표를 붙이지 않는다. 방향 기호가 숫자에 바로 붙는 표기라서, 보합에
   * '−'를 쓰면 '−0.00'이 되어 음수 0으로 읽힌다. 장 시작 전에는 지수가 늘 보합이라
   * 매일 아침 보이는 화면이다.
   */
  const arrow = direction > 0 ? '▲' : direction < 0 ? '▼' : null;

  return shell(
    <>
      <span className="font-bold">
        {index.value.toLocaleString('ko-KR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </span>
      <span className={cn('font-semibold', tone)}>
        {arrow !== null && <span aria-hidden="true">{arrow}</span>}
        {Math.abs(index.change).toFixed(2)} ({formatPercent(index.changeRate, { signed: true })})
      </span>
    </>,
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
 * 보유 종목 시세의 상태는 props로 받고, 지수는 이 위젯이 직접 구독한다.
 *
 * 시세 상태(마지막 갱신 시각·실패 여부)는 대시보드 전체의 관심사라 views에서 내려주는 게
 * 맞지만, 지수는 이 헤더만 쓰는 데이터라 views를 거쳐 props로 흘릴 이유가 없다.
 */
export function MarketHeader({
  fetchedAt,
  marketOpen = null,
  quoteFailed = false,
  onRetry,
}: MarketHeaderProps = {}) {
  const indices = useMarketIndices();

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
        {/* 표시 순서는 조회 대상 목록을 그대로 따른다 (응답 순서에 기대지 않는다) */}
        {MARKET_INDICES.map(({ code, name }) => (
          <IndexQuote
            key={code}
            name={name}
            index={indices.byCode[code]}
            pending={indices.isPending}
          />
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
