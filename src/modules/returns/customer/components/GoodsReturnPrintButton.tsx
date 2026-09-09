import { Loader2, Printer } from 'lucide-react';
import { useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui';

import { type GoodsReturnPrintPayload, useGoodsReturnPrint } from '../api';
import { GOODS_RETURN_PRINT_STYLE, GoodsReturnNotePrint } from './GoodsReturnNotePrint';

/**
 * "Print Return Note" for one posted A/R Return — SAP's own Return layout.
 *
 * One button per document, not per return: a return booked against several
 * invoices posts one document per invoice, so `docEntry` says which of them this
 * button prints and `label` names it.
 *
 * The document is read from SAP when the button is pressed, rendered off-screen
 * and handed to the browser's print dialog. Nothing is fetched when the return
 * merely opens: every print is a HANA read.
 */
export function GoodsReturnPrintButton({
  id,
  docNum,
  docEntry,
  label = 'Print Return Note',
  className,
}: {
  id: number;
  docNum: string;
  docEntry?: number | null;
  label?: string;
  className?: string;
}) {
  const [note, setNote] = useState<GoodsReturnPrintPayload | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const readNote = useGoodsReturnPrint();

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Return ${docNum || id}`,
    pageStyle: GOODS_RETURN_PRINT_STYLE,
  });

  async function handleClick() {
    try {
      setNote(await readNote.mutateAsync({ id, docEntry }));
      // Two frames' grace: one for React to render the off-screen sheet, one
      // for the browser to lay it out before the print handler takes it.
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
        {label}
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
