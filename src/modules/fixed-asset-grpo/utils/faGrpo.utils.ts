/**
 * Pure helpers for the Fixed Asset GRPO screens. No React, no API: everything
 * here is unit-tested in `__tests__/faGrpo.utils.test.ts`.
 */
import { formatDateToISOString } from '@/shared/utils';

import type {
  FAOpenDraft,
  FAOpenPO,
  FAPOLinkItem,
  FAPOReceipt,
  FASapFlags,
  GRPODraftPayload,
} from '../types';

// ─── numbers and dates ─────────────────────────────────────────

/** A decimal from the API (string or number) as a number; 0 for anything unreadable. */
export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** A quantity for an input box: at most three decimals, no trailing zeros. */
export function formatQty(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}

/**
 * Today as YYYY-MM-DD in the browser's own time zone.
 *
 * Not `toISOString().slice(0, 10)`: that is UTC, which in India is still
 * yesterday until 05:30 -- the posting-date box would then refuse today.
 */
export function todayLocalISO(now: Date = new Date()): string {
  return formatDateToISOString(now);
}

/** `<input type="month">`'s "YYYY-MM" as the lists' year + month params ({} when empty). */
export function monthParams(value: string): { year?: number; month?: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(value || '');
  if (!match) return {};
  const month = Number(match[2]);
  if (month < 1 || month > 12) return {};
  return { year: Number(match[1]), month };
}

// ─── the 110% over-receipt ceiling (PO link) ───────────────────

/**
 * SAP refuses a receipt above 110% of the PO line's OPEN quantity (error
 * 200017). Kept in step with raw_material_gatein/services/validations.py and
 * the gate's own pickers.
 */
export const OVER_RECEIPT_TOLERANCE = 1.1;

/** Most that may be received on a line; null when this company does not enforce it. */
export function overReceiptCeiling(openQty: number, enforced: boolean): number | null {
  return enforced ? openQty * OVER_RECEIPT_TOLERANCE : null;
}

/** One PO line as the Link PO dialog edits it. */
export interface FALinkRow {
  line_num: number;
  po_item_code: string;
  item_name: string;
  uom: string;
  warehouse_code: string;
  ordered_qty: number;
  /** Already received in SAP on this line. */
  received_before: number;
  /** SAP's open quantity. */
  open_qty: number;
  rate: number;
  /** What arrived on this entry, as typed. Zero or blank leaves the line out. */
  received_now: string;
}

/**
 * The dialog's rows for a PO. When the entry already holds this same PO, each
 * line starts at what was linked before (lines not linked start at 0);
 * otherwise each line starts at its open quantity.
 */
export function buildLinkRows(po: FAOpenPO, existing?: FAPOReceipt | null): FALinkRow[] {
  const samePO = !!existing && existing.po_number === po.po_number;
  const linked = new Map<number, number>();
  if (samePO) {
    for (const item of existing!.items) {
      if (item.sap_line_num !== null) linked.set(item.sap_line_num, toNumber(item.received_qty));
    }
  }
  return po.items.map((item) => {
    const open = Math.max(toNumber(item.remaining_qty), 0);
    const start = samePO ? (linked.get(item.line_num) ?? 0) : open;
    return {
      line_num: item.line_num,
      po_item_code: item.po_item_code,
      item_name: item.item_name,
      uom: item.uom,
      warehouse_code: item.warehouse_code || '',
      ordered_qty: toNumber(item.ordered_qty),
      received_before: toNumber(item.received_qty),
      open_qty: open,
      rate: toNumber(item.rate),
      received_now: formatQty(start),
    };
  });
}

