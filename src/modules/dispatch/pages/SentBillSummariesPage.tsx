/**
 * Dispatch > Sent Bill Summaries: every bill summary the dispatch desk has sent
 * to the warehouse, one row per bill, and the Print button for the approved
 * ones.
 *
 * The desk raises the sheets (usually a truck's worth at once, from Vehicle
 * Linking), the warehouse approves them and gives the dispatch date, and the
 * desk then prints each approved sheet, signs it and walks it down to the
 * godown. This page is that last step, and the place to see where every sheet
 * sent over has got to — still with the warehouse, sent back and why, approved,
 * printed, picked.
 *
 * The printed sheet is the same one the warehouse's own bill-summary page
 * prints (`BillSummaryPrint`), and printing an approved sheet records it as
 * printed, the first time only. Reads span every company the user belongs to.
 */
import { AlertTriangle, FileText, Printer, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useAuth } from '@/core/auth';
import { BILL_SUMMARY_STATUS_LABELS, type BillSummaryStatus } from '@/modules/warehouse/api';
import { matchesBillSummary } from '@/modules/warehouse/pages/billSummary/billSummarySearch';
import {
  PRINTABLE_BILL_SUMMARY_STATUSES,
  useBillSummaryPrinter,
} from '@/modules/warehouse/pages/billSummary/useBillSummaryPrinter';
import {
  PageHeader,
  ROW_CLASSES,
  StatusPill,
  TABLE_CLASSES,
  TableCard,
  TableEmpty,
  TableLoading,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components';
import type { StatusTone } from '@/shared/components/page/StatusPill';
import { Badge, Button, Input, Label } from '@/shared/components/ui';
import { formatDateTimeShort, getErrorMessage } from '@/shared/utils';

import { useSentBillSummaries } from '../api/sentBillSummaries.api';

type Tab = 'pending' | 'approved' | 'all';

const TABS: { value: Tab; label: string; statuses: BillSummaryStatus[] | null }[] = [
  { value: 'pending', label: 'Pending approval', statuses: ['PENDING_APPROVAL'] },
  // Everything the warehouse has approved, printed or not: the status on each
  // row says which, and the button reads Print or Reprint to match.
  { value: 'approved', label: 'Approved', statuses: ['APPROVED', 'PRINTED', 'PICKED'] },
  { value: 'all', label: 'All', statuses: null },
];

const TONE: Record<BillSummaryStatus, StatusTone> = {
  PENDING_APPROVAL: 'progress',
  REJECTED: 'blocked',
  APPROVED: 'warn',
  PRINTED: 'done',
  PICKED: 'done',
  CANCELLED: 'neutral',
};

const COLUMNS = 6;

function isoDay(date: Date): string {
  return date.toLocaleDateString('en-CA');
}

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return isoDay(date);
}

