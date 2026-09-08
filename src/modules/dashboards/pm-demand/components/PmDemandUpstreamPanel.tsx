import { Info } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui';

import type { PmDemandUpstreamItem } from '../types';
import { formatInr, formatQty } from '../utils';

interface PmDemandUpstreamPanelProps {
  items: PmDemandUpstreamItem[];
  warehouses?: string[];
}

/**
 * The blowing line's own packaging consumption.
 *
 * Preforms issued at the blow-moulding line BECOME the PET bottles the filling
 * line then consumes, so these figures deliberately sit outside every total on
 * this board -- adding them in would count the same packaging twice, once as a
 * preform and again as a bottle. Leaving them out entirely would be worse
 * still: by piece count this is the plant's single largest packaging movement,
 * and preforms are bought while the bottles they become are not.
 *
 * The panel hides itself when the company has no blowing line configured.
 */
export function PmDemandUpstreamPanel({ items, warehouses }: PmDemandUpstreamPanelProps) {
  if (items.length === 0) return null;

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Blowing line — upstream stage</CardTitle>
        <CardDescription>
          Preforms consumed at {warehouses?.join(', ') || 'the blowing line'} to make the
          bottles the filling line then uses
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-2 rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Counted apart from every figure above. These preforms become the PET bottles
            already counted as consumption, so adding the two together would count the same
            packaging at two stages.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs uppercase text-muted-foreground">
                <th className="py-2 text-left font-medium">Item</th>
                <th className="px-3 py-2 text-right font-medium">Consumed</th>
                <th className="px-3 py-2 text-right font-medium">Value</th>
                <th className="px-3 py-2 text-right font-medium">Share</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.item_code} className="border-b last:border-0">
                  <td className="py-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {item.item_code}
                    </span>
                    <div className="max-w-[20rem] truncate font-medium">
                      {item.item_name || '--'}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatQty(item.consumed_qty, item.uom)}
                  </td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">
                    {formatInr(item.consumed_value)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {item.share_pct.toFixed(1)}%
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
