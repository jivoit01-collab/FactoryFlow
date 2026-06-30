import { AlertCircle, CheckCircle2, ClipboardCheck, Loader2, Trash2, X } from 'lucide-react';
import { type FormEvent, useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useScanner } from '@/modules/barcode/hooks/useScanner';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
} from '@/shared/components/ui';
import { useBoxScanQueue } from '@/shared/hooks';
import { cn, getErrorMessage } from '@/shared/utils';

import { bstApi, useBSTTransfer, useRemoveBSTScan } from '../../api';
import { BoxScanCamera } from './BoxScanCamera';
import { BSTStatusBadge } from './bstStatus';

export default function BSTScanPage() {
  const { transferId: idParam } = useParams<{ transferId: string }>();
  const transferId = Number(idParam);
  const navigate = useNavigate();

  const { data: transfer, isLoading, refetch } = useBSTTransfer(transferId);
  const removeMut = useRemoveBSTScan();

  const [manualBarcode, setManualBarcode] = useState('');

  const editable = transfer?.status === 'SCANNING' || transfer?.status === 'DRAFT';
  const scans = useMemo(() => transfer?.box_scans ?? [], [transfer]);

  // What this BST is supposed to move (the SAP lines), with live scanned progress.
  const items = transfer?.items ?? [];
  const scannedByItem = useMemo(() => {
    const map = new Map<string, { qty: number; boxes: number }>();
    for (const s of scans) {
      const cur = map.get(s.item_code) ?? { qty: 0, boxes: 0 };
      cur.qty += Number(s.quantity) || 0;
      cur.boxes += 1;
      map.set(s.item_code, cur);
    }
    return map;
  }, [scans]);

  const isAlreadyScanned = useCallback(
    (barcode: string) =>
      (transfer?.box_scans ?? []).some(
        (s) => s.box_barcode.toLowerCase() === barcode.toLowerCase(),
      ),
    [transfer],
  );

  const { enqueue, pendingCount, flashing, failedScans, retryFailed, dismissFailed } =
    useBoxScanQueue({
      scanOne: async (barcode) => {
        const result = await bstApi.scanBox(transferId, barcode);
        return { duplicate: result.created_count === 0 && result.duplicate_count > 0 };
      },
      isAlreadyScanned,
      onDrained: () => refetch(),
      onDuplicate: (barcode) => toast.warning(`${barcode}: already scanned`),
      onAlreadyInList: () => toast.warning('This box is already in the scan list'),
    });

  const handleCameraScan = useCallback((decoded: string) => enqueue(decoded), [enqueue]);
  const scanner = useScanner({ onScan: handleCameraScan, debounceMs: 1800 });

  const handleManualSubmit = () => {
    enqueue(manualBarcode);
    setManualBarcode('');
  };

  const handleRemove = async (scanId: number) => {
    try {
      await removeMut.mutateAsync({ transferId, scanId });
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not remove scan'));
    }
  };

  const goToReview = () => navigate(`/warehouse/bst/${transferId}/review`);

  if (isLoading || !transfer) {
    return <p className="text-muted-foreground py-12 text-center">Loading…</p>;
  }

  const handleManualFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleManualSubmit();
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title={`Scan Boxes — ${transfer.entry_no}`}
        description={`${transfer.sap_from_warehouse || '—'} → ${transfer.sap_to_warehouse || '—'} · SAP #${transfer.sap_doc_num}`}
      >
        <BSTStatusBadge status={transfer.status} />
      </DashboardHeader>

      {/* Stock this BST should move (the SAP bill), with live scan progress */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-medium">Stock to transfer</p>
            <Badge variant="outline">
              {scans.length} box{scans.length === 1 ? '' : 'es'} scanned
            </Badge>
          </div>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="w-[150px] p-3 text-left font-medium">Item Code</th>
                  <th className="p-3 text-left font-medium">Item</th>
                  <th className="w-[130px] p-3 text-right font-medium">Bill Qty</th>
                  <th className="w-[180px] p-3 text-left font-medium">Scanned</th>
                  <th className="w-[120px] p-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const scanned = scannedByItem.get(it.item_code);
                  const scannedQty = scanned?.qty ?? 0;
                  const boxes = scanned?.boxes ?? 0;
                  const billQty = Number(it.quantity) || 0;
                  const complete = billQty > 0 && scannedQty >= billQty;
                  const progress = billQty > 0 ? Math.min(100, Math.round((scannedQty / billQty) * 100)) : null;
                  return (
                    <tr
                      key={it.id}
                      className={cn(
                        'border-b last:border-b-0',
                        boxes > 0 && !complete && 'bg-amber-50/60',
                        complete && 'bg-emerald-50/60',
                      )}
                    >
                      <td className="whitespace-nowrap p-3 align-top font-mono text-xs font-semibold">
                        {it.item_code}
                      </td>
                      <td className="p-3 align-top">
                        <div className="font-medium">{it.item_name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">Line {it.line_num + 1}</div>
                      </td>
                      <td className="whitespace-nowrap p-3 text-right align-top tabular-nums">
                        {it.quantity} {it.uom}
                      </td>
                      <td className="p-3 align-top">
                        <div className="font-medium">
                          {boxes} box{boxes === 1 ? '' : 'es'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {scannedQty > 0 ? `${scannedQty} ${it.uom}` : '-'}
                        </div>
                        {progress !== null ? (
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        ) : null}
                      </td>
                      <td className="p-3 align-top">
                        <Badge
                          variant={complete ? 'success' : 'outline'}
                          className={cn(!complete && boxes > 0 && 'border-amber-200 bg-amber-50 text-amber-700')}
                        >
                          {complete ? (
                            <>
                              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Complete
                            </>
                          ) : boxes > 0 ? (
                            'Partial'
                          ) : (
                            'Open'
                          )}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {!editable ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            This BST is no longer open for scanning.
            <div className="mt-3">
              <Button variant="outline" onClick={() => navigate(`/warehouse/bst/${transferId}`)}>
                View details
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Scan area — camera + manual input, like the docking flow */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4 rounded-md border bg-muted/10 p-3 xl:grid-cols-[minmax(240px,0.9fr)_minmax(0,1.1fr)]">
                <BoxScanCamera scanner={scanner} flashing={flashing} />

                <form className="space-y-3" onSubmit={handleManualFormSubmit}>
                  <Label htmlFor="bst-scan-input">Scan boxes or pallets onto this transfer</Label>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Input
                      id="bst-scan-input"
                      autoFocus
                      value={manualBarcode}
                      onChange={(e) => setManualBarcode(e.target.value)}
                      placeholder="Scan or type a box / pallet barcode"
                      className={cn('font-mono', flashing && 'ring-2 ring-emerald-400 ring-offset-1')}
                    />
                    <Button type="submit" disabled={!manualBarcode.trim()}>
                      Add
                    </Button>
                  </div>
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    {pendingCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-amber-600">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Syncing {pendingCount}…
                      </span>
                    ) : null}
                    <span>Boxes are checked against this transfer&apos;s items and source warehouse.</span>
                  </p>
                  {scanner.error && <p className="text-xs text-red-600">{scanner.error}</p>}
                </form>
              </div>
            </CardContent>
          </Card>

          {/* Failed scans */}
          {failedScans.length > 0 && (
            <div className="overflow-hidden rounded-md border border-red-200">
              <div className="flex items-center gap-2 border-b border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                <AlertCircle className="h-4 w-4" />
                Failed scans ({failedScans.length})
              </div>
              <div className="divide-y">
                {failedScans.map((f) => (
                  <div key={f.barcode} className="flex items-center justify-between gap-2 p-3 text-sm">
                    <span className="min-w-0">
                      <span className="font-medium">{f.barcode}</span>{' '}
                      <span className="text-muted-foreground">— {f.reason}</span>
                    </span>
                    <span className="flex shrink-0 gap-1">
                      <Button size="sm" variant="outline" className="h-7" onClick={() => retryFailed(f.barcode)}>
                        Retry
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7" onClick={() => dismissFailed(f.barcode)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Scanned boxes */}
      <Card>
        <CardContent className="pt-6">
          <p className="font-medium mb-3">Scanned boxes ({scans.length})</p>
          {scans.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No boxes scanned yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 px-3">Box</th>
                    <th className="py-2 px-3">Item</th>
                    <th className="py-2 px-3">Batch</th>
                    <th className="py-2 px-3">Pallet</th>
                    {editable && <th className="py-2 px-3" />}
                  </tr>
                </thead>
                <tbody>
                  {scans.map((s) => (
                    <tr key={s.id} className="border-b">
                      <td className="py-2 px-3 font-medium">{s.box_barcode}</td>
                      <td className="py-2 px-3">{s.item_code}</td>
                      <td className="py-2 px-3">{s.batch_number}</td>
                      <td className="py-2 px-3">{s.pallet_code || '—'}</td>
                      {editable && (
                        <td className="py-2 px-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7"
                            onClick={() => handleRemove(s.id)}
                            disabled={removeMut.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {editable && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate(`/warehouse/bst/${transferId}`)}>
            Save &amp; exit
          </Button>
          <Button onClick={goToReview} disabled={scans.length === 0}>
            <ClipboardCheck className="h-4 w-4 mr-1" />
            Review &amp; approve
          </Button>
        </div>
      )}
    </div>
  );
}
