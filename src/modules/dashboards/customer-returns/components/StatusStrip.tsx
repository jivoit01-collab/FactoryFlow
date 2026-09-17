import { Workflow } from 'lucide-react';

import { cn } from '@/shared/utils';

import { BASIS_LABELS, STATUS_TONE } from '../constants';
import type { ReturnsBasisRow, ReturnsStatusRow } from '../types';
import { percent } from '../utils/format';
import { ReturnsPanel } from './ReturnsPanel';

interface StatusStripProps {
  statuses: ReturnsStatusRow[];
  bases: ReturnsBasisRow[];
}

/**
 * Where the window's returns have got to, and what paperwork they came on.
 *
 * Counts of returns, not quantities — this panel answers "what is stuck", and a
 * return stuck before the gate has no quantity to weigh it by yet.
 */
export function StatusStrip({ statuses, bases }: StatusStripProps) {
  const total = statuses.reduce((sum, row) => sum + row.returns, 0);

  return (
    <ReturnsPanel
      title="Where they have got to"
      subtitle="Counting returns, not quantity — a return still on the road has no quantity yet"
      icon={Workflow}
      accent="cyan"
    >
      {total === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No returns in this window.
        </p>
      ) : (
        <>
          <ul className="space-y-1.5">
            {statuses.map((row) => (
              <li
                key={row.status}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors duration-150 hover:bg-background/70"
              >
                <span
                  className={cn(
                    'w-[150px] shrink-0 rounded-full px-2 py-0.5 text-center text-[11px] font-medium',
                    STATUS_TONE[row.status],
                  )}
                >
                  {row.label}
                </span>
                <div className="h-2 flex-1 rounded-full bg-muted/70">
                  <div
                    className="h-full rounded-full bg-foreground/25 transition-all duration-200"
                    style={{ width: `${Math.max(1.5, row.share)}%` }}
                  />
                </div>
                <span className="w-10 text-right text-sm font-semibold tabular-nums">
                  {row.returns}
                </span>
                <span className="w-14 text-right text-xs tabular-nums text-muted-foreground">
                  {percent(row.share)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap gap-2 border-t border-border/50 pt-3">
            {bases.map((row) => (
              <span
                key={row.basis}
                className="rounded-full bg-background/70 px-2.5 py-1 text-xs transition-colors duration-150 hover:bg-background"
                title={`${row.returns} of ${total} returns came back ${(
                  BASIS_LABELS[row.basis] ?? row.basis
                ).toLowerCase()}`}
              >
                {BASIS_LABELS[row.basis] ?? row.basis}
                <span className="ml-1.5 font-semibold tabular-nums">{row.returns}</span>
              </span>
            ))}
          </div>
        </>
      )}
    </ReturnsPanel>
  );
}
