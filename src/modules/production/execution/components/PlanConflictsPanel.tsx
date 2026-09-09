import { CalendarClock, Copy, PackageX, ShieldCheck } from 'lucide-react';

import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

import type { PlanCheckConflict, PlanConflictType } from '../types';

interface PlanConflictsPanelProps {
  conflicts: PlanCheckConflict[];
  /** Hidden entirely until a SKU and quantity make the check meaningful. */
  checked: boolean;
}

const KIND: Record<PlanConflictType, { label: string; icon: typeof CalendarClock }> = {
  LINE_BUSY: { label: 'Line already booked', icon: CalendarClock },
  DUPLICATE_SKU: { label: 'Same SKU planned twice', icon: Copy },
  MATERIAL_CONTENTION: { label: 'Material claimed twice', icon: PackageX },
};

const ORDER: PlanConflictType[] = ['MATERIAL_CONTENTION', 'LINE_BUSY', 'DUPLICATE_SKU'];

/**
 * What this plan runs into elsewhere on the day.
 *
 * All of these are warnings, never blocks. Two runs on one line across a shift
 * is ordinary scheduling, and only the supervisor can say whether a particular
 * pair is a mistake — so the screen names the other run and lets them decide.
 */
export function PlanConflictsPanel({ conflicts, checked }: PlanConflictsPanelProps) {
  if (!checked) return null;

  const grouped = ORDER.map((type) => ({
    type,
    items: conflicts.filter((c) => c.type === type),
  })).filter((group) => group.items.length > 0);

  return (
    <Card className={conflicts.length > 0 ? 'border-amber-300 dark:border-amber-900' : undefined}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          Clashes with other plans
          {conflicts.length > 0 ? (
            <Badge className="bg-amber-100 text-amber-900 border-0 text-xs font-normal dark:bg-amber-950 dark:text-amber-300">
              {conflicts.length} to review
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs font-normal">
              None
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {conflicts.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Nothing else is booked on this line in this window, and no other plan wants the same
            material.
          </p>
        ) : (
          <div className="space-y-4">
            {grouped.map((group) => {
              const meta = KIND[group.type];
              const Icon = meta.icon;
              return (
                <div key={group.type}>
                  <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
                    <Icon className="h-3.5 w-3.5" />
                    {meta.label}
                  </p>
                  <ul className="space-y-1.5">
                    {group.items.map((conflict, index) => (
                      <li
                        key={`${conflict.type}-${conflict.run_id ?? conflict.item_code ?? index}`}
                        className="rounded-md border bg-muted/30 px-3 py-2 text-sm"
                      >
                        <p>{conflict.message}</p>
                        {conflict.window_unknown && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            One of the two runs has no start and finish time, so an overlap could
                            not be checked — it is unproven, not ruled out.
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
