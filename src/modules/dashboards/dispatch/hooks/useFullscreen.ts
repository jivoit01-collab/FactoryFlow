import { type RefObject, useCallback, useEffect, useState } from 'react';

/**
 * Native fullscreen for one element — the wall-mode switch.
 *
 * Fullscreen is only granted from a user gesture, and a browser that refuses
 * rejects the promise; swallow that rather than letting an unhandled rejection
 * surface on a screen nobody is standing at. `fullscreenchange` is the source of
 * truth for the flag, so Esc (which never routes through our handler) still
 * leaves the component in the right state.
 */
export function useFullscreen(ref: RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const sync = () => setIsFullscreen(document.fullscreenElement === ref.current);
    document.addEventListener('fullscreenchange', sync);
    sync();
    return () => document.removeEventListener('fullscreenchange', sync);
  }, [ref]);

  const toggle = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
      return;
    }
    void ref.current?.requestFullscreen?.().catch(() => undefined);
  }, [ref]);

  return { isFullscreen, toggle };
}
