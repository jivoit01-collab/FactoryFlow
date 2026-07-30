import type { FgStock, InvoiceLine } from '../types';

/**
 * Line items from the invoice payload — Item / Qty / In stock / Warehouse / Batches —
 * laid out for the approver to compare against physical stock at the warehouse.
 *
 * `fgStock` (live HANA on-hand, from OMS) is joined per line to surface the item
 * name and the warehouse's current stock next to the invoiced quantity. It only
 * covers FG lines, so non-FG rows simply show no name/stock.
 */
export function DocumentLinesTable({
  lines,
  fgStock,
}: {
  lines?: InvoiceLine[];
  fgStock?: FgStock[];
}) {
  if (!lines || lines.length === 0) {
    return <p className="text-sm text-muted-foreground">No line items on this invoice.</p>;
  }

  // Prefer a line_num join (unambiguous); fall back to item_code for older rows.
  const stockByLine = new Map<number, FgStock>();
  const stockByCode = new Map<string, FgStock>();
  for (const entry of fgStock ?? []) {
    if (entry.line_num != null) stockByLine.set(entry.line_num, entry);
    stockByCode.set(entry.item_code, entry);
  }

  const stockFor = (line: InvoiceLine): FgStock | undefined =>
    (line.LineNum != null ? stockByLine.get(line.LineNum) : undefined) ??
    stockByCode.get(line.ItemCode);

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Item</th>
            <th className="px-3 py-2 font-medium">Qty</th>
            <th className="px-3 py-2 font-medium">In stock</th>
            <th className="px-3 py-2 font-medium">Warehouse</th>
            <th className="px-3 py-2 font-medium">Batch(es)</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => {
            const stock = stockFor(line);
            const onHand = stock?.warehouse_stock;
            // Flag a line the warehouse can't cover so the approver catches it.
            const short = onHand != null && onHand < line.Quantity;
            return (
              <tr key={line.LineNum ?? index} className="border-t align-top">
                <td className="px-3 py-2">
                  <span className="font-medium">{line.ItemCode}</span>
                  {stock?.item_name ? (
                    <span className="block text-xs text-muted-foreground">{stock.item_name}</span>
                  ) : null}
                </td>
                <td className="px-3 py-2 tabular-nums">{line.Quantity}</td>
                <td
                  className={
                    short
                      ? 'px-3 py-2 font-medium tabular-nums text-red-600 dark:text-red-400'
                      : 'px-3 py-2 tabular-nums'
                  }
                >
                  {onHand != null ? onHand : '-'}
                </td>
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
