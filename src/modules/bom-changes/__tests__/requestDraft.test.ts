import { describe, expect, it } from 'vitest';

import type { SapBom } from '../api/bom-changes.api';
import {
  blankDraft,
  blankLine,
  diffLines,
  draftError,
  draftFromSapBom,
  draftTotalCost,
  type RequestDraft,
  toPayload,
} from '../utils/requestDraft';
import { REQUEST_TABS, tabCount } from '../utils/status';

const TREE: SapBom = {
  tree_code: 'FG0000121',
  description: 'CANOLA OIL 1 LTR 20 PCS',
  tree_type: 'P',
  bom_type: 'Production',
  sap_tree_type: 'iProductionTree',
  quantity: 20,
  warehouse: 'BH-PF',
  distribution_rule: 'OIL',
  project: '',
  price_list: -1,
  updated_at: '2026-09-01',
  item_count: 2,
  resource_count: 1,
  lines: [
    {
      child_num: 0,
      visual_order: 0,
      item_type: 'item',
      item_code: 'RM1',
      item_name: 'Oil',
      quantity: 20,
      warehouse: 'BH-PC',
      issue_method: 'Backflush',
      unit_cost: 150.5,
      currency: 'INR',
      comment: '',
      uom: 'LTR',
    },
    {
      child_num: 1,
      visual_order: 1,
      item_type: 'text',
      item_code: '',
      item_name: '',
      quantity: 0,
      warehouse: '',
      issue_method: 'Manual',
      unit_cost: 0,
      currency: '',
      comment: 'pack note',
      uom: '',
    },
    {
      child_num: 2,
      visual_order: 2,
      item_type: 'resource',
      item_code: 'RES1',
      item_name: 'Filling',
      quantity: 20,
      warehouse: '',
      issue_method: 'Manual',
      unit_cost: 0,
      currency: '',
      comment: '',
      uom: '',
    },
    {
      child_num: 3,
      visual_order: 3,
      item_type: 'item',
      item_code: 'PM1',
      item_name: 'Carton',
      quantity: 1,
      warehouse: '',
      issue_method: 'Manual',
      unit_cost: 12,
      currency: 'INR',
      comment: '',
      uom: 'PCS',
    },
  ],
};

function newBom(patch: Partial<RequestDraft> = {}): RequestDraft {
  const draft = blankDraft('CREATE');
  return {
    ...draft,
    item_code: 'fg0000999',
    item_name: 'New pack',
    lines: [{ ...blankLine(), item_code: 'rm1', quantity: '2', unit_cost: '10' }],
    ...patch,
  };
}

describe('draftFromSapBom', () => {
  it('pre-fills a change from the tree SAP holds and counts the text lines it cannot carry', () => {
    const draft = draftFromSapBom(TREE);
    expect(draft.kind).toBe('UPDATE');
    expect([
      draft.item_code,
      draft.item_name,
      draft.quantity,
      draft.warehouse,
      draft.distribution_rule,
    ]).toEqual(['FG0000121', 'CANOLA OIL 1 LTR 20 PCS', '20', 'BH-PF', 'OIL']);
    expect(draft.lines.map((line) => [line.item_type, line.item_code, line.issue_method])).toEqual([
      ['item', 'RM1', 'Backflush'],
      ['resource', 'RES1', 'Manual'],
      ['item', 'PM1', 'Manual'],
    ]);
    expect(draft.droppedTextLines).toBe(1);
  });

  it('reads an unknown BOM type as production', () => {
    expect(draftFromSapBom({ ...TREE, bom_type: '' }).bom_type).toBe('Production');
  });
});

