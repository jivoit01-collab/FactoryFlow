import { ArrowLeft, Box as BoxIcon, CheckCircle2, ChevronDown, ChevronRight, Loader2, Package, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useCreateDispatchSession, useSubmitDispatchScan } from '@/modules/barcode/api';
import type { DispatchSession } from '@/modules/barcode/types';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Badge, Button, Card, CardContent, Input } from '@/shared/components/ui';

interface FeedEntry {
  key: string;
  ok: boolean;
  title: string;
  detail: string;
}

function toNum(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Prep loading — scan pallets for a vehicle that isn't docked yet.
 *
 * Pallets are often staged to the dock before the truck arrives. Since no
 * docking exists yet, scanning here runs against a bill-based dispatch session
 * (one per bill): boxes stage INSIDE_VEHICLE and their map bins free, and when
 * the truck later docks these scans import into the docking. Already-dispatched
 * bills are refused by the session (BILL_ALREADY_DISPATCHED).
 */
export default function DispatchLoadingPrepScanPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const vehicle = params.get('vehicle') || 'Vehicle';
  const company = params.get('company') || '';
  const bills = (params.get('bills') || '').split(',').map((b) => b.trim()).filter(Boolean);

  const createSession = useCreateDispatchSession();
  const submitScan = useSubmitDispatchScan();

  const [openBill, setOpenBill] = useState<string | null>(bills[0] ?? null);
  const [barcode, setBarcode] = useState('');
  const [sessions, setSessions] = useState<Record<string, DispatchSession>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedByBill, setFeedByBill] = useState<Record<string, FeedEntry[]>>({});
  const [seq, setSeq] = useState(0);
  const submitting = createSession.isPending || submitScan.isPending;

  function pushFeed(bill: string, e: Omit<FeedEntry, 'key'>) {
    setSeq((s) => {
      const key = `${s + 1}`;
      setFeedByBill((prev) => ({
        ...prev,
        [bill]: [{ ...e, key }, ...(prev[bill] ?? [])].slice(0, 12),
      }));
      return s + 1;
    });
  }

  async function ensureSession(bill: string): Promise<DispatchSession | null> {
    if (sessions[bill]) return sessions[bill];
    try {
      const session = await createSession.mutateAsync({ bill_number: bill });
      setSessions((prev) => ({ ...prev, [bill]: session }));
      setErrors((prev) => ({ ...prev, [bill]: '' }));
      return session;
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string; message?: string } } })?.response?.data
          ?.detail ??
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not open this bill for scanning.';
      setErrors((prev) => ({ ...prev, [bill]: detail }));
      return null;
    }
  }

  // Open a session as soon as a bill is open — including the first bill, which
  // opens by default on mount — instead of only on click.
  useEffect(() => {
    if (openBill && !sessions[openBill] && !errors[openBill]) {
      void ensureSession(openBill);
    }
    // ensureSession is stable enough for this effect; re-run only on bill change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openBill]);

  function openBillCard(bill: string) {
    setOpenBill((current) => (current === bill ? null : bill));
  }

  function retry(bill: string) {
    setErrors((prev) => ({ ...prev, [bill]: '' }));
    void ensureSession(bill);
  }

  async function submit(bill: string) {
    const raw = barcode.trim();
    if (!raw || submitting) return;
    const session = await ensureSession(bill);
    if (!session) return;
    setBarcode('');
    try {
      const { scan, session: updated } = await submitScan.mutateAsync({
        sessionId: session.id,
        data: { barcode: raw },
      });
      setSessions((prev) => ({ ...prev, [bill]: updated }));
      // The session auto-detects pallet vs box from the barcode; label from it.
      const kind =
        scan.entity_type === 'PALLET' ? 'Pallet' : scan.entity_type === 'BOX' ? 'Box' : 'Scanned';
      pushFeed(bill, {
        ok: true,
        title: `${kind} ${raw}`,
        detail: `Scanned · ${toNum(updated.total_scanned_qty)}/${toNum(updated.total_expected_qty)} pcs`,
      });
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string; message?: string } } })?.response?.data
          ?.detail ??
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Scan rejected';
      pushFeed(bill, { ok: false, title: raw, detail });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/warehouse/dispatch-loading')}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Trucks
        </Button>
      </div>

      <DashboardHeader
        title={`Prep load ${vehicle}`}
        subtitle={`Not docked yet — scanning against ${bills.length} bill${bills.length === 1 ? '' : 's'}; scans import when the truck docks`}
      />

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Package className="h-4 w-4" />
        <BoxIcon className="h-4 w-4" />
        <span>
          Scan a pallet (loads the whole pallet, frees its bin) or a single box —
          mix freely; every scan counts toward the open bill.
        </span>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Bills for this truck{company ? ` · ${company}` : ''}
        </h2>
        {bills.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No bills passed for this vehicle.
            </CardContent>
          </Card>
        ) : (
          bills.map((bill) => {
            const isOpen = openBill === bill;
            const session = sessions[bill];
            const error = errors[bill];
            const feed = feedByBill[bill] ?? [];
            const scanned = session ? toNum(session.total_scanned_qty) : 0;
            const expected = session ? toNum(session.total_expected_qty) : 0;
            const complete = expected > 0 && scanned >= expected;
            return (
              <Card key={bill} className={isOpen ? 'ring-1 ring-primary/40' : undefined}>
                <CardContent className="p-0">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 p-4 text-left"
                    onClick={() => openBillCard(bill)}
                  >
                    <div className="flex items-center gap-2">
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-semibold">Bill {bill}</span>
                    </div>
                    {session ? (
                      <Badge variant={complete ? 'default' : 'secondary'}>
                        {scanned}/{expected || '—'} pcs
                      </Badge>
                    ) : (
                      <Badge variant="outline">Not started</Badge>
                    )}
                  </button>

                  {isOpen && (
                    <div className="space-y-3 border-t px-4 pb-4 pt-3">
                      {error ? (
                        <div className="space-y-2">
                          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                            {error}
                          </p>
                          <Button size="sm" variant="outline" onClick={() => retry(bill)}>
                            Retry
                          </Button>
                        </div>
                      ) : !session ? (
                        <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" /> Opening bill…
                        </div>
                      ) : (
                        <>
                          <div className="flex gap-2">
                            <Input
                              autoFocus
                              value={barcode}
                              placeholder={`Scan a pallet or box for bill ${bill}`}
                              onChange={(e) => setBarcode(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && submit(bill)}
                            />
                            <Button onClick={() => submit(bill)} disabled={submitting || !barcode.trim()}>
                              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Scan'}
                            </Button>
                          </div>

                          {feed.length > 0 && (
                            <div className="space-y-1.5">
                              {feed.map((f) => (
                                <div key={f.key} className="flex items-start gap-2 rounded-md bg-muted/50 p-2 text-sm">
                                  {f.ok ? (
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                                  ) : (
                                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium">{f.title}</p>
                                    <p className="text-xs text-muted-foreground">{f.detail}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="space-y-1">
                            {session.lines.map((ln) => (
                              <div
                                key={ln.id}
                                className="flex items-center justify-between gap-2 text-xs text-muted-foreground"
                              >
                                <span className="truncate">
                                  {ln.material_code} · {ln.material_description}
                                </span>
                                <span className="shrink-0">
                                  {toNum(ln.scanned_boxes)}/{toNum(ln.bill_boxes) || '—'} box
                                </span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
