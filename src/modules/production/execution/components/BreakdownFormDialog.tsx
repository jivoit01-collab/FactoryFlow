import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

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

import { BREAKDOWN_TYPE_OPTIONS } from '../constants';
import { breakdownSchema, type BreakdownFormData } from '../schemas';
import type { Machine, MachineBreakdown } from '../types';

interface BreakdownFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  machines: Machine[];
  editingBreakdown?: MachineBreakdown | null;
  onSubmit: (data: BreakdownFormData) => void;
  isPending?: boolean;
}

export function BreakdownFormDialog({
  open,
  onOpenChange,
  machines,
  editingBreakdown,
  onSubmit,
  isPending = false,
}: BreakdownFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BreakdownFormData>({
    resolver: zodResolver(breakdownSchema),
    defaultValues: {
      type: 'LINE',
      is_unrecovered: false,
      remarks: '',
    },
  });

  useEffect(() => {
    if (open && editingBreakdown) {
      reset({
        machine_id: editingBreakdown.machine,
        start_time: editingBreakdown.start_time,
        end_time: editingBreakdown.end_time || '',
        breakdown_minutes: editingBreakdown.breakdown_minutes,
        type: editingBreakdown.type,
        is_unrecovered: editingBreakdown.is_unrecovered,
        reason: editingBreakdown.reason,
        remarks: editingBreakdown.remarks || '',
      });
    } else if (open) {
      reset({
        machine_id: undefined as unknown as number,
        start_time: '',
        end_time: '',
        breakdown_minutes: undefined,
        type: 'LINE',
        is_unrecovered: false,
        reason: '',
        remarks: '',
      });
    }
  }, [open, editingBreakdown, reset]);

  const startTime = watch('start_time');
  const endTime = watch('end_time');

  // Auto-calculate duration
  useEffect(() => {
    if (startTime && endTime) {
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      const diff = (eh * 60 + em) - (sh * 60 + sm);
      if (diff > 0) {
        setValue('breakdown_minutes', diff);
      }
    }
  }, [startTime, endTime, setValue]);

  const breakdownMinutes = watch('breakdown_minutes');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingBreakdown ? 'Edit Breakdown' : 'Record Breakdown'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Machine & Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Machine *</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...register('machine_id', { valueAsNumber: true })}
              >
                <option value="">Select machine</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              {errors.machine_id && (
                <p className="text-xs text-red-500">{errors.machine_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Type *</Label>
              <div className="flex items-center gap-3 h-10">
                {BREAKDOWN_TYPE_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      value={opt.value}
                      className="accent-primary"
                      {...register('type')}
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
              {errors.type && (
                <p className="text-xs text-red-500">{errors.type.message}</p>
              )}
            </div>
          </div>

          {/* Times */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Start Time *</Label>
              <Input type="time" {...register('start_time')} />
              {errors.start_time && (
                <p className="text-xs text-red-500">{errors.start_time.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input type="time" {...register('end_time')} />
              {errors.end_time && (
                <p className="text-xs text-red-500">{errors.end_time.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <div className="flex items-center h-10 px-3 rounded-md border bg-muted/50">
                <span className="text-sm font-mono">
                  {breakdownMinutes ? `${breakdownMinutes} min` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>Reason *</Label>
            <Input
              placeholder="e.g., Sticker changeover, Power cut..."
              {...register('reason')}
            />
            {errors.reason && (
              <p className="text-xs text-red-500">{errors.reason.message}</p>
            )}
          </div>

          {/* Recovered & Remarks */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Unrecovered?</Label>
              <div className="flex items-center gap-2 h-10">
                <Switch
                  checked={watch('is_unrecovered')}
                  onCheckedChange={(checked) => setValue('is_unrecovered', checked)}
                />
                <span className="text-sm text-muted-foreground">
                  {watch('is_unrecovered') ? 'Not recovered' : 'Recovered'}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Input placeholder="Optional notes" {...register('remarks')} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? 'Saving...'
                : editingBreakdown
                  ? 'Update Breakdown'
                  : 'Save Breakdown'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
