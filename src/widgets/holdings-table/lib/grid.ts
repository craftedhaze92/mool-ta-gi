/**
 * 시안 그리드: 종목명 / 보유수량 / 평단가 / 현재가 / 평가손익 / 액션.
 *
 * md 미만에서는 같은 셀 6개를 2열 3행으로 접어 카드처럼 보여준다. 마크업(셀 순서, role="row")은
 * 그대로 두고 배치 클래스만 바꾸는 방식이라, 화면 폭에 따라 DOM이 갈라지지 않는다.
 *
 * tabular-nums는 상속되므로 여기 한 번만 붙이면 모든 숫자 셀이 고정폭으로 정렬된다.
 * 자릿수가 달라져도 열이 흔들리지 않아야 한다.
 *
 * 실제 테이블과 로딩 스켈레톤이 이 상수를 공유한다. 골격이 한 곳에서만 정의되어야
 * 레이아웃을 고칠 때 둘이 어긋나지 않는다.
 */
export const GRID =
  'grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 tabular-nums md:grid-cols-[1.5fr_0.7fr_1fr_1fr_1.2fr_150px] md:gap-2';

/** md에서 원래의 자동 배치로 되돌린다. 셀마다 붙는 공통 꼬리표. */
export const CELL_RESET = 'md:col-auto md:row-auto';

/** 행 공통 여백. 모바일에서는 카드처럼 보이도록 구분선을 둔다. */
export const ROW_PADDING = 'border-b px-4 py-3 last:border-b-0 md:border-b-0 md:px-6 md:py-[13px]';
