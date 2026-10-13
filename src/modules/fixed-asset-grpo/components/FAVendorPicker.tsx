import { useState } from 'react';

import { useVendors } from '@/modules/gate/api/po/po.queries';
import { SearchableSelect } from '@/shared/components';

interface VendorOption {
  vendor_code: string;
  vendor_name: string;
}

/**
 * Pick the SAP vendor whose open POs to list.
 *
 * The gate records a fixed-asset supplier as free text, so the SAP code is
 * chosen here, at link time. Same list as the gate's `VendorSelect`
 * (`/po/vendors/`, any signed-in user), but it shows the current choice before
 * the list has loaded -- an existing link opens with its vendor already named.
 */
export function FAVendorPicker({
  value,
  displayName,
  onChange,
  disabled,
}: {
  value: string;
  displayName?: string;
  onChange: (vendor: VendorOption | null) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: vendors = [], isLoading } = useVendors(isOpen);

  return (
    <SearchableSelect<VendorOption>
      value={value}
      items={vendors}
      isLoading={isLoading}
      label="SAP supplier"
      required
      disabled={disabled}
      inputId="fa-po-link-vendor"
      placeholder="Search vendor by name or code"
      defaultDisplayText={value ? `${displayName || value} (${value})` : undefined}
      getItemKey={(v) => v.vendor_code}
      getItemLabel={(v) => `${v.vendor_name} (${v.vendor_code})`}
      filterFn={(v, search) =>
        v.vendor_name.toLowerCase().includes(search.toLowerCase()) ||
        v.vendor_code.toLowerCase().includes(search.toLowerCase())
      }
      loadingText="Loading vendors..."
      emptyText="No vendors available"
      notFoundText="No vendors found"
      onOpenChange={setIsOpen}
      onItemSelect={(vendor) => onChange(vendor)}
      onClear={() => onChange(null)}
    />
  );
}
