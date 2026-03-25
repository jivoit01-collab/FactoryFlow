import { useState } from 'react';
import { toast } from 'sonner';

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@/shared/components/ui';

import { useDispatchShipment } from '../api';

interface DispatchFormProps {
  shipmentId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DispatchForm({ shipmentId, open, onOpenChange }: DispatchFormProps) {
  const [sealNumber, setSealNumber] = useState('');
  const [branchId, setBranchId] = useState('1');

  const dispatch = useDispatchShipment(shipmentId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sealNumber.trim()) {
      toast.error('Seal number is required');
      return;
    }
    dispatch.mutate(
      {
        seal_number: sealNumber.trim(),
        branch_id: Number(branchId),
      },
      {
        onSuccess: () => {
          toast.success('Shipment dispatched successfully!');
          onOpenChange(false);
          setSealNumber('');
        },
        onError: (err) => toast.error(err.message || 'Failed to dispatch'),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dispatch Shipment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Seal Number</Label>
            <Input
              value={sealNumber}
              onChange={(e) => setSealNumber(e.target.value)}
              placeholder="e.g. SEAL-20260325-001"
            />
          </div>
          <div className="space-y-2">
            <Label>Branch ID</Label>
            <Input
              type="number"
              min="1"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={dispatch.isPending}>
              {dispatch.isPending ? 'Dispatching...' : 'Dispatch'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
