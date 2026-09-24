import { FileText, Loader2, Printer, TriangleAlert } from 'lucide-react';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';

import {
  PO_PRINT_STYLE,
  POPurchaseOrderPrint,
} from '@/modules/warehouse/grpo/components/POPurchaseOrderPrint';
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { usePmPurchaseOrder } from '../api';

export interface PmReqPoDocDialogProps {
  /** The order to open, or null when nothing is open. */
  docEntry: number | null;
  /** Shown in the title while the sheet is still being read from SAP. */
  docNum: number | null;
  onClose: () => void;
}

/**
 * One open purchase order, as SAP's own sheet.
 *
 * The row dialog behind this answers "what is on order and when is it due".
 * The next question — what else is on that order, at what rate, on what terms,
 * shipped to which of our locations — is answered by the order itself, so this
 * shows the document rather than a second summary of it. It is the same
 * component the GRPO screens print, so what the buyer reads here is character
 * for character what the vendor and the stores already hold; a near-miss would
 * be worse than nothing, because a sheet that differs is one somebody has to
 * reconcile.
 *
 * Nested inside the row dialog on purpose. Closing this comes back to the
 * component and its other orders, which is how somebody works a shortage —
 * open an order, read it, come back, open the next.
 */
export function PmReqPoDocDialog({ docEntry, docNum, onClose }: PmReqPoDocDialogProps) {
  const { data: order, isLoading, error } = usePmPurchaseOrder(docEntry);
  const sheetRef = useRef<HTMLDivElement>(null);

  // The sheet on screen IS the sheet that prints — one node, not an off-screen
  // copy, because unlike `POPrintButton` this one is already rendered.
  const handlePrint = useReactToPrint({
    contentRef: sheetRef,
    documentTitle: `Purchase Order ${order?.doc_num ?? docNum ?? ''}`,
    pageStyle: PO_PRINT_STYLE,
  });

  return (
    <Dialog open={!!docEntry} onOpenChange={(next) => !next && onClose()}>
      {/* Wide enough for the A4 sheet's 595pt at full size, and capped so the
          document scrolls inside the dialog rather than the dialog growing
          past the screen. */}
      <DialogContent className="grid max-h-[92vh] w-[96vw] max-w-3xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="pr-8">
            Purchase order {order?.doc_num ?? docNum ?? ''}
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>
              {order
                ? `${order.vendor.name || order.vendor.code || 'Vendor'} · SAP's own sheet, read live`
                : "SAP's own sheet, read live"}
            </span>
            {order && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7"
                onClick={() => handlePrint()}
              >
                <Printer className="mr-1 h-3.5 w-3.5" />
                Print
              </Button>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Reading the order from SAP…
            </div>
          )}

          {!isLoading && !!error && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-300/60 bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{getErrorMessage(error, 'Could not read this purchase order from SAP.')}</span>
            </div>
          )}

          {!isLoading && !error && !order && (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              SAP no longer holds this order.
            </div>
          )}

          {/* The sheet is a fixed 595pt wide and does not reflow, so it scrolls
              sideways on a narrow screen instead of being squeezed into
              something that is no longer SAP's layout. */}
          {order && (
            <div className="overflow-x-auto">
              <div className="mx-auto w-fit">
                <POPurchaseOrderPrint ref={sheetRef} order={order} />
              </div>
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
