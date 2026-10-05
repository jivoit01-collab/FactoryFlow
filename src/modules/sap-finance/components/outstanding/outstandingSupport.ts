/**
 * Hooks and helpers for the outstanding reports: sorting, the company they are
 * read for, where a party's ledger opens, the transport fields and the filters
 * kept in the address. The components are in `OutstandingBits.tsx`.
 */
import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import { AR_INVOICE_PERMISSIONS } from '@/config/permissions';
import { SAP_FINANCE_PERMISSIONS } from '@/config/permissions/sap-finance.permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { useAppSelector } from '@/core/store';
import { formatDay } from '@/shared/utils';

import type { PartySide, TransportFields } from '../../api';

export type SortDir = 'asc' | 'desc';

export interface SortState<K extends string> {
  key: K | null;
  dir: SortDir;
}

/** Nulls last whichever way the column is sorted. */
export function compareValues(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
  dir: SortDir,
): number {
  const aNone = a === null || a === undefined || a === '';
  const bNone = b === null || b === undefined || b === '';
  if (aNone || bNone) return aNone === bNone ? 0 : aNone ? 1 : -1;
  const cmp =
    typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b));
  return dir === 'asc' ? cmp : -cmp;
}

/** The company the report was read for: every report follows the one chosen in the app. */
export function useCompanyName(): string {
  return useAppSelector((state) => state.auth.currentCompany?.company_name ?? '');
}

/**
 * Where a party's ledger opens, or null when this user may not open it:
 * a vendor's in the General Ledger, a customer's on the A/R invoices' Ledger
 * tab (any customer's, which needs the all-ledgers right).
 */
export function useLedgerPath() {
  const { hasPermission } = usePermission();
  const generalLedger = hasPermission(SAP_FINANCE_PERMISSIONS.VIEW_LEDGERS);
  const customerLedger =
    hasPermission(AR_INVOICE_PERMISSIONS.VIEW) &&
    hasPermission(AR_INVOICE_PERMISSIONS.VIEW_ALL_LEDGERS);
  return useCallback(
    (side: PartySide, code: string): string | null => {
      const encoded = encodeURIComponent(code);
      if (side === 'vendor') {
        return generalLedger ? `/sap-finance/general-ledger?account=${encoded}` : null;
      }
      return customerLedger ? `/warehouse/ar-invoices?customer=${encoded}` : null;
    },
    [generalLedger, customerLedger],
  );
}

const TRANSPORT_KEYS: (keyof TransportFields)[] = [
  'transporter',
  'vehicle_number',
  'bilty_number',
  'lr_number',
];

/** Whether this company's documents carry any transport field at all. */
export function hasTransport(rows: TransportFields[]): boolean {
  return rows.some((row) => TRANSPORT_KEYS.some((key) => key in row));
}

/** The transport fields as spreadsheet columns, for the ones this company has. */
export function transportColumns(row: TransportFields, present: boolean): Record<string, string> {
  if (!present) return {};
  return {
    Transporter: row.transporter ?? '',
    Vehicle: row.vehicle_number ?? '',
    'Bilty no.': row.bilty_number ?? '',
    'Bilty date': row.bilty_date ? formatDay(row.bilty_date) : '',
    'LR no.': row.lr_number ?? '',
    'Recv. date': row.received_date ? formatDay(row.received_date) : '',
  };
}

/**
 * Filters kept in the address, so a narrowed report is a link somebody can
 * send and Back returns to it. A blank or null value removes the parameter.
 */
export function useUrlFilters() {
  const [params, setParams] = useSearchParams();
  const update = useCallback(
    (changes: Record<string, string | null | undefined>) =>
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(changes)) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );
  return [params, update] as const;
}
