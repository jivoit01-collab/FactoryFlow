import { Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { BARCODE_PERMISSIONS } from '@/config/permissions/barcode.permissions';
import { usePermission } from '@/core/auth';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Textarea,
} from '@/shared/components/ui';

import {
  usePendingActivationBoxes,
  usePendingActivationReport,
  useVoidPendingActivation,
} from '../api';
import type { PendingActivationGroup } from '../types';
import { toastBarcodeError } from '../utils/errors';

function groupKey(group: PendingActivationGroup) {
  return [
    group.pallet_id ?? 'none',
    group.item_code,
    group.batch_number,
    group.warehouse,
    group.production_line,
  ].join('|');
}

/**
 * Labels printed but never received.
 *
 * Every row here is a print run the godown never saw: either the boxes are still
 * on their way, or the labels were never pasted onto a box at all. There is no
 * job that clears them — the barcode team reads the aging and voids what is
 * genuinely gone, which is deliberate: nothing destroys a label automatically.
 */
export default function PendingActivationPage() {
  const { hasPermission } = usePermission();
  const canVoid = hasPermission(BARCODE_PERMISSIONS.APPROVE_ACTIVATION);

  const [warehouse, setWarehouse] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<PendingActivationGroup | null>(null);
  const [voidReason, setVoidReason] = useState('');

  const filters = useMemo(
    () => ({ warehouse: warehouse || undefined, search: search || undefined }),
    [warehouse, search],
  );
  const { data: report, isLoading } = usePendingActivationReport(filters);
  const { data: selectedBoxes = [] } = usePendingActivationBoxes(
    selected
      ? {
          warehouse: selected.warehouse,
          pallet_id: selected.pallet_id,
          item_code: selected.item_code,
          batch_number: selected.batch_number,
        }
      : undefined,
    { enabled: selected !== null },
  );
  const voidPending = useVoidPendingActivation();

  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());

  const openVoidDialog = (group: PendingActivationGroup) => {
    setSelected(group);
    setCheckedIds(new Set());
    setVoidReason('');
  };

  const toggle = (boxId: number) => {
    setCheckedIds((current) => {
      const next = new Set(current);
      if (next.has(boxId)) next.delete(boxId);
      else next.add(boxId);
      return next;
    });
  };

  const runVoid = async () => {
    if (checkedIds.size === 0) {
      toast.error('Select the labels to void.');
      return;
    }
    if (!voidReason.trim()) {
      toast.error('Say why these labels are being voided.');
      return;
    }
    try {
      const result = await voidPending.mutateAsync({
        box_ids: [...checkedIds],
        reason: voidReason.trim(),
      });
      toast.success(
        `${result.voided_count} label(s) voided.` +
          // A label the gate took between loading this page and pressing the
          // button is skipped rather than voided; saying so beats a silent count.
          (result.skipped_count
            ? ` ${result.skipped_count} were activated in the meantime and left alone.`
            : ''),
      );
      setSelected(null);
    } catch (error) {
      toastBarcodeError(error, 'Could not void these labels.');
    }
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Pending Activation"
        description="Labels that were printed but never received at a godown"
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {(report?.buckets ?? []).map((bucket) => (
          <Card key={bucket.label}>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{bucket.box_count}</p>
              <p className="text-xs text-muted-foreground">{bucket.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-3 p-4">
          <Input
            className="max-w-xs"
            placeholder="Warehouse (e.g. BH-PF)"
            value={warehouse}
            onChange={(e) => setWarehouse(e.target.value.toUpperCase())}
          />
          <Input
            className="max-w-sm"
            placeholder="Search item, batch, pallet or barcode"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="ml-auto self-center text-sm text-muted-foreground">
            {report?.total_boxes ?? 0} label(s) waiting
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (report?.groups.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing waiting — every printed label has been received.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 text-left font-medium">Printed</th>
                    <th className="p-2 text-right font-medium">Age</th>
                    <th className="p-2 text-left font-medium">Warehouse</th>
                    <th className="p-2 text-left font-medium">Pallet</th>
                    <th className="p-2 text-left font-medium">Item</th>
                    <th className="p-2 text-left font-medium">Batch</th>
                    <th className="p-2 text-left font-medium">Line</th>
                    <th className="p-2 text-right font-medium">Labels</th>
                    <th className="p-2" />
                  </tr>
                </thead>
                <tbody>
                  {report?.groups.map((group) => (
                    <tr key={groupKey(group)} className="border-b hover:bg-muted/30">
                      <td className="p-2">
                        {new Date(group.printed_at).toLocaleDateString()}
                      </td>
                      <td className="p-2 text-right">
                        <span
                          className={
                            group.age_days > 7 ? 'font-medium text-red-600' : undefined
                          }
                        >
                          {group.age_days}d
                        </span>
                      </td>
                      <td className="p-2 font-mono text-xs">{group.warehouse}</td>
                      <td className="p-2 font-mono text-xs">
                        {group.pallet_id ? (
                          // Click through to the pallet: that is where these labels
                          // can be chased up -- received, or sent for approval.
                          <Link
                            className="text-primary hover:underline"
                            to={`/barcode/pallets/${group.pallet_id}`}
                          >
                            {group.pallet_code}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="p-2">{group.item_name || group.item_code}</td>
                      <td className="p-2">{group.batch_number}</td>
                      <td className="p-2">{group.production_line || '—'}</td>
                      <td className="p-2 text-right font-medium">{group.box_count}</td>
                      <td className="p-2 text-right">
                        {canVoid ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openVoidDialog(group)}
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                            Void…
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Void labels that never arrived</DialogTitle>
            <DialogDescription>
              Voiding is permanent and only ever touches labels still waiting for
              activation. If these boxes turn up later, their labels will not scan.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-72 space-y-1 overflow-y-auto rounded border p-2">
            {selectedBoxes.map((box) => (
              <label
                key={box.id}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-muted/40"
              >
                <Checkbox
                  checked={checkedIds.has(box.id)}
                  onCheckedChange={() => toggle(box.id)}
                />
                <span className="font-mono text-xs">{box.box_barcode}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {box.batch_number}
                </span>
              </label>
            ))}
            {selectedBoxes.length === 0 ? (
              <p className="p-2 text-sm text-muted-foreground">Loading labels…</p>
            ) : null}
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{checkedIds.size} selected</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setCheckedIds(
                  checkedIds.size === selectedBoxes.length
                    ? new Set()
                    : new Set(selectedBoxes.map((box) => box.id)),
                )
              }
            >
              {checkedIds.size === selectedBoxes.length ? 'Clear all' : 'Select all'}
            </Button>
          </div>

          <Textarea
            placeholder="Why are these being voided? (e.g. over-printed, never pasted)"
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void runVoid()}
              disabled={voidPending.isPending}
            >
              Void {checkedIds.size} label(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
