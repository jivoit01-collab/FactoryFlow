import { useMemo } from 'react';

import { billWarehouse } from '../../utils';
import { DrillSub } from '../DrillSub';
import { OpsDrill } from '../OpsDrill';
import { useExpandedRow } from '../useExpandedRow';
import type { Board } from './board';
import { collect, decimal, money, shortDate, whole } from './format';
import { BOOKING_STATUS_LABELS } from './labels';

/** The bill's customer, never a blank cell. */
function customerOf(bill: { card_name?: string | null }): string {
  return (bill.card_name ?? '').trim() || 'Unnamed customer';
}

/**
 * The consignment a bill belongs to: customer, date, and where it ships from.
 *
 * One function rather than the same template string in two places — the
 * roll-up and the bills shown under a row MUST agree on what a consignment
 * is, or opening a customer would show a different set of bills than the row
 * counted.
 *
 * Warehouse joins the key, not just the row: a consignment that ships from two
 * places is two loads, and grouping them would show one. In practice it almost
 * never splits them further -- 1,306 of 1,308 recent bills draw from a single
 * warehouse.
 */
function consignmentKey(bill: {
  card_name?: string | null;
  warehouses?: string | null;
  plan?: { dispatch_date?: string | null } | null;
}): string {
  return `${customerOf(bill)}|${bill.plan?.dispatch_date ?? ''}|${billWarehouse(bill.warehouses)}`;
}

/** One customer's load for one date out of one warehouse. */
interface Consignment {
  key: string;
  customer: string;
  date: string | null;
  warehouse: string;
  bills: number;
  tonnes: number;
  booked: number;
}

/**
 * One consignment's bills, opened underneath its own row.
 *
 * The figures on the strip are recomputed from these bills rather than carried
 * down from the row above — the row IS a roll-up of exactly these, so anything
 * that made the two disagree is worth seeing rather than hiding.
 */
function ConsignmentBills({
  bills,
  consignment,
}: {
  bills: Board['warehouse']['pendingDispatch']['rows'];
  consignment: Consignment;
}) {
  const tonnes = bills.reduce((total, bill) => total + (bill.total_weight ?? 0), 0) / 1000;
  const value = bills.reduce((total, bill) => total + (bill.doc_total ?? 0), 0);
  const booked = bills.filter((bill) => bill.plan?.vehicle_id != null).length;

  return (
    <DrillSub
      /*
       * TWO DATES, AND THEY ARE NOT THE SAME ONE.
       *
       * This one is `plan.dispatch_date` — when the load is due to LEAVE, and
       * what these bills are grouped by. The Invoiced column below is
       * `doc_date`, when SAP raised the invoice, which is normally a day or
       * more earlier. Read as "waiting … for 5 Sept" above a column of "4 Sept"
       * the two look like a contradiction, so this says which of the two it is
       * rather than leaving the reader to guess.
       */
      lede={
        <>
          {bills.length === 1 ? 'The bill' : 'The bills'} waiting at {consignment.warehouse}
          {consignment.date ? `, due to leave ${shortDate(consignment.date)}` : ''}
        </>
      }
      stats={
        <>
          {/* Singular where there is one, matching the sentence on the left —
              "The bill waiting at BH-JW" above "1 bills" reads as a bug. */}
          <b>{whole(bills.length)}</b> {bills.length === 1 ? 'bill' : 'bills'} ·{' '}
          <b>{decimal(tonnes, 2)}</b> t · <b>{whole(booked)}</b> of {whole(bills.length)} on a
          truck · <b>{money(value)}</b>
        </>
      }
      rows={bills}
      rowKey={(bill) => String(bill.doc_entry)}
      empty="These bills have left or been cancelled since the panel opened."
      columns={[
        { label: 'Invoice', cell: (bill) => bill.doc_num || '—', width: '13%' },
        {
          // The date SAP raised the invoice — NOT the dispatch date in the
          // line above, which is when the load is due out.
          label: 'Invoiced',
          cell: (bill) => shortDate(bill.doc_date),
          dim: true,
          width: '9%',
        },
        { label: 'Boxes', cell: (bill) => whole(bill.total_boxes ?? 0), numeric: true, width: '8%' },
        {
          label: 'Litres',
          cell: (bill) => whole(bill.total_litres ?? 0),
          numeric: true,
          width: '9%',
        },
        {
          label: 'Tonnes',
          cell: (bill) => decimal((bill.total_weight ?? 0) / 1000, 2),
          numeric: true,
          width: '9%',
        },
        { label: 'Value', cell: (bill) => money(bill.doc_total), numeric: true, width: '11%' },
        {
          // The truck, or plainly that there is none — this column is the
          // reason the reader opened the customer.
          label: 'Vehicle',
          width: '15%',
          cell: (bill) =>
            bill.plan?.vehicle_no?.trim() ? (
              bill.plan.vehicle_no
            ) : (
              <span className="dim">Awaiting a truck</span>
            ),
        },
        {
          label: 'Transporter',
          cell: (bill) => bill.plan?.transporter_name?.trim() || '—',
          dim: true,
          width: '14%',
        },
        {
          label: 'Status',
          cell: (bill) => BOOKING_STATUS_LABELS[bill.plan?.booking_status ?? ''] ?? '—',
          dim: true,
          width: '12%',
        },
      ]}
    />
  );
}

