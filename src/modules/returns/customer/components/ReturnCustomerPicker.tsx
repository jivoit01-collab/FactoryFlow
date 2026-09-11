import { useState } from 'react';

import { SearchableSelect } from '@/shared/components/SearchableSelect';

import { type ReturnCustomer, useGoodsReturnCustomers } from '../api';

/**
 * Picks the returning customer from SAP, for the two bases that have no invoice
 * to read one off.
 *
 * The code is the point, not the name. Everything the return does afterwards
 * runs on it: the returning-items picker offers this customer's own invoice
 * history (an item they were never billed for has no tax code, and SAP refuses
 * the line), and the posted A/R Return carries it as CardCode. A hand-typed
 * name with no code looks complete on the form and then shows an empty item
 * list at step 2 — which reads as "this customer bought nothing" rather than
 * "nobody said who this customer is".
 *
 * Server-side search: the customer master runs to thousands of rows, so the
 * list is fetched per debounced term rather than shipped whole, and `filterFn`
 * passes everything through because the server already filtered.
 */
export function ReturnCustomerPicker({
  value,
  onChange,
  disabled,
  inputId = 'return-customer',
}: {
  /** Display text for the current selection — `name (code)`, or the stored name. */
  value: string;
  onChange: (customer: ReturnCustomer | null) => void;
  disabled?: boolean;
  inputId?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: customers = [], isLoading, isError } = useGoodsReturnCustomers(search, isOpen);

  return (
    <SearchableSelect<ReturnCustomer>
      items={customers}
      isLoading={isLoading}
      isError={isError}
      disabled={disabled}
      inputId={inputId}
      value={value}
      defaultDisplayText={value}
      placeholder="Search the customer by name or code"
      getItemKey={(customer) => customer.customer_code}
      getItemLabel={(customer) => `${customer.customer_name} (${customer.customer_code})`}
      filterFn={() => true}
      onSearchChange={setSearch}
      onOpenChange={setIsOpen}
      renderItem={(customer) => (
        <div>
          <span className="text-sm font-medium">{customer.customer_name}</span>
          <span className="ml-2 text-xs text-muted-foreground">({customer.customer_code})</span>
        </div>
      )}
      loadingText="Searching customers…"
      emptyText="Type to search customers"
      notFoundText="No customer in SAP matches that"
      errorText="Could not load customers from SAP"
      onItemSelect={onChange}
      onClear={() => onChange(null)}
    />
  );
}
