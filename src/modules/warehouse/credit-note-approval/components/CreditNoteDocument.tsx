/**
 * The whole credit note, when the approver wants more than the row shows:
 * its document and due dates, every line with UoM, price and tax, the journal
 * SAP will post and what it was copied from — the document browser's view of
 * the draft, read through the queue on its own right. Attachments are listed
 * separately in the panel.
 */
import { FileSearch } from 'lucide-react';
import { useState } from 'react';

import { DocumentDetailBody } from '@/modules/sap-documents/components/DocumentDetailDialog';
import { Button } from '@/shared/components/ui';

import { useCreditNoteDocument } from '../api/creditNoteApproval.queries';

export function CreditNoteDocument({ wddCode }: { wddCode: number }) {
  const [asked, setAsked] = useState(false);
  const query = useCreditNoteDocument(wddCode, asked);
  if (!asked) {
    return (
      <Button size="sm" variant="outline" onClick={() => setAsked(true)}>
        <FileSearch className="mr-1.5 h-3.5 w-3.5" />
        Show the whole credit note
      </Button>
    );
  }
  if (query.isLoading) return <p className="text-xs text-muted-foreground">Reading the credit note from SAP…</p>;
  if (query.isError || !query.data) {
    return <p className="text-xs text-red-700 dark:text-red-400">SAP could not be read for this credit note.</p>;
  }
  return (
    <div className="space-y-4 rounded-md border border-border bg-background/60 p-3">
      <DocumentDetailBody doc={query.data} attachments={null} />
    </div>
  );
}
