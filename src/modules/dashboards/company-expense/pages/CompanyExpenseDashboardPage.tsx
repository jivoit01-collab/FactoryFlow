import '../styles/expense-board.css';

import { useMemo, useRef, useState } from 'react';

import { useFullscreen } from '../../dispatch/hooks';
// The file directly, not the module's barrel: that barrel also exports
// `useLogisticsControlBoard`, which drags a whole second board's API layer into
// this chunk for the sake of one twenty-line hook.
import { useFullBleed } from '../../logistics-control/hooks/useFullBleed';
import { useExpenseMatrix } from '../api';
import { ExpenseGrid, ExpenseTopbar } from '../components';
import { DEFAULT_SPAN, SHARED_ROW_KEY } from '../constants';
import type { ExpenseRow, ExpenseSpanKey } from '../types';
import { amount, describeRange, money, rangeFor } from '../utils';

/**
 * The order the rows are drawn in.
 *
 * The server sorts companies by code — Beverages, Mart, Oil — which puts the
 * factory's largest spender last. The board reads Oil, Mart, Beverages, the
 * order the plant is spoken about in, with the shared row pinned underneath
 * because it is not a company and must not look like the fourth one.
 */
const ROW_ORDER = ['JIVO_OIL', 'JIVO_MART', 'JIVO_BEVERAGES'];

function orderRows(rows: ExpenseRow[]): ExpenseRow[] {
  const rank = (row: ExpenseRow) => {
    if (row.key === SHARED_ROW_KEY) return ROW_ORDER.length + 1;
    const index = ROW_ORDER.indexOf(row.key);
    // A company the list has never heard of sorts between the known ones and
    // the shared row, rather than silently vanishing: a fourth entity added in
    // Django should appear on the board the day it is created.
    return index === -1 ? ROW_ORDER.length : index;
  };
  return [...rows].sort((a, b) => rank(a) - rank(b));
}

/**
 * Company Expense — what each company spent, line by line.
 *
 * One grid: a row per company, a column per cost line, and a total row that is
 * added from the rows above it rather than computed separately, so what the
 * board displays is provably what it adds up to.
 *
 * Three of the four columns carry something no single company owns, and the
 * board says so rather than guessing. Six campus electricity meters feed both
 * Oil and Beverages; a Cost Master salary rate can be set for no company at
 * all; and labour is owned by its *department*, so the Dock (Oil and Mart both),
 * the Mess, and everyone the gate counted whom no department has claimed belong
 * to nobody in particular. All of it lands in one explicit **shared** row.
 * Splitting the meters fifty-fifty would have been easy and would have invented
 * about ₹13 L a month of attribution that no meter supports.
 *
 * Colour belongs to the column, not the row — the grid is read down far more
 * than across — and the family is warm on purpose, so it is not mistaken for
 * Logistics Control from across the room.
 *
 * Built for a screen nobody is standing at: one viewport, nothing below the
 * fold, and type that scales with the display. See `expense-board.css` for why
 * every length is a `calc()` against a board-local unit rather than a `rem`.
 */
export function CompanyExpenseDashboardPage() {
  const [span, setSpan] = useState<ExpenseSpanKey>(DEFAULT_SPAN);

  // Recomputed only when the span changes, not on every render: `rangeFor`
  // reads the clock, and a fresh `to` date on each render would be a new query
  // key and an endless refetch the moment the board is left running past
  // midnight.
  const range = useMemo(() => rangeFor(span), [span]);

  const { data, isLoading, isError, error, isFetching, refetch } = useExpenseMatrix(
    range.from,
    range.to,
  );

  // Fullscreen targets the board itself, not the document, so the app shell
  // drops away and the `--u` clamp gets the real viewport to scale against.
  const boardRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggle } = useFullscreen(boardRef);

  // The board is one viewport wide by design; the shell's centred column is not.
  useFullBleed(boardRef, 'exp-bleed');

  const rows = useMemo(() => (data ? orderRows(data.rows) : []), [data]);

  const scope = data
    ? describeRange(data.date_from, data.date_to, data.days)
    : 'Loading…';

  const grandTotal = data ? amount(data.total.total) : 0;
  const perDay = data && data.days ? grandTotal / data.days : 0;

  return (
    <div className="exp-board" ref={boardRef}>
      <div className="exp-board__inner">
        <ExpenseTopbar
          scope={scope}
          span={span}
          onSpanChange={setSpan}
          grandTotal={data ? money(grandTotal) : ''}
          grandSub={data ? `${money(perDay)} a day` : 'fetching'}
          busy={isFetching}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggle}
        />

        {/* Board-wide problems sit above the grid, named. A missing rate is
            somebody's job to fix, and a wall that shows ₹0 without saying why
            gets ignored inside a week. */}
        {data && data.warnings.length > 0 ? (
          <div className="exp-warnings">
            <b>Check</b>
            {data.warnings.map((warning) => (
              <span key={warning}>{warning}</span>
            ))}
          </div>
        ) : (
          <div />
        )}

        {isError ? (
          <div className="exp-state">
            <h2>The expense grid could not be read</h2>
            <p>
              {error instanceof Error
                ? error.message
                : 'The server did not answer. Nothing on this board is stale — it is simply not there.'}
            </p>
            <button type="button" onClick={() => void refetch()}>
              Try again
            </button>
          </div>
        ) : isLoading || !data ? (
          <div className="exp-state">
            <h2>Reading the registers…</h2>
            <p>Gate headcount, electricity meters, spares and indents.</p>
          </div>
        ) : (
          <ExpenseGrid
            columns={data.columns}
            rows={rows}
            total={data.total}
            days={data.days}
            reconciliation={data.electricity_reconciliation}
          />
        )}
      </div>
    </div>
  );
}

export default CompanyExpenseDashboardPage;
