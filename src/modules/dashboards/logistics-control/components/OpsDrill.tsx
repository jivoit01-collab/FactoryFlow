import { Fragment, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/shared/utils';

// The panel wears the band's own hue, so it is visibly the object the reader
// just clicked. Shared with `OpsBand` rather than redeclared: two lists of
// domains would be two chances for a board to invent its own teal.
import type { OpsDomain } from './OpsBand';

/** One column of the drill-down table. */
export interface OpsDrillColumn<Row> {
  /** Header text. */
  label: string;
  /** The cell, already formatted. */
  cell: (row: Row) => React.ReactNode;
  /** Right-align and tabulate — for anything countable. */
  numeric?: boolean;
  /** Render in the muted ink, for context rather than substance. */
  dim?: boolean;
}

/**
 * A second cut of the same rows, above the table.
 *
 * The table answers "which ones"; this answers "where", or "whose", or
 * whatever the second question about a figure is. It is a strip of totals
 * rather than a second table on purpose: the panel is already as long as its
 * rows, and a reader who wants the detail has it directly underneath.
 *
 * Every item must be a partition of the SAME figure the stats report. A
 * breakdown whose parts do not add up to the headline is the drill-down
 * disagreeing with the tile that opened it, which is the one thing this panel
 * exists not to do.
 */
export interface OpsDrillBreakdown {
  title: string;
  items: { key: string; label: string; value: string; sub?: string }[];
  /** Said plainly when there is nothing to break down. */
  empty?: string;
}

/**
 * How long a row's detail takes to fold shut.
 *
 * Must match `ops-drill-fold` in ops-board.css: the row is held mounted for
 * exactly this long, so a longer keyframe would be cut off mid-fold and a
 * shorter one would leave the detail sitting there after it had finished.
 */
const FOLD_MS = 170;

/**
 * The hold, or none at all where motion is not wanted.
 *
 * A preference against motion is a preference against WAITING for it too: with
 * the fold suppressed (ops-board.css drops every animation under the query) a
 * held row is not a closing row, it is 170ms of a click that did nothing.
 * `matchMedia` is missing under jsdom, where there is no motion to prefer.
 */
function foldOutMs(): number {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  return reduced?.matches ? 0 : FOLD_MS;
}

export interface OpsDrillProps<Row> {
  /** The tile's name, repeated so the panel is visibly the thing clicked. */
  title: string;
  /** What the rows are and where they came from. */
  subtitle?: string;
  domain: OpsDomain;
  /** The figures the table adds up to — the tile's own numbers. */
  stats?: { label: string; value: string }[];
  /**
   * A second cut of the same rows, between the stats and the table.
   *
   * Several are allowed, and they stack in the order given. Two is the
   * sensible ceiling: a figure has at most a couple of second questions, and
   * a panel that answers four of them before showing a row has buried the
   * rows.
   */
  breakdown?: OpsDrillBreakdown | OpsDrillBreakdown[];
  columns: OpsDrillColumn<Row>[];
  rows: readonly Row[];
  /** Stable key per row. */
  rowKey: (row: Row, index: number) => string;
  /**
   * Why there are no rows, where that is known.
   *
   * An empty table and an unreadable one must not look the same here either —
   * the same rule the tiles follow.
   */
  empty?: string;
  /** Rows are still arriving. */
  loading?: boolean;
  /**
   * Open one row.
   *
   * Given, every row becomes clickable and the table says so — a pointer, a
   * lifted hover, and a chevron in its own column. Withheld, the table is a
   * read-only list exactly as before, because a row that looks clickable and
   * is not is worse than one that never offered.
   */
  onRowClick?: (row: Row, index: number) => void;
  /**
   * Which rows have anything to open, where some do not.
   *
   * A day the plant dispatched nothing has no customers under it, and a
   * chevron beside it would promise a list that cannot exist. Rows this
   * refuses keep their figures and lose the pointer, the chevron and the
   * keyboard stop — the same rule the tiles follow, one level down.
   *
   * Withheld, every row opens, which is what almost every panel wants.
   */
  canOpenRow?: (row: Row, index: number) => boolean;
  /**
   * A row's own detail, opened underneath it rather than over it.
   *
   * The alternative — and what this table did first — is to replace the whole
   * panel with a second one and offer a back arrow. That answers the question
   * but costs the reader their place: the list they were scanning is gone, and
   * comparing two customers means opening, reading, going back, and opening
   * again from memory.
   *
   * Expanded in place, the surrounding rows stay put and a second row can be
   * opened without closing the first. Given alongside `onRowClick`, that
   * handler becomes the toggle and the chevron turns to face down.
   */
  renderExpanded?: (row: Row, index: number) => React.ReactNode;
  /** Which row is open, by the key `rowKey` gives it. Null for none. */
  expandedKey?: string | null;
  /**
   * Go back up one level, on a panel opened from another panel.
   *
   * Given, the header grows a back arrow and Escape goes UP rather than out:
   * a reader two levels deep pressing Escape means "the level I just opened",
   * not "throw away both".
   */
  onBack?: () => void;
  /** What the back arrow returns to, for the reader and the screen reader. */
  backLabel?: string;
  onClose: () => void;
}

/**
 * The rows behind a tile's figure.
 *
 * Every figure on this board is a roll-up of something countable, and the
 * question that follows any of them is "which ones". This answers it in place:
 * the panel opens over the board wearing the band's own hue, so the reader
 * never loses track of which tile they opened.
 *
 * Three things make it trustworthy rather than merely present:
 *
 *   1. **It opens with the tile's own figures.** `stats` repeats what the tile
 *      said, above the rows that make it up. A drill-down that quietly
 *      disagrees with the tile that opened it is worse than none.
 *   2. **It never renders a blank.** No rows is a stated condition — empty,
 *      still loading, or unreadable — never an empty table the reader has to
 *      interpret.
 *   3. **It is sized for a hand, not a wall.** The board's `--u` scales with
 *      the viewport for four-metre legibility; a table of rows is read at
 *      arm's length, so the panel carries its own `--du`.
 *
 * Rendered in a portal so the board's `overflow: hidden` and its fullscreen
 * element cannot clip it.
 */
export function OpsDrill<Row>({
  title,
  subtitle,
  domain,
  stats,
  breakdown,
  columns,
  rows,
  rowKey,
  empty,
  loading = false,
  onRowClick,
  canOpenRow,
  renderExpanded,
  expandedKey = null,
  onBack,
  backLabel,
  onClose,
}: OpsDrillProps<Row>) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // One cut or several, read the same way below.
  const cuts = breakdown ? (Array.isArray(breakdown) ? breakdown : [breakdown]) : [];

  /*
   * The row on its way out, kept mounted while it folds shut.
   *
   * Opening animates on its own — the detail is new to the DOM, so a keyframe
   * runs on it. Closing has nothing to animate, because React drops the row
   * the instant `expandedKey` stops naming it: what the reader saw was a
   * detail that eased open and then disappeared between two frames, which
   * reads as the panel flinching rather than as the row shutting.
   *
   * So the key outlives the close, by the length of the fold and no longer.
   */
  const [closingKey, setClosingKey] = useState<string | null>(null);
  const [lastOpenKey, setLastOpenKey] = useState<string | null>(expandedKey);

  // NOTICED DURING THE RENDER THAT CLOSED IT, not in an effect afterwards. An
  // effect runs after the browser has painted, so the reader would get one
  // frame with the row already gone and the fold would then play on a detail
  // that flashed back into existence to perform it. React re-runs this render
  // before it paints anything, so the first frame is of a row on its way out.
  if (lastOpenKey !== expandedKey) {
    setLastOpenKey(expandedKey);
    // Null where nothing was open, which is most of the time. And a row
    // reopened while it was still folding is open again rather than closing,
    // because what closes is always what `expandedKey` has just stopped
    // naming — so no row is ever asked to be both at once.
    setClosingKey(lastOpenKey);
  }

  // The hold, ended. Cleanup covers the row reopened mid-fold: the key it was
  // closing under is gone, so the timer that would have dropped it is too.
  useEffect(() => {
    if (closingKey === null) return;
    const timer = window.setTimeout(() => setClosingKey(null), foldOutMs());
    return () => window.clearTimeout(timer);
  }, [closingKey]);


  // Escape closes, and focus starts on the close button — the panel covers the
  // board, so there has to be a way out that does not need a mouse.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // Up one level where there is one: a reader inside a row's own rows
      // means the row, not the whole panel they opened it from.
      if (onBack) onBack();
      else onClose();
    };
    document.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onBack, onClose]);

  /*
   * Mounted on the fullscreen element when there is one.
   *
   * The board is opened fullscreen on the office screen, and a portal to
   * `document.body` would render *behind* the fullscreen element — the panel
   * would open and be invisible, which is the worst of both outcomes.
   */
  const host: Element = document.fullscreenElement ?? document.body;

  return createPortal(
    <div
      className={cn('ops-board', 'ops-drill', `ops-b-${domain}`)}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      // Only a click on the backdrop itself closes — a click that started on a
      // row and drifted out while selecting text must not dismiss the panel.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="ops-drill__panel">
        <div className="ops-drill__head">
          <div className="ops-drill__lede">
            {onBack && (
              <button
                type="button"
                className="ops-drill__back"
                onClick={onBack}
                aria-label={backLabel ? `Back to ${backLabel}` : 'Back'}
                title={backLabel ? `Back to ${backLabel}` : 'Back'}
              >
                ‹
              </button>
            )}
            <div>
              <h2>{title}</h2>
              {subtitle && <p>{subtitle}</p>}
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="ops-drill__close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {stats && stats.length > 0 && (
          <div className="ops-drill__stats">
            {stats.map((stat) => (
              <div key={stat.label} className="ops-drill__stat">
                <span className="k">{stat.label}</span>
                <span className="v">{stat.value}</span>
              </div>
            ))}
          </div>
        )}

        {cuts.map((cut) => (
          <div className="ops-drill__cut" key={cut.title}>
            <h3>{cut.title}</h3>
            {cut.items.length === 0 ? (
              <p className="ops-drill__empty">
                {cut.empty ?? 'Nothing to break down.'}
              </p>
            ) : (
              <div className="ops-drill__cutrow">
                {cut.items.map((item) => (
                  <div key={item.key} className="ops-drill__stat">
                    <span className="k">{item.label}</span>
                    <span className="v">{item.value}</span>
                    {item.sub && <span className="s">{item.sub}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="ops-drill__body">
          {loading ? (
            <p className="ops-drill__empty">Reading…</p>
          ) : rows.length === 0 ? (
            <p className="ops-drill__empty">{empty ?? 'Nothing to show.'}</p>
          ) : (
            <table>
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column.label} className={cn(column.numeric && 'num')}>
                      {column.label}
                    </th>
                  ))}
                  {onRowClick && <th className="ops-drill__gocol" aria-label="Open" />}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const key = rowKey(row, index);
                  // Expanded only when this table can expand at all: an
                  // `expandedKey` left over from a panel with no
                  // `renderExpanded` must not open a blank row underneath.
                  const isOpen = Boolean(renderExpanded) && expandedKey === key;
                  // Shut, but still on screen for as long as that takes.
                  const isShutting = Boolean(renderExpanded) && closingKey === key;
                  // This row in particular, not the table in general: a panel
                  // may hold rows with nothing under them beside rows that
                  // open, and only the ones that open may say so.
                  const openable = Boolean(onRowClick) && (canOpenRow?.(row, index) ?? true);

                  return (
                  <Fragment key={key}>
                  <tr
                    className={cn(
                      openable && 'ops-drill__rowopen',
                      isOpen && 'ops-drill__rowon',
                    )}
                    aria-expanded={renderExpanded && openable ? isOpen : undefined}
                    // A row is opened by the same two gestures anything else on
                    // this board is: the pointer, or the keyboard on the row the
                    // focus ring is sitting on.
                    // Focusable, but still a row: `role="button"` here would
                    // trade the table's own row-and-cell semantics away, and a
                    // screen-reader user would lose the column headers that
                    // make the figures mean anything.
                    tabIndex={openable ? 0 : undefined}
                    onClick={openable ? () => onRowClick?.(row, index) : undefined}
                    onKeyDown={
                      openable
                        ? (event) => {
                            if (event.key !== 'Enter' && event.key !== ' ') return;
                            event.preventDefault();
                            onRowClick?.(row, index);
                          }
                        : undefined
                    }
                  >
                    {columns.map((column) => (
                      <td
                        key={column.label}
                        className={cn(column.numeric && 'num', column.dim && 'dim')}
                      >
                        {column.cell(row)}
                      </td>
                    ))}
                    {onRowClick && (
                      <td className="ops-drill__gocol" aria-hidden="true">
                        {/* Down when this row's own rows are showing, right
                            when opening would take the reader elsewhere, and
                            nothing at all on a row with nothing under it. The
                            chevron is the only thing that says which of the
                            three a click is about to do. */}
                        {!openable ? '' : renderExpanded ? (isOpen ? '⌄' : '›') : '›'}
                      </td>
                    )}
                  </tr>

                  {(isOpen || isShutting) && (
                    <tr className="ops-drill__subrow" aria-hidden={isShutting || undefined}>
                      {/* Spans the lot, chevron column included, so the detail
                          is not squeezed into one column's width. */}
                      <td colSpan={columns.length + (onRowClick ? 1 : 0)}>
                        {/* The fold. Two elements rather than one because what
                            is animated is the OUTER box's height and what is
                            clipped is the inner one — a single box cannot be
                            both without measuring the content in JS. */}
                        <div
                          className={cn('ops-drill__fold', isShutting && 'ops-drill__fold--shut')}
                        >
                          <div>{renderExpanded?.(row, index)}</div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>,
    host,
  );
}
