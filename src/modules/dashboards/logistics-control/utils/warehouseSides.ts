import type { NonMovingItem } from '../../non-moving/types';
import type { WarehouseOccupancyItem } from '../../production-control/types';
import type { BoardWarehouse, TonnageRollUp } from '../types';
import { type BoxRollUp, countBoxes, rollUpBoxes, rollUpTonnage, weighItems } from './tonnage';

/**
 * The warehouse band, one company at a time and then added.
 *
 * Each half is weighed against its own company's rows and nobody else's: Oil
 * and Mart keep separate item masters, so an idle Mart item is weighed by
 * Mart's case weight, and Oil's BH-GR and Mart's BH-GR are two floors that
 * merely share a code. Only once each half is a set of tonnes are the two
 * added — the same rule the freight rate follows, add first and divide once.
 */

/** A stock row, tagged with the company it was read from. */
export type SideStockRow = WarehouseOccupancyItem & { company_code: string };

/** An idle row, tagged with the company it was read from. */
export type SideIdleRow = NonMovingItem & { company_code: string };

/** Idle stock, split into the board's two age bands. */
export interface IdleFigures {
  /** The idle rows themselves, for the drill-down. */
  rows: SideIdleRow[];
  items: number;
  tonnes: number;
  /** Idle up to the ageing threshold. */
  recentTonnes: number;
  /** Idle past it. */
  ageingTonnes: number;
  /** Rows the stock read could not weigh, so the tonnage is a floor. */
  unweighed: number;
  /** The same idle stock in boxes, for a board that counts boxes. */
  boxes: number;
  recentBoxes: number;
  ageingBoxes: number;
  /** Rows with no pack factor to count by, so the boxes are a floor. */
  uncounted: number;
}

/** What one company's ticked warehouses hold, or several companies' added. */
export interface WarehouseFigures {
  stockRows: SideStockRow[];
  stockTonnage: TonnageRollUp;
  stockBoxes: BoxRollUp;
  /** The rated capacities added. Null where no ticked warehouse has one. */
  capacityTonnes: number | null;
  /**
   * Tonnage standing in the warehouses that HAVE a capacity.
   *
   * What "% full" divides, rather than the whole tonnage: a warehouse nobody
   * rated has stock but no room to compare it against, and folding its tonnes
   * over another floor's capacity would make that floor look fuller than it is.
   */
  ratedTonnes: number;
  /** Ticked warehouses with no capacity, so outside "% full". */
  unrated: string[];
  /** Rated tonnage over rated capacity. Not clamped — over 100 is real. */
  fillPct: number | null;
  /**
   * The oldest last-audit date among the ticked warehouses.
   *
   * The oldest, not the newest: a board heading several floors with one date
   * is saying how stale its least recently counted stock might be.
   */
  oldestAudit: string | null;
  /** Ticked warehouses never audited. */
  unaudited: string[];
  nonMoving: IdleFigures;
}

/** One company's half. */
export interface WarehouseSideFigures extends WarehouseFigures {
  companyCode: string;
  /** The ticked warehouses, as the settings screen holds them. */
  warehouses: BoardWarehouse[];
}

/** `JIVO_OIL` reads as "OIL" on a board where every company shares the prefix. */
export function companyLabel(code: string): string {
  return code.replace(/^JIVO[_\s-]*/i, '').replace(/_/g, ' ') || code;
}

/**
 * The warehouse band's caption: the ticked codes while they fit on the rail.
 *
 * Past three the rail would run out of height, and a count says what matters —
 * that the band is several floors, which its drill-downs list.
 */
export function warehouseCaption(codes: readonly string[]): string {
  if (codes.length === 0) return 'no warehouse ticked';
  if (codes.length <= 3) return codes.join(' · ');
  return `${codes.length} warehouses`;
}

/** Trimmed and upper-cased, the way SAP's codes compare. */
function codeOf(raw: string | null | undefined): string {
  return (raw ?? '').trim().toUpperCase();
}

/** The earliest of some `YYYY-MM-DD` dates, or null. They sort as text. */
function earliest(dates: readonly (string | null)[]): string | null {
  const known = dates.filter((date): date is string => Boolean(date)).sort();
  return known.length > 0 ? known[0] : null;
}

