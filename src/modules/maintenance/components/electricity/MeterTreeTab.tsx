import { AlertTriangle, Coins, Pencil, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button, Card, CardContent } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { TreeMeter } from '../../types';
import { fmtDate, trimFactor } from './electricityFormat';
import { MeterFormDialog, type MeterFormTarget } from './MeterFormDialog';
import { MeterSetupDialog } from './MeterSetupDialog';

interface MeterTreeTabProps {
  meters: TreeMeter[];
  isLoading: boolean;
  canManageMeters: boolean;
  canManageAllocation: boolean;
  /** Whether this user keeps the meter (and so may edit its hardware facts). */
  keeps: (meterId: number) => boolean;
}

/**
 * The campus's meters as the tree they are: each under the meter it is a
 * sub-meter of, with who pays for what it reads that its sub-meters do not.
 */
export function MeterTreeTab({
  meters,
  isLoading,
  canManageMeters,
  canManageAllocation,
  keeps,
}: MeterTreeTabProps) {
  const [formTarget, setFormTarget] = useState<MeterFormTarget | null>(null);
  const [setupMeter, setSetupMeter] = useState<TreeMeter | null>(null);

  // The list arrives in tree order (depth-first, second registers straight
  // after their meter), so it renders as it comes.
  const inTree = useMemo(() => meters.filter((m) => m.tree?.in_service), [meters]);
  const outOfTree = useMemo(() => meters.filter((m) => !m.tree?.in_service), [meters]);
  const unplaced = useMemo(() => inTree.filter((m) => m.tree?.unplaced), [inTree]);
  const undecided = useMemo(
    () => inTree.filter((m) => m.register_of == null && !m.tree?.unplaced && m.tree?.setup?.basis === 'UNASSIGNED'),
    [inTree],
  );
  const childCount = useMemo(() => {
    const counts = new Map<number, number>();
    for (const meter of inTree) {
      const parent = meter.tree?.parent;
      if (parent != null && meter.register_of == null) counts.set(parent, (counts.get(parent) ?? 0) + 1);
    }
    return counts;
  }, [inTree]);

  const row = (meter: TreeMeter) => {
    const depth = meter.tree?.depth ?? 0;
    const setup = meter.tree?.setup;
    const isRegister = meter.register_of != null;
    const subMeters = childCount.get(meter.id) ?? 0;
    return (
      <div key={meter.id} className={cn('flex items-stretch gap-1', !meter.is_active && 'opacity-60')}>
        {Array.from({ length: depth }).map((_, index) => (
          <span key={index} className="ml-3 w-px shrink-0 bg-border" aria-hidden="true" />
        ))}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 border-b py-2.5 pl-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate font-medium">{meter.name}</span>
              {meter.is_main && !isRegister && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                  Main{meter.supply_source_display ? ` · ${meter.supply_source_display}` : ''}
                </span>
              )}
              {isRegister && (
                <span
                  className="rounded-full border border-dashed px-2 py-0.5 text-xs text-muted-foreground"
                  title="Read beside its meter and never counted — the same electricity measured a second way"
                >
                  Second register of {meter.register_of_name}
                </span>
              )}
              {meter.tree?.unplaced && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800 dark:bg-red-900/40 dark:text-red-200">
                  Not placed
                </span>
              )}
              {!meter.is_active && (
                <span className="rounded-full border px-1.5 py-0.5 text-[10px] text-muted-foreground">Inactive</span>
              )}
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {[meter.location, meter.meter_number, `MF ×${trimFactor(meter.multiplying_factor)}`]
                .filter(Boolean)
                .join(' · ')}
              {subMeters > 0 && ` · ${subMeters} sub-meter${subMeters === 1 ? '' : 's'}`}
            </p>
          </div>

          {!isRegister && (
            <div className="min-w-[220px] max-w-[420px] text-sm">
              {setup ? (
                <>
                  <p
                    className={cn(
                      'truncate',
                      setup.basis === 'UNASSIGNED' && 'font-medium text-amber-700 dark:text-amber-300',
                    )}
                    title={setup.summary}
                  >
                    {subMeters > 0 ? 'The rest: ' : ''}
                    {setup.summary}
                  </p>
                  <p className="text-xs text-muted-foreground">since {fmtDate(setup.effective_from)}</p>
                </>
              ) : (
                <p className="text-amber-700 dark:text-amber-300">Nobody pays for it yet</p>
              )}
            </div>
          )}

          <div className="flex gap-1">
            {!isRegister && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSetupMeter(meter)}
                title={canManageAllocation ? 'Where it sits and who pays' : 'See where it sits and who pays'}
              >
                <Coins className="mr-1 h-3.5 w-3.5" /> Who pays
              </Button>
            )}
            {canManageMeters && keeps(meter.id) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                aria-label={`Edit ${meter.name}`}
                onClick={() => setFormTarget({ meter })}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {canManageMeters && !isRegister && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                aria-label={`Add a sub-meter under ${meter.name}`}
                title="Add a sub-meter under this one"
                onClick={() => setFormTarget({ meter: null, parentId: meter.id })}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {(unplaced.length > 0 || undecided.length > 0) && (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardContent className="space-y-1 p-4 text-sm text-amber-900 dark:text-amber-200">
            <p className="flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4" /> Part of the electricity is nobody's yet
            </p>
            {unplaced.length > 0 && (
              <p>
                Read but not placed in the tree: {unplaced.map((m) => m.name).join(', ')}. Until each is put under
                its parent it counts as a main meter of its own, and its units are unassigned.
              </p>
            )}
            {undecided.length > 0 && (
              <p>
                Nobody is set to pay for the own units of {undecided.map((m) => m.name).join(', ')} — they show as
                unassigned on the split.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-200/80 shadow-sm dark:border-border">
        <CardContent className="p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">The meter tree</p>
              <p className="text-xs text-muted-foreground">
                Each meter pays only for what it reads that its sub-meters do not. Every unit on a main meter lands in
                exactly one account.
              </p>
            </div>
            {canManageMeters && (
              <Button size="sm" onClick={() => setFormTarget({ meter: null })}>
                <Plus className="mr-1 h-4 w-4" /> Add a meter
              </Button>
            )}
          </div>
          {isLoading ? (
            <p className="p-6 text-center text-muted-foreground">Loading meters…</p>
          ) : inTree.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground">No meter is in the tree yet.</p>
          ) : (
            <div>{inTree.map(row)}</div>
          )}
        </CardContent>
      </Card>

      {outOfTree.length > 0 && (
        <Card className="border-slate-200/80 shadow-sm dark:border-border">
          <CardContent className="p-4">
            <p className="mb-2 text-sm font-medium">Not in the tree today</p>
            <p className="mb-2 text-xs text-muted-foreground">
              Taken out of service, not started yet, or never read.
            </p>
            <div>{outOfTree.map(row)}</div>
          </CardContent>
        </Card>
      )}

      <MeterFormDialog
        target={formTarget}
        meters={meters}
        onClose={() => setFormTarget(null)}
        // Whoever may decide the split is asked straight away; a keeper who
        // may not leaves it "not decided", and the banner above says so.
        onCreated={(created) => {
          if (canManageAllocation) setSetupMeter(created);
        }}
      />
      <MeterSetupDialog
        meter={setupMeter}
        meters={meters}
        canEdit={canManageAllocation}
        onClose={() => setSetupMeter(null)}
      />
    </div>
  );
}
