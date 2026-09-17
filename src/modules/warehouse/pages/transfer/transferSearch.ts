/**
 * One search box over five queues that have nothing in common but the operator.
 *
 * A transfer is chased with whatever number the last person quoted: an app
 * entry number, a SAP document number, a warehouse code, an item, a name. Which
 * tab it lives in is exactly what the searcher does not know, so the matchers
 * below are per-source and the page runs all of them.
 *
 * Kept out of the components so fast refresh keeps working, and so the fields
 * each queue is searchable on are in one readable list.
 */

import type {
  SapAwaitingTransfer,
  SapTransferApproval,
  SapTransferDraft,
  TransferRequestListItem,
} from '../../types';

/** One character matches nearly everything; below two it is not a search. */
export const MIN_SEARCH = 2;

function hit(needle: string, parts: (string | number | null | undefined)[]): boolean {
  return parts.some(
    (part) => part !== null && part !== undefined && String(part).toLowerCase().includes(needle),
  );
}

export function matchesRequest(row: TransferRequestListItem, needle: string): boolean {
  return hit(needle, [
    row.entry_no,
    row.sap_request_doc_num,
    row.sap_transfer_doc_num,
    row.sap_leg2_doc_num,
    row.from_warehouse,
    row.to_warehouse,
    row.intransit_warehouse,
    row.requested_by_name,
    row.status_display,
    row.posting_status_display,
  ]);
}

/**
 * The approval queue.
 *
 * `doc_num` is deliberately not searched: on a pending row it is the draft's
 * provisional number, it is shared by every open draft in the series, and it
 * usually already belongs to some unrelated posted document — matching on it
 * would answer a search with rows that have nothing to do with the number.
 * `posted_doc_num` is the one SAP kept.
 */
export function matchesApproval(row: SapTransferApproval, needle: string): boolean {
  return (
    hit(needle, [
      row.posted_doc_num,
      row.draft_entry,
      row.from_warehouse,
      row.to_warehouse,
      row.comments,
      row.approver_name,
      row.approver_code,
      row.decided_by_name,
      row.doc_type_label,
    ]) || row.lines.some((line) => hit(needle, [line.item_code, line.item_name]))
  );
}

export function matchesAwaiting(row: SapAwaitingTransfer, needle: string): boolean {
  return (
    hit(needle, [
      row.doc_num,
      row.doc_entry,
      row.draft_entry,
      row.from_warehouse,
      row.to_warehouse,
      row.comments,
    ]) || row.lines.some((line) => hit(needle, [line.item_code, line.item_name]))
  );
}

export function matchesDraft(row: SapTransferDraft, needle: string): boolean {
  return (
    hit(needle, [
      // Provisional, but it is what this row prints, so it has to be findable.
      row.doc_num,
      row.draft_entry,
      row.from_warehouse,
      row.to_warehouse,
      row.comments,
      row.journal_memo,
      row.created_by,
    ]) || row.lines.some((line) => hit(needle, [line.item_code, line.item_name]))
  );
}

/** Filter, or hand back the list untouched when nothing is being searched. */
export function filterBy<T>(
  rows: T[] | undefined,
  needle: string,
  match: (row: T, needle: string) => boolean,
): T[] {
  const all = rows ?? [];
  if (needle.length < MIN_SEARCH) return all;
  return all.filter((row) => match(row, needle));
}
