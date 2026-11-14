/**
 * 비중 차트 카드(섹터별·종목별)의 빈 상태.
 *
 * 보유 종목이 없으면 카드 높이를 최소 240px로 두고 안내 문구를 남은 공간 가운데에 둔다.
 * xl에서는 대시보드가 차트 칸을 늘려 우측 시뮬레이터 하단에 맞추므로, 고정 높이가 아니라
 * 최솟값이어야 카드가 함께 늘어난다.
 */
export const EMPTY_CARD = 'flex min-h-[240px] flex-col';

export const EMPTY_MESSAGE =
  'text-muted-foreground flex flex-1 items-center justify-center text-center text-[13px]';
