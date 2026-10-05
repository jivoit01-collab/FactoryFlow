import { AlertTriangle, FileText, Loader2, Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import {
  BILL_SUMMARY_STATUS_LABELS,
  type BillSummary,
  billSummaryApi,
  type BulkSubmitCandidate,
  type BulkSubmitSkipped,
} from '../api';
import { BillSummaryTimes } from '../pages/billSummary/BillSummaryTimes';
import {
  PRINTABLE_BILL_SUMMARY_STATUSES,
  sheetsForBills,
  useBillSummaryPrinter,
} from '../pages/billSummary/useBillSummaryPrinter';

/** One company's share of a truck. Each company's plans are written separately. */
export interface BillSummaryBatch {
  companyCode: string;
  docEntries: number[];
}

interface SubmitBillSummariesDialogProps {
  /** The truck's bills, grouped by the company each one's plan lives in. */
  batches: BillSummaryBatch[];
  vehicleNo: string;
  /**
   * Opened from the truck's Bill summaries button rather than offered after a
   * link: stay open even with nothing left to send, and list the sheets the
   * truck's bills already have, with Print on the approved ones. Closing
   * quietly suits the offer; somebody who pressed a button is owed the truck.
   */
  showSent?: boolean;
  /** Called once the user has answered, either way, so the caller can move on. */
  onClose: () => void;
}

interface Preview {
  eligible: BulkSubmitCandidate[];
  skipped: BulkSubmitSkipped[];
  /** The sheets the skipped bills already have (only looked up with `showSent`). */
  sent: BillSummary[];
}

/**
 * "Submit a bill summary for these bills?" — asked the moment a vehicle is linked.
 *
 * Linking is when the dispatch desk knows what the load is, so it is the natural
 * moment to raise the sheets; nobody wants to type eight of them one at a time,
 * and eight typed separately is eight chances to key a different vehicle number
 * onto the same truck.
 *
 * The count is asked of the server before the question is put, because the
 * server is the only thing that knows which of these bills already has a sheet.
 * That dry run writes nothing, which matters: the user may well say no.
 *
 * Nothing here reaches SAP. The sheets go to the warehouse for a dispatch date,
 * and that approval is what writes to the invoice.
 */
export function SubmitBillSummariesDialog({
  batches,
  vehicleNo,
  showSent = false,
  onClose,
}: SubmitBillSummariesDialogProps) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const printer = useBillSummaryPrinter();
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const results = await Promise.all(
          batches.map((batch) =>
            billSummaryApi.bulkSubmit(batch.docEntries, {
              dryRun: true,
              companyCode: batch.companyCode || undefined,
            }),
          ),
        );
        // The dry run says a bill is covered, not by what: fetch those sheets,
        // company by company, so they can be shown and printed.
        const sent = showSent
          ? (
              await Promise.all(
                results.map((result, index) =>
                  result.skipped.length > 0
                    ? sheetsForBills(
                        batches[index].companyCode,
                        result.skipped.map((row) => row.doc_num),
                      )
                    : Promise.resolve([]),
                ),
              )
            ).flat()
          : [];
        if (cancelled) return;
        setPreview({
          eligible: results.flatMap((result) => result.eligible),
          skipped: results.flatMap((result) => result.skipped),
          sent,
        });
      } catch (error) {
        if (cancelled) return;
        // A failed check is not worth a dialog: the vehicle is linked either
        // way, and the sheets can still be raised from the bill summary screen.
        toast.error(getErrorMessage(error, 'Could not check which bills need a summary.'));
        onClose();
      } finally {
        if (!cancelled) setChecking(false);
      }
    }
    void check();
    return () => {
      cancelled = true;
    };
    // Asked once for this truck. The batches are rebuilt on every render of the
    // caller, so depending on them would re-ask forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Nothing to raise — every bill already has a sheet. Closed rather than shown:
  // a dialog whose only content is "nothing to do" is a click for no reason.
  // Opened from the truck, it stays: the sheets already sent are the point.
  useEffect(() => {
    if (!showSent && !checking && preview && preview.eligible.length === 0) onClose();
  }, [checking, preview, onClose, showSent]);

  async function printSheet(row: BillSummary) {
    const updated = await printer.print(row);
    if (!updated) return;
    // The first print moves an approved sheet to Printed; say so in place,
    // with when.
    setPreview((current) =>
      current && {
        ...current,
        sent: current.sent.map((sheet) =>
          sheet.id === row.id
            ? {
                ...sheet,
                status: updated.status,
                printed_at: updated.printed_at,
                printed_by_name: updated.printed_by_name,
              }
            : sheet,
        ),
      },
    );
  }

  async function submit() {
    setSubmitting(true);
    let created = 0;
    const failures: string[] = [];
    for (const batch of batches) {
      try {
        const result = await billSummaryApi.bulkSubmit(batch.docEntries, {
          companyCode: batch.companyCode || undefined,
        });
        created += result.created.length;
        // A bill the real call could not raise after all — the invoice moved,
        // or SAP would not give up its lines. Named rather than counted.
        for (const skipped of result.skipped) {
          if (preview?.eligible.some((row) => row.doc_entry === skipped.doc_entry)) {
            failures.push(`Bill ${skipped.doc_num}: ${skipped.reason}`);
          }
        }
      } catch (error) {
        failures.push(
          `${batch.companyCode || 'this company'}: ${getErrorMessage(error, 'submission failed')}`,
        );
      }
    }
    setSubmitting(false);
    if (created > 0) {
      toast.success(
        `${created} bill summar${created === 1 ? 'y' : 'ies'} sent to the warehouse for a dispatch date`,
      );
    }
    for (const failure of failures) toast.error(failure);
    onClose();
  }

  const eligible = preview?.eligible ?? [];
  const noBilty = eligible.filter((row) => !row.bilty_no.trim()).length;
  const sent = preview?.sent ?? [];
  const sentDocNums = new Set(sent.map((row) => row.sap_invoice_doc_num));
  // A skipped bill whose sheet is listed below needs no second line saying so.
  const skippedNotes = (preview?.skipped ?? []).filter((row) => !sentDocNums.has(row.doc_num));
  const nothingToSend = showSent && !checking && eligible.length === 0;

  return (
    <>
      {printer.host}
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {checking
                ? 'Checking which bills need a summary…'
                : nothingToSend
                  ? `Bill summaries${vehicleNo ? ` — ${vehicleNo}` : ''}`
                  : `Submit a bill summary for ${eligible.length} bill${
                      eligible.length === 1 ? '' : 's'
                    }?`}
            </DialogTitle>
            <DialogDescription>
              {nothingToSend
                ? 'Every bill on this truck already has a sheet. Print the approved ones to sign and take down to the godown.'
                : `${vehicleNo ? `${vehicleNo} — ` : ''}the sheets go to the warehouse, which sets the dispatch date and approves. Nothing is written to SAP until then.`}
            </DialogDescription>
          </DialogHeader>

          {checking ? (
            <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Reading the bills…
            </p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {eligible.map((row) => (
                <div
                  key={row.doc_entry}
                  className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
                >
                  <span className="min-w-0">
                    <FileText className="mr-1 inline h-3.5 w-3.5 text-muted-foreground" />
                    <strong>{row.doc_num}</strong>
                    <span className="text-muted-foreground"> · {row.customer_name}</span>
                  </span>
                  {row.bilty_no ? (
                    <Badge variant="outline">Bilty {row.bilty_no}</Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-amber-400 text-amber-700 dark:text-amber-400"
                    >
                      No bilty
                    </Badge>
                  )}
                </div>
              ))}

              {/* The bilty does not stop the sheet being raised — the LR is often
                  not out while the load is still being built — but it does stop
                  the warehouse approving, so it is said here rather than found
                  out over there. */}
              {noBilty > 0 && (
                <p className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {noBilty} of these has no bilty number yet. The sheet can still go over,
                  but the warehouse cannot approve it until the bilty is on the plan.
                </p>
              )}

              {/* The truck's sheets already sent, when opened from the truck:
                  where each has got to, and Print on the approved ones. */}
              {sent.length > 0 && (
                <div className="space-y-2">
                  {eligible.length > 0 && (
                    <p className="pt-1 text-xs font-medium text-muted-foreground">Already sent</p>
                  )}
                  {sent.map((row) => {
                    const printable =
                      PRINTABLE_BILL_SUMMARY_STATUSES.includes(row.status) && row.id !== null;
                    return (
                      <div
                        key={row.key}
                        className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
                      >
                        <span className="min-w-0">
                          <FileText className="mr-1 inline h-3.5 w-3.5 text-muted-foreground" />
                          <strong>{row.sap_invoice_doc_num}</strong>
                          <span className="text-muted-foreground"> · {row.entry_no}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {row.customer_name}
                          </span>
                          <BillSummaryTimes sheet={row} />
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <Badge variant="outline">{BILL_SUMMARY_STATUS_LABELS[row.status]}</Badge>
                          {printable && (
                            <Button
                              size="sm"
                              variant={row.status === 'APPROVED' ? 'default' : 'outline'}
                              disabled={printer.printingId !== null}
                              aria-label={`Print ${row.sap_invoice_doc_num}`}
                              onClick={() => void printSheet(row)}
                            >
                              {printer.printingId === row.id ? (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Printer className="mr-1.5 h-3.5 w-3.5" />
                              )}
                              {row.status === 'APPROVED' ? 'Print' : 'Reprint'}
                            </Button>
                          )}
                        </span>
                      </div>
                    );
                  })}
                  {printer.error && <p className="text-xs text-rose-600">{printer.error}</p>}
                </div>
              )}

              {/* Usually "a sheet already covers this bill" — worth seeing, since
                  the count offered is smaller than the number of bills linked. */}
              {skippedNotes.length > 0 && (
                <div className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                  {skippedNotes.map((row) => (
                    <p key={row.doc_entry}>
                      Bill {row.doc_num} — {row.reason}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={onClose} disabled={submitting}>
              {nothingToSend ? 'Close' : 'Not now'}
            </Button>
            {!nothingToSend && (
              <Button
                onClick={() => void submit()}
                disabled={checking || submitting || eligible.length === 0}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send {eligible.length} to the warehouse
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
