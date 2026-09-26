import { useState } from 'react';

import { SearchableSelect } from '@/shared/components';

import type { CodeName, LineType, SapItemOption } from '../api/bom-changes.api';
import { useSapItemSearch, useSapResourceSearch } from '../api/bom-changes.queries';

/** What a pick hands back, whichever list it came from. */
export interface PickedCode {
  code: string;
  name: string;
  uom: string;
  /** Items only: SAP's last purchase price, the portal's line cost. */
  price: number;
}

interface SapCodePickerProps {
  /** `item` searches the item master (OITM), `resource` SAP's resources (ORSC). */
  kind: LineType;
  inputId: string;
  value: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  onSelect: (picked: PickedCode) => void;
  onClear: () => void;
}

/**
 * Search SAP by code or name, as the portal's item and resource dropdowns did.
 * The search runs server-side (the shared `/sap-lookups/` pickers); the field
 * shows the chosen code.
 */
export function SapCodePicker({ kind, ...props }: SapCodePickerProps) {
  return kind === 'resource' ? <ResourcePicker {...props} /> : <ItemPicker {...props} />;
}

type PickerProps = Omit<SapCodePickerProps, 'kind'>;

function ItemPicker({
  inputId,
  value,
  label,
  required,
  disabled,
  placeholder,
  onSelect,
  onClear,
}: PickerProps) {
  const [search, setSearch] = useState('');
  const { data = [], isLoading, isError } = useSapItemSearch(search);
  return (
    <SearchableSelect<SapItemOption>
      inputId={inputId}
      label={label}
      required={required}
      disabled={disabled}
      value={value}
      defaultDisplayText={value}
      items={data}
      isLoading={isLoading && search.trim().length >= 2}
      isError={isError}
      placeholder={placeholder ?? 'Search SAP item by code or name'}
      loadingText="Searching SAP…"
      emptyText="Type at least 2 characters to search SAP"
      notFoundText="No SAP item matches."
      errorText="SAP item search is unavailable."
      minSearchLength={2}
      minSearchText="Type at least 2 characters to search SAP"
      getItemKey={(item) => item.item_code}
      getItemLabel={(item) => item.item_code}
      // Already narrowed server-side, on code or name.
      filterFn={() => true}
      renderItem={(item) => (
        <div className="flex flex-col">
          <span className="font-medium">{item.item_code}</span>
          <span className="text-xs text-muted-foreground">
            {item.item_name}
            {item.uom ? ` · ${item.uom}` : ''}
          </span>
        </div>
      )}
      onSearchChange={(next) => setSearch(next.trim())}
      onItemSelect={(item) =>
        onSelect({
          code: item.item_code,
          name: item.item_name,
          uom: item.uom,
          price: item.last_purchase_price,
        })
      }
      onClear={onClear}
    />
  );
}

function ResourcePicker({
  inputId,
  value,
  label,
  required,
  disabled,
  placeholder,
  onSelect,
  onClear,
}: PickerProps) {
  const [search, setSearch] = useState('');
  const { data = [], isLoading, isError } = useSapResourceSearch(search);
  return (
    <SearchableSelect<CodeName>
      inputId={inputId}
      label={label}
      required={required}
      disabled={disabled}
      value={value}
      defaultDisplayText={value}
      items={data}
      isLoading={isLoading}
      isError={isError}
      placeholder={placeholder ?? 'Search SAP resource'}
      loadingText="Searching SAP…"
      emptyText="No resources in SAP"
      notFoundText="No SAP resource matches."
      errorText="SAP resource search is unavailable."
      getItemKey={(resource) => resource.code}
      getItemLabel={(resource) => resource.code}
      filterFn={() => true}
      renderItem={(resource) => (
        <div className="flex flex-col">
          <span className="font-medium">{resource.code}</span>
          <span className="text-xs text-muted-foreground">{resource.name}</span>
        </div>
      )}
      onSearchChange={(next) => setSearch(next.trim())}
      onItemSelect={(resource) =>
        onSelect({ code: resource.code, name: resource.name, uom: '', price: 0 })
      }
      onClear={onClear}
    />
  );
}
