import { cn } from '@/shared/utils';

import type { FunnelColumn } from '../types';

/**
 * Which tint of the band's own hue a segment wears.
 *
 * Never a literal colour: composition is always tints of the domain hue, so a
 * segment names its weight — `main` is the darkest, `mute` the lightest — and
 * the band supplies the actual values. Green/amber/red are reserved for
 * condition and never appear here.
 */
export type OpsFill = 'main' | 'light' | 'mute';

const FILL_CLASS: Record<OpsFill, string> = {
  main: 'ops-f-main',
  light: 'ops-f-light',
  mute: 'ops-f-mute',
};

const KEY_CLASS: Record<OpsFill, string> = {
  main: 'ops-k-main',
  light: 'ops-k-light',
  mute: 'ops-k-mute',
};

export interface OpsSegment {
  fill: OpsFill;
  /** Share of the bar, 0-100. */
  pct: number;
  /** Legend text. Omit to draw the segment without naming it. */
  label?: string;
  /** The figure in the legend, set bold after the label. */
  figure?: string;
}

export interface OpsMeterProps {
  segments: OpsSegment[];
  className?: string;
}

/**
 * A composition bar: one quantity split into its parts.
 *
 * Segments are laid in order and share one scale, so the bar reads as the whole
 * of something. Each carries a `min-width` when it would otherwise vanish —
 * a segment worth 0.9% still has to be visible, because "almost none" and
 * "none" are different answers.
 */
