/**
 * One company's bills on one vehicle link must all come from the same SAP
 * branch (BPL). The server refuses the link otherwise
 * (`DispatchPlansService.update_linked_plans`), but only once the whole
 * linking form has been filled in — so the bill pickers check the same rule as
 * each bill is chosen. Companies are separate SAP databases with their own
 * branches, and a truck is linked one company at a time, so the rule is per
 * company. A bill SAP gives no branch is left out, as the server leaves it out.
 */
import type { DispatchBill } from '@/modules/dashboards/dispatch-plans/types';

type BranchBill = Pick<DispatchBill, 'doc_num' | 'company_code' | 'branch_id' | 'branch_name'>;

function branchLabel(bill: BranchBill): string {
  return bill.branch_name?.trim() || `branch ${bill.branch_id}`;
}

/**
 * Why `candidate` cannot join `chosen` on one link, or '' when it can.
 */
export function branchClash(candidate: BranchBill, chosen: BranchBill[]): string {
  if (candidate.branch_id == null) return '';
  const other = chosen.find(
    (bill) =>
      bill.doc_num !== candidate.doc_num &&
      (bill.company_code ?? '') === (candidate.company_code ?? '') &&
      bill.branch_id != null &&
      bill.branch_id !== candidate.branch_id,
  );
  if (!other) return '';
  return `${candidate.doc_num} is ${branchLabel(candidate)}, but ${other.doc_num} is ${branchLabel(
    other,
  )}. One company's bills on a vehicle must come from one SAP branch — link them separately.`;
}

/** The first clash within a set of chosen bills, or '' when they can go together. */
export function firstBranchClash(bills: BranchBill[]): string {
  for (const bill of bills) {
    const clash = branchClash(bill, bills);
    if (clash) return clash;
  }
  return '';
}

export function branchOf(bill: BranchBill): string {
  return bill.branch_id == null ? '' : branchLabel(bill);
}
