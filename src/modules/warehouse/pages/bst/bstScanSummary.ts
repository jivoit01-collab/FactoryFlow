import type { BSTBoxScan, BSTTransferItem } from '../../types';
import { expectedBstItemBoxes, isPmItemCode } from './bstBoxCounts';

/** One aggregated bill line (per item code) with its live scanned progress. */
export interface BstBillLine {
  itemCode: string;
  itemName: string;
  uom: string;
  expectedQty: number;
  expectedBoxes: number;
  scannedQty: number;
  scannedBoxes: number;
  /** False for packaging-material (PM) lines, which never require box scanning. */
  requiresScan: boolean;
  hasScans: boolean;
  complete: boolean;
  over: boolean;
  /** Units over the bill (qty, or boxes in the legacy box-count fallback). */
  overBy: number;
  progressPercent: number | null;
}

/** A scanned item that is on no line of the bill (defensive — blocked on scan). */
export interface BstOffBillLine {
  itemCode: string;
  itemName: string;
  uom: string;
  qty: number;
  boxes: number;
}

export interface BstBillSummary {
  lines: BstBillLine[];
  offBill: BstOffBillLine[];
  /** True when any scan carries a quantity — completeness is judged on quantity. */
  usesQuantity: boolean;
  /** Bill quantity across the scan-required (non-PM) lines. */
  expectedQty: number;
  /** Pieces scanned, every label included (off-bill too). */
  scannedQty: number;
  /** Boxes to scan across ALL lines (PM included — its count is informational). */
  expectedBoxes: number;
  /** Labels scanned, off-bill included. */
  scannedBoxes: number;
  offBillBoxes: number;
  /** Whole-bill state over the scan-required lines. */
  status: 'Open' | 'Partial' | 'Complete';
  /** Overall progress, in the unit completeness is judged in. Capped at 100. */
  progressPercent: number;
}

export function trimBstQty(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)));
}

export function formatBstNumber(value: number): string {
  return value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

/**
 * Tally a BST's scans against its combined SAP bill. A BST entry can span
 * several SAP documents and its scans carry no document reference, so lines are
 * aggregated by item code across all documents.
 *
 * Completeness is judged on QUANTITY — scanned pieces vs the bill's line quantity
 * — the same rule the backend uses to gate sealing (compute_scan_status). Quantity
 * is ground truth on both sides (the SAP line qty; each box's own piece count), so
 * a box whose qty is wrong (e.g. a 4-pack labelled as 1) is caught as a shortfall
 * even though the box COUNT looks right. Only when no scan carries a quantity
 * (legacy scans) does it fall back to the box-count estimate. The "Over" / off-bill
 * results are defensive and shouldn't normally appear.
 */
export function summarizeBstBill(items: BSTTransferItem[], scans: BSTBoxScan[]): BstBillSummary {
  type Tally = { qty: number; boxes: number; itemName: string; uom: string };
  const scannedByItem = new Map<string, Tally>();
  for (const s of scans) {
    const cur = scannedByItem.get(s.item_code) ?? {
      qty: 0,
      boxes: 0,
      itemName: s.item_name,
      uom: s.uom,
    };
    cur.qty += Number(s.quantity) || 0;
    cur.boxes += 1;
    scannedByItem.set(s.item_code, cur);
  }

  // Quantity is the ground truth whenever any scan carries one; only legacy /
  // quantity-less loads fall back to the box-count estimate. Mirrors the backend.
  const usesQuantity = scans.some((s) => (Number(s.quantity) || 0) > 0);

  // Aggregate the bill by item code across all documents.
  type BillLine = { expected: number; qty: number; uom: string; itemName: string };
  const billByItem = new Map<string, BillLine>();
  for (const it of items) {
    const cur = billByItem.get(it.item_code) ?? {
      expected: 0,
      qty: 0,
      uom: it.uom,
      itemName: it.item_name,
    };
    cur.expected += expectedBstItemBoxes(it);
    cur.qty += Number(it.quantity) || 0;
    billByItem.set(it.item_code, cur);
  }

  const lines: BstBillLine[] = [...billByItem.entries()].map(([code, bill]) => {
    const scanned = scannedByItem.get(code);
    const scannedQty = scanned?.qty ?? 0;
    const boxes = scanned?.boxes ?? 0;
    const expectedBoxes = bill.expected;
    const expectedQty = bill.qty;
    // Packaging material (PM) isn't scanned on a BST — never short, never
    // "Open"; mirrors the backend's requires_scan exemption.
    const requiresScan = !isPmItemCode(code);
    // Completeness on QUANTITY when trustworthy, else the box-count estimate.
    const complete = usesQuantity
      ? expectedQty > 0 && scannedQty >= expectedQty
      : expectedBoxes > 0 && boxes >= expectedBoxes;
    const over = usesQuantity
      ? expectedQty > 0 && scannedQty > expectedQty
      : expectedBoxes > 0 && boxes > expectedBoxes;
    const progressPercent = !requiresScan
      ? null
      : usesQuantity
        ? expectedQty > 0
          ? Math.min(100, Math.round((scannedQty / expectedQty) * 100))
          : null
        : expectedBoxes > 0
          ? Math.min(100, Math.round((boxes / expectedBoxes) * 100))
          : null;
    return {
      itemCode: code,
      itemName: bill.itemName,
      uom: bill.uom,
      expectedQty,
      expectedBoxes,
      scannedQty,
      scannedBoxes: boxes,
      requiresScan,
      hasScans: boxes > 0,
      complete,
      over,
      overBy: usesQuantity ? scannedQty - expectedQty : boxes - expectedBoxes,
      progressPercent,
    };
  });

  const billCodes = new Set(billByItem.keys());
  const offBill: BstOffBillLine[] = [...scannedByItem.entries()]
    .filter(([code]) => !billCodes.has(code))
    .map(([code, tally]) => ({
      itemCode: code,
      itemName: tally.itemName,
      uom: tally.uom,
      qty: tally.qty,
      boxes: tally.boxes,
    }));

  const scanLines = lines.filter((line) => line.requiresScan);
  const expectedQty = scanLines.reduce((total, line) => total + line.expectedQty, 0);
  const scannedQty = scans.reduce((total, s) => total + (Number(s.quantity) || 0), 0);
  const expectedBoxes = lines.reduce((total, line) => total + line.expectedBoxes, 0);
  const status: BstBillSummary['status'] =
    scanLines.length > 0 && scanLines.every((line) => line.complete)
      ? 'Complete'
      : scans.length > 0
        ? 'Partial'
        : 'Open';
  const progressPercent =
    usesQuantity && expectedQty > 0
      ? Math.min(100, Math.round((scannedQty / expectedQty) * 100))
      : expectedBoxes > 0
        ? Math.min(100, Math.round((scans.length / expectedBoxes) * 100))
        : 0;

  return {
    lines,
    offBill,
    usesQuantity,
    expectedQty,
    scannedQty,
    expectedBoxes,
    scannedBoxes: scans.length,
    offBillBoxes: offBill.reduce((total, line) => total + line.boxes, 0),
    status,
    progressPercent,
  };
}
