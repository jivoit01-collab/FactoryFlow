import { Loader2, Printer } from 'lucide-react';
import { useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'sonner';

import {
  GOODS_RETURN_PRINT_STYLE,
  GoodsReturnNotePrint,
} from '@/modules/returns/customer/components/GoodsReturnNotePrint';
import { Button } from '@/shared/components/ui';

import { type ShortDispatchPrintPayload, useShortDispatchPrint } from '../api';

/**
 * "Print Return Note" for a posted short dispatch.
 *
 * The sheet itself is the customer-returns one, reused rather than rewritten:
 * SAP prints one layout for a Return whichever module asked for it, and a second
 * copy of that layout would be a second thing to keep in step with SAP's.
 *
 * The document is read from SAP when the button is pressed, rendered off-screen
 * and handed to the browser's print dialog. Nothing is fetched when the entry
 * merely opens: every print is a HANA read.
 */
export function ShortDispatchPrintButton({
  id,
  docNum,
  className,
}: {
  id: number;
  docNum: string;
  className?: string;
}) {
  const [note, setNote] = useState<ShortDispatchPrintPayload | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const readNote = useShortDispatchPrint();

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Return ${docNum || id}`,
    pageStyle: GOODS_RETURN_PRINT_STYLE,
  });

  async function handleClick() {
    try {
      setNote(await readNote.mutateAsync(id));
      // Two frames' grace: one for React to render the off-screen sheet, one for
      // the browser to lay it out before the print handler takes it.
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => handlePrint()));
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || 'Could not read this return from SAP.');
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className={className}
        disabled={readNote.isPending}
        onClick={handleClick}
      >
        {readNote.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Printer className="mr-2 h-4 w-4" />
        )}
        Print Return Note
      </Button>

      {/* Off-screen, rendered only so the print handler has something to take.
          `hidden` would keep the browser from laying it out at all. */}
      {note ? (
        <div style={{ position: 'fixed', left: '-10000px', top: 0 }} aria-hidden>
          <GoodsReturnNotePrint ref={printRef} note={note} />
        </div>
      ) : null}
    </>
  );
}