/** Why one row cannot be linked as typed (null when it can). */
export function linkRowError(row: FALinkRow, enforced: boolean): string | null {
  const raw = row.received_now.trim();
  if (raw === '') return null;
  const qty = Number(raw);
  if (!Number.isFinite(qty) || qty < 0) return 'Enter a quantity of zero or more.';
  if (qty === 0) return null;
  if (!enforced) return null;
  if (row.open_qty <= 0) {
    return 'Nothing is open on this PO line, so SAP will not accept another receipt.';
  }
  const ceiling = overReceiptCeiling(row.open_qty, enforced)!;
  if (qty > ceiling + 1e-9) {
    return `At most ${formatQty(ceiling)} ${row.uom} (open ${formatQty(row.open_qty)} + 10%).`;
  }
  return null;
}

/** The lines to send: every row with a quantity above zero. */
export function buildLinkItems(rows: FALinkRow[]): FAPOLinkItem[] {
  return rows
    .filter((row) => toNumber(row.received_now) > 0)
    .map((row) => ({
      line_num: row.line_num,
      po_item_code: row.po_item_code,
      item_name: row.item_name,
      received_qty: toNumber(row.received_now),
      uom: row.uom,
    }));
}

/** The first thing stopping the link, or null when it can be sent. */
export function linkFormError(rows: FALinkRow[], enforced: boolean): string | null {
  for (const row of rows) {
    const error = linkRowError(row, enforced);
    if (error) return `${row.po_item_code} (line ${row.line_num}): ${error}`;
  }
  if (buildLinkItems(rows).length === 0) {
    return 'Enter the quantity received on at least one PO line.';
  }
  return null;
}

// ─── one warehouse per GRPO ────────────────────────────────────

/**
 * The distinct warehouses of the lines that will post (quantity above zero).
 * The engine sends one header warehouse, so the backend refuses more than one
 * with `FA_GRPO_MIXED_WAREHOUSES`; the screens use this to warn first.
 */
export function postingWarehouses(
  lines: { warehouse_code?: string | null; qty: number | string | null | undefined }[],
): string[] {
  const codes = new Set<string>();
  for (const line of lines) {
    const code = (line.warehouse_code || '').trim();
    if (code && toNumber(line.qty) > 0) codes.add(code);
  }
  return [...codes].sort();
}

// ─── lists ─────────────────────────────────────────────────────

/**
 * The page to step back to when a list page comes back empty past page 1, or
 * null. The backend slices without clamping the page, so after the last row
 * of the last page is linked, posted or closed, the refetch lands on an empty
 * page with no pager; this sends the list to the last page that has rows.
 */
export function emptyPageFallback(
  data: { results: unknown[]; page: number; total_pages: number } | undefined,
): number | null {
  if (!data || data.results.length > 0 || data.page <= 1) return null;
  const target = data.total_pages < data.page ? data.total_pages : data.page - 1;
  return Math.max(1, target);
}

// ─── the Post button ───────────────────────────────────────────

export interface FAPostBlockInput {
  canPost: boolean;
  sap: FASapFlags | undefined;
  closed: boolean;
  beforeCutover: boolean;
  cutover?: string | null;
  draftOnItsWay: boolean;
  /** The entry has a SAP PO linked (the preview is only fetched when it has). */
  hasPO: boolean;
  /** The PO lines (preview) are still loading. */
  previewLoading: boolean;
  /** The PO lines (preview) failed to load. */
  previewFailed: boolean;
  simulatedExists: boolean;
  postableCount: number;
}

/**
 * Why Post is disabled, in the operator's words -- or null when it is not.
 *
 * Mirrors what the backend would refuse, so the reason is on the button
 * before anyone presses it. The SAP rule is the handler's own order: switched
 * off; then simulate (always allowed, it writes nothing); then the live guard
 * (a real send needs `FIXED_ASSET_GRPO_ALLOW_LIVE` or a TEST_ database).
 */
