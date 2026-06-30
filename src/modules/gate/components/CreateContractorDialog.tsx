import { useState } from 'react';

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

import type { Contractor } from '../api/personGateIn/personGateIn.api';
import { useCreateContractor } from '../api/personGateIn/personGateIn.queries';

interface CreateContractorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (contractor: Contractor) => void;
}

const EMPTY_FORM = {
  contractor_name: '',
  contact_person: '',
  mobile: '',
  address: '',
  contract_valid_till: '',
};

export function CreateContractorDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateContractorDialogProps) {
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState(EMPTY_FORM);

  const createContractor = useCreateContractor();

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

    const errors: Record<string, string> = {};
    if (!formData.contractor_name.trim()) errors.contractor_name = 'Name is required';
    if (formData.mobile?.trim() && !VALIDATION_PATTERNS.phone.test(formData.mobile.trim())) {
      errors.mobile = 'Please enter a valid 10-digit phone number';
    }

    if (Object.keys(errors).length > 0) {
      setApiErrors(errors);
      return;
    }

    setApiErrors({});
    try {
      const result = await createContractor.mutateAsync({
        contractor_name: formData.contractor_name.trim(),
        contact_person: formData.contact_person || undefined,
        mobile: formData.mobile || undefined,
        address: formData.address || undefined,
        contract_valid_till: formData.contract_valid_till || undefined,
        is_active: true,
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
        setApiErrors({ general: err.message || 'Failed to create contractor' });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Contractor</DialogTitle>
          <DialogDescription>Fill in the details to register a new contractor.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {apiErrors.general && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {apiErrors.general}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="contractor_name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="contractor_name"
              placeholder="Enter contractor name"
              value={formData.contractor_name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, contractor_name: e.target.value }))
              }
              disabled={createContractor.isPending}
              className={apiErrors.contractor_name ? 'border-destructive' : ''}
            />
            {apiErrors.contractor_name && (
              <p className="text-sm text-destructive">{apiErrors.contractor_name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_person">Contact Person</Label>
              <Input
                id="contact_person"
                placeholder="Contact person"
                value={formData.contact_person}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, contact_person: e.target.value }))
                }
                disabled={createContractor.isPending}
              />
            </div>
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
                disabled={createContractor.isPending}
                className={cn(apiErrors.mobile && 'border-destructive')}
              />
              {apiErrors.mobile && <p className="text-sm text-destructive">{apiErrors.mobile}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="Address"
                value={formData.address}
                onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                disabled={createContractor.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contract_valid_till">Contract Valid Till</Label>
              <Input
                id="contract_valid_till"
                type="date"
                value={formData.contract_valid_till}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, contract_valid_till: e.target.value }))
                }
                disabled={createContractor.isPending}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createContractor.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createContractor.isPending}>
              {createContractor.isPending ? 'Creating...' : 'Create Contractor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
