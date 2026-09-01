import { type RefObject, useEffect } from 'react';

/** Pixels per tick and tick length — slow enough to read a contractor's name. */
const STEP_PX = 1;
const TICK_MS = 50;

/**
 * Creep a list past the viewer and turn around at the ends, so a list longer
 * than its panel still gets seen on a screen nobody scrolls.
 *
 * The same idea as the dispatch board's `useAutoScroll`, with one difference
 * that earned its own copy: the pause at each end is a **setting** here, not a
 * constant. A wall in the admin's room and a wall by the gate want different
 * reading speeds, and the expense board exposes that on its Configuration page.
 *
 * Bouncing rather than looping is deliberate — a wrap-to-top needs the rows
 * duplicated to hide the jump, and duplicated rows on a cost board read as
 * duplicated spend. Pauses while the pointer is over the list so anyone who
 * does walk up can read in peace.
 */
export function useCreepScroll(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
  pauseSeconds: number,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    const pauseTicks = Math.max(1, Math.round((pauseSeconds * 1000) / TICK_MS));
    let direction = 1;
    let pause = pauseTicks;
    let hovered = false;

    const onEnter = () => {
      hovered = true;
    };
    const onLeave = () => {
      hovered = false;
    };
    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointerleave', onLeave);

    const id = window.setInterval(() => {
      if (hovered) return;

      const overflow = el.scrollHeight - el.clientHeight;
      if (overflow <= 1) return;

      if (pause > 0) {
        pause -= 1;
        return;
      }

      const next = el.scrollTop + STEP_PX * direction;
      if (next >= overflow) {
        el.scrollTop = overflow;
        direction = -1;
        pause = pauseTicks;
      } else if (next <= 0) {
        el.scrollTop = 0;
        direction = 1;
        pause = pauseTicks;
      } else {
        el.scrollTop = next;
      }
    }, TICK_MS);

    return () => {
      window.clearInterval(id);
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [ref, enabled, pauseSeconds]);
}
