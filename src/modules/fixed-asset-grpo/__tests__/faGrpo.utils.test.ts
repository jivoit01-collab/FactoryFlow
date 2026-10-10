import { describe, expect, it } from 'vitest';

import type { FAOpenPO, FAPOReceipt, FASapFlags } from '../types';
import {
  buildLinkItems,
  buildLinkRows,
  draftLineValues,
  emptyPageFallback,
  type FALinkRow,
  linkFormError,
  linkRowError,
  monthParams,
  OVER_RECEIPT_TOLERANCE,
  overReceiptCeiling,
  postBlockReason,
  postingWarehouses,
  reusableDraftId,
  sapQueuedConflict,
  todayLocalISO,
} from '../utils/faGrpo.utils';

const sap = (over: Partial<FASapFlags> = {}): FASapFlags => ({
  enabled: true,
  simulate: false,
  allow_live: false,
  is_test_db: true,
  cutover: null,
  warehouses: ['BH-FA', 'DL-FA', 'GP-FA'],
  ...over,
});

const ready = {
  canPost: true,
  sap: sap(),
  closed: false,
  beforeCutover: false,
  draftOnItsWay: false,
  hasPO: true,
  previewLoading: false,
  previewFailed: false,
  simulatedExists: false,
  postableCount: 1,
};

const openPO: FAOpenPO = {
  po_number: '221026008',
  supplier_code: 'VENDA001768',
  supplier_name: 'Vendor',
  doc_entry: 14180,
  branch_id: 2,
  vendor_ref: '',
  doc_date: '2026-10-01',
  items: [
    {
      po_item_code: 'CG0000073',
      item_name: 'Tank',
      ordered_qty: 2,
      received_qty: 0,
      remaining_qty: 2,
      uom: 'NOS',
      rate: 1270,
      line_num: 0,
      tax_code: 'GST18',
      warehouse_code: 'BH-FA',
      account_code: '1204023',
      variety: '',
    },
    {
      po_item_code: 'CG0000074',
      item_name: 'Pump',
      ordered_qty: 5,
      received_qty: 5,
      remaining_qty: 0,
      uom: 'NOS',
      rate: 50,
      line_num: 1,
      tax_code: 'GST18',
      warehouse_code: 'DL-FA',
      account_code: '1204023',
      variety: '',
    },
  ],
};

const row = (over: Partial<FALinkRow> = {}): FALinkRow => ({
  line_num: 0,
  po_item_code: 'CG0000073',
  item_name: 'Tank',
  uom: 'NOS',
  warehouse_code: 'BH-FA',
  ordered_qty: 10,
  received_before: 0,
  open_qty: 10,
  rate: 1,
  received_now: '10',
  ...over,
});

describe('todayLocalISO', () => {
  it('uses the local calendar day, not UTC', () => {
    // 00:30 local on 9 Oct: toISOString() would say 8 Oct east of Greenwich.
    expect(todayLocalISO(new Date(2026, 9, 9, 0, 30))).toBe('2026-10-09');
  });
});

describe('monthParams', () => {
  it('turns YYYY-MM into year + month', () => {
    expect(monthParams('2026-10')).toEqual({ year: 2026, month: 10 });
  });
  it('sends nothing for an empty or bad value', () => {
    expect(monthParams('')).toEqual({});
    expect(monthParams('2026-13')).toEqual({});
  });
});

describe('the 110% ceiling', () => {
  it('is open x 1.1 when the company enforces it, and none otherwise', () => {
    expect(OVER_RECEIPT_TOLERANCE).toBe(1.1);
    expect(overReceiptCeiling(10, true)).toBeCloseTo(11);
    expect(overReceiptCeiling(10, false)).toBeNull();
  });

  it('refuses more than 110% of open only when enforced', () => {
    expect(linkRowError(row({ received_now: '11' }), true)).toBeNull();
    expect(linkRowError(row({ received_now: '11.5' }), true)).toMatch(/At most 11/);
    expect(linkRowError(row({ received_now: '11.5' }), false)).toBeNull();
  });

  it('refuses a receipt on a line with nothing open when enforced', () => {
    expect(linkRowError(row({ open_qty: 0, received_now: '1' }), true)).toMatch(/Nothing is open/);
  });

  it('allows zero (the line is left out) and refuses a negative', () => {
    expect(linkRowError(row({ received_now: '0' }), true)).toBeNull();
    expect(linkRowError(row({ received_now: '-1' }), true)).toMatch(/zero or more/);
  });
});