export function postBlockReason(input: FAPostBlockInput): string | null {
  const { sap } = input;
  if (!input.canPost) return 'You need the Fixed Asset GRPO post right to post.';
  if (!sap) return 'Loading the SAP settings…';
  if (!sap.enabled) {
    return 'Fixed-asset GRPO posting is switched off on this server (FIXED_ASSET_GRPO_ENABLED).';
  }
  if (!sap.simulate && !sap.allow_live && sap.is_test_db !== true) {
    return sap.is_test_db === null
      ? 'Could not confirm that SAP is a TEST database, and live posting is not allowed ' +
          '(FIXED_ASSET_GRPO_ALLOW_LIVE is off).'
      : 'This server points at live SAP and live posting is not allowed ' +
          '(FIXED_ASSET_GRPO_ALLOW_LIVE is off).';
  }
  if (input.closed) return 'This entry was done in SAP by hand. Reopen it before posting.';
  if (input.beforeCutover) {
    return `This entry came in before the cut-over${
      input.cutover ? ` (${input.cutover})` : ''
    }; it is posted in SAP by hand.`;
  }
  if (input.draftOnItsWay) {
    return 'This GRPO is already on its way to SAP. It will post by itself once SAP answers.';
  }
  // Before "nothing to post": with no PO, or no preview yet, the empty list
  // says nothing about what is posted.
  if (!input.hasPO) return 'Link the SAP PO first.';
  if (input.previewLoading) return 'Loading the PO lines…';
  if (input.previewFailed) return 'The PO lines could not be loaded. Reload the page.';
  if (input.simulatedExists && input.postableCount === 0) {
    return 'A simulated GRPO exists. Discard it in history before posting for real.';
  }
  if (input.postableCount === 0) return 'Nothing to post: every linked PO is already posted.';
  return null;
}

// ─── outcomes ──────────────────────────────────────────────────

/**
 * A 409 `SAP_QUEUED` answer: this GRPO is already waiting for SAP. Not a
 * failure -- it posts by itself -- so the page shows it as "waiting".
 */
export function sapQueuedConflict(
  error: unknown,
): { message: string; grpoPostingId: number | null } | null {
  if (!error || typeof error !== 'object') return null;
  const err = error as {
    status?: number;
    message?: string;
    response?: { status?: number; data?: Record<string, unknown> };
  };
  const status = err.status ?? err.response?.status;
  const data = err.response?.data ?? {};
  if (status !== 409 || data.code !== 'SAP_QUEUED') return null;
  const id = data.grpo_posting_id;
  return {
    message:
      (typeof data.detail === 'string' && data.detail) ||
      err.message ||
      'This GRPO is already on its way to SAP.',
    grpoPostingId: typeof id === 'number' ? id : null,
  };
}

/** The error code a refusal carried (e.g. FA_GRPO_MIXED_WAREHOUSES), if any. */
export function errorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const code = (error as { response?: { data?: Record<string, unknown> } }).response?.data?.code;
  return typeof code === 'string' ? code : null;
}

// ─── saved drafts ──────────────────────────────────────────────

/** Whether the post may name this draft as `grpo_posting_id` (not while the queue holds it). */
export function reusableDraftId(draft: FAOpenDraft | null | undefined): number | undefined {
  if (!draft || draft.on_its_way) return undefined;
  return ['DRAFT', 'FAILED', 'QUEUED'].includes(draft.status) ? draft.id : undefined;
}

/** The per-line values a saved draft carried, keyed by `po_item_receipt_id`. */
export interface DraftLineValues {
  accepted_qty?: number;
  unit_price?: number;
  tax_code?: string;
  gl_account?: string;
  batch_number?: string;
}

export function draftLineValues(
  payload: GRPODraftPayload | null | undefined,
): Record<number, DraftLineValues> {
  const out: Record<number, DraftLineValues> = {};
  for (const item of payload?.items ?? []) {
    out[item.po_item_receipt_id] = {
      accepted_qty: item.accepted_qty === undefined ? undefined : toNumber(item.accepted_qty),
      unit_price: item.unit_price === undefined ? undefined : toNumber(item.unit_price),
      tax_code: item.tax_code ?? undefined,
      gl_account: item.gl_account ?? undefined,
      batch_number: item.batches?.[0]?.batch_number,
    };
  }
  return out;
}
