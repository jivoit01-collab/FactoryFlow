import type {
  SalesDispatchGateOut,
  SalesDispatchGateOutDocument,
  SalesDispatchItem,
} from '@/modules/gate/api';

// A CSD SKU names itself: "... 1 LTR 16 PCS ( CSD )", "MUSTARD OIL 100 MLS 20 PCS(CSD)".
const CSD_PATTERN = /\bCSD\b/i;

/**
 * How one invoiced line breaks down, exactly as the SAP bill prints it.
 *
 * SAP's invoice layout is fed by the HANA procedure CRYSTAL_AR_INVOICE_ITEMS, which
 * splits a line with `SalFactor2`: `SalFactor2 = 1` means the item is NOT transacted in
 * boxes, so it prints 0 boxes and the whole quantity as loose pieces ("0 Box 500.00 PCS"
 * for 500 bottles of FG0000381). CSD stock is the exception — it also carries
 * SalFactor2 = 1, but there one box IS the billed piece, so it stays box-counted.
 *
 * Mirrors gate_core/services/box_packing.py. Never parse the item name for a pack size:
 * names state the physical bottle count, not how the goods are transacted.
 */
export interface LinePacking {
  boxes: number;
  loose: number;
  /** Pieces per box, or null when the item ships loose. */
  piecesPerBox: number | null;
}

export function getPiecesPerBox(item?: SalesDispatchItem | null): number | null {
  const factor = parsePositiveNumber(item?.sal_factor2);
  if (factor > 1) return factor;
  if (CSD_PATTERN.test(String(item?.item_name || ''))) return 1;
  return null;
}

export function getItemPacking(item?: SalesDispatchItem | null): LinePacking {
  const piecesPerBox = getPiecesPerBox(item);
  if (!item) return { boxes: 0, loose: 0, piecesPerBox };

  // The backend stores the split it computed in SQL when the bill was read from SAP;
  // trust it and only derive when it's absent (rows written before the split existed).
  const storedBoxes = parsePositiveNumber(item.total_boxes);
  const storedLoose = parsePositiveNumber(item.total_loose);
  if (storedBoxes > 0 || storedLoose > 0) {
    return { boxes: storedBoxes, loose: storedLoose, piecesPerBox };
  }

  const quantity = parsePositiveNumber(item.quantity);
  if (quantity <= 0) return { boxes: 0, loose: 0, piecesPerBox };
  if (piecesPerBox === null) return { boxes: 0, loose: quantity, piecesPerBox };
  if (piecesPerBox === 1) return { boxes: Math.ceil(quantity), loose: 0, piecesPerBox };

  const boxes = Math.floor(quantity / piecesPerBox);
  return { boxes, loose: quantity - boxes * piecesPerBox, piecesPerBox };
}

/**
 * How much of a bill's invoiced quantity ONE physical box covers.
 *
 * The invoice's unit is not always a piece. A CSD bill counts BOXES — a line reading 4
 * means four cartons, even though each carton holds 20 bottles and its label declares
 * qty = 20. So a CSD box is worth 1 here whatever it holds; every other box is worth its
 * pieces. Mirrors box_packing.box_invoice_units on the backend.
 */
export function getBoxInvoiceUnits(item: SalesDispatchItem | null | undefined, boxQuantity: number) {
  return getPiecesPerBox(item) === 1 ? 1 : boxQuantity;
}

/**
 * True when one physical box carries a whole pack of the item.
 *
 * A box packed short — or dismantled, keeping its barcode while pieces were pulled out as
 * loose stock — declares fewer pieces than SalFactor2. It covers the bill's printed LOOSE
 * remainder, not one of its BOXES: a 4-piece box on a line invoicing 116 boxes + 4 loose is
 * the loose 4, so counting it as a box read "116 / 116 boxes" with 16 pieces still on the
 * floor. Items with no pack size (loose) and CSD stock (one box IS the billed piece) have no
 * part-box notion. Mirrors box_packing.is_full_box on the backend.
 */
export function isFullBox(item: SalesDispatchItem | null | undefined, boxQuantity: number) {
  const piecesPerBox = getPiecesPerBox(item);
  if (piecesPerBox === null || piecesPerBox <= 1) return true;
  return boxQuantity >= piecesPerBox;
}

/** True when the bill counts this item in boxes rather than pieces (CSD stock). */
export function isBoxCountedItem(item?: SalesDispatchItem | null) {
  return getPiecesPerBox(item) === 1;
}

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

/** Loose pieces on the whole load — the goods the box count deliberately excludes. */
export function getExpectedDispatchLoose(entry?: SalesDispatchGateOut | null) {
  if (!entry) return 0;

  const entryTotal = parsePositiveNumber(entry.total_loose);
  if (entryTotal > 0) return entryTotal;

  const documentTotal = sumPositiveValues(
    entry.documents?.map((document) => getExpectedDocumentLoose(document)) || [],
  );
  if (documentTotal > 0) return documentTotal;

  return sumPositiveValues(getExpectedItems(entry).map((item) => getExpectedItemLoose(item)));
}

export function getExpectedDocumentBoxes(document?: SalesDispatchGateOutDocument | null) {
  if (!document) return 0;

  const documentTotal = parsePositiveNumber(document.total_boxes);
  if (documentTotal > 0) return documentTotal;

  return sumPositiveValues((document.items || []).map((item) => getExpectedItemBoxes(item)));
}

export function getExpectedDocumentLoose(document?: SalesDispatchGateOutDocument | null) {
  if (!document) return 0;

  const documentTotal = parsePositiveNumber(document.total_loose);
  if (documentTotal > 0) return documentTotal;

  return sumPositiveValues((document.items || []).map((item) => getExpectedItemLoose(item)));
}

/**
 * Full boxes to scan on one line — 0 for a line that ships loose.
 *
 * A loose line is not "no goods": its pieces are counted by getExpectedItemLoose and its
 * completeness is judged on invoiced QUANTITY (the backend's per-(bill, item) check),
 * which is what the operator scans against when SAP states no box size. Counting one box
 * per piece here — the old behaviour for any name without an "N PCS" token — is what
 * turned a 500-bottle line into "0 / 500 boxes" against the 3 cartons that exist.
 */
export function getExpectedItemBoxes(item?: SalesDispatchItem | null) {
  return getItemPacking(item).boxes;
}

export function getExpectedItemLoose(item?: SalesDispatchItem | null) {
  return getItemPacking(item).loose;
}

/** True when a line carries no countable boxes at all, so it must be counted in pieces. */
export function isLooseItem(item?: SalesDispatchItem | null) {
  return getItemPacking(item).piecesPerBox === null;
}

// Sum the expected boxes over an explicit list of lines. Used when the lines have been
// pre-processed (e.g. grouped by item code) so the total is derived from the same rows the
// UI shows, rather than re-reading the document's raw lines.
export function getExpectedItemsBoxes(items: SalesDispatchItem[]) {
  return sumPositiveValues(items.map((item) => getExpectedItemBoxes(item)));
}

export function getExpectedItemsLoose(items: SalesDispatchItem[]) {
  return sumPositiveValues(items.map((item) => getExpectedItemLoose(item)));
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

function sumPositiveValues(values: number[]) {
  return values.reduce((sum, value) => (value > 0 ? sum + value : sum), 0);
}
