import { AlertTriangle, CheckCircle2, Loader2, Send, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { confirmSapPost } from '@/shared/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  Input,
  Label,
  Textarea,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import {
  type BillSummary,
  useApproveBillSummaries,
  useBillSummaries,
  useRejectBillSummary,
} from '../../api';

/** The truck a batch of sheets came in on, with no vehicle as its own bucket. */
const NO_VEHICLE = '__none__';

function num(value: string | number, dp = 0): string {
  const n = Number(value ?? 0);
  return Number.isFinite(n)
    ? n.toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp })
    : '0';
}

function today(): string {
  return new Date().toLocaleDateString('en-CA');
}

interface Batch {
  key: string;
  vehicleNo: string;
  rows: BillSummary[];
}

/**
 * The warehouse's queue: sheets dispatch has sent across, waiting for a date.
 *
 * Grouped by the truck they are on, because that is how the decision is made —
 * a truck goes out on a day, not each of its bills separately. A bill can still
 * be dropped out of its batch and left waiting, and any single sheet can be
 * sent back on its own, but the common case is one date typed once.
 *
 * Approving is the only thing on this screen that writes to SAP. A sheet SAP
 * then refuses stays approved with the refusal on it, so the refusals are
 * reported here and chased from the sheet rather than silently swallowed.
 */
