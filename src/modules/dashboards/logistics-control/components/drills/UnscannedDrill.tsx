import { useMemo } from 'react';

import { DrillSub } from '../DrillSub';
import { OpsDrill } from '../OpsDrill';
import { useExpandedRow } from '../useExpandedRow';
import type { Board } from './board';
import { collect, companyLabel, sharedLabel, shortDate, whole } from './format';

type Approval = Board['warehouse']['unscanned']['rows'][number];

/** The customer an approval was raised against, never a blank group. */
function customerOf(row: Approval): string {
  return (row.customer_name ?? '').trim() || 'Unnamed customer';
}

/** Boxes an approval let through unscanned. Never negative. */
function shortfall(row: Approval): number {
  return Math.max(0, (row.expected_boxes ?? 0) - (row.scanned_boxes ?? 0));
}

/** One customer's unscanned share of the month. */
interface CustomerShortfall {
  customer: string;
  companies: string;
  approvals: number;
  expected: number;
  scanned: number;
  short: number;
}

/** The approvals behind one customer's shortfall, worst first. */
function CustomerApprovals({
  customer,
  approvals,
}: {
  customer: string;
  approvals: Approval[];
}) {
  const sorted = [...approvals].sort((a, b) => shortfall(b) - shortfall(a));
  const short = approvals.reduce((total, row) => total + shortfall(row), 0);
  const expected = approvals.reduce((total, row) => total + (row.expected_boxes ?? 0), 0);

  return (
    <DrillSub
      lede={`What went out to ${customer} without a full scan`}
      stats={
        <>
          <b>{whole(approvals.length)}</b>{' '}
          {approvals.length === 1 ? 'approval' : 'approvals'} · <b>{whole(short)}</b> boxes short
          of <b>{whole(expected)}</b>
        </>
      }
      rows={sorted}
      rowKey={(row) => String(row.id)}
      empty="Nothing was approved out unscanned for this customer."
      columns={[
        { label: 'Entry', cell: (row) => row.entry_no, width: '12%' },
        { label: 'Invoice', cell: (row) => row.sap_doc_num || '—', width: '10%' },
        { label: 'Vehicle', cell: (row) => row.vehicle_no || '—', width: '11%' },
        {
          label: 'Company',
          cell: (row) => companyLabel(row.company_code),
          dim: true,
          width: '9%',
        },
        {
          label: 'Expected',
          cell: (row) => whole(row.expected_boxes ?? 0),
          numeric: true,
          width: '9%',
        },
        {
          label: 'Scanned',
          cell: (row) => whole(row.scanned_boxes ?? 0),
          numeric: true,
          width: '9%',
        },
        { label: 'Short', cell: (row) => whole(shortfall(row)), numeric: true, width: '7%' },
        {
          // The reason the keeper typed — the only account of WHY the boxes
          // were never scanned, and the reason this panel is worth opening.
          label: 'Reason',
          cell: (row) => row.reason || '—',
          dim: true,
          width: '24%',
        },
        {
          label: 'Approved',
          cell: (row) => shortDate(row.reviewed_at ?? row.requested_at),
          dim: true,
          width: '9%',
        },
      ]}
    />
  );
}

/** What left without a full box scan, by customer, and the approvals behind one. */
export function UnscannedDrill({
  unscanned,
  onClose,
}: {
  unscanned: Board['warehouse']['unscanned'];
  onClose: () => void;
}) {
  const { openKey, toggle } = useExpandedRow();

  const approvalsByCustomer = useMemo(() => collect(unscanned.rows, customerOf), [unscanned.rows]);

  /*
   * One row per customer, worst shortfall first.
   *
   * The month's approvals are a list of incidents; the question asked of them
   * on a control board is whose goods keep going out uncounted, and that is
   * the customer rather than the docking entry. The incidents are one click
   * down, under the customer they belong to.
   */
  const customers = useMemo<CustomerShortfall[]>(
    () =>
      [...approvalsByCustomer.entries()]
        .map(([customer, rows]) => ({
          customer,
          // A customer buying from both companies is one customer with two
          // sets of paperwork — said plainly rather than split into two rows
          // that would not add up to the tile.
          companies: sharedLabel(
            rows.map((row) => companyLabel(row.company_code)),
            'companies',
          ),
          approvals: rows.length,
          expected: rows.reduce((total, row) => total + (row.expected_boxes ?? 0), 0),
          scanned: rows.reduce((total, row) => total + (row.scanned_boxes ?? 0), 0),
          short: rows.reduce((total, row) => total + shortfall(row), 0),
        }))
        .sort((a, b) => b.short - a.short),
    [approvalsByCustomer],
  );

  return (
    <OpsDrill
      title="Sent without barcodes"
      subtitle="Dispatched on approval, boxes never scanned — this month, by customer"
      domain="dispatch"
      onClose={onClose}
      stats={[
        { label: 'Approvals', value: whole(unscanned.approvals) },
        { label: 'Customers', value: whole(customers.length) },
        { label: 'Boxes short', value: whole(unscanned.shortfallBoxes) },
        { label: 'Expected', value: whole(unscanned.expectedBoxes) },
        { label: 'Scanned', value: whole(unscanned.scannedBoxes) },
      ]}
      rows={customers}
      rowKey={(row) => row.customer}
      empty="Nothing has gone out unscanned this month."
      loading={unscanned.loading}
      onRowClick={(row) => toggle(row.customer)}
      expandedKey={openKey}
      renderExpanded={(row) => (
        <CustomerApprovals
          customer={row.customer}
          approvals={approvalsByCustomer.get(row.customer) ?? []}
        />
      )}
      columns={[
        { label: 'Customer', cell: (row) => row.customer },
        { label: 'Company', cell: (row) => row.companies, dim: true },
        { label: 'Approvals', cell: (row) => whole(row.approvals), numeric: true },
        { label: 'Expected', cell: (row) => whole(row.expected), numeric: true },
        { label: 'Scanned', cell: (row) => whole(row.scanned), numeric: true },
        { label: 'Short', cell: (row) => whole(row.short), numeric: true },
        {
          label: 'Share of the shortfall',
          numeric: true,
          cell: (row) =>
            unscanned.shortfallBoxes > 0
              ? `${Math.round((row.short / unscanned.shortfallBoxes) * 100)}%`
              : '—',
        },
      ]}
    />
  );
}
