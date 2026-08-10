import { Badge } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { AlarmState, ProcurementRow } from '../types';

/** Alarm styling. OVERDUE and ORDER_NOW are the only two that should read as
 *  urgent; NO_LEAD_TIME is amber because it is a data gap to chase, not a
 *  shortage — treating it as a shortage would send someone to the wrong problem. */
const ALARM_STYLE: Record<AlarmState, { label: string; className: string }> = {
  OVERDUE: { label: 'Overdue', className: 'bg-destructive text-destructive-foreground' },
  ORDER_NOW: { label: 'Order now', className: 'bg-orange-500 text-white' },
  NO_LEAD_TIME: { label: 'No lead time', className: 'bg-amber-500 text-white' },
  SCHEDULED: { label: 'Scheduled', className: 'bg-muted text-muted-foreground' },
  COVERED: { label: 'Covered', className: 'bg-emerald-600 text-white' },
};

function daysLabel(row: ProcurementRow): string {
  if (row.days_until_order_by === null) return '—';
  const d = row.days_until_order_by;
  if (d < 0) return `${Math.abs(d)}d late`;
  if (d === 0) return 'today';
  return `in ${d}d`;
}

export function ProcurementTable({ rows }: { rows: ProcurementRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="p-6 text-center text-sm text-muted-foreground">
        Nothing to procure for this plan.
      </p>
    );
  }

  return (
    // Wide table: scroll inside its own container so the page never scrolls sideways.
    <div className="overflow-x-auto">
      <table className="w-full min-w-[56rem] text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase text-muted-foreground">
            <th className="px-3 py-2 font-medium">Material</th>
            <th className="px-3 py-2 font-medium">Supplier</th>
            <th className="px-3 py-2 text-right font-medium">Short by</th>
            <th className="px-3 py-2 text-right font-medium">Order qty</th>
            <th className="px-3 py-2 text-right font-medium">Lead</th>
            <th className="px-3 py-2 font-medium">Order by</th>
            <th className="px-3 py-2 font-medium">Alarm</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const style = ALARM_STYLE[row.alarm];
            const urgent = row.alarm === 'OVERDUE' || row.alarm === 'ORDER_NOW';
            return (
              <tr
                key={row.item_code}
                className={cn('border-b last:border-0', urgent && 'bg-destructive/5')}
              >
                <td className="px-3 py-2">
                  <span className="font-medium">{row.item_code}</span>
                  {row.item_name && row.item_name !== row.item_code && (
                    <span className="block text-xs text-muted-foreground">{row.item_name}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{row.supplier_name || '—'}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.shortage_qty}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {row.order_qty}
                  {row.unit ? <span className="text-muted-foreground"> {row.unit}</span> : null}
                  {/* An order rounded up to MOQ is not the same number as the
                      shortage, and a buyer will ask why. */}
                  {row.order_qty !== row.shortage_qty && (
                    <span className="block text-xs text-muted-foreground">MOQ {row.moq}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {row.lead_time_days === null ? '—' : `${row.lead_time_days}d`}
                </td>
                <td className="px-3 py-2">
                  {row.order_by ? (
                    <>
                      <span className="tabular-nums">{row.order_by}</span>
                      <span className="block text-xs text-muted-foreground">{daysLabel(row)}</span>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-3 py-2">
                  <Badge className={style.className}>{style.label}</Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
