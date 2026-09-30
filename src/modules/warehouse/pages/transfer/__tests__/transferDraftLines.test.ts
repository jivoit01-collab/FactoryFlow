/**
 * Editing a pending transfer request starts from its saved lines, and only a
 * change SAP's request carries — item, quantity, order, warehouse — replaces
 * that request in SAP. A remarks-only edit must not ask to.
 */

import { describe, expect, it } from 'vitest';

import type { TransferRequestLine } from '../../../types';
import { draftFromLine, filledLines, sameAsSaved, toLineInputs } from '../transferDraftLines';

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
