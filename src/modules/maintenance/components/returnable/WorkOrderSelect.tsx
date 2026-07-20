import { useState } from 'react';

import { SearchableSelect } from '@/shared/components';

import { useMaintenanceWorkOrders } from '../../api/maintenance.queries';
import type { MaintenanceWorkOrder } from '../../types';

interface WorkOrderSelectProps {
  inputId?: string;
  /** The chosen work-order id, or null when nothing is linked. */
  value?: number | null;
  /** Shown before the list loads, when editing a saved pass. */
  defaultDisplayText?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  onChange: (workOrderId: number | null) => void;
}

/**
 * Optional link from a returnable pass to the maintenance work order it was
 * raised against. Fetched lazily on first open and filtered client-side on the
 * work-order number and its title.
 */
export function WorkOrderSelect({
  inputId = 'returnable-work-order-select',
  value,
  defaultDisplayText,
  disabled = false,
  error,
  label,
  onChange,
}: WorkOrderSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    data: workOrders = [],
    isLoading,
    isError,
  } = useMaintenanceWorkOrders({ is_active: true }, isOpen);

  return (
    <SearchableSelect<MaintenanceWorkOrder>
      inputId={inputId}
      label={label}
      value={value ? String(value) : undefined}
      defaultDisplayText={defaultDisplayText}
      disabled={disabled}
      error={error}
      items={workOrders}
      isLoading={isLoading}
      isError={isError}
      placeholder="Search work orders by number or title"
      loadingText="Loading work orders…"
      emptyText="No work orders available"
      notFoundText="No work order matches"
      errorText="Failed to load work orders."
      getItemKey={(wo) => wo.id}
      getItemLabel={(wo) => wo.work_order_no}
      filterFn={(wo, search) => {
        const query = search.toLowerCase();
        return (
          wo.work_order_no.toLowerCase().includes(query) ||
          wo.title.toLowerCase().includes(query)
        );
      }}
      renderItem={(wo) => (
        <div className="flex flex-col">
          <span className="text-sm">{wo.work_order_no}</span>
          <span className="text-xs text-muted-foreground">
            {wo.title || wo.asset_name || '—'}
          </span>
        </div>
      )}
      onOpenChange={setIsOpen}
      onItemSelect={(wo) => onChange(wo.id)}
      onClear={() => onChange(null)}
    />
  );
}
