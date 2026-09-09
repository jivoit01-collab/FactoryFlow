import type {
  PmCombinedStockItem,
  PmSortKey,
  PmStockItem,
  PmStockWarehouse,
  PmTopItem,
} from '../types';

// ============================================================================
// Formatting
// ============================================================================

const qtyFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const preciseQtyFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 });
const rupeeFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/**
 * A quantity with its unit, because a bare number on this board is ambiguous:
 * tape is metres, caps are pieces, film is kilos. Sub-unit quantities keep
 * their decimals — 0.05 kg of ink per bottle rounds to nothing otherwise.
 */
export function formatQty(value: number, uom?: string): string {
  const magnitude = Math.abs(value);
  const formatted =
    magnitude > 0 && magnitude < 100
      ? preciseQtyFormatter.format(value)
      : qtyFormatter.format(value);
  return uom ? `${formatted} ${uom}` : formatted;
}

/** Full rupees, for a table cell that has room for them. */
export function formatInr(value: number): string {
  return rupeeFormatter.format(value);
}

/**
 * Rupees in the units this factory speaks — crore and lakh — for the cards,
 * where a nine-digit figure would not fit and could not be read at a glance
 * anyway. The sign is preserved.
 */
export function formatInrCompact(value: number): string {
  const sign = value < 0 ? '-' : '';
  const magnitude = Math.abs(value);

  if (magnitude >= 10_000_000) return `${sign}₹${(magnitude / 10_000_000).toFixed(2)} Cr`;
  if (magnitude >= 100_000) return `${sign}₹${(magnitude / 100_000).toFixed(2)} L`;
  return rupeeFormatter.format(value);
}

/**
 * A piece count for a card headline. Lakh and crore again: 11,774,803 pieces
 * of packaging is a number nobody reads, 1.18 Cr is one they do.
 */
export function formatQtyCompact(value: number): string {
  const sign = value < 0 ? '-' : '';
  const magnitude = Math.abs(value);

  if (magnitude >= 10_000_000) return `${sign}${(magnitude / 10_000_000).toFixed(2)} Cr`;
  if (magnitude >= 100_000) return `${sign}${(magnitude / 100_000).toFixed(2)} L`;
  return qtyFormatter.format(value);
}