describe('draftError', () => {
  it('passes a complete new BOM', () => {
    expect(draftError(newBom())).toBeNull();
  });

  it('names the first problem', () => {
    expect(draftError(newBom({ item_code: '' }))).toMatch(/Choose the item/);
    expect(draftError(newBom({ item_name: ' ' }))).toMatch(/item name/);
    expect(draftError(newBom({ quantity: '0' }))).toMatch(/above zero/);
    expect(draftError(newBom({ lines: [blankLine()] }))).toMatch(/at least one component/);
    expect(
      draftError(newBom({ lines: [{ ...blankLine(), item_code: 'RM1', quantity: '-1' }] })),
    ).toMatch(/Line 1/);
    expect(
      draftError(newBom({ lines: [{ ...blankLine(), item_code: 'FG0000999', quantity: '1' }] })),
    ).toMatch(/its own item/);
    expect(
      draftError(
        newBom({ lines: [{ ...blankLine(), item_code: 'RM1', comment: 'x'.repeat(101) }] }),
      ),
    ).toMatch(/100 characters/);
  });

  it('a change needs no name of its own', () => {
    expect(draftError({ ...draftFromSapBom(TREE), item_name: '' })).toBeNull();
  });
});

describe('toPayload', () => {
  it('upper-cases codes, trims, and leaves out blank rows', () => {
    const payload = toPayload(
      newBom({ lines: [{ ...blankLine(), item_code: ' rm1 ', quantity: ' 2 ' }, blankLine()] }),
      ' why ',
    );
    expect(payload.item_code).toBe('FG0000999');
    expect(payload.lines).toEqual([
      {
        item_type: 'item',
        item_code: 'RM1',
        item_name: '',
        quantity: '2',
        issue_method: 'Manual',
        warehouse: '',
        unit_cost: '0',
        comment: '',
      },
    ]);
    expect(payload.remarks).toBe('why');
    expect(toPayload(newBom())).not.toHaveProperty('remarks');
  });

  it('keeps the order the lines are in', () => {
    const payload = toPayload(draftFromSapBom(TREE));
    expect(payload.lines.map((line) => line.item_code)).toEqual(['RM1', 'RES1', 'PM1']);
  });
});

describe('draftTotalCost', () => {
  it('is quantity times unit cost over the filled lines', () => {
    expect(draftTotalCost(draftFromSapBom(TREE))).toBeCloseTo(20 * 150.5 + 12);
  });
});

describe('diffLines', () => {
  it('marks what a change adds, removes and changes', () => {
    const diff = diffLines(
      TREE.lines.filter((l) => l.item_type !== 'text'),
      [
        { item_code: 'RM1', quantity: '21' },
        { item_code: 'RES1', quantity: '20' },
        { item_code: 'rm9', item_name: 'New oil', quantity: '1' },
      ],
    );
    expect(diff.map((row) => [row.item_code, row.change, row.before, row.after])).toEqual([
      ['RM1', 'changed', 20, 21],
      ['RES1', 'same', 20, 20],
      ['PM1', 'removed', 1, null],
      ['RM9', 'added', null, 1],
    ]);
  });

  it('sums a component listed twice', () => {
    const [row] = diffLines(
      [{ item_code: 'A', quantity: 2 }],
      [
        { item_code: 'A', quantity: '1' },
        { item_code: 'a', quantity: '1' },
      ],
    );
    expect(row.change).toBe('same');
  });
});

describe('request tabs', () => {
  const counts = { PENDING: 2, L1_APPROVED: 1, L2_APPROVED: 1, SAP_PUSHED: 5, ACTIONABLE: 3 };

  it('counts each tab from the server counts', () => {
    const byId = Object.fromEntries(REQUEST_TABS.map((tab) => [tab.id, tabCount(tab, counts)]));
    expect(byId['my-turn']).toBe(3);
    expect(byId.open).toBe(4);
    expect(byId['in-approval']).toBe(2);
    expect(byId.pushed).toBe(5);
    expect(byId.all).toBe(9);
    expect(byId.mine).toBeNull();
  });

  it('shows my turn to approvers only', () => {
    expect(REQUEST_TABS.filter((tab) => tab.approversOnly).map((tab) => tab.id)).toEqual([
      'my-turn',
    ]);
  });
});