describe('link rows and request', () => {
  it('starts each line at its open quantity for a new link', () => {
    const rows = buildLinkRows(openPO, null);
    expect(rows.map((r) => r.received_now)).toEqual(['2', '0']);
    expect(rows[0].warehouse_code).toBe('BH-FA');
    expect(rows[1].received_before).toBe(5);
  });

  it('starts at what was linked when the same PO is already on the entry', () => {
    const existing = {
      po_number: '221026008',
      items: [{ sap_line_num: 0, received_qty: '1.000' }],
    } as unknown as FAPOReceipt;
    const rows = buildLinkRows(openPO, existing);
    expect(rows.map((r) => r.received_now)).toEqual(['1', '0']);
  });

  it('sends only lines with a quantity above zero', () => {
    const items = buildLinkItems([
      row({ received_now: '3' }),
      row({ line_num: 1, received_now: '0' }),
    ]);
    expect(items).toEqual([
      { line_num: 0, po_item_code: 'CG0000073', item_name: 'Tank', received_qty: 3, uom: 'NOS' },
    ]);
  });

  it('needs at least one line', () => {
    expect(linkFormError([row({ received_now: '0' })], false)).toMatch(/at least one/);
    expect(linkFormError([row({ received_now: '2' })], false)).toBeNull();
  });
});

describe('postingWarehouses', () => {
  it('lists the distinct warehouses of lines that will post', () => {
    expect(
      postingWarehouses([
        { warehouse_code: 'BH-FA', qty: '1' },
        { warehouse_code: 'DL-FA', qty: 0 },
        { warehouse_code: 'BH-FA', qty: 2 },
      ]),
    ).toEqual(['BH-FA']);
    expect(
      postingWarehouses([
        { warehouse_code: 'DL-FA', qty: 1 },
        { warehouse_code: 'BH-FA', qty: 1 },
      ]),
    ).toEqual(['BH-FA', 'DL-FA']);
  });
});

describe('emptyPageFallback', () => {
  const pageOf = (results: unknown[], page: number, total_pages: number) => ({
    results,
    page,
    total_pages,
  });

  it('leaves a page with rows, page 1 and no data alone', () => {
    expect(emptyPageFallback(undefined)).toBeNull();
    expect(emptyPageFallback(pageOf([1], 2, 2))).toBeNull();
    expect(emptyPageFallback(pageOf([], 1, 1))).toBeNull();
  });

  it('steps back to the last page that has rows', () => {
    // 26 rows -> 25: page 2 is now past the end.
    expect(emptyPageFallback(pageOf([], 2, 1))).toBe(1);
    expect(emptyPageFallback(pageOf([], 5, 3))).toBe(3);
    // The list emptied entirely: total_pages is still 1.
    expect(emptyPageFallback(pageOf([], 3, 1))).toBe(1);
    // Defensive: an empty page inside the range goes back one.
    expect(emptyPageFallback(pageOf([], 3, 4))).toBe(2);
  });
});

