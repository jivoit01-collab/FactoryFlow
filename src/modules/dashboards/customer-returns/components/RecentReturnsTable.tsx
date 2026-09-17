import { ChevronRight, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { cn } from '@/shared/utils';

import { BASIS_LABELS, STATUS_TONE } from '../constants';
import type { ReturnsRecentRow } from '../types';
import { dayLabel, exactQty } from '../utils/format';
import { ReturnsPanel } from './ReturnsPanel';

/**
 * The individual returns behind every figure above, newest first.
 *
 * Every row opens the return itself. A board that can only be read is a board
 * whose reader has to go and find the entry number by hand, and the one thing
 * somebody does after spotting a bad SKU is open the returns it came back on.
 */
export function RecentReturnsTable({ rows }: { rows: ReturnsRecentRow[] }) {
  const navigate = useNavigate();

  return (
    <ReturnsPanel
      title="The returns behind these figures"
      subtitle="Newest first — click any row to open it"
      icon={ClipboardList}
      accent="indigo"
    >
      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No returns in this window.
        </p>
      ) : (
        <div className="-mx-2 max-h-[420px] overflow-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead className="sticky top-0 bg-background/95 backdrop-blur">
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-2 pb-2 font-medium">Entry</th>
                <th className="px-2 pb-2 font-medium">Customer</th>
                <th className="px-2 pb-2 font-medium">Basis</th>
                <th className="px-2 pb-2 font-medium">Date</th>
                <th className="px-2 pb-2 text-right font-medium">Lines</th>
                <th className="px-2 pb-2 text-right font-medium">Qty</th>
                <th className="px-2 pb-2 font-medium">Status</th>
                <th className="w-6 px-2 pb-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="group/row cursor-pointer border-t border-border/50 transition-colors duration-150 hover:bg-background/70"
                  onClick={() => navigate(`/returns/customer/${row.id}`)}
                >
                  <td className="whitespace-nowrap px-2 py-2.5 font-mono text-xs font-medium">
                    {row.entry_no}
                  </td>
                  <td className="max-w-[200px] px-2 py-2.5">
                    <p className="truncate text-sm" title={row.customer_name}>
                      {row.customer_name || row.customer_code || '—'}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-xs text-muted-foreground">
                    {BASIS_LABELS[row.basis] ?? row.basis}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-xs">
                    {dayLabel(row.arrived_on)}
                    <span
                      className="ml-1.5 text-muted-foreground"
                      title={
                        row.has_arrived
                          ? 'The day the truck was marked in at the gate'
                          : 'The day the return was booked — the truck has not arrived yet'
                      }
                    >
                      {row.has_arrived ? 'arrived' : 'booked'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-right text-sm tabular-nums">
                    {row.lines}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-right text-sm tabular-nums">
                    {row.lines === 0 ? '—' : exactQty(row.quantity)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-medium',
                        STATUS_TONE[row.status],
                      )}
                    >
                      {row.status_label}
                    </span>
                  </td>
                  <td className="px-2 py-2.5">
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/row:opacity-100" />
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
