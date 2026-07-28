import type { BSTTransferItem } from '../../types';

// Packaging-material item-code prefix. PM lines aren't barcode-tracked, so a BST
// never requires them to be scanned. Mirrors the backend `is_pm_item_code`
// (warehouse.services.bst_service) so the FE gating can't drift from the API.
export function isPmItemCode(itemCode?: string | null): boolean {
  return !!itemCode && itemCode.trim().toUpperCase().startsWith('PM');
}

// Pack size embedded in an item name, e.g. "COLD PRESS 1 LTR 20 PCS" -> 20.
// Mirrors the dispatch flow's salesDispatchBoxCounts.ts and the backend
// _PACK_SIZE_RE so BST box counts match the docking scan page.
const PACK_SIZE_PATTERN = /(\d+(?:\.\d+)?)\s*(?:PCS?|SETS?|TINS?|BOTTLES?)\b/gi;

function parsePositive(value?: string | number | null): number {
  const normalized =
    typeof value === 'string' ? value.replace(/,/g, '').trim() : String(value ?? '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function parsePackSize(itemName?: string | null): number {
  const matches = [...String(itemName || '').matchAll(PACK_SIZE_PATTERN)];
  const last = matches[matches.length - 1];
  return parsePositive(last?.[1]);
}

/**
 * Boxes to scan for a BST line: the stored `expected_boxes`, else a fallback of
 * quantity / pack-size parsed from the item name. The fallback covers transfers
 * created before the box count was resolved on the backend, and invoices whose
 * SAP box total (U_UNE_TOTB) isn't maintained — both of which would otherwise
 * show "0 boxes" on the scan page.
 */
export function expectedBstItemBoxes(
  item: Pick<BSTTransferItem, 'expected_boxes' | 'quantity' | 'item_name'>,
): number {
  if ((item.expected_boxes ?? 0) > 0) return item.expected_boxes;
  const quantity = parsePositive(item.quantity);
  const packSize = parsePackSize(item.item_name);
  if (quantity <= 0 || packSize <= 0) return 0;
  return Math.ceil(quantity / packSize);
}
