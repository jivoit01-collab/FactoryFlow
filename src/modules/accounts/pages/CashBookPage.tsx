import {
  ArrowDownLeft,
  ArrowUpRight,
  Ban,
  Loader2,
  Pencil,
  Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { CASH_BOOK_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import type {
  CashDirection,
  CashEntry,
  CashReconciliation,
  EntryApprovalStatus,
} from '@/modules/accounts/api';
import {
  useCancelCashEntry,
  useCashBookOptions,
  useCashEntries,
} from '@/modules/accounts/api';
import { confirmDialog } from '@/shared/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { PaginationControls } from '@/shared/components/PaginationControls';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  Input,
  Label,
  NativeSelect,
  SelectOption,
} from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';
import { formatNumber, getErrorMessage } from '@/shared/utils';

import { CashEntryDialog } from './CashEntryDialog';

const ALL = 'ALL';
const DEFAULT_PAGE_SIZE = 50;

const money = (value: string | number) => formatNumber(Number(value ?? 0));

/** Shown until the first response lands, so the six cards never flash empty. */
const EMPTY_RECONCILIATION: CashReconciliation = {
  cash_in: '0',
  cash_out: '0',
  awaiting_approval: '0',
  cash_in_hand: '0',
  advance_given: '0',
  difference: '0',
};

/** Colour per approval state. Same vocabulary on the approvals screen. */
const APPROVAL_TONE: Record<EntryApprovalStatus, string> = {
  NOT_REQUIRED: 'bg-muted text-muted-foreground',
  PENDING: 'bg-amber-100 dark:bg-amber-500/15 text-amber-900 dark:text-amber-400',
  APPROVED: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-900 dark:text-emerald-400',
  REJECTED: 'bg-rose-100 dark:bg-rose-500/15 text-rose-900 dark:text-rose-400',
};

/**
 * The cash book — the factory's cash box, line by line.
 *
 * It is the spreadsheet it replaces, with the same shape: every receipt and
 * every payment in the order they were written down, and the running balance
 * beside each one. Two things are worth knowing about that column:
 *
 * * It follows the order entries were **recorded**, not their dates. A voucher
 *   for the 3rd written into the book on the 5th sits after the 5th's entries,
 *   exactly as it does on paper.
 * * It is the **book's** balance, not the filtered set's. Filter to one
 *   branch and each row still shows what the box held at that moment,
 *   which is the only figure that means anything.
 *
 * Vouchers leave the custodian in bunches: tick the entries, send them, and
 * they freeze until an approver decides. A rejected bunch unfreezes so the
 * entries can be corrected and sent again — that is what rejecting is for.
 */
export default function CashBookPage() {
  const { hasPermission } = usePermission();
  const canManage = hasPermission(CASH_BOOK_PERMISSIONS.MANAGE);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [direction, setDirection] = useState<CashDirection | typeof ALL>(ALL);
  const [branch, setBranch] = useState<string>(ALL);
  const [approval, setApproval] = useState<EntryApprovalStatus | typeof ALL>(ALL);
  const [includeCancelled, setIncludeCancelled] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CashEntry | null>(null);
  const [newDirection, setNewDirection] = useState<CashDirection>('OUT');

  const search = useDebounce(searchInput);
  const params = {
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
    ...(direction === ALL ? {} : { direction }),
    ...(branch === ALL ? {} : { branch: Number(branch) }),
    ...(approval === ALL ? {} : { approvalStatus: approval }),
    ...(includeCancelled ? { includeCancelled: true } : {}),
    ...(search.trim() ? { search: search.trim() } : {}),
    page,
    pageSize,
  };

  const { data, isLoading } = useCashEntries(params);
  const { data: options } = useCashBookOptions();
  const cancel = useCancelCashEntry();

  const rows = useMemo(() => data?.results ?? [], [data]);
  // Always the whole book, never the filter: a reconciliation of part of a
  // book proves nothing.
  const recon = data?.reconciliation ?? EMPTY_RECONCILIATION;
  const settled = Number(recon.difference) === 0;
  const branches = options?.branches ?? [];

  function resetPage() {
    setPage(1);
  }

  function openNew(which: CashDirection) {
    setEditing(null);
    setNewDirection(which);
    setDialogOpen(true);
  }

  function openEdit(entry: CashEntry) {
    setEditing(entry);
    setDialogOpen(true);
  }

  async function handleCancel(entry: CashEntry) {
    const ok = await confirmDialog({
      title: `Cancel this ${entry.direction === 'IN' ? 'receipt' : 'payment'} of ${money(entry.amount)}?`,
      description:
        'The line stays in the book, marked cancelled, and comes out of the balance. Every entry recorded after it is re-balanced.',
      confirmLabel: 'Cancel entry',
      destructive: true,
    });
    if (!ok) return;
    try {
      await cancel.mutateAsync(entry.id);
      toast.success('Entry cancelled');
    } catch (err) {
      toast.error(getErrorMessage(err, 'That entry could not be cancelled.'));
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Cash Book"
        description="Every rupee in and out of the cash box, with the running balance"
      >
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => openNew('IN')}>
              <ArrowDownLeft className="mr-2 h-4 w-4" /> Cash in
            </Button>
            <Button onClick={() => openNew('OUT')}>
              <ArrowUpRight className="mr-2 h-4 w-4" /> Cash out
            </Button>
          </div>
        )}
      </DashboardHeader>

      {/* The six figures read as one sum, left to right: everything that came
          in, less what has been agreed, less what is still waiting to be,
          less what is in the box, less what is out with people -- and nothing
          left over. The last card is the proof, not a number to act on. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Cash in</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
              {money(recon.cash_in)}
            </p>
            <p className="text-xs text-muted-foreground">Everything that arrived</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Cash out</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-rose-700 dark:text-rose-400">
              {money(recon.cash_out)}
            </p>
            <p className="text-xs text-muted-foreground">Approved spending only</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Pending approval</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-amber-700 dark:text-amber-400">
              {money(recon.awaiting_approval)}
            </p>
            <p className="text-xs text-muted-foreground">Spent, not yet agreed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet className="h-4 w-4" /> Cash in hand
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums">
              {money(recon.cash_in_hand)}
            </p>
            <p className="text-xs text-muted-foreground">The notes in the box</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Advance given</p>
            <p className="mt-1 text-xl font-bold tabular-nums">
              {money(recon.advance_given)}
            </p>
            <p className="text-xs text-muted-foreground">Out with people</p>
          </CardContent>
        </Card>
        <Card className={settled ? '' : 'border-rose-400 dark:border-rose-500/40'}>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Difference</p>
            <p
              className={`mt-1 text-xl font-bold tabular-nums ${
                settled ? 'text-muted-foreground' : 'text-rose-700 dark:text-rose-400'
              }`}
            >
              {money(recon.difference)}
            </p>
            <p className="text-xs text-muted-foreground">
              {settled ? 'The book adds up' : 'The book does not add up'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="cash-from">From</Label>
          <Input
            id="cash-from"
            type="date"
            className="w-[160px]"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              resetPage();
            }}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cash-to">To</Label>
          <Input
            id="cash-to"
            type="date"
            className="w-[160px]"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              resetPage();
            }}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cash-filter-direction">Direction</Label>
          <NativeSelect
            id="cash-filter-direction"
            className="w-[150px]"
            value={direction}
            onChange={(e) => {
              setDirection(e.target.value as CashDirection | typeof ALL);
              resetPage();
            }}
          >
            <SelectOption value={ALL}>In and out</SelectOption>
            <SelectOption value="OUT">Out only</SelectOption>
            <SelectOption value="IN">In only</SelectOption>
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="cash-filter-branch">Branch</Label>
          <NativeSelect
            id="cash-filter-branch"
            className="w-[180px]"
            value={branch}
            onChange={(e) => {
              setBranch(e.target.value);
              resetPage();
            }}
          >
            <SelectOption value={ALL}>Every branch</SelectOption>
            {branches.map((row) => (
              <SelectOption key={row.id} value={String(row.id)}>
                {row.name}
              </SelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="cash-filter-approval">Approval</Label>
          <NativeSelect
            id="cash-filter-approval"
            className="w-[170px]"
            value={approval}
            onChange={(e) => {
              setApproval(e.target.value as EntryApprovalStatus | typeof ALL);
              resetPage();
            }}
          >
            <SelectOption value={ALL}>Any state</SelectOption>
            <SelectOption value="PENDING">Awaiting approval</SelectOption>
            <SelectOption value="APPROVED">Approved</SelectOption>
            <SelectOption value="REJECTED">Rejected</SelectOption>
            <SelectOption value="NOT_REQUIRED">Receipts</SelectOption>
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="cash-search">Search</Label>
          <Input
            id="cash-search"
            className="w-[260px]"
            placeholder="Detail, item or G/L head…"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              resetPage();
            }}
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <Checkbox
            checked={includeCancelled}
            onCheckedChange={(checked) => {
              setIncludeCancelled(checked === true);
              resetPage();
            }}
          />
          Show cancelled
        </label>

      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Reading the book…
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wallet className="mb-2 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              {data?.count === 0 && !search && direction === ALL && !dateFrom
                ? 'Nothing in the book yet. Start by recording the cash that came into the box.'
                : 'No entry matches those filters.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Bunch</th>
                  <th className="px-3 py-2">Branch</th>
                  <th className="px-3 py-2">G/L head</th>
                  <th className="px-3 py-2">Source / advance</th>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Detail</th>
                  <th className="px-3 py-2 text-right">Out</th>
                  <th className="px-3 py-2 text-right">In</th>
                  <th className="px-3 py-2 text-right">Balance</th>
                  <th className="px-3 py-2">Approval</th>
                  {canManage && <th className="px-3 py-2">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const cancelled = !row.is_active;
                  const editable = canManage && !cancelled && !row.is_locked;
                  return (
                    <tr
                      key={row.id}
                      className={`border-b align-top hover:bg-muted/40 ${
                        cancelled ? 'text-muted-foreground line-through' : ''
                      }`}
                    >
                      <td className="whitespace-nowrap px-3 py-2">{row.entry_date}</td>
                      <td className="px-3 py-2 tabular-nums">
                        {row.bunch ? row.bunch.number : '—'}
                      </td>
                      <td className="px-3 py-2">{row.branch_name ?? '—'}</td>
                      <td className="px-3 py-2">
                        {row.gl_account_code ? (
                          <>
                            <p className="font-mono text-xs">{row.gl_account_code}</p>
                            <p className="text-xs text-muted-foreground">{row.gl_account_name}</p>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {row.atm_account_name && (
                          <span className="text-xs">{row.atm_account_name}</span>
                        )}
                        {row.advance_holder_name && (
                          <Badge variant="outline" className="bg-amber-100 dark:bg-amber-500/15 text-[10px] text-amber-900 dark:text-amber-400">
                            {row.advance_holder_name}
                          </Badge>
                        )}
                        {!row.atm_account_name && !row.advance_holder_name && (
                          <span className="text-xs text-muted-foreground">
                            {row.direction === 'IN' ? 'Not from a card' : 'From the box'}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">{row.item || '—'}</td>
                      <td className="max-w-[340px] px-3 py-2">{row.detail}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {row.direction === 'OUT' ? money(row.amount) : ''}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {row.direction === 'IN' ? money(row.amount) : ''}
                      </td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">
                        {cancelled ? '—' : money(row.balance_after)}
                      </td>
                      <td className="px-3 py-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${APPROVAL_TONE[row.approval_status]}`}
                        >
                          {row.approval_label}
                        </Badge>
                        {row.bunch?.decided_at && (
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {row.bunch.decided_at.slice(0, 10)}
                          </p>
                        )}
                      </td>
                      {canManage && (
                        <td className="px-3 py-2">
                          {editable ? (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEdit(row)}
                                aria-label="Correct this entry"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCancel(row)}
                                aria-label="Cancel this entry"
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {cancelled ? 'Cancelled' : 'Locked'}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <PaginationControls
            page={data?.page ?? page}
            pageSize={pageSize}
            total={data?.count ?? 0}
            totalPages={data?.total_pages ?? 1}
            isLoading={isLoading}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next);
              resetPage();
            }}
          />
        </div>
      )}

      {dialogOpen && (
        <CashEntryDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          entry={editing}
          presetDirection={newDirection}
        />
      )}
    </div>
  );
}
