/**
 * What one search box over five queues is allowed to match.
 *
 * The fields are the point: somebody chasing a transfer arrives holding a
 * number, a warehouse code or an item, and which queue it sits in is the thing
 * they came here to find out.
 */

import { describe, expect, it } from 'vitest';

import type {
  SapAwaitingTransfer,
  SapTransferApproval,
  SapTransferDraft,
  TransferRequestListItem,
} from '../../../types';
import {
  filterBy,
  matchesApproval,
  matchesAwaiting,
  matchesDraft,
  matchesRequest,
  MIN_SEARCH,
} from '../transferSearch';

const request = {
  id: 1,
  entry_no: 'TR-20260914-003',
  from_warehouse: 'BH-BT',
  to_warehouse: 'BH-FG',
  route_type: 'SAME_BRANCH',
  intransit_warehouse: '',
  status: 'APPROVED',
  status_display: 'Approved',
  posting_status: 'NOT_POSTED',
  posting_status_display: 'Stock not moved',
  sap_request_doc_num: '726670021',
  sap_transfer_doc_num: '',
  sap_leg2_doc_num: '',
  requested_by_name: 'Pankaj',
  line_count: 2,
  created_at: '2026-09-14T04:00:00Z',
} as TransferRequestListItem;

const approval = {
  id: 75059,
  obj_type: '67',
  doc_type_label: 'Stock Transfer',
  draft_entry: 56947,
  // Provisional, shared by every open draft in the series, and usually already
  // some other posted document's number.
  doc_num: 926676729,
  posted_doc_entry: 80111,
  posted_doc_num: 726676913,
  from_warehouse: 'BH-BS',
  to_warehouse: 'BH-PC',
  doc_date: '2026-09-12',
  comments: 'Shift 2 top-up',
  status: 'APPROVED',
  rejection_reason: null,
  current_step: 9,
  approver_code: 'USER24',
  approver_name: 'Gautam Chanana',
  decided_by: null,
  decided_by_name: null,
  decided_at: null,
  credentials_configured: false,
  is_mine: false,
  can_decide: false,
  lines: [
    {
      line_num: 0,
      item_code: 'PM0000594',
      item_name: 'PREFORM 40 GMS 36 MM',
      quantity: 50400,
      from_warehouse: 'BH-BS',
      to_warehouse: 'BH-PC',
      source_stock: 12000,
    },
  ],
} as SapTransferApproval;

const awaiting = {
  doc_entry: 9001,
  doc_num: 726670021,
  draft_entry: 4110,
  doc_date: '2026-08-30',
  from_warehouse: 'BH-BT',
  to_warehouse: 'BH-FG',
  comments: 'monthly top-up',
  age_days: 15,
  cross_branch: false,
  can_post: true,
  blocked_reason: null,
  lines: [
    {
      line_num: 0,
      item_code: 'FG0000032',
      item_name: 'COLD PRESS 1 LTR 20 PCS',
      uom: 'PCS',
      quantity: '500',
      open_quantity: '320',
      served_quantity: '180',
      from_warehouse: 'BH-BT',
      to_warehouse: 'BH-FG',
    },
  ],
} as SapAwaitingTransfer;

const draft = {
  draft_entry: 4321,
  doc_num: 726676913,
  doc_date: '2026-07-24',
  from_warehouse: 'BH-GR',
  to_warehouse: 'BH-SC',
  comments: 'disassembly entery',
  journal_memo: null,
  branch_id: 1,
  created_by: 'PANKAJ',
  age_days: 52,
  approval_status: 'Y',
  can_post: true,
  blocked_reason: null,
  warnings: [],
  lines: [
    {
      line_num: 0,
      item_code: 'SC0000007',
      item_name: 'TROLLY BAG',
      uom: 'PCS',
      quantity: '16',
      from_warehouse: 'BH-GR',
      to_warehouse: 'BH-SC',
      source_stock: '16',
      short: false,
      batch_managed: false,
      batches_allocated: 0,
      batches_missing: false,
    },
  ],
} as SapTransferDraft;

describe('transfer search', () => {
  it('finds an app request by entry number, warehouse or who raised it', () => {
    expect(matchesRequest(request, 'tr-20260914')).toBe(true);
    expect(matchesRequest(request, 'bh-fg')).toBe(true);
    expect(matchesRequest(request, 'pankaj')).toBe(true);
    expect(matchesRequest(request, 'bh-zz')).toBe(false);
  });

  it('finds SAP rows by their items, not just their numbers', () => {
    expect(matchesApproval(approval, 'preform')).toBe(true);
    expect(matchesAwaiting(awaiting, 'fg0000032')).toBe(true);
    expect(matchesDraft(draft, 'trolly')).toBe(true);
  });

  it('searches an approval on the number SAP kept, never the draft’s', () => {
    // A pending draft's DocNum is shared across the series and frequently
    // belongs to an unrelated posted document — matching it would answer with
    // rows that have nothing to do with the number typed.
    expect(matchesApproval(approval, '726676913')).toBe(true);
    expect(matchesApproval(approval, '926676729')).toBe(false);
  });

  it('matches a draft on the number the row itself prints', () => {
    expect(matchesDraft(draft, '726676913')).toBe(true);
  });

  it('leaves the list alone until there is something to search on', () => {
    expect(filterBy([request], 'x'.repeat(MIN_SEARCH - 1), matchesRequest)).toHaveLength(1);
    expect(filterBy([request], 'bh-bt', matchesRequest)).toHaveLength(1);
    expect(filterBy([request], 'nothing', matchesRequest)).toHaveLength(0);
    expect(filterBy(undefined, 'bh-bt', matchesRequest)).toEqual([]);
  });
});
