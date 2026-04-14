import { Info } from 'lucide-react';

import type { ApiError } from '@/core/api';

import { useSKUDetail } from '../api';
import { SAPUnavailableBanner } from './SAPUnavailableBanner';
import { ShortfallCell } from './ShortfallCell';
import { StockStatusBadge } from './StockStatusBadge';

interface SKUDetailPanelProps {
  docEntry: number;
}

export function SKUDetailPanel({ docEntry }: SKUDetailPanelProps) {
  const { data, isLoading, error } = useSKUDetail(docEntry);

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-8 animate-pulse rounded bg-muted" />
        ))}
      </div>
    );
  }

  const apiError = error as ApiError | null;

  if (apiError) {
    if (apiError.status === 404) {
      return (
        <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <Info className="h-4 w-4" />
          Production order not found or no longer active.
        </div>
      );
    }
    if (apiError.status === 502 || apiError.status === 503) {
      return (
        <div className="p-4">
          <SAPUnavailableBanner error={apiError} />
        </div>
      );
    }
    return (
      <div className="p-4 text-sm text-red-600">
        Failed to load component details.
      </div>
    );
  }

  const components = data?.data.components ?? [];

  if (components.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">No components found for this order.</div>
    );
  }

  return (
    <div className="overflow-x-auto p-2">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th scope="col" className="pb-2 pr-3 text-left font-medium">Code</th>
            <th scope="col" className="pb-2 pr-3 text-left font-medium">Component</th>
            <th scope="col" className="pb-2 pr-3 text-right font-medium">Required</th>
            <th scope="col" className="pb-2 pr-3 text-right font-medium">Issued</th>
            <th scope="col" className="pb-2 pr-3 text-right font-medium">Remaining</th>
            <th scope="col" className="pb-2 pr-3 text-right font-medium">Available</th>
            <th scope="col" className="pb-2 pr-3 text-right font-medium">Shortfall</th>
            <th scope="col" className="pb-2 pr-3 text-left font-medium">UOM</th>
            <th scope="col" className="pb-2 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {components.map((comp) => (
            <tr key={comp.component_line} className="border-b last:border-0">
              <td className="py-2 pr-3 font-mono text-muted-foreground">{comp.component_code}</td>
              <td className="py-2 pr-3">{comp.component_name}</td>
              <td className="py-2 pr-3 text-right">{comp.component_planned_qty.toLocaleString()}</td>
              <td className="py-2 pr-3 text-right">{comp.component_issued_qty.toLocaleString()}</td>
              <td className="py-2 pr-3 text-right">{comp.component_remaining_qty.toLocaleString()}</td>
              <td className="py-2 pr-3 text-right">{comp.net_available.toLocaleString()}</td>
              <td className="py-2 pr-3 text-right">
                <ShortfallCell value={comp.shortfall_qty} />
              </td>
              <td className="py-2 pr-3 text-muted-foreground">{comp.uom}</td>
              <td className="py-2">
                <StockStatusBadge status={comp.stock_status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