function percentFull(rated: number, capacity: number | null): number | null {
  return capacity !== null && capacity > 0 ? (rated / capacity) * 100 : null;
}

/**
 * One company's warehouse figures.
 *
 * `stockRows` and `idleRows` are that company's reads; both are narrowed to
 * the ticked warehouses here. The stock read already asks for exactly those,
 * but the non-moving report answers for every warehouse in the company — its
 * warehouse filter does nothing server-side.
 */
export function rollUpWarehouseSide(input: {
  companyCode: string;
  warehouses: readonly BoardWarehouse[];
  stockRows: readonly WarehouseOccupancyItem[];
  idleRows: readonly NonMovingItem[];
  /** Days idle past which a row is in the older band. */
  ageingDays: number;
}): WarehouseSideFigures {
  const ticked = new Set(input.warehouses.map((row) => codeOf(row.warehouse)));
  const rated = new Set(
    input.warehouses
      .filter((row) => row.capacity_tonnes !== null && row.capacity_tonnes > 0)
      .map((row) => codeOf(row.warehouse)),
  );

  const stockRows: SideStockRow[] = input.stockRows
    .filter((row) => ticked.has(codeOf(row.warehouse)))
    .map((row) => ({ ...row, company_code: input.companyCode }));

  const idleRows: SideIdleRow[] = input.idleRows
    .filter((row) => ticked.has(codeOf(row.warehouse)))
    .map((row) => ({ ...row, company_code: input.companyCode }));

  const capacities = input.warehouses
    .map((row) => row.capacity_tonnes)
    .filter((value): value is number => value !== null && value > 0);
  const capacityTonnes =
    capacities.length > 0 ? capacities.reduce((total, value) => total + value, 0) : null;
  const ratedTonnes = rollUpTonnage(
    stockRows.filter((row) => rated.has(codeOf(row.warehouse))),
  ).tonnes;

  const recent = idleRows.filter((row) => row.days_since_last_movement <= input.ageingDays);
  const ageing = idleRows.filter((row) => row.days_since_last_movement > input.ageingDays);
  const idle = weighItems(idleRows, stockRows);
  const idleBoxes = countBoxes(idleRows, stockRows);

  return {
    companyCode: input.companyCode,
    warehouses: [...input.warehouses],
    stockRows,
    stockTonnage: rollUpTonnage(stockRows),
    stockBoxes: rollUpBoxes(stockRows),
    capacityTonnes,
    ratedTonnes,
    unrated: input.warehouses
      .filter((row) => !rated.has(codeOf(row.warehouse)))
      .map((row) => row.warehouse),
    fillPct: percentFull(ratedTonnes, capacityTonnes),
    oldestAudit: earliest(input.warehouses.map((row) => row.last_audit_date)),
    unaudited: input.warehouses.filter((row) => !row.last_audit_date).map((row) => row.warehouse),
    nonMoving: {
      rows: idleRows,
      items: idleRows.length,
      tonnes: idle.tonnes,
      recentTonnes: weighItems(recent, stockRows).tonnes,
      ageingTonnes: weighItems(ageing, stockRows).tonnes,
      unweighed: idle.unweighed,
      boxes: idleBoxes.boxes,
      recentBoxes: countBoxes(recent, stockRows).boxes,
      ageingBoxes: countBoxes(ageing, stockRows).boxes,
      uncounted: idleBoxes.uncounted,
    },
  };
}

/**
 * Several companies' halves, added.
 *
 * Tonnes and capacities add; "% full" is recomputed from the added tonnes and
 * capacities rather than averaged, so a small warehouse over its rating cannot
 * outweigh a large one under it. Warehouse codes in the disclosure lists are
 * prefixed with the company where there is more than one, since the same code
 * can be two floors.
 */
