'use client';

import { useEffect, useState } from 'react';
import { isMarketOpen } from './market-hours';

/** 장 상태 표시를 다시 맞추는 주기. 09:00/15:30 경계를 이 시간 안에 따라잡는다. */
const TICK_MS = 30_000;

/**
 * 지금 장이 열려 있는지. 아직 모르면 null.
 *
 * 첫 렌더에서 반드시 null을 낸다. 서버와 클라이언트가 각자 new Date()를 부르면
 * 경계 부근에서 서로 다른 값이 나와 hydration mismatch가 나기 때문이다. 게다가
 * app/page.tsx는 dynamic API를 쓰지 않아 빌드 타임에 프리렌더되므로, 서버가 보는
 * '지금'은 사용자의 지금이 아니라 빌드 시각이다. 새벽에 빌드하면 '장 마감'이 HTML에
 * 그대로 박힌다.
 *
 * 그래서 판정은 전부 마운트 이후로 미룬다. null인 동안 호출부는 장 관련 UI를 아예
 * 그리지 않으므로 SSR 결과와 항상 일치한다.
 *
 * 렌더 출력에 쓰지 않는 값(React-Query의 refetchInterval처럼 타이머 컨텍스트에서만
 * 평가되는 값)은 이 훅을 거칠 필요 없이 isMarketOpen(new Date())을 직접 부르면 된다.
 */
export function useMarketOpen(): boolean | null {
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    const tick = () => setOpen(isMarketOpen(new Date()));

    tick();
    const timer = setInterval(tick, TICK_MS);
    return () => clearInterval(timer);
  }, []);

  return open;
}
