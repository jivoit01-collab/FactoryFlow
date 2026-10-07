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
  /**
   * How far through this board's turn, 0–1, as of the countdown's last whole
   * second. Coarse on purpose; see the tick below.
   */
  progress: number;
  /**
   * Names this board's turn: a new value whenever a turn starts over, the same
   * one for as long as it runs or is held. Null when nothing rotates.
   *
   * The progress bar is keyed on it. The bar is a CSS animation that fills
   * itself over the dwell, so all it needs from here is when to start again.
   */
  turn: string | null;
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
   * How many turns have started. Bumped alongside every zeroing of `progress`.
   *
   * Not the index: a slide dropped from under the rotation can leave the next
   * advance landing on the same clamped index, and that board still gets a
   * fresh turn, so the bar has to start again too.
   */
  const [turns, setTurns] = useState(0);

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

  /** Zero the countdown and start the bar again. The clock is the effect's. */
  const restart = useCallback(() => {
    setProgress(0);
    setTurns((n) => n + 1);
  }, []);

  /** Put a board on screen and give it a full turn, however it was chosen. */
  const show = useCallback(
    (next: number) => {
      restart();
      setIndex(next);
    },
    [restart],
  );

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
      if (!now) restart();
      return now;
    });
  }, [restart]);

  const setDwellSeconds = useCallback(
    (seconds: number) => {
      setDwell(seconds);
      write(DWELL_STORAGE_KEY, String(seconds));
      restart();
    },
    [restart],
  );

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
        restart();
        setIndex((current) => (current + 1) % count);
        return;
      }
      // Only when the countdown's whole second changes. The bar no longer reads
      // this, and every new value re-renders the board underneath: at the tick
      // rate that was four whole-board renders a second, for a number that
      // moves once.
      const fraction = elapsed / dwellSeconds;
      setProgress((was) =>
        Math.ceil(dwellSeconds * (1 - was)) === Math.ceil(dwellSeconds * (1 - fraction))
          ? was
          : fraction,
      );
    }, TICK_MS);

    return () => window.clearInterval(id);
    // `index` is in the list so that a manual jump restarts the interval phase
    // with the board rather than leaving up to one tick of the old turn on it.
  }, [paused, count, dwellSeconds, safeIndex, restart]);

  return {
    index: safeIndex,
    progress,
    // `count` too: a board added or dropped re-runs the effect, which restarts
    // the clock without going through `restart`.
    turn: count < 2 ? null : `${turns}:${count}`,
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
