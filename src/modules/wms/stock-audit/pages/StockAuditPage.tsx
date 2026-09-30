import {
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Download,
  Lock,
  Minus,
  PackagePlus,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { STOCK_AUDIT_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import {
  confirmDialog,
  EmptyPanel,
  PageHeader,
  StatTile,
  StatTileRow,
  StatusPill,
} from '@/shared/components';
import { Button, Card, CardContent, Input } from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';
import { cn, getErrorMessage } from '@/shared/utils';

import {
  stockAuditApi,
  useAddCount,
  useCloseAudit,
  useRefreshFromSap,
  useStockAudit,
  useStockAuditLines,
} from '../api';
import { AddItemDialog } from '../components/AddItemDialog';
import { CountHistoryDialog } from '../components/CountHistoryDialog';
import { CATEGORY_LABELS, CATEGORY_ORDER, differenceLabel, qty } from '../format';
import type { ItemCategory, LineState, StockAuditLine } from '../types';

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
    </form>
  );
}

/**
 * One warehouse's audit: every item SAP listed, what has been counted of it,
 * and — for those allowed to see it — SAP's figure and the difference.
 */
export default function StockAuditPage() {
  const auditId = Number(useParams().auditId);
  const { hasPermission, hasAnyPermission } = usePermission();
  const canManage = hasPermission(STOCK_AUDIT_PERMISSIONS.MANAGE);
  const canCount = hasAnyPermission([
    STOCK_AUDIT_PERMISSIONS.COUNT,
    STOCK_AUDIT_PERMISSIONS.MANAGE,
  ]);

  const [search, setSearch] = useState('');
  const term = useDebounce(search, 300);
  const [category, setCategory] = useState<ItemCategory | ''>('');
  const [state, setState] = useState<LineState>('');
  const [page, setPage] = useState(1);
  const [historyFor, setHistoryFor] = useState<StockAuditLine | null>(null);
  const [addingItem, setAddingItem] = useState(false);

  const audit = useStockAudit(auditId);
  const lines = useStockAuditLines(auditId, { search: term, category, state, page });
  const refresh = useRefreshFromSap(auditId);
  const close = useCloseAudit(auditId);

  const data = audit.data;
  const seesSap = lines.data?.sees_sap ?? false;
  const isOpen = data?.status === 'OPEN';
  const pages = lines.data ? Math.max(1, Math.ceil(lines.data.count / lines.data.page_size)) : 1;

  const filterBy = (next: { category?: ItemCategory | ''; state?: LineState }) => {
    if (next.category !== undefined) setCategory(next.category);
    if (next.state !== undefined) setState(next.state);
    setPage(1);
  };

  const handleRefresh = async () => {
    const ok = await confirmDialog({
      title: 'Read SAP again?',
      description:
        'Every item’s SAP quantity is copied again. Only possible before counting starts.',
      confirmLabel: 'Read SAP',
    });
    if (!ok) return;
    try {
      await refresh.mutateAsync();
      toast.success('SAP’s figures read again');
    } catch (error) {
      toast.error(getErrorMessage(error, 'SAP was not read.'));
    }
  };

  const handleClose = async () => {
    const uncounted = (data?.summary.total.lines ?? 0) - (data?.summary.total.counted ?? 0);
    const ok = await confirmDialog({
      title: 'Close this audit?',
      description:
        uncounted > 0
          ? `${uncounted} items are still not counted. A closed audit takes no more counts.`
          : 'A closed audit takes no more counts.',
      confirmLabel: 'Close audit',
      destructive: uncounted > 0,
    });
    if (!ok) return;
    try {
      await close.mutateAsync();
      toast.success('Audit closed');
    } catch (error) {
      toast.error(getErrorMessage(error, 'The audit was not closed.'));
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

  if (audit.isLoading || !data) {
    return (
      <EmptyPanel
        loading={audit.isLoading}
        message={
          audit.isLoading ? 'Loading the audit…' : getErrorMessage(audit.error, 'Audit not found.')
        }
      />
    );
  }

  const progress = (key: ItemCategory | 'ALL') => {
    const part = key === 'ALL' ? data.summary.total : data.summary.by_category[key];
    if (!part) return null;
    return (
      <StatTile
        key={key}
        label={key === 'ALL' ? 'All' : CATEGORY_LABELS[key]}
        value={`${part.counted} / ${part.lines}`}
        accent="teal"
        onClick={() => filterBy({ category: key === 'ALL' ? '' : key })}
        className={cn(
          (key === 'ALL' ? category === '' : category === key) && 'ring-2 ring-primary',
        )}
      />
    );
  };

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
          <StatusPill tone={isOpen ? 'progress' : 'done'} dot>
            {isOpen ? 'Open' : 'Closed'}
          </StatusPill>
        }
      >
        <div className="flex flex-wrap gap-2">
          {canManage && data.can_refresh && (
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
          {canManage && isOpen && (
            <Button size="sm" onClick={handleClose} disabled={close.isPending}>
              <Lock className="mr-2 h-4 w-4" /> Close
            </Button>
          )}
        </div>
      </PageHeader>

      <StatTileRow>
        {progress('ALL')}
        {CATEGORY_ORDER.map((key) => progress(key))}
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
            {isOpen && canCount && (
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
                    <th className="py-2 pr-2 font-medium">Type</th>
                    {seesSap && <th className="py-2 pr-2 text-right font-medium">SAP</th>}
                    <th className="py-2 pr-2 text-right font-medium">On Hand</th>
                    {isOpen && canCount && <th className="py-2 pr-2 font-medium">Add / Remove</th>}
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
                        <td className="py-2 pr-2 text-xs">{line.category}</td>
                        {seesSap && (
                          <td className="py-2 pr-2 text-right font-mono tabular-nums">
                            {qty(line.sap_qty)}
                          </td>
                        )}
                        <td className="py-2 pr-2 text-right">
                          <button
                            type="button"
                            className="font-mono font-semibold tabular-nums hover:underline disabled:no-underline"
                            onClick={() => setHistoryFor(line)}
                            aria-label={`On hand history of ${line.item_code}`}
                          >
                            {qty(line.counted_qty)}
                          </button>
                          <span className="ml-1 text-xs text-muted-foreground">{line.uom}</span>
                        </td>
                        {isOpen && canCount && (
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
                Page {page} of {pages} · {lines.data.count} items
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
        isOpenAudit={isOpen}
        canVoidAny={canManage}
        onClose={() => setHistoryFor(null)}
      />
      <AddItemDialog
        auditId={auditId}
        open={addingItem}
        onClose={() => setAddingItem(false)}
        onAdded={(itemCode) => {
          setAddingItem(false);
          setSearch(itemCode);
          filterBy({ category: '', state: '' });
        }}
      />
    </div>
  );
}
