import { useEffect, useRef } from 'react';
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

export interface OpsDrillProps<Row> {
  /** The tile's name, repeated so the panel is visibly the thing clicked. */
  title: string;
  /** What the rows are and where they came from. */
  subtitle?: string;
  domain: OpsDomain;
  /** The figures the table adds up to — the tile's own numbers. */
  stats?: { label: string; value: string }[];
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
  columns,
  rows,
  rowKey,
  empty,
  loading = false,
  onClose,
}: OpsDrillProps<Row>) {
  const closeRef = useRef<HTMLButtonElement>(null);


  // Escape closes, and focus starts on the close button — the panel covers the
  // board, so there has to be a way out that does not need a mouse.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

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
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
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
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={rowKey(row, index)}>
                    {columns.map((column) => (
                      <td
                        key={column.label}
                        className={cn(column.numeric && 'num', column.dim && 'dim')}
                      >
                        {column.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>,
    host,
  );
}
