import { describe, expect, it } from 'vitest';

import type {
  BatchSapInfo,
  BunchSapPlan,
  GroupSapPlan,
  GrpoSapPlan,
  VoucherSapPlan,
} from '../types';
import {
  canChangeBills,
  canClosePO,
  canEditForSap,
  canLeaveOut,
  canRedateGrpo,
  errorCode,
  neverPosted,
  nothingInSap,
  planHasFailedWork,
  planHasLiveWork,
} from '../utils/status';

function batch(over: Partial<BatchSapInfo> = {}): BatchSapInfo {
  return {
    id: 1,
    po_status: 'POSTED',
    po_doc_num: 9001,
    po_doc_entry: 501,
    po_draft_entry: null,
    po_error: '',
    po_round: 1,
    po_close_status: 'NOT_NEEDED',
    po_close_error: '',
    simulated: false,
    marker: '[JI-CB PO 1]',
    requested_by_name: '',
    requested_at: null,
    last_sent_by_name: '',
    last_sent_at: null,
    ...over,
  };
}

function grpo(over: Partial<GrpoSapPlan> = {}): GrpoSapPlan {
  return {
    id: 11,
    group_key: 'V1',
    voucher_ids: [1],
    bill_date: '2026-09-03',
    posting_date: '2026-09-03',
    gate_entry_no: '',
    amount: '350.00',
    num_at_card: '350/03-09-26',
    status: 'PLANNED',
    doc_num: null,
    error: '',
    simulated: false,
    sap_posting: null,
    ...over,
  };
}

function voucher(over: Partial<VoucherSapPlan> = {}): VoucherSapPlan {
  return {
    entry_id: 1,
    serial_number: 1,
    entry_date: '2026-09-03',
    bill_date: '2026-09-03',
    gate_entry_no: '',
    supplier_bill_no: '',
    branch_id: 1,
    branch_name: 'Oil',
    gl_account_code: '5630004',
    gl_account_name: 'Repairs',
    account_code: '5630004',
    item: '',
    detail: '',
    amount: '350.00',
    sap_company_code: 'JIVO_OIL',
    routing_id: 1,
    treatment: 'ITEM',
    treatment_source: 'MAP',
    skip_reason: '',
    item_code: 'CG0001',
    item_name: 'Pipe',
    warehouse_code: 'BH-FA',
    tax_code: 'IGST@0',
    ocr_code: '',
    ocr_code2: '09-2026',
    ocr_code3: '',
    ocr_code5: '',
    has_bill: true,
    bill_count: 1,
    overridden: false,
    frozen: true,
    left_out_after_po: false,
    grpo_id: 11,
    po_line_num: 0,
    warnings: [],
    problems: [],
    ...over,
  };
}

function group(over: Partial<GroupSapPlan> = {}): GroupSapPlan {
  return {
    sap_company_code: 'JIVO_OIL',
    mode: 'PO_GRPO',
    vendor_code: 'ORGV000465',
    bpl_id: 1,
    warehouse_code: 'BH-FA',
    ap_drafts_enabled: false,
    grpo_grouping: 'NONE',
    is_test_target: true,
    expense_month: '2026-09-01',
    po_doc_date: '2026-09-01',
    po_due_date: '2026-09-03',
    item_total: '350.00',
    service_total: '0',
    total: '350.00',
    sendable: true,
    vouchers: [voucher()],
    grpos: [grpo()],
    problems: [],
    notes: [],
    batch: batch(),
    po: {
      kind: 'cash_sap.po',
      source_id: 1,
      status: 'POSTED',
      doc_num: 9001,
      error: '',
      simulated: false,
      sap_posting: null,
      draft_entry: null,
      stopped: false,
      label: 'Imprest PO',
    },
    po_close: null,
    ap_drafts: [],
    can_post: false,
    ...over,
  };
}

