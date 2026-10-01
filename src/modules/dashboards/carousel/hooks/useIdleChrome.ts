import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';

import { CHROME_IDLE_MS, CHROME_REVEAL_PX } from '../constants';

/**
 * Show the carousel's controls when somebody reaches for them, and only then.
 *
 * A wall screen has no pointer on it for weeks at a time, and a control strip
 * that never goes away is a permanent band of chrome across the top of a board
 * designed as one viewport. So the strip is hidden until the pointer comes to
 * the very top of the screen — within `CHROME_REVEAL_PX` of the strip's own top
 * edge — and goes again the moment it moves back down onto the board.
 *
 * Only the very top, not any movement. The strip floats over each board's own
 * header, and with every pointer move summoning it, somebody reaching for a
 * board's month arrows brought the strip up over the arrows every single time:
 * the board's own controls could not be used inside the carousel at all. For
 * the same reason a click or a key elsewhere no longer wakes it, and holding
 * the rotation no longer pins it up — a held board is exactly the one somebody
 * is reading, header included. The keyboard shortcuts work without the strip,
 * and the progress line along the top edge still says the screen is a rotation.
 *
 * While shown it stays for as long as the pointer is over it or one of its
 * controls has focus (the dwell picker's list hangs below the strip), and
 * otherwise fades after `CHROME_IDLE_MS` without movement.
 *
 * The strip is faded rather than removed from the layout: a strip that took its
 * height back would reflow every board beneath it each time it appeared, and
 * `--u` is a viewport unit, so the whole board would resize with it.
 *
 * @param rowRef the strip's control row — what "over it" is measured against
 */
export function useIdleChrome(rowRef: RefObject<HTMLElement | null>): {
  visible: boolean;
  wake: () => void;
} {
  const [hidden, setHidden] = useState(false);
  /**
   * A counter, not a timestamp: all it does is restart the idle timer below,
   * and bumping an integer does that without reading the clock during a render.
   */
  const [activity, setActivity] = useState(0);
  /** The pointer is over the row, so the idle timer must not hide it. */
  const overRow = useRef(false);

  const wake = useCallback(() => {
    setHidden(false);
    setActivity((count) => count + 1);
  }, []);

  /** Focus is on one of the row's controls — a select open, a button tabbed to. */
  const focusInRow = useCallback(() => {
    const row = rowRef.current;
    return Boolean(row && document.activeElement && row.contains(document.activeElement));
  }, [rowRef]);

  useEffect(() => {
    if (hidden) return;
    const id = window.setTimeout(() => {
      if (!overRow.current && !focusInRow()) setHidden(true);
    }, CHROME_IDLE_MS);
    return () => window.clearTimeout(id);
  }, [hidden, activity, focusInRow]);

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      const rect = rowRef.current?.getBoundingClientRect();
      // Measured from the strip, not the window: off fullscreen the app's own
      // header sits above the carousel, and the strip's top is the "top".
      const top = Math.max(0, rect?.top ?? 0);
      const bottom = rect?.bottom ?? top;

      if (event.clientY <= top + CHROME_REVEAL_PX) {
        overRow.current = true;
        wake();
        return;
      }

      overRow.current = event.clientY <= bottom;
      if (overRow.current) {
        // Moving over a strip that is showing keeps it; over one that has
        // faded does not bring it back — only the top edge does.
        setActivity((count) => count + 1);
        return;
      }

      // Back down on the board: gone at once, so the header underneath is
      // usable straight away rather than four seconds later.
      if (!focusInRow()) setHidden(true);
    };

    window.addEventListener('pointermove', onPointer);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, [rowRef, wake, focusInRow]);

  return { visible: !hidden, wake };
}
