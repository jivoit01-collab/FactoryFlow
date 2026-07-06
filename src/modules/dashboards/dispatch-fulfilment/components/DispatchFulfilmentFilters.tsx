import { RefreshCw } from 'lucide-react';

import { Button, Input, Label } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { DispatchFulfilmentFilters as Filters } from '../types';

interface Props {
  filters: Filters;
  isFetching: boolean;
  onChange: (next: Filters) => void;
  onRefresh: () => void;
}

export function DispatchFulfilmentFilters({
  filters,
  isFetching,
  onChange,
  onRefresh,
}: Props) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
      <div className="space-y-1">
        <Label htmlFor="df-from">From</Label>
        <Input
          id="df-from"
          type="date"
          value={filters.from}
          max={filters.to}
          onChange={(e) => onChange({ ...filters, from: e.target.value })}
          className="w-[160px]"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="df-to">To</Label>
        <Input
          id="df-to"
          type="date"
          value={filters.to}
          min={filters.from}
          onChange={(e) => onChange({ ...filters, to: e.target.value })}
          className="w-[160px]"
        />
      </div>
      <Button variant="outline" onClick={onRefresh} disabled={isFetching}>
        <RefreshCw className={cn('mr-2 h-4 w-4', isFetching && 'animate-spin')} />
        Refresh
      </Button>
    </div>
  );
}
