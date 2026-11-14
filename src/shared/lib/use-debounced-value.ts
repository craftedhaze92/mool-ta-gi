'use client';

import { useEffect, useState } from 'react';

/** 값이 delay 동안 바뀌지 않아야 반영한다. 타이핑마다 요청이 나가지 않게 할 때 쓴다. */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
