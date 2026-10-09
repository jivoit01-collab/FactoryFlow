import { StatusPill } from '@/shared/components/page';

import type { APInvoiceDraftListItem } from '../types';

/** Where the entry's A/P invoice draft stands in SAP. */
export function SapDraftPill({
  entry,
}: {
  entry: Pick<APInvoiceDraftListItem, 'sap_status' | 'sap_draft_entry' | 'sap_draft_adopted'>;
}) {
  if (entry.sap_status === 'CREATED') {
    return (
      <StatusPill tone="done" dot>
        Draft {entry.sap_draft_entry}
        {entry.sap_draft_adopted ? ' (made in SAP)' : ''}
      </StatusPill>
    );
  }
  if (entry.sap_status === 'FAILED') {
    return (
      <StatusPill tone="blocked" dot>
        Not in SAP
      </StatusPill>
    );
  }
  return <StatusPill tone="progress">Waiting</StatusPill>;
}
