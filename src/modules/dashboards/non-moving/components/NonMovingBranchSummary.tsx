import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

import type { BranchSummary } from '../types';

interface NonMovingBranchSummaryProps {
  branches: BranchSummary[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function NonMovingBranchSummary({ branches }: NonMovingBranchSummaryProps) {
  if (branches.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Branch Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th scope="col" className="px-4 py-2 text-left font-medium text-muted-foreground">Branch</th>
                <th scope="col" className="px-4 py-2 text-right font-medium text-muted-foreground">Items</th>
                <th scope="col" className="px-4 py-2 text-right font-medium text-muted-foreground">Quantity</th>
                <th scope="col" className="px-4 py-2 text-right font-medium text-muted-foreground">Value</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b.branch} className="border-b transition-colors hover:bg-muted/30">
                  <td className="px-4 py-2 font-medium">{b.branch}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {b.item_count.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {b.total_quantity.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatCurrency(b.total_value)}
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
