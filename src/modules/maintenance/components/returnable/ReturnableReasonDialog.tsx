import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from '@/shared/components/ui';

import { type ReasonFormValues,reasonSchema } from '../../schemas/returnable.schema';

interface ReturnableReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  /** Rejecting, cancelling and short-closing are all destructive. */
  destructive?: boolean;
  isPending?: boolean;
  onConfirm: (reason: string) => void;
}

/**
 * Shared dialog for the three transitions that demand a written reason:
 * reject-at-gate, cancel, and short-close. Each of them permanently changes what
 * the register says happened to the material, so the reason is mandatory.
 */
export function ReturnableReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive = false,
  isPending = false,
  onConfirm,
}: ReturnableReasonDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReasonFormValues>({
    resolver: zodResolver(reasonSchema),
    defaultValues: { reason: '' },
  });

  useEffect(() => {
    if (open) reset({ reason: '' });
  }, [open, reset]);

  const submit = handleSubmit((values) => onConfirm(values.reason.trim()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="returnable-reason">Reason</Label>
          <Textarea
            id="returnable-reason"
            rows={4}
            placeholder="Explain what happened — this is recorded on the gate pass timeline."
            {...register('reason')}
          />
          {errors.reason ? (
            <p className="text-sm text-destructive">{errors.reason.message}</p>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={destructive ? 'destructive' : 'default'}
            onClick={submit}
            disabled={isPending}
          >
            {isPending ? 'Working…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
