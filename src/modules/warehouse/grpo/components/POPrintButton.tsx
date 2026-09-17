import { FileText, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { grpoApi } from '../api';
import type { POPrintPayload } from '../types';
import { PO_PRINT_STYLE, POPurchaseOrderPrint } from './POPurchaseOrderPrint';

/**
 * Minimal shape needed to print an order. The PO receipt on a preview, on a
 * pending-entry row and on an all-entries row all satisfy this structurally.
 */
export interface POPrintButtonReceipt {
  id: number;
  po_number: string;
}

/**
 * "Print PO" for one purchase order behind a gate entry — SAP's own layout.
 *
 * The order is read when somebody asks for it and never cached: every print is
 * a HANA read, most people open an entry to receive against it rather than to
 * print it, and SAP can still amend or cancel the order after the gate receives
 * it — a sheet printed from a stale copy is the kind of error nobody catches
 * until the vendor does. Fetched imperatively rather than through a query hook
 * for the same reason ``GRPOPrintButton`` does: a print is an action, not a
 * subscription. The sheet is then rendered off-screen and handed straight to
 * the browser's print dialog.
 *
 * Unlike the goods receipt, this needs nothing posted first — the order exists
 * in SAP before anything arrives, so the button works on a pending entry as
 * well as on a posted one.
 */
export function POPrintButton({
  receipt,
  className,
  label = 'Print PO',
  variant = 'outline',
  size,
}: {
  receipt: POPrintButtonReceipt;
  className?: string;
  label?: string;
  variant?: 'outline' | 'ghost' | 'default';
  size?: 'sm' | 'default';
}) {
  const [order, setOrder] = useState<POPrintPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  // Set while a click is waiting on its sheet, so re-renders of an already
  // printed order do not open the dialog again.
  const awaitingPrint = useRef(false);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Purchase Order ${receipt.po_number}`,
    pageStyle: PO_PRINT_STYLE,
  });

  // Print once the order has arrived and been laid out — a frame's grace so the
  // off-screen sheet (and its logo) is measured before the dialog opens.
  useEffect(() => {
    if (!order || !awaitingPrint.current) return;
    const frame = window.requestAnimationFrame(() => {
      awaitingPrint.current = false;
      handlePrint();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [order, handlePrint]);

  const requestPrint = async () => {
    setIsLoading(true);
    try {
      awaitingPrint.current = true;
      setOrder(await grpoApi.getPOPrint(receipt.id));
    } catch (err) {
      awaitingPrint.current = false;
      toast.error(getErrorMessage(err, 'Could not read this purchase order from SAP.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled={isLoading}
        title={`Print Purchase Order ${receipt.po_number}`}
        onClick={(event) => {
          event.stopPropagation();
          void requestPrint();
        }}
      >
        {isLoading ? (
          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
        ) : (
          <FileText className="mr-1 h-3.5 w-3.5" />
        )}
        {isLoading ? 'Loading...' : label}
      </Button>

      {/* Off-screen, rendered only so the print handler has something to take.
          `hidden` would keep the browser from laying it out at all. */}
      {order ? (
        <div style={{ position: 'fixed', left: '-10000px', top: 0 }} aria-hidden>
          <POPurchaseOrderPrint ref={printRef} order={order} />
        </div>
      ) : null}
    </>
  );
}
