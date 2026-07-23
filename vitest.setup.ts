import '@testing-library/jest-dom/vitest';

/**
 * jsdom에는 ResizeObserver가 없다.
 * Radix Slider와 recharts ResponsiveContainer가 마운트 시 이걸 요구하므로 스텁을 넣는다.
 */
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
