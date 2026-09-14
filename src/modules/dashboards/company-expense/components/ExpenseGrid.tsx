import { COLUMN_ACCENT, COLUMN_SOURCE } from '../constants';
import type {
  ElectricityReconciliation,
  ExpenseCell,
  ExpenseColumn,
  ExpenseColumnKey,
  ExpenseRow,
} from '../types';
import { amount, companyLabel, money, share, whole } from '../utils';

export interface ExpenseGridProps {
  columns: ExpenseColumn[];
  /** Company rows then the shared row, in the order they should be drawn. */
  rows: ExpenseRow[];
  total: ExpenseRow;
  /** Days in the span — the row label's second line. */
  days: number;
  /** Sum of the sub-meters against the incomer. Shown on the column's total. */
  reconciliation?: ElectricityReconciliation | null;
}

/**
 * The reconciliation as one line, for the electricity column's total.
 *
 * Lives on that square rather than in the warning strip because it is a
 * property of the figure directly above it. It names the sub-meter total
 * explicitly, because that is *not* the number above it: the mains sit in the
 * shared row and are counted in the column, so the column and the figure being
 * reconciled are deliberately different. Saying only "vs KWH" here would invite
 * the reader to check it against the column and conclude the board is wrong.
 */
function reconciliationNote(check: ElectricityReconciliation): string {
  const drift = check.drift_pct;
  const sign = drift > 0 ? '+' : '';
  const verdict =
    Math.abs(drift) < 2 ? 'ties' : `${sign}${drift.toFixed(1)}% ${drift < 0 ? 'unread' : 'over'}`;
  return `sub-meters ${money(amount(check.sub_meter_cost))} vs ${
    check.meter ?? 'incomer'
  } ${money(amount(check.cost))} · ${verdict}`;
}

/**
 * The hue a column owns, as the CSS custom properties one square needs.
 *
 * Returned as a style object rather than a class per column so the four hues
 * live in exactly one place — the stylesheet's `--salary-1` and friends — and
 * a fifth cost line later means one constant and three variables, not a new
 * branch in every component that draws a square.
 */
function accentStyle(key: ExpenseColumnKey, dark: boolean): React.CSSProperties {
  const hue = COLUMN_ACCENT[key];
  return {
    '--accent': `var(--${hue}-1)`,
    '--accent-2': `var(--${hue}-2)`,
    // The wash is dropped on the total row: that row is already reversed out,
    // and a light tint over near-black reads as a smudge rather than a hue.
    '--wash': dark ? 'transparent' : `var(--${hue}-3)`,
  } as React.CSSProperties;
}

/** The unit behind the money, when there is one worth showing. */
function unitLine(cell: ExpenseCell): string | null {
  if (cell.unit === null || cell.unit === undefined) return null;
  const value = typeof cell.unit === 'number' ? cell.unit : Number(cell.unit);
  if (!Number.isFinite(value) || value === 0) return null;
  return `${whole(value)} ${cell.unit_label ?? ''}`.trim();
}

/**
 * One square.
 *
 * A cell carrying a warning draws a rule where the number would go and states
 * the reason. That is the board's one hard rule: an empty register and an
 * unreadable one must not look the same, so "no reading was entered for its 5
 * meters" can never be mistaken for "this company used no power".
 */
