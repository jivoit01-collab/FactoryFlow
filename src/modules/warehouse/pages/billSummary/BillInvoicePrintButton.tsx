import { useCallback, useState } from 'react';

import { useBillSummaryInvoicePrint } from '../../api';
import { BillPrintButton } from '../../ar-invoice/components/ARInvoicePrintButton';

/**
 * "Print bill" on a bill summary — SAP's own TAX INVOICE for the invoice the
 * sheet was raised against.
 *
 * The summary beside it is the warehouse's picking sheet; this is the document
 * the customer gets, and until now the only way to put it on paper was to open
 * the invoice in SAP. Same sheet the A/R Invoice screen prints, asked for by the
 * invoice rather than by a record here — a dispatch stamped straight into SAP
 * has no sheet id, and its bill prints just the same.
 *
 * Fetched only when somebody clicks: every print is a HANA read, and most people
 * open a sheet to check it rather than to reprint the bill.
 */
export function BillInvoicePrintButton({
  docEntry,
  docNum,
}: {
  docEntry: number;
  docNum?: string;
}) {
  const [requested, setRequested] = useState(false);
  // Stable, so the effects inside the shared button key off the bill and the
  // error rather than re-running on every render — a re-run is a second toast.
  const request = useCallback(() => setRequested(true), []);
  const settled = useCallback(() => setRequested(false), []);
  const { data, isFetching, error } = useBillSummaryInvoicePrint(
    requested ? docEntry : null,
  );

  return (
    <BillPrintButton
      bill={data}
      isFetching={isFetching}
      error={error}
      requested={requested}
      onRequest={request}
      onSettled={settled}
      documentTitle={`Tax Invoice ${docNum || docEntry}`}
      errorMessage="Could not read this bill from SAP."
      label="Print bill"
    />
  );
}
