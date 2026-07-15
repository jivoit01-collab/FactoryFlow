/**
 * Pure helpers for the BST → Warehouse Ops putaway bridge.
 *
 * Kept out of the component files so both the section and the dialog can share
 * the received-pallet shape and grouping without tripping react-refresh's
 * "only export components" rule.
 */
import type { BSTBoxScan } from '../../types';

/** A pallet accepted on a BST receive, ready to be put away into a WMS bin. */
export interface BstReceivedPallet {
  /** License plate (barcode `pallet_id`) — the WMS bridge keys on this. */
  palletCode: string;
  itemCode: string;
  itemName: string;
  batchNumber: string;
  uom: string;
  boxCount: number;
  /** Total units across the pallet's accepted boxes. */
  quantity: number;
  /** The pallet's current warehouse code (from the box scans). */
  warehouseCode: string;
}

/** Collapse the ACCEPTED, palletised box scans into one row per pallet. */
export function groupAcceptedPallets(scans: BSTBoxScan[]): BstReceivedPallet[] {
  const byPlate = new Map<string, BstReceivedPallet>();
  for (const scan of scans) {
    if (scan.receive_status !== 'ACCEPTED') continue;
    const plate = (scan.pallet_code || '').trim();
    if (!plate) continue; // loose boxes (no pallet) are out of scope
    const qty = Number(scan.quantity) || 0;
    const existing = byPlate.get(plate);
    if (existing) {
      existing.boxCount += 1;
      existing.quantity += qty;
    } else {
      byPlate.set(plate, {
        palletCode: plate,
        itemCode: scan.item_code,
        itemName: scan.item_name,
        batchNumber: scan.batch_number,
        uom: scan.uom,
        boxCount: 1,
        quantity: qty,
        warehouseCode: scan.warehouse_code,
      });
    }
  }
  // If a pallet's boxes carried no unit quantity, fall back to the box count so
  // the putaway engine still has a positive quantity to place.
  for (const pallet of byPlate.values()) {
    if (pallet.quantity <= 0) pallet.quantity = pallet.boxCount;
  }
  return [...byPlate.values()];
}
