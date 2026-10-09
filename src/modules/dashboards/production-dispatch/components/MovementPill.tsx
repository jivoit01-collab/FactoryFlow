import { StatusPill } from '@/shared/components/page';

import type { Movement } from '../types';

/** FAST reads as done, SLOW as a warning: stock building up. */
export function MovementPill({ movement }: { movement: Movement }) {
  return (
    <StatusPill tone={movement === 'FAST' ? 'done' : 'warn'} dot>
      {movement}
    </StatusPill>
  );
}
