/**
 * Step 2–3 — Review a batch's consolidated stock list, resolve any unmapped SKUs
 * inline, then send the request to a warehouse.
 */
import { AlertTriangle, ArrowLeft, Download, PackageCheck, Send, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import {
  useBatch,
  useBatchStockList,
  useCombos,
  useSapWarehouses,
  useSendIssueRequest,
  useSkipUnmappedOrders,
  useUpsertSkuMapping,
} from '../api/marketplace.queries';
import { MpFlowSteps } from '../components/MpFlowSteps';
import type { MarketplaceChannel, StockListLine } from '../types/marketplace.types';

export default function MpBatchDetailPage() {
  const { batchId } = useParams();
  const id = Number(batchId);
  const navigate = useNavigate();

  const { data: batch } = useBatch(id);
  const { data: stock, isLoading } = useBatchStockList(id);
  const { data: warehouses = [] } = useSapWarehouses(); // real SAP godowns
  const [warehouse, setWarehouse] = useState('');
  const sendMut = useSendIssueRequest();

  const [resolveSku, setResolveSku] = useState<string | null>(null);
  const [skipOpen, setSkipOpen] = useState(false);
  const skipMut = useSkipUnmappedOrders(id);

  const unmapped = stock?.unmapped_skus ?? [];
  const canSend = unmapped.length === 0 && (stock?.lines.length ?? 0) > 0;

  function skipUnmapped() {
    skipMut.mutate(undefined, {
      onSuccess: (r) => {
        setSkipOpen(false);
        toast.success(
          `Removed ${r.removed_count} order(s) with missing mappings.` +
            (r.blocked_order_ids.length
              ? ` ${r.blocked_order_ids.length} kept (already in dispatch).`
              : ''),
        );
      },
      onError: (e: unknown) => {
        setSkipOpen(false);
        toast.error(getErrorMessage(e, 'Could not remove orders.'));
      },
    });
  }

  const fgLines = useMemo(
    () => (stock?.lines ?? []).filter((l) => l.component_type === 'FG'),
    [stock],
  );
  const pmLines = useMemo(
    () => (stock?.lines ?? []).filter((l) => l.component_type === 'PM'),
    [stock],
  );

  const exportRows = useMemo(
    () =>
      [...fgLines, ...pmLines].map((l) => ({
        'Item code': l.item_code,
        // The screen prints an em dash for a nameless item, which reads as "nothing
        // here". A blank cell in a spreadsheet reads as missing data, so say what is
        // actually wrong — the item code beside it still identifies the row.
        Name: l.item_name || '(no name in item master)',
        Type: l.component_type,
        Required: Number(l.required_quantity),
        'From SKUs': l.source_skus.join(', '),
      })),
    [fgLines, pmLines],
  );

  // An unmapped SKU resolves to NO stock line, so it was absent from the workbook
  // altogether — on screen it sits in its own card above, but the exported file had
  // no trace of it and the SKU simply looked missing. These are the ones the
  // warehouse most needs to see, so they get their own sheet rather than being
  // mixed into quantities nobody can issue.
  const unmappedRows = useMemo(
    () => unmapped.map((sku) => ({ 'Marketplace SKU / FSN': sku, Status: 'No mapping — not in the stock list' })),
    [unmapped],
  );

  const exportExcel = useCallback(() => {
    if (exportRows.length === 0 && unmappedRows.length === 0) {
      toast.error('Nothing to export.');
      return;
    }
    // Width each column to its widest cell. Capped: one row's long "From SKUs" list
    // otherwise sets a column hundreds of characters wide, which pushes every other
    // column off the screen and makes the file look empty until you scroll back.
    const fit = <T extends object>(rows: T[]) =>
      Object.keys(rows[0]).map((key) => ({
        wch: Math.min(
          Math.max(key.length, ...rows.map((r) => String(r[key as keyof T] ?? '').length)) + 2,
          80,
        ),
      }));

    const wb = XLSX.utils.book_new();
    if (exportRows.length > 0) {
      const ws = XLSX.utils.json_to_sheet(exportRows);
      ws['!cols'] = fit(exportRows);
      XLSX.utils.book_append_sheet(wb, ws, 'Consolidated stock');
    }
    if (unmappedRows.length > 0) {
      const wsU = XLSX.utils.json_to_sheet(unmappedRows);
      wsU['!cols'] = fit(unmappedRows);
      XLSX.utils.book_append_sheet(wb, wsU, 'Unmapped SKUs');
    }
    const base = (batch?.filename || `batch_${id}`).replace(/\.[^.]+$/, '');
    XLSX.writeFile(wb, `Consolidated_Stock_${base}.xlsx`);
  }, [exportRows, unmappedRows, batch, id]);

  function send() {
    if (warehouses.length > 0 && !warehouse) {
      toast.error('Choose a warehouse to send the request to.');
      return;
    }
    sendMut.mutate(
      { batch_id: id, warehouse_code: warehouse },
      {
        onSuccess: (req) => {
          toast.success('Request sent to warehouse.');
          navigate(`/marketplace/issues/${req.id}`);
        },
        onError: (e: unknown) =>
          toast.error((e as { message?: string })?.message ?? 'Could not send request.'),
      },
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <header className="space-y-2">
        <Link to="/marketplace/import" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Imports
        </Link>
        <h1 className="text-2xl font-semibold">
          {batch?.filename || `Batch #${id}`}
        </h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">{batch?.status}</Badge>
          <span>{stock?.orders ?? 0} orders · {stock?.lines.length ?? 0} stock lines</span>
        </div>
        <MpFlowSteps current={unmapped.length ? 2 : 3} />
      </header>

      {unmapped.length > 0 && (
        <Card className="border-amber-500/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              {unmapped.length} SKU(s) need mapping
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Map each SKU to a finished good or a combo, then this list updates automatically —
              or skip the orders that use them and remove them from this batch.
            </p>
            <div className="space-y-2">
              {unmapped.map((sku) => (
                <div key={sku} className="flex items-center justify-between rounded-md border p-2">
                  <span className="font-mono text-sm">{sku}</span>
                  <Button size="sm" onClick={() => setResolveSku(sku)}>
                    Create mapping
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-xs text-muted-foreground">
                Can't map these? Remove the affected orders so the rest can proceed.
              </span>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive"
                onClick={() => setSkipOpen(true)}
                disabled={skipMut.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Skip &amp; remove orders
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={skipOpen} onOpenChange={(o) => !o && setSkipOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Skip &amp; remove unmapped orders?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Every order in this batch that still has an unmapped SKU/FSN will be
            <strong> permanently removed from the system</strong>. Orders already in the
            dispatch flow are kept. This can't be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSkipOpen(false)} disabled={skipMut.isPending}>
              Cancel
            </Button>
            <Button
              className="text-destructive"
              variant="outline"
              onClick={skipUnmapped}
              disabled={skipMut.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {skipMut.isPending ? 'Removing…' : 'Remove orders'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Consolidated stock list</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={exportExcel}
            disabled={isLoading || (exportRows.length === 0 && unmappedRows.length === 0)}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-center text-muted-foreground">Loading…</div>
          ) : (
            <div className="-mx-2 overflow-x-auto sm:mx-0">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="border-b text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="p-3">Item code</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Type</th>
                    <th className="p-3 text-right">Required</th>
                    <th className="p-3">From SKUs</th>
                  </tr>
                </thead>
                <tbody>
                  <StockRows lines={fgLines} label="Finished goods" />
                  <StockRows lines={pmLines} label="Packing material" />
                  {(stock?.lines.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-muted-foreground">
                        Nothing to issue.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Send to warehouse</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="w-full space-y-1 sm:w-auto">
            <label className="text-xs text-muted-foreground">Warehouse</label>
            <select
              value={warehouse}
              onChange={(e) => setWarehouse(e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm sm:w-auto"
            >
              <option value="">Select SAP warehouse…</option>
              {warehouses.map((w) => (
                <option key={w.warehouse_code} value={w.warehouse_code}>
                  {w.warehouse_code} — {w.warehouse_name}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={send} disabled={!canSend || sendMut.isPending} className="w-full sm:w-auto">
            <Send className="mr-2 h-4 w-4" />
            {sendMut.isPending ? 'Sending…' : 'Send request'}
          </Button>
          {!canSend && unmapped.length > 0 && (
            <span className="text-sm text-amber-600">Resolve unmapped SKUs first.</span>
          )}
        </CardContent>
      </Card>

      {resolveSku && (
        <ResolveDialog sku={resolveSku} channel={batch?.channel ?? 'FLIPKART'} onClose={() => setResolveSku(null)} />
      )}
    </div>
  );
}

function StockRows({ lines, label }: { lines: StockListLine[]; label: string }) {
  if (lines.length === 0) return null;
  return (
    <>
      <tr className="bg-muted/40">
        <td colSpan={5} className="px-3 py-1 text-xs font-semibold uppercase text-muted-foreground">
          {label}
        </td>
      </tr>
      {lines.map((l) => (
        <tr key={`${l.component_type}-${l.item_code}`} className="border-b last:border-0">
          <td className="p-3 font-mono">{l.item_code}</td>
          <td className="p-3">{l.item_name || '—'}</td>
          <td className="p-3">
            <Badge variant={l.component_type === 'FG' ? 'default' : 'outline'}>
              {l.component_type}
            </Badge>
          </td>
          <td className="p-3 text-right font-semibold">{Number(l.required_quantity)}</td>
          <td className="p-3 text-xs text-muted-foreground">{l.source_skus.join(', ')}</td>
        </tr>
      ))}
    </>
  );
}

function ResolveDialog({ sku, channel, onClose }: { sku: string; channel: MarketplaceChannel; onClose: () => void }) {
  const { data: combos = [] } = useCombos(channel);
  const upsert = useUpsertSkuMapping();
  const [type, setType] = useState<'RAW' | 'COMBO'>('RAW');
  const [fgCode, setFgCode] = useState('');
  const [comboId, setComboId] = useState('');

  function save() {
    if (type === 'RAW' && !fgCode.trim()) {
      toast.error('Enter the SAP finished-good item code.');
      return;
    }
    if (type === 'COMBO' && !comboId) {
      toast.error('Pick a combo.');
      return;
    }
    upsert.mutate(
      {
        channel,
        marketplace_sku: sku,
        sku_type: type,
        fg_item_code: type === 'RAW' ? fgCode.trim() : '',
        combo: type === 'COMBO' ? Number(comboId) : null,
        is_active: true,
      },
      {
        onSuccess: () => {
          toast.success(`Mapped ${sku}.`);
          onClose();
        },
        onError: (e: unknown) =>
          toast.error((e as { message?: string })?.message ?? 'Could not save mapping.'),
      },
    );
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold">Map SKU</h3>
            <p className="font-mono text-sm text-muted-foreground">{sku}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant={type === 'RAW' ? 'default' : 'outline'} onClick={() => setType('RAW')}>
              Direct finished good
            </Button>
            <Button size="sm" variant={type === 'COMBO' ? 'default' : 'outline'} onClick={() => setType('COMBO')}>
              Combo / pack
            </Button>
          </div>
          {type === 'RAW' ? (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">SAP finished-good item code</label>
              <input
                value={fgCode}
                onChange={(e) => setFgCode(e.target.value)}
                placeholder="e.g. FG-CANOLA-5L"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Combo</label>
              <select
                value={comboId}
                onChange={(e) => setComboId(e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Select combo…</option>
                {combos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
              {combos.length === 0 && (
                <p className="text-xs text-amber-600">
                  No combos yet — create one in Masters first.
                </p>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save} disabled={upsert.isPending}>
              <PackageCheck className="mr-2 h-4 w-4" />
              Save mapping
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
