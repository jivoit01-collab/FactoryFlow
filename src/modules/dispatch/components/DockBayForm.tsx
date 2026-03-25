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

import { useAssignBay } from '../api';
import { DOCK_BAY_OPTIONS } from '../constants/dispatch.constants';

interface DockBayFormProps {
  shipmentId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DockBayForm({ shipmentId, open, onOpenChange }: DockBayFormProps) {
  const [dockBay, setDockBay] = useState('');
  const [slotStart, setSlotStart] = useState('');
  const [slotEnd, setSlotEnd] = useState('');

  const assignBay = useAssignBay(shipmentId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dockBay || !slotStart || !slotEnd) {
      toast.error('Please fill in all fields');
      return;
    }
    assignBay.mutate(
      {
        dock_bay: dockBay,
        dock_slot_start: new Date(slotStart).toISOString(),
        dock_slot_end: new Date(slotEnd).toISOString(),
      },
      {
        onSuccess: () => {
          toast.success('Dock bay assigned');
          onOpenChange(false);
          setDockBay('');
          setSlotStart('');
          setSlotEnd('');
        },
        onError: (err) => toast.error(err.message || 'Failed to assign bay'),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Dock Bay</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Dock Bay (Zone C: 19-30)</Label>
            <select
              value={dockBay}
              onChange={(e) => setDockBay(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select bay...</option>
              {DOCK_BAY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Slot Start</Label>
            <Input
              type="datetime-local"
              value={slotStart}
              onChange={(e) => setSlotStart(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Slot End</Label>
            <Input
              type="datetime-local"
              value={slotEnd}
              onChange={(e) => setSlotEnd(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={assignBay.isPending}>
              {assignBay.isPending ? 'Assigning...' : 'Assign Bay'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
