import { createContext, useContext, useEffect } from 'react';

/**
 * Lets one page opt out of the layout's centred container.
 *
 * Every page normally sits in `container mx-auto`, which caps the content at
 * the breakpoint width — 1536px at 2xl — and centres what is left. That is
 * right for a form or a register read at a desk, and wrong for a wall board:
 * on a 1920px screen it throws away the better part of 400px, which on the line
 * board is a whole tile's worth of column.
 *
 * A context rather than a route flag because the decision belongs to the page,
 * not to the router: the same board is full width whichever path reaches it,
 * and a page can change its mind (wall mode) without the route config moving.
 */
export const PageWidthContext = createContext<((fullWidth: boolean) => void) | null>(null);

/**
 * Take the full width of the main area for as long as this page is mounted.
 *
 * Released on unmount, so a page that navigates away leaves the next one in
 * the ordinary centred container.
 */
export function useFullWidthPage(enabled = true): void {
  const setFullWidth = useContext(PageWidthContext);

  useEffect(() => {
    if (!setFullWidth || !enabled) return;
    setFullWidth(true);
    return () => setFullWidth(false);
  }, [setFullWidth, enabled]);
}
