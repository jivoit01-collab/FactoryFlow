import { createContext, useContext } from 'react';

/**
 * Whether a control board is being shown inside another screen.
 *
 * Exactly one consumer today: the board carousel mounts the Admin, Plant and
 * Logistics pages one at a time behind its own chrome. Those pages each draw a
 * fullscreen button and (Logistics and Plant) a settings cog in their topbar,
 * and both are wrong once the page is a slide rather than a destination:
 *
 *  - the fullscreen button promotes the BOARD element, so the carousel's own
 *    strip — dots, timer, controls — drops out of view, and the next rotation
 *    unmounts the element the browser is showing fullscreen, which exits
 *    fullscreen on its own. A wall screen would fall out of fullscreen once a
 *    minute with nobody standing at it.
 *  - the cog navigates away from the carousel entirely.
 *
 * Done as a context read by `OpsTopbar` rather than as a prop on all three
 * pages: the pages pass `onToggleFullscreen` unconditionally, so suppressing it
 * at the one component that renders it is a single change instead of three, and
 * a fourth board added later inherits the behaviour without knowing the
 * carousel exists.
 *
 * Defaults to false, so every board rendered at its own route is untouched.
 *
 * Split from its provider for the same reason `boardDay.context` is: a file
 * that exports both a component and a hook loses fast refresh.
 */
export const BoardEmbedContext = createContext(false);

/** True when this board is a slide inside another screen. */
export function useBoardEmbed(): boolean {
  return useContext(BoardEmbedContext);
}
