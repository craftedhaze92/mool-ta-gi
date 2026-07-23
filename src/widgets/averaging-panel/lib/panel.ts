/**
 * 패널 루트. sticky는 우측 사이드바가 되는 xl 이상에서만 의미가 있다.
 * @container를 걸어 내부 배치가 뷰포트가 아니라 패널 자기 폭에 반응하게 한다
 * (md~xl 구간에서는 전폭이라 2단, xl 이상에서는 372px이라 1단).
 */
export const PANEL =
  '@container bg-card flex flex-col rounded-2xl p-5 tabular-nums md:p-6 xl:sticky xl:top-5';

/**
 * 입력부(좌)와 결과부(우)를 가르는 컨테이너 쿼리 분할.
 *
 * 패널이 672px보다 넓어지면(md~xl 구간의 전폭 배치) 좌우로 나눈다. 그러지 않으면
 * 짧은 행들이 가로로 늘어져 읽는 거리가 쓸데없이 길어진다.
 *
 * 실제 패널과 로딩 스켈레톤이 이 상수를 공유한다. 스켈레톤이 높이를 하드코딩하면
 * 이 분할을 못 따라가 하이드레이션 순간 200px씩 튀기 때문이다.
 */
export const PANEL_SPLIT =
  'flex flex-col gap-[18px] @2xl:grid @2xl:grid-cols-2 @2xl:items-start @2xl:gap-6';

/** 2단일 때는 위아래 구분선 대신 좌우 구분선이 두 덩어리를 가른다. */
export const PANEL_RIGHT_COLUMN = 'flex flex-col gap-[18px] @2xl:border-l @2xl:pl-6';
