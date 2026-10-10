import { Loader2, Printer } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'sonner';

import {
  GRPO_NOTE_PRINT_STYLE,
  GRPOGoodsReceiptNotePrint,
} from '@/modules/warehouse/grpo/components/GRPOGoodsReceiptNotePrint';
import { Button } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { faGrpoApi } from '../api/faGrpo.api';
import type { GRPOPrintPayload } from '../types';

/**
 * "Print GRN" for a posted fixed-asset GRPO: SAP's own Goods Receipt Note.
 *
 * grpo's `GRPOPrintButton` with one difference: it reads the note through this
 * app's `history/<id>/print/`, behind the Fixed Asset GRPO view right and
 * scoped to FA entries, instead of grpo's catch-all print endpoint. The sheet
 * itself is grpo's, unchanged. Nothing renders for a simulated post or one SAP
 * never accepted: there is no SAP document to print.
 */
export function FAGRPOPrintButton({
  posting,
  size = 'sm',
  className,
}: {
  posting: {
    id: number;
    sap_doc_entry?: number | null;
    sap_doc_num?: number | null;
    simulated?: boolean;
  };
  size?: 'sm' | 'default';
  className?: string;
}) {
  const [note, setNote] = useState<GRPOPrintPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const awaitingPrint = useRef(false);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Goods Receipt Note ${posting.sap_doc_num ?? posting.id}`,
    pageStyle: GRPO_NOTE_PRINT_STYLE,
  });

  useEffect(() => {
    if (!note || !awaitingPrint.current) return;
    const frame = window.requestAnimationFrame(() => {
      awaitingPrint.current = false;
      handlePrint();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [note, handlePrint]);

  if (!posting.sap_doc_entry || posting.simulated) return null;

  const requestPrint = async () => {
    setIsLoading(true);
    try {
      awaitingPrint.current = true;
      setNote(await faGrpoApi.getPrint(posting.id));
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
        variant="outline"
        size={size}
        className={className}
        disabled={isLoading}
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
        {isLoading ? 'Loading...' : 'Print GRN'}
      </Button>
      {note ? (
        <div style={{ position: 'fixed', left: '-10000px', top: 0 }} aria-hidden>
          <GRPOGoodsReceiptNotePrint ref={printRef} note={note} />
        </div>
      ) : null}
    </>
  );
}
