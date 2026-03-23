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

import type { CreateWeeklyPlanFormData } from '../schemas';
import { createWeeklyPlanSchema } from '../schemas';
import type { WeeklyPlan } from '../types';

interface WeeklyPlanFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateWeeklyPlanFormData) => Promise<void>;
  isPending: boolean;
  /** Existing weeks to auto-suggest next week number */
  existingWeeks: WeeklyPlan[];
  /** Plan date range for validation hints */
  planStartDate: string;
  planDueDate: string;
  /** Edit mode */
  editData?: WeeklyPlan | null;
}

export function WeeklyPlanForm({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  existingWeeks,
  planStartDate,
  planDueDate,
  editData,
}: WeeklyPlanFormProps) {
  const isEdit = !!editData;
  const nextWeekNumber = existingWeeks.length > 0
    ? Math.max(...existingWeeks.map((w) => w.week_number)) + 1
    : 1;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateWeeklyPlanFormData>({
    resolver: zodResolver(createWeeklyPlanSchema),
    defaultValues: {
      week_number: nextWeekNumber,
      week_label: '',
      start_date: planStartDate,
      end_date: '',
      target_qty: undefined,
    },
  });

  useEffect(() => {
    if (!open) return;
    if (editData) {
      reset({
        week_number: editData.week_number,
        week_label: editData.week_label || '',
        start_date: editData.start_date,
        end_date: editData.end_date,
        target_qty: Number(editData.target_qty),
      });
    } else {
      reset({
        week_number: nextWeekNumber,
        week_label: `Week ${nextWeekNumber}`,
        start_date: planStartDate,
        end_date: '',
        target_qty: undefined,
      });
    }
  }, [open, editData, nextWeekNumber, planStartDate, reset]);

  const handleFormSubmit = async (data: CreateWeeklyPlanFormData) => {
    await onSubmit(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Weekly Plan' : 'Add Weekly Plan'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="week_number">
                Week Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="week_number"
                type="number"
                min="1"
                {...register('week_number', { valueAsNumber: true })}
                disabled={isPending || isEdit}
                className={errors.week_number ? 'border-destructive' : ''}
              />
              {errors.week_number && (
                <p className="text-sm text-destructive">{errors.week_number.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="week_label">Label</Label>
              <Input
                id="week_label"
                placeholder="e.g. Week 1"
                {...register('week_label')}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">
                Start Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="start_date"
                type="date"
                min={planStartDate}
                max={planDueDate}
                {...register('start_date')}
                disabled={isPending}
                className={errors.start_date ? 'border-destructive' : ''}
              />
              {errors.start_date && (
                <p className="text-sm text-destructive">{errors.start_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">
                End Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="end_date"
                type="date"
                min={planStartDate}
                max={planDueDate}
                {...register('end_date')}
                disabled={isPending}
                className={errors.end_date ? 'border-destructive' : ''}
              />
              {errors.end_date && (
                <p className="text-sm text-destructive">{errors.end_date.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_qty">
              Target Quantity <span className="text-destructive">*</span>
            </Label>
            <Input
              id="target_qty"
              type="number"
              step="any"
              min="0"
              placeholder="Quantity for this week"
              {...register('target_qty', { valueAsNumber: true })}
              disabled={isPending}
              className={errors.target_qty ? 'border-destructive' : ''}
            />
            {errors.target_qty && (
              <p className="text-sm text-destructive">{errors.target_qty.message}</p>
            )}
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
              {isPending ? 'Saving...' : isEdit ? 'Update Week' : 'Add Week'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
