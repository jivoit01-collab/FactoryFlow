/** Permanent colour legend for the warehouse map (Step 5). */
import { DISPLAY_STATUS_META } from '../services';
import type { DisplayStatus } from '../services';

const ORDER: DisplayStatus[] = [
  'EMPTY',
  'PARTIAL',
  'NEARLY_FULL',
  'FULL',
  'RESERVED',
  'BLOCKED',
  'MAINTENANCE',
  'DISABLED',
];

const HATCH = 'repeating-linear-gradient(45deg, rgba(0,0,0,0.18) 0 3px, transparent 3px 6px)';

export function MapLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {ORDER.map((status) => {
        const meta = DISPLAY_STATUS_META[status];
        return (
          <span key={status} className="flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-sm border border-black/10"
              style={{ backgroundColor: meta.color, backgroundImage: meta.hatch ? HATCH : undefined }}
            />
            {meta.label}
          </span>
        );
      })}
    </div>
  );
}
