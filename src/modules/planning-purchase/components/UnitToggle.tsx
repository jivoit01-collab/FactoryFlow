import { cn } from '@/shared/utils';

import type { PlanUnit } from '../types';
import { UNIT_LABEL } from './format';

const OPTIONS: { value: PlanUnit; label: string; hint: string }[] = [
  {
    value: 'LITRES',
    label: 'Litres',
    hint: 'Volume, from the item master (SalPackUn). What the business plans in.',
  },
  {
    value: 'PIECES',
    label: 'Pieces',
    hint: 'Single bottles or tins. The unit SAP actually stores the plan in.',
  },
  {
    value: 'CASES',
    label: 'Cases',
    hint: 'Cartons, from pieces per case. What the floor counts.',
  },
];

/**
 * Switches every quantity in the module between litres, pieces and cases.
 *
 * All three units come back on the same response, so switching costs no request.
 * It is a toggle rather than a fixed unit because the audiences genuinely differ:
 * SAP stores pieces, planning reads litres, the floor counts cases — and the same
 * plan is 3.1 million, 4.5 million or 257 thousand depending on which you mean.
 *
 * `compact` is the header form: a segmented control showing just the unit
 * abbreviation, small enough to sit beside the page actions where a global
 * control belongs.
 */
export function UnitToggle({
  unit,
  onChange,
  className,
  compact = false,
}: {
  unit: PlanUnit;
  onChange: (unit: PlanUnit) => void;
  className?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div
        className={cn(
          'inline-flex items-center overflow-hidden rounded-md border bg-card',
          className,
        )}
        role="group"
        aria-label="Show quantities in"
      >
        <span className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
          Show in
        </span>
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            title={option.hint}
            aria-pressed={unit === option.value}
            className={cn(
              'border-l px-3 py-1.5 text-xs transition-colors',
              unit === option.value
                ? 'bg-primary text-primary-foreground font-medium'
                : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {UNIT_LABEL[option.value]}
          </button>
        ))}
      </div>
    );
  }

  const active = OPTIONS.find((option) => option.value === unit);

  return (
    <div className={className}>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">Show quantities in</p>
      <div className="flex gap-1">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            title={option.hint}
            className={cn(
              'rounded border px-3 py-1.5 text-xs transition-colors',
              unit === option.value
                ? 'border-primary bg-primary/10 font-medium text-primary'
                : 'border-border text-muted-foreground hover:bg-muted',
            )}
          >
            {option.label}
            <span className="ml-1 opacity-60">{UNIT_LABEL[option.value]}</span>
          </button>
        ))}
      </div>
      {active ? (
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{active.hint}</p>
      ) : null}
    </div>
  );
}
