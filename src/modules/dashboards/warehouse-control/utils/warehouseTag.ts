/**
 * Short tags for warehouse names, so a crowded row can still say where stock is.
 *
 * "Gupta Godown" and "Bhakharpur Basement" are too long to sit beside an item
 * name, but the words that tell them apart are not: a reader only needs "Gupta"
 * and "Basement". The rule is to drop the words that say nothing (every
 * warehouse is a godown) and keep the last real word of what is left.
 *
 * Where two warehouses would shorten to the same tag the shortening is dropped
 * for all of them — an ambiguous tag is worse than a long one.
 */

/** Words that appear on so many warehouse names they identify nothing. */
const GENERIC_WORDS = new Set([
  'godown',
  'warehouse',
  'store',
  'stores',
  'storage',
  'depot',
  'facility',
  'unit',
  'plant',
  'wh',
]);

function shorten(name: string): string {
  const full = name.trim();
  const words = full.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return full;

  const meaningful = words.filter((word) => !GENERIC_WORDS.has(word.toLowerCase()));
  const kept = meaningful.length > 0 ? meaningful : words;
  if (kept.length === 1) return kept[0];

  // A trailing number or initial ("Unit 2", "Godown B") is not a name on its
  // own, so the whole phrase stays.
  const last = kept[kept.length - 1];
  if (last.length < 3 || /\d/.test(last)) return kept.join(' ');
  return last;
}

/**
 * Tag per warehouse id, keyed for lookup from any row that names a warehouse.
 *
 * Pass every warehouse on the board, not just the ones being drawn — collisions
 * can only be spotted against the full set.
 */
export function shortWarehouseTags(
  warehouses: { warehouseId: string; name: string }[],
): Map<string, string> {
  const tags = new Map<string, string>();
  const seen = new Map<string, string[]>();

  for (const warehouse of warehouses) {
    const tag = shorten(warehouse.name);
    tags.set(warehouse.warehouseId, tag);
    const key = tag.toLowerCase();
    seen.set(key, [...(seen.get(key) ?? []), warehouse.warehouseId]);
  }

  for (const [, ids] of seen) {
    if (ids.length < 2) continue;
    for (const id of ids) {
      const full = warehouses.find((warehouse) => warehouse.warehouseId === id);
      if (full) tags.set(id, full.name.trim());
    }
  }

  return tags;
}
