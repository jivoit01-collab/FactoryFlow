import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Printer } from 'lucide-react';
import { useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'sonner';

import { WAREHOUSE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { useAppSelector } from '@/core/store';
import { Button } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { SAP_TRANSFER_QUERY_KEYS, sapTransferApi, warehousePrintInfoQuery } from '../api';
import type { SAPStockTransfer, WarehousePrintInfo } from '../types';
import {
  BranchStockTransferPrint,
  BST_DOC_PRINT_PAGE_STYLE,
} from './BranchStockTransferPrint';

/**
 * Prints the inventory transfer document for a posted SAP transfer (OWTR).
 *
 * The paper is wanted when the transfer is created in SAP, before anything
 * physical happens against it — so this sits on Inventory Transfer, the
 * document side. It is on BST Scanning too, because the desk moving the stock
 * often needs the same copy in hand and should not have to go looking for it.
 *
 * It reads SAP rather than our own tables because a transfer keyed straight
 * into the SAP client has no record on this side at all — no request, no BST —
 * and those are exactly the ones that still need printing.
 *
 * The document is read when the button is pressed, rendered off-screen and
 * handed to the print dialog. Nothing is fetched while a list merely shows the
 * row, so a page of transfers costs no HANA reads for the ones nobody prints.
 *
 * Cells fed by an app record (Delivery Note, vehicle, bilty, transporter,
 * dispatch date) print blank: a SAP-only transfer has none, and inventing them
 * would put unverified haulage details on a document people sign.
 */
export function SapTransferPrintButton({
  docEntry,
  docNum,
  label,
  className,
}: {
  /** OWTR DocEntry — what the document is read by. */
  docEntry: number;
  /** SAP document number, for the print's file name and the button's label. */
  docNum: string;
  label?: string;
  className?: string;
}) {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermission();
  const companyName = useAppSelector((s) => s.auth.currentCompany?.company_name ?? '');

  const [doc, setDoc] = useState<SAPStockTransfer | null>(null);
  const [printInfo, setPrintInfo] = useState<WarehousePrintInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `inventory-transfer-${docNum}`,
    pageStyle: BST_DOC_PRINT_PAGE_STYLE,
  });

  async function handleClick() {
    setLoading(true);
    try {
      // Through the query cache, so re-printing the same document — and the
      // letterhead, which every transfer on the page shares — reads SAP once.
      const fetched = await queryClient.fetchQuery({
        queryKey: SAP_TRANSFER_QUERY_KEYS.detail(docEntry),
        queryFn: () => sapTransferApi.get(docEntry),
      });
      setDoc(fetched);

      // Letterhead is best effort — the print is defined to work with those
      // cells blank, so a SAP master-data hiccup must not cost the operator
      // their document.
      const letterhead = warehousePrintInfoQuery([fetched.from_warehouse, fetched.to_warehouse]);
      try {
        setPrintInfo(
          letterhead.codes.length > 0 ? await queryClient.fetchQuery(letterhead.options) : null,
        );
      } catch {
        setPrintInfo(null);
      }

      // Two frames' grace: one for React to render the off-screen sheet, one for
      // the browser to lay it out before the print handler takes it.
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => handlePrint()));
    } catch (err) {
      toast.error(getErrorMessage(err, `Could not read transfer ${docNum} from SAP.`));
    } finally {
      setLoading(false);
    }
  }

  // After the hooks, never before them — the gate must not change how many run.
  if (!hasPermission(WAREHOUSE_PERMISSIONS.VIEW_TRANSFER_REQUEST)) return null;

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={className}
        disabled={loading}
        onClick={handleClick}
        title={`Print the inventory transfer document for #${docNum}`}
        aria-label={`Print inventory transfer ${docNum}`}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Printer className="h-3.5 w-3.5" />
        )}
        {label ? <span className="ml-1">{label}</span> : null}
      </Button>

      {/* The same off-screen host the detail page uses; react-to-print copies it
          into its own iframe, so it never shows on the page itself. */}
      {doc ? (
        <div className="bst-doc-print-host" aria-hidden>
          <BranchStockTransferPrint
            ref={printRef}
            printInfo={printInfo}
            companyName={companyName}
            data={{
              docNum: doc.doc_num,
              docEntry: doc.doc_entry,
              docDate: doc.doc_date,
              fromWarehouse: doc.from_warehouse || doc.warehouses || '',
              toWarehouse: doc.to_warehouse,
              destination: doc.to_warehouse,
              cancelled: doc.cancelled,
              lines: (doc.lines ?? []).map((line) => ({
                description: line.item_name || line.item_code,
                quantity: line.quantity,
                uom: line.uom,
                boxes: line.box_count ?? null,
              })),
            }}
          />
        </div>
      ) : null}
    </>
  );
}
