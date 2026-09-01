import { Bolt, HardHat, Users, Wrench } from 'lucide-react';

import type { ExpenseBucketKey } from '../types';

/**
 * One identity per bucket: the icon, the wall colour and the words used for it.
 *
 * The four hexes are picked to stay separable at 4 m on a dark screen and to
 * survive the light theme — amber for power, teal for people, violet for
 * salary, rose for the thing that breaks.
 */
export const BUCKET_META: Record<
  ExpenseBucketKey,
  { label: string; icon: typeof Users; hex: string; source: string }
> = {
  LABOUR: {
    label: 'Labour',
    icon: HardHat,
    hex: '#14b8a6',
    source: 'Gate in — headcount × configured day rate',
  },
  SALARY: {
    label: 'Salary',
    icon: Users,
    hex: '#8b5cf6',
    source: 'Department salary configuration, accrued daily',
  },
  ELECTRICITY: {
    label: 'Electricity',
    icon: Bolt,
    hex: '#f59e0b',
    source: 'Maintenance — Daily Electricity readings',
  },
  MAINTENANCE: {
    label: 'Maintenance',
    icon: Wrench,
    hex: '#f43f5e',
    source: 'Spares consumed + material indents committed',
  },
};

/** The order the tiles and trend series are drawn in. */
export const BUCKET_ORDER: ExpenseBucketKey[] = [
  'LABOUR',
  'SALARY',
  'ELECTRICITY',
  'MAINTENANCE',
];

/** Fallback poll interval until the board reports the configured one. */
export const DEFAULT_REFRESH_MS = 60_000;

/** React Query staleness — a wall board wants fresh, not cached. */
export const BOARD_STALE_TIME = 20_000;

export const CONFIG_STALE_TIME = 60_000;