describe('postBlockReason', () => {
  it('lets a TEST database post', () => {
    expect(postBlockReason(ready)).toBeNull();
  });

  it('needs the post right', () => {
    expect(postBlockReason({ ...ready, canPost: false })).toMatch(/post right/);
  });

  it('says when the switch is off', () => {
    expect(postBlockReason({ ...ready, sap: sap({ enabled: false }) })).toMatch(
      /FIXED_ASSET_GRPO_ENABLED/,
    );
  });

  it('refuses a live database when live posting is not allowed', () => {
    expect(postBlockReason({ ...ready, sap: sap({ is_test_db: false }) })).toMatch(
      /FIXED_ASSET_GRPO_ALLOW_LIVE/,
    );
    expect(postBlockReason({ ...ready, sap: sap({ is_test_db: null }) })).toMatch(
      /Could not confirm/,
    );
  });

  it('allows a live database when live posting is allowed, and always allows simulate', () => {
    expect(
      postBlockReason({ ...ready, sap: sap({ is_test_db: false, allow_live: true }) }),
    ).toBeNull();
    expect(
      postBlockReason({ ...ready, sap: sap({ is_test_db: false, simulate: true }) }),
    ).toBeNull();
  });

  it('explains closed, cut-over, on its way, simulated and nothing to post', () => {
    expect(postBlockReason({ ...ready, closed: true })).toMatch(/by hand/);
    expect(postBlockReason({ ...ready, beforeCutover: true, cutover: '2026-10-01' })).toMatch(
      /2026-10-01/,
    );
    expect(postBlockReason({ ...ready, draftOnItsWay: true })).toMatch(/on its way/);
    expect(postBlockReason({ ...ready, simulatedExists: true, postableCount: 0 })).toMatch(
      /simulated/i,
    );
    expect(postBlockReason({ ...ready, postableCount: 0 })).toMatch(/Nothing to post/);
  });

  it('asks for the PO link when no PO is linked, not "nothing to post"', () => {
    const reason = postBlockReason({ ...ready, hasPO: false, postableCount: 0 });
    expect(reason).toMatch(/Link the SAP PO first/);
    expect(reason).not.toMatch(/Nothing to post/);
  });

  it('says the PO lines are loading while the preview loads', () => {
    const reason = postBlockReason({ ...ready, previewLoading: true, postableCount: 0 });
    expect(reason).toMatch(/Loading the PO lines/);
  });

  it('says the PO lines failed to load when the preview errors', () => {
    const reason = postBlockReason({ ...ready, previewFailed: true, postableCount: 0 });
    expect(reason).toMatch(/could not be loaded/);
    expect(reason).not.toMatch(/Nothing to post/);
  });
});

describe('sapQueuedConflict', () => {
  it('reads a 409 SAP_QUEUED as waiting', () => {
    const result = sapQueuedConflict({
      status: 409,
      message: 'x',
      response: {
        status: 409,
        data: { code: 'SAP_QUEUED', detail: 'On its way', grpo_posting_id: 5 },
      },
    });
    expect(result).toEqual({ message: 'On its way', grpoPostingId: 5 });
  });

  it('ignores any other refusal', () => {
    expect(sapQueuedConflict({ status: 409, response: { data: {} } })).toBeNull();
    expect(
      sapQueuedConflict({ status: 400, response: { data: { code: 'FA_GRPO_MIXED_WAREHOUSES' } } }),
    ).toBeNull();
    expect(sapQueuedConflict(null)).toBeNull();
  });
});

describe('saved drafts', () => {
  it('reuses a DRAFT/FAILED/QUEUED draft unless the queue holds it', () => {
    const draft = { id: 3, status: 'FAILED', on_its_way: false } as never;
    expect(reusableDraftId(draft)).toBe(3);
    expect(reusableDraftId({ id: 3, status: 'QUEUED', on_its_way: true } as never)).toBeUndefined();
    expect(reusableDraftId(null)).toBeUndefined();
  });

  it('reads the saved line values back by po_item_receipt_id', () => {
    const values = draftLineValues({
      vehicle_entry_id: 1,
      po_receipt_ids: [9],
      branch_id: 2,
      items: [
        {
          po_item_receipt_id: 5,
          accepted_qty: 1,
          unit_price: 1270,
          tax_code: 'GST18',
          batches: [{ batch_number: 'L1', quantity: 1 }],
        },
      ],
    });
    expect(values[5]).toEqual({
      accepted_qty: 1,
      unit_price: 1270,
      tax_code: 'GST18',
      gl_account: undefined,
      batch_number: 'L1',
    });
  });
});
