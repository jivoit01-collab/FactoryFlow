import { HardHat, Moon, Sun, UserRoundX } from 'lucide-react';

import {
  ControlEmpty,
  ControlError,
  ControlScrollList,
  ControlSection,
  ControlSkeletonRows,
} from '@/modules/dashboards/warehouse-control/components';
import { formatCount } from '@/modules/dashboards/warehouse-control/utils/format';
import type { LabourGateEntry } from '@/modules/gate/api/labourGate/labourGate.api';
import { cn } from '@/shared/utils';

import { PANEL_ACCENT } from '../constants';
import type { LabourSummary } from '../utils';

export interface LabourPanelProps {
  labour: LabourSummary;
  loading: boolean;
  isFetching: boolean;
  error: unknown;
  onRetry: () => void;
  className?: string;
}

function ContractorRow({ entry }: { entry: LabourGateEntry }) {
  const out = entry.total_out || 0;

  return (
    <li className="px-3 py-2 transition-colors hover:bg-muted/40">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {entry.contractor_name || `Contractor ${entry.contractor}`}
          </p>
          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            {entry.shift === 'NIGHT' ? (
              <Moon className="h-3 w-3 shrink-0" />
            ) : (
              <Sun className="h-3 w-3 shrink-0" />
            )}
            {entry.shift === 'NIGHT' ? 'Night' : 'Day'} · {entry.department_name}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums">
            {formatCount(entry.count_in)}
            <span className="ml-1 text-xs font-normal text-muted-foreground">in</span>
          </p>
          {out > 0 && (
            <p className="text-xs tabular-nums text-muted-foreground">
              {formatCount(out)} left · {formatCount(entry.remaining)} inside
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

function Tile({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Sun;
  tone?: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border bg-muted/30 px-3 py-2">
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Icon className="h-3 w-3 shrink-0" />
        <span className="truncate">{label}</span>
      </p>
      <p className={cn('mt-0.5 text-lg font-semibold tabular-nums', tone)}>{value}</p>
    </div>
  );
}

/**
 * Labour on the Production floor today, from the gate's own in/out tally.
 *
 * The headline is people booked IN, because that is what the gate actually
 * records and what labour is costed on. "Still inside" rides alongside it, since
 * on a floor that runs two shifts the two diverge through the day.
 *
 * The unallocated tile is the important one. Roughly 60% of gate entries carry
 * no department, so the Production figure is only the labour someone has
 * actually assigned — a board that showed it alone would understate the floor
 * and nobody would know why. Naming the pool turns a wrong number into a
 * qualified one.
 */
export function LabourPanel({
  labour,
  loading,
  isFetching,
  error,
  onRetry,
  className,
}: LabourPanelProps) {
  const { shifts } = labour;

  return (
    <ControlSection
      className={className}
      id="labour"
      title="Production Labour"
      description="Casual labour booked in to Production at the gate today"
      meta={
        loading
          ? undefined
          : `${formatCount(labour.productionIn)} in · ${formatCount(labour.contractors)} contractor${labour.contractors === 1 ? '' : 's'}`
      }
      icon={HardHat}
      accent={PANEL_ACCENT.labour}
      isFetching={isFetching && !loading}
      action={{ label: 'Labour gate', to: '/gate/labour-gate' }}
    >
      {error ? (
        <ControlError
          error={error}
          fallback="Today's labour gate entries could not be read."
          onRetry={onRetry}
        />
      ) : loading ? (
        <ControlSkeletonRows rows={4} />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
            <Tile label="Day shift" value={formatCount(shifts.day)} icon={Sun} />
            <Tile label="Night shift" value={formatCount(shifts.night)} icon={Moon} />
            <Tile
              label="Still inside"
              value={formatCount(labour.productionInside)}
              icon={HardHat}
            />
            <Tile
              label="No department"
              value={formatCount(labour.unallocatedIn)}
              icon={UserRoundX}
              tone={labour.unallocatedIn > 0 ? 'text-amber-600 dark:text-amber-400' : undefined}
            />
          </div>

          {labour.entries.length === 0 ? (
            <ControlEmpty message="No labour has been booked in to Production today." />
          ) : (
            <ControlScrollList grow>
              {labour.entries.map((entry) => (
                <ContractorRow key={entry.id} entry={entry} />
              ))}
            </ControlScrollList>
          )}

          {/* The gap between what Production shows and what the gate counted is
              the whole caveat on this panel, so it is stated rather than left
              for someone to discover by adding the tiles up. */}
          {labour.unallocatedIn > 0 && (
            <p className="shrink-0 text-xs leading-relaxed text-muted-foreground">
              {formatCount(labour.totalIn)} labourers came through the gate today and{' '}
              {formatCount(labour.unallocatedIn)} were booked in without a department, so some of
              the Production floor is not counted above. Allocating them at the gate is what closes
              the gap.
            </p>
          )}
        </div>
      )}
    </ControlSection>
  );
}
