import type { PiecesFilters, PiecesItem, PiecesItemWarehouse } from '../types';

/**
 * One table row: an item as the current filters see it.
 *
 * With a store filter on, the quantities are that store's (or those stores')
 * share of the item, not the item's whole holding — otherwise picking BH-PP
 * would list caps at the figure held across every store.
 */
export interface PiecesRow {
  item: PiecesItem;
  lines: PiecesItemWarehouse[];
  /** Null exactly when the item has no route to pieces. */
  pcs: number | null;
  qty: number;
  value: number;
}

export interface PiecesRowTotals {
  items: number;
  unconverted: number;
  pcs: number;
  value: number;
  unconvertedValue: number;
}

export const DEFAULT_FILTERS: PiecesFilters = {
  search: '',
  warehouses: [],
  families: [],
  unit: 'all',
  sort: 'pcs',
};

function matchesSearch(item: PiecesItem, needle: string): boolean {
  if (!needle) return true;
  return [item.item_code, item.item_name, item.sub_group, item.uom].some((field) =>
    field.toLowerCase().includes(needle),
  );
}

/** The items the filters keep, read through the stores they select, sorted. */
export function filterPiecesRows(items: PiecesItem[], filters: PiecesFilters): PiecesRow[] {
  const needle = filters.search.trim().toLowerCase();
  const stores = new Set(filters.warehouses);
  const families = new Set(filters.families);

  const rows: PiecesRow[] = [];
  for (const item of items) {
    const converted = item.pcs_qty !== null;
    if (filters.unit === 'converted' && !converted) continue;
    if (filters.unit === 'unconverted' && converted) continue;
    if (families.size && !families.has(item.sub_group)) continue;
    if (!matchesSearch(item, needle)) continue;

    const lines = stores.size
      ? item.warehouses.filter((line) => stores.has(line.code))
      : item.warehouses;
    if (!lines.length) continue;

    rows.push({
      item,
      lines,
      pcs: converted ? lines.reduce((sum, line) => sum + (line.pcs_qty ?? 0), 0) : null,
      qty: lines.reduce((sum, line) => sum + line.stock_qty, 0),
      value: lines.reduce((sum, line) => sum + line.stock_value, 0),
    });
  }

  return rows.sort((a, b) => {
    if (filters.sort === 'name') {
      return (a.item.item_name || a.item.item_code).localeCompare(
        b.item.item_name || b.item.item_code,
      );
    }
    if (filters.sort === 'value') return b.value - a.value;
    // By pieces, with the unconverted items after every converted one and
    // ranked among themselves by value: a kilo does not compare with a piece.
    if (a.pcs === null || b.pcs === null) {
      if (a.pcs === null && b.pcs === null) return b.value - a.value;
      return a.pcs === null ? 1 : -1;
    }
    return b.pcs - a.pcs;
  });
}

/** What the rows on screen add up to — never the unfiltered totals. */
export function sumPiecesRows(rows: PiecesRow[]): PiecesRowTotals {
  let pcs = 0;
  let value = 0;
  let unconverted = 0;
  let unconvertedValue = 0;
  for (const row of rows) {
    value += row.value;
    if (row.pcs === null) {
      unconverted += 1;
      unconvertedValue += row.value;
    } else {
      pcs += row.pcs;
    }
  }
  return { items: rows.length, unconverted, pcs, value, unconvertedValue };
}

/** Toggle one value in a list filter. */
export function toggleIn(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
}

/**
 * "1 BOX = 100 pcs" — how the piece count was reached, so a reader can check
 * the conversion against the carton instead of trusting it.
 */
export function describeConversion(item: PiecesItem): string {
  if (item.conversion === 'pieces') return 'Stocked in pieces';
  if (item.conversion === 'none' || item.pieces_per_uom === null) {
    return `No piece unit in SAP — counted in ${item.uom || 'its own unit'}`;
  }
  const per = Number(item.pieces_per_uom.toFixed(3)).toLocaleString('en-IN');
  return `1 ${item.uom} = ${per} pcs (SAP UoM group)`;
}
