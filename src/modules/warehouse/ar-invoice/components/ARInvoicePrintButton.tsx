import { useEffect, useRef, useState } from 'react';

import { Loader2, Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { useArInvoicePrint } from '../api/ar-invoice.queries';
import type { ARInvoicePosting } from '../types';
import {
  AR_INVOICE_PRINT_STYLE,
  ARInvoiceTaxInvoicePrint,
} from './ARInvoiceTaxInvoicePrint';

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
  const printRef = useRef<HTMLDivElement>(null);

  const { data, isFetching, error } = useArInvoicePrint(requested ? posting.id : null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Tax Invoice ${posting.sap_doc_num ?? posting.id}`,
    pageStyle: AR_INVOICE_PRINT_STYLE,
  });

  // Print once the bill has actually arrived — clicking cannot print a sheet
  // that has not been read from SAP yet.
  useEffect(() => {
    if (!requested || !data) return;
    setRequested(false);
    // A frame's grace so the off-screen sheet (and its barcode) is laid out.
    const id = window.requestAnimationFrame(() => handlePrint());
    return () => window.cancelAnimationFrame(id);
  }, [requested, data, handlePrint]);

  useEffect(() => {
    if (!error) return;
    setRequested(false);
    toast.error(getErrorMessage(error, 'Could not read this invoice from SAP.'));
  }, [error]);

  return (
    <>
      <Button
        variant="outline"
        className="flex-1"
        disabled={isFetching}
        onClick={() => setRequested(true)}
      >
        {isFetching ? (
          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
        ) : (
          <Printer className="mr-1 h-4 w-4" />
        )}
        Print bill
      </Button>

      {/* Off-screen, rendered only so the print handler has something to take.
          `hidden` would keep the browser from laying it out at all. */}
      {data ? (
        <div style={{ position: 'fixed', left: '-10000px', top: 0 }} aria-hidden>
          <ARInvoiceTaxInvoicePrint ref={printRef} invoice={data} />
        </div>
      ) : null}
    </>
  );
}
