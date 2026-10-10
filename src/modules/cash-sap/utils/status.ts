/**
 * Small, pure readings of a bunch's SAP plan: what each status is called, and
 * the few questions the page asks of the plan to decide which buttons to
 * offer. The backend has the last word on every action -- these only spare
 * the user a button that would be refused.
 */
import type {
  BunchSapPlan,
  GroupSapPlan,
  GrpoSapPlan,
  SapDocStatus,
  UnitStatus,
  VoucherSapPlan,
} from '../types';

/** `SapDocStatus` labels, as the backend's TextChoices word them. */
export const SAP_DOC_STATUS_LABELS: Record<SapDocStatus, string> = {
  PLANNED: 'Not sent',
  QUEUED: 'Waiting for SAP',
  IN_APPROVAL: 'In SAP approval',
  POSTED: 'In SAP',
  FAILED: 'Refused / stopped',
  NOT_NEEDED: 'Not needed',
};

export const TREATMENT_LABELS: Record<string, string> = {
  ITEM: 'Goods (GRPO)',
  SERVICE: 'Service line',
  SKIP: 'Not posted',
  UNROUTED: 'Not routed',
};

/** The statuses whose work is done (`models.DONE_STATUSES`). */
export const DONE_STATUSES: readonly SapDocStatus[] = ['POSTED', 'NOT_NEEDED'];

/** Statuses the worker or SAP will move on by themselves: the page polls while any is shown. */
export const LIVE_STATUSES: readonly SapDocStatus[] = ['QUEUED', 'IN_APPROVAL'];

/** Every unit status of the plan: POs, PO closes, GRPOs and A/P drafts. */
export function planStatuses(plan: BunchSapPlan | undefined | null): SapDocStatus[] {
  if (!plan) return [];
  const out: SapDocStatus[] = [];
  for (const group of plan.groups) {
    if (group.po && group.mode === 'PO_GRPO') out.push(group.po.status);
    if (group.po_close) out.push(group.po_close.status);
    for (const grpo of group.grpos) if (grpo.id != null) out.push(grpo.status);
    for (const draft of group.ap_drafts) out.push(draft.status);
  }
  return out;
}

/** Anything QUEUED or IN_APPROVAL: the page refetches the plan every 15 s while so. */
export function planHasLiveWork(plan: BunchSapPlan | undefined | null): boolean {
  return planStatuses(plan).some((status) => LIVE_STATUSES.includes(status));
}

/** Anything refused or waiting on an approver: Retry has something to do. */
export function planHasFailedWork(plan: BunchSapPlan | undefined | null): boolean {
  return planStatuses(plan).some((status) => status === 'FAILED' || status === 'IN_APPROVAL');
}

/** Has the bunch been frozen at all (any batch)? */
export function planHasBatches(plan: BunchSapPlan | undefined | null): boolean {
  return !!plan && plan.groups.some((group) => group.batch != null);
}

/**
 * Best reading of "nothing from this bunch is in SAP" (`services._anything_in_sap`),
 * from what the plan shows: no PO number or PO draft, no GRPO in SAP or in
 * SAP approval, no A/P draft or document. A simulated batch never reached SAP.
 * The server checks again on Reset; this only decides whether to offer it.
 *
 * The plan's GRPO rows carry no `grpo_draft_entry`; a GRPO held in SAP
 * approval has one but no number, and shows as IN_APPROVAL -- so the status
 * stands in for it.
 */
export function nothingInSap(plan: BunchSapPlan | undefined | null): boolean {
  if (!plan) return false;
  return plan.groups.every((group) => {
    const batch = group.batch;
    if (!batch || batch.simulated) return true;
    if (batch.po_doc_entry != null || batch.po_draft_entry != null) return false;
    const grpoInSap = group.grpos.some(
      (grpo) =>
        grpo.id != null &&
        (grpo.doc_num != null || grpo.status === 'IN_APPROVAL' || grpo.status === 'POSTED'),
    );
    if (grpoInSap) return false;
    return !group.ap_drafts.some((draft) => draft.draft_entry != null || draft.doc_num != null);
  });
}

/**
 * The PO is in SAP (`services._committed_po`): SAP gave it a DocEntry, or the
 * batch is simulated and its PO POSTED. Stricter than "committed" in plan
 * rule 3: a PO still QUEUED or held in SAP approval does not count, because
 * Leave out and re-dating a GRPO both need the real PO.
 */
export function poCommitted(group: GroupSapPlan): boolean {
  const batch = group.batch;
  if (!batch) return false;
  return batch.po_doc_entry != null || (batch.simulated && batch.po_status === 'POSTED');
}

/** Vouchers of this company left out after its PO (they sit in `plan.skipped`). */
export function leftOutVouchers(plan: BunchSapPlan, group: GroupSapPlan): VoucherSapPlan[] {
  return [...group.vouchers, ...plan.skipped].filter(
    (voucher) => voucher.left_out_after_po && voucher.sap_company_code === group.sap_company_code,
  );
}

/**
 * Close the PO in SAP (`services.request_po_close`): the PO is POSTED, a
 * voucher was left out, every GRPO is done, and closing is not under way.
 */
