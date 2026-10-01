import { useState } from 'react';

import { getErrorMessage } from '@/shared/utils';

import { OpsDrill } from '../../logistics-control/components';
import { useBoardPeriod } from '../../hooks/boardPeriod.context';
import { useAdminDispatchBills } from '../api';
import type { AdminDispatchBill, AdminDispatchBills, AdminDispatchCompany } from '../types';
import { money, NO_VALUE, tons, whole } from '../utils';

/** "2026-09-26" -> "26 Sept". A date this list cannot read prints as a rule. */
function shortDate(iso: string | null): string {
  if (!iso) return NO_VALUE;
  const day = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(day.getTime())) return NO_VALUE;
  return day.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** Bill to gate, in the words a dispatcher uses for it. */
function waited(days: number | null): string {
  if (days === null) return NO_VALUE;
  if (days <= 0) return 'same day';
  return days === 1 ? '1 day' : `${days} days`;
}

/**
 * One bill's weight. Under a tonne it is kilograms: a 40 kg bill printed as
 * "0.0 T" sits beside the ones with no weight at all and reads as one of them.
 */
function billWeight(bill: AdminDispatchBill): string {
  if (!bill.weighed) return 'no weight';
  if (bill.tons < 1) return `${whole(bill.tons * 1000)} kg`;
  return `${tons(bill.tons)} T`;
}

function plural(count: number, one: string, many = `${one}s`): string {
  return `${whole(count)} ${count === 1 ? one : many}`;
}

export interface AdminDispatchBillsDrillProps {
  /** The row that was opened — its figures head the panel before the list arrives. */
  company: AdminDispatchCompany;
  /** The company as the panel above named it, so the two read the same. */
  name: string;
  period: string;
  bills?: AdminDispatchBills;
  loading?: boolean;
  /** Why the list could not be read, said in place of the rows. */
  error?: string | null;
  onBack: () => void;
  onClose: () => void;
}

/**
 * One company's bills, one row per bill per truck.
 *
 * THE LIST ADDS UP TO THE ROW THAT OPENED IT. The same gate-out rows, the same
 * tonnes, the same bill count, so the stats at the top are the company row's
 * own figures and are shown before the list has even arrived.
 *
 * A second panel with a back arrow rather than rows folded open under the
 * company, because a month is several hundred bills wide and nine columns
 * across; squeezed into one cell of a two-row table it would be unreadable.
 * The per-bill detail nobody scans down — gate pass, e-way bill, driver — folds
 * open under the bill instead, where the reader is already looking.
 */
