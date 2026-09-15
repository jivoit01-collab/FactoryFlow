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

import { BST_QUERY_KEYS, bstApi, warehousePrintInfoQuery } from '../api';
import type { BSTSourceType, SAPStockTransfer, WarehousePrintInfo } from '../types';
import {
  BranchStockTransferPrint,
  BST_DOC_PRINT_PAGE_STYLE,
} from './BranchStockTransferPrint';

/**
 * Prints the Branch Stock Transfer document straight off a SAP document, for
 * transfers raised in SAP that were never entered here.
 *
 * The BST detail page prints a `BSTTransfer` — the app's own record. A transfer
 * someone posted directly in SAP has none, so until it was picked up and
 * scanned there was no way to get its paperwork out of the app at all. This
 * button closes that gap: same document, same component, read from SAP.
 *
 * The document is read when the button is pressed, rendered off-screen and
 * handed to the print dialog. Nothing is fetched when a search merely lists it,
 * so a page of results costs no HANA reads for the documents nobody prints.
 *
 * The app-only cells (Delivery Note, vehicle, bilty, transporter, dispatch
 * date) print blank on purpose: they are filled from the BST entry, and a
 * SAP-only document has none. Inventing them would put unverified haulage
 * details on a document people sign.
 *
 * Gated on VIEW_BST — the right to read a branch stock transfer — rather than
 * on the page it happens to sit on. Printing is a read, and the gate belongs to
 * the button so it travels with it wherever this is dropped in next.
 */
export function SapTransferPrintButton({
  docEntry,
  docNum,
  documentType = 'STOCK_TRANSFER',
  label,
  className,
}: {
  docEntry: number;
  docNum: string;
  /** Which SAP object the entry lives in. Defaults to a stock transfer. */
  documentType?: BSTSourceType;
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
    documentTitle: `branch-stock-transfer-${docNum}`,
    pageStyle: BST_DOC_PRINT_PAGE_STYLE,
  });

  async function handleClick() {
    setLoading(true);
    try {
      // Through the query cache, so re-printing the same document — and the
      // letterhead, which every document on the page shares — reads SAP once.
      const fetched = await queryClient.fetchQuery({
        queryKey: BST_QUERY_KEYS.sapTransfer(docEntry, documentType),
        queryFn: () => bstApi.getSapTransfer(docEntry, documentType),
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
      toast.error(getErrorMessage(err, `Could not read ${docNum} from SAP.`));
    } finally {
      setLoading(false);
    }
  }

  // After the hooks, never before them — the gate must not change how many run.
  if (!hasPermission(WAREHOUSE_PERMISSIONS.VIEW_BST)) return null;

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={className}
        disabled={loading}
        onClick={handleClick}
        title={`Print the Branch Stock Transfer for #${docNum}`}
        aria-label={`Print document ${docNum}`}
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
              destination:
                documentType === 'INVOICE'
                  ? doc.card_name || doc.card_code || ''
                  : doc.to_warehouse,
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