export function formatPct(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${value.toFixed(digits)}%`;
}

// ============================================================================
// Reading the two lists
// ============================================================================

/**
 * The rows that came back, read down a different column.
 *
 * The API ranks on quantity and this never re-requests: it re-orders the same
 * ten items, so the set on screen is always the top ten BY QUANTITY however it
 * is sorted. Sorting by value here answers "of the ten biggest by volume,
 * which cost the most" — not "the ten most expensive", which would need a
 * different request and is a different question.
 *
 * `rank` is left alone for the same reason. It is the item's rank in the
 * month, not its position in the table, so a row keeps the number it earned.
 */
export function sortTopItems(items: PmTopItem[], key: PmSortKey): PmTopItem[] {
  if (key === 'qty') return items;
  return [...items].sort((a, b) => b.value - a.value || a.item_code.localeCompare(b.item_code));
}

/** The fields the search-and-sort below needs, and no more. */
type StockRowLike = Pick<
  PmStockItem,
  'item_code' | 'item_name' | 'sub_group' | 'stock_qty' | 'stock_value'
>;

/**
 * Stock rows narrowed by a search box and read down one column.
 *
 * Matched on code, name and family, because a storekeeper looks for "label"
 * and a buyer looks for "PM0000019" and both have to find the same row.
 *
 * Generic over the row so one store's items and the combined across-stores
 * items share it: the two lists sort and search identically, and two copies
 * would be two chances for them to stop doing so.
 */
export function filterStockItems<T extends StockRowLike>(
  items: T[],
  search: string,
  key: PmSortKey,
): T[] {
  const needle = search.trim().toLowerCase();
  const matched = needle
    ? items.filter((item) =>
        `${item.item_code} ${item.item_name} ${item.sub_group}`.toLowerCase().includes(needle),
      )
    : items;

  const column = key === 'value' ? 'stock_value' : 'stock_qty';
  return [...matched].sort(
    (a, b) => b[column] - a[column] || a.item_code.localeCompare(b.item_code),
  );
}

/**
 * Every item added up across every store.
 *
 * A pet bottle held 3 in BH-PC, 5 in BH-BS and 2 in BH-PM is ONE item and TEN
 * bottles: the quantity sums, the item does not. That is exactly the same
 * arithmetic the Total card does — its quantity is the sum of the three stores
 * and its item count is the length of this list — so the two can never
 * disagree about what "total" means.
 *
 * The split is carried on each row so the ten can be traced back to where the
 * ten are, and only the stores actually holding some appear in it: a row
 * reading "BH-PC 3 · BH-BS 5 · BH-PM 2" is useful, one padded with four zeroes
 * is noise.
 *
 * The unit and the family come from whichever store is seen first. They are
 * item master fields, identical on every row for a given code, so there is
 * nothing to reconcile — unlike the price, which is why value is summed as
 * SAP valued it per store rather than recomputed from a unit price here. A
 * store's own moving average can differ from another's for the same item.
 */
export function combineStockItems(warehouses: PmStockWarehouse[]): PmCombinedStockItem[] {
  const combined = new Map<string, PmCombinedStockItem>();

  for (const warehouse of warehouses) {
    for (const item of warehouse.items) {
      const existing = combined.get(item.item_code);
      if (existing) {
        existing.stock_qty += item.stock_qty;
        existing.stock_value += item.stock_value;
        existing.splits.push({
          code: warehouse.code,
          stock_qty: item.stock_qty,
          stock_value: item.stock_value,
        });
        continue;
      }
      combined.set(item.item_code, {
        ...item,
        splits: [
          { code: warehouse.code, stock_qty: item.stock_qty, stock_value: item.stock_value },
        ],
      });
    }
  }

  return [...combined.values()].sort(
    (a, b) => b.stock_qty - a.stock_qty || a.item_code.localeCompare(b.item_code),
  );
}

/**
 * A store's name with the site off the front, for a card label.
 *
 * Every one of Oil's warehouses is called "Bhakharpur something" — the site is
 * on all of them and so distinguishes none of them, while costing eleven
 * characters in a label that has to fit four across. "BH-PC — Production
 * Consumption" reads at a glance where the full name truncates mid-word.
 *
 * Display only, and only for a prefix that is actually there: a company whose
 * stores are named some other way keeps its names whole. The unabridged name
 * is in the dialog the card opens.
 */
const SITE_PREFIXES = ['bhakharpur', 'bhakarpur'];

export function shortWarehouseName(name: string): string {
  const trimmed = name.trim();
  const [first, ...rest] = trimmed.split(/\s+/);
  if (rest.length && SITE_PREFIXES.includes((first ?? '').toLowerCase())) {
    return rest.join(' ');
  }
  return trimmed;
}

/** What a filtered stock list adds up to, so the dialog can foot its table. */
export function sumStockItems(items: Pick<PmStockItem, 'stock_qty' | 'stock_value'>[]): {
  qty: number;
  value: number;
} {
  return items.reduce(
    (totals, item) => ({
      qty: totals.qty + item.stock_qty,
      value: totals.value + item.stock_value,
    }),
    { qty: 0, value: 0 },
  );
}

/**
 * A row's share of the largest row in the list, for the bar behind it.
 *
 * Scaled to the leader rather than to the period, because with a top item on
 * 8% of the month every bar drawn against the period total would be a stub.
 */
export function barWidthPct(value: number, leader: number): number {
  if (!leader) return 0;
  return Math.max(0, Math.min(100, (value / leader) * 100));
}
