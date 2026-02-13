import { useState } from 'react';

import { SearchableSelect } from '@/shared/components';

import type { Vendor } from '../api/po/po.api';
import { useVendors } from '../api/po/po.queries';

interface VendorSelectProps {
  value?: string;
  onChange: (vendor: Vendor | null) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
}

export function VendorSelect({
  value,
  onChange,
  placeholder = 'Search vendor by name or code',
  disabled = false,
  error,
  label,
  required = false,
}: VendorSelectProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const { data: vendors = [], isLoading } = useVendors(isDropdownOpen);

  return (
    <SearchableSelect<Vendor>
      value={value}
      items={vendors}
      isLoading={isLoading}
      placeholder={placeholder}
      disabled={disabled}
      error={error}
      label={label}
      required={required}
      inputId="vendor-select"
      getItemKey={(v) => v.vendor_code}
      getItemLabel={(v) => `${v.vendor_name} (${v.vendor_code})`}
      filterFn={(v, search) =>
        v.vendor_name.toLowerCase().includes(search.toLowerCase()) ||
        v.vendor_code.toLowerCase().includes(search.toLowerCase())
      }
      renderItem={(vendor) => (
        <div>
          <span className="text-sm font-medium">{vendor.vendor_name}</span>
          <span className="text-xs text-muted-foreground ml-2">({vendor.vendor_code})</span>
        </div>
      )}
      loadingText="Loading vendors..."
      emptyText="No vendors available"
      notFoundText="No vendors found"
      onOpenChange={setIsDropdownOpen}
      onItemSelect={(vendor) => {
        onChange(vendor);
      }}
      onClear={() => {
        onChange(null);
      }}
    />
  );
}
