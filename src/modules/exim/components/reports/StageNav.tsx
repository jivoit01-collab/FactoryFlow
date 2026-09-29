import { Link } from 'react-router-dom';

import { cn } from '@/shared/utils';

import type { LotStatus } from '../../types';
import { LOT_STATUS_LABEL } from '../lotStatus';
import { STAGE_SEQUENCE, stagePath } from './oilUnits';

/**
 * The stages in the order oil moves through them, to step from one breakdown
 * to the next. Wraps rather than scrolls, so a phone never scrolls sideways.
 */
export function StageNav({ current }: { current: LotStatus }) {
  const stages = STAGE_SEQUENCE.includes(current) ? STAGE_SEQUENCE : [...STAGE_SEQUENCE, current];
  return (
    <nav aria-label="Stages" className="flex flex-wrap gap-1.5">
      {stages.map((status) => (
        <Link
          key={status}
          to={stagePath(status)}
          aria-current={status === current ? 'page' : undefined}
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            status === current
              ? 'border-primary bg-primary text-primary-foreground'
              : 'bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground',
          )}
        >
          {LOT_STATUS_LABEL[status]}
        </Link>
      ))}
    </nav>
  );
}
