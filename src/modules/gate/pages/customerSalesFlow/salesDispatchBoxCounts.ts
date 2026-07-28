import type {
  SalesDispatchGateOut,
  SalesDispatchGateOutDocument,
  SalesDispatchItem,
} from '@/modules/gate/api';

const PACK_SIZE_PATTERN = /(\d+(?:\.\d+)?)\s*(?:PCS?|SETS?|TINS?|BOTTLES?)\b/gi;

export function getExpectedDispatchBoxes(entry?: SalesDispatchGateOut | null) {
  if (!entry) return 0;

  const entryTotal = parsePositiveNumber(entry.total_boxes);
  if (entryTotal > 0) return entryTotal;

  const documentTotal = sumPositiveValues(
    entry.documents?.map((document) => getExpectedDocumentBoxes(document)) || [],
  );
  if (documentTotal > 0) return documentTotal;

  return sumPositiveValues(getExpectedItems(entry).map((item) => getExpectedItemBoxes(item)));
}

export function getExpectedDocumentBoxes(document?: SalesDispatchGateOutDocument | null) {
  if (!document) return 0;

  const documentTotal = parsePositiveNumber(document.total_boxes);
  if (documentTotal > 0) return documentTotal;

  return sumPositiveValues((document.items || []).map((item) => getExpectedItemBoxes(item)));
}

export function getExpectedItemBoxes(item?: SalesDispatchItem | null) {
  if (!item) return 0;

  const itemTotal = parsePositiveNumber(item.total_boxes);
  if (itemTotal > 0) return itemTotal;

  const quantity = parsePositiveNumber(item.quantity);
  if (quantity <= 0) return 0;

  const packSize = parsePackSize(item.item_name);
  // Weight/loose lines (e.g. "CARTON 1 LTR", "... 15 KGS") have no PCS-style pack size;
  // count one box per invoiced unit instead of 0 so they aren't invisible to the box
  // total and a genuinely short load can't read as fully scanned. Mirrors the backend
  // (_expected_item_boxes in sales_dispatch_gatepass.py).
  if (packSize <= 0) return Math.ceil(quantity);

  return Math.ceil(quantity / packSize);
}

// Sum the expected boxes over an explicit list of lines. Used when the lines have been
// pre-processed (e.g. grouped by item code) so the total is derived from the same rows the
// UI shows, rather than re-reading the document's raw lines.
export function getExpectedItemsBoxes(items: SalesDispatchItem[]) {
  return sumPositiveValues(items.map((item) => getExpectedItemBoxes(item)));
}

export function parsePositiveNumber(value?: string | number | null) {
  const normalized =
    typeof value === 'string' ? value.replace(/,/g, '').trim() : String(value ?? '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function getExpectedItems(entry: SalesDispatchGateOut) {
  if (entry.items?.length) return entry.items;
  return entry.documents?.flatMap((document) => document.items || []) || [];
}

function parsePackSize(itemName?: string | null) {
  const matches = [...String(itemName || '').matchAll(PACK_SIZE_PATTERN)];
  const lastMatch = matches[matches.length - 1];
  return parsePositiveNumber(lastMatch?.[1]);
}

function sumPositiveValues(values: number[]) {
  return values.reduce((sum, value) => (value > 0 ? sum + value : sum), 0);
}
