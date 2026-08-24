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
 * Switches every quantity on the page between litres, pieces and cases.
 *
 * All three come back on the same response, so switching costs no request. It is
 * a toggle rather than a fixed unit because the three audiences genuinely differ:
 * SAP stores pieces, planning reads litres, and the floor counts cases — and the
 * same plan is 3.1 million, 4.5 million or 257 thousand depending on which you
 * mean.
 */
export function UnitToggle({
  unit,
  onChange,
  className,
}: {
  unit: PlanUnit;
  onChange: (unit: PlanUnit) => void;
  className?: string;
}) {
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
