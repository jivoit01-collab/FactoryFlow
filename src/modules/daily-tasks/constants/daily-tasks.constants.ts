import { CalendarClock, Clock, type LucideIcon, Settings2, Zap } from 'lucide-react';

import { type Accent, ACCENTS } from '@/shared/components/dashboard';

import type { Cadence } from '../types';

/** The sheet must feel live, so it refreshes faster than the 5-minute app default. */
export const MY_SHEET_STALE_MS = 60_000;

/** The board is ~42 aggregate queries server-side — left to explicit refetch. */
export const TEAM_BOARD_STALE_MS = 2 * 60_000;

/** Rows shown before the board paginates. 88 users arrive in one payload today. */
export const TEAM_BOARD_PAGE_SIZE = 50;

export interface CadenceMeta {
  title: string;
  blurb: string;
  icon: LucideIcon;
  accent: Accent;
  /** Whether jobs in this group count toward the tally. */
  counted: boolean;
}

/**
 * Display order is deliberate: what you are expected to do comes before what merely
 * happened. Counted cadences carry an accent colour, uncounted ones are slate — that
 * single choice does most of the work of signalling what the tally covers.
 */
export const CADENCE_ORDER: readonly Cadence[] = ['DAILY', 'SHIFT', 'EVENT', 'PERIODIC'] as const;

export const CADENCE_META: Record<Cadence, CadenceMeta> = {
  DAILY: {
    title: 'Every day',
    blurb: 'Expected on a normal working day.',
    icon: CalendarClock,
    accent: ACCENTS.blue,
    counted: true,
  },
  SHIFT: {
    title: 'Once per shift',
    blurb: 'Expected once for each shift worked.',
    icon: Clock,
    accent: ACCENTS.indigo,
    counted: true,
  },
  EVENT: {
    title: 'When it happens',
    blurb: 'Only exists when something triggers it — a vehicle arrives, a machine breaks.',
    icon: Zap,
    accent: ACCENTS.slate,
    counted: false,
  },
  PERIODIC: {
    title: 'When something changes',
    blurb: 'Master data and settings. Not a daily job.',
    icon: Settings2,
    accent: ACCENTS.slate,
    counted: false,
  },
};
