import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

import type { WarehouseSummary } from '../types';

interface InventoryAgeWarehouseSummaryProps {
  data: WarehouseSummary[];
}

function formatINR(value: number): string {
  return value.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function InventoryAgeWarehouseSummary({ data }: InventoryAgeWarehouseSummaryProps) {
  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Warehouse Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th scope="col" className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                  Warehouse
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                  Items
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                  Quantity
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                  Litres
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                  Value (₹)
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.warehouse} className="border-b transition-colors hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-medium">{row.warehouse}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {row.item_count.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {row.total_quantity.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {row.total_litres.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                    {formatINR(row.total_value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
