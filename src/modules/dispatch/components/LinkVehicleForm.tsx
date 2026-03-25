import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
} from '@/shared/components/ui';

import { useAvailableVehicles } from '@/modules/gate/api/outbound';
import type { AvailableVehicle } from '@/modules/gate/api/outbound';

import { useLinkVehicle } from '../api';

interface LinkVehicleFormProps {
  shipmentId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LinkVehicleForm({ shipmentId, open, onOpenChange }: LinkVehicleFormProps) {
  const [selectedEntryId, setSelectedEntryId] = useState('');

  const linkVehicle = useLinkVehicle(shipmentId);
  const { data: availableVehicles = [], isLoading: loadingVehicles } = useAvailableVehicles(open);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntryId) {
      toast.error('Please select a vehicle');
      return;
    }
    linkVehicle.mutate(
      { vehicle_entry_id: Number(selectedEntryId) },
      {
        onSuccess: () => {
          toast.success('Vehicle linked successfully');
          onOpenChange(false);
          setSelectedEntryId('');
        },
        onError: (err) => toast.error(err.message || 'Failed to link vehicle'),
      },
    );
  };

  const formatVehicle = (v: AvailableVehicle) => {
    const parts = [v.vehicle_number, v.driver_name, `(${v.entry_no})`];
    if (v.customer_name) parts.push(`— ${v.customer_name}`);
    return parts.join(' ');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link Vehicle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Select Available Vehicle</Label>
            {loadingVehicles ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading available vehicles...
              </div>
            ) : availableVehicles.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No vehicles available. Create an outbound gate entry and release it for loading first.
              </p>
            ) : (
              <select
                value={selectedEntryId}
                onChange={(e) => setSelectedEntryId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select a vehicle...</option>
                {availableVehicles.map((v) => (
                  <option key={v.vehicle_entry_id} value={v.vehicle_entry_id}>
                    {formatVehicle(v)}
                  </option>
                ))}
              </select>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={linkVehicle.isPending || !selectedEntryId}
            >
              {linkVehicle.isPending ? 'Linking...' : 'Link Vehicle'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
