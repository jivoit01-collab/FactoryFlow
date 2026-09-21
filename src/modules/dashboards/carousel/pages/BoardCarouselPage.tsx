import '../../logistics-control/styles/ops-board.css';
import '../styles/carousel.css';

import { Suspense, useEffect, useMemo, useRef } from 'react';

import { usePermission } from '@/core/auth/hooks/usePermission';
import { lazyWithRetry as lazy } from '@/core/pwa/chunkReload';

import { useFullscreen } from '../../dispatch/hooks';
import { BoardEmbedProvider } from '../../logistics-control/components';
import { useFullBleed } from '../../logistics-control/hooks';
import { CarouselStrip } from '../components';
import { CAROUSEL_SLIDES } from '../constants';
import { useBoardRotation, useIdleChrome, useOverscan } from '../hooks';

/**
 * The three boards, split out of the main bundle.
 *
 * Lazy for the same reason their own routes are: each is a large page with its
 * own stylesheet, and a reader who opens the carousel and holds rights to one
 * of them should not pay to download the other two. The Suspense boundary sits
 * around the slide rather than the page, so the strip stays on screen and the
 * rotation keeps running while a chunk arrives.
 */
const BOARDS = {
  admin: lazy(() => import('../../admin-control/pages/AdminControlDashboardPage')),
  plant: lazy(() => import('../../plant-board/pages/PlantBoardDashboardPage')),
  logistics: lazy(() => import('../../logistics-control/pages/LogisticsControlDashboardPage')),
  accounts: lazy(() => import('../../accounts-board/pages/AccountsDashboardPage')),
} as const;

/**
 * The wall rotation: Admin, Plant, Logistics Control and Accounts in turn,
 * unattended.
 *
 * WHY THIS IS A PAGE AND NOT A SETTING ON EACH BOARD
 * The three control boards were each built for somebody standing at them. A
 * factory floor screen has nobody standing at it and no keyboard, so what it
 * needs is not a fourth board but a way of showing the three it already has,
 * in turn, forever, with no clicks. That is all this page is: a timer, a strip
 * and one of somebody else's boards.
 *
 * IT COMPUTES NO BUSINESS FIGURE, AND RENDERS NONE
 * Every number on screen belongs to the board underneath, drawn by that board's
 * own page from its own feed. This file has no idea what a tonne is. That is
 * deliberate and it is the whole reason the boards are MOUNTED rather than
 * reimplemented: a carousel that drew its own tiles would be a fourth place for
 * the definition of "produced this month" to drift.
 *
 * ONE SLIDE MOUNTED AT A TIME
 * The obvious alternative — mount all three and toggle `display` — was rejected.
 * These are heavy pages and the screens this runs on are cheap; three live
 * boards would mean three polling feeds and three copies of a very large DOM on
 * hardware that struggles with one. Unmounting costs nothing visible because
 * React Query keeps each board's data cached well past a rotation, so a board
 * coming back round paints from cache immediately and refreshes behind itself.
 *
 * WHAT A SLIDE LOSES BY BEING ONE
 * Its topbar's fullscreen button and settings cog, suppressed by
 * `BoardEmbedProvider` — see `BoardEmbed` for why either would break the
 * rotation. Everything else about the board, including its own drill-downs,
 * works exactly as it does at its own address.
 */
