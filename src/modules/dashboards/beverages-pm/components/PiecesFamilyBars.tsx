import { cn } from '@/shared/utils';

import { formatInrCompact, formatQtyCompact } from '../../packing-material/utils';
import type { PiecesRow } from '../utils';

export interface PiecesFamilyBarsProps {
  /** The rows the store and unit filters keep — NOT the family filter. */
  rows: PiecesRow[];
  selected: string[];
  onToggle: (family: string) => void;
}

interface FamilyTotal {
  family: string;
  pcs: number;
  value: number;
  items: number;
  unconverted: number;
}

/**
 * Pieces by packaging family — bottles, caps, labels, cartons — for whatever
 * the stores selected above hold. Worked out from the rows rather than taken
 * from the response's company-wide split, so picking a store re-reads it.
 * Each bar is a filter on the table.
 */
export function PiecesFamilyBars({ rows, selected, onToggle }: PiecesFamilyBarsProps) {
  const byFamily = new Map<string, FamilyTotal>();
  for (const row of rows) {
    const family = row.item.sub_group;
    const entry = byFamily.get(family) ?? { family, pcs: 0, value: 0, items: 0, unconverted: 0 };
    entry.items += 1;
    entry.value += row.value;
    if (row.pcs === null) entry.unconverted += 1;
    else entry.pcs += row.pcs;
    byFamily.set(family, entry);
  }
  const families = [...byFamily.values()].sort((a, b) => b.pcs - a.pcs || b.value - a.value);
  const total = families.reduce((sum, family) => sum + family.pcs, 0);
  const leader = families.length ? families[0].pcs : 0;

  return (
    <section className="flex min-h-0 flex-col rounded-2xl border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold">By family</h3>
      <p className="mb-3 text-xs text-muted-foreground">Pieces per packaging family. Click to filter.</p>
      {families.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nothing to split.</p>
      ) : (
        <ul className="-mx-1 min-h-0 flex-1 space-y-1 overflow-y-auto px-1">
          {families.map((family) => {
            const active = selected.includes(family.family);
            return (
              <li key={family.family}>
                <button
                  type="button"
                  onClick={() => onToggle(family.family)}
                  aria-pressed={active}
                  className={cn(
                    'w-full rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted/50',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    active && 'bg-primary/10',
                    selected.length > 0 && !active && 'opacity-60',
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{family.family}</span>
                    <span className="shrink-0 tabular-nums">
                      {formatQtyCompact(family.pcs)}
                      <span className="ml-1 text-xs text-muted-foreground">
                        {total ? `${((family.pcs / total) * 100).toFixed(1)}%` : ''}
                      </span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/60"
                      style={{ width: `${leader ? (family.pcs / leader) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                    {family.items} items · {formatInrCompact(family.value)}
                    {family.unconverted > 0 && ` · ${family.unconverted} not in pcs`}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