export default function BillSummaryApprovalPage() {
  const navigate = useNavigate();
  const { data: rows = [], isLoading } = useBillSummaries({ status: 'PENDING_APPROVAL' });
  const approve = useApproveBillSummaries();
  const reject = useRejectBillSummary();

  /** Per truck: the date typed for it, and which of its bills are dropped out. */
  const [dates, setDates] = useState<Record<string, string>>({});
  const [dropped, setDropped] = useState<Record<number, boolean>>({});
  const [sendingBack, setSendingBack] = useState<number | null>(null);
  const [reason, setReason] = useState('');

  const batches = useMemo<Batch[]>(() => {
    const byVehicle = new Map<string, Batch>();
    for (const row of rows) {
      const vehicleNo = (row.vehicle_no || '').trim();
      const key = vehicleNo || NO_VEHICLE;
      let batch = byVehicle.get(key);
      if (!batch) {
        batch = { key, vehicleNo, rows: [] };
        byVehicle.set(key, batch);
      }
      batch.rows.push(row);
    }
    // Oldest truck first: the one that has been waiting longest is the one
    // holding somebody up.
    return [...byVehicle.values()].sort((a, b) =>
      String(a.rows[0]?.submitted_at ?? '').localeCompare(String(b.rows[0]?.submitted_at ?? '')),
    );
  }, [rows]);

  const chosenIds = (batch: Batch) =>
    batch.rows.filter((row) => row.id != null && !dropped[row.id]).map((row) => row.id as number);

  async function approveBatch(batch: Batch, ids: number[]) {
    const dispatchDate = dates[batch.key] || today();
    const chosen = batch.rows.filter((row) => row.id != null && ids.includes(row.id));
    const noBilty = chosen.filter((row) => !row.bilty_no.trim()).length;

    // Approving writes to SAP there and then, so it is asked again, with the
    // invoices it is about to stamp named -- the same confirmation every other
    // SAP posting in the app goes through.
    const confirmed = await confirmSapPost({
      title: `Approve ${chosen.length} sheet${chosen.length === 1 ? '' : 's'} and stamp SAP?`,
      details: [
        { label: 'Vehicle', value: batch.vehicleNo || 'No vehicle on the sheet' },
        { label: 'Dispatch date', value: dispatchDate },
        {
          label: chosen.length === 1 ? 'SAP invoice' : `SAP invoices (${chosen.length})`,
          value: chosen.map((row) => row.sap_invoice_doc_num).join(', '),
        },
        {
          label: 'Stamps',
          value: 'The dispatch date, bilty and per-line quantities',
        },
        noBilty > 0 && {
          label: 'No bilty',
          value: `${noBilty} of these — SAP will refuse ${noBilty === 1 ? 'it' : 'them'}`,
        },
        { label: 'In SAP', value: 'Bilty, vehicle, driver and dates can only be set once' },
      ],
      confirmLabel: 'Approve and stamp SAP',
    });
    if (!confirmed) return;

    try {
      const result = await approve.mutateAsync({ ids, dispatchDate });
      if (result.approved.length > 0) {
        toast.success(
          `${result.approved.length} sheet(s) approved for ${dispatchDate} and sent to SAP`,
        );
      }
      // Reported one by one rather than counted: each refusal names a different
      // bill and a different thing to fix.
      for (const refusal of result.refused) {
        toast.error(`${refusal.entry_no || refusal.doc_num}: ${refusal.reason}`);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not approve these sheets.'));
    }
  }

  async function sendBack(id: number) {
    try {
      await reject.mutateAsync({ id, reason });
      toast.success('Sent back to dispatch');
      setSendingBack(null);
      setReason('');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not send it back.'));
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Bill summaries to approve"
        description="Sheets dispatch has sent over. Set the dispatch date to approve — that is what goes onto the SAP invoice."
      >
        <Button variant="outline" onClick={() => navigate('/warehouse/bill-summaries')}>
          All bill summaries
        </Button>
      </DashboardHeader>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : batches.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nothing waiting. Dispatch has not sent any sheets over.
        </p>
      ) : (
        batches.map((batch) => {
          const ids = chosenIds(batch);
          const noBilty = batch.rows.filter((row) => !row.bilty_no.trim()).length;
          return (
            <Card key={batch.key}>
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-semibold">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      {batch.vehicleNo || 'No vehicle on the sheet'}
                      <span className="text-sm font-normal text-muted-foreground">
                        · {batch.rows.length} bill(s)
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {batch.rows[0]?.transporter_name || 'No transporter'}
                      {batch.rows[0]?.driver_name ? ` · ${batch.rows[0].driver_name}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="space-y-1">
                      <Label htmlFor={`date-${batch.key}`}>Dispatch date</Label>
                      <Input
                        id={`date-${batch.key}`}
                        type="date"
                        className="w-40"
                        value={dates[batch.key] ?? today()}
                        onChange={(event) =>
                          setDates((prev) => ({ ...prev, [batch.key]: event.target.value }))
                        }
                      />
                    </div>
                    <Button
                      disabled={approve.isPending || ids.length === 0}
                      onClick={() => void approveBatch(batch, ids)}
                    >
                      {approve.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      )}
                      Approve {ids.length} sheet(s)
                    </Button>
                  </div>
                </div>

                {/* Said before the button is pressed rather than discovered in a
                    refusal: SAP will not take a dispatch date without a bilty. */}
                {noBilty > 0 && (
                  <p className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {noBilty} of these has no bilty number. SAP will not accept a dispatch
                    date without one — send those back for the bilty, or drop them out of
                    this batch.
                  </p>
                )}

                <div className="space-y-2">
                  {batch.rows.map((row) => (
                    <div
                      key={row.key}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-2 text-sm"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Checkbox
                          checked={row.id != null && !dropped[row.id]}
                          aria-label={`Include ${row.entry_no} in this approval`}
                          onCheckedChange={(checked) =>
                            row.id != null &&
                            setDropped((prev) => ({ ...prev, [row.id as number]: !checked }))
                          }
                        />
                        <div className="min-w-0">
                          <button
                            type="button"
                            className="font-medium hover:underline"
                            onClick={() => navigate(`/warehouse/bill-summaries/${row.key}`)}
                          >
                            {row.entry_no}
                          </button>
                          <span className="text-muted-foreground">
                            {' '}
                            · bill {row.sap_invoice_doc_num}
                          </span>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {row.customer_name || row.customer_code} · {row.totals.lines} line(s) ·{' '}
                            {num(row.totals.boxes)} box · {num(row.totals.litres)} L
                            {row.warehouse_codes && ` · ${row.warehouse_codes}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSendingBack(sendingBack === row.id ? null : row.id);
                            setReason('');
                          }}
                        >
                          <Send className="mr-1 h-3.5 w-3.5" /> Send back
                        </Button>
                      </div>

                      {sendingBack === row.id && (
                        <div className="w-full space-y-2 border-t pt-2">
                          <Label htmlFor={`reason-${row.id}`}>
                            What does dispatch need to fix on {row.entry_no}?
                          </Label>
                          <Textarea
                            id={`reason-${row.id}`}
                            value={reason}
                            rows={2}
                            onChange={(event) => setReason(event.target.value)}
                            placeholder="Bilty is for the wrong truck, quantity does not match what was loaded…"
                          />
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setSendingBack(null)}>
                              Keep it
                            </Button>
                            <Button
                              size="sm"
                              disabled={reject.isPending || !reason.trim()}
                              onClick={() => row.id != null && void sendBack(row.id)}
                            >
                              Send it back
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
