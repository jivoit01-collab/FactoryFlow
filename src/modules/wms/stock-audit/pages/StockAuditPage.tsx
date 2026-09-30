import {
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Download,
  Minus,
  PackagePlus,
  Plus,
  RefreshCw,
  Search,
  Send,
  X,
} from 'lucide-react';
import { Fragment, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

import {
  confirmDialog,
  EmptyPanel,
  PageHeader,
  promptDialog,
  StatTile,
  StatTileRow,
  StatusPill,
  type StatusTone,
} from '@/shared/components';
import { Button, Card, CardContent, Input } from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';
import { cn, getErrorMessage } from '@/shared/utils';

import {
  stockAuditApi,
  useAddCount,
  useApproveAudit,
  useCompleteAudit,
  useRefreshFromSap,
  useRejectAudit,
  useStockAudit,
  useStockAuditLines,
} from '../api';
import { AddItemDialog } from '../components/AddItemDialog';
import { CountHistoryDialog } from '../components/CountHistoryDialog';
import { PostToSapDialog } from '../components/PostToSapDialog';
import { differenceLabel, groupLabel, qty } from '../format';
import type { CategoryProgress, LineState, StockAuditDetail, StockAuditLine } from '../types';

const STATES: { value: LineState; label: string; needsSap?: boolean }[] = [
  { value: '', label: 'All' },
  { value: 'uncounted', label: 'Not counted' },
  { value: 'counted', label: 'Counted' },
  { value: 'different', label: 'Differences', needsSap: true },
];

const DIFF_TONE = {
  match: 'text-emerald-700 dark:text-emerald-400',
  short: 'text-rose-700 dark:text-rose-400',
  excess: 'text-amber-700 dark:text-amber-400',
  none: 'text-muted-foreground',
} as const;

/**
 * The row's box: what was just found here is added to on hand, or what was
 * counted by mistake is removed from it. Nothing here touches SAP.
 */
function AdjustOnHandCell({ auditId, line }: { auditId: number; line: StockAuditLine }) {
  const [value, setValue] = useState('');
  const addCount = useAddCount(auditId);

  const submit = async (direction: 1 | -1) => {
    const entered = value.trim();
    if (!entered) return;
    const amount = Number(entered);
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error('Enter the quantity, in figures');
      return;
    }
    const onHand = Number(line.counted_qty ?? 0);
    if (direction === -1 && amount > onHand) {
      toast.error(`Only ${qty(line.counted_qty ?? '0')} on hand to remove from`);
      return;
    }
    try {
      const updated = await addCount.mutateAsync({
        lineId: line.id,
        qty: direction === 1 ? entered : `-${entered}`,
      });
      setValue('');
      toast.success(
        line.counted_qty == null
          ? `${line.item_code}: ${qty(updated.counted_qty)} on hand`
          : `${line.item_code}: ${qty(line.counted_qty)} ${direction === 1 ? '+' : '−'} ${qty(entered)} = ${qty(updated.counted_qty)}`,
      );
    } catch (error) {
      toast.error(getErrorMessage(error, 'On hand was not saved.'));
    }
  };

  // Looked, found none: the line is counted at 0, not left blank.
  const foundNone = async () => {
    try {
      await addCount.mutateAsync({ lineId: line.id, qty: '0' });
      toast.success(`${line.item_code}: 0 on hand`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'On hand was not saved.'));
    }
  };

  return (
    <form
      className="flex items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        submit(1); // Enter adds
      }}
    >
      <Input
        inputMode="decimal"
        aria-label={`Quantity for ${line.item_code}`}
        placeholder="Qty"
        className="h-8 w-20 text-right font-mono"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button
        type="submit"
        size="sm"
        variant="outline"
        className="h-8 px-2"
        aria-label={`Add to ${line.item_code}`}
        title="Add to on hand"
        disabled={!value.trim() || addCount.isPending}
      >
        <Plus className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 px-2"
        aria-label={`Remove from ${line.item_code}`}
        title="Remove from on hand"
        disabled={!value.trim() || addCount.isPending || line.counted_qty == null}
        onClick={() => submit(-1)}
      >
        <Minus className="h-4 w-4" />
      </Button>
      {line.counted_qty == null && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 font-mono"
          aria-label={`None of ${line.item_code} found`}
          title="None found"
          disabled={addCount.isPending}
          onClick={foundNone}
        >
          0
        </Button>
      )}
    </form>
  );
}

