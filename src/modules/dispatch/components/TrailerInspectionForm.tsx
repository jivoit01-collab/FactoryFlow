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
  Switch,
} from '@/shared/components/ui';

import { useInspectTrailer } from '../api';
import { TRAILER_CONDITION_OPTIONS } from '../constants/dispatch.constants';
import type { TrailerCondition } from '../types/dispatch.types';

interface TrailerInspectionFormProps {
  shipmentId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TrailerInspectionForm({
  shipmentId,
  open,
  onOpenChange,
}: TrailerInspectionFormProps) {
  const [condition, setCondition] = useState<TrailerCondition>('CLEAN');
  const [tempOk, setTempOk] = useState(true);
  const [tempReading, setTempReading] = useState('');

  const inspect = useInspectTrailer(shipmentId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    inspect.mutate(
      {
        trailer_condition: condition,
        trailer_temp_ok: tempOk,
        trailer_temp_reading: tempReading || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Trailer inspection recorded');
          onOpenChange(false);
          setCondition('CLEAN');
          setTempOk(true);
          setTempReading('');
        },
        onError: (err) => toast.error(err.message || 'Failed to record inspection'),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inspect Trailer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Trailer Condition</Label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as TrailerCondition)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {TRAILER_CONDITION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <Label>Temperature OK</Label>
            <Switch checked={tempOk} onCheckedChange={setTempOk} />
          </div>
          <div className="space-y-2">
            <Label>Temperature Reading</Label>
            <Input
              type="number"
              step="0.01"
              value={tempReading}
              onChange={(e) => setTempReading(e.target.value)}
              placeholder="e.g. 4.50"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={inspect.isPending}>
              {inspect.isPending ? 'Saving...' : 'Submit Inspection'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
