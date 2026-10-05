import type { BillSummary } from '../../api';

export interface BillSummaryEvent {
  key: 'raised' | 'sent' | 'rejected' | 'approved' | 'posted' | 'printed' | 'picked';
  label: string;
  at: string;
  by: string;
  /** Why nobody is named, where that needs saying. */
  note?: string;
}

export type TimedSheet = Pick<
  BillSummary,
  | 'issued_at'
  | 'submitted_at'
  | 'rejected_at'
  | 'approved_at'
  | 'sap_posted_at'
  | 'printed_at'
  | 'picked_at'
  | 'issued_by_name'
  | 'rejected_by_name'
  | 'approved_by_name'
  | 'printed_by_name'
  | 'picked_by_name'
>;

/* `submitted_at` moves every time a sheet is sent again after the warehouse
   handed it back, while `issued_at` stays where it was raised. The two are
   written a moment apart on a sheet sent only once, so a gap of more than a
   minute is a re-send. */
const RESENT_AFTER_MS = 60_000;

function gapMs(from: string | null, to: string | null): number {
  if (!from || !to) return NaN;
  return new Date(to).getTime() - new Date(from).getTime();
}

export function wasResent(sheet: Pick<BillSummary, 'issued_at' | 'submitted_at'>): boolean {
  const gap = gapMs(sheet.issued_at, sheet.submitted_at);
  return Number.isFinite(gap) && gap > RESENT_AFTER_MS;
}

/**
 * Everything that has happened to a sheet, oldest first: when dispatch sent it,
 * when the warehouse sent it back or approved it, and what came after.
 *
 * Empty for a dispatch stamped straight into SAP — nothing was sent or approved
 * here, and the record should not pretend otherwise. The SAP posting is left
 * out unless asked for: it lands seconds after the approval, and on a list it
 * would only repeat it.
 */
export function billSummaryEvents(
  sheet: TimedSheet,
  { withSap = false }: { withSap?: boolean } = {},
): BillSummaryEvent[] {
  const resent = wasResent(sheet);
  const events: (BillSummaryEvent | null)[] = [
    // Only worth its own line once the sheet has been re-sent; otherwise it is
    // the same moment as the send.
    resent
      ? { key: 'raised', label: 'Raised', at: sheet.issued_at, by: sheet.issued_by_name }
      : null,
    sheet.submitted_at
      ? {
          key: 'sent',
          label: resent ? 'Re-sent' : 'Sent',
          at: sheet.submitted_at,
          // Nobody is recorded against a re-send; the raiser is not necessarily
          // the person who fixed it and sent it back.
          by: resent ? '' : sheet.issued_by_name,
        }
      : null,
    sheet.rejected_at
      ? { key: 'rejected', label: 'Sent back', at: sheet.rejected_at, by: sheet.rejected_by_name }
      : null,
    sheet.approved_at
      ? {
          key: 'approved',
          label: 'Approved',
          at: sheet.approved_at,
          by: sheet.approved_by_name,
          // The sheets raised before the warehouse step existed were dated on
          // the form as they were raised, so their approval is the moment of
          // issue and has nobody's name on it.
          note:
            !sheet.approved_by_name &&
            Math.abs(gapMs(sheet.issued_at, sheet.approved_at)) <= RESENT_AFTER_MS
              ? 'Dated when raised, before warehouse approval'
              : undefined,
        }
      : null,
    withSap && sheet.sap_posted_at
      ? { key: 'posted', label: 'Posted to SAP', at: sheet.sap_posted_at, by: '' }
      : null,
    sheet.printed_at
      ? { key: 'printed', label: 'Printed', at: sheet.printed_at, by: sheet.printed_by_name }
      : null,
    sheet.picked_at
      ? { key: 'picked', label: 'Picked', at: sheet.picked_at, by: sheet.picked_by_name }
      : null,
  ];
  return events
    .filter((event): event is BillSummaryEvent => event !== null)
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}
