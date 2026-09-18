import type { ReactNode } from 'react';

import { cn } from '@/shared/utils';

/** One column of a row's own detail. */
export interface DrillSubColumn<Row> {
  label: string;
  cell: (row: Row) => ReactNode;
  numeric?: boolean;
  dim?: boolean;
  /**
   * Share of the sub-table's width, as a percentage string.
   *
   * Declared rather than discovered on purpose. Left to size itself the table
   * sets each column to whatever its widest cell happens to hold, so one
   * expansion lays its columns out differently from the next and a straight
   * list reads as a wavy one. Worse, the widths move under the reader: the
   * feeds behind these panels refetch while they are open.
   *
   * Columns without one share whatever the declared columns leave.
   */
  width?: string;
}

export interface DrillSubProps<Row> {
  /** What these rows are, in a sentence — the left of the head. */
  lede: ReactNode;
  /**
   * The roll-up the row above states, recomputed from these rows.
   *
   * Recomputed rather than carried down: the row IS a roll-up of exactly
   * these, so anything that made the two disagree is worth seeing rather than
   * hiding.
   */
  stats?: ReactNode;
  columns: DrillSubColumn<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row, index: number) => string;
  /** Why there are no rows. Never a blank table. */
  empty: string;
  /** The rows are still arriving — which is not the same as there being none. */
  loading?: boolean;
}

/**
 * A row's own rows, opened underneath it.
 *
 * Every panel on this board answers "which ones", and every row of every panel
 * raises the question again one level down: which items make up that variety,
 * which bills make up that customer, which trucks are in that state. This is
 * that second level, and it is one component rather than one per panel so the
 * second level looks the same wherever the reader opens it.
 *
 * Deliberately narrower than the panel's own table: it sits inside one cell of
 * that table, and repeating its full weight would bury the list the reader came
 * to scan.
 */
export function DrillSub<Row>({
  lede,
  stats,
  columns,
  rows,
  rowKey,
  empty,
  loading = false,
}: DrillSubProps<Row>) {
  if (loading) {
    return (
      <div className="ops-drill__sub">
        <p className="ops-drill__empty">Reading…</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="ops-drill__sub">
        <p className="ops-drill__empty">{empty}</p>
      </div>
    );
  }

  // Whatever the declared columns leave, split evenly among the rest — so a
  // caller may pin the two columns that matter and ignore the others.
  const declared = columns.reduce(
    (total, column) => total + (column.width ? Number.parseFloat(column.width) : 0),
    0,
  );
  const undeclared = columns.filter((column) => !column.width).length;
  const share = undeclared > 0 ? Math.max(4, (100 - declared) / undeclared) : 0;

  return (
    <div className="ops-drill__sub">
      <div className="ops-drill__subhead">
        <span>{lede}</span>
        {stats && <span className="ops-drill__substats">{stats}</span>}
      </div>

      <table className="ops-drill__subtable">
        <colgroup>
          {columns.map((column) => (
            <col key={column.label} style={{ width: column.width ?? `${share}%` }} />
          ))}
        </colgroup>
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
    </div>
  );
}
