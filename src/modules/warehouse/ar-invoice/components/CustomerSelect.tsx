import { useState } from 'react';

import { SearchableSelect } from '@/shared/components';

import { useCustomerSearch } from '../api/ar-invoice.queries';
import type { Customer } from '../types';

/**
 * Customer picker with server-side search — the customer master runs to
 * thousands of rows, so unlike `VendorSelect` the list is fetched per
 * (debounced) search term rather than shipped whole.
 */
export function CustomerSelect({
  value,
  onChange,
  placeholder = 'Search customer by name or code',
  disabled = false,
  error,
  label,
  required = false,
}: {
  value?: string;
  onChange: (customer: Customer | null) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: customers = [], isLoading } = useCustomerSearch(search, isDropdownOpen);

  return (
    <SearchableSelect<Customer>
      value={value}
      items={customers}
      isLoading={isLoading}
      placeholder={placeholder}
      disabled={disabled}
      error={error}
      label={label}
      required={required}
      inputId="customer-select"
      getItemKey={(c) => c.customer_code}
      getItemLabel={(c) => `${c.customer_name} (${c.customer_code})`}
      // The server already filtered by the search term — show what it sent.
      filterFn={() => true}
      onSearchChange={setSearch}
      renderItem={(customer) => (
        <div>
          <span className="text-sm font-medium">{customer.customer_name}</span>
          <span className="text-xs text-muted-foreground ml-2">({customer.customer_code})</span>
        </div>
      )}
      loadingText="Searching customers..."
      emptyText="Type to search customers"
      notFoundText="No customers found"
      onOpenChange={setIsDropdownOpen}
      onItemSelect={(customer) => {
        onChange(customer);
      }}
      onClear={() => {
        onChange(null);
      }}
    />
  );
}
