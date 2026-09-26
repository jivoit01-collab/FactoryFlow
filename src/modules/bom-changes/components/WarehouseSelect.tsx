import { NativeSelect, SelectOption } from '@/shared/components/ui';

import { useSapWarehouses } from '../api/bom-changes.queries';

/**
 * SAP's active warehouses for this company. A code SAP no longer lists (say,
 * on a tree loaded from SAP) stays selectable, so loading a BOM never silently
 * changes its warehouse.
 */
export function WarehouseSelect({
  id,
  value,
  onChange,
  emptyLabel = 'None',
  compact,
  ariaLabel,
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (code: string) => void;
  emptyLabel?: string;
  /** Codes only, for a table cell. */
  compact?: boolean;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  const { data = [], isLoading } = useSapWarehouses();
  const known = data.some((warehouse) => warehouse.code === value);
  return (
    <NativeSelect
      id={id}
      aria-label={ariaLabel}
      value={value}
      disabled={disabled || isLoading}
      onChange={(event) => onChange(event.target.value)}
      className={compact ? 'h-8' : undefined}
    >
      <SelectOption value="">{isLoading ? 'Loading…' : emptyLabel}</SelectOption>
      {value && !known && <SelectOption value={value}>{value}</SelectOption>}
      {data.map((warehouse) => (
        <SelectOption key={warehouse.code} value={warehouse.code}>
          {compact ? warehouse.code : `${warehouse.code} — ${warehouse.name}`}
        </SelectOption>
      ))}
    </NativeSelect>
  );
}
