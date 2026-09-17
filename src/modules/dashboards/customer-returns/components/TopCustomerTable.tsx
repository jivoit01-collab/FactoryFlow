import { Users } from 'lucide-react';

import type { ReturnsPalette } from '../constants';
import type { ReturnsCustomerRow } from '../types';
import { compactMoney, exactQty, percent } from '../utils/format';
import { ConditionBar } from './ConditionBar';
import { ReturnsPanel } from './ReturnsPanel';

interface TopCustomerTableProps {
  rows: ReturnsCustomerRow[];
  palette: ReturnsPalette;
}

/**
 * Who is sending it back.
 *
 * A customer whose truck is at the gate with nothing keyed in yet still appears,
 * with a zero quantity and an empty condition track. That row is the point: it is
 * the paperwork gap, and dropping it would make the board look tidier than the
 * returns desk actually is.
 */
export function TopCustomerTable({ rows, palette }: TopCustomerTableProps) {
  return (
    <ReturnsPanel
      title="Who is sending it back"
      subtitle="Ranked by quantity returned in the window"
      icon={Users}
      accent="teal"
    >
      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No returns in this window.
        </p>
      ) : (
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-2 pb-2 font-medium">Customer</th>
                <th className="px-2 pb-2 text-right font-medium">Returns</th>
                <th className="px-2 pb-2 text-right font-medium">Qty back</th>
                <th className="px-2 pb-2 text-right font-medium">Share</th>
                <th className="px-2 pb-2 font-medium">Condition</th>
                <th className="px-2 pb-2 text-right font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.customer_code || row.customer_name}
                  className="border-t border-border/50 transition-colors duration-150 hover:bg-background/70"
                >
                  <td className="max-w-[240px] px-2 py-2.5">
                    <p className="truncate text-sm font-medium" title={row.customer_name}>
                      {row.customer_name || '(unnamed)'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-mono">{row.customer_code || '—'}</span>
                      {row.skus > 0 && (
                        <span className="ml-2">
                          {row.skus} SKU{row.skus === 1 ? '' : 's'}
                        </span>
                      )}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-right text-sm font-semibold tabular-nums">
                    {row.returns}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-right text-sm tabular-nums">
                    {row.lines === 0 ? (
                      <span
                        className="text-xs text-muted-foreground"
                        title="The truck is logged but no returning items have been keyed in yet"
                      >
                        not keyed in
                      </span>
                    ) : (
                      exactQty(row.quantity)
                    )}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-right text-xs tabular-nums text-muted-foreground">
                    {percent(row.share)}
                  </td>
                  <td className="w-[150px] px-2 py-2.5">
                    <ConditionBar conditions={row.conditions} palette={palette} />
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-right text-sm tabular-nums text-muted-foreground">
                    {compactMoney(row.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ReturnsPanel>
  );
}
