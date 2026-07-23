'use client';

import { motion } from 'motion/react';

interface GapGaugeProps {
  currentPrice: number;
  avgPrice: number;
  newAvgPrice: number;
}

/** 세 가격을 0~100 스케일 위에 배치한다. 양끝에 4% 여백을 둬서 마커가 잘리지 않게 한다. */
function toPositions({ currentPrice, avgPrice, newAvgPrice }: GapGaugeProps) {
  const low = Math.min(currentPrice, avgPrice) * 0.96;
  const high = Math.max(currentPrice, avgPrice) * 1.04;
  const span = high - low;

  const at = (price: number) =>
    span === 0 ? 50 : Math.max(0, Math.min(100, ((price - low) / span) * 100));

  const current = at(currentPrice);
  let newAvgLabel = at(newAvgPrice);

  // 현재가 라벨과 새 평단 라벨이 겹치면 최소 간격만큼 밀어낸다
  if (Math.abs(newAvgLabel - current) < 14) {
    newAvgLabel = Math.max(0, Math.min(100, current + (newAvgLabel >= current ? 14 : -14)));
  }

  return {
    current,
    avg: at(avgPrice),
    newAvg: at(newAvgPrice),
    newAvgLabel,
  };
}

const MARKER =
  'absolute -top-[5px] size-3.5 -translate-x-1/2 rounded-full border-[3px] border-white shadow-[0_1px_3px_rgba(0,0,0,0.2)]';

/** 현재가 · 기존 평단 · 새 평단의 위치 관계를 한 줄로 보여주는 게이지 */
export function GapGauge(props: GapGaugeProps) {
  const pos = toPositions(props);
  const spring = { type: 'spring', stiffness: 260, damping: 30 } as const;

  return (
    // 위쪽 여백은 '기존 평단' 라벨(-26px)이 섹션 제목과 겹치지 않을 만큼 준다
    <div className="mx-1.5 mt-8 mb-7">
      <div className="bg-track relative h-1.5 rounded-[3px]">
        <motion.span
          className={`${MARKER} bg-brand`}
          animate={{ left: `${pos.current}%` }}
          transition={spring}
        />
        <motion.span
          className={`${MARKER} bg-[#b0b8c1]`}
          animate={{ left: `${pos.avg}%` }}
          transition={spring}
        />
        <motion.span
          className={`${MARKER} bg-foreground`}
          animate={{ left: `${pos.newAvg}%` }}
          transition={spring}
        />

        <motion.span
          className="text-brand absolute top-3.5 -translate-x-1/2 text-[10.5px] font-semibold whitespace-nowrap"
          animate={{ left: `${pos.current}%` }}
          transition={spring}
        >
          현재가
        </motion.span>
        <motion.span
          className="text-muted-foreground absolute -top-[26px] -translate-x-1/2 text-[10.5px] font-semibold whitespace-nowrap"
          animate={{ left: `${pos.avg}%` }}
          transition={spring}
        >
          기존 평단
        </motion.span>
        <motion.span
          className="text-foreground absolute top-3.5 -translate-x-1/2 text-[10.5px] font-bold whitespace-nowrap"
          animate={{ left: `${pos.newAvgLabel}%` }}
          transition={spring}
        >
          새 평단
        </motion.span>
      </div>
    </div>
  );
}
