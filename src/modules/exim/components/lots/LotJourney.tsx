/**
 * Where a lot is on its way from contract to tank: EXIM's status timeline, as a
 * row of steps (three to a line on a phone) rather than a strip that scrolls.
 *
 * Every step before the lot's own counts as passed, as EXIM drew it; a lot does
 * not visit every one (a truck loaded from a contract never goes to sea). A step
 * the lot's history shows it entering carries the day it did.
 */
import { Check } from 'lucide-react';

import { cn, formatDay } from '@/shared/utils';

import type { LotStatus } from '../../types';
import { LOT_JOURNEY, LOT_STATUS_LABEL } from '../lotStatus';

/** Statuses off the drawn line, placed on the step they stand for. */
const STANDS_FOR: Partial<Record<LotStatus, LotStatus>> = {
  KANDLA_STORAGE: 'MUNDRA_PORT',
  IN_WAREHOUSE: 'IN_TANK',
};

const PAST_THE_END: LotStatus[] = ['COMPLETED', 'DELIVERED'];

export function LotJourney({
  status,
  dates,
}: {
  status: LotStatus;
  dates: Partial<Record<LotStatus, string>>;
}) {
  const shown = STANDS_FOR[status] ?? status;
  const current = PAST_THE_END.includes(status) ? LOT_JOURNEY.length : LOT_JOURNEY.indexOf(shown);

  return (
    <ol className="grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-9">
      {LOT_JOURNEY.map((step, index) => {
        const passed = current > index;
        const here = current === index;
        const name = here && step !== status ? LOT_STATUS_LABEL[status] : LOT_STATUS_LABEL[step];
        const date = dates[here ? status : step];
        return (
          <li
            key={step}
            className="flex flex-col items-center gap-1.5 text-center"
            aria-current={here ? 'step' : undefined}
          >
            <span
              className={cn(
                'grid h-8 w-8 place-items-center rounded-full border-2 text-xs font-semibold',
                passed && 'border-primary bg-primary text-primary-foreground',
                here && 'border-primary bg-primary/10 text-primary ring-4 ring-primary/15',
                !passed && !here && 'border-muted-foreground/30 text-muted-foreground',
              )}
            >
              {passed ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
            </span>
            <span
              className={cn(
                'text-xs leading-tight',
                here ? 'font-semibold text-foreground' : 'text-muted-foreground',
              )}
            >
              {name}
            </span>
            {date && <span className="text-xs text-muted-foreground">{formatDay(date)}</span>}
          </li>
        );
      })}
    </ol>
  );
}
