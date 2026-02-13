import { useEffect, useState } from 'react';

import { VALIDATION_PATTERNS } from '@/config/constants';
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
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { Visitor } from '../../api/personGateIn/personGateIn.api';
import { useCreateVisitor } from '../../api/personGateIn/personGateIn.queries';
import { ID_PROOF_TYPES, ID_PROOF_VALIDATION } from '../../schemas/driver.schema';

interface CreateVisitorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (visitor: Visitor) => void;
}

export function CreateVisitorDialog({ open, onOpenChange, onSuccess }: CreateVisitorDialogProps) {
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    company_name: '',
    id_proof_type: '',
    id_proof_no: '',
  });

  const createVisitor = useCreateVisitor();

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setFormData({
        name: '',
        mobile: '',
        company_name: '',
        id_proof_type: '',
        id_proof_no: '',
      });
      setApiErrors({});
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (formData.mobile?.trim() && !VALIDATION_PATTERNS.phone.test(formData.mobile.trim())) {
      errors.mobile = 'Please enter a valid 10-digit phone number';
    }
    if (formData.id_proof_type && formData.id_proof_no?.trim()) {
      const proofType = formData.id_proof_type as keyof typeof ID_PROOF_VALIDATION;
      const validation = ID_PROOF_VALIDATION[proofType];
      if (
        validation?.pattern &&
        !validation.pattern.test(formData.id_proof_no.trim().toUpperCase())
      ) {
        errors.id_proof_no = validation.message;
      }
    }

    if (Object.keys(errors).length > 0) {
      setApiErrors(errors);
      return;
    }

    setApiErrors({});
    try {
      const result = await createVisitor.mutateAsync({
        name: formData.name,
        mobile: formData.mobile || undefined,
        company_name: formData.company_name || undefined,
        id_proof_type: formData.id_proof_type || undefined,
        id_proof_no: formData.id_proof_no || undefined,
      });
      onOpenChange(false);
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
        setApiErrors({ general: err.message || 'Failed to create visitor' });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Visitor</DialogTitle>
          <DialogDescription>Fill in the details to register a new visitor.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {apiErrors.general && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {apiErrors.general}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Enter visitor name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              disabled={createVisitor.isPending}
              className={apiErrors.name ? 'border-destructive' : ''}
            />
            {apiErrors.name && <p className="text-sm text-destructive">{apiErrors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile</Label>
              <Input
                id="mobile"
                placeholder="9876543210"
                value={formData.mobile}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                  setFormData((prev) => ({ ...prev, mobile: value }));
                  if (apiErrors.mobile) {
                    setApiErrors((prev) => {
                      const n = { ...prev };
                      delete n.mobile;
                      return n;
                    });
                  }
                }}
                maxLength={10}
                disabled={createVisitor.isPending}
                className={cn(apiErrors.mobile && 'border-destructive')}
              />
              {apiErrors.mobile && <p className="text-sm text-destructive">{apiErrors.mobile}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_name">Company</Label>
              <Input
                id="company_name"
                placeholder="Company name"
                value={formData.company_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, company_name: e.target.value }))}
                disabled={createVisitor.isPending}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="id_proof_type">ID Proof Type</Label>
              <select
                id="id_proof_type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.id_proof_type}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    id_proof_type: e.target.value,
                    id_proof_no: '',
                  }));
                  if (apiErrors.id_proof_no) {
                    setApiErrors((prev) => {
                      const n = { ...prev };
                      delete n.id_proof_no;
                      return n;
                    });
                  }
                }}
                disabled={createVisitor.isPending}
              >
                <option value="">Select type</option>
                {ID_PROOF_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="id_proof_no">ID Proof Number</Label>
              <Input
                id="id_proof_no"
                placeholder={
                  ID_PROOF_VALIDATION[formData.id_proof_type as keyof typeof ID_PROOF_VALIDATION]
                    ?.placeholder || 'ID number'
                }
                value={formData.id_proof_no}
                onChange={(e) => {
                  let value = e.target.value;
                  if (formData.id_proof_type === 'Aadhar') {
                    value = value.replace(/[^0-9]/g, '').slice(0, 12);
                  } else if (
                    formData.id_proof_type === 'PAN Card' ||
                    formData.id_proof_type === 'Voter ID'
                  ) {
                    value = value.toUpperCase();
                  }
                  setFormData((prev) => ({ ...prev, id_proof_no: value }));
                  if (apiErrors.id_proof_no) {
                    setApiErrors((prev) => {
                      const n = { ...prev };
                      delete n.id_proof_no;
                      return n;
                    });
                  }
                }}
                maxLength={
                  formData.id_proof_type === 'Aadhar'
                    ? 12
                    : formData.id_proof_type === 'PAN Card' || formData.id_proof_type === 'Voter ID'
                      ? 10
                      : 50
                }
                disabled={createVisitor.isPending || !formData.id_proof_type}
                className={cn(apiErrors.id_proof_no && 'border-destructive')}
              />
              {apiErrors.id_proof_no && (
                <p className="text-sm text-destructive">{apiErrors.id_proof_no}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createVisitor.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createVisitor.isPending}>
              {createVisitor.isPending ? 'Creating...' : 'Create Visitor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
