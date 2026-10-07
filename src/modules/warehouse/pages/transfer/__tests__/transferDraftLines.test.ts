/**
 * Editing a pending transfer request starts from its saved lines, and only a
 * change SAP's request carries — item, quantity, order, warehouse — replaces
 * that request in SAP. A remarks-only edit must not ask to.
 */

import { describe, expect, it } from 'vitest';

import type { TransferRequestLine } from '../../../types';
import {
  batchProblems,
  draftFromLine,
  filledLines,
  sameAsSaved,
  sameBatchesAsSaved,
  toLineInputs,
  withPick,
} from '../transferDraftLines';

function saved(overrides: Partial<TransferRequestLine> = {}): TransferRequestLine {
  return {
    id: 1,
    line_num: 0,
    item_code: 'PM0000019',
    item_name: 'Cap 5L',
    uom: 'PCS',
    from_warehouse: '',
    to_warehouse: '',
    source_warehouse: 'BH-LO',
    destination_warehouse: 'BH-PC',
    requested_qty: '40.000',
    approved_qty: '0.000',
    transferred_qty: '0.000',
    outstanding_qty: '0.000',
    is_batch_managed: false,
    batch_allocation: [],
    status: 'PENDING',
    notes: '',
    ...overrides,
  };
}

describe('transfer draft lines', () => {
  it('opens a saved line with its quantity as typed, not as Django sends it', () => {
    const draft = draftFromLine(saved());
    expect(draft.quantity).toBe('40');
    expect(draft.item_code).toBe('PM0000019');
    expect(draft.freeToMove).toBeUndefined();
  });

  it('treats untouched lines as the same as saved', () => {
    const lines = [saved(), saved({ id: 2, line_num: 1, item_code: 'RM0000002', uom: 'LTR' })];
    expect(sameAsSaved(lines.map(draftFromLine), lines)).toBe(true);
  });

  it('sees a changed quantity, a removed line and a reordering', () => {
    const lines = [saved(), saved({ id: 2, line_num: 1, item_code: 'RM0000002' })];
    const drafts = lines.map(draftFromLine);

    expect(sameAsSaved([{ ...drafts[0], quantity: '39' }, drafts[1]], lines)).toBe(false);
    expect(sameAsSaved([drafts[0]], lines)).toBe(false);
    expect(sameAsSaved([drafts[1], drafts[0]], lines)).toBe(false);
  });

  it('drops a line with no quantity before it is sent', () => {
    const drafts = [draftFromLine(saved()), { ...draftFromLine(saved()), quantity: '' }];
    expect(toLineInputs(filledLines(drafts))).toEqual([
      {
        item_code: 'PM0000019',
        item_name: 'Cap 5L',
        uom: 'PCS',
        from_warehouse: '',
        to_warehouse: '',
        quantity: 40,
      },
    ]);
  });
});

describe('batches picked on the raise form', () => {
  const fg = (overrides: Partial<TransferRequestLine> = {}) =>
    saved({
      item_code: 'FG0000461',
      requested_qty: '100.000',
      is_batch_managed: true,
      chosen_batches: [
        { batch_number: 'L3003286 102603 02', quantity: '60' },
        { batch_number: 'L3003056 102605 01', quantity: '40' },
      ],
      ...overrides,
    });

  it('opens a saved line with its picks', () => {
    const draft = draftFromLine(fg());
    expect(draft.isBatchManaged).toBe(true);
    expect(draft.picks).toEqual([
      { batch_number: 'L3003286 102603 02', quantity: '60' },
      { batch_number: 'L3003056 102605 01', quantity: '40' },
    ]);
  });

  it('keeps picks in shelf order, whatever order they were typed in', () => {
    const shelf = ['OLD', 'NEW'];
    let picks = withPick([], shelf, 'NEW', '40');
    picks = withPick(picks, shelf, 'OLD', '60');
    expect(picks.map((b) => b.batch_number)).toEqual(['OLD', 'NEW']);
    // Cleared box: no longer a pick.
    expect(withPick(picks, shelf, 'OLD', '')).toEqual([{ batch_number: 'NEW', quantity: '40' }]);
  });

  it('keeps a pick whose batch has left the shelf, after the rest, until it is cleared', () => {
    const picks = withPick([{ batch_number: 'GONE', quantity: '10' }], ['A'], 'A', '90');
    expect(picks.map((b) => b.batch_number)).toEqual(['A', 'GONE']);
  });

  it('sends the picks with a quantity, and nothing when none were made', () => {
    const [input] = toLineInputs([
      {
        ...draftFromLine(fg()),
        picks: [
          { batch_number: 'L3003286 102603 02', quantity: '100' },
          { batch_number: 'L3003056 102605 01', quantity: '0' },
        ],
      },
    ]);
    expect(input.batches).toEqual([{ batch_number: 'L3003286 102603 02', quantity: 100 }]);
    expect(toLineInputs([draftFromLine(saved())])[0]).not.toHaveProperty('batches');
  });

  it('flags picks that do not add up to the line', () => {
    const draft = draftFromLine(fg());
    expect(batchProblems([draft])).toEqual([]);
    expect(batchProblems([{ ...draft, quantity: '120' }])).toEqual([
      'FG0000461: the batches picked add up to 100, but 120 is asked for.',
    ]);
    // Nothing picked is oldest first, never a problem.
    expect(batchProblems([{ ...draft, picks: [] }])).toEqual([]);
  });

  it('sees a change of batches that SAP would never see', () => {
    const lines = [fg()];
    const drafts = lines.map(draftFromLine);
    expect(sameAsSaved(drafts, lines)).toBe(true);
    expect(sameBatchesAsSaved(drafts, lines)).toBe(true);

    const repicked = [{ ...drafts[0], picks: [{ batch_number: 'L3003056 102605 01', quantity: '100' }] }];
    expect(sameAsSaved(repicked, lines)).toBe(true);
    expect(sameBatchesAsSaved(repicked, lines)).toBe(false);
  });
});
