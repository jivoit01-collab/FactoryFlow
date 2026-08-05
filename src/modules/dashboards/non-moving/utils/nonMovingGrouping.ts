import { FACTORY_WAREHOUSE_PREFIXES } from '../constants';
import type { NonMovingItem, WarehouseGroup, WarehouseSummary } from '../types';

interface GroupedNonMovingItem {
  item: NonMovingItem;
  warehouses: Set<string>;
}

function shouldUseMovementFrom(candidate: NonMovingItem, current: NonMovingItem): boolean {
  if (candidate.days_since_last_movement < current.days_since_last_movement) return true;
  return (
    candidate.days_since_last_movement === current.days_since_last_movement &&
    !current.last_movement_date &&
    Boolean(candidate.last_movement_date)
  );
}

export function groupNonMovingItemsBySku(items: NonMovingItem[]): NonMovingItem[] {
  const grouped = new Map<string, GroupedNonMovingItem>();

  for (const item of items) {
    const key = `${item.branch}::${item.item_code}`;
    const existing = grouped.get(key);

    if (!existing) {
      grouped.set(key, {
        item: { ...item },
        warehouses: new Set(item.warehouse ? [item.warehouse] : []),
      });
      continue;
    }

    existing.warehouses.add(item.warehouse);
    existing.item.quantity += item.quantity;
    existing.item.value += item.value;

    if (shouldUseMovementFrom(item, existing.item)) {
      existing.item.days_since_last_movement = item.days_since_last_movement;
      existing.item.last_movement_date = item.last_movement_date;
      existing.item.consumption_ratio = item.consumption_ratio;
    }
  }

  return [...grouped.values()].map(({ item, warehouses }) => {
    const warehouseList = [...warehouses].filter(Boolean);
    return {
      ...item,
      warehouse:
        warehouseList.length > 1
          ? `${warehouseList.length} warehouses`
          : (warehouseList[0] ?? item.warehouse),
    };
  });
}

/** `BH-WST` → `BH`; a code with no dash is its own prefix. */
export function isFactoryWarehouse(warehouse: string): boolean {
  const prefix = warehouse.split('-')[0]?.toUpperCase() ?? '';
  return (FACTORY_WAREHOUSE_PREFIXES as readonly string[]).includes(prefix);
}

/**
 * Report rows carry no warehouse, so the item-to-warehouse link lives only in
 * the backend's `warehouse_summary[].items` (pro-rated against current stock).
 * Resolve those codes against the rows the user can currently see, so each
 * warehouse row expands into exactly the items it counts.
 *
 * Only factory warehouses survive — C&F depots and the "Unassigned" bucket are
 * dropped, so the totals here are a subset of the meta cards.
 */
export function buildNonMovingWarehouseGroups(
  warehouseSummary: WarehouseSummary[],
  items: NonMovingItem[],
): WarehouseGroup[] {
  const itemsByCode = new Map<string, NonMovingItem>();

  for (const item of items) {
    const existing = itemsByCode.get(item.item_code);
    if (!existing) {
      itemsByCode.set(item.item_code, { ...item });
      continue;
    }
    if (shouldUseMovementFrom(item, existing)) {
      existing.days_since_last_movement = item.days_since_last_movement;
      existing.last_movement_date = item.last_movement_date;
      existing.consumption_ratio = item.consumption_ratio;
    }
  }

  const groups: WarehouseGroup[] = [];

  for (const warehouse of warehouseSummary) {
    if (!isFactoryWarehouse(warehouse.warehouse)) continue;

    // Older backends omit `items`; keep the row, just not expandable.
    if (!warehouse.items) {
      groups.push({ ...warehouse, items: [] });
      continue;
    }

    const rows: NonMovingItem[] = [];
    let totalQuantity = 0;
    let totalValue = 0;

    for (const entry of warehouse.items) {
      const item = itemsByCode.get(entry.item_code);
      if (!item) continue;

      rows.push({
        ...item,
        warehouse: warehouse.warehouse,
        quantity: entry.quantity,
        value: entry.value,
      });
      totalQuantity += entry.quantity;
      totalValue += entry.value;
    }

    if (rows.length === 0) continue;

    groups.push({
      warehouse: warehouse.warehouse,
      warehouse_name: warehouse.warehouse_name,
      item_count: rows.length,
      total_quantity: totalQuantity,
      total_value: totalValue,
      items: rows.sort((a, b) => b.value - a.value),
    });
  }

  return groups;
}
