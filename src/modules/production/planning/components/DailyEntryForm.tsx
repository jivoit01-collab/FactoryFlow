import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

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

import type { CreateDailyEntryFormData } from '../schemas';
import { createDailyEntrySchema } from '../schemas';
import type { DailyProductionEntry, Shift } from '../types';

interface DailyEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateDailyEntryFormData) => Promise<void>;
  isPending: boolean;
  /** Week date range for validation hints */
  weekStartDate: string;
  weekEndDate: string;
  /** Edit mode */
  editData?: DailyProductionEntry | null;
}

const SHIFT_OPTIONS: { value: Shift | ''; label: string }[] = [
  { value: '', label: 'None' },
  { value: 'MORNING', label: 'Morning' },
  { value: 'AFTERNOON', label: 'Afternoon' },
  { value: 'NIGHT', label: 'Night' },
];

export function DailyEntryForm({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  weekStartDate,
  weekEndDate,
  editData,
}: DailyEntryFormProps) {
  const isEdit = !!editData;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<CreateDailyEntryFormData>({
    resolver: zodResolver(createDailyEntrySchema),
    defaultValues: {
      production_date: '',
      produced_qty: undefined,
      shift: null,
      remarks: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    if (editData) {
      reset({
        production_date: editData.production_date,
        produced_qty: Number(editData.produced_qty),
        shift: editData.shift || null,
        remarks: editData.remarks || '',
      });
    } else {
      reset({
        production_date: '',
        produced_qty: undefined,
        shift: null,
        remarks: '',
      });
    }
  }, [open, editData, reset]);

  const handleFormSubmit = async (data: CreateDailyEntryFormData) => {
    await onSubmit(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Daily Entry' : 'Add Daily Entry'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="production_date">
              Production Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="production_date"
              type="date"
              min={weekStartDate}
              max={weekEndDate}
              {...register('production_date')}
              disabled={isPending || isEdit}
              className={errors.production_date ? 'border-destructive' : ''}
            />
            {errors.production_date && (
              <p className="text-sm text-destructive">{errors.production_date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="produced_qty">
              Produced Quantity <span className="text-destructive">*</span>
            </Label>
            <Input
              id="produced_qty"
              type="number"
              step="any"
              min="0"
              placeholder="Quantity produced"
              {...register('produced_qty', { valueAsNumber: true })}
              disabled={isPending}
              className={errors.produced_qty ? 'border-destructive' : ''}
            />
            {errors.produced_qty && (
              <p className="text-sm text-destructive">{errors.produced_qty.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="shift">Shift</Label>
            <select
              id="shift"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onChange={(e) => {
                const val = e.target.value;
                setValue('shift', val ? (val as Shift) : null);
              }}
              defaultValue={editData?.shift || ''}
              disabled={isPending}
            >
              {SHIFT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Input
              id="remarks"
              placeholder="Optional notes"
              {...register('remarks')}
              disabled={isPending}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isPending ? 'Saving...' : isEdit ? 'Update Entry' : 'Add Entry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
