/**
 * How the page writes its figures: whole boxes, litres and quantities; tons
 * and pallets to two places, because one SKU on one day is often a fraction of
 * a pallet.
 */

import { formatNumber } from '@/shared/utils';

export const fmtWhole = (value: number) => formatNumber(value, 0);
export const fmtTon = (value: number) => formatNumber(value, 2);
export const fmtPallet = (value: number) => formatNumber(value, 2);

/** A share as a percentage, or a dash when there is nothing to divide by. */
export function fmtShare(share: number | null): string {
  return share === null ? '—' : `${formatNumber(share * 100, 0)}%`;
}
