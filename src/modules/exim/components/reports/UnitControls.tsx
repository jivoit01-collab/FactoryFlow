import { useId } from 'react';

import { Switch } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { OIL_UNITS, type OilUnit, UNIT_SHORT } from './oilUnits';

/** The unit switch and the rounding toggle every oil read-out carries. */
export function UnitControls({
  unit,
  onUnitChange,
  rounded,
  onRoundedChange,
}: {
  unit: OilUnit;
  onUnitChange: (unit: OilUnit) => void;
  rounded: boolean;
  onRoundedChange: (rounded: boolean) => void;
}) {
  const roundId = useId();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex rounded-lg border bg-card p-0.5" role="group" aria-label="Unit">
        {OIL_UNITS.map((u) => (
          <button
            key={u}
            type="button"
            aria-pressed={unit === u}
            onClick={() => onUnitChange(u)}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              unit === u
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {UNIT_SHORT[u]}
          </button>
        ))}
      </div>
      <label htmlFor={roundId} className="flex items-center gap-2 text-sm text-muted-foreground">
        <Switch id={roundId} checked={rounded} onChange={onRoundedChange} />
        Round
      </label>
    </div>
  );
}
