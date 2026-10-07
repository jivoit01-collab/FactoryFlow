import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_DWELL_SECONDS, DWELL_STORAGE_KEY, PAUSED_STORAGE_KEY } from '../../constants';
import { useBoardRotation } from '../useBoardRotation';

/**
 * The timer behind the wall rotation.
 *
 * Worth testing rather than eyeballing because the failure mode is invisible:
 * a board that advances a second early looks exactly like one that advances on
 * time, and a rotation that drifts only reveals itself after an afternoon on a
 * wall nobody is watching.
 */
describe('useBoardRotation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** Push the clock AND the timers on together — the hook reads both. */
  const advance = async (ms: number) => {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });
  };

  it('starts on the first board and stays there for the dwell', async () => {
    const { result } = renderHook(() => useBoardRotation(3));

    expect(result.current.index).toBe(0);

    await advance((DEFAULT_DWELL_SECONDS - 1) * 1000);
    expect(result.current.index).toBe(0);

    await advance(1500);
    expect(result.current.index).toBe(1);
  });

  it('comes back round to the first board rather than stopping at the last', async () => {
    const { result } = renderHook(() => useBoardRotation(3));

    await advance(DEFAULT_DWELL_SECONDS * 3 * 1000 + 1000);

    expect(result.current.index).toBe(0);
  });

  it('does not rotate a single board', async () => {
    const { result } = renderHook(() => useBoardRotation(1));

    await advance(DEFAULT_DWELL_SECONDS * 4 * 1000);

    expect(result.current.index).toBe(0);
  });

  it('holds where it is while paused, however long it is left', async () => {
    const { result } = renderHook(() => useBoardRotation(3));

    act(() => result.current.togglePaused());
    expect(result.current.paused).toBe(true);

    await advance(DEFAULT_DWELL_SECONDS * 10 * 1000);
    expect(result.current.index).toBe(0);
  });

  it('gives the board a full turn when the hold is released', async () => {
    const { result } = renderHook(() => useBoardRotation(3));

    // Most of the way through a turn, then held for a long while and released.
    await advance((DEFAULT_DWELL_SECONDS - 2) * 1000);
    act(() => result.current.togglePaused());
    await advance(60_000);
    act(() => result.current.togglePaused());

    // The two seconds that were left before the hold must NOT still be running
    // down — whoever released it wants to read this board.
    await advance(3_000);
    expect(result.current.index).toBe(0);

    await advance(DEFAULT_DWELL_SECONDS * 1000);
    expect(result.current.index).toBe(1);
  });

  it('gives a board reached by hand a full turn of its own', async () => {
    const { result } = renderHook(() => useBoardRotation(3));

    await advance((DEFAULT_DWELL_SECONDS - 3) * 1000);
    act(() => result.current.next());
    expect(result.current.index).toBe(1);

    // Three seconds in, the old turn would have expired. The new one has not.
    await advance(5_000);
    expect(result.current.index).toBe(1);
  });

  it('steps backwards past the first board to the last', () => {
    const { result } = renderHook(() => useBoardRotation(3));

    act(() => result.current.previous());

    expect(result.current.index).toBe(2);
  });

  it('ignores a jump to the board already showing', async () => {
    const { result } = renderHook(() => useBoardRotation(3));

    await advance(10_000);
    const progress = result.current.progress;
    act(() => result.current.goTo(0));

    // Clicking the active dot must not zero the bar and then let it snap back.
    expect(result.current.progress).toBe(progress);
  });

  /*
   * A wall screen spends its life in a background tab, where browsers throttle
   * timers to roughly once a second. Elapsed time is therefore read off the
   * clock, never accumulated per tick — so a rotation that lost most of its
   * ticks still catches up in a single step rather than drifting slower all day.
   */
  it('catches up in one step when its ticks were throttled away', async () => {
    const { result } = renderHook(() => useBoardRotation(3));

    await act(async () => {
      vi.setSystemTime(Date.now() + DEFAULT_DWELL_SECONDS * 3 * 1000);
      // One solitary tick after a long throttled gap.
      await vi.advanceTimersByTimeAsync(250);
    });

    expect(result.current.index).toBe(1);
  });

  it('remembers the dwell and the hold across a reload', () => {
    const first = renderHook(() => useBoardRotation(3));
    act(() => first.result.current.setDwellSeconds(120));
    act(() => first.result.current.togglePaused());

    expect(window.localStorage.getItem(DWELL_STORAGE_KEY)).toBe('120');
    expect(window.localStorage.getItem(PAUSED_STORAGE_KEY)).toBe('true');

    const second = renderHook(() => useBoardRotation(3));
    expect(second.result.current.dwellSeconds).toBe(120);
    expect(second.result.current.paused).toBe(true);
  });

  it('falls back to the default when the stored dwell is rubbish', () => {
    window.localStorage.setItem(DWELL_STORAGE_KEY, 'not-a-number');

    const { result } = renderHook(() => useBoardRotation(3));

    expect(result.current.dwellSeconds).toBe(DEFAULT_DWELL_SECONDS);
  });

  /*
   * The progress bar is a CSS animation keyed on `turn`: a new value mounts a
   * fresh bar at zero, an unchanged one leaves it running (or frozen, if held).
   */
  it('starts a new turn on every advance, and keeps it through a hold', async () => {
    const { result } = renderHook(() => useBoardRotation(3));
    const first = result.current.turn;

    act(() => result.current.togglePaused());
    // Held: the bar must freeze where it is, not remount at zero.
    expect(result.current.turn).toBe(first);

    act(() => result.current.togglePaused());
    // Released: a full turn, so a fresh bar.
    const released = result.current.turn;
    expect(released).not.toBe(first);

    await advance(DEFAULT_DWELL_SECONDS * 1000 + 500);
    expect(result.current.index).toBe(1);
    expect(result.current.turn).not.toBe(released);
  });

  it('starts the bar again when an advance lands back on the same board', async () => {
    const { result, rerender } = renderHook(({ count }) => useBoardRotation(count), {
      initialProps: { count: 3 },
    });

    await advance(DEFAULT_DWELL_SECONDS * 2 * 1000 + 1000);
    // The last board drops out: the stored index (2) clamps to 1, and the next
    // advance, (2 + 1) % 2, lands on 1 again.
    rerender({ count: 2 });
    const before = result.current.turn;

    await advance(DEFAULT_DWELL_SECONDS * 1000 + 500);
    expect(result.current.index).toBe(1);
    expect(result.current.turn).not.toBe(before);
  });

  it('has no turn when there is nothing to rotate', () => {
    const { result } = renderHook(() => useBoardRotation(1));

    expect(result.current.turn).toBeNull();
  });

  it('moves on once a second for the countdown, not on every tick', async () => {
    const { result } = renderHook(() => useBoardRotation(3));
    const seen = new Set([result.current.progress]);

    for (let tick = 0; tick < 40; tick += 1) {
      await advance(250);
      seen.add(result.current.progress);
    }

    // Forty ticks, ten whole seconds off the countdown. Each new value
    // re-renders the board underneath, so it must be the ten.
    expect(seen.size).toBe(11);
    expect(result.current.remaining).toBe(DEFAULT_DWELL_SECONDS - 10);
  });

  it('stays in range when a board disappears from under it', async () => {
    const { result, rerender } = renderHook(({ count }) => useBoardRotation(count), {
      initialProps: { count: 3 },
    });

    await advance(DEFAULT_DWELL_SECONDS * 2 * 1000 + 1000);
    expect(result.current.index).toBe(2);

    // A permissions reload drops the board that was showing.
    rerender({ count: 2 });

    expect(result.current.index).toBeLessThan(2);
  });
});
