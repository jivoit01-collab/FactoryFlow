import { useCallback, useEffect, useRef, useState } from 'react';

/** How long each section holds the stage. */
export const SECTION_DWELL_MS = 12_000;

/** How often the progress bar is refreshed. Not how often the stage changes. */
const TICK_MS = 100;

export interface SectionRotation {
  /** Index into the section list whose length was passed in. */
  index: number;
  /** How far through this section's turn, 0–1. Drives the progress bar. */
  progress: number;
  /** Whether the timer is currently stopped, for whatever reason. */
  paused: boolean;
  goTo: (index: number) => void;
  next: () => void;
  previous: () => void;
}

/**
 * Whether this viewer has asked for less motion.
 *
 * Read once per mount and then watched: a wall screen is set up and left, and
 * somebody changing the OS setting should not have to reload the page to be
 * obeyed.
 */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      // Older browsers, and any environment without matchMedia — jsdom in a
      // test run, for one. Motion is the documented default.
      return false;
    }
  });

  useEffect(() => {
    let query: MediaQueryList;
    try {
      query = window.matchMedia('(prefers-reduced-motion: reduce)');
    } catch {
      return;
    }
    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

/**
 * The timer behind the rotating stage.
 *
 * Two mechanics are taken from `carousel/hooks/useBoardRotation`, because both
 * were learned on a real wall screen and both are invisible in JSX:
 *
 * **Wall clock, not tick count.** Elapsed time is `Date.now()` minus the moment
 * this section came up, never an accumulator advanced by the interval. Browsers
 * throttle timers in a background tab to roughly once a second, and a dashboard
 * left open on a second monitor spends most of its life in exactly that state;
 * counting ticks would make it rotate slower the longer nobody looked at it.
 * Reading the clock lets a throttled tab catch up in one step.
 *
 * **No timer while paused.** Pausing clears the interval rather than skipping
 * the body, so a paused stage costs nothing and cannot build a backlog of
 * advances that all fire at once when it resumes.
 *
 * WHAT THIS ONE ADDS: it does not own the pause. The page does, because the
 * reasons to stop are things only the page can see — a pointer resting on the
 * stage, focus inside it, a row the reader has selected. A display that rotates
 * away from the row somebody just clicked is worse than one that never rotates.
 *
 * Reduced motion stops the rotation entirely rather than merely speeding it up.
 * The tabs still work, so nothing becomes unreachable; it just waits to be
 * asked.
 *
 * @param count how many sections there are; fewer than two disables the timer
 * @param paused stop the clock — the page's call, not this hook's
 */
export function useSectionRotation(count: number, paused = false): SectionRotation {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  // Zero, not Date.now(): reading the clock during render is impure, and this
  // value is never used before the effect below stamps it.
  const startedAt = useRef(0);
  const reducedMotion = useReducedMotion();

  const stopped = paused || reducedMotion || count < 2;

  // A section list that shrinks under a stale index must not blank the stage.
  const safeIndex = count > 0 ? Math.min(index, count - 1) : 0;

  const goTo = useCallback(
    (next: number) => {
      if (count < 1) return;
      setIndex(((next % count) + count) % count);
      setProgress(0);
    },
    [count],
  );

  const next = useCallback(() => goTo(safeIndex + 1), [goTo, safeIndex]);
  const previous = useCallback(() => goTo(safeIndex - 1), [goTo, safeIndex]);

  useEffect(() => {
    if (stopped) return;

    // This section's turn starts now. Stamped here and nowhere else, so there
    // is one owner of the clock: every way of changing section — the tick, a
    // tab, an arrow key, a resume — moves one of this effect's dependencies,
    // so the turn is restarted by the same line each time.
    startedAt.current = Date.now();

    const id = window.setInterval(() => {
      const elapsed = Date.now() - startedAt.current;
      if (elapsed >= SECTION_DWELL_MS) {
        startedAt.current = Date.now();
        setProgress(0);
        setIndex((current) => (current + 1) % count);
        return;
      }
      setProgress(elapsed / SECTION_DWELL_MS);
    }, TICK_MS);

    return () => window.clearInterval(id);
    // `safeIndex` is a dependency so a manual jump restarts the interval phase
    // with the section, rather than leaving up to one tick of the old turn on
    // it.
  }, [stopped, count, safeIndex]);

  return {
    index: safeIndex,
    // Derived, not stored. A stopped clock keeps its last `progress` in state
    // and the effect above re-stamps `startedAt` on resume, so reporting zero
    // here does two things at once: whoever just moved the pointer away gets a
    // whole turn to read rather than the tail of a spent one, and the bar
    // cannot flash its old width for the 100ms before the first tick lands.
    //
    // It was an effect that called setProgress(0) on stop. Same result, one
    // more render, and a lint rule that is right to dislike it.
    progress: stopped ? 0 : progress,
    paused: stopped,
    goTo,
    next,
    previous,
  };
}
