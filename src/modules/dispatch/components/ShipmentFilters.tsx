import { Search, X } from 'lucide-react';

import { Button, Input } from '@/shared/components/ui';

import { STATUS_OPTIONS } from '../constants/dispatch.constants';
import type { ShipmentFilters as Filters } from '../types/dispatch.types';

interface ShipmentFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export default function ShipmentFilters({ filters, onChange }: ShipmentFiltersProps) {
  const hasFilters = filters.status || filters.scheduled_date || filters.customer_code;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Status dropdown */}
      <select
        value={filters.status ?? ''}
        onChange={(e) =>
          onChange({ ...filters, status: (e.target.value || undefined) as Filters['status'] })
        }
        className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">All Statuses</option>
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Date picker */}
      <Input
        type="date"
        value={filters.scheduled_date ?? ''}
        onChange={(e) =>
          onChange({ ...filters, scheduled_date: e.target.value || undefined })
        }
        className="h-9 w-auto"
        placeholder="Scheduled date"
      />

      {/* Customer search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.customer_code ?? ''}
          onChange={(e) =>
            onChange({ ...filters, customer_code: e.target.value || undefined })
          }
          placeholder="Customer code..."
          className="h-9 pl-8 w-48"
        />
      </div>

      {/* Clear filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({})}
          className="h-9"
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
