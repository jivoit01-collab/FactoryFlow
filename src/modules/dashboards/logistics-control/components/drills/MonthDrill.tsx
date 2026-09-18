import { useMemo } from 'react';

import { useDispatchBills } from '../../../dispatch-fulfilment/api';
import { DrillSub } from '../DrillSub';
import { OpsDrill } from '../OpsDrill';
import { useExpandedRow } from '../useExpandedRow';
import type { Board } from './board';
import { dispatchedCustomers } from './customers';
import { decimal, money, shortDate, weekday, whole } from './format';

/**
 * Who took one day's tonnage.
 *
 * Fetched when the day is opened and not before. The board asks the dispatch
 * feed for daily totals only; pulling every bill of every day of the month up
 * front — on a wall that polls — to serve a row nobody has opened would be a
 * poor trade. One day is open at a time, so this is one request per row the
 * reader actually asks about, and react-query keeps it for the second ask.
 */
function DayCustomers({
  date,
  companies,
}: {
  date: string;
  /** The board's companies — the day must not answer wider than its tile. */
  companies: readonly string[];
}) {
  const bills = useDispatchBills({
    from: date,
    to: date,
    status: 'DISPATCHED',
    limit: 200,
    offset: 0,
    order: 'newest',
    companies,
  });

  // Memoised, not inlined: `?? []` is a fresh array on every render where the
  // day has answered nothing, and the roll-up hangs off it.
  const rows = useMemo(() => bills.data?.results ?? [], [bills.data?.results]);
  const total = bills.data?.count ?? rows.length;
  // The feed caps a page server-side, whatever this asks for. A day that hit
  // the cap says so rather than presenting part of itself as the whole.
  const truncated = total > rows.length;

  const customers = useMemo(() => dispatchedCustomers(rows), [rows]);
  const tonnes = customers.reduce((total_, row) => total_ + row.tonnes, 0);
  const value = customers.reduce((total_, row) => total_ + row.value, 0);

  return (
    <DrillSub
      lede={
        truncated
          ? `Who took ${shortDate(date)} · first ${whole(rows.length)} of ${whole(total)} bills`
          : `Who took ${shortDate(date)}`
      }
      stats={
        <>
          <b>{whole(customers.length)}</b>{' '}
          {customers.length === 1 ? 'customer' : 'customers'} · <b>{decimal(tonnes, 2)}</b> t ·{' '}
          <b>{whole(total)}</b> {total === 1 ? 'bill' : 'bills'} · <b>{money(value)}</b>
        </>
      }
      rows={customers}
      rowKey={(row) => row.customer}
      loading={bills.isLoading}
      empty={
        bills.error ? 'Could not read the dispatch feed.' : 'Nothing cleared the gate this day.'
      }
      columns={[
        { label: 'Customer', cell: (row) => row.customer, width: '30%' },
        { label: 'Warehouse', cell: (row) => row.warehouse, dim: true, width: '14%' },
        { label: 'Bills', cell: (row) => whole(row.bills), numeric: true, width: '9%' },
        { label: 'Trucks', cell: (row) => whole(row.trucks), numeric: true, width: '9%' },
        { label: 'Tonnes', cell: (row) => decimal(row.tonnes, 2), numeric: true, width: '11%' },
        { label: 'Boxes', cell: (row) => whole(row.boxes), numeric: true, width: '11%' },
        { label: 'Value', cell: (row) => money(row.value), numeric: true, width: '16%' },
      ]}
    />
  );
}

/**
 * The month so far, day by day — and who took any one day.
 *
 * Day by day rather than bill by bill: a month of bills is several hundred
 * rows and answers a question nobody asks of a month-to-date figure. The shape
 * that matters here is the one the tile's bars already draw — which days were
 * strong, which were slow, which moved nothing — over the whole month rather
 * than the seven days that fit on the wall. The bills are still there, under
 * the day they left on.
 */
export function MonthDrill({
  board,
  companies,
  onClose,
}: {
  board: Board;
  companies: readonly string[];
  onClose: () => void;
}) {
  const { openKey, toggle } = useExpandedRow();

  const mtd = board.dispatch.monthToDate;
  const days = board.dispatch.trend;
  const best = days.reduce((peak, day) => (day.tonnes > peak.tonnes ? day : peak), {
    date: '',
    tonnes: 0,
  });
  const activeDays = days.filter((day) => day.tonnes > 0).length;

  return (
    <OpsDrill
      title="Month to date"
      subtitle={`${shortDate(board.monthStart)} – ${shortDate(board.today)} · day by day — open one for its customers`}
      domain="dispatch"
      onClose={onClose}
      stats={[
        { label: 'Tonnes', value: decimal(mtd.tonnes) },
        {
          label: 'Average a day',
          // Over the days that dispatched, not the calendar — the tile's own
          // divisor, so the panel and the subtitle above it agree.
          value: mtd.averagePerActiveDay == null ? '—' : decimal(mtd.averagePerActiveDay),
        },
        { label: 'Days dispatching', value: `${whole(activeDays)} of ${whole(days.length)}` },
        { label: 'Best day', value: best.tonnes > 0 ? shortDate(best.date) : '—' },
      ]}
      // Newest first: the question asked of a month-to-date list is what has
      // happened lately, and the reader should not have to scroll to reach
      // today.
      rows={[...days].reverse()}
      rowKey={(row) => row.date}
      empty="Nothing has left the gate this month."
      loading={board.dispatch.loading}
      onRowClick={(row) => toggle(row.date)}
      // A day that moved nothing has nobody to show, so it does not offer to
      // open — the chevron would promise a list that cannot exist.
      canOpenRow={(row) => row.tonnes > 0}
      expandedKey={openKey}
      renderExpanded={(row) => <DayCustomers date={row.date} companies={companies} />}
      columns={[
        {
          label: 'Date',
          cell: (row) => (
            <>
              {shortDate(row.date)}
              {row.date === board.today && <span className="dim"> · today</span>}
            </>
          ),
        },
        { label: 'Day', cell: (row) => weekday(row.date), dim: true },
        {
          label: 'Tonnes',
          numeric: true,
          // A day that moved nothing shows a dash, not 0.0 — a blank day on a
          // wall reads as a shutdown, which is what it usually is.
          cell: (row) =>
            row.tonnes > 0 ? decimal(row.tonnes, 1) : <span className="dim">—</span>,
        },
        {
          label: 'Trucks',
          numeric: true,
          cell: (row) => (row.trucks > 0 ? whole(row.trucks) : <span className="dim">—</span>),
        },
        {
          label: 'Bills',
          numeric: true,
          cell: (row) =>
            row.bills == null ? (
              <span className="dim">—</span>
            ) : row.bills > 0 ? (
              whole(row.bills)
            ) : (
              <span className="dim">—</span>
            ),
        },
        {
          label: 'Share of month',
          numeric: true,
          cell: (row) =>
            mtd.tonnes > 0 && row.tonnes > 0 ? (
              `${decimal((row.tonnes / mtd.tonnes) * 100, 1)}%`
            ) : (
              <span className="dim">—</span>
            ),
        },
      ]}
    />
  );
}
