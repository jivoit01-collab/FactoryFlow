import type { ReactNode } from 'react';

import { cn } from '@/shared/utils';

/** The condition a tag reports. `nil` is "no source", which is not a condition. */
export type OpsTagTone = 'neut' | 'ok' | 'warn' | 'bad' | 'nil';

export interface OpsGroupProps {
  /** The tile's name. */
  name: string;
  /** The pill top-right — a share, a comparison, or why the tile is empty. */
  tag?: { label: string; tone?: OpsTagTone };
  /** The line under the name. Always rendered, even empty, to hold the grid row. */
  sub?: ReactNode;
  /** The figure, already formatted and without its unit. */
  value?: string;
  /** The unit beside the figure — `tonnes`, `per litre`, `on duty`. */
  unit?: string;
  /**
   * Why there is no figure. Replaces the value with a rule and prints the
   * reason under the visualisation — a tile with no source must never look like
   * a tile reporting zero.
   */
  missing?: string;
  /** The visualisation under the figure. */
  viz?: ReactNode;
  /** Let the visualisation take the value row too — for tables and bar pairs. */
  tallViz?: boolean;
  /**
   * The figure has not arrived yet.
   *
   * Distinct from `missing`, which means there is no figure to arrive: a tile
   * still fetching should not accuse its own feed of being absent.
   */
  loading?: boolean;
  /**
   * Open the rows behind this figure.
   *
   * Where present the tile becomes a button: every figure here is a roll-up of
   * something countable, and "which ones" is the question that follows any of
   * them. Tiles without a row-level source stay inert rather than opening an
   * empty panel.
   */
  onOpen?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

const TAG_CLASS: Record<OpsTagTone, string> = {
  neut: 'ops-t-neut',
  ok: 'ops-t-ok',
  warn: 'ops-t-warn',
  bad: 'ops-t-bad',
  nil: 'ops-t-nil',
};

/**
 * One tile in a band.
 *
 * Four fixed rows — name, subtitle, figure, visualisation — so a row of tiles
 * reads as a row: every name sits on the same line, every figure shares a
 * baseline. The subtitle row renders even when empty, because dropping it would
 * let one tile's figure ride higher than its neighbours'.
 *
 * A tile with no data source renders a rule where the figure goes and states
 * the reason beneath. That is the board's one hard rule: an empty warehouse and
 * an unreadable one must not look the same.
 */
export function OpsGroup({
  name,
  tag,
  sub,
  value,
  unit,
  missing,
  viz,
  tallViz = false,
  loading = false,
  onOpen,
  className,
  style,
}: OpsGroupProps) {
  const isMissing = Boolean(missing);
  // A tile with nothing behind it never wears a condition colour: there is no
  // condition to report, and amber here would read as a problem with the plant
  // rather than a gap in the data.
  const tone: OpsTagTone = isMissing ? 'nil' : (tag?.tone ?? 'neut');

  // A tile with nothing to show must not offer to show it.
  const openable = Boolean(onOpen) && !isMissing && !loading;

  return (
    <div
      className={cn('ops-grp', className)}
      style={style}
      data-drill={openable ? '1' : undefined}
      // A div rather than a <button>: the tile contains a table and bars, which
      // a button may not. `role`/`tabIndex`/keyboard are supplied instead so it
      // is still reachable without a mouse.
      role={openable ? 'button' : undefined}
      tabIndex={openable ? 0 : undefined}
      onClick={openable ? onOpen : undefined}
      onKeyDown={
        openable
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onOpen?.();
              }
            }
          : undefined
      }
    >
      <div className="ops-grow">
        <b className="ops-nm">{name}</b>
        {tag && <span className={cn('ops-tag', TAG_CLASS[tone])}>{tag.label}</span>}
      </div>

      <div className="ops-sub">{sub}</div>

      {!tallViz && (
        <div className="ops-val">
          {loading ? (
            <b className="ops-nil">…</b>
          ) : isMissing ? (
            <b className="ops-nil">—</b>
          ) : (
            <>
              <b>{value}</b>
              {unit && <u>{unit}</u>}
            </>
          )}
        </div>
      )}

      <div className={cn('ops-viz', tallViz && 'ops-tall')}>
        {loading ? null : isMissing ? <p className="ops-note">{missing}</p> : viz}
      </div>
    </div>
  );
}