/**
 * One warehouse's audit: every item SAP listed, what has been counted of it,
 * and — for those allowed to see it — SAP's figure and the difference.
 * Complete → approve (or reject back) → post the RM and PM differences to SAP.
 */
export default function StockAuditPage() {
  const auditId = Number(useParams().auditId);

  const [search, setSearch] = useState('');
  const term = useDebounce(search, 300);
  const [group, setGroup] = useState('');
  const [state, setState] = useState<LineState>('');
  const [page, setPage] = useState(1);
  const [historyFor, setHistoryFor] = useState<StockAuditLine | null>(null);
  const [addingItem, setAddingItem] = useState(false);
  const [posting, setPosting] = useState(false);

  const audit = useStockAudit(auditId);
  const lines = useStockAuditLines(auditId, { search: term, group, state, page });
  const refresh = useRefreshFromSap(auditId);
  const complete = useCompleteAudit(auditId);
  const approve = useApproveAudit(auditId);
  const reject = useRejectAudit(auditId);

  const data = audit.data;
  const actions = data?.actions;
  const seesSap = lines.data?.sees_sap ?? false;
  const pages = lines.data ? Math.max(1, Math.ceil(lines.data.count / lines.data.page_size)) : 1;

  const filterBy = (next: { group?: string; state?: LineState }) => {
    if (next.group !== undefined) setGroup(next.group);
    if (next.state !== undefined) setState(next.state);
    setPage(1);
  };

  const run = async (action: () => Promise<unknown>, done: string, failed: string) => {
    try {
      await action();
      toast.success(done);
    } catch (error) {
      toast.error(getErrorMessage(error, failed));
    }
  };

  const handleRefresh = async () => {
    const ok = await confirmDialog({ title: 'Read SAP again?', confirmLabel: 'Read SAP' });
    if (ok) await run(() => refresh.mutateAsync(), 'SAP read again', 'SAP was not read.');
  };

  const handleComplete = async () => {
    const uncounted = (data?.summary.total.lines ?? 0) - (data?.summary.total.counted ?? 0);
    if (uncounted > 0) {
      // Every item is counted first — 0 for one not found — so show what is left.
      toast.error(
        `${uncounted} ${uncounted === 1 ? 'item is' : 'items are'} not counted. Count them, or press 0.`,
      );
      filterBy({ group: '', state: 'uncounted' });
      return;
    }
    const ok = await confirmDialog({ title: 'Complete the audit?', confirmLabel: 'Complete' });
    if (ok) await run(() => complete.mutateAsync(), 'Sent for approval', 'Not completed.');
  };

  const decide = async (kind: 'approve' | 'reject') => {
    const comment = await promptDialog({
      title: kind === 'approve' ? 'Approve this audit?' : 'Reject this audit?',
      label: 'Comment',
      confirmLabel: kind === 'approve' ? 'Approve' : 'Reject',
      destructive: kind === 'reject',
      multiline: true,
    });
    if (!comment) return;
    if (kind === 'approve') {
      await run(() => approve.mutateAsync(comment), 'Audit approved', 'Not approved.');
    } else {
      await run(() => reject.mutateAsync(comment), 'Sent back to the auditors', 'Not rejected.');
    }
  };

  const handleExport = async () => {
    try {
      const blob = await stockAuditApi.exportCsv(auditId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stock-audit-${data?.warehouse_code ?? auditId}-${auditId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(getErrorMessage(error, 'The export was not downloaded.'));
    }
  };

  if (audit.isLoading || !data || !actions) {
    return (
      <EmptyPanel
        loading={audit.isLoading}
        message={audit.isLoading ? 'Loading…' : getErrorMessage(audit.error, 'Audit not found.')}
      />
    );
  }

  const status = statusPill(data);
  const tile = (name: string, part: CategoryProgress) => (
    <StatTile
      key={name || 'ALL'}
      label={name ? groupLabel(name) : 'All'}
      value={`${part.counted} / ${part.lines}`}
      accent="teal"
      onClick={() => filterBy({ group: name })}
      className={cn(group === name && 'ring-2 ring-primary')}
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <>
            <span className="font-mono">{data.warehouse_code}</span> {data.warehouse_name}
          </>
        }
        icon={ClipboardCheck}
        accent="teal"
        backTo="/warehouse-ops/stock-audit"
        backLabel="Stock Audit"
        meta={
          <StatusPill tone={status.tone} dot>
            {status.text}
          </StatusPill>
        }
      >
        <div className="flex flex-wrap gap-2">
          {actions.refresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refresh.isPending}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh SAP
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          {actions.complete && (
            <Button size="sm" onClick={handleComplete} disabled={complete.isPending}>
              <CheckCheck className="mr-2 h-4 w-4" /> Complete
            </Button>
          )}
          {actions.approve && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => decide('reject')}
                disabled={reject.isPending}
              >
                <X className="mr-2 h-4 w-4" /> Reject
              </Button>
              <Button size="sm" onClick={() => decide('approve')} disabled={approve.isPending}>
                <Check className="mr-2 h-4 w-4" /> Approve
              </Button>
            </>
          )}
          {actions.post_to_sap && (
            <Button size="sm" onClick={() => setPosting(true)}>
              <Send className="mr-2 h-4 w-4" /> Post to SAP
            </Button>
          )}
        </div>
      </PageHeader>

      {data.status === 'OPEN' && data.rejection_reason && (
        <Notice tone="warn">
          Rejected by {data.rejected_by}: {data.rejection_reason}
        </Notice>
      )}
      {data.approval_comment && data.status === 'APPROVED' && (
        <Notice tone="info">
          Approved by {data.approved_by}: {data.approval_comment}
        </Notice>
      )}
      {(data.sap_posting === 'FAILED' || data.sap_posting === 'UNKNOWN') && (
        <Notice tone="warn">
          {data.sap_posting === 'FAILED' ? 'SAP refused the posting' : 'SAP did not answer'}:{' '}
          {data.sap_posting_error}
        </Notice>
      )}

      {data.sap_posted_lines.length > 0 && <PostedToSap audit={data} />}

      <StatTileRow>
        {tile('', data.summary.total)}
        {Object.entries(data.summary.by_group).map(([name, part]) => tile(name, part))}
      </StatTileRow>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                aria-label="Search items"
                placeholder="Search item"
                className="pl-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="flex rounded-lg border p-0.5" role="group" aria-label="Show">
              {STATES.filter((s) => !s.needsSap || seesSap).map((s) => (
                <button
                  key={s.value || 'all'}
                  type="button"
                  aria-pressed={state === s.value}
                  onClick={() => filterBy({ state: s.value })}
                  className={cn(
                    'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                    state === s.value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {actions.count && (
              <Button variant="outline" size="sm" onClick={() => setAddingItem(true)}>
                <PackagePlus className="mr-2 h-4 w-4" /> Add item
              </Button>
            )}
          </div>

          {!lines.data?.results.length ? (
            <EmptyPanel
              loading={lines.isLoading}
              message={lines.isLoading ? 'Loading…' : 'No items'}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-2 font-medium">Item</th>
                    <th className="py-2 pr-2 font-medium">Group</th>
                    {seesSap && <th className="py-2 pr-2 text-right font-medium">SAP</th>}
                    <th className="py-2 pr-2 text-right font-medium">On Hand</th>
                    {actions.count && <th className="py-2 pr-2 font-medium">Add / Remove</th>}
                    {seesSap && <th className="py-2 text-right font-medium">Difference</th>}
                  </tr>
                </thead>
                <tbody>
                  {lines.data.results.map((line) => {
                    const diff = differenceLabel(line.difference);
                    return (
                      <tr key={line.id} className="border-b last:border-0">
                        <td className="py-2 pr-2">
                          <span className="font-mono">{line.item_code}</span>
                          {!line.in_sap && (
                            <StatusPill tone="warn" className="ml-2">
                              New
                            </StatusPill>
                          )}
                          <span className="block text-xs text-muted-foreground">
                            {line.item_name}
                          </span>
                        </td>
                        <td className="py-2 pr-2 text-xs">{groupLabel(line.item_group_name)}</td>
                        {seesSap && (
                          <td className="py-2 pr-2 text-right font-mono tabular-nums">
                            {qty(line.sap_qty)}
                          </td>
                        )}
                        <td className="py-2 pr-2 text-right">
                          <button
                            type="button"
                            className="font-mono font-semibold tabular-nums hover:underline"
                            onClick={() => setHistoryFor(line)}
                            aria-label={`On hand history of ${line.item_code}`}
                          >
                            {qty(line.counted_qty)}
                          </button>
                          <span className="ml-1 text-xs text-muted-foreground">{line.uom}</span>
                        </td>
                        {actions.count && (
                          <td className="py-2 pr-2">
                            <AdjustOnHandCell auditId={auditId} line={line} />
                          </td>
                        )}
                        {seesSap && (
                          <td
                            className={cn(
                              'py-2 text-right font-mono tabular-nums',
                              DIFF_TONE[diff.tone],
                            )}
                          >
                            {diff.text}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {lines.data && lines.data.count > lines.data.page_size && (
            <div className="flex items-center justify-end gap-2 text-sm">
              <span className="text-muted-foreground">
                Page {page} of {pages}
              </span>
              <Button
                variant="outline"
                size="icon"
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Next page"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <CountHistoryDialog
        auditId={auditId}
        line={historyFor}
        open={historyFor != null}
        isOpenAudit={actions.count}
        canVoidAny={actions.void_any}
        onClose={() => setHistoryFor(null)}
      />
      <AddItemDialog
        auditId={auditId}
        open={addingItem}
        onClose={() => setAddingItem(false)}
        onAdded={(itemCode) => {
          setAddingItem(false);
          setSearch(itemCode);
          filterBy({ group: '', state: '' });
        }}
      />
      {posting && <PostToSapDialog audit={data} open={posting} onClose={() => setPosting(false)} />}
    </div>
  );
}

/** The audit's state in two words, and its colour. */
function statusPill(audit: StockAuditDetail): { text: string; tone: StatusTone } {
  if (audit.sap_posting === 'DONE')
    return { text: `Posted to SAP · ${audit.sap_doc_num}`, tone: 'done' };
  if (audit.status === 'APPROVED') return { text: 'Approved', tone: 'done' };
  if (audit.status === 'SUBMITTED') return { text: 'Awaiting approval', tone: 'warn' };
  if (audit.status === 'CLOSED') return { text: 'Closed', tone: 'neutral' };
  return { text: audit.rejection_reason ? 'Open · rejected' : 'Open', tone: 'progress' };
}

function Notice({ tone, children }: { tone: 'warn' | 'info'; children: React.ReactNode }) {
  return (
    <div
      role="status"
      className={cn(
        'rounded-md border px-3 py-2 text-sm',
        tone === 'warn' &&
          'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200',
        tone === 'info' &&
          'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200',
      )}
    >
      {children}
    </div>
  );
}

/** What went to SAP: each line's change, and for a batch item each batch. */
function PostedToSap({ audit }: { audit: StockAuditDetail }) {
  const done = audit.sap_posting === 'DONE';
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="mb-3 text-sm font-medium">
          {done
            ? `Posted to SAP · document ${audit.sap_doc_num} · ${audit.sap_posted_by}`
            : 'Sent to SAP — not confirmed'}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-2 font-medium">Item</th>
                <th className="py-2 pr-2 text-right font-medium">SAP</th>
                <th className="py-2 pr-2 text-right font-medium">On Hand</th>
                <th className="py-2 text-right font-medium">Change</th>
              </tr>
            </thead>
            <tbody>
              {audit.sap_posted_lines.map((line) => (
                <Fragment key={line.item_code}>
                  <tr className="border-b last:border-0">
                    <td className="py-2 pr-2">
                      <span className="font-mono">{line.item_code}</span>
                      <span className="block text-xs text-muted-foreground">{line.item_name}</span>
                    </td>
                    <td className="py-2 pr-2 text-right font-mono tabular-nums">
                      {qty(line.sap_qty)}
                    </td>
                    <td className="py-2 pr-2 text-right font-mono tabular-nums">
                      {qty(line.counted_qty)}
                    </td>
                    <td className="py-2 text-right font-mono tabular-nums">
                      {Number(line.difference) > 0 ? '+' : ''}
                      {qty(line.difference)} {line.uom}
                    </td>
                  </tr>
                  {line.batches.map((b) => (
                    <tr key={b.batch} className="text-xs text-muted-foreground">
                      <td className="py-1 pl-4 pr-2">Batch {b.batch}</td>
                      <td className="py-1 pr-2 text-right font-mono tabular-nums">
                        {qty(b.sap_qty)}
                      </td>
                      <td className="py-1 pr-2 text-right font-mono tabular-nums">
                        {qty(b.counted_qty)}
                      </td>
                      <td />
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
