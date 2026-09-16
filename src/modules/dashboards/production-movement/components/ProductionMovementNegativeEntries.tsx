import { ArrowUpFromLine, Loader2, X } from 'lucide-react';
import { useMemo } from 'react';

import { Badge } from '@/shared/components/ui';

import type { ProductionMovementItem } from '../types';

interface ProductionMovementNegativeEntriesProps {
  items: ProductionMovementItem[];
  isLoading?: boolean;
  onClose?: () => void;
}

const numberFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 3,
});

function formatDate(value: string): string {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function ProductionMovementNegativeEntries({
  items,
  isLoading,
  onClose,
}: ProductionMovementNegativeEntriesProps) {
  const outwardItems = useMemo(
    () =>
      items
        .filter((item) => item.direction === 'OUT')
        .sort((a, b) => b.quantity - a.quantity),
    [items],
  );

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <h3 className="flex items-center gap-2 font-semibold">
          <ArrowUpFromLine className="h-4 w-4 text-rose-600" />
          Entries Behind Negative Net Qty
        </h3>
        <div className="flex items-center gap-3">
          {isLoading && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading...
            </div>
          )}
          {onClose && (
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted"
              onClick={onClose}
              aria-label="Close negative net quantity entries"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-5 py-3 text-left font-medium">Date</th>
              <th className="px-5 py-3 text-left font-medium">Item Code</th>
              <th className="px-5 py-3 text-left font-medium">Item Name</th>
              <th className="px-5 py-3 text-left font-medium">Warehouse</th>
              <th className="px-5 py-3 text-right font-medium">Out Qty</th>
              <th className="px-5 py-3 text-left font-medium">Type</th>
              <th className="px-5 py-3 text-left font-medium">Reference</th>
            </tr>
          </thead>
          <tbody>
            {outwardItems.length === 0 && !isLoading ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
                  No outward entries found.
                </td>
              </tr>
            ) : (
              outwardItems.map((item, index) => (
                <tr
                  key={`${item.date}-${item.item_code}-${item.warehouse}-${item.doc_num}-${index}`}
                  className="border-t"
                >
                  <td className="whitespace-nowrap px-5 py-3">{formatDate(item.date)}</td>
                  <td className="whitespace-nowrap px-5 py-3 font-mono text-xs">
                    {item.item_code}
                  </td>
                  <td className="min-w-64 px-5 py-3 font-medium">{item.item_name}</td>
                  <td className="whitespace-nowrap px-5 py-3">
                    <div className="font-medium">{item.warehouse}</div>
                    <div className="text-xs text-muted-foreground">{item.warehouse_name}</div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right font-medium tabular-nums">
                    {numberFormatter.format(item.quantity)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3">
                    <Badge variant="outline" className="border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400">
                      OUT
                    </Badge>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {item.transaction_label}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3">
                    <div>{item.reference || '--'}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.doc_num ? `Doc ${item.doc_num}` : ''}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
