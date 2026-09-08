/** How long stock has stood still, for the Non-Moving panel and its dialog. */
import type { NonMovingItem } from '@/modules/dashboards/non-moving/types';

/**
 * The oldest thing in a warehouse — how long its worst line has sat.
 *
 * The board ranks warehouses by value, but the age of the worst item is what
 * makes one worth opening, so it rides alongside the money on every row.
 */
export function oldestDays(items: NonMovingItem[]): number {
  return items.reduce((max, item) => Math.max(max, item.days_since_last_movement), 0);
}