export function OpsMeter({ segments, className }: OpsMeterProps) {
  const labelled = segments.filter((segment) => segment.label);

  return (
    <div className={className}>
      <div className="ops-meter">
        {segments.map((segment, index) => (
          <i
            key={`${segment.fill}-${index}`}
            className={FILL_CLASS[segment.fill]}
            style={{
              width: `${Math.max(0, Math.min(100, segment.pct))}%`,
              // A sliver still has to be seen; without this a 0.9% segment
              // rounds away to nothing and the tile silently loses its point.
              // The floor is the bar's own height, so a sliver reads as a round
              // dot rather than a squashed oval.
              minWidth: segment.pct > 0 ? 'var(--meter-h)' : undefined,
              animationDelay: index > 0 ? `${index * 0.1}s` : undefined,
            }}
          />
        ))}
      </div>

      {labelled.length > 0 && (
        <div className="ops-mkey">
          {labelled.map((segment, index) => (
            <span key={`${segment.fill}-key-${index}`} className={KEY_CLASS[segment.fill]}>
              {segment.label}
              {segment.figure && <b>{segment.figure}</b>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export interface OpsBarsProps {
  /** One entry per day, oldest first. The last is drawn as today. */
  days: { label: string; pct: number; value?: string }[];
  className?: string;
}

/**
 * A short column chart — the last few days, with today picked out.
 *
 * Heights are a share of the tallest day in the window, not of a target: the
 * shape answers "is today normal for this week", which is the only question a
 * seven-bar chart can honestly answer at this size.
 */
export function OpsBars({ days, className }: OpsBarsProps) {
  return (
    <div className={className}>
      <div className="ops-bars">
        {days.map((day, index) => (
          <div key={day.label} className={cn(index === days.length - 1 && 'ops-now')}>
            {/* The day's figure sits above its own bar, small and light: it
                labels the column without competing with the headline total. A
                zero day shows nothing rather than a "0" — the empty column
                already says it. */}
            {day.value && <em className="ops-bval">{day.value}</em>}
            <i
              style={{
                // The 2% floor keeps a small-but-real day visible. It must NOT
                // apply to a day of nothing: a stub with no figure over it
                // reads as a tiny amount produced, which is the opposite of
                // what happened.
                height: day.pct > 0 ? `${Math.max(2, Math.min(100, day.pct))}%` : '0%',
                animationDelay: `${0.02 + index * 0.06}s`,
              }}
            />
          </div>
        ))}
      </div>
      <div className="ops-blab">
        {days.map((day, index) => (
          <span key={day.label} className={cn(index === days.length - 1 && 'ops-now')}>
            {index === days.length - 1 ? 'Today' : day.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export interface OpsPairProps {
  rows: { label: string; figure: string; pct: number; fill: OpsFill }[];
  /** The legend line under the pair. */
  note?: { fill: OpsFill; label: string; figure?: string };
  className?: string;
}

/**
 * Two figures as stacked bars on a shared scale.
 *
 * Both are scaled against the larger of the pair, so the visible gap is the
 * difference between them and nothing else. One scale by construction — two
 * bars on two scales would make any gap look like whatever the author wanted.
 */
export function OpsPair({ rows, note, className }: OpsPairProps) {
  return (
    <div className={className}>
      <div className="ops-pair">
        {/* Keyed by position, not by label: a pair is a fixed list read top to
            bottom, and a caller comparing two registers across several
            destinations legitimately repeats a label. */}
        {rows.map((row, index) => (
          <div key={index} className="ops-prow">
            {/* The label is clipped to one line by CSS, so the full text has to
                stay reachable — a vendor name out of SAP is routinely longer
                than the column. */}
            <em title={row.label}>{row.label}</em>
            <div className="b">
              <i
                className={FILL_CLASS[row.fill]}
                style={{ width: `${Math.max(0, Math.min(100, row.pct))}%` }}
              />
            </div>
            <strong>{row.figure}</strong>
          </div>
        ))}
      </div>
      {note && (
        <div className="ops-mkey">
          <span className={KEY_CLASS[note.fill]}>
            {note.label}
            {note.figure && <b>{note.figure}</b>}
          </span>
        </div>
      )}
    </div>
  );
}

const STAGE_LABELS: Record<string, string> = {
  GRPO: 'GRPO',
  AP: 'AP',
  PAYMENT: 'Payment',
};

/**
 * The range a band covers, read off its neighbour.
 *
 * Bands arrive as floors — 15, 30, 45 — and the row owns everything from its
 * own floor up to the next one. The last band has no neighbour above it, so it
 * stays open-ended.
 */
function bandLabel(bands: readonly number[], index: number): string {
  const band = bands[index];
  const next = bands[index + 1];
  if (next === undefined) return `${band}+`;
  return `${band}–${next - 1}`;
}

/**
 * Row tint rises with the age band, fresh at the top.
 *
 * One step per band. The index is clamped, so a shorter list would leave the
 * oldest rows sharing a tint and the scale would stop rising exactly where it
 * matters most — keep this as long as the longest band list rendered.
 */
const AGE_CLASS = ['ops-a-new', 'ops-a-ok', 'ops-a-warn', 'ops-a-bad'];

export interface OpsMatrixProps {
  columns: FunnelColumn[];
  /** Formats a cell's rupees. Omit to draw counts only. */
  money?: (value: number) => string;
  className?: string;
}

/**
 * Open freight documents by age — bands down, stages across.
 *
 * Each column counts bilties *stuck* at that stage, aged from that stage's own
 * clock: GRPO from the dispatch date, AP from the GRPO posting, Payment from the
 * AP invoice. A bill handed to the next desk yesterday reads as one day old
 * there, however long the previous desk sat on it. The stages are mutually
 * exclusive, so a row does not sum to anything and is deliberately not totalled.
 *
 * Bands are EXCLUSIVE windows: a document is in exactly one row and the rows sum
 * to the aged total. Cumulative floors were tried first and rejected on the
 * wall — three counts of the same ageing set read as duplicated data, which is
 * a worse failure than the one exclusive bands carry: a document ageing past a
 * boundary leaves one row for the next, so a number can fall while the
 * situation worsens. The range in each row label is what makes that legible.
 *
 * The row tint carries the ageing scale, fresh to oldest, top to bottom — the
 * one place on the board where a colour is not the band's own hue.
 *
 * Each cell carries its money under its count where the caller supplies a
 * formatter. Counts alone answer "how many are stuck"; a desk deciding what to
 * chase needs "worth how much", and the two are not proportional — one 90-day
 * invoice can outweigh forty fresh ones.
 *
 * A column can opt out with `countsOnly`, for a stage whose documents are not
 * money yet — see `FunnelColumn.countsOnly`.
 */
export function OpsMatrix({ columns, money, className }: OpsMatrixProps) {
  const bands = columns[0]?.cells.map((cell) => cell.band) ?? [];

  return (
    <div className={className}>
      <table className="ops-matrix">
        <thead>
          <tr>
            <th>Days old</th>
            {columns.map((column) => (
              <th key={column.stage}>{STAGE_LABELS[column.stage] ?? column.stage}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bands.map((band, index) => (
            <tr key={band} className={AGE_CLASS[Math.min(index, AGE_CLASS.length - 1)]}>
              {/* The window, not a floor: "15–29", with the last band left
                  open-ended. Bare numbers under a "Days old" header read as
                  exclusive buckets anyway, so the label has to say which it is
                  — that ambiguity is what made three counts of one ageing set
                  look like duplicated data. */}
              <th>{bandLabel(bands, index)}</th>
              {columns.map((column) => {
                const cell = column.cells.find((candidate) => candidate.band === band);
                return (
                  <td key={`${column.stage}-${band}`}>
                    {column.unavailable ? (
                      <span className="ops-nil">—</span>
                    ) : (
                      <>
                        {cell?.count ?? 0}
                        {/* The money under the count, smaller and lighter: the
                            row is read as "how many, worth how much", and a
                            cell of nothing says it once rather than twice.

                            Where NOTHING in the cell is priced there is no
                            money to state, and "₹0" would read as a settled
                            cell rather than an unpriced one — 170 bilties
                            waiting on a freight figure nobody has typed is the
                            opposite of nothing owed. */}
                        {money &&
                          !column.countsOnly &&
                          (cell?.count ?? 0) > 0 &&
                          /* Nothing to say, no element to say it in. An empty
                             <em> still takes a line's height, and four of those
                             down a column is the last age band pushed out of
                             the card. */
                          ((cell?.amount ?? 0) > 0 || (cell?.unpriced ?? 0) > 0) && (
                          <em className="ops-cash">
                            {(cell?.amount ?? 0) > 0 ? money(cell?.amount ?? 0) : null}
                            {/* A cell whose documents are mostly unpriced must
                                not read as a cell that is nearly settled. */}
                            {(cell?.unpriced ?? 0) > 0 && (
                              <i>
                                {(cell?.amount ?? 0) > 0 ? '+' : ''}
                                {cell?.unpriced} unpriced
                              </i>
                            )}
                          </em>
                        )}
                      </>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
