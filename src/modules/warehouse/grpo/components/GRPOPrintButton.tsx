import { Loader2, Printer } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { grpoApi } from '../api';
import type { GRPOPrintPayload } from '../types';
import { GRPO_NOTE_PRINT_STYLE, GRPOGoodsReceiptNotePrint } from './GRPOGoodsReceiptNotePrint';

// Minimal shape needed to print a receipt. Both the history row and the posting
// detail record satisfy this structurally.
export interface GRPOPrintButtonPosting {
  id: number;
  sap_doc_entry?: number | null;
  sap_doc_num?: number | null;
}

/**
 * "Print GRN" for one posted GRPO — SAP's own Goods Receipt Note layout.
 *
 * The note is read when somebody asks for it and never cached: every print is a
 * HANA read, most people open a posting to check its status rather than to
 * print it, and SAP can still amend the receipt after we post it — a note
 * printed from a stale copy is the kind of error nobody catches until the
 * vendor does. Fetched imperatively rather than through a query hook for the
 * same reason ``useQCReportPrint`` does: a print is an action, not a
 * subscription. The sheet is then rendered off-screen and handed straight to
 * the browser's print dialog.
 *
 * Nothing renders for a posting SAP never accepted — a draft or a failure has
 * no document to print.
 */
export function GRPOPrintButton({
  posting,
  className,
  label = 'Print GRN',
  variant = 'outline',
  size,
}: {
  posting: GRPOPrintButtonPosting;
  className?: string;
  label?: string;
  variant?: 'outline' | 'ghost' | 'default';
  size?: 'sm' | 'default';
}) {
  const [note, setNote] = useState<GRPOPrintPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  // Set while a click is waiting on its sheet, so re-renders of an already
  // printed note do not open the dialog again.
  const awaitingPrint = useRef(false);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Goods Receipt Note ${posting.sap_doc_num ?? posting.id}`,
    pageStyle: GRPO_NOTE_PRINT_STYLE,
  });

  // Print once the note has arrived and been laid out — a frame's grace so the
  // off-screen sheet (and its logo) is measured before the dialog opens.
  useEffect(() => {
    if (!note || !awaitingPrint.current) return;
    const frame = window.requestAnimationFrame(() => {
      awaitingPrint.current = false;
      handlePrint();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [note, handlePrint]);

  if (!posting.sap_doc_entry) return null;

  const requestPrint = async () => {
    setIsLoading(true);
    try {
      awaitingPrint.current = true;
      setNote(await grpoApi.getPrint(posting.id));
    } catch (err) {
      awaitingPrint.current = false;
      toast.error(getErrorMessage(err, 'Could not read this goods receipt from SAP.'));
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
        title={
          posting.sap_doc_num
            ? `Print Goods Receipt Note ${posting.sap_doc_num}`
            : 'Print Goods Receipt Note'
        }
        onClick={(event) => {
          event.stopPropagation();
          void requestPrint();
        }}
      >
        {isLoading ? (
          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Printer className="mr-1 h-3.5 w-3.5" />
        )}
        {isLoading ? 'Loading...' : label}
      </Button>

      {/* Off-screen, rendered only so the print handler has something to take.
          `hidden` would keep the browser from laying it out at all. */}
      {note ? (
        <div style={{ position: 'fixed', left: '-10000px', top: 0 }} aria-hidden>
          <GRPOGoodsReceiptNotePrint ref={printRef} note={note} />
        </div>
      ) : null}
    </>
  );
}