/** The bills waiting to leave, and the bills behind any one of them. */
export function PendingDispatchDrill({
  which,
  pending,
  onClose,
}: {
  which: 'pending' | 'planned';
  pending: Board['warehouse']['pendingDispatch'];
  onClose: () => void;
}) {
  const { openKey, toggle } = useExpandedRow();

  const bookedBills = pending.rows.filter((bill) => bill.plan?.vehicle_id != null);

  /*
   * One row per consignment, not per bill.
   *
   * A consignment is a customer AND a dispatch date: the same customer
   * legitimately has bills waiting on several days, and those load onto
   * different trucks. Keying on the customer alone would make a group that
   * cannot go together look like one that can.
   *
   * Built in first-appearance order so the feed's own sort still decides
   * what is near the top.
   */
  const consignments = useMemo<Consignment[]>(() => {
    const order: string[] = [];
    const byKey = new Map<string, Consignment>();

    for (const bill of pending.rows) {
      const key = consignmentKey(bill);
      if (!byKey.has(key)) {
        byKey.set(key, {
          key,
          customer: customerOf(bill),
          date: bill.plan?.dispatch_date ?? null,
          warehouse: billWarehouse(bill.warehouses),
          bills: 0,
          tonnes: 0,
          booked: 0,
        });
        order.push(key);
      }
      const group = byKey.get(key)!;
      group.bills += 1;
      group.tonnes += (bill.total_weight ?? 0) / 1000;
      // The vehicle link, not the status: the status is client-writable and
      // drifts, while the truck being attached is the fact underneath it.
      if (bill.plan?.vehicle_id != null) group.booked += 1;
    }

    return order.map((key) => byKey.get(key)!);
  }, [pending.rows]);

  /*
   * The same bills, cut by where they ship from.
   *
   * A PARTITION, not a tally: every bill lands in exactly one entry, so
   * these tonnes add back up to the headline. A bill drawing on two
   * warehouses gets its own compound entry rather than being counted under
   * each -- counting it twice would make the strip disagree with the figure
   * above it, which is the one thing a drill-down must never do.
   *
   * Ordered heaviest first: on this panel the question is which store the
   * waiting freight is sitting in.
   */
  const byWarehouse = useMemo(() => {
    const totals = new Map<string, { bills: number; tonnes: number }>();
    for (const row of consignments) {
      const slot = totals.get(row.warehouse) ?? { bills: 0, tonnes: 0 };
      slot.bills += row.bills;
      slot.tonnes += row.tonnes;
      totals.set(row.warehouse, slot);
    }
    return [...totals.entries()]
      .sort((a, b) => b[1].tonnes - a[1].tonnes)
      .map(([warehouse, totalsFor]) => ({
        key: warehouse,
        label: warehouse,
        value: `${decimal(totalsFor.tonnes, 2)} t`,
        sub: `${whole(totalsFor.bills)} ${totalsFor.bills === 1 ? 'bill' : 'bills'}`,
      }));
  }, [consignments]);

  /*
   * The bills of whichever consignment is open, grouped once for all of them.
   *
   * Keyed rather than filtered per render: the expanded row asks for its own
   * bills during render, and re-filtering the whole feed there would walk
   * every bill again on each keystroke the panel sees.
   */
  const billsByKey = useMemo(() => collect(pending.rows, consignmentKey), [pending.rows]);

  return (
    <OpsDrill
      title={which === 'planned' ? 'Planned against booked' : 'Pending dispatch'}
      subtitle="Consignments with a dispatch date set that have not left — open one for its bills"
      domain={which === 'planned' ? 'dispatch' : 'warehouse'}
      onClose={onClose}
      stats={[
        { label: 'Tonnes', value: decimal(pending.tonnes) },
        { label: 'Bills', value: whole(pending.invoices) },
        { label: 'On a truck', value: whole(bookedBills.length) },
        { label: 'Awaiting a truck', value: whole(pending.invoices - bookedBills.length) },
      ]}
      breakdown={{
        title: 'Waiting, by warehouse',
        items: byWarehouse,
        empty: 'No warehouse is holding anything dated to leave.',
      }}
      rows={consignments}
      rowKey={(row) => row.key}
      empty="No bill is dated to leave and still waiting."
      loading={pending.loading}
      onRowClick={(row) => toggle(row.key)}
      expandedKey={openKey}
      renderExpanded={(row) => (
        <ConsignmentBills bills={billsByKey.get(row.key) ?? []} consignment={row} />
      )}
      columns={[
        { label: 'Customer', cell: (row) => row.customer },
        { label: 'Warehouse', cell: (row) => row.warehouse, dim: true },
        {
          label: 'Dispatch date',
          cell: (row) => (row.date ? shortDate(row.date) : '—'),
          dim: true,
        },
        { label: 'Bills', cell: (row) => whole(row.bills), numeric: true },
        { label: 'Tonnes', cell: (row) => decimal(row.tonnes, 2), numeric: true },
        {
          label: 'On a truck',
          // Partly-booked consignments are the ones worth chasing, so the
          // figure is a fraction rather than a tick: "2 of 5" says more
          // than "booked" and costs the same room.
          cell: (row) =>
            row.booked === row.bills ? (
              `${whole(row.bills)} of ${whole(row.bills)}`
            ) : (
              <span className="dim">{`${whole(row.booked)} of ${whole(row.bills)}`}</span>
            ),
          numeric: true,
        },
      ]}
    />
  );
}