export function canClosePO(plan: BunchSapPlan, group: GroupSapPlan): boolean {
  const batch = group.batch;
  if (!batch || batch.po_status !== 'POSTED') return false;
  if (batch.po_close_status !== 'NOT_NEEDED' && batch.po_close_status !== 'FAILED') return false;
  if (leftOutVouchers(plan, group).length === 0) return false;
  return group.grpos.every((grpo) => DONE_STATUSES.includes(grpo.status));
}

/** The GRPO a voucher is on: by id once frozen, else by the preview's member list. */
export function grpoForVoucher(
  group: GroupSapPlan,
  voucher: VoucherSapPlan,
): GrpoSapPlan | undefined {
  if (voucher.grpo_id != null) {
    const byId = group.grpos.find((grpo) => grpo.id === voucher.grpo_id);
    if (byId) return byId;
  }
  return group.grpos.find((grpo) => grpo.voucher_ids.includes(voucher.entry_id));
}

/** The SERVICE A/P draft unit of a group, if one was made. */
export function serviceDraft(group: GroupSapPlan): UnitStatus | undefined {
  return group.ap_drafts.find((draft) => draft.label.toLowerCase().includes('service'));
}

/**
 * Re-date or change the G.no. of a GRPO (`services.redate_grpo`): it exists,
 * is PLANNED or FAILED and not in SAP, and its PO is in SAP.
 */
export function canRedateGrpo(group: GroupSapPlan, grpo: GrpoSapPlan): boolean {
  if (grpo.id == null || grpo.doc_num != null) return false;
  if (grpo.status !== 'PLANNED' && grpo.status !== 'FAILED') return false;
  return poCommitted(group);
}

/**
 * Leave a goods voucher out after its PO (`services.leave_out_after_po`): on
 * this bunch's PO once that PO is in SAP, not already left out, its GRPO
 * still open.
 */
export function canLeaveOut(group: GroupSapPlan, voucher: VoucherSapPlan): boolean {
  if (voucher.treatment !== 'ITEM' || voucher.left_out_after_po) return false;
  if (!poCommitted(group)) return false;
  const grpo = grpoForVoucher(group, voucher);
  if (!grpo || grpo.id == null || grpo.doc_num != null) return false;
  return grpo.status === 'PLANNED' || grpo.status === 'QUEUED' || grpo.status === 'FAILED';
}

/**
 * Plan rules 1 and 5: cash received, or a salary advance -- never posted,
 * whatever is overridden. Both are skipped before routing is read, so they
 * carry no `routing_id`; the cut-over skip (rule 10) is also a RULE skip but
 * has its routing, and changing the bill date can bring it back.
 */
export function neverPosted(voucher: VoucherSapPlan): boolean {
  return (
    voucher.treatment === 'SKIP' &&
    voucher.treatment_source === 'RULE' &&
    voucher.routing_id == null
  );
}

/**
 * Offer "Edit for SAP": the voucher is not frozen (plan rule 3) and is not
 * one rules 1 / 5 skip before any override is read (`services._apply_info`
 * refuses bill facts on cash received).
 */
export function canEditForSap(voucher: VoucherSapPlan): boolean {
  return !voucher.frozen && !neverPosted(voucher);
}

/**
 * Offer adding or taking off a posting bill (`services.attach_bill`). That has
 * no frozen check: it refuses only once SAP holds the GRPO's attachments. So
 * an unfrozen voucher may, and so may a frozen goods voucher whose GRPO is
 * still open (not in SAP, not in approval) -- the GRPO handler refuses a GRPO
 * with no bill and tells the user to add one. The server refuses the rest.
 */
export function canChangeBills(group: GroupSapPlan | undefined, voucher: VoucherSapPlan): boolean {
  if (neverPosted(voucher) || voucher.left_out_after_po) return false;
  if (!voucher.frozen) return true;
  if (voucher.treatment !== 'ITEM' || !group) return false;
  const grpo = grpoForVoucher(group, voucher);
  if (!grpo || grpo.id == null || grpo.doc_num != null) return false;
  return grpo.status === 'PLANNED' || grpo.status === 'QUEUED' || grpo.status === 'FAILED';
}

/** The `code` a cash_sap 400 carries (`BUNCH_CHANGED`, `CASH_SAP_DISABLED`, `IN_OTHER_BUNCH`). */
export function errorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const data = (error as { response?: { data?: Record<string, unknown> } }).response?.data;
  const code = data?.code;
  if (typeof code === 'string') return code;
  if (Array.isArray(code) && typeof code[0] === 'string') return code[0];
  return undefined;
}

/** The 400 body's `detail`, when it is a sentence. */
export function errorDetail(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const data = (error as { response?: { data?: Record<string, unknown> } }).response?.data;
  const detail = data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && typeof detail[0] === 'string') return detail[0];
  return undefined;
}

/** `format_amount`-like money for the screen: Indian grouping, two decimals. */
export function money(value: string | number | null | undefined): string {
  const n = Number(value ?? 0);
  return (Number.isFinite(n) ? n : 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
