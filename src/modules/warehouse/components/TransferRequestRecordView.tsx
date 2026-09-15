import { AlertTriangle, Printer, Truck } from 'lucide-react';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';

import { Button, Card, CardContent } from '@/shared/components/ui';

import { useTransferRequest, useWarehousePrintInfo } from '../api';
import { ApprovalBadge, PostingBadge, Route, RouteBadge } from '../pages/transfer/TransferBadges';
import { qty, shortDate } from '../pages/transfer/transferFormat';
import type { TransferRequestDetail, TransferRequestLine } from '../types';
import { BranchStockTransferPrint, BST_DOC_PRINT_PAGE_STYLE } from './BranchStockTransferPrint';

/**
 * A transfer request as a record to read, not a decision to make.
 *
 * The detail *page* is mostly machinery — approve, reject, post to SAP, choose
 * batches — none of which belongs behind a report row: someone tracing a stock
 * movement wants to know what the document was, not to act on it. So this shows
 * the same facts and the same SAP print, and stops there. The page stays the
 * one place a request is decided.
 */

/** The most-settled quantity for the print: moved, else approved, else asked-for. */
function printQty(line: TransferRequestLine): number {
  const transferred = Number(line.transferred_qty);
  if (transferred > 0) return transferred;
  const approved = Number(line.approved_qty);
  if (approved > 0) return approved;
  return Number(line.requested_qty) || 0;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

export interface TransferRequestRecordViewProps {
  requestId: number;
  /** Adds a button through to the full page, where it can still be acted on. */
  showOpenFullPage?: boolean;
}

export function TransferRequestRecordView({
  requestId,
  showOpenFullPage = true,
}: TransferRequestRecordViewProps) {
  const navigate = useNavigate();
  const { data: request, isLoading, isError } = useTransferRequest(requestId);

  // Same SAP-style Branch Stock Transfer document the detail page prints.
  // Letterhead data loads in the background; it prints with blanks if SAP is down.
  const printRef = useRef<HTMLDivElement>(null);
  const printInfo = useWarehousePrintInfo([request?.from_warehouse, request?.to_warehouse]);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: request?.entry_no || 'branch-stock-transfer',
    pageStyle: BST_DOC_PRINT_PAGE_STYLE,
  });

  if (isLoading) return <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>;
  if (isError || !request) {
    return <p className="py-8 text-center text-sm text-red-600">Could not load this request.</p>;
  }

  const r: TransferRequestDetail = request;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => handlePrint()}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
        {showOpenFullPage && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/warehouse/inventory-transfer/${r.id}`)}
          >
            Open full page
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Route">
            <div className="flex flex-wrap items-center gap-2">
              <Route from={r.from_warehouse} to={r.to_warehouse} />
              <RouteBadge routeType={r.route_type} />
            </div>
          </Field>
          <Field label="Approval">
            <ApprovalBadge status={r.status} />
          </Field>
          <Field label="Stock movement">
            <PostingBadge status={r.posting_status} intransitWarehouse={r.intransit_warehouse} />
          </Field>
          <Field label="Raised">
            {shortDate(r.created_at)} by {r.requested_by_name || '—'}
          </Field>

          <Field label="Request in SAP">
            {r.sap_request_doc_num ? (
              <span className="tabular-nums">{r.sap_request_doc_num}</span>
            ) : (
              <span className="text-muted-foreground">not raised</span>
            )}
          </Field>
          <Field label={r.is_cross_branch ? 'Transfer — leg 1' : 'Transfer'}>
            {r.sap_transfer_doc_num ? (
              <span className="tabular-nums">{r.sap_transfer_doc_num}</span>
            ) : (
              <span className="text-muted-foreground">not posted</span>
            )}
          </Field>
          {r.is_cross_branch && (
            <Field label="Transfer — leg 2">
              {r.sap_leg2_doc_num ? (
                <span className="tabular-nums">{r.sap_leg2_doc_num}</span>
              ) : (
                <span className="text-muted-foreground">posts on receipt</span>
              )}
            </Field>
          )}
          <Field label="BST">
            {r.bst_entry_no ? (
              <span className="tabular-nums">{r.bst_entry_no}</span>
            ) : (
              <span className="text-muted-foreground">none yet</span>
            )}
          </Field>
        </CardContent>
      </Card>

      {r.remarks && (
        <Card>
          <CardContent className="pt-6 text-sm">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Why</div>
            <p className="mt-1">{r.remarks}</p>
          </CardContent>
        </Card>
      )}

      {r.status === 'REJECTED' && r.rejection_reason && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <strong>Rejected:</strong> {r.rejection_reason}
        </div>
      )}

      {r.posting_status === 'FAILED' && r.posting_error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <strong>SAP refused this transfer.</strong>
              <p className="mt-1">{r.posting_error}</p>
            </div>
          </div>
        </div>
      )}

      {r.awaits_second_leg && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900">
          <div className="flex items-start gap-2">
            <Truck className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              This move crosses SAP branches, so the stock is sitting in{' '}
              <strong>{r.intransit_warehouse}</strong>. It lands at {r.to_warehouse} when the
              receiving side finishes the BST receipt.
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Item</th>
                  <th className="px-4 py-3 text-left font-medium">Route</th>
                  <th className="px-4 py-3 text-right font-medium">Requested</th>
                  <th className="px-4 py-3 text-right font-medium">Approved</th>
                  <th className="px-4 py-3 text-right font-medium">Moved</th>
                  <th className="px-4 py-3 text-left font-medium">Batches</th>
                </tr>
              </thead>
              <tbody>
                {r.lines.map((line) => (
                  <tr key={line.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">{line.item_code}</div>
                      {line.item_name && (
                        <div className="text-xs text-muted-foreground">{line.item_name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <Route from={line.source_warehouse} to={line.destination_warehouse} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {qty(line.requested_qty)} {line.uom}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{qty(line.approved_qty)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {qty(line.transferred_qty)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {!line.is_batch_managed ? (
                        <span>not batch-tracked</span>
                      ) : line.batch_allocation.length ? (
                        line.batch_allocation.map((b) => (
                          <div key={b.BatchNumber} className="tabular-nums">
                            {b.BatchNumber} × {qty(b.Quantity)}
                          </div>
                        ))
                      ) : (
                        <span>chosen at posting</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="bst-doc-print-host" aria-hidden>
        <BranchStockTransferPrint
          ref={printRef}
          printInfo={printInfo.data ?? null}
          data={{
            docNum: r.sap_transfer_doc_num || r.sap_request_doc_num || r.entry_no,
            docEntry: r.sap_transfer_doc_entry ?? r.sap_request_doc_entry,
            docDate: r.posted_at || r.created_at,
            reference: r.entry_no,
            fromWarehouse: r.from_warehouse,
            toWarehouse: r.to_warehouse,
            dispatchDate: r.posted_at,
            lines: r.lines
              .filter((line) => line.status !== 'REJECTED')
              .map((line) => ({
                description: line.item_name || line.item_code,
                quantity: printQty(line),
                uom: line.uom,
              })),
          }}
        />
      </div>
    </div>
  );
}
