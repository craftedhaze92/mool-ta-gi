'use client';

import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

/**
 * 표 배치가 바뀌는 지점. Tailwind md(48rem = 768px)와 같아야 한다 — 그 위는 한 줄짜리 표 행,
 * 그 아래는 셀이 접힌 카드 행이다(lib/grid.ts).
 */
const DESKTOP_QUERY = '(min-width: 48rem)';

/** 화면 폭별로 보여줄 최대 행 수 */
export interface RowLimit {
  /** md 미만. 카드 행이 높아(약 156px) 적게 보여준다 */
  mobile: number;
  /** md 이상 */
  desktop: number;
}

/**
 * 스크롤 영역을 행 maxRows개 높이로 묶는다. maxRows는 화면 폭에 따라 mobile / desktop 중 하나다.
 *
 * 높이를 상수로 박지 않고 (maxRows + 1)번째 행의 위치를 잰다. 행 높이가 화면 폭에 따라
 * 다르기 때문이다 — md 이상은 한 줄짜리 표 행(약 63px), 그 아래는 셀이 2열 3행으로 접힌
 * 카드라 두 배 가까이 높다. 종목명이 길어 줄바꿈되는 경우도 있다.
 *
 * 행이 maxRows개 이하면 높이를 묶지 않는다(스크롤이 생기지 않는다).
 *
 * @param rowSelector 스크롤 영역 안에서 '행'을 고르는 선택자. 헤더 행은 빠져야 한다
 */
export function useRowLimit<T extends HTMLElement>(
  { mobile, desktop }: RowLimit,
  rowCount: number,
  rowSelector: string,
): RefObject<T | null> {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const container = ref.current;
    if (!container) return;

    const apply = () => {
      // 폭이 md를 넘나들면 컨테이너 폭도 바뀌어 아래 ResizeObserver가 다시 부른다
      // matchMedia가 없는 환경(jsdom)에서는 데스크톱으로 본다. 어차피 레이아웃이 없어 묶이지 않는다
      const isDesktop = window.matchMedia?.(DESKTOP_QUERY).matches ?? true;
      const maxRows = isDesktop ? desktop : mobile;
      const rows = container.querySelectorAll<HTMLElement>(rowSelector);
      const firstHidden = rows[maxRows];

      // 컨테이너 기준 좌표를 얻으려고 getBoundingClientRect 차이를 쓴다(스크롤 위치 보정 포함)
      const limit = firstHidden
        ? firstHidden.getBoundingClientRect().top -
          container.getBoundingClientRect().top +
          container.scrollTop
        : 0;

      // jsdom처럼 레이아웃이 없는 환경에서는 0이 나온다. 그때 묶으면 표가 통째로 사라진다
      container.style.maxHeight = limit > 0 ? `${limit}px` : '';
    };

    apply();

    /*
     * 다시 재야 하는 경우가 둘이다.
     * - 화면 폭이 바뀌어 행 높이가 바뀔 때 → 컨테이너를 본다
     * - 시세가 도착해 스켈레톤 자리가 실제 값으로 바뀌며 행이 높아질 때 → 컨테이너는 이미
     *   maxHeight에 묶여 크기가 그대로라 신호가 오지 않는다. 그래서 안쪽 자식(헤더·행 묶음)도 본다
     */
    const observer = new ResizeObserver(apply);
    observer.observe(container);
    for (const child of container.children) observer.observe(child);
    return () => observer.disconnect();
  }, [mobile, desktop, rowCount, rowSelector]);

  return ref;
}

/**
 * 선택된 행이 스크롤 영역 밖에 있으면 영역 안에서만 스크롤해 보이게 한다.
 *
 * 종목을 추가하면 새 행이 맨 아래에 붙고 곧바로 선택된다. 5개를 넘는 목록이면 그 행이 가려진
 * 채로 선택되어, 무엇이 추가됐는지 보이지 않는다.
 *
 * scrollIntoView를 쓰지 않는 이유: 그건 페이지 전체도 함께 스크롤한다. 시뮬레이터를 보고
 * 있는데 화면이 표 쪽으로 튀면 안 된다.
 */
export function useKeepRowVisible(
  containerRef: RefObject<HTMLElement | null>,
  selector: string | null,
): void {
  useEffect(() => {
    const container = containerRef.current;
    if (!container || selector === null) return;

    const row = container.querySelector<HTMLElement>(selector);
    if (!row) return;

    const containerTop = container.getBoundingClientRect().top;
    const rowTop = row.getBoundingClientRect().top - containerTop + container.scrollTop;
    const rowBottom = rowTop + row.offsetHeight;

    // 위에 고정된 헤더 행만큼은 가려지므로 그 높이를 빼고 본다
    const header = container.querySelector<HTMLElement>('[data-sticky-header]');
    const visibleTop = container.scrollTop + (header?.offsetHeight ?? 0);
    const visibleBottom = container.scrollTop + container.clientHeight;

    if (rowTop < visibleTop) {
      container.scrollTop = rowTop - (header?.offsetHeight ?? 0);
    } else if (rowBottom > visibleBottom) {
      container.scrollTop = rowBottom - container.clientHeight;
    }
  }, [containerRef, selector]);
}
