/**
 * Enter or change a booked truck's freight from its card on Vehicle Linking,
 * without relinking its bills — for a freight the approver refused, a bill
 * added since, or a truck linked before freight was asked for.
 */
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { type TruckFreightBill, useRecordTruckFreight } from '../../api/freightApproval.api';
import {
  EMPTY_TRUCK_FREIGHT,
  toTruckFreightInput,
  type TruckFreightDraft,
  truckFreightProblem,
} from './truckFreight';
import { TruckFreightFields } from './TruckFreightFields';
import { useTruckFreight } from './useTruckFreight';

export interface TruckFreightTarget {
  vehicleId: number;
  vehicleNumber: string;
  /** The bills on the truck's card — the freight is for exactly these. */
  bills: TruckFreightBill[];
  /** The booked bills' invoice weight, for a per-kg benchmark. */
  loadKg: number | null;
}

export function TruckFreightDialog({
  target,
  onClose,
}: {
  target: TruckFreightTarget | null;
  onClose: () => void;
}) {
  const record = useRecordTruckFreight();
  const [draft, setDraft] = useState<TruckFreightDraft>(EMPTY_TRUCK_FREIGHT);
  const [problem, setProblem] = useState('');
  const freight = useTruckFreight(target?.vehicleId ?? null, draft, target?.loadKg ?? null);

  const update = useCallback((next: TruckFreightDraft) => {
    setDraft(next);
    setProblem('');
  }, []);

  async function save() {
    if (!target) return;
    const why = truckFreightProblem(draft, freight.quote);
    if (why) {
      setProblem(why);
      return;
    }
    try {
      const { approval } = await record.mutateAsync(
        toTruckFreightInput(target.vehicleId, draft, freight.quote, target.bills, false),
      );
      if (approval.status === 'PENDING') {
        toast.warning(
          `${target.vehicleNumber}'s freight is over the benchmark. It waits in Admin > Freight Approvals before the truck can gate in.`,
        );
      } else {
        toast.success(`${target.vehicleNumber}'s freight saved`);
      }
      onClose();
    } catch (error) {
      setProblem(getErrorMessage(error, 'Could not save the freight.'));
    }
  }

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && !record.isPending && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Freight — {target?.vehicleNumber}</DialogTitle>
          <DialogDescription>
            For the {target?.bills.length ?? 0} bill{target?.bills.length === 1 ? '' : 's'} on this
            truck&apos;s card, split over them by litres.
          </DialogDescription>
        </DialogHeader>
        {target && (
          <TruckFreightFields
            idPrefix="truck-freight"
            draft={draft}
            onChange={update}
            freight={freight}
            loadKg={target.loadKg}
            error={problem}
          />
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={record.isPending}>
            Cancel
          </Button>
          <Button onClick={save} disabled={record.isPending}>
            {record.isPending ? 'Saving…' : 'Save freight'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
