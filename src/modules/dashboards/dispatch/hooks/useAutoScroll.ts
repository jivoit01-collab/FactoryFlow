import { type RefObject, useEffect } from 'react';

/** Pixels per tick and tick length — slow enough to read a vehicle number. */
const STEP_PX = 1;
const TICK_MS = 50;
/** Beat at each end so the first and last rows are actually readable. */
const PAUSE_TICKS = 60;

/**
 * Creep a list past the viewer and turn around at the ends, so a queue longer
 * than the panel still gets seen on a screen nobody scrolls.
 *
 * Bouncing rather than looping is deliberate: a wrap-to-top needs the content
 * duplicated to avoid a visible jump, and duplicated rows on an ops board read
 * as duplicated trucks. Pauses while the pointer is over the list, so anyone who
 * does walk up and grab it can read in peace.
 */
export function useAutoScroll(ref: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    let direction = 1;
    let pause = PAUSE_TICKS;
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
        pause = PAUSE_TICKS;
      } else if (next <= 0) {
        el.scrollTop = 0;
        direction = 1;
        pause = PAUSE_TICKS;
      } else {
        el.scrollTop = next;
      }
    }, TICK_MS);

    return () => {
      window.clearInterval(id);
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointerleave', onLeave);
    };
    // `enabled` flips when the list becomes long enough to need scrolling.
  }, [ref, enabled]);
}
