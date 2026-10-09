import { StatusPill, type StatusTone } from '@/shared/components/page';

import type { GRPOAPInvoiceState, GRPOAPStatus } from '../types';

// Green once the GRPO's A/P is with SAP (drafted or posted); yellow while the
// warehouse still owes it a draft, part-invoiced included.
const TONES: Record<GRPOAPInvoiceState, StatusTone> = {
  POSTED: 'done',
  DRAFT: 'done',
  PARTIAL: 'warn',
  NONE: 'warn',
  CLOSED: 'neutral',
};

function label(status: GRPOAPStatus) {
  const [first, ...more] = status.invoices;
  const numbers = first ? `${first.doc_num}${more.length ? ` +${more.length}` : ''}` : '';
  switch (status.status) {
    case 'POSTED':
      return `A/P invoice ${numbers}`;
    case 'PARTIAL':
      return `A/P invoice ${numbers} (part)`;
    case 'DRAFT':
      return 'A/P draft in SAP';
    case 'CLOSED':
      return 'Closed, no A/P invoice';
    default:
      return 'No A/P invoice';
  }
}

/** Where a GRPO's A/P invoice stands in SAP: posted, part-posted, drafted, or not yet. */
export function APInvoiceStatusBadge({ status }: { status: GRPOAPStatus | undefined }) {
  if (!status) return null;
  const drafts = status.sap_draft_entries.length
    ? `SAP draft ${status.sap_draft_entries.join(', ')}`
    : '';
  return (
    <StatusPill tone={TONES[status.status]} dot>
      <span title={drafts || undefined}>{label(status)}</span>
    </StatusPill>
  );
}
