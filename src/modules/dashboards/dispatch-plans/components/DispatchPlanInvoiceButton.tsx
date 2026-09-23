import { Download } from 'lucide-react';
import { useCallback, useState } from 'react';

import { useBillSummaryInvoicePrint } from '@/modules/warehouse/api';
import { BillPrintButton } from '@/modules/warehouse/ar-invoice/components/ARInvoicePrintButton';

/**
 * The bill itself, off a row of the Plan page — SAP's own TAX INVOICE.
 *
 * The planner is looking at the bill's number, party and value already; until
 * now getting the document behind them meant opening the invoice in SAP. Same
 * sheet the bill summary and the A/R Invoice screen print, asked for by the
 * invoice's `DocEntry`, which every row on this board carries.
 *
 * It hands the sheet to the browser's print dialog rather than writing a file:
 * the layout is a measured reproduction of SAP's PDF, and "Save as PDF" in that
 * dialog keeps it as text rather than as a picture of itself.
 *
 * Fetched only on a click. Every one of these is a HANA read, and a planner
 * opens this page to set dispatch dates, not to collect bills.
 */
export function DispatchPlanInvoiceButton({
  docEntry,
  docNum,
}: {
  docEntry: number;
  docNum: string;
}) {
  const [requested, setRequested] = useState(false);
  // Stable, so the effects inside the shared button key off the bill and the
  // error rather than re-running on every render — a re-run is a second toast.
  const request = useCallback(() => setRequested(true), []);
  const settled = useCallback(() => setRequested(false), []);
  const { data, isFetching, error } = useBillSummaryInvoicePrint(requested ? docEntry : null);

  return (
    // The row opens the edit sheet when clicked; asking for the bill must not.
    <span
      className="inline-flex"
      title="Opens the tax invoice — choose “Save as PDF” in the print dialog to keep a copy"
      onClick={(event) => event.stopPropagation()}
    >
      <BillPrintButton
        bill={data}
        isFetching={isFetching}
        error={error}
        requested={requested}
        onRequest={request}
        onSettled={settled}
        documentTitle={`Tax Invoice ${docNum || docEntry}`}
        errorMessage="Could not read this bill from SAP."
        label="Invoice"
        // One "Invoice" per row, so the accessible name has to name the bill.
        ariaLabel={`Download invoice ${docNum}`}
        icon={Download}
        size="sm"
        className="whitespace-nowrap"
      />
    </span>
  );
}
