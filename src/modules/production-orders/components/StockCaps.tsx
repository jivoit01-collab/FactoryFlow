import { cn } from '@/shared/utils';

import type { StockCap } from '../api';
import { qty } from '../utils/format';

/**
 * SAP refuses a finished-goods order (and a receipt into BH-PF) while the
 * finished stock it counts is over its limit. Shown as a bar each, so the
 * floor sees the limit coming before SAP refuses.
 */
export function StockCaps({ caps }: { caps: StockCap[] }) {
  // The order cap and the receipt cap on BH-PF read the same stock: show it once.
  const shown = caps.filter(
    (cap, index) =>
      caps.findIndex((other) => other.label === cap.label && other.litres === cap.litres) === index,
  );
  if (shown.length === 0) return null;
  return (
    <ul className="space-y-2" aria-label="SAP stock limits">
      {shown.map((cap) => {
        const share = Math.min(100, (Number(cap.litres) / Number(cap.limit)) * 100);
        const over = caps.some((other) => other.label === cap.label && other.over);
        return (
          <li key={cap.key} className="text-xs">
            <div className="flex justify-between gap-3">
              <span
                className={cn('text-muted-foreground', over && 'font-semibold text-destructive')}
              >
                {cap.label}
              </span>
              <span className="tabular-nums">
                {qty(cap.litres, 0)} / {qty(cap.limit, 0)} L
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full',
                  over ? 'bg-destructive' : share > 85 ? 'bg-amber-500' : 'bg-emerald-500',
                )}
                style={{ width: `${share}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
