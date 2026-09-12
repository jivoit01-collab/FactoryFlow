import { AlertTriangle, CheckCircle2, PackageCheck, XCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

// Imported by path, not through the barcode module's barrel: it is not exported
// there, and widening a shared barrel for one consumer is how unrelated exports
// end up in someone else's commit.
import BarcodeScanner from '@/modules/barcode/components/BarcodeScanner';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@/shared/components/ui';

import type { ReceiveScanResult } from '../../api';
import { useMyWarehouses, useReceiveScan, useReceiveSession } from '../../api';

/** Where the receiver's warehouse choice is remembered between shifts. */
const WAREHOUSE_STORAGE_KEY = 'warehouse.receive.warehouse';

interface ScanRow {
  key: string;
  barcode: string;
  accepted: boolean;
  detail: string;
  count: number;
}

function ScanRowItem({ row }: { row: ScanRow }) {
  return (
    <div
      className={`flex items-start gap-3 rounded border p-3 ${
        row.accepted ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
      }`}
    >
      {row.accepted ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
      ) : (
        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-mono text-xs font-medium">{row.barcode}</p>
        <p className="text-sm text-muted-foreground">{row.detail}</p>
      </div>
      {row.accepted && row.count > 1 ? (
        <Badge className="bg-green-100 text-green-800">{row.count} boxes</Badge>
      ) : null}
    </div>
  );
}

/**
 * The godown gate.
 *
 * Labels are printed on the production floor and pasted as the line runs, so
 * the app used to believe in stock for every label printed — including the ones
 * that were never pasted onto a box. A printed label is now inactive until it is
 * received here, into the warehouse it was printed for.
 *
 * The pallet flow is the part worth understanding: a pallet's box records were
 * created at print time, phantom labels and all, so scanning the pallet QR asks
 * for the receiver's physical count first. Equal counts activate the whole
 * pallet in one action; a short count activates nothing and drops that pallet
 * into box-by-box scanning, which is the only way to tell a real box from a
 * label that never made it onto one.
 */
export default function BarcodeReceivePage() {
  const { data: scope, isLoading: scopeLoading } = useMyWarehouses();
  const [chosenWarehouse, setWarehouse] = useState<string>(
    () => localStorage.getItem(WAREHOUSE_STORAGE_KEY) ?? '',
  );
  const [rows, setRows] = useState<ScanRow[]>([]);
  const [countPrompt, setCountPrompt] = useState<ReceiveScanResult | null>(null);
  const [countInput, setCountInput] = useState('');
  const scanSeq = useRef(0);

  const warehouseOptions = useMemo(() => scope?.warehouse_codes ?? [], [scope]);

  // A receiver assigned to one godown should not have to choose it at all, so
  // the single option is the answer until they pick something else. Derived
  // rather than written into state, which would only re-render for no gain.
  const warehouse =
    chosenWarehouse || (warehouseOptions.length === 1 ? warehouseOptions[0] : '');

  const { data: session } = useReceiveSession(warehouse);
  const scanMutation = useReceiveScan();

  useEffect(() => {
    if (warehouse) localStorage.setItem(WAREHOUSE_STORAGE_KEY, warehouse);
  }, [warehouse]);

  const pushRow = useCallback((barcode: string, result: ReceiveScanResult) => {
    scanSeq.current += 1;
    setRows((current) =>
      [
        {
          key: `${scanSeq.current}`,
          barcode,
          accepted: result.status === 'ACCEPTED',
          detail: result.detail,
          count: result.activated_count,
        },
        ...current,
      ].slice(0, 100),
    );
  }, []);

  const runScan = useCallback(
    async (barcode: string, confirmedBoxCount?: number) => {
      if (!warehouse) {
        toast.error('Choose the warehouse you are receiving into first.');
        return;
      }
      try {
        const result = await scanMutation.mutateAsync({
          warehouse,
          barcode,
          confirmed_box_count: confirmedBoxCount ?? null,
        });

        if (result.status === 'NEEDS_COUNT') {
          setCountPrompt(result);
          setCountInput('');
          return;
        }
        pushRow(barcode, result);
        if (result.status === 'ACCEPTED') {
          toast.success(result.detail);
        } else if (result.status === 'NEEDS_BOX_SCAN') {
          // Not a toast that disappears: the receiver has to change what they
          // are doing, so it stays on screen in the list as well.
          toast.warning(result.detail, { duration: 10000 });
        } else {
          toast.error(result.detail);
        }
      } catch {
        toast.error('Could not reach the server. The scan was not recorded.');
      }
    },
    [pushRow, scanMutation, warehouse],
  );

  const confirmCount = async () => {
    const prompt = countPrompt;
    if (!prompt) return;
    const parsed = Number.parseInt(countInput, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast.error('Enter the number of boxes physically on this pallet.');
      return;
    }
    setCountPrompt(null);
    await runScan(prompt.barcode, parsed);
  };

  const blocked = !scopeLoading && !scope?.unrestricted && warehouseOptions.length === 0;

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Receive Barcodes"
        description="Scan pallets and boxes arriving at the godown to activate their labels"
      />

      {blocked ? (
        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-medium">You do not manage any warehouse yet.</p>
              <p className="text-sm text-muted-foreground">
                An administrator assigns this on Admin → Warehouse Managers. Until then
                you cannot receive stock into a godown.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="grid gap-4 p-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <Label className="mb-1 block text-xs text-muted-foreground">
              Receiving into
            </Label>
            <select
              className="w-full rounded border px-3 py-2 text-sm"
              value={warehouse}
              onChange={(e) => setWarehouse(e.target.value)}
            >
              <option value="">Select a warehouse…</option>
              {warehouseOptions.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              Only warehouses you manage. A label printed for another warehouse is
              refused here.
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">
              {session?.boxes_activated ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Boxes activated today</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">
              {session?.scans_rejected ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Scans refused today</p>
          </div>
        </CardContent>
      </Card>

      {warehouse ? (
        <BarcodeScanner
          onScan={(barcode) => void runScan(barcode)}
          placeholder="Scan a pallet or box label…"
        />
      ) : null}

      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="flex items-center gap-2">
            <PackageCheck className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">This session</p>
          </div>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing scanned yet. Every scan — accepted or refused — is recorded.
            </p>
          ) : (
            rows.map((row) => <ScanRowItem key={row.key} row={row} />)
          )}
        </CardContent>
      </Card>

      <Dialog open={countPrompt !== null} onOpenChange={(open) => !open && setCountPrompt(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>How many boxes are on this pallet?</DialogTitle>
            <DialogDescription>
              {countPrompt?.pallet?.pallet_id} carries {countPrompt?.pending_box_count}{' '}
              printed label(s). Count the boxes physically on the pallet — if the numbers
              differ, some label was never pasted onto a box and you will be asked to scan
              each box instead.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">Boxes counted</Label>
            <Input
              autoFocus
              inputMode="numeric"
              value={countInput}
              onChange={(e) => setCountInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void confirmCount();
              }}
              placeholder={String(countPrompt?.pending_box_count ?? '')}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCountPrompt(null)}>
              Cancel
            </Button>
            <Button onClick={() => void confirmCount()} disabled={scanMutation.isPending}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
