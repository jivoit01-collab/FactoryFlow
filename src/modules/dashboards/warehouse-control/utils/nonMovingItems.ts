/** The items behind the Non-Moving panel's warehouse rows, rolled into one list. */
import type { WarehouseGroup } from '@/modules/dashboards/non-moving/types';

/** One item, totalled across every in-scope warehouse holding it. */
export interface NonMovingItemRow {
  itemCode: string;
  itemName: string;
  subGroup: string;
  quantity: number;
  value: number;
  /** The longest this item has stood still in any one warehouse. */
  days: number;
  /** How many warehouses are holding it. */
  warehouses: number;
  /** The warehouse code, when only one holds it — otherwise empty. */
  warehouse: string;
}

/**
 * Every non-moving item across the warehouses the panel is drawing, longest
 * stuck first.
 *
 * The board ranks *warehouses* by value, which answers "where" but never
 * "what" — so the same feed is rolled up a second way here to fill the space
 * under the warehouse rows. An item sitting in two warehouses is one row: its
 * quantity and value add up, but its age takes the WORST of the two rather than
 * a sum or a mean, because how long the oldest pile has stood is the thing that
 * makes the line worth chasing.
 *
 * Ordering matches `NonMovingDetailDialog` — days before value, so a cheap item
 * untouched for a year outranks an expensive one that moved last week.
 */
export function rollUpNonMovingItems(warehouses: WarehouseGroup[]): NonMovingItemRow[] {
  const rows = new Map<string, NonMovingItemRow & { codes: Set<string> }>();

  for (const warehouse of warehouses) {
    for (const item of warehouse.items) {
      // A blank item code is possible in the SAP feed; fall back to the name so
      // two unrelated unnamed lines don't collapse into one row.
      const key = item.item_code?.trim() || item.item_name?.trim();
      if (!key) continue;

      const existing = rows.get(key);
      if (existing) {
        existing.quantity += item.quantity;
        existing.value += item.value;
        existing.days = Math.max(existing.days, item.days_since_last_movement);
        existing.itemName ||= item.item_name?.trim() ?? '';
        existing.subGroup ||= item.sub_group?.trim() ?? '';
        existing.codes.add(warehouse.warehouse);
      } else {
        rows.set(key, {
          itemCode: item.item_code?.trim() ?? '',
          itemName: item.item_name?.trim() ?? '',
          subGroup: item.sub_group?.trim() ?? '',
          quantity: item.quantity,
          value: item.value,
          days: item.days_since_last_movement,
          warehouses: 0,
          warehouse: '',
          codes: new Set([warehouse.warehouse]),
        });
      }
    }
  }

  return [...rows.values()]
    .map(({ codes, ...row }) => ({
      ...row,
      warehouses: codes.size,
      warehouse: codes.size === 1 ? [...codes][0] : '',
    }))
    .sort((a, b) => b.days - a.days || b.value - a.value);
}
