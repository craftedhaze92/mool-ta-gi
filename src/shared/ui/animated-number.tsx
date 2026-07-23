'use client';

import { useEffect, useRef } from 'react';
import { animate, useMotionValue, useReducedMotion } from 'motion/react';

interface AnimatedNumberProps {
  value: number;
  /**
   * 숫자를 문자열로 바꾸는 함수.
   * 매 프레임 호출되므로 렌더마다 새로 만들지 말고 모듈 스코프나 useCallback으로 고정할 것.
   */
  format: (value: number) => string;
  className?: string;
  /** 초 단위. 기본 0.4 */
  duration?: number;
}

/**
 * 값이 바뀔 때 이전 값에서 새 값으로 카운팅하며 넘어가는 숫자.
 *
 * 최초 렌더는 최종 값을 그대로 뿌려서 하이드레이션 불일치를 만들지 않는다.
 * prefers-reduced-motion을 켠 사용자에게는 애니메이션 없이 값만 갱신한다.
 */
export function AnimatedNumber({ value, format, className, duration = 0.4 }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const current = useMotionValue(value);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (prefersReducedMotion) {
      current.set(value);
      node.textContent = format(value);
      return;
    }

    const controls = animate(current, value, {
      duration,
      ease: 'easeOut',
      onUpdate: (latest) => {
        node.textContent = format(latest);
      },
    });

    return () => controls.stop();
  }, [value, format, duration, prefersReducedMotion, current]);

  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  );
}
