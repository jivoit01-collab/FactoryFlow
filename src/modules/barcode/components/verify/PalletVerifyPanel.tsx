import { AlertTriangle, CheckCircle2, Printer, RotateCcw, Send, Wand2 } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'sonner';

import { Badge, Button, Card, CardContent } from '@/shared/components/ui';

import {
  useApplyPalletReconcile,
  usePalletDetail,
  usePrintBoxLabel,
  useReconcilePallet,
} from '../../api';
import { usePrinterProfile } from '../../hooks/usePrinterProfile';
import type {
  LabelData,
  PalletReconcileForeignReason,
  PalletReconcileResult,
} from '../../types';
import { toastBarcodeError } from '../../utils/errors';
import BarcodeScanner from '../BarcodeScanner';
import type { BoxLabelData } from '../BoxLabel';
import BoxLabel from '../BoxLabel';
import { DEFAULT_THERMAL_PRINTER_NAME, getLabelPrintPageStyle } from '../labelPrint';
import PrinterProfileControls from '../PrinterProfileControls';

interface PalletVerifyPanelProps {
  palletId: number;
  /** Fired after every reconcile so callers (e.g. dispatch) can react. */
  onReconciled?: (result: PalletReconcileResult) => void;
  /** Show the stock-moving apply controls (barcode team only). */
  allowApply?: boolean;
  /** When set, shows a "Submit to barcode team" action that hands the caller the
   * current scan state so it can raise a request. */
  onSubmit?: (payload: {
    scannedBarcodes: string[];
    unlabeledCount: number;
    reason: string;
  }) => void | Promise<void>;
  submitting?: boolean;
  submitLabel?: string;
}

const FOREIGN_REASON_LABEL: Record<PalletReconcileForeignReason, string> = {
  ON_OTHER_PALLET: 'On another pallet',
  UNPALLETIZED: 'Not on any pallet',
  DISPATCHED: 'Already dispatched',
  VOID: 'Voided',
  PALLET_LABEL: 'Pallet label',
  NOT_FOUND: 'Unknown barcode',
};

const FOREIGN_REASON_COLOR: Record<PalletReconcileForeignReason, string> = {
  ON_OTHER_PALLET: 'bg-purple-100 text-purple-800',
  UNPALLETIZED: 'bg-amber-100 text-amber-800',
  DISPATCHED: 'bg-blue-100 text-blue-800',
  VOID: 'bg-red-100 text-red-800',
  PALLET_LABEL: 'bg-gray-100 text-gray-800',
  NOT_FOUND: 'bg-red-100 text-red-800',
};

const DEFAULT_REPRINT_REASON = 'Label fell off — recovered via pallet verify';

