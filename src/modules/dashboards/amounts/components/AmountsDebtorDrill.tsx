import { useState } from 'react';

import { money, NO_VALUE, pctRough, whole } from '../../admin-control/utils';
import { OpsDrill } from '../../logistics-control/components';
import { useAmountsDebtorBills, useAmountsDebtors } from '../api';
import type {
  AmountsDebtorBill,
  AmountsDebtorCustomer,
  AmountsDebtorFigures,
  AmountsDebtorKey,
} from '../types';
import { debtAge, longDate, shareOf } from '../utils';

export interface AmountsDebtorDrillProps {
  debtorKey: AmountsDebtorKey;
  /** The tile's name: JWPL, MART, Beverages or Total. */
  label: string;
  /** The tile's own figures, for the stats above the list. */
  figures: AmountsDebtorFigures;
  onClose: () => void;
}

/**
 * Who owes one company -- or, from the Total, all three -- and then what.
 *
 * THE ROWS ADD UP TO THE TILE. Every customer in debit is listed with their
 * ledger balance, so the list sums to the tile's figure; group companies and
 * the company's own branches are not in it, exactly as they are not in the
 * tile.
 *
 * The customer is held by company and code and looked up in the current read,
 * so a re-read under the reader cannot leave a stale row open.
 */
export function AmountsDebtorDrill({
  debtorKey,
  label,
  figures,
  onClose,
}: AmountsDebtorDrillProps) {
  const { data, isLoading, error } = useAmountsDebtors(debtorKey);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const isTotal = debtorKey === 'TOTAL';
  const customers = data?.customers ?? [];
  const keyOf = (row: AmountsDebtorCustomer) => `${row.company_code}:${row.card_code}`;
  const opened = customers.find((row) => keyOf(row) === openKey);

  if (opened) {
    return (
      <AmountsDebtorBillsPanel
        customer={opened}
        backLabel={isTotal ? 'All debtors' : `${label} · debtors`}
        onBack={() => setOpenKey(null)}
        onClose={onClose}
      />
    );
  }

  const oldest = figures.oldest;
  const missing = data?.missing ?? [];
  const companyColumn = isTotal
    ? [{ label: 'Company', cell: (row: AmountsDebtorCustomer) => row.company_label, dim: true }]
    : [];

  return (
    <OpsDrill
      title={isTotal ? 'All debtors' : `${label} · debtors`}
      domain="transport"
      subtitle="Customers in debit, largest first, from their SAP ledger balance. Open one for the bills still unpaid."
      onClose={onClose}
      stats={[
        { label: 'Owed', value: money(figures.amount) },
        { label: 'Customers', value: whole(figures.customers) },
        {
          label: 'Oldest',
          value: oldest ? `${longDate(oldest.date)} · ${oldest.card_name}` : NO_VALUE,
        },
        { label: 'Group, not counted', value: money(figures.group_amount) },
      ]}
      breakdown={
        missing.length > 0
          ? {
              title: 'Not listed',
              items: missing.map((name) => ({
                key: name,
                label: name,
                value: 'SAP could not be read',
              })),
            }
          : undefined
      }
      loading={isLoading}
      rows={error ? [] : customers}
      rowKey={keyOf}
      empty={
        error
          ? 'SAP could not be read for these debtors. Close and open the tile again to retry.'
          : 'No customer owes anything.'
      }
      onRowClick={(row: AmountsDebtorCustomer) => setOpenKey(keyOf(row))}
      columns={[
        ...companyColumn,
        { label: 'Customer', cell: (row: AmountsDebtorCustomer) => row.card_name || NO_VALUE },
        { label: 'Code', cell: (row: AmountsDebtorCustomer) => row.card_code, dim: true },
        { label: 'Owes', cell: (row: AmountsDebtorCustomer) => money(row.balance), numeric: true },
        {
          label: 'Unpaid since',
          cell: (row: AmountsDebtorCustomer) => longDate(row.since),
        },
        {
          label: 'Age',
          cell: (row: AmountsDebtorCustomer) => debtAge(row.since)?.label ?? NO_VALUE,
          numeric: true,
          dim: true,
        },
        {
          label: 'Share',
          cell: (row: AmountsDebtorCustomer) => pctRough(shareOf(row.balance, data?.amount)),
          numeric: true,
          dim: true,
        },
      ]}
    />
  );
}

interface AmountsDebtorBillsPanelProps {
  customer: AmountsDebtorCustomer;
  backLabel: string;
  onBack: () => void;
  onClose: () => void;
}

/**
 * The bills a customer's balance is made of, oldest first.
 *
 * Payments are taken to clear the oldest bills first, so these are the newest
 * bills that add up to the balance, and only the oldest of them can be
 * part-paid. Its posting date is the "unpaid since" on the row that opened
 * this.
 */
export function AmountsDebtorBillsPanel({
  customer,
  backLabel,
  onBack,
  onClose,
}: AmountsDebtorBillsPanelProps) {
  const { data, isLoading, error } = useAmountsDebtorBills(
    customer.company_code,
    customer.card_code,
  );
  const bills = data?.bills ?? [];
  const oldest = bills[0];

  return (
    <OpsDrill
      title={customer.card_name || customer.card_code}
      domain="transport"
      subtitle={`${customer.company_label} · ${customer.card_code} · bills still unpaid, oldest first. Payments clear the oldest bills first, so only the oldest can be part-paid.`}
      onBack={onBack}
      backLabel={backLabel}
      onClose={onClose}
      stats={[
        { label: 'Owes', value: money(data?.balance ?? customer.balance) },
        { label: 'Unpaid bills', value: data ? whole(bills.length) : NO_VALUE },
        { label: 'Oldest posted', value: longDate(oldest?.date ?? customer.since) },
        { label: 'Oldest due', value: longDate(oldest?.due_date) },
      ]}
      loading={isLoading}
      rows={error ? [] : bills}
      rowKey={(bill: AmountsDebtorBill) => `${bill.trans_id}:${bill.line_id}`}
      empty={
        error
          ? 'SAP could not be read for this customer. Go back and open it again to retry.'
          : 'Nothing is unpaid: the account is settled or in credit.'
      }
      columns={[
        { label: 'Posted', cell: (bill: AmountsDebtorBill) => longDate(bill.date) },
        { label: 'Due', cell: (bill: AmountsDebtorBill) => longDate(bill.due_date), dim: true },
        { label: 'Type', cell: (bill: AmountsDebtorBill) => bill.type },
        { label: 'Number', cell: (bill: AmountsDebtorBill) => bill.reference || NO_VALUE },
        { label: 'Memo', cell: (bill: AmountsDebtorBill) => bill.memo || NO_VALUE, dim: true },
        { label: 'Amount', cell: (bill: AmountsDebtorBill) => money(bill.amount), numeric: true },
        {
          label: 'Unpaid',
          // Said only where it differs: the whole amount on every row but the
          // oldest would be a column of repeats.
          cell: (bill: AmountsDebtorBill) =>
            bill.unpaid < bill.amount ? money(bill.unpaid) : 'all',
          numeric: true,
        },
      ]}
    />
  );
}
