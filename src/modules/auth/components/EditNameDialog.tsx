import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import type { ApiError } from '@/core/api/types';
import { useAuth } from '@/core/auth';
import { Button, Input, Label } from '@/shared/components/ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';

import { type EditNameFormData, editNameSchema } from '../schemas/editName.schema';

interface EditNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentName: string;
}

/**
 * EditNameDialog component
 *
 * Lets the signed-in user correct their own name. Everything that shows the
 * name reads it from the auth store, so it changes everywhere on save.
 */
export function EditNameDialog({ open, onOpenChange, currentName }: EditNameDialogProps) {
  const { updateFullName } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EditNameFormData>({
    resolver: zodResolver(editNameSchema),
    defaultValues: { full_name: currentName },
  });

  // Start from the saved name every time the dialog opens.
  useEffect(() => {
    if (open) {
      reset({ full_name: currentName });
      setError(null);
    }
  }, [open, currentName, reset]);

  const onSubmit = async (data: EditNameFormData) => {
    if (data.full_name === currentName) {
      onOpenChange(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await updateFullName(data.full_name);
      toast.success('Name updated');
      onOpenChange(false);
    } catch (err) {
      if (err && typeof err === 'object' && 'message' in err && 'status' in err) {
        setError((err as ApiError).message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to update your name. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Name</DialogTitle>
          <DialogDescription>This is the name shown across the app.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="full_name">Name</Label>
            <Input
              id="full_name"
              autoComplete="name"
              autoFocus
              {...register('full_name')}
              disabled={isLoading}
            />
            {errors.full_name && (
              <p className="text-sm text-destructive">{errors.full_name.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
