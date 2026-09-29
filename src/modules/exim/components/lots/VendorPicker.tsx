/**
 * Choosing who a lot is bought from, and naming the refinery doing job work.
 *
 * The vendors are SAP's active ones plus the temporary vendors added here for
 * one SAP does not have yet (TEMP0001 …). If SAP does not answer, only the
 * temporary ones come back, and the picker says so rather than looking empty.
 */
import { useState } from 'react';
import { toast } from 'sonner';

import { EXIM_PERMISSIONS } from '@/config/permissions/exim.permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { SearchableSelect } from '@/shared/components';
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
import { getErrorMessage } from '@/shared/utils';

import { useCreateTemporaryVendor, useVendors } from '../../api';
import type { Vendor } from '../../types';

function vendorLabel(vendor: Vendor) {
  return `${vendor.name} · ${vendor.code}`;
}

/** Job work keeps a picked vendor as EXIM did. */
function jobWorkText(vendor: Vendor) {
  return `${vendor.code} - ${vendor.name}`;
}

/** By name or code; a box still holding a picked vendor's label lists that vendor. */
function matches(vendor: Vendor, search: string) {
  const term = search.trim().toLowerCase();
  return (
    !term ||
    vendor.name.toLowerCase().includes(term) ||
    vendor.code.toLowerCase().includes(term) ||
    vendorLabel(vendor).toLowerCase() === term ||
    jobWorkText(vendor).toLowerCase() === term
  );
}

function VendorRow({ vendor }: { vendor: Vendor }) {
  return (
    <span className="min-w-0">
      <span className="block truncate text-sm">{vendor.name}</span>
      <span className="block font-mono text-xs text-muted-foreground">
        {vendor.code}
        {vendor.temporary ? ' · not in SAP yet' : ''}
      </span>
    </span>
  );
}

function TemporaryVendorDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (vendor: Vendor) => void;
}) {
  const create = useCreateTemporaryVendor();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName('');
      setError('');
    }
  }

  async function save() {
    if (!name.trim()) {
      setError('What is the vendor called?');
      return;
    }
    try {
      const vendor = await create.mutateAsync(name.trim());
      toast.success(`${vendor.name} added as ${vendor.code}`);
      onCreated(vendor);
      onOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not add the vendor.'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>A vendor SAP doesn't have yet</DialogTitle>
          <DialogDescription>
            It gets a temporary code (TEMP0013 and so on) until SAP has the vendor.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="temp-vendor-name">Vendor name</Label>
          <Input
            id="temp-vendor-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError('');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                save();
              }
            }}
            autoFocus
          />
          {error && <p className="text-xs text-rose-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            Cancel
          </Button>
          <Button onClick={save} disabled={create.isPending}>
            {create.isPending ? 'Adding…' : 'Add vendor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The vendor a lot is bought from. `value` is the vendor's code. */
export function VendorPicker({
  inputId,
  value,
  onChange,
  error,
}: {
  inputId: string;
  value: string;
  onChange: (vendor: Vendor | null) => void;
  error?: string;
}) {
  const { hasPermission } = usePermission();
  const canAddTemporary = hasPermission(EXIM_PERMISSIONS.TEMP_VENDOR_ADD);
  const { data, isLoading, isError } = useVendors();
  const vendors = data?.vendors ?? [];

  return (
    <div className="space-y-1.5">
      <SearchableSelect<Vendor>
        inputId={inputId}
        value={value}
        items={vendors}
        isLoading={isLoading}
        isError={isError}
        placeholder="Search by name or code"
        getItemKey={(vendor) => vendor.code}
        getItemLabel={vendorLabel}
        filterFn={matches}
        renderItem={(vendor) => <VendorRow vendor={vendor} />}
        loadingText="Reading the vendors from SAP…"
        emptyText="No vendors to choose from"
        notFoundText="No vendor by that name or code"
        errorText="The vendors could not be read."
        error={error}
        onItemSelect={(vendor) => onChange(vendor)}
        onClear={() => onChange(null)}
        addNewLabel={canAddTemporary ? "Add a vendor SAP doesn't have yet" : undefined}
        renderCreateDialog={
          canAddTemporary
            ? (open, setOpen, updateSelection) => (
                <TemporaryVendorDialog
                  open={open}
                  onOpenChange={setOpen}
                  onCreated={(vendor) => {
                    updateSelection(vendor.code, vendorLabel(vendor));
                    onChange(vendor);
                  }}
                />
              )
            : undefined
        }
      />
      {data?.sap_unavailable && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          SAP did not answer, so only the temporary vendors are listed.
        </p>
      )}
    </div>
  );
}

/**
 * The refinery doing job work on a lot as it arrives there: picked from the
 * vendors, or typed as it is known when it is not one of them. EXIM kept a
 * picked vendor as "CODE - Name", and so does this.
 */
export function JobWorkPicker({
  inputId,
  value,
  onChange,
  error,
}: {
  inputId: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const { data, isLoading } = useVendors();
  const vendors = data?.vendors ?? [];

  return (
    <SearchableSelect<Vendor>
      inputId={inputId}
      value={value}
      defaultDisplayText={value}
      items={vendors}
      isLoading={isLoading}
      placeholder="Pick a vendor or type the refinery's name"
      getItemKey={(vendor) => vendor.code}
      getItemLabel={jobWorkText}
      filterFn={matches}
      renderItem={(vendor) => <VendorRow vendor={vendor} />}
      loadingText="Reading the vendors from SAP…"
      emptyText="No vendors listed: type the name"
      notFoundText="Not a listed vendor: the name is kept as typed"
      error={error}
      onItemSelect={(vendor) => onChange(jobWorkText(vendor))}
      onClear={() => onChange('')}
      onSearchChange={(search) => onChange(search)}
    />
  );
}
