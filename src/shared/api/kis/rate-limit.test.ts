import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetRateLimit, paced } from './rate-limit';

/**
 * 실제 간격이 1.2초라 가짜 타이머로 돌린다. 진짜로 기다리면 테스트가 몇 초씩 걸린다.
 */
beforeEach(() => {
  vi.useFakeTimers();
  __resetRateLimit();
});

afterEach(() => {
  vi.useRealTimers();
});

/** 각 task가 실행된 시각을 기록하는 헬퍼 */
function tracker() {
  const startedAt: number[] = [];
  return {
    startedAt,
    task: (label?: string) => () => {
      startedAt.push(Date.now());
      return Promise.resolve(label);
    },
  };
}

describe('paced', () => {
  it('첫 호출은 기다리지 않는다', async () => {
    const { startedAt, task } = tracker();
    const before = Date.now();

    const promise = paced(task());
    await vi.advanceTimersByTimeAsync(0);
    await promise;

    expect(startedAt[0] - before).toBe(0);
  });

  it('연속 호출 사이에 최소 간격을 둔다', async () => {
    const { startedAt, task } = tracker();

    const promises = [paced(task()), paced(task()), paced(task())];
    await vi.advanceTimersByTimeAsync(5000);
    await Promise.all(promises);

    expect(startedAt).toHaveLength(3);
    // 실측 한도가 초당 약 1건이라 1.2초 간격을 지켜야 한다
    expect(startedAt[1] - startedAt[0]).toBeGreaterThanOrEqual(1200);
    expect(startedAt[2] - startedAt[1]).toBeGreaterThanOrEqual(1200);
  });

  it('호출한 순서대로 실행한다', async () => {
    const { task } = tracker();

    const promises = [paced(task('a')), paced(task('b')), paced(task('c'))];
    await vi.advanceTimersByTimeAsync(5000);

    expect(await Promise.all(promises)).toEqual(['a', 'b', 'c']);
  });

  /*
   * 이게 깨지면 KIS가 한 번 실패했을 때 그 뒤의 모든 시세 조회가 영원히 멈춘다.
   * 큐에 task가 아니라 게이트만 이어 붙이는 이유다.
   */
  it('실패한 호출이 뒤따르는 호출을 막지 않는다', async () => {
    const { startedAt, task } = tracker();

    const failing = paced(() => Promise.reject(new Error('boom')));
    const next = paced(task());

    await expect(failing).rejects.toThrow('boom');
    await vi.advanceTimersByTimeAsync(5000);
    await next;

    expect(startedAt).toHaveLength(1);
  });

  it('충분히 시간이 지난 뒤의 호출은 기다리지 않는다', async () => {
    const { startedAt, task } = tracker();

    const first = paced(task());
    await vi.advanceTimersByTimeAsync(0);
    await first;

    // 간격보다 오래 쉬었다면 다음 호출은 곧바로 나가야 한다
    await vi.advanceTimersByTimeAsync(3000);
    const before = Date.now();
    const second = paced(task());
    await vi.advanceTimersByTimeAsync(0);
    await second;

    expect(startedAt[1] - before).toBe(0);
  });
});
