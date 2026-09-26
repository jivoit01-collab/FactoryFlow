import {
  ArrowDownLeft,
  ArrowUpRight,
  Ban,
  Loader2,
  Package,
  Paperclip,
  Pencil,
  Table2,
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
  ColumnFilters,
  EntryApprovalStatus,
} from '@/modules/accounts/api';
import {
  cashBookApi,
  useCancelCashEntry,
  useCashEntries,
  useColumnValues,
  useCreateBunch,
} from '@/modules/accounts/api';
import { CashSheetTable } from '@/modules/accounts/components/CashSheetTable';
import { confirmDialog } from '@/shared/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { PaginationControls } from '@/shared/components/PaginationControls';
import {
  ColumnFilter,
  type SortState,
  toSortParam,
  TOTALS_ROW_CLASS,
  useSpreadsheetKeys,
} from '@/shared/components/sheetGrid';
import { Badge, Button, Card, CardContent, Checkbox } from '@/shared/components/ui';
import { formatDay,formatNumber, getErrorMessage } from '@/shared/utils';

import { CashEntryDialog } from './CashEntryDialog';

const DEFAULT_PAGE_SIZE = 50;

const money = (value: string | number) => formatNumber(Number(value ?? 0));

/** Shown until the first response lands, so the six cards never flash empty. */
const EMPTY_RECONCILIATION: CashReconciliation = {
  cash_in: '0',
  cash_out: '0',
  awaiting_approval: '0',
  cash_in_hand: '0',
  advance_given: '0',
  owed_to_people: '0',
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
 * Approval is not asked for here: a payment joins the approver's queue the
 * moment it is recorded, and stays changeable until they decide.
 *
 * Bunching comes *after* that. Filter the book down to what belongs in one
 * envelope, tick those rows, and bundle them — which builds the spreadsheet
 * that gets mailed to head office. Only approved, not-yet-bundled vouchers can
 * be ticked, so a batch cannot carry a payment nobody has agreed to.
 */
export default function CashBookPage() {
  const { hasPermission } = usePermission();
  const canManage = hasPermission(CASH_BOOK_PERMISSIONS.MANAGE);

  const [includeCancelled, setIncludeCancelled] = useState(false);
  // A second way of reading the same page. The register carries the tick
  // boxes; a grid you drag a selection across is no place for them. The row
  // buttons do come along, in a column of their own outside the grid. The
  // sheet is what the page opens on.
  const [sheetMode, setSheetMode] = useState(true);
  // One entry per column that is filtering. Empty means the column is not.
  const [filters, setFilters] = useState<ColumnFilters>({});
  // Which drop-down is open, so only that column's values are fetched.
  const [openColumn, setOpenColumn] = useState<string | null>(null);
  // Newest first, which is the order the book is written in.
  const [sort, setSort] = useState<SortState>({ key: 'recorded', direction: 'desc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Ticked vouchers, held as whole entries rather than ids: the count and the
  // total have to stay right after paging away from the rows they came from.
  const [picked, setPicked] = useState<Map<number, CashEntry>>(new Map());
  const [bundling, setBundling] = useState(false);

  // The register is read the way the spreadsheet it replaces was read: click
  // a cell, then walk it with the arrow keys.
  const { gridProps } = useSpreadsheetKeys({
    onCopy: () => toast.success('Copied'),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CashEntry | null>(null);
  const [newDirection, setNewDirection] = useState<CashDirection>('OUT');

  const params = {
    ...(includeCancelled ? { includeCancelled: true } : {}),
    sort: toSortParam(sort),
    filters,
    page,
    pageSize,
  };

  // `isLoading` is now the first read of the book only: the query holds the
  // page on screen while the next one is fetched, so a filter tick no longer
  // unmounts the table. `isPlaceholderData` is what says the rows in front of
  // you are the previous answer, still standing until the new one lands.
  const { data, isLoading, isFetching, isPlaceholderData } = useCashEntries(params);
  const cancel = useCancelCashEntry();
  const createBunch = useCreateBunch();

  // Only the open drop-down fetches, so twelve filterable columns cost nothing
  // until one is used. Its own ticks are left out of the query, which is what
  // lets a filter still offer the values it is currently hiding.
  const { data: columnValues, isLoading: valuesLoading } = useColumnValues(
    openColumn ?? '',
    Object.fromEntries(Object.entries(filters).filter(([key]) => key !== openColumn)),
    includeCancelled,
    openColumn !== null,
  );

  const rows = useMemo(() => data?.results ?? [], [data]);
  // Always the whole book, never the filter: a reconciliation of part of a
  // book proves nothing.
  const recon = data?.reconciliation ?? EMPTY_RECONCILIATION;
  // The filtered set's own figures, added up by the server over every entry
  // the filters match rather than the fifty on this page.
  const totals = data?.totals ?? { cash_in: '0', cash_out: '0', net: '0', count: 0 };
  const settled = Number(recon.difference) === 0;

  const filteredColumns = Object.entries(filters)
    .filter(([, values]) => values.length > 0)
    .map(([column]) => column);

  function setColumn(column: string, values: string[]) {
    setFilters((current) => ({ ...current, [column]: values }));
    setPage(1);
  }

  function clearFilters() {
    setFilters({});
    setPage(1);
  }

  /** The props every column header needs, so the table below stays readable. */
  function column(key: string, label: string, align: 'left' | 'right' = 'left') {
    return {
      label,
      columnKey: key,
      sort,
      onSort: sortBy,
      selected: filters[key] ?? [],
      onSelect: (values: string[]) => setColumn(key, values),
      values: openColumn === key ? (columnValues?.values ?? []) : [],
      isLoading: openColumn === key && valuesLoading,
      onOpen: () => setOpenColumn(key),
      align,
    };
  }

  function resetPage() {
    setPage(1);
  }

  function sortBy(next: SortState) {
    setSort(next);
    setPage(1);
  }

  // The Balance column is the book's running total, built in the order entries
  // were recorded. Sorted any other way the figures are still each entry's own
  // balance, but they no longer read down the column as a running total -- so
  // the page says so rather than letting it look broken.
  const balanceReadsAsRunning = sort.key === 'recorded' || sort.key === 'date';

  function openNew(which: CashDirection) {
    setEditing(null);
    setNewDirection(which);
    setDialogOpen(true);
  }

  function openEdit(entry: CashEntry) {
    setEditing(entry);
    setDialogOpen(true);
  }

  /**
   * Whether a row may go into a batch.
   *
   * Approved and not already in one. A pending voucher is still an argument,
   * and a bundled one is already in somebody's envelope — putting either into
   * a batch would send head office paper that says nothing.
   */
  function canBundle(entry: CashEntry) {
    return entry.is_active && entry.approval_status === 'APPROVED' && !entry.bunch;
  }

  const bundleable = rows.filter(canBundle);
  // Why the tick column is empty, when it is: still waiting on an approver,
  // or already inside somebody's envelope.
  const pendingHere = rows.filter(
    (entry) => entry.is_active && entry.approval_status === 'PENDING',
  ).length;
  const bundledHere = rows.filter((entry) => entry.bunch).length;
  const pickedTotal = [...picked.values()].reduce((sum, entry) => sum + Number(entry.amount), 0);
  const allPagePicked = bundleable.length > 0 && bundleable.every((entry) => picked.has(entry.id));

  function togglePick(entry: CashEntry) {
    setPicked((current) => {
      const next = new Map(current);
      if (next.has(entry.id)) next.delete(entry.id);
      else next.set(entry.id, entry);
      return next;
    });
  }

  /** Ticks or clears this page's eligible rows, leaving other pages' alone. */
  function togglePage() {
    setPicked((current) => {
      const next = new Map(current);
      for (const entry of bundleable) {
        if (allPagePicked) next.delete(entry.id);
        else next.set(entry.id, entry);
      }
      return next;
    });
  }

  /**
   * Bundle what is ticked, and hand over the spreadsheet in the same breath.
   *
   * The download is the point of the batch — it is what gets mailed — so it is
   * not left as a second trip to another screen. A batch whose file fails to
   * download is still a batch: it is on record, and the Bunches page can
   * download it again. That is why the failure is reported as what it is,
   * rather than as the bundling having failed.
   */
  async function bundle() {
    setBundling(true);
    try {
      const bunch = await createBunch.mutateAsync({ ids: [...picked.keys()] });
      setPicked(new Map());
      toast.success(
        `Bunch ${bunch.number} made — ${bunch.entry_count} vouchers, ${money(bunch.total)}`,
      );
      try {
        const blob = await cashBookApi.exportBunch(bunch.id);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `bunch-${bunch.number}.xlsx`;
        link.click();
        URL.revokeObjectURL(url);
      } catch {
        toast.error(
          `Bunch ${bunch.number} was made, but its file could not be downloaded. Download it again from the Bunches page.`,
        );
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Those vouchers could not be bundled.'));
    } finally {
      setBundling(false);
    }
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

  /** A row's Actions cell — the same on the register and the sheet. */
  function rowActions(row: CashEntry) {
    const cancelled = !row.is_active;
    if (cancelled || row.is_locked) {
      return (
        <span className="text-xs text-muted-foreground">{cancelled ? 'Cancelled' : 'Locked'}</span>
      );
    }
    return (
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
    );
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

      {/* The figures read as one sum, left to right: everything that came in,
          less what has been agreed, less what is still waiting to be, less
          what is in the box, less what is out with people, plus what people
          have laid out for us -- and nothing left over. The last card is the
          proof, not a number to act on.

          Advance given and Owed to staff are deliberately NOT netted. They are
          opposite movements, and one figure for both understates how much is
          genuinely out with people while hiding the debt entirely. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
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
            <p className="mt-1 text-xl font-bold tabular-nums">{money(recon.cash_in_hand)}</p>
            <p className="text-xs text-muted-foreground">The notes in the box</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Advance given</p>
            <p className="mt-1 text-xl font-bold tabular-nums">{money(recon.advance_given)}</p>
            <p className="text-xs text-muted-foreground">Out with people</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Owed to staff</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-amber-700 dark:text-amber-400">
              {money(recon.owed_to_people)}
            </p>
            <p className="text-xs text-muted-foreground">They paid it themselves</p>
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

      {/* No filter bar. Every column carries its own filter button, the way a
          spreadsheet does -- see ColumnFilter. The only control left here is
          the one that is not about a column's values. */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={includeCancelled}
            onCheckedChange={(checked) => {
              setIncludeCancelled(checked === true);
              resetPage();
            }}
          />
          Show cancelled
        </label>

        {filteredColumns.length > 0 && (
          <>
            <span className="text-sm text-muted-foreground">
              Filtered by {filteredColumns.join(', ')}
            </span>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          </>
        )}
        {/* Pushed to the right: this changes the whole view, so it does
            not belong among the controls that change what is in it. */}
        <div className="ml-auto flex items-center gap-1 rounded-md border p-0.5">
          <Button
            variant={sheetMode ? 'ghost' : 'secondary'}
            size="sm"
            className="h-7"
            onClick={() => setSheetMode(false)}
          >
            Register
          </Button>
          <Button
            variant={sheetMode ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7"
            onClick={() => setSheetMode(true)}
          >
            <Table2 className="mr-1 h-3 w-3" /> Sheet
          </Button>
        </div>
      </div>

      {/* A greyed-out tick column explains nothing by itself. When none of
          the rows on screen can go into a batch, say which of the two reasons
          it is, rather than leaving the custodian clicking a checkbox that
          will not move. */}
      {canManage && rows.length > 0 && bundleable.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Nothing on this page can be bundled — a voucher has to be approved first, and not already
          be in a batch.
          {pendingHere > 0 &&
            ` ${pendingHere} here ${pendingHere === 1 ? 'is' : 'are'} still waiting on an approver.`}
          {bundledHere > 0 && ` ${bundledHere} ${bundledHere === 1 ? 'is' : 'are'} already in one.`}
        </p>
      )}

      {canManage && picked.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/40 px-3 py-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            <strong className="tabular-nums">{picked.size}</strong>{' '}
            {picked.size === 1 ? 'voucher' : 'vouchers'} ticked ·{' '}
            <strong className="tabular-nums">{money(pickedTotal)}</strong>
          </span>
          <Button size="sm" onClick={bundle} disabled={bundling}>
            {bundling ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Package className="mr-2 h-4 w-4" />
            )}
            Bundle and download
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setPicked(new Map())}>
            Clear selection
          </Button>
        </div>
      )}

      {!balanceReadsAsRunning && (
        <p className="text-xs text-muted-foreground">
          Sorted by {sort.key}. Each row still shows the balance the box held at that entry, but the
          Balance column no longer reads down as a running total — sort by date or recording order
          to get that back.
        </p>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Reading the book…
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wallet className="mb-2 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              {filteredColumns.length === 0
                ? 'Nothing in the book yet. Start by recording the cash that came into the box.'
                : 'No entry matches those column filters.'}
            </p>
          </CardContent>
        </Card>
      ) : sheetMode ? (
        <>
          <div
            className={`transition-opacity ${isPlaceholderData ? 'opacity-60' : ''}`}
            aria-busy={isFetching}
          >
            <CashSheetTable
              rows={rows}
              column={column}
              onOpenColumn={setOpenColumn}
              actions={canManage ? rowActions : undefined}
              resetKey={`${page}|${pageSize}|${toSortParam(sort)}|${includeCancelled}|${JSON.stringify(filters)}`}
            />
          </div>
          <PaginationControls
            page={data?.page ?? page}
            pageSize={pageSize}
            total={data?.count ?? 0}
            totalPages={data?.total_pages ?? 1}
            isLoading={isFetching}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next);
              resetPage();
            }}
          />
        </>
      ) : (
        // Dimmed, not replaced, while the next page is on its way: the open
        // filter drop-down lives in this table's header, and swapping the
        // table for a spinner is what used to close it mid-pick.
        <div
          className={`rounded-md border transition-opacity ${
            isPlaceholderData ? 'opacity-60' : ''
          }`}
          aria-busy={isFetching}
        >
          <div className="overflow-x-auto">
            <table {...gridProps} className={`w-full text-sm ${gridProps.className}`}>
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  {canManage && (
                    <th className="w-10 px-3 py-2">
                      {/* The title sits on the wrapper: the checkbox itself
                          takes no title, and a disabled control would not
                          show one anyway. */}
                      <span
                        title={
                          bundleable.length === 0
                            ? 'Nothing on this page can be bundled — a voucher has to be approved, and not already be in a batch'
                            : `Tick all ${bundleable.length} bundleable on this page`
                        }
                      >
                        <Checkbox
                          checked={allPagePicked}
                          disabled={bundleable.length === 0}
                          onCheckedChange={togglePage}
                          aria-label="Tick every bundleable voucher on this page"
                        />
                      </span>
                    </th>
                  )}
                  <ColumnFilter {...column('serial', 'Sr.')} />
                  <ColumnFilter {...column('date', 'Date')} />
                  <ColumnFilter {...column('bunch', 'Bunch')} />
                  <ColumnFilter {...column('branch', 'Branch')} />
                  <ColumnFilter {...column('gl', 'G/L head')} />
                  <ColumnFilter {...column('source', 'Source')} />
                  <ColumnFilter {...column('advance', 'Advance')} />
                  <ColumnFilter {...column('item', 'Item')} />
                  <ColumnFilter {...column('detail', 'Detail')} />
                  <ColumnFilter {...column('amount', 'Amount', 'right')} />
                  <ColumnFilter {...column('in', 'In', 'right')} />
                  <ColumnFilter {...column('balance', 'Balance', 'right')} />
                  <ColumnFilter {...column('approval', 'Approval')} />
                  {canManage && <th className="px-3 py-2">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {/* The whole filtered book, not this page of it: the server
                    adds it up over every entry the filters match, which is
                    what somebody who has just filtered wants to know. Balance
                    has no total -- it is a running figure, and the sum of a
                    running total is a number the book never held. */}
                <tr className={TOTALS_ROW_CLASS}>
                  {canManage && <td />}
                  <td colSpan={9}>
                    Total of {data?.count ?? 0} {(data?.count ?? 0) === 1 ? 'entry' : 'entries'}
                    {filteredColumns.length > 0 ? ' matching the filters' : ''}
                  </td>
                  <td className="text-right tabular-nums">{money(totals.cash_out)}</td>
                  <td className="text-right tabular-nums">{money(totals.cash_in)}</td>
                  <td />
                  <td />
                  {canManage && <td />}
                </tr>
                {rows.map((row) => {
                  const cancelled = !row.is_active;
                  return (
                    <tr
                      key={row.id}
                      className={`border-b align-top hover:bg-muted/40 ${
                        cancelled ? 'text-muted-foreground line-through' : ''
                      }`}
                    >
                      {canManage && (
                        <td className="px-3 py-2">
                          {canBundle(row) && (
                            <Checkbox
                              checked={picked.has(row.id)}
                              onCheckedChange={() => togglePick(row)}
                              aria-label={`Tick this ${money(row.amount)} voucher for bundling`}
                            />
                          )}
                        </td>
                      )}
                      <td className="px-3 py-2 tabular-nums">{row.serial_number ?? '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2">{formatDay(row.entry_date)}</td>
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
                      <td className="px-3 py-2 text-xs">
                        {row.atm_account_name ?? (
                          <span className="text-muted-foreground">
                            {row.direction === 'IN' ? '—' : 'From the box'}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {row.advance_holder_name ? (
                          <Badge
                            variant="outline"
                            className="bg-amber-100 text-[10px] text-amber-900 dark:bg-amber-500/15 dark:text-amber-400"
                          >
                            {row.advance_holder_name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">{row.item || '—'}</td>
                      <td className="max-w-[340px] px-3 py-2">
                        {row.detail}
                        {row.attachments?.length > 0 && (
                          // The bill, where the line it belongs to is read.
                          // A register that hides its proof behind a dialog
                          // is one nobody checks.
                          <span className="ml-2 inline-flex items-center gap-1 align-middle text-xs text-muted-foreground">
                            <Paperclip className="h-3 w-3" />
                            {row.attachments.length > 1 && row.attachments.length}
                            {row.attachments.map((file, index) => (
                              <a
                                key={file.id}
                                href={file.url ?? '#'}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:underline"
                                title={file.original_filename}
                              >
                                {index === 0 ? 'bill' : `·${index + 1}`}
                              </a>
                            ))}
                          </span>
                        )}
                      </td>
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
                        {row.approval_decided_at ? (
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {formatDay(row.approval_decided_at)}
                          </p>
                        ) : (
                          row.approver_name && (
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              with {row.approver_name}
                            </p>
                          )
                        )}
                      </td>
                      {canManage && <td className="px-3 py-2">{rowActions(row)}</td>}
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
            isLoading={isFetching}
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
          nextSerial={data?.next_serial}
        />
      )}
    </div>
  );
}
