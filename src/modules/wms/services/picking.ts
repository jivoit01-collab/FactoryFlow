/**
 * Pick planning (Step 8).
 *
 * Given an item and a quantity to pick, allocates it across the inventory lines
 * holding that item in the order dictated by the configured pick strategy
 * (FIFO / LIFO / FEFO), producing a directed pick sequence. Pure and testable;
 * the page walks the operator through the allocations and confirms each by scan.
 */
import type { InventoryRecord, PickStrategy } from '../types';

export interface PickAllocation {
  inventoryId: string;
  locationId: string;
  palletId: string | null;
  itemCode: string;
  itemName: string;
  lotNumber: string;
  expiryDate: string | null;
  quantity: number;
  /** Quantity available on this line (so a full-line pick can be detected). */
  available: number;
}

export interface PickPlan {
  allocations: PickAllocation[];
  /** How much of the request could NOT be fulfilled from stock. */
  shortBy: number;
}

function compare(strategy: PickStrategy, a: InventoryRecord, b: InventoryRecord): number {
  if (strategy === 'FEFO') {
    // Earliest expiry first; lines without an expiry sort last.
    if (a.expiryDate && b.expiryDate && a.expiryDate !== b.expiryDate) {
      return a.expiryDate < b.expiryDate ? -1 : 1;
    }
    if (a.expiryDate && !b.expiryDate) return -1;
    if (!a.expiryDate && b.expiryDate) return 1;
    return a.createdAt < b.createdAt ? -1 : 1;
  }
  if (strategy === 'LIFO') {
    return a.createdAt > b.createdAt ? -1 : 1;
  }
  // FIFO
  return a.createdAt < b.createdAt ? -1 : 1;
}

export function planPicks(params: {
  itemCode: string;
  quantity: number;
  inventory: InventoryRecord[];
  strategy: PickStrategy;
}): PickPlan {
  const candidates = params.inventory
    .filter((record) => record.itemCode === params.itemCode && record.quantity > 0)
    .sort((a, b) => compare(params.strategy, a, b));

  const allocations: PickAllocation[] = [];
  let remaining = params.quantity;
  for (const record of candidates) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, record.quantity);
    allocations.push({
      inventoryId: record.id,
      locationId: record.locationId,
      palletId: record.palletId,
      itemCode: record.itemCode,
      itemName: record.itemName,
      lotNumber: record.lotNumber,
      expiryDate: record.expiryDate,
      quantity: take,
      available: record.quantity,
    });
    remaining -= take;
  }

  return { allocations, shortBy: Math.max(0, remaining) };
}
