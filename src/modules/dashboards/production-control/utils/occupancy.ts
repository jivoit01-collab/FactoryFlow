/**
 * How full BH-PF is, in pallets.
 *
 * SAP counts pieces and the floor's capacity is in pallets, so the board has to
 * bridge the two. There is no pallet unit anywhere in SAP to lean on — the item
 * master's four `SalFactor` columns hold pieces-per-box, a duplicate of it, a
 * price, and nothing; and the three UoM groups that exist are mass-to-volume
 * density conversions assigned only to bulk oils. So the chain is:
 *
 *     pieces / SalFactor2 = boxes / BOXES_PER_PALLET = pallets
 *
 * with one exception that carries half the arithmetic. A SKU with
 * `SalFactor2 = 1` is not transacted in boxes at all, so its "box count" is
 * just its piece count; those SKUs are converted on a pieces-per-pallet figure
 * chosen by physical format instead. Formats are read off `SalPackUn` (litres
 * in one piece) because that is a SAP field — never off the SKU name, which
 * states pack sizes it does not keep.
 */
import {
  BOXES_PER_PALLET,
  LOOSE_FORMAT_LITRE_BREAKS,
  LOOSE_PIECES_PER_PALLET,
  type LooseFormat,
  OCCUPANCY_ALERT_PERCENT,
  PALLET_CAPACITY,
} from '../constants/production-control.constants';

/** One SKU's stock at a warehouse, with the two item-master fields it needs. */
export interface OccupancyInput {
  itemCode: string;
  itemName: string;
  /** `OITW.OnHand`, in pieces. */
  pieces: number;
  /** `OITM.SalFactor2` — pieces per box. 1 means SAP bills the piece itself. */
  piecesPerBox: number | null;
  /** `OITM.SalPackUn` — litres in one piece. Null where SAP holds no volume. */
  litresPerPiece: number | null;
}

export interface OccupancyRow extends OccupancyInput {
  /** Boxes, where the SKU is genuinely boxed. Null for a loose SKU. */
  boxes: number | null;
  pallets: number;
  /** Set only for a loose SKU, naming the estimate that converted it. */
  looseFormat: LooseFormat | null;
}

export interface Occupancy {
  rows: OccupancyRow[];
  /** Pallets held, rounded up — half a pallet still occupies a pallet's floor. */
  pallets: number;
  capacity: number;
  percent: number;
  /** True past the alert threshold. */
  alert: boolean;
  /** True past capacity itself — the floor is holding more than it should. */
  over: boolean;
  totalPieces: number;
  /** Boxes across the genuinely-boxed SKUs. Excludes loose. */
  boxes: number;
  /** Pallets from boxed SKUs — the measured half of the figure. */
  palletsFromBoxes: number;
  /** Pallets from loose SKUs — the estimated half. */
  palletsFromLoose: number;
  /** How many SKUs were converted on a loose estimate. */
  looseSkus: number;
}

/**
 * Which physical format a loose SKU is, from the litres in one piece.
 *
 * A 200-litre drum, a 15-litre jerry can, a 13-kilo tin and a 500 ml jar stack
 * nothing like each other, and `SalPackUn` is the only SAP field that separates
 * them. A SKU SAP holds no volume for falls through to `jar`, the smallest
 * bucket, so an unknown never inflates the pallet count.
 */
export function looseFormatOf(litresPerPiece: number | null | undefined): LooseFormat {
  const litres = litresPerPiece ?? 0;
  if (litres >= LOOSE_FORMAT_LITRE_BREAKS.drum) return 'drum';
  if (litres >= LOOSE_FORMAT_LITRE_BREAKS.jerryCan) return 'jerryCan';
  if (litres >= LOOSE_FORMAT_LITRE_BREAKS.bulkTin) return 'bulkTin';
  return 'jar';
}

/** Pallets one SKU's stock occupies, and how that was worked out. */
function convert(input: OccupancyInput): OccupancyRow {
  const pieces = Math.max(0, input.pieces || 0);
  const perBox = input.piecesPerBox ?? 0;

  // Genuinely boxed: pieces -> boxes -> pallets.
  if (perBox > 1) {
    const boxes = pieces / perBox;
    return { ...input, boxes, pallets: boxes / BOXES_PER_PALLET, looseFormat: null };
  }

  // Loose (SalFactor2 of 1, 0 or null): pieces straight to pallets on its format.
  const looseFormat = looseFormatOf(input.litresPerPiece);
  const perPallet = LOOSE_PIECES_PER_PALLET[looseFormat];
  return {
    ...input,
    boxes: null,
    pallets: perPallet > 0 ? pieces / perPallet : 0,
    looseFormat,
  };
}

/**
 * The whole warehouse: pallets held, against capacity.
 *
 * The total rounds up once at the end rather than per SKU, so thirty SKUs each
 * holding a third of a pallet read as ten pallets and not thirty. Partial
 * pallets do occupy floor, which is why the final figure rounds up rather than
 * to nearest.
 */
export function summariseOccupancy(
  inputs: OccupancyInput[],
  capacity: number = PALLET_CAPACITY,
): Occupancy {
  const rows = inputs.filter((row) => (row.pieces || 0) > 0).map(convert);

  const palletsFromBoxes = rows
    .filter((row) => row.boxes != null)
    .reduce((sum, row) => sum + row.pallets, 0);
  const palletsFromLoose = rows
    .filter((row) => row.boxes == null)
    .reduce((sum, row) => sum + row.pallets, 0);

  const pallets = Math.ceil(palletsFromBoxes + palletsFromLoose);
  const percent = capacity > 0 ? (pallets / capacity) * 100 : 0;

  return {
    rows: rows.sort((a, b) => b.pallets - a.pallets),
    pallets,
    capacity,
    percent,
    alert: percent >= OCCUPANCY_ALERT_PERCENT,
    over: pallets > capacity,
    totalPieces: rows.reduce((sum, row) => sum + row.pieces, 0),
    boxes: rows.reduce((sum, row) => sum + (row.boxes ?? 0), 0),
    palletsFromBoxes,
    palletsFromLoose,
    looseSkus: rows.filter((row) => row.boxes == null).length,
  };
}

/**
 * Footnote naming the basis, so nobody reads the percentage as surveyed fact.
 *
 * The board is claiming a warehouse is over capacity; it owes the reader the
 * two numbers that claim rests on and an admission of which half is estimated.
 */
export function occupancyNote(occupancy: Occupancy): string {
  const boxed = Math.round(occupancy.palletsFromBoxes);
  const loose = Math.round(occupancy.palletsFromLoose);
  const base =
    `Capacity ${occupancy.capacity} pallets, given by the warehouse — SAP and ` +
    `Warehouse Ops hold no capacity figure for this floor. Pallets are pieces ÷ pieces-per-box ` +
    `(SAP SalFactor2) ÷ ${BOXES_PER_PALLET} boxes per pallet, the packing measured ` +
    `across 2,343 full pallets standing here.`;
  if (occupancy.looseSkus === 0) return base;
  return (
    `${base} ${boxed} pallets are measured that way; ${loose} come from ` +
    `${occupancy.looseSkus} SKU${occupancy.looseSkus === 1 ? '' : 's'} SAP bills by the ` +
    `piece, converted on an estimate of how each format stacks.`
  );
}
