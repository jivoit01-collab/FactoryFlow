import { useCallback, useEffect, useRef, useState } from 'react';

import { Loader2, Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { useArInvoicePrint, useSapCashSalePrint } from '../api/ar-invoice.queries';
import type { ARInvoicePosting, ARInvoicePrintPayload, SapCashSaleInvoice } from '../types';
import {
  AR_INVOICE_PRINT_STYLE,
  ARInvoiceTaxInvoicePrint,
} from './ARInvoiceTaxInvoicePrint';

/**
 * The print machinery both buttons share: ask, wait for the bill, hand it to
 * the browser.
 *
 * The two differ only in how the bill is fetched — by this app's record for the
 * invoices we raised, by SAP's DocEntry for the ones the counter raised in SAP
 * — so the caller owns the query and this owns everything after it. `requested`
 * is what separates "the bill arrived because somebody asked for it" from a
 * copy that merely happens to be in hand.
 */
function BillPrintButton({
  bill,
  isFetching,
  error,
  requested,
  onRequest,
  onSettled,
  documentTitle,
  errorMessage,
  label = 'Print bill',
  className,
  size,
}: {
  bill: ARInvoicePrintPayload | undefined;
  isFetching: boolean;
  error: unknown;
  requested: boolean;
  onRequest: () => void;
  onSettled: () => void;
  documentTitle: string;
  errorMessage: string;
  label?: string;
  className?: string;
  size?: 'sm' | 'default';
}) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle,
    pageStyle: AR_INVOICE_PRINT_STYLE,
  });

  // Print once the bill has actually arrived — clicking cannot print a sheet
  // that has not been read from SAP yet.
  useEffect(() => {
    if (!requested || !bill) return;
    onSettled();
    // A frame's grace so the off-screen sheet (and its barcode) is laid out.
    const id = window.requestAnimationFrame(() => handlePrint());
    return () => window.cancelAnimationFrame(id);
  }, [requested, bill, handlePrint, onSettled]);

  useEffect(() => {
    if (!error) return;
    onSettled();
    toast.error(getErrorMessage(error, errorMessage));
  }, [error, errorMessage, onSettled]);

  return (
    <>
      <Button
        variant="outline"
        size={size}
        className={className}
        disabled={isFetching}
        onClick={onRequest}
      >
        {isFetching ? (
          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
        ) : (
          <Printer className="mr-1 h-4 w-4" />
        )}
        {label}
      </Button>

      {/* Off-screen, rendered only so the print handler has something to take.
          `hidden` would keep the browser from laying it out at all. */}
      {bill ? (
        <div style={{ position: 'fixed', left: '-10000px', top: 0 }} aria-hidden>
          <ARInvoiceTaxInvoicePrint ref={printRef} invoice={bill} />
        </div>
      ) : null}
    </>
  );
}

/**
 * "Print bill" for one posted A/R invoice — SAP's own TAX INVOICE layout.
 *
 * The bill is fetched only when somebody asks for it, not when the detail sheet
 * opens: every print is a HANA read, and most people open a record to check its
 * status rather than to print it. The sheet is then rendered off-screen and
 * handed straight to the browser's print dialog.
 */
export function ARInvoicePrintButton({ posting }: { posting: ARInvoicePosting }) {
  const [requested, setRequested] = useState(false);
  // Stable, so the effects in the shared button key off the bill and the error
  // rather than re-running on every render — a re-run is a second toast.
  const request = useCallback(() => setRequested(true), []);
  const settled = useCallback(() => setRequested(false), []);
  const { data, isFetching, error } = useArInvoicePrint(requested ? posting.id : null);

  return (
    <BillPrintButton
      bill={data}
      isFetching={isFetching}
      error={error}
      requested={requested}
      onRequest={request}
      onSettled={settled}
      documentTitle={`Tax Invoice ${posting.sap_doc_num ?? posting.id}`}
      errorMessage="Could not read this invoice from SAP."
      className="flex-1"
    />
  );
}

/**
 * The same bill, for a cash sale read off SAP's own book.
 *
 * Most of that book was raised in SAP directly and has no record here to print
 * from, so this asks by SAP's DocEntry instead — the counter reprints its own
 * bills the same way it reprints ours.
 */
export function SapCashSalePrintButton({ invoice }: { invoice: SapCashSaleInvoice }) {
  const [requested, setRequested] = useState(false);
  // Stable, so the effects in the shared button key off the bill and the error
  // rather than re-running on every render — a re-run is a second toast.
  const request = useCallback(() => setRequested(true), []);
  const settled = useCallback(() => setRequested(false), []);
  const { data, isFetching, error } = useSapCashSalePrint(
    requested ? invoice.doc_entry : null,
  );

  return (
    <BillPrintButton
      bill={data}
      isFetching={isFetching}
      error={error}
      requested={requested}
      onRequest={request}
      onSettled={settled}
      documentTitle={`Tax Invoice ${invoice.doc_num ?? invoice.doc_entry}`}
      errorMessage="Could not read this bill from SAP."
      label="Print"
      size="sm"
    />
  );
}
