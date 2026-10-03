/**
 * Samples sent together are one entry in the list: one row, the first sample's
 * number, every sample's out-of-spec readings.
 */

import { describe, expect, it } from 'vitest';

import type { ProductionQCEntryListItem } from '@/modules/qc/types/productionQC.types';

import { entryNumber, groupBySubmission } from '../../utils/productionQCEntries';

const entry = (
  id: number,
  submission: number,
  ids: number[],
  outOfSpec = 0,
): ProductionQCEntryListItem =>
  ({
    id,
    submission_id: submission,
    submission_entry_ids: ids,
    out_of_spec_count: outOfSpec,
  }) as ProductionQCEntryListItem;

describe('groupBySubmission', () => {
  it('makes one row of an entry’s samples, numbered by its first, out of spec summed', () => {
    const rows = groupBySubmission([
      entry(9, 8, [8, 9], 1),
      entry(8, 8, [8, 9], 2),
      entry(7, 7, [7]),
    ]);
    expect(rows.map((row) => [row.id, row.sampleCount, row.out_of_spec_count])).toEqual([
      [8, 2, 3],
      [7, 1, 0],
    ]);
  });

  it('keeps an entry with no set as a row of its own', () => {
    const lone = { ...entry(5, 0, []), submission_id: null };
    expect(groupBySubmission([lone]).map((row) => [row.id, row.sampleCount])).toEqual([[5, 1]]);
    expect(entryNumber(lone)).toBe(5);
  });
});
