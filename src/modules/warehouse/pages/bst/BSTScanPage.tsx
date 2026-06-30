import { Camera, CameraOff, Flashlight, Loader2, Send, Trash2, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useScanner } from '@/modules/barcode/hooks/useScanner';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Button,
  Card,
  CardContent,
  Input,
} from '@/shared/components/ui';
import { useBoxScanQueue } from '@/shared/hooks';
import { cn, getErrorMessage } from '@/shared/utils';

import { bstApi, useBSTTransfer, useDispatchBST, useRemoveBSTScan } from '../../api';
import { BSTStatusBadge } from './bstStatus';

export default function BSTScanPage() {
  const { transferId: idParam } = useParams<{ transferId: string }>();
  const transferId = Number(idParam);
  const navigate = useNavigate();

  const { data: transfer, isLoading, refetch } = useBSTTransfer(transferId);
  const removeMut = useRemoveBSTScan();
  const dispatchMut = useDispatchBST();

  const [manualBarcode, setManualBarcode] = useState('');

  const editable = transfer?.status === 'SCANNING' || transfer?.status === 'DRAFT';
  const scans = transfer?.box_scans ?? [];

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

  const handleDispatch = async () => {
    try {
      await dispatchMut.mutateAsync(transferId);
      toast.success('BST dispatched');
      navigate(`/warehouse/bst/${transferId}`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not dispatch'));
    }
  };

  if (isLoading || !transfer) {
    return <p className="text-muted-foreground py-12 text-center">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title={`Scan Boxes — ${transfer.entry_no}`}
        description={`${transfer.sap_from_warehouse || '—'} → ${transfer.sap_to_warehouse || '—'} · SAP #${transfer.sap_doc_num}`}
      >
        <BSTStatusBadge status={transfer.status} />
      </DashboardHeader>

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
          {/* Scan input */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex gap-2">
                <Input
                  autoFocus
                  placeholder="Scan or type a box / pallet barcode"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                  className={cn(flashing && 'ring-2 ring-emerald-400 ring-offset-1')}
                />
                <Button onClick={handleManualSubmit}>Add</Button>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => (scanner.isScanning ? scanner.stopScanning() : scanner.startScanning())}
                >
                  {scanner.isScanning ? (
                    <>
                      <CameraOff className="h-4 w-4 mr-1" /> Stop camera
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4 mr-1" /> Scan with camera
                    </>
                  )}
                </Button>
                {scanner.isScanning && scanner.torchSupported && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => scanner.toggleTorch()}
                    title="Toggle flashlight"
                  >
                    <Flashlight className={cn('h-4 w-4', scanner.torchOn && 'text-amber-500')} />
                  </Button>
                )}
                {pendingCount > 0 && (
                  <span className="text-sm text-muted-foreground inline-flex items-center">
                    <Loader2 className="h-3 w-3 animate-spin mr-1" /> Syncing {pendingCount}…
                  </span>
                )}
              </div>

              {/* Camera viewport */}
              <div
                id={scanner.elementId}
                className={cn('w-full max-w-sm mx-auto rounded-md overflow-hidden', !scanner.isScanning && 'hidden')}
              />
              {scanner.error && <p className="text-sm text-red-600">{scanner.error}</p>}
            </CardContent>
          </Card>

          {/* Failed scans */}
          {failedScans.length > 0 && (
            <Card className="border-red-200">
              <CardContent className="pt-4">
                <p className="text-sm font-medium text-red-700 mb-2">
                  Failed scans ({failedScans.length})
                </p>
                <div className="space-y-1">
                  {failedScans.map((f) => (
                    <div key={f.barcode} className="flex items-center justify-between text-sm">
                      <span>
                        <span className="font-medium">{f.barcode}</span>{' '}
                        <span className="text-muted-foreground">— {f.reason}</span>
                      </span>
                      <span className="flex gap-1">
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
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Scanned list */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <p className="font-medium">Scanned boxes ({scans.length})</p>
          </div>
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
          <Button
            onClick={handleDispatch}
            disabled={scans.length === 0 || dispatchMut.isPending}
          >
            {dispatchMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Send className="h-4 w-4 mr-1" />
            )}
            Dispatch
          </Button>
        </div>
      )}
    </div>
  );
}
