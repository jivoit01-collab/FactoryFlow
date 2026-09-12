import type { WarehouseOccupancyItem } from '../../production-control/types';
import type { TonnageRollUp } from '../types';

/**
 * Inventory units that are a mass or a volume rather than a count of things.
 *
 * Mirrors `_MASS_OR_VOLUME_UOMS` in `stock_dashboard/services.py`, which is what
 * produces the `non_piece_items` disclosure the board shows beside the total.
 * Kept in step with it deliberately: if the two lists disagree, the tonnage and
 * the caveat under it are measuring different sets of rows.
 *
 * A deny-list because the countable units are open-ended — SAP holds `PCS` for
 * almost everything and `DRM` for the one drum SKU, and a drum is still a thing
 * you count.
 */
const MASS_OR_VOLUME_UOMS = new Set([
  'KG', 'KGS', 'KGM', 'GM', 'GMS', 'GRM', 'MT', 'TON', 'TONNE',
  'L', 'LT', 'LTR', 'LTRS', 'LITRE', 'LITRES', 'ML', 'CC', 'M3',
]);

/**
 * Whether an on-hand quantity in `uom` is a count of pieces.
 *
 * Unknown and blank answer `false`. SAP leaves `InvntryUom` empty often enough
 * that guessing "piece" would fold unweighable rows into the total silently;
 * answering false pushes them into the disclosure instead, where someone can
 * see them.
 */
export function isPieceUom(uom: string | null | undefined): boolean {
  const trimmed = (uom ?? '').trim();
  return trimmed.length > 0 && !MASS_OR_VOLUME_UOMS.has(trimmed.toUpperCase());
}

/**
 * Kilograms held by one stock row, or null where it cannot be weighed.
 *
 * `gross_weight_per_case` is the **gross** weight of one sales case, packaging
 * included, while `on_hand` is a piece count — so the case count is on-hand over
 * pieces-per-box, and the weight follows. This is the invoice reader's proven
 * expression applied to stock; SAP's own procedure gets it wrong by multiplying
 * a case weight by a piece count, which is how it answers 98.89 kg where the
 * printed sheet says 4.94.
 *
 * Returns null — never 0 — when the row cannot be weighed, so a caller cannot
 * add "unknown" into a total as though it were "nothing".
 */
export function rowKilograms(row: WarehouseOccupancyItem): number | null {
  if (!isPieceUom(row.uom)) return null;

  const perCase = row.gross_weight_per_case;
  if (perCase === null || perCase <= 0) return null;

  // A missing or zero pack factor would divide the warehouse by nothing. A
  // factor of exactly 1 is not an error here — it means the SKU is sold by the
  // piece, so one piece IS one case and the weight applies directly.
  const piecesPerCase = row.pieces_per_box;
  if (piecesPerCase === null || piecesPerCase <= 0) return null;

  return (row.on_hand * perCase) / piecesPerCase;
}

/**
 * Total a warehouse in tonnes, carrying its own incompleteness with it.
 *
 * Negative on-hand rows are included as-is rather than clamped: SAP does carry
 * negatives, and hiding them would make the board disagree with the stock
 * screen for a reason nobody could see.
 */
export function rollUpTonnage(rows: readonly WarehouseOccupancyItem[]): TonnageRollUp {
  let kg = 0;
  let weighedItems = 0;
  let unweighedItems = 0;
  let nonPieceItems = 0;

  for (const row of rows) {
    if (!isPieceUom(row.uom)) {
      nonPieceItems += 1;
      continue;
    }

    const rowKg = rowKilograms(row);
    if (rowKg === null) {
      unweighedItems += 1;
      continue;
    }

    kg += rowKg;
    weighedItems += 1;
  }

  return {
    tonnes: kg / 1000,
    weighedItems,
    unweighedItems,
    nonPieceItems,
    coverage: rows.length > 0 ? weighedItems / rows.length : null,
  };
}

/**
 * Kilograms in one piece of a stock row, or null where it cannot be weighed.
 *
 * The same chain `rowKilograms` uses, stopped one step earlier so a caller
 * holding a different quantity for the same item — the non-moving feed reports
 * its own — can weigh that instead of the on-hand figure.
 */
export function kilogramsPerPiece(row: WarehouseOccupancyItem): number | null {
  if (!isPieceUom(row.uom)) return null;

  const perCase = row.gross_weight_per_case;
  if (perCase === null || perCase <= 0) return null;

  const piecesPerCase = row.pieces_per_box;
  if (piecesPerCase === null || piecesPerCase <= 0) return null;

  return perCase / piecesPerCase;
}

/**
 * Weigh an arbitrary set of items against the warehouse's own weight table.
 *
 * Built for the non-moving feed, which knows which items are idle and how much
 * of each but carries no unit of measure at all — so its quantities are
 * weighable only by looking each item up in the occupancy rows. Items the
 * occupancy feed has never heard of, or cannot weigh, are counted as unweighed
 * rather than dropped: the caller has to be able to say how much of the answer
 * is missing.
 */
export function weighItems(
  items: readonly { item_code: string; quantity: number }[],
  stockRows: readonly WarehouseOccupancyItem[],
): { tonnes: number; weighed: number; unweighed: number } {
  const perPiece = new Map<string, number>();
  for (const row of stockRows) {
    const kg = kilogramsPerPiece(row);
    if (kg !== null) perPiece.set(row.item_code.trim(), kg);
  }

  let kg = 0;
  let weighed = 0;
  let unweighed = 0;

  for (const item of items) {
    const rate = perPiece.get(item.item_code.trim());
    if (rate === undefined) {
      unweighed += 1;
      continue;
    }
    kg += item.quantity * rate;
    weighed += 1;
  }

  return { tonnes: kg / 1000, weighed, unweighed };
}
