import { useMemo } from 'react';

import { useDispatchBills } from '../../../dispatch-fulfilment/api';
import type { BillRow } from '../../../dispatch-fulfilment/types';
import { billWarehouse } from '../../utils';
import { DrillSub } from '../DrillSub';
import { OpsDrill } from '../OpsDrill';
import { useExpandedRow } from '../useExpandedRow';
import { billCustomer, dispatchedCustomers } from './customers';
import { collect, decimal, money, shortDate, whole } from './format';

/** One customer's bills, opened underneath its own row. */
export function CustomerBills({ customer, bills }: { customer: string; bills: BillRow[] }) {
  const sorted = [...bills].sort(
    (a, b) => (b.dispatched_weight ?? 0) - (a.dispatched_weight ?? 0),
  );
  const tonnes = bills.reduce((total, bill) => total + (bill.dispatched_weight ?? 0), 0) / 1000;
  const value = bills.reduce((total, bill) => total + (bill.dispatched_amount ?? 0), 0);

  return (
    <DrillSub
      lede={`What went to ${customer}`}
      stats={
        <>
          <b>{whole(bills.length)}</b> {bills.length === 1 ? 'bill' : 'bills'} ·{' '}
          <b>{decimal(tonnes, 2)}</b> t · <b>{money(value)}</b>
        </>
      }
      rows={sorted}
      rowKey={(bill) => String(bill.id)}
      empty="These bills have changed since the panel opened."
      columns={[
        {
          label: 'Invoice',
          cell: (bill) => bill.sap_doc_num || bill.invoice_number,
          width: '12%',
        },
        {
          label: 'Warehouse',
          cell: (bill) => billWarehouse(bill.warehouses),
          dim: true,
          width: '11%',
        },
        { label: 'Vehicle', cell: (bill) => bill.vehicle_no || '—', width: '13%' },
        {
          label: 'Transporter',
          cell: (bill) => bill.transporter_name || '—',
          dim: true,
          width: '16%',
        },
        {
          label: 'Tonnes',
          cell: (bill) => decimal((bill.dispatched_weight ?? 0) / 1000, 2),
          numeric: true,
          width: '10%',
        },
        {
          label: 'Boxes',
          cell: (bill) => whole(bill.dispatched_boxes ?? 0),
          numeric: true,
          width: '9%',
        },
        {
          label: 'Value',
          cell: (bill) => money(bill.dispatched_amount),
          numeric: true,
          width: '12%',
        },
        {
          // When the truck actually cleared the gate — the fact behind the
          // tile, and not the invoice's own date.
          label: 'Gate out',
          cell: (bill) => shortDate(bill.last_dispatched_at),
          dim: true,
          width: '9%',
        },
      ]}
    />
  );
}

/**
 * Bills that actually left the gate over a window, by customer.
 *
 * Its own component so the fetch is mounted with the panel: the board asks the
 * dispatch feed for totals only, and firing a second request for every bill on
 * every board load — on a wall that polls — to serve a panel nobody has opened
 * would be a poor trade.
 *
 * Scoped to the board's own companies rather than the caller's, for the reason
 * given on `DispatchBillFilters.companies`.
 */
export function DispatchedDrill({
  from,
  to,
  title,
  totalTonnes,
  companies,
  onClose,
}: {
  from: string;
  to: string;
  title: string;
  totalTonnes: number;
  /** The board's companies — the panel must not answer wider than its tile. */
  companies: readonly string[];
  onClose: () => void;
}) {
  const { openKey, toggle } = useExpandedRow();

  const bills = useDispatchBills({
    from,
    to,
    status: 'DISPATCHED',
    limit: 200,
    offset: 0,
    order: 'newest',
    companies,
  });

  // Memoised, not inlined: `?? []` is a fresh array on every render where the
  // feed has answered nothing, and three roll-ups hang off it.
  const rows = useMemo(() => bills.data?.results ?? [], [bills.data?.results]);
  const total = bills.data?.count ?? rows.length;
  // The feed caps a page at 100 rows server-side, whatever this asks for.
  const truncated = total > rows.length;

  const customers = useMemo(() => dispatchedCustomers(rows), [rows]);
  const billsByCustomer = useMemo(() => collect(rows, billCustomer), [rows]);

  /*
   * The same bills, cut by where they shipped from.
   *
   * A PARTITION: every bill lands in exactly one entry, and a bill that drew on
   * two warehouses gets its own compound name rather than being counted under
   * each — the tonnes have to add back to the figure above them.
   *
   * Built only from the rows actually on the page. When the feed has truncated,
   * the strip says so rather than presenting a hundred bills' worth of
   * warehouses as if it were the window's.
   */
  const byWarehouse = useMemo(() => {
    const totals = new Map<string, { bills: number; tonnes: number }>();
    for (const row of rows) {
      const warehouse = billWarehouse(row.warehouses);
      const slot = totals.get(warehouse) ?? { bills: 0, tonnes: 0 };
      slot.bills += 1;
      slot.tonnes += (row.dispatched_weight ?? 0) / 1000;
      totals.set(warehouse, slot);
    }
    return [...totals.entries()]
      .sort((a, b) => b[1].tonnes - a[1].tonnes)
      .map(([warehouse, totalsFor]) => ({
        key: warehouse,
        label: warehouse,
        value: `${decimal(totalsFor.tonnes, 2)} t`,
        sub: `${whole(totalsFor.bills)} ${totalsFor.bills === 1 ? 'bill' : 'bills'}`,
      }));
  }, [rows]);

  return (
    <OpsDrill
      title={title}
      subtitle={
        from === to
          ? `${shortDate(from)} · through the gate, by customer — open one for its bills`
          : `${shortDate(from)} – ${shortDate(to)} · through the gate, by customer — open one for its bills`
      }
      domain="dispatch"
      onClose={onClose}
      stats={[
        { label: 'Tonnes', value: decimal(totalTonnes) },
        { label: 'Bills', value: whole(total) },
        { label: 'Customers', value: whole(customers.length) },
      ]}
      breakdown={{
        title: truncated
          ? `Left from, by warehouse · first ${whole(rows.length)} of ${whole(total)} bills`
          : 'Left from, by warehouse',
        items: byWarehouse,
        empty: 'No bill on this page carries a warehouse.',
      }}
      rows={customers}
      rowKey={(row) => row.customer}
      empty={
        bills.error
          ? 'Could not read the dispatch feed.'
          : 'Nothing has cleared the gate in this window.'
      }
      loading={bills.isLoading}
      onRowClick={(row) => toggle(row.customer)}
      expandedKey={openKey}
      renderExpanded={(row) => (
        <CustomerBills
          customer={row.customer}
          bills={billsByCustomer.get(row.customer) ?? []}
        />
      )}
      columns={[
        { label: 'Customer', cell: (row) => row.customer },
        // Next to the customer rather than at the end: the pair "who, and out
        // of where" is the one a reader scans down.
        { label: 'Warehouse', cell: (row) => row.warehouse, dim: true },
        { label: 'Bills', cell: (row) => whole(row.bills), numeric: true },
        { label: 'Trucks', cell: (row) => whole(row.trucks), numeric: true },
        { label: 'Tonnes', cell: (row) => decimal(row.tonnes, 2), numeric: true },
        { label: 'Boxes', cell: (row) => whole(row.boxes), numeric: true },
        { label: 'Value', cell: (row) => money(row.value), numeric: true },
      ]}
    />
  );
}
