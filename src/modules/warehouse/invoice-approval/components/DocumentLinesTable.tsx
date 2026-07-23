import type { InvoiceLine } from '../types';

/**
 * Line items from the invoice payload — Item / Qty / Warehouse / Batches — laid out
 * for the approver to compare against physical stock at the warehouse.
 */
export function DocumentLinesTable({ lines }: { lines?: InvoiceLine[] }) {
  if (!lines || lines.length === 0) {
    return <p className="text-sm text-muted-foreground">No line items on this invoice.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Item</th>
            <th className="px-3 py-2 font-medium">Qty</th>
            <th className="px-3 py-2 font-medium">Warehouse</th>
            <th className="px-3 py-2 font-medium">Batch(es)</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr key={line.LineNum ?? index} className="border-t align-top">
              <td className="px-3 py-2 font-medium">{line.ItemCode}</td>
              <td className="px-3 py-2 tabular-nums">{line.Quantity}</td>
              <td className="px-3 py-2">{line.WarehouseCode ?? '-'}</td>
              <td className="px-3 py-2">
                {line.BatchNumbers && line.BatchNumbers.length > 0 ? (
                  <ul className="space-y-0.5">
                    {line.BatchNumbers.map((batch, i) => (
                      <li key={`${batch.BatchNumber}-${i}`} className="tabular-nums">
                        <span className="font-mono text-xs">{batch.BatchNumber}</span>
                        <span className="text-muted-foreground"> × {batch.Quantity}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  '-'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