function formatDay(value: string | null | undefined): string {
  if (!value) return '—';
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function SentBillSummariesPage() {
  const { companies } = useAuth();
  const companyCodes = useMemo(
    () => companies.filter((c) => c.is_active).map((c) => c.company_code),
    [companies],
  );

  const [dateFrom, setDateFrom] = useState(() => daysAgo(14));
  const [dateTo, setDateTo] = useState(() => isoDay(new Date()));
  const [tab, setTab] = useState<Tab>('approved');
  const [search, setSearch] = useState('');

  const { data, isLoading, isFetching, isError, error } = useSentBillSummaries(companyCodes, {
    date_from: dateFrom,
    date_to: dateTo,
  });
  const printer = useBillSummaryPrinter();

  const all = useMemo(() => data?.rows ?? [], [data]);
  const counts = useMemo(
    () =>
      Object.fromEntries(
        TABS.map((t) => [
          t.value,
          t.statuses ? all.filter((row) => t.statuses!.includes(row.status)).length : all.length,
        ]),
      ) as Record<Tab, number>,
    [all],
  );
  const rows = useMemo(() => {
    const statuses = TABS.find((t) => t.value === tab)?.statuses ?? null;
    const needle = search.trim().toLowerCase();
    return all.filter(
      (row) => (!statuses || statuses.includes(row.status)) && matchesBillSummary(row, needle),
    );
  }, [all, tab, search]);

  const failed = data?.failed ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sent Bill Summaries"
        description="Every bill summary sent to the warehouse, bill by bill. Print an approved one to sign and take down to the godown."
        icon={FileText}
        accent="violet"
      />

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Show">
        {TABS.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            role="tab"
            aria-selected={tab === option.value}
            variant={tab === option.value ? 'default' : 'outline'}
            onClick={() => setTab(option.value)}
          >
            {option.label}
            <span className="ml-1.5 tabular-nums opacity-70">{counts[option.value] ?? 0}</span>
          </Button>
        ))}
      </div>

      {failed.length > 0 && (
        <p className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {failed.join(', ')} could not be read, so {failed.length === 1 ? 'its' : 'their'} sheets
          are missing from the list.
        </p>
      )}
      {printer.error && <p className="text-sm text-rose-600">{printer.error}</p>}

      <TableCard
        summary={
          <span>
            {rows.length} bill{rows.length === 1 ? '' : 's'}
            {isFetching && !isLoading ? ' · refreshing…' : ''}
          </span>
        }
        actions={
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Bill, party, vehicle, bilty"
                aria-label="Search bill summaries"
                className="h-9 w-56 pl-8"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Label htmlFor="sent-from" className="text-xs text-muted-foreground">
                From
              </Label>
              <Input
                id="sent-from"
                type="date"
                value={dateFrom}
                max={dateTo}
                onChange={(event) => event.target.value && setDateFrom(event.target.value)}
                className="h-9 w-40"
              />
              <Label htmlFor="sent-to" className="text-xs text-muted-foreground">
                To
              </Label>
              <Input
                id="sent-to"
                type="date"
                value={dateTo}
                min={dateFrom}
                onChange={(event) => event.target.value && setDateTo(event.target.value)}
                className="h-9 w-40"
              />
            </div>
          </>
        }
      >
        <table className={TABLE_CLASSES}>
          <thead className={THEAD_CLASSES}>
            <tr>
              <Th>Bill</Th>
              <Th>Customer</Th>
              <Th>Vehicle</Th>
              <Th>Dispatch date</Th>
              <Th>Status</Th>
              <Th className="w-28" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableLoading colSpan={COLUMNS} message="Reading the bill summaries…" />
            ) : isError ? (
              <TableEmpty
                colSpan={COLUMNS}
                icon={AlertTriangle}
                message="The bill summaries could not be read"
                hint={getErrorMessage(error, 'Try again in a moment.')}
              />
            ) : rows.length === 0 ? (
              <TableEmpty
                colSpan={COLUMNS}
                icon={FileText}
                message={
                  search
                    ? 'No bill summary matches that'
                    : tab === 'approved'
                      ? 'Nothing approved for these dates yet'
                      : 'No bill summary here for these dates'
                }
                hint="The window is on the dispatch date, or the day it was sent for sheets not yet approved."
              />
            ) : (
              rows.map((row) => {
                const printable =
                  PRINTABLE_BILL_SUMMARY_STATUSES.includes(row.status) && row.id !== null;
                return (
                  <tr key={row.key} className={ROW_CLASSES}>
                    <Td>
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono font-medium">{row.sap_invoice_doc_num}</span>
                        <Badge variant="outline">{row.company_code}</Badge>
                      </span>
                      <span className="block text-xs text-muted-foreground">{row.entry_no}</span>
                    </Td>
                    <Td>
                      <span className="block max-w-52 truncate" title={row.customer_name}>
                        {row.customer_name || '—'}
                      </span>
                      {row.warehouse_codes && (
                        <span className="block text-xs text-muted-foreground">
                          {row.warehouse_codes}
                        </span>
                      )}
                    </Td>
                    <Td>
                      <span className="block whitespace-nowrap font-mono">
                        {row.vehicle_no || '—'}
                      </span>
                      {row.transporter_name && (
                        <span className="block text-xs text-muted-foreground">
                          {row.transporter_name}
                        </span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap">
                      {row.dispatch_date ? (
                        formatDay(row.dispatch_date)
                      ) : (
                        <span className="text-muted-foreground">Not given yet</span>
                      )}
                    </Td>
                    <Td>
                      <StatusPill tone={TONE[row.status]}>
                        {BILL_SUMMARY_STATUS_LABELS[row.status]}
                      </StatusPill>
                      {row.status === 'REJECTED' && row.reject_reason && (
                        <span className="mt-1 block max-w-56 text-xs text-rose-700 dark:text-rose-400">
                          {row.reject_reason}
                        </span>
                      )}
                      {row.approved_at && (
                        <span className="mt-1 block max-w-48 text-xs text-muted-foreground">
                          Approved {formatDateTimeShort(row.approved_at)}
                          {row.approved_by_name ? ` · ${row.approved_by_name}` : ''}
                        </span>
                      )}
                      {row.printed_at && (
                        <span className="block max-w-48 text-xs text-emerald-700 dark:text-emerald-400">
                          Printed {formatDateTimeShort(row.printed_at)}
                          {row.printed_by_name ? ` · ${row.printed_by_name}` : ''}
                        </span>
                      )}
                    </Td>
                    <Td align="right">
                      {printable && (
                        <Button
                          size="sm"
                          variant={row.status === 'APPROVED' ? 'default' : 'outline'}
                          disabled={printer.printingId !== null}
                          aria-label={`Print ${row.sap_invoice_doc_num}`}
                          onClick={() => void printer.print(row)}
                        >
                          <Printer className="mr-1.5 h-4 w-4" />
                          {printer.printingId === row.id
                            ? 'Opening…'
                            : row.status === 'APPROVED'
                              ? 'Print'
                              : 'Reprint'}
                        </Button>
                      )}
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </TableCard>

      {printer.host}
    </div>
  );
}
