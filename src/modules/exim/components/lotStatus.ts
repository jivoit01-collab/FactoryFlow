/**
 * What each oil lot status is called, what colour it wears, and the order a
 * lot moves through them. EXIM's own words and groupings, in this app's tones.
 */
import type { StatusTone } from '@/shared/components/page';

import type { LotStatus } from '../types';

export const LOT_STATUS_LABEL: Record<LotStatus, string> = {
  IN_CONTRACT: 'In contract',
  UNDER_LOADING: 'Under loading',
  ON_THE_SEA: 'On the sea',
  MUNDRA_PORT: 'Mundra port',
  KANDLA_STORAGE: 'Kandla storage',
  OTW_TO_REFINERY: 'On the way to refinery',
  AT_REFINERY: 'At refinery',
  ON_THE_WAY: 'On the way',
  OUT_SIDE_FACTORY: 'Outside factory',
  IN_TANK: 'In tank',
  IN_WAREHOUSE: 'In warehouse',
  COMPLETED: 'Completed',
  DELIVERED: 'Delivered',
  IN_TRANSIT: 'In transit',
  PENDING: 'Pending',
  PROCESSING: 'Processing',
};

/** The statuses a person can put a lot in: EXIM's screen offered exactly these. */
export const LOT_STATUS_CHOICES: LotStatus[] = [
  'IN_CONTRACT',
  'UNDER_LOADING',
  'ON_THE_SEA',
  'MUNDRA_PORT',
  'OTW_TO_REFINERY',
  'AT_REFINERY',
  'ON_THE_WAY',
  'OUT_SIDE_FACTORY',
  'IN_TANK',
  'IN_WAREHOUSE',
  'COMPLETED',
];

/** Tone by what the status means: waiting, moving, arrived, done. */
export const LOT_STATUS_TONE: Record<LotStatus, StatusTone> = {
  IN_CONTRACT: 'info',
  UNDER_LOADING: 'warn',
  ON_THE_SEA: 'progress',
  MUNDRA_PORT: 'progress',
  KANDLA_STORAGE: 'done',
  OTW_TO_REFINERY: 'progress',
  AT_REFINERY: 'warn',
  ON_THE_WAY: 'progress',
  OUT_SIDE_FACTORY: 'blocked',
  IN_TANK: 'done',
  IN_WAREHOUSE: 'done',
  COMPLETED: 'neutral',
  DELIVERED: 'neutral',
  IN_TRANSIT: 'progress',
  PENDING: 'neutral',
  PROCESSING: 'neutral',
};

/** EXIM's table order: what needs the gate's attention first, completed last. */
export const LOT_STATUS_ORDER: Record<LotStatus, number> = {
  OUT_SIDE_FACTORY: 0,
  ON_THE_WAY: 1,
  UNDER_LOADING: 2,
  AT_REFINERY: 3,
  OTW_TO_REFINERY: 4,
  KANDLA_STORAGE: 5,
  MUNDRA_PORT: 6,
  ON_THE_SEA: 7,
  IN_CONTRACT: 8,
  IN_TANK: 9,
  IN_WAREHOUSE: 10,
  DELIVERED: 11,
  IN_TRANSIT: 12,
  PENDING: 13,
  PROCESSING: 14,
  COMPLETED: 15,
};

/** Where the paid / unpaid mark matters: after a contract is loaded, before the tank. */
export const PAYMENT_STATUSES: LotStatus[] = ['ON_THE_WAY', 'UNDER_LOADING', 'OTW_TO_REFINERY', 'OUT_SIDE_FACTORY'];

/**
 * How a status change is made, as EXIM's edit screen decided it:
 *  - "move"     the whole lot changes status;
 *  - "dispatch" part of it leaves as a new lot (a truck loaded from a contract);
 *  - "arrive"   it joins the lot collecting arrivals at a refinery;
 *  - "into"     it is weighed into the tanks or a warehouse.
 * A status not listed lets the person choose between move and dispatch.
 */
export type LotMoveKind = 'move' | 'dispatch' | 'arrive' | 'into';

export function defaultMoveKind(to: LotStatus): LotMoveKind | null {
  if (to === 'AT_REFINERY') return 'arrive';
  if (to === 'IN_TANK' || to === 'IN_WAREHOUSE') return 'into';
  if (to === 'UNDER_LOADING' || to === 'OTW_TO_REFINERY') return 'dispatch';
  if (to === 'OUT_SIDE_FACTORY' || to === 'ON_THE_WAY' || to === 'MUNDRA_PORT' || to === 'COMPLETED') return 'move';
  return null;
}

/** The lot's journey, for the timeline on its page. */
export const LOT_JOURNEY: LotStatus[] = [
  'IN_CONTRACT',
  'UNDER_LOADING',
  'ON_THE_SEA',
  'MUNDRA_PORT',
  'OTW_TO_REFINERY',
  'AT_REFINERY',
  'ON_THE_WAY',
  'OUT_SIDE_FACTORY',
  'IN_TANK',
];
