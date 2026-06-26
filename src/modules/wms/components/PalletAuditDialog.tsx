/**
 * Mandatory outbound pallet audit (Step 8).
 *
 * The verification screen shown before any pallet leaves: it prominently
 * displays the item name and the boxes present, plus SKU, lot, expiry, current
 * location, and total units. The operator confirms a match or reports a
 * discrepancy (entering the corrected box count); a large discrepancy requires
 * supervisor approval. When `mandatory` is true the audit cannot be skipped.
 */
import { useEffect, useState } from 'react';
import { AlertTriangle, PackageCheck } from 'lucide-react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@/shared/components/ui';
import { Switch } from '@/shared/components/ui';

import type { Pallet, WarehouseLocation } from '../types';

export interface AuditResult {
  correctedBoxCount?: number;
  supervisorApproved?: boolean;
}

interface PalletAuditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pallet: Pallet | null;
  location: WarehouseLocation | null;
  totalUnits: number;
  mandatory: boolean;
  onConfirm: (result: AuditResult) => void | Promise<void>;
}

/** A discrepancy is "large" past 20% of the boxes (min 5). */
function isLargeDiscrepancy(original: number, corrected: number): boolean {
  return Math.abs(corrected - original) > Math.max(5, original * 0.2);
}

export function PalletAuditDialog({
  open,
  onOpenChange,
  pallet,
  location,
  totalUnits,
  mandatory,
  onConfirm,
}: PalletAuditDialogProps) {
  const [mode, setMode] = useState<'verify' | 'discrepancy'>('verify');
  const [corrected, setCorrected] = useState(0);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    if (open && pallet) {
      setMode('verify');
      setCorrected(pallet.boxCount);
      setApproved(false);
    }
  }, [open, pallet]);

  if (!pallet) return null;

  const large = isLargeDiscrepancy(pallet.boxCount, corrected);
  const blockedByApproval = mode === 'discrepancy' && large && !approved;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verify pallet before it leaves</DialogTitle>
          <DialogDescription>Physically check the pallet, then confirm.</DialogDescription>
        </DialogHeader>

        {/* Prominent: item name + boxes */}
        <div className="rounded-lg border bg-muted/30 p-4 text-center">
          <p className="text-xl font-semibold">{pallet.itemName || pallet.itemCode}</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{pallet.boxCount} boxes</p>
        </div>

        {/* Details */}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <Detail label="SKU" value={pallet.itemCode} />
          <Detail label="Pallet" value={pallet.licensePlate} />
          <Detail label="Lot / batch" value={pallet.lotNumber || '—'} />
          <Detail label="Expiry" value={pallet.expiryDate ? pallet.expiryDate.slice(0, 10) : '—'} />
          <Detail label="Location" value={location?.code ?? '—'} />
          <Detail label="Total units" value={String(totalUnits)} />
        </dl>

        {mode === 'discrepancy' ? (
          <div className="space-y-3 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
            <div className="space-y-1.5">
              <Label htmlFor="corrected-boxes">Actual box count</Label>
              <Input
                id="corrected-boxes"
                type="number"
                min={0}
                value={corrected}
                onChange={(event) => setCorrected(Math.max(0, Number(event.target.value) || 0))}
              />
            </div>
            {large ? (
              <label className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" /> Large discrepancy — supervisor approval
                </span>
                <Switch checked={approved} onChange={setApproved} />
              </label>
            ) : null}
          </div>
        ) : null}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {mode === 'verify' ? (
            <>
              {!mandatory ? (
                <Button variant="ghost" onClick={() => void onConfirm({})}>
                  Skip &amp; ship as-is
                </Button>
              ) : null}
              <Button variant="outline" onClick={() => setMode('discrepancy')}>
                Report discrepancy
              </Button>
              <Button onClick={() => void onConfirm({})}>
                <PackageCheck className="mr-2 h-4 w-4" /> Confirm match
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setMode('verify')}>
                Back
              </Button>
              <Button
                disabled={blockedByApproval}
                onClick={() => void onConfirm({ correctedBoxCount: corrected, supervisorApproved: approved })}
              >
                Confirm with correction
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
