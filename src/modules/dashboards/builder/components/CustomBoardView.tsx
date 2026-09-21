import '../../logistics-control/styles/ops-board.css';
import '../styles/builder.css';

import { Maximize2, Pencil } from 'lucide-react';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { DASHBOARDS_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { DashboardError, DashboardLoading } from '@/shared/components/dashboard';
import { cn } from '@/shared/utils';

import { useFullscreen } from '../../dispatch/hooks';
import { useFullBleed } from '../../logistics-control/hooks';
import { useBuiltBoardData } from '../api';
import type { CardAbsence } from './CardFace';
import { CardFace } from './CardFace';

/**
 * A built board, read.
 *
 * ONE REQUEST FOR THE WHOLE BOARD, and that is a security property rather
 * than a performance one: a card is only allowed to honour a `control_boards`
 * feed right because the whole board is composed behind a single server-side
 * read. This page therefore has exactly one query and never fetches per card.
 *
 * FOUR REASONS A CARD CAN BE BLANK, KEPT APART
 * `meta` carries four lists and they mean four different things. Withheld
 * sends a reader to an administrator; degraded sends them to the server room;
 * retired and misplaced send the board's AUTHOR to the editor. Collapsing any
 * pair of them into "no data" is the failure `control_boards/sections.py`
 * exists to prevent.
 */
export interface CustomBoardViewProps {
  slug: string;
  /**
   * Mounted inside something else — today, the wall rotation.
   *
   * An embedded board drops its own chrome: the fullscreen button and the
   * edit pencil both break a rotation (one fights the carousel for the
   * fullscreen element, the other navigates away from a screen nobody is
   * standing at). The same reasoning `BoardEmbed` applies to the three
   * hand-built boards, applied here.
   */
  embedded?: boolean;
}

export function CustomBoardView({ slug, embedded = false }: CustomBoardViewProps) {
  const navigate = useNavigate();
  const shellRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggle } = useFullscreen(shellRef);
  const { hasPermission } = usePermission();

  const { data, isLoading, error, refetch } = useBuiltBoardData(slug);

  // The same full-width release the other wall boards take. A board built for
  // a screen has no business inside the app's reading column.
  useFullBleed(shellRef);

  if (isLoading && !data) return <DashboardLoading />;
  if (error && !data) {
    return (
      <DashboardError
        message={(error as Error).message}
        /*
         * A 403 here is its own answer and not a failure: the board exists,
         * this reader may open it, and they hold none of the data rights any
         * card on it needs. Sending them to a retry button would have them
         * pressing it for something no amount of retrying will fix.
         */
        isPermissionError={(error as { status?: number }).status === 403}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }
  if (!data) return null;

  const { board, cards, meta } = data;
  const withheld = new Set(meta.withheld);
  const degraded = new Set(meta.degraded);

  const absenceFor = (cardKey: string): CardAbsence => {
    // Withheld wins over degraded, matching the server's own ordering: what
    // somebody is allowed to see does not depend on whether a source is
    // answering.
    if (withheld.has(cardKey)) return 'withheld';
    if (degraded.has(cardKey)) return 'degraded';
    return null;
  };

  const canEdit = hasPermission(DASHBOARDS_PERMISSIONS.BUILD_DASHBOARDS);

  return (
    <div
      ref={shellRef}
      className={cn(
        'ops-board cbx-view',
        `cbx-s-${board.surface}`,
        `cbx-d-${board.density}`,
        board.mode === 'WALL' && 'cbx-wall',
        isFullscreen && 'ops-wall',
      )}
      data-fullscreen={isFullscreen ? 'yes' : 'no'}
    >
      {board.show_heading && (
        <header className="cbx-view-head">
          <div>
            <h1>{board.name}</h1>
            {board.description && <p>{board.description}</p>}
          </div>
          {!embedded && (
            <div className="cbx-view-tools">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => navigate(`/dashboards/builder/${slug}`)}
                  title="Arrange this board"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
              <button type="button" onClick={toggle} title="Fullscreen">
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </header>
      )}

      {/* The author's two problems, said once at the top rather than on each
          tile — a card that has been retired has no tile to say it on. */}
      {(meta.retired.length > 0 || meta.misplaced.length > 0) && canEdit && !embedded && (
        <p className="cbx-message cbx-message-warn">
          {meta.retired.length > 0 &&
            `${meta.retired.length} card(s) on this board no longer exist. `}
          {meta.misplaced.length > 0 &&
            `${meta.misplaced.length} card(s) no longer fit where they were placed. `}
          Open it in the builder to sort it out.
        </p>
      )}

      <div
        className="cbx-view-grid"
        style={{
          gridTemplateColumns: `repeat(${board.columns}, minmax(0, 1fr))`,
          /*
           * A wall board's rows divide the screen; a page board's are as tall
           * as their content needs, up to a floor.
           *
           * `minmax(0, 1fr)` on the wall for the reason `ops-board.css`
           * spells out: a bare `1fr` has its own content as its floor, so one
           * crowded card grows its row and carries the bottom row off the
           * bottom of the display.
           */
          gridTemplateRows:
            board.mode === 'WALL'
              ? `repeat(${board.rows}, minmax(0, 1fr))`
              : `repeat(${board.rows}, minmax(14rem, auto))`,
        }}
      >
        {cards.map((card) => (
          <CardFace
            key={card.id}
            title={card.title}
            cardKey={card.card_key}
            accent={card.accent}
            payload={card.payload}
            absence={absenceFor(card.card_key)}
            style={{
              gridColumn: `${card.column + 1} / span ${card.columns}`,
              gridRow: `${card.row + 1} / span ${card.rows}`,
            }}
          />
        ))}

        {cards.length === 0 && (
          <p className="cbx-canvas-empty">
            There is nothing on this board yet.
          </p>
        )}
      </div>

      {meta.warnings.length > 0 && (
        <footer className="cbx-view-foot">
          {meta.warnings.map((warning) => (
            <span key={warning}>{warning}</span>
          ))}
        </footer>
      )}
    </div>
  );
}