function Counter({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <p className={`text-2xl font-bold ${tone}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default function PalletVerifyPanel({
  palletId,
  onReconciled,
  allowApply = false,
  onSubmit,
  submitting = false,
  submitLabel = 'Submit to barcode team',
}: PalletVerifyPanelProps) {
  const { data: pallet, isLoading } = usePalletDetail(palletId);
  const { mutateAsync: reconcile, isPending: isReconciling } = useReconcilePallet();
  const { mutateAsync: applyReconcile, isPending: isApplying } = useApplyPalletReconcile();
  const printBoxMutation = usePrintBoxLabel();
  const { printerName, printMode, setPrinterName, setPrintMode } = usePrinterProfile();

  const [scanned, setScanned] = useState<string[]>([]);
  const [unlabeled, setUnlabeled] = useState(0);
  const [result, setResult] = useState<PalletReconcileResult | null>(null);
  const [reprintReason, setReprintReason] = useState(DEFAULT_REPRINT_REASON);
  const [labels, setLabels] = useState<LabelData[]>([]);
  const [pullForeign, setPullForeign] = useState(true);
  const [dropMissing, setDropMissing] = useState(false);
  const [applyReason, setApplyReason] = useState('');
  const [submitReason, setSubmitReason] = useState('');

  // Refs keep the scan handler stable and immune to stale closures from the
  // camera callback, while the latest list/count still drives each reconcile.
  const scannedRef = useRef<string[]>([]);
  const unlabeledRef = useRef(0);
  const reqIdRef = useRef(0);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Recovered Box Labels 100x40mm',
    ignoreGlobalStyles: true,
    pageStyle: getLabelPrintPageStyle(printMode),
  });

  const runReconcile = useCallback(
    async (barcodes: string[], unlabeledCount: number) => {
      const reqId = ++reqIdRef.current;
      try {
        const res = await reconcile({
          palletId,
          data: { scanned_barcodes: barcodes, unlabeled_count: unlabeledCount },
        });
        if (reqId !== reqIdRef.current) return; // a newer scan superseded this one
        setResult(res);
        onReconciled?.(res);
      } catch (err) {
        if (reqId === reqIdRef.current) toastBarcodeError(err, 'Unable to reconcile pallet.');
      }
    },
    [palletId, reconcile, onReconciled],
  );

  const handleScan = useCallback(
    (barcode: string) => {
      const key = barcode.trim();
      if (!key) return;
      if (scannedRef.current.some((b) => b.toLowerCase() === key.toLowerCase())) {
        toast.info(`Already scanned ${key}`);
        return;
      }
      const next = [...scannedRef.current, key];
      scannedRef.current = next;
      setScanned(next);
      void runReconcile(next, unlabeledRef.current);
    },
    [runReconcile],
  );

  const handleUnlabeledChange = (raw: string) => {
    const value = Math.max(0, Number.parseInt(raw, 10) || 0);
    unlabeledRef.current = value;
    setUnlabeled(value);
    void runReconcile(scannedRef.current, value);
  };

  const handleReset = () => {
    scannedRef.current = [];
    unlabeledRef.current = 0;
    reqIdRef.current += 1;
    setScanned([]);
    setUnlabeled(0);
    setResult(null);
    setLabels([]);
  };

  const handleReprintMissing = async () => {
    const boxes = result?.recover.boxes ?? [];
    if (!boxes.length) return;
    if (!reprintReason.trim()) {
      toast.error('Please enter a reprint reason.');
      return;
    }
    try {
      const printed: LabelData[] = [];
      for (const box of boxes) {
        const label = await printBoxMutation.mutateAsync({
          boxId: box.id,
          data: {
            print_type: 'REPRINT',
            reprint_reason: reprintReason.trim(),
            printer_name: printerName.trim() || DEFAULT_THERMAL_PRINTER_NAME,
          },
        });
        printed.push(label);
      }
      setLabels(printed);
      toast.success(`Prepared ${printed.length} label(s) — printing...`);
      setTimeout(() => handlePrint(), 300);
    } catch (err) {
      toastBarcodeError(err, 'Unable to reprint the recovered labels.');
    }
  };

  const handleApply = async (pullCount: number, missingCount: number) => {
    if (!pullForeign && !dropMissing) return;
    const parts: string[] = [];
    if (pullForeign && pullCount) parts.push(`pull ${pullCount} box(es) onto this pallet`);
    if (dropMissing && missingCount) parts.push(`remove ${missingCount} missing box(es)`);
    if (!parts.length) {
      toast.info('Nothing to apply for the selected actions.');
      return;
    }
    if (!window.confirm(`Apply reconciliation: ${parts.join(' and ')}? This moves stock.`)) {
      return;
    }
    try {
      const res = await applyReconcile({
        palletId,
        data: {
          scanned_barcodes: scannedRef.current,
          unlabeled_count: unlabeledRef.current,
          pull_foreign: pullForeign,
          drop_missing: dropMissing,
          reason: applyReason.trim(),
        },
      });
      setResult(res);
      onReconciled?.(res);
      const a = res.applied;
      const summary = a
        ? [
            a.pulled.length ? `${a.pulled.length} pulled` : '',
            a.dropped.length ? `${a.dropped.length} removed` : '',
            a.skipped.length ? `${a.skipped.length} skipped` : '',
          ]
            .filter(Boolean)
            .join(', ')
        : '';
      toast.success(summary ? `Reconciled — ${summary}.` : 'Reconciliation applied.');
      setDropMissing(false);
    } catch (err) {
      toastBarcodeError(err, 'Unable to apply reconciliation.');
    }
  };

  const handleSubmit = async () => {
    await onSubmit?.({
      scannedBarcodes: scannedRef.current,
      unlabeledCount: unlabeledRef.current,
      reason: submitReason.trim(),
    });
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading pallet...</div>;
  }
  if (!pallet) {
    return <div className="p-8 text-center text-muted-foreground">Pallet not found</div>;
  }

  const expectedCount = result?.expected_count ?? pallet.box_count ?? 0;
  const matched = result?.matched ?? [];
  const missing = result?.missing ?? [];
  const foreign = result?.foreign ?? [];
  const hasScanned = scanned.length > 0 || unlabeled > 0;
  const missingCount = result ? missing.length : expectedCount;
  const recover = result?.recover;
  // Foreign boxes that are safe to auto-pull: loose or on another pallet, same item.
  const pullable = foreign.filter(
    (f) =>
      (f.reason === 'ON_OTHER_PALLET' || f.reason === 'UNPALLETIZED') && f.item_matches_pallet,
  );

  return (
    <div className="space-y-4">
      {/* Pallet summary */}
      <Card>
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Pallet:</span>{' '}
            <span className="font-mono font-medium">{pallet.pallet_id}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Item:</span>{' '}
            {pallet.item_code || '-'}
          </div>
          <div>
            <span className="text-muted-foreground">Batch:</span> {pallet.batch_number || '-'}
          </div>
          <div>
            <span className="text-muted-foreground">Warehouse:</span>{' '}
            {pallet.current_warehouse || '-'}
          </div>
        </CardContent>
      </Card>

      {/* Scanner */}
      <BarcodeScanner
        onScan={handleScan}
        placeholder="Scan each box physically on this pallet..."
      />

      {/* Live counters */}
      <div className="grid grid-cols-4 gap-3">
        <Counter label="Expected" value={expectedCount} tone="text-foreground" />
        <Counter label="Matched" value={matched.length} tone="text-green-600" />
        <Counter label="Missing" value={missingCount} tone="text-amber-600" />
        <Counter label="Foreign" value={foreign.length} tone="text-purple-600" />
      </div>

      {/* Unlabeled count + reset */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Unlabeled boxes physically present
            </label>
            <input
              type="number"
              min={0}
              className="w-40 border rounded px-3 py-2 text-sm mt-1"
              value={unlabeled}
              onChange={(e) => handleUnlabeledChange(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Count boxes on the pallet whose label fell off / won&apos;t scan.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleReset} disabled={!hasScanned}>
            <RotateCcw className="h-4 w-4 mr-1" /> Reset
          </Button>
          {isReconciling && (
            <span className="text-xs text-muted-foreground">Reconciling...</span>
          )}
        </CardContent>
      </Card>

      {/* Fully reconciled banner */}
      {result?.is_fully_reconciled && hasScanned && (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="p-4 flex items-center gap-2 text-green-800">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">
              Pallet matches the system — every box accounted for.
            </span>
          </CardContent>
        </Card>
      )}

      {/* Recover missing labels */}
      {recover?.eligible && (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">
                {recover.unlabeled_count} unlabeled box(es) match {missing.length} missing record(s).
                Safe to reprint their labels.
              </span>
            </div>
            <PrinterProfileControls
              printerName={printerName}
              printMode={printMode}
              onPrinterNameChange={setPrinterName}
              onPrintModeChange={setPrintMode}
            />
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[240px]">
                <label className="text-xs font-medium text-muted-foreground">Reprint Reason *</label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm mt-1"
                  value={reprintReason}
                  onChange={(e) => setReprintReason(e.target.value)}
                />
              </div>
              <Button
                onClick={() => void handleReprintMissing()}
                disabled={printBoxMutation.isPending || !reprintReason.trim()}
              >
                <Printer className="h-4 w-4 mr-1" />
                {printBoxMutation.isPending
                  ? 'Printing...'
                  : `Reprint ${missing.length} label(s)`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Not-eligible hint: some missing boxes are unaccounted for */}
      {result && missing.length > 0 && unlabeled > 0 && !recover?.eligible && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4 flex items-start gap-2 text-amber-800">
            <AlertTriangle className="h-5 w-5 mt-0.5" />
            <span className="text-sm">
              {unlabeled} unlabeled box(es) reported, but {missing.length} record(s) are missing.
              Reprint stays locked until the two match — some missing boxes may be physically
              elsewhere, not just unlabeled.
            </span>
          </CardContent>
        </Card>
      )}

      {/* Apply — heal drift by moving stock (gated behind MANAGE_PALLET) */}
      {allowApply && result && (pullable.length > 0 || missing.length > 0) && (
        <Card className="border-blue-300 bg-blue-50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-blue-800">
              <Wand2 className="h-5 w-5" />
              <span className="text-sm font-medium">Reconcile — move stock to match the scan</span>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={pullForeign}
                disabled={pullable.length === 0}
                onChange={(e) => setPullForeign(e.target.checked)}
              />
              Pull {pullable.length} matching box(es) onto this pallet
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={dropMissing}
                disabled={missing.length === 0}
                className="mt-0.5"
                onChange={(e) => setDropMissing(e.target.checked)}
              />
              <span>
                Remove {missing.length} missing box(es) from this pallet
                <span className="block text-xs text-muted-foreground">
                  Use only when those boxes are physically gone — not when a label just fell off.
                </span>
              </span>
            </label>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[240px]">
                <label className="text-xs font-medium text-muted-foreground">Reason (optional)</label>
                <input
                  className="w-full border rounded px-3 py-2 text-sm mt-1"
                  placeholder="e.g. cycle count correction"
                  value={applyReason}
                  onChange={(e) => setApplyReason(e.target.value)}
                />
              </div>
              <Button
                onClick={() => void handleApply(pullable.length, missing.length)}
                disabled={isApplying || (!pullForeign && !dropMissing)}
              >
                <Wand2 className="h-4 w-4 mr-1" />
                {isApplying ? 'Applying...' : 'Apply reconciliation'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit to barcode team (requester flow) */}
      {onSubmit && (
        <Card className="border-slate-300">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-slate-700">
              <Send className="h-5 w-5" />
              <span className="text-sm font-medium">Submit to barcode team</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Raise a request for the barcode team to reconcile this pallet. Your current scan
              findings are attached as context.
            </p>
            <textarea
              className="w-full border rounded px-3 py-2 text-sm"
              rows={2}
              placeholder="Describe the problem (e.g. one box label fell off)..."
              value={submitReason}
              onChange={(e) => setSubmitReason(e.target.value)}
            />
            <Button onClick={() => void handleSubmit()} disabled={submitting}>
              <Send className="h-4 w-4 mr-1" />
              {submitting ? 'Submitting...' : submitLabel}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Missing list */}
      {result && missing.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 text-amber-700">Missing — expected but not scanned</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2 font-medium">Barcode</th>
                    <th className="text-left p-2 font-medium">Item</th>
                    <th className="text-left p-2 font-medium">Batch</th>
                    <th className="text-right p-2 font-medium">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {missing.map((box) => (
                    <tr key={box.id} className="border-b">
                      <td className="p-2 font-mono text-xs">{box.box_barcode}</td>
                      <td className="p-2">{box.item_code}</td>
                      <td className="p-2 text-xs">{box.batch_number}</td>
                      <td className="p-2 text-right">
                        {box.qty} {box.uom}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Foreign list */}
      {foreign.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 text-purple-700">
              Foreign — scanned but not on this pallet
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2 font-medium">Barcode</th>
                    <th className="text-left p-2 font-medium">Reason</th>
                    <th className="text-left p-2 font-medium">Current Pallet</th>
                    <th className="text-left p-2 font-medium">Item</th>
                  </tr>
                </thead>
                <tbody>
                  {foreign.map((f) => (
                    <tr key={f.barcode} className="border-b">
                      <td className="p-2 font-mono text-xs">{f.barcode}</td>
                      <td className="p-2">
                        <Badge className={FOREIGN_REASON_COLOR[f.reason]}>
                          {FOREIGN_REASON_LABEL[f.reason]}
                        </Badge>
                      </td>
                      <td className="p-2 text-xs text-muted-foreground">
                        {f.current_pallet_code || '-'}
                      </td>
                      <td className="p-2 text-xs">{f.box?.item_code || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Off-screen print area for recovered labels */}
      <div aria-hidden style={{ position: 'fixed', left: '-10000px', top: 0 }}>
        <div ref={printRef} className="barcode-print-sheet">
          {labels.map((label) => (
            <BoxLabel key={label.id} data={label as BoxLabelData} />
          ))}
        </div>
      </div>
    </div>
  );
}
