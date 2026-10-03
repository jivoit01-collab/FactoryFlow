/**
 * Samples sent together are one entry to the people using QA Reports: one row,
 * one number (the first sample's), one decision. Only the sheet and its print
 * lay them out as separate columns.
 */

import type { ProductionQCEntryListItem } from '../types/productionQC.types';

export interface EntryRow extends ProductionQCEntryListItem {
  /** How many samples the entry holds; 1 for an entry filled on its own. */
  sampleCount: number;
}

/** The entry's own number: its first sample's id. */
export function entryNumber(entry: Pick<ProductionQCEntryListItem, 'id' | 'submission_entry_ids'>) {
  return entry.submission_entry_ids.length > 0 ? entry.submission_entry_ids[0] : entry.id;
}

/** One row per entry, in the order the samples came; out-of-spec readings summed over its samples. */
export function groupBySubmission(entries: ProductionQCEntryListItem[]): EntryRow[] {
  const rows = new Map<string, EntryRow>();
  entries.forEach((entry) => {
    const key = entry.submission_id !== null ? `s${entry.submission_id}` : `e${entry.id}`;
    const row = rows.get(key);
    if (row) {
      row.out_of_spec_count += entry.out_of_spec_count;
      return;
    }
    rows.set(key, {
      ...entry,
      id: entryNumber(entry),
      sampleCount: Math.max(1, entry.submission_entry_ids.length),
    });
  });
  return [...rows.values()];
}
