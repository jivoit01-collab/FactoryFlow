import { useState } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from '@/shared/components/ui';

import type { Department } from '../api/department/department.api';
import { useCreateDepartment } from '../api/department/department.queries';

interface CreateDepartmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (department: Department) => void;
}

const EMPTY_FORM = { name: '', description: '' };

export function CreateDepartmentDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateDepartmentDialogProps) {
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState(EMPTY_FORM);

  const createDepartment = useCreateDepartment();

  // Reset the form on close so the next open starts fresh.
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setFormData(EMPTY_FORM);
      setApiErrors({});
    }
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setApiErrors({ name: 'Name is required' });
      return;
    }

    setApiErrors({});
    try {
      const result = await createDepartment.mutateAsync({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
      });
      handleOpenChange(false);
      onSuccess?.(result);
    } catch (error: unknown) {
      const err = error as { errors?: Record<string, string[]>; message?: string };
      if (err.errors) {
        const fieldErrors: Record<string, string> = {};
        Object.entries(err.errors).forEach(([field, messages]) => {
          if (Array.isArray(messages) && messages.length > 0) {
            fieldErrors[field] = messages[0];
          }
        });
        setApiErrors(fieldErrors);
      } else {
        setApiErrors({ general: err.message || 'Failed to create department' });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Add New Department</DialogTitle>
          <DialogDescription>Fill in the details to create a new department.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {apiErrors.general && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {apiErrors.general}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="department_name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="department_name"
              placeholder="Enter department name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              disabled={createDepartment.isPending}
              className={apiErrors.name ? 'border-destructive' : ''}
            />
            {apiErrors.name && <p className="text-sm text-destructive">{apiErrors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="department_description">Description</Label>
            <Textarea
              id="department_description"
              placeholder="Optional description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              disabled={createDepartment.isPending}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createDepartment.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createDepartment.isPending}>
              {createDepartment.isPending ? 'Creating...' : 'Create Department'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