export default function BoardCarouselPage() {
  const shellRef = useRef<HTMLDivElement>(null);
  const { hasAnyPermission } = usePermission();
  const { isFullscreen, toggle } = useFullscreen(shellRef);

  // The same release the boards do for themselves. Done here as well as inside
  // each slide because the strip is ours and has to span the same width.
  useFullBleed(shellRef);

  /**
   * The boards this reader may actually see.
   *
   * The carousel mounts page components directly, which is how a login with no
   * route to a board still sees it here — so the route's gate has to be
   * re-applied at this level. A reader holding one board's rights gets a
   * carousel of one, which simply stops rotating.
   */
  const slides = useMemo(
    () => CAROUSEL_SLIDES.filter((slide) => hasAnyPermission(slide.permissions)),
    [hasAnyPermission],
  );

  const rotation = useBoardRotation(slides.length);
  const { visible } = useIdleChrome(rotation.paused);
  // Only ever set on a television that crops what it is sent; see useOverscan.
  const overscan = useOverscan();

  const { next, previous, togglePaused, goTo } = rotation;

  /**
   * The keys somebody with a keyboard would try.
   *
   * Space holds and releases, the arrows step, F goes fullscreen, and 1-9 jump
   * straight to a board. Bound on the window rather than on the shell because
   * an unattended screen has nothing focused, so a shell-level handler would
   * never fire.
   *
   * Typing is left alone: a board's drill-down has no text input today, but one
   * added later must not have its spacebar eaten by the rotation.
   */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      ) {
        return;
      }

      if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        togglePaused();
      } else if (event.key === 'ArrowRight') {
        next();
      } else if (event.key === 'ArrowLeft') {
        previous();
      } else if (event.key === 'f' || event.key === 'F') {
        toggle();
      } else if (/^[1-9]$/.test(event.key)) {
        goTo(Number(event.key) - 1);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, previous, togglePaused, toggle, goTo]);

  const current = slides[rotation.index];
  const Board = current ? BOARDS[current.key] : null;

  // Somebody who holds none of the three boards' rights. The route lets them in
  // on any one of those rights, so this is only reachable if their permissions
  // changed under them mid-session — say what is wrong rather than a blank wall.
  if (!current || !Board) {
    return (
      <div ref={shellRef} className="bcx ops-board">
        <div className="bcx-empty">
          <b>No boards to show</b>
          <p>
            This rotation carries the Admin, Plant and Logistics control boards, and your account
            holds the rights to none of them. Nothing is shown rather than an empty board.
          </p>
        </div>
      </div>
    );
  }

  return (
    /*
     * `ops-wall` while fullscreen, and only then.
     *
     * The browser promotes THIS element, not the board inside it, so the
     * board's own `:fullscreen` rules never match and it would keep the
     * relaxed, growing layout it uses inside the app shell — four bands sized
     * for more than the screen, with the last one clipped off the bottom. This
     * class is how each board's stylesheet restores its wall geometry; see
     * `ops-board.css`. Out of fullscreen it must NOT be set: the board is then
     * genuinely in a scrolling shell and the relaxed layout is the right one.
     */
    <div
      ref={shellRef}
      className={`bcx ops-board${isFullscreen ? ' ops-wall' : ''}`}
      data-fullscreen={isFullscreen ? 'yes' : 'no'}
      /* `off` skips the transform entirely rather than applying a scale of 1:
         any transform makes this element the containing block for the boards'
         `position: fixed` drill panels, and a correctly configured screen must
         not have its behaviour changed by a setting it never turned on. */
      data-fit={overscan.percent > 0 ? 'on' : 'off'}
      style={
        {
          '--bcx-fit': overscan.scale,
          '--bcx-pad': `${overscan.percent}%`,
        } as React.CSSProperties
      }
    >
      <CarouselStrip
        slides={slides}
        index={rotation.index}
        progress={rotation.progress}
        remaining={rotation.remaining}
        paused={rotation.paused}
        dwellSeconds={rotation.dwellSeconds}
        overscanPercent={overscan.percent}
        visible={visible}
        isFullscreen={isFullscreen}
        onGoTo={rotation.goTo}
        onPrevious={rotation.previous}
        onNext={rotation.next}
        onTogglePaused={rotation.togglePaused}
        onDwellChange={rotation.setDwellSeconds}
        onOverscanChange={overscan.setPercent}
        onToggleFullscreen={toggle}
      />

      {/* Keyed on the slide so React remounts rather than reconciling one heavy
          board's tree into another's — reconciling two unrelated pages of this
          size costs more than building the new one, and would carry the old
          board's scroll and drill state onto its successor. */}
      <div className="bcx-stage" key={current.key}>
        <BoardEmbedProvider>
          <Suspense
            fallback={
              <div className="bcx-loading">
                <span>Loading {current.label}…</span>
              </div>
            }
          >
            <Board />
          </Suspense>
        </BoardEmbedProvider>
      </div>
    </div>
  );
}
