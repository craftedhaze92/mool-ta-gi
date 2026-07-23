/**
 * 페이지 내 스크롤 이동에 쓰는 앵커 id.
 *
 * 앵커를 다는 위젯(averaging-panel)과 그곳으로 보내는 위젯(holdings-table)은 같은 레이어라
 * 서로 import할 수 없다. 두 슬라이스가 같은 문자열을 봐야 하므로 shared로 내렸다.
 */

/** 물타기 시뮬레이터 패널. 모바일에서 '물타기 계산'을 누르면 여기로 스크롤한다. */
export const AVERAGING_PANEL_ID = 'averaging-panel';

/**
 * 앵커로 부드럽게 스크롤한다. 이미 화면 안에 있으면 브라우저가 알아서 아무것도 하지 않으므로
 * 시뮬레이터가 항상 보이는 데스크톱(xl 이상)에서도 그대로 호출하면 된다.
 */
export function scrollToAnchor(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