function plan(groups: GroupSapPlan[], skipped: VoucherSapPlan[] = []): BunchSapPlan {
  return {
    bunch: {
      id: 1,
      number: 17,
      remarks: '',
      sent_at: null,
      entry_count: 1,
      total: '350.00',
      frozen_at: null,
      sap_state: 'FROZEN',
      drift: {},
    },
    enabled: true,
    simulate: false,
    allow_live: false,
    groups,
    unrouted: [],
    skipped,
    problems: [],
    can_post: false,
    summary: {
      bunch_id: 1,
      state: 'IN_PROGRESS',
      label: 'Posting',
      po_doc_nums: [],
      grpo_posted: 0,
      grpo_total: 1,
      failed: 0,
      simulated: false,
    },
  };
}

describe('plan readings', () => {
  it('polls while anything is queued or in approval', () => {
    expect(planHasLiveWork(plan([group({ grpos: [grpo({ status: 'QUEUED' })] })]))).toBe(true);
    expect(planHasLiveWork(plan([group({ grpos: [grpo({ status: 'IN_APPROVAL' })] })]))).toBe(true);
    expect(planHasLiveWork(plan([group()]))).toBe(false);
    expect(planHasLiveWork(undefined)).toBe(false);
  });

  it('ignores the preview GRPOs of an unfrozen bunch', () => {
    const preview = group({
      batch: null,
      po: null,
      grpos: [grpo({ id: null, status: 'PLANNED' })],
    });
    expect(planHasLiveWork(plan([preview]))).toBe(false);
  });

  it('offers Retry for refused or approval-held documents', () => {
    expect(planHasFailedWork(plan([group({ grpos: [grpo({ status: 'FAILED' })] })]))).toBe(true);
    expect(planHasFailedWork(plan([group()]))).toBe(false);
  });

  it('offers Reset only while nothing is in SAP', () => {
    expect(nothingInSap(plan([group()]))).toBe(false);
    expect(
      nothingInSap(plan([group({ batch: batch({ po_doc_entry: null, po_status: 'FAILED' }) })])),
    ).toBe(true);
    expect(nothingInSap(plan([group({ batch: batch({ simulated: true }) })]))).toBe(true);
  });

  it('counts a GRPO held in SAP approval as in SAP (it has a draft entry)', () => {
    const noPo = batch({ po_doc_entry: null, po_status: 'FAILED' });
    expect(
      nothingInSap(plan([group({ batch: noPo, grpos: [grpo({ status: 'IN_APPROVAL' })] })])),
    ).toBe(false);
    expect(
      nothingInSap(
        plan([group({ batch: noPo, grpos: [grpo({ status: 'POSTED', doc_num: null })] })]),
      ),
    ).toBe(false);
    expect(nothingInSap(plan([group({ batch: noPo, grpos: [grpo({ status: 'FAILED' })] })]))).toBe(
      true,
    );
    const simulated = batch({ po_doc_entry: null, simulated: true });
    expect(
      nothingInSap(plan([group({ batch: simulated, grpos: [grpo({ status: 'IN_APPROVAL' })] })])),
    ).toBe(true);
  });

  it('offers a re-date for an open GRPO once the PO is committed', () => {
    const g = group();
    expect(canRedateGrpo(g, grpo())).toBe(true);
    expect(canRedateGrpo(g, grpo({ status: 'POSTED', doc_num: 4 }))).toBe(false);
    expect(
      canRedateGrpo(group({ batch: batch({ po_status: 'PLANNED', po_doc_entry: null }) }), grpo()),
    ).toBe(false);
  });

  it('needs the PO in SAP, not merely queued or in approval (services._committed_po)', () => {
    const queued = group({
      batch: batch({ po_status: 'QUEUED', po_doc_entry: null, po_doc_num: null }),
    });
    const approval = group({
      batch: batch({
        po_status: 'IN_APPROVAL',
        po_doc_entry: null,
        po_doc_num: null,
        po_draft_entry: 77,
      }),
    });
    for (const g of [queued, approval]) {
      expect(canRedateGrpo(g, grpo())).toBe(false);
      expect(canLeaveOut(g, voucher())).toBe(false);
    }
    const simulated = group({
      batch: batch({ po_status: 'POSTED', po_doc_entry: null, simulated: true }),
    });
    expect(canRedateGrpo(simulated, grpo())).toBe(true);
    expect(canLeaveOut(simulated, voucher())).toBe(true);
    const simulatedQueued = group({
      batch: batch({ po_status: 'QUEUED', po_doc_entry: null, simulated: true }),
    });
    expect(canLeaveOut(simulatedQueued, voucher())).toBe(false);
  });

  it('offers Leave out for a goods voucher whose GRPO is still open', () => {
    const g = group();
    expect(canLeaveOut(g, voucher())).toBe(true);
    expect(canLeaveOut(g, voucher({ treatment: 'SERVICE' }))).toBe(false);
    expect(canLeaveOut(group({ grpos: [grpo({ status: 'POSTED', doc_num: 3 })] }), voucher())).toBe(
      false,
    );
  });

  it('offers Close the PO after a voucher was left out and the rest are in', () => {
    const left = voucher({
      entry_id: 2,
      treatment: 'SKIP',
      left_out_after_po: true,
      grpo_id: null,
    });
    const done = group({ grpos: [grpo({ status: 'POSTED', doc_num: 5 })] });
    expect(canClosePO(plan([done], [left]), done)).toBe(true);
    expect(canClosePO(plan([done], []), done)).toBe(false);
    const open = group({ grpos: [grpo({ status: 'FAILED' })] });
    expect(canClosePO(plan([open], [left]), open)).toBe(false);
    const closing = group({
      grpos: [grpo({ status: 'POSTED', doc_num: 5 })],
      batch: batch({ po_close_status: 'QUEUED' }),
    });
    expect(canClosePO(plan([closing], [left]), closing)).toBe(false);
  });

  it('does not offer Edit for SAP on cash received or a salary advance', () => {
    const cashIn = voucher({
      treatment: 'SKIP',
      treatment_source: 'RULE',
      routing_id: null,
      sap_company_code: '',
      frozen: false,
      grpo_id: null,
      skip_reason: 'Cash received — never posted',
    });
    expect(neverPosted(cashIn)).toBe(true);
    expect(canEditForSap(cashIn)).toBe(false);
    const cutOver = voucher({
      ...cashIn,
      routing_id: 3,
      sap_company_code: 'JIVO_OIL',
      skip_reason: 'Dated before the cut-over',
    });
    expect(neverPosted(cutOver)).toBe(false);
    expect(canEditForSap(cutOver)).toBe(true);
    const unrouted = voucher({
      treatment: 'UNROUTED',
      treatment_source: 'RULE',
      routing_id: null,
      frozen: false,
    });
    expect(canEditForSap(unrouted)).toBe(true);
    expect(canEditForSap(voucher({ frozen: true }))).toBe(false);
  });

  it('lets a bill be added to a frozen goods voucher while its GRPO is open', () => {
    const g = group();
    expect(canChangeBills(g, voucher())).toBe(true);
    expect(canChangeBills(group({ grpos: [grpo({ status: 'QUEUED' })] }), voucher())).toBe(true);
    expect(canChangeBills(group({ grpos: [grpo({ status: 'FAILED' })] }), voucher())).toBe(true);
    expect(canChangeBills(group({ grpos: [grpo({ status: 'IN_APPROVAL' })] }), voucher())).toBe(
      false,
    );
    expect(
      canChangeBills(group({ grpos: [grpo({ status: 'POSTED', doc_num: 8 })] }), voucher()),
    ).toBe(false);
    expect(canChangeBills(undefined, voucher())).toBe(false);
    expect(canChangeBills(g, voucher({ treatment: 'SERVICE' }))).toBe(false);
    expect(canChangeBills(g, voucher({ left_out_after_po: true }))).toBe(false);
    expect(canChangeBills(undefined, voucher({ frozen: false, grpo_id: null }))).toBe(true);
    expect(
      canChangeBills(
        undefined,
        voucher({ frozen: false, treatment: 'SKIP', treatment_source: 'RULE', routing_id: null }),
      ),
    ).toBe(false);
  });

  it('reads the code of a cash_sap 400', () => {
    expect(errorCode({ response: { data: { code: 'BUNCH_CHANGED' } } })).toBe('BUNCH_CHANGED');
    expect(errorCode({ response: { data: { detail: 'x' } } })).toBeUndefined();
    expect(errorCode(null)).toBeUndefined();
  });
});
