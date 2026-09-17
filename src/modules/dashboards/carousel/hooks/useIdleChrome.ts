import { useCallback, useEffect, useState } from 'react';

import { CHROME_IDLE_MS } from '../constants';

/**
 * Show the carousel's controls while somebody is there, hide them when nobody is.
 *
 * A wall screen has no pointer on it for weeks at a time, and a control strip
 * that never goes away is a permanent band of chrome across the top of a board
 * designed as one viewport. So the strip fades out after a few idle seconds and
 * comes straight back on any pointer or key.
 *
 * The strip is faded rather than removed from the layout: a strip that took its
 * height back would reflow every board beneath it each time somebody moved the
 * mouse, and `--u` is a viewport unit, so the whole board would resize twice a
 * second while a hand was on the desk.
 *
 * It never hides while the rotation is held. Held means a person stopped it to
 * read one board, and the controls are how they start it again.
 *
 * @param alwaysShow keep the strip up regardless — the rotation is held
 */
export function useIdleChrome(alwaysShow: boolean): { visible: boolean; wake: () => void } {
  const [hidden, setHidden] = useState(false);
  /**
   * A counter, not a timestamp.
   *
   * All this value does is re-run the effect below, and bumping an integer does
   * that without reading the clock during a render.
   */
  const [activity, setActivity] = useState(0);

  const wake = useCallback(() => {
    setHidden(false);
    setActivity((count) => count + 1);
  }, []);

  useEffect(() => {
    // No timer at all while the strip is pinned up, rather than a timer whose
    // result is discarded — the effect re-runs on every pointer move, and a
    // held board can sit there for an afternoon.
    if (alwaysShow) return;

    const id = window.setTimeout(() => setHidden(true), CHROME_IDLE_MS);
    return () => window.clearTimeout(id);
  }, [alwaysShow, activity]);

  useEffect(() => {
    // Pointer movement and key presses both count. Listening on the window
    // rather than on the shell means a click anywhere in the app chrome above
    // the board wakes the strip too.
    const events: (keyof WindowEventMap)[] = ['pointermove', 'pointerdown', 'keydown'];
    events.forEach((event) => window.addEventListener(event, wake));
    return () => events.forEach((event) => window.removeEventListener(event, wake));
  }, [wake]);

  return { visible: alwaysShow || !hidden, wake };
}