export function combineWarehouseSides(sides: readonly WarehouseSideFigures[]): WarehouseFigures {
  const named = sides.length > 1;
  const label = (side: WarehouseSideFigures, code: string) =>
    named ? `${companyLabel(side.companyCode)} ${code}` : code;

  const stockRows = sides.flatMap((side) => side.stockRows);
  const capacities = sides
    .map((side) => side.capacityTonnes)
    .filter((value): value is number => value !== null);
  const capacityTonnes =
    capacities.length > 0 ? capacities.reduce((total, value) => total + value, 0) : null;
  const ratedTonnes = sides.reduce((total, side) => total + side.ratedTonnes, 0);
  const sum = (pick: (side: WarehouseSideFigures) => number) =>
    sides.reduce((total, side) => total + pick(side), 0);

  return {
    stockRows,
    stockTonnage: rollUpTonnage(stockRows),
    stockBoxes: rollUpBoxes(stockRows),
    capacityTonnes,
    ratedTonnes,
    unrated: sides.flatMap((side) => side.unrated.map((code) => label(side, code))),
    fillPct: percentFull(ratedTonnes, capacityTonnes),
    oldestAudit: earliest(sides.map((side) => side.oldestAudit)),
    unaudited: sides.flatMap((side) => side.unaudited.map((code) => label(side, code))),
    nonMoving: {
      rows: sides.flatMap((side) => side.nonMoving.rows),
      items: sum((side) => side.nonMoving.items),
      tonnes: sum((side) => side.nonMoving.tonnes),
      recentTonnes: sum((side) => side.nonMoving.recentTonnes),
      ageingTonnes: sum((side) => side.nonMoving.ageingTonnes),
      unweighed: sum((side) => side.nonMoving.unweighed),
      boxes: sum((side) => side.nonMoving.boxes),
      recentBoxes: sum((side) => side.nonMoving.recentBoxes),
      ageingBoxes: sum((side) => side.nonMoving.ageingBoxes),
      uncounted: sum((side) => side.nonMoving.uncounted),
    },
  };
}

/** One ticked warehouse's share of the band, for the drill-downs. */
export interface WarehouseShare {
  companyCode: string;
  warehouse: string;
  /** SAP's name for it, where the settings screen has seen it. */
  name: string;
  tonnes: number;
  boxes: number;
  capacityTonnes: number | null;
  /** This floor alone against its own rating. */
  fillPct: number | null;
  lastAudit: string | null;
}

/**
 * Stock on hand per ticked warehouse, heaviest first.
 *
 * A partition of the tile's figure: each row is weighed from the same rows the
 * side rolled up, so the rows add to the headline.
 */
export function stockByWarehouse(sides: readonly WarehouseSideFigures[]): WarehouseShare[] {
  return sides
    .flatMap((side) =>
      side.warehouses.map((row) => {
        const code = codeOf(row.warehouse);
        const here = side.stockRows.filter((stockRow) => codeOf(stockRow.warehouse) === code);
        const tonnes = rollUpTonnage(here).tonnes;
        const capacity =
          row.capacity_tonnes !== null && row.capacity_tonnes > 0 ? row.capacity_tonnes : null;
        return {
          companyCode: side.companyCode,
          warehouse: row.warehouse,
          // The board's ticked list is read without SAP, so it carries no name;
          // the stock rows do.
          name: row.name || here[0]?.warehouse_name || '',
          tonnes,
          boxes: rollUpBoxes(here).boxes,
          capacityTonnes: capacity,
          fillPct: percentFull(tonnes, capacity),
          lastAudit: row.last_audit_date,
        };
      }),
    )
    .sort((a, b) => b.tonnes - a.tonnes);
}

/**
 * Idle stock per ticked warehouse, heaviest first.
 *
 * Weighed against the side's own stock rows, the way the side itself was, so
 * the rows add to the tile's idle tonnage.
 */
export function idleByWarehouse(
  sides: readonly WarehouseSideFigures[],
): { companyCode: string; warehouse: string; items: number; tonnes: number }[] {
  return sides
    .flatMap((side) =>
      side.warehouses.map((row) => {
        const code = codeOf(row.warehouse);
        const idle = side.nonMoving.rows.filter((idleRow) => codeOf(idleRow.warehouse) === code);
        return {
          companyCode: side.companyCode,
          warehouse: row.warehouse,
          items: idle.length,
          tonnes: weighItems(idle, side.stockRows).tonnes,
        };
      }),
    )
    .sort((a, b) => b.tonnes - a.tonnes);
}
