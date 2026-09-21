import { useCallback, useState } from 'react';

import { BillPrintButton } from '../../ar-invoice/components/ARInvoicePrintButton';
import { useCreditNotePrint } from '../api/creditNoteApproval.queries';

/**
 * "Print PDF" on a credit note the queue has already seen posted.
 *
 * The sheet is the A/R invoice layout — same letterhead, grid and tax block,
 * with the four strings that name the document changed — because the customer
 * reads a credit note beside the bill it reverses. Until now the only way to put
 * one on paper was to open it in the SAP client, which is exactly the thing this
 * queue exists to spare people.
 *
 * `docEntry` is SAP's id for the POSTED document, so the button only appears on
 * a row that has one: a pending request is a decision waiting to be taken, and
 * SAP has not numbered, taxed or dated anything to print yet.
 *
 * Fetched only on the press, like every other print here — each one is a HANA
 * read, and people open a row to see what it credits far more often than to
 * print it. The browser's own dialog does the rest, so "Save as PDF" writes the
 * file wherever it is wanted.
 */
export function CreditNotePrintButton({
  docEntry,
  docNum,
}: {
  docEntry: number;
  docNum?: number | null;
}) {
  const [requested, setRequested] = useState(false);
  // Stable, so the effects inside the shared button key off the document and the
  // error rather than re-running on every render — a re-run is a second toast.
  const request = useCallback(() => setRequested(true), []);
  const settled = useCallback(() => setRequested(false), []);
  const { data, isFetching, error } = useCreditNotePrint(requested ? docEntry : null);

  return (
    <BillPrintButton
      bill={data}
      isFetching={isFetching}
      error={error}
      requested={requested}
      onRequest={request}
      onSettled={settled}
      variant="credit-note"
      documentTitle={`Credit Note ${docNum ?? docEntry}`}
      errorMessage="Could not read this credit note from SAP."
      label="Print PDF"
      size="sm"
    />
  );
}
