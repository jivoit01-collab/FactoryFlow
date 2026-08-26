import { Loader2, Lock, Pencil, Truck } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { DriverSelect, VehicleSelect } from '@/modules/gate/components';
import { Button, Card, CardContent } from '@/shared/components/ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { getErrorMessage } from '@/shared/utils';

import { useUpdateBST } from '../../api';
import type { BSTTransferDetail } from '../../types';
import { formatBstDateTime } from './bstFormat';

/**
 * Vehicle + driver, correctable in place.
 *
 * The truck booked when the BST was created often isn't the one that turns up,
 * and the swap is usually noticed after the warehouse has already approved the
 * load. So the edit stays open from creation until the gate marks the vehicle
 * out — `can_edit_vehicle` comes from the backend, which enforces the same rule
 * on the update endpoint, so the button can't offer an edit that gets refused.
 */
export function BSTVehicleDriverCard({ transfer }: { transfer: BSTTransferDetail }) {
  const [open, setOpen] = useState(false);

  // An internal move never leaves the factory, so it has no vehicle to show.
  const onVehicle = transfer.requires_gate || !!transfer.vehicle_number || !!transfer.driver_name;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="mb-3 flex items-center justify-between gap-4">
          <p className="inline-flex items-center gap-2 font-medium">
            <Truck className="h-4 w-4 text-muted-foreground" /> Vehicle &amp; driver
          </p>
          {onVehicle && transfer.can_edit_vehicle && (
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
              <Pencil className="mr-1 h-3.5 w-3.5" /> Change
            </Button>
          )}
        </div>

        {onVehicle ? (
          <>
            <div className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              {(
                [
                  ['Vehicle', transfer.vehicle_number || '—'],
                  ['Driver', transfer.driver_name || '—'],
                ] as Array<[string, string]>
              ).map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 border-b py-1.5">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-right font-medium">{value}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {transfer.can_edit_vehicle ? (
                'The vehicle and driver can be corrected until the gate marks this transfer out.'
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  {transfer.gated_out_at
                    ? `Locked — the vehicle left the gate on ${formatBstDateTime(transfer.gated_out_at)}.`
                    : 'Locked — this transfer can no longer be changed.'}
                </span>
              )}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Internal move — the stock stays inside the factory, so there is no vehicle or driver.
          </p>
        )}
      </CardContent>

      {/* Mounted only while open so the form always starts from the saved values. */}
      {open && (
        <VehicleDriverDialog transfer={transfer} onClose={() => setOpen(false)} />
      )}
    </Card>
  );
}

function VehicleDriverDialog({
  transfer,
  onClose,
}: {
  transfer: BSTTransferDetail;
  onClose: () => void;
}) {
  const [vehicleId, setVehicleId] = useState<number | null>(transfer.vehicle);
  const [vehicleNumber, setVehicleNumber] = useState(transfer.vehicle_number ?? '');
  const [driverId, setDriverId] = useState<number | null>(transfer.driver);
  const [driverName, setDriverName] = useState(transfer.driver_name ?? '');
  const updateMut = useUpdateBST();

  const changed = vehicleId !== transfer.vehicle || driverId !== transfer.driver;
  const complete = vehicleId !== null && driverId !== null;

  const handleSave = async () => {
    if (!changed) {
      onClose();
      return;
    }
    try {
      await updateMut.mutateAsync({
        transferId: transfer.id,
        data: { vehicle: vehicleId!, driver: driverId! },
      });
      toast.success('Vehicle and driver updated');
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update the vehicle and driver'));
    }
  };

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change vehicle &amp; driver — {transfer.entry_no}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Use this when a different truck or driver turns up. The boxes already scanned onto
            this transfer are untouched.
          </p>
          <VehicleSelect
            label="Vehicle"
            required
            value={vehicleNumber}
            defaultDisplayText={vehicleNumber}
            onChange={(v) => {
              setVehicleId(v.vehicleId || null);
              setVehicleNumber(v.vehicleNumber);
            }}
          />
          <DriverSelect
            label="Driver"
            required
            value={driverName}
            defaultDisplayText={driverName}
            onChange={(d) => {
              setDriverId(d.driverId || null);
              setDriverName(d.driverName);
            }}
          />
          {!complete && (
            <p className="text-sm text-destructive">
              A transfer that leaves on a vehicle needs both a vehicle and a driver.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!complete || !changed || updateMut.isPending}
            >
              {updateMut.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
