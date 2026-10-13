import type { DateWarning, SapProblem, VoucherSapPlan } from '../types';

/**
 * A voucher's problems and date warnings as short, plain points for the
 * bunch page's Warnings column.
 *
 * The backend's messages are complete but long, and several of them run
 * together in one narrow cell. Each code is said here in a line -- what is
 * wrong, then what to do -- and the backend's own message stays on the point
 * as its `detail` (shown on hover). A code this file does not know falls back
 * to the backend's message, so nothing is ever hidden.
 *
 * `fix` points block posting and come first; `info` points are for a second
 * look only.
 */
export interface IssuePoint {
  tone: 'fix' | 'info';
  text: string;
  detail: string;
}

const COMPANY_NAMES: Record<string, string> = {
  JIVO_OIL: 'Jivo Oil',
  JIVO_BEVERAGES: 'Jivo Beverages',
  JIVO_MART: 'Jivo Mart',
};

export function companyName(code: string): string {
  return COMPANY_NAMES[code] ?? (code || 'the SAP company');
}

function problemText(p: SapProblem, v: VoucherSapPlan): string {
  const company = companyName(v.sap_company_code);
  switch (p.code) {
    case 'NO_BILL':
      return 'No bill photo. Add one with ↑ in the Bill column.';
    case 'GL_NOT_IN_TARGET':
      return `Account ${v.gl_account_code} is not set up for ${company}. Set it in Cash → SAP settings.`;
    case 'NO_ITEM':
      return 'No SAP item for this head. Choose one with Edit for SAP.';
    case 'NOT_APPROVED':
      return 'Not approved yet. Approve it in Cash Approvals first.';
    case 'UNROUTED':
      return 'No SAP company for this branch. Choose one with Edit for SAP.';
    case 'NO_ROUTING_FOR_COMPANY':
      return `${company} is not set up. Turn it on in Cash → SAP settings.`;
    case 'FUTURE_DATE':
      return 'The bill date is in the future. Correct it with Edit for SAP.';
    case 'IN_OTHER_BUNCH':
      return 'Already on its way to SAP with another bunch. Take it out of this bunch.';
    case 'NOT_ON_PO':
      return 'Became goods after the PO was made. Make it a service line or leave it out.';
    case 'NOT_ON_AP_DRAFT':
      return 'Became a service line after the A/P draft was sent. Leave it out.';
    case 'UNMAPPED_HEAD':
      return 'This head is not in the SAP map, so it is treated as a service line.';
    case 'ITEM_REVIEW':
      return `Item ${v.item_code} is a best guess for this head. Check it against the bill.`;
    case 'AP_ONLY_COMPANY':
      return `${company} takes cash vouchers as service lines only.`;
    default:
      return p.message;
  }
}

function warningText(w: DateWarning): string {
  switch (w.code) {
    case 'BILL_AFTER_ENTRY':
      return 'The bill date is after the voucher date.';
    case 'BILL_OTHER_MONTH':
      return 'The bill and the voucher are in different months.';
    case 'DATE_OLD':
      return 'The date is more than 45 days old.';
    default:
      // LOOKS_SWAPPED carries the date it suggests; its own message says it best.
      return w.message;
  }
}

/** The voucher's points: what blocks posting first, then the rest. */
export function voucherIssuePoints(v: VoucherSapPlan): IssuePoint[] {
  const fix: IssuePoint[] = [];
  const info: IssuePoint[] = [];
  for (const p of v.problems) {
    const point = { text: problemText(p, v), detail: p.message };
    if (p.blocking) fix.push({ tone: 'fix', ...point });
    else info.push({ tone: 'info', ...point });
  }
  for (const w of v.warnings) {
    info.push({ tone: 'info', text: warningText(w), detail: w.message });
  }
  return [...fix, ...info];
}