export function AdminDispatchBillsDrill({
  company,
  name,
  period,
  bills,
  loading = false,
  error = null,
  onBack,
  onClose,
}: AdminDispatchBillsDrillProps) {
  // "today" and "this month", or an ended month's last day and its name.
  const { monthWord } = useBoardPeriod();
  const [openKey, setOpenKey] = useState<string | null>(null);

  const notes = bills
    ? [
        bills.earlier_bills.bills > 0 && {
          key: 'earlier',
          label: monthWord === 'this month' ? 'Raised before this month' : 'Raised before the month',
          value: `${plural(bills.earlier_bills.bills, 'bill')} · ${tons(bills.earlier_bills.tons)} T`,
          sub: `billed before ${shortDate(bills.from)}, out ${monthWord}`,
        },
        bills.unweighed_bills > 0 && {
          key: 'unweighed',
          label: 'No weight recorded',
          value: plural(bills.unweighed_bills, 'bill'),
          sub: 'out of the gate, but missing from the tonnes',
        },
        bills.split_bills > 0 && {
          key: 'split',
          label: 'Split across trucks',
          value: plural(bills.split_bills, 'bill'),
          sub: 'listed once per truck, counted once',
        },
      ].filter((item): item is { key: string; label: string; value: string; sub: string } =>
        Boolean(item),
      )
    : [];

  return (
    <OpsDrill
      title={`${name} · bills dispatched`}
      domain="dispatch"
      subtitle={`${period} · one row per bill per truck, from the gate-out register — newest truck first`}
      onBack={onBack}
      backLabel="Total dispatch"
      onClose={onClose}
      stats={[
        { label: 'Left the gate', value: `${tons(company.tons)} T` },
        {
          label: 'Bills',
          value: `${plural(company.bills, 'bill')} · ${plural(company.trucks, 'truck')}`,
        },
        { label: 'Billed value', value: bills ? money(bills.amount) : NO_VALUE },
        {
          label: 'Bill to gate',
          value:
            bills?.avg_days_to_dispatch == null
              ? NO_VALUE
              : `${bills.avg_days_to_dispatch.toLocaleString('en-IN')} days on average`,
        },
      ]}
      breakdown={notes.length > 0 ? { title: 'Worth knowing', items: notes } : undefined}
      loading={loading}
      rows={error ? [] : (bills?.rows ?? [])}
      rowKey={(bill: AdminDispatchBill) => bill.key}
      empty={error ?? `No ${name} truck left the gate ${monthWord}.`}
      onRowClick={(bill: AdminDispatchBill) =>
        setOpenKey((current) => (current === bill.key ? null : bill.key))
      }
      expandedKey={openKey}
      renderExpanded={(bill: AdminDispatchBill) => <BillDetail bill={bill} />}
      columns={[
        {
          label: 'Bill',
          cell: (bill: AdminDispatchBill) => bill.bill_no,
        },
        {
          label: 'Bill date',
          cell: (bill: AdminDispatchBill) => shortDate(bill.bill_date),
        },
        {
          label: 'Dispatched',
          cell: (bill: AdminDispatchBill) =>
            bill.out_time
              ? `${shortDate(bill.dispatch_date)}, ${bill.out_time}`
              : shortDate(bill.dispatch_date),
        },
        {
          label: 'Bill to gate',
          cell: (bill: AdminDispatchBill) => waited(bill.days_to_dispatch),
          dim: true,
        },
        {
          label: 'Customer',
          cell: (bill: AdminDispatchBill) => bill.customer_name || bill.customer_code || NO_VALUE,
        },
        {
          label: 'Truck',
          cell: (bill: AdminDispatchBill) => bill.vehicle_no || NO_VALUE,
        },
        {
          label: 'Weight',
          // Not "0 kg": the truck carried something, the register just holds
          // no weight for it, and a zero would claim it was weighed empty.
          cell: (bill: AdminDispatchBill) => billWeight(bill),
          numeric: true,
        },
        {
          label: 'Boxes',
          cell: (bill: AdminDispatchBill) => whole(bill.boxes),
          numeric: true,
        },
        {
          label: 'Value',
          cell: (bill: AdminDispatchBill) => money(bill.amount),
          numeric: true,
        },
      ]}
    />
  );
}

/** The rest of what the gate pass records about one bill's truck. */
function BillDetail({ bill }: { bill: AdminDispatchBill }) {
  const items = [
    { key: 'gatepass', label: 'Gate pass', value: bill.gatepass_no || NO_VALUE },
    { key: 'eway', label: 'E-way bill', value: bill.eway_bill || NO_VALUE },
    {
      key: 'driver',
      label: 'Driver',
      value: bill.driver_name || NO_VALUE,
      // Carried in the name already on most rows ("Ravi 9650986798"), so
      // printed only where it adds something.
      sub:
        bill.driver_mobile_no && !bill.driver_name.includes(bill.driver_mobile_no)
          ? bill.driver_mobile_no
          : undefined,
    },
    { key: 'transporter', label: 'Transporter', value: bill.transporter_name || NO_VALUE },
    {
      key: 'truck',
      label: 'On this truck',
      value: plural(bill.bills_on_truck, 'bill'),
      sub:
        bill.trucks_for_bill > 1
          ? `this bill left on ${bill.trucks_for_bill} trucks`
          : bill.place_of_supply
            ? `to ${bill.place_of_supply}`
            : undefined,
    },
  ];

  return (
    <div className="ops-drill__cutrow">
      {items.map((item) => (
        <div key={item.key} className="ops-drill__stat">
          <span className="k">{item.label}</span>
          <span className="v">{item.value}</span>
          {item.sub && <span className="s">{item.sub}</span>}
        </div>
      ))}
    </div>
  );
}

/** The panel, reading its own list. Mounted only once a company row is opened. */
export function AdminDispatchBillsPanel({
  company,
  name,
  period,
  onBack,
  onClose,
}: Pick<AdminDispatchBillsDrillProps, 'company' | 'name' | 'period' | 'onBack' | 'onClose'>) {
  // The board's own month: the rows behind September's tile are September's bills.
  const { pastMonth } = useBoardPeriod();
  const query = useAdminDispatchBills(company.company_code, pastMonth);

  return (
    <AdminDispatchBillsDrill
      company={company}
      name={name}
      period={period}
      bills={query.data}
      loading={query.isLoading}
      error={
        query.error ? getErrorMessage(query.error, `${name}'s bills could not be read.`) : null
      }
      onBack={onBack}
      onClose={onClose}
    />
  );
}
