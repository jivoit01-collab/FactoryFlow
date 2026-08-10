import { Badge } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { CapacityLine } from '../types';

/** Utilisation bar. Capped at 100% width so an over-capacity line does not
 *  overflow its card — the number beside it carries the real value. */
function UtilisationBar({ percent, feasible }: { percent: number; feasible: boolean }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn('h-full rounded-full', feasible ? 'bg-emerald-500' : 'bg-destructive')}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );
}

export function CapacityPanel({ lines }: { lines: CapacityLine[] }) {
  if (lines.length === 0) {
    return (
      <p className="p-6 text-center text-sm text-muted-foreground">
        No production is required from any line for this plan.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {lines.map((line) => {
        const percent = Number(line.utilisation_percent);
        return (
          <div key={line.machine_id} className="rounded-md border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-medium">{line.machine_id}</span>
                {line.name && (
                  <span className="text-muted-foreground"> · {line.name}</span>
                )}
                {line.location && (
                  <span className="text-xs text-muted-foreground"> ({line.location})</span>
                )}
              </div>
              <Badge
                className={
                  line.feasible ? 'bg-emerald-600 text-white' : 'bg-destructive text-white'
                }
              >
                {line.feasible ? 'Fits' : `Short ${line.shortfall_hours}h`}
              </Badge>
            </div>

            <div className="mt-2">
              <UtilisationBar percent={percent} feasible={line.feasible} />
            </div>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="tabular-nums">
                {line.required_hours}h needed of {line.usable_hours}h usable
              </span>
              <span className="tabular-nums">{line.utilisation_percent}% utilised</span>
              <span>{line.sku_count} SKU(s)</span>
              {/* Changeover is charged against the line, and it is the difference
                  between "fits" and "does not" on a tight plan. */}
              {Number(line.changeover_hours) > 0 && (
                <span className="tabular-nums">{line.changeover_hours}h changeover</span>
              )}
              {!line.feasible && line.alternates_available.length > 0 && (
                <span>Alternates: {line.alternates_available.join(', ')}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
