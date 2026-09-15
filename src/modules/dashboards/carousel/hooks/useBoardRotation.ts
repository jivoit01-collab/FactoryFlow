import { useCallback, useEffect, useRef, useState } from 'react';

import {
  DEFAULT_DWELL_SECONDS,
  DWELL_STORAGE_KEY,
  PAUSED_STORAGE_KEY,
  TICK_MS,
} from '../constants';

/** A stored number, or the fallback when nothing usable is there. */
function readNumber(key: string, fallback: number): number {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw === null ? NaN : Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  } catch {
    // Private windows and locked-down kiosk browsers throw on the accessor
    // itself. A wall screen must still rotate.
    return fallback;
  }
}

/** A stored flag, defaulting to running. */
function readFlag(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

/** Best-effort write. A screen that cannot remember its dwell still shows it. */
function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* no-op */
  }
}

export interface BoardRotation {
  /** Index into the slide list the caller passed the length of. */
  index: number;
  /** How far through this board's turn, 0–1. Drives the progress bar. */
  progress: number;
  paused: boolean;
  dwellSeconds: number;
  /** Whole seconds left on this board, for the countdown on the strip. */
  remaining: number;
  next: () => void;
  previous: () => void;
  goTo: (index: number) => void;
  togglePaused: () => void;
  setDwellSeconds: (seconds: number) => void;
}

/**
 * The timer behind the carousel.
 *
 * Kept out of the page because the page is mostly markup and a board of
 * somebody else's, and because the two things that make this tricky are both
 * invisible in JSX:
 *
 * WALL CLOCK, NOT TICK COUNT. The elapsed figure is `Date.now()` minus the
 * moment this board came up, never an accumulator advanced by the interval.
 * Browsers throttle timers in a background tab to roughly once a second and a
 * screen left on a wall spends most of its life in exactly that state; counting
 * ticks would make the board drift slower the longer nobody touched it. Reading
 * the clock means a throttled tab catches up in one step.
 *
 * NO TIMER WHILE PAUSED. Pausing clears the interval rather than skipping the
 * body, so a paused board costs nothing and cannot accumulate a backlog of
 * advances that all fire when it resumes.
 *
 * @param count how many slides there are; 0 disables the timer entirely
 */
export function useBoardRotation(count: number): BoardRotation {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(() => readFlag(PAUSED_STORAGE_KEY));
  const [dwellSeconds, setDwell] = useState(() =>
    readNumber(DWELL_STORAGE_KEY, DEFAULT_DWELL_SECONDS),
  );
  const [progress, setProgress] = useState(0);

  /**
   * When the current board came up.
   *
   * A ref rather than state — it is read by the interval, not rendered — and it
   * is stamped by the interval effect below rather than here, because reading
   * the clock during a render is exactly the kind of impurity that makes a
   * value differ between two renders React thought were the same. Zero until
   * the first effect runs, which is before the first tick can read it.
   */
  const startedAt = useRef(0);

  /** Put a board on screen and give it a full turn, however it was chosen. */
  const show = useCallback((next: number) => {
    setProgress(0);
    setIndex(next);
  }, []);

  /**
   * The index actually in use.
   *
   * A slide can disappear under the rotation — a permissions reload, a board
   * that hid itself — leaving the stored index past the end of the list.
   * Clamping on the way out rather than correcting the state in an effect: the
   * effect would be a render caused by a render, and there is nothing to
   * correct, since the very next advance lands back in range on its own.
   */
  const safeIndex = count > 0 ? Math.min(index, count - 1) : 0;

  const next = useCallback(() => {
    if (count > 0) show((safeIndex + 1) % count);
  }, [count, safeIndex, show]);

  const previous = useCallback(() => {
    if (count > 0) show((safeIndex - 1 + count) % count);
  }, [count, safeIndex, show]);

  const goTo = useCallback(
    (target: number) => {
      // A dot clicked on the board already up is ignored rather than treated as
      // a jump: the turn is stamped by the effect below, which only re-runs when
      // the index actually changes, so "restarting" here would zero the bar and
      // let the next tick snap it back to where it really was.
      if (target >= 0 && target < count && target !== safeIndex) show(target);
    },
    [count, safeIndex, show],
  );

  const togglePaused = useCallback(() => {
    setPaused((was) => {
      const now = !was;
      write(PAUSED_STORAGE_KEY, String(now));
      // Resuming restarts the turn rather than resuming a part-spent one:
      // whoever just un-paused wants to read this board, not to be moved off it
      // two seconds later. The clock itself is re-stamped by the effect, which
      // re-runs because `paused` is one of its dependencies.
      if (!now) setProgress(0);
      return now;
    });
  }, []);

  const setDwellSeconds = useCallback((seconds: number) => {
    setDwell(seconds);
    write(DWELL_STORAGE_KEY, String(seconds));
    setProgress(0);
  }, []);

  useEffect(() => {
    if (paused || count < 2) return;

    // This board's turn starts now. Stamped here and nowhere else, so there is
    // one owner of the clock: every way of changing the board — the tick, a
    // dot, an arrow key, a new dwell, a resume — moves one of this effect's
    // dependencies, so the turn is restarted by the same line each time.
    startedAt.current = Date.now();

    const id = window.setInterval(() => {
      const elapsed = (Date.now() - startedAt.current) / 1000;
      if (elapsed >= dwellSeconds) {
        startedAt.current = Date.now();
        setProgress(0);
        setIndex((current) => (current + 1) % count);
        return;
      }
      setProgress(elapsed / dwellSeconds);
    }, TICK_MS);

    return () => window.clearInterval(id);
    // `index` is in the list so that a manual jump restarts the interval phase
    // with the board rather than leaving up to one tick of the old turn on it.
  }, [paused, count, dwellSeconds, safeIndex]);

  return {
    index: safeIndex,
    progress,
    paused,
    dwellSeconds,
    remaining: Math.max(0, Math.ceil(dwellSeconds * (1 - progress))),
    next,
    previous,
    goTo,
    togglePaused,
    setDwellSeconds,
  };
}