function Cell({
  cell,
  column,
  columnTotal,
  kind,
  note,
}: {
  cell: ExpenseCell;
  column: ExpenseColumnKey;
  columnTotal: number;
  kind: ExpenseRow['kind'];
  /** Overrides the cell's own note. Used for the electricity reconciliation. */
  note?: string;
}) {
  const value = amount(cell.amount);
  const dark = kind === 'TOTAL';
  const unit = unitLine(cell);
  const noteText = note ?? cell.note;
  const className = [
    'exp-cell',
    kind === 'TOTAL' ? 'is-total' : '',
    kind === 'SHARED' ? 'is-shared' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} style={accentStyle(column, dark)}>
      {cell.warning ? (
        <div className="nil" aria-label={cell.warning}>
          —
        </div>
      ) : (
        <div className={value === 0 ? 'n is-zero' : 'n'}>{money(value)}</div>
      )}

      {cell.warning ? (
        <div className="why">{cell.warning}</div>
      ) : (
        <div className="note" title={noteText ?? undefined}>
          {unit ? <b>{unit}</b> : null}
          {unit && noteText ? ' · ' : ''}
          {noteText ?? (unit ? '' : ' ')}
        </div>
      )}

      {/* The share bar is drawn only on rows that are part of the total. On the
          total row itself it would always be full, which says nothing. */}
      {kind === 'TOTAL' ? (
        <div />
      ) : (
        <div className="exp-bar">
          <i style={{ width: `${share(value, columnTotal)}%` }} />
        </div>
      )}
    </div>
  );
}

/**
 * The company × cost-line grid.
 *
 * Laid out as a CSS grid rather than a `<table>`: every square is a card with
 * its own figure, unit line and share bar, and the rows have to stretch to fill
 * a viewport that varies with the screen. A table would carry cell borders and
 * intrinsic sizing that fight both.
 *
 * Read down a column — "what is power costing us, and whose power is it" — far
 * more than across a row, which is why the column owns the colour and the share
 * bar measures against the column's total.
 */
export function ExpenseGrid({
  columns,
  rows,
  total,
  days,
  reconciliation,
}: ExpenseGridProps) {
  const columnTotals = Object.fromEntries(
    columns.map((column) => [column.key, amount(total.cells[column.key]?.amount)]),
  ) as Record<ExpenseColumnKey, number>;

  const grandTotal = amount(total.total);
  const allRows = [...rows, total];

  return (
    <div className="exp-grid">
      {/* header row: a blank over the names, then one head per cost line */}
      <div className="exp-head is-blank" />
      {columns.map((column) => (
        <div
          key={column.key}
          className="exp-head"
          style={accentStyle(column.key, false)}
        >
          <div className="name">{column.label}</div>
          <div className="src" title={COLUMN_SOURCE[column.key]}>
            {COLUMN_SOURCE[column.key]}
          </div>
        </div>
      ))}
      <div className="exp-head is-blank" style={{ textAlign: 'right' }}>
        <div className="name" style={{ color: 'var(--ink)' }}>
          Total
        </div>
        <div className="src">All four lines</div>
      </div>

      {allRows.map((row) => {
        const rowTotal = amount(row.total);
        return (
          <div key={row.key} style={{ display: 'contents' }}>
            <div
              className={[
                'exp-rowname',
                row.kind === 'SHARED' ? 'is-shared' : '',
                row.kind === 'TOTAL' ? 'is-total' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="nm" title={row.label}>
                {/* The shared row's full label wraps to two lines and pushes its
                    own explanation onto two more. "Shared" plus the line below
                    says the same thing in the space a row actually has. */}
                {row.kind === 'COMPANY'
                  ? companyLabel(row.label)
                  : row.kind === 'SHARED'
                    ? 'Shared'
                    : row.label}
              </div>
              <div className="sub">
                {row.kind === 'SHARED'
                  ? 'No single owner'
                  : `${days} day${days === 1 ? '' : 's'}`}
              </div>
            </div>

            {columns.map((column) => (
              <Cell
                key={column.key}
                cell={row.cells[column.key]}
                column={column.key}
                columnTotal={columnTotals[column.key]}
                kind={row.kind}
                note={
                  row.kind === 'TOTAL' && column.key === 'ELECTRICITY' && reconciliation
                    ? reconciliationNote(reconciliation)
                    : undefined
                }
              />
            ))}

            <div
              className={[
                'exp-total',
                row.kind === 'SHARED' ? 'is-shared' : '',
                row.kind === 'TOTAL' ? 'is-total' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="n">{money(rowTotal)}</div>
              <div className="s">
                {row.kind === 'TOTAL' || !grandTotal
                  ? ' '
                  : `${share(rowTotal, grandTotal).toFixed(0)}% of spend`}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
