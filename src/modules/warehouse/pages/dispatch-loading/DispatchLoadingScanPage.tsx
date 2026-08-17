import {
  ArrowLeft,
  Box as BoxIcon,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Package,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  type SalesDispatchPalletScanResult,
  useSalesDispatch,
  useScanSalesDispatchBox,
  useScanSalesDispatchPallet,
} from '@/modules/gate/api';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Badge, Button, Card, CardContent, Input } from '@/shared/components/ui';

interface FeedEntry {
  key: string;
  ok: boolean;
  title: string;
  detail: string;
  binFreed?: boolean;
}

function toNum(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

// Color-coded company pill so an operator can see at a glance which company's
// bill they're loading (a truck can be dispatching for Oil, Mart, or Beverages).
function companyPillClass(code?: string): string {
  const c = (code ?? '').toUpperCase();
  if (c.includes('OIL')) return 'bg-amber-100 text-amber-800 hover:bg-amber-100';
  if (c.includes('MART')) return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100';
  if (c.includes('BEV')) return 'bg-violet-100 text-violet-800 hover:bg-violet-100';
  return 'bg-slate-100 text-slate-700 hover:bg-slate-100';
}

export default function DispatchLoadingScanPage() {
  const { entryId } = useParams();
  const id = Number(entryId);
  const navigate = useNavigate();

  const { data: entry, isLoading } = useSalesDispatch(id);
  const scanPallet = useScanSalesDispatchPallet();
  const scanBox = useScanSalesDispatchBox();

  const [openBillId, setOpenBillId] = useState<number | null>(null);
  const [barcode, setBarcode] = useState('');
  // Scan feed kept per bill, so each bill shows only its own scan results.
  const [feedByBill, setFeedByBill] = useState<Record<number, FeedEntry[]>>({});
  const [seq, setSeq] = useState(0);
  const submitting = scanPallet.isPending || scanBox.isPending;

  // Group line items + active box scans by the bill they belong to.
  const bills = useMemo(() => {
    if (!entry) return [];
    const scans = entry.box_scans ?? [];
    return (entry.documents ?? []).map((doc) => {
      const items = (entry.items ?? []).filter((it) => it.document === doc.id);
      const expectedBoxes = items.reduce((sum, it) => sum + toNum(it.total_boxes), 0);
      const scannedBoxes = scans.filter((s) => s.document === doc.id).length;
      return { doc, items, expectedBoxes, scannedBoxes };
    });
  }, [entry]);

  // Open the first bill by default so the operator can scan immediately.
  useEffect(() => {
    if (openBillId === null && bills.length > 0) {
      setOpenBillId(bills[0].doc.id);
    }
  }, [bills, openBillId]);

  const totalScanned = entry?.box_scans?.length ?? 0;
  const totalExpected = bills.reduce((sum, b) => sum + b.expectedBoxes, 0);

  function pushFeed(billId: number, e: Omit<FeedEntry, 'key'>) {
    setSeq((s) => {
      const key = `${s + 1}`;
      setFeedByBill((prev) => ({
        ...prev,
        [billId]: [{ ...e, key }, ...(prev[billId] ?? [])].slice(0, 12),
      }));
      return s + 1;
    });
  }

  function describePallet(r: SalesDispatchPalletScanResult): Omit<FeedEntry, 'key'> {
    const bits = [`${r.scanned} staged`];
    if (r.duplicates) bits.push(`${r.duplicates} already on truck`);
    if (r.rejected) bits.push(`${r.rejected} skipped`);
    const ok = r.scanned > 0 || r.duplicates > 0;
    const detailParts = [bits.join(' · ')];
    if (r.rejections.length) {
      detailParts.push(r.rejections.map((x) => `${x.box_barcode}: ${x.detail}`).join(' | '));
    }
    return {
      ok,
      title: `Pallet ${r.pallet_id} — ${r.item_code}`,
      detail: detailParts.join(' — '),
      binFreed: r.bin_freed,
    };
  }

  async function submit(billId: number) {
    const raw = barcode.trim();
    if (!raw || submitting) return;
    setBarcode('');
    // Auto-detect: box labels are BOX-…, pallet labels are PLT-… (anything else
    // is treated as a pallet and the backend rejects it with a clear message).
    // Pallets and boxes both count toward the same bill — scan them in any mix.
    const isBox = raw.toUpperCase().startsWith('BOX');
    try {
      if (!isBox) {
        const result = await scanPallet.mutateAsync({
          id,
          data: { barcode_raw: raw, document: billId },
        });
        pushFeed(billId, describePallet(result));
      } else {
        const scan = await scanBox.mutateAsync({
          id,
          data: { barcode_raw: raw, document: billId },
        });
        pushFeed(billId, {
          ok: true,
          title: `Box ${scan.box_barcode}`,
          detail: scan.duplicate ? 'Already on this truck' : 'Staged into vehicle',
        });
      }
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Scan failed';
      pushFeed(billId, { ok: false, title: raw, detail });
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading docking…
      </div>
    );
  }
  if (!entry) {
    return <div className="py-16 text-center text-muted-foreground">Docking not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/warehouse/dispatch-loading')}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Trucks
        </Button>
      </div>

      <DashboardHeader
        title={`Load ${entry.vehicle_no || entry.entry_no}`}
        subtitle={`${entry.entry_no} · ${bills.length} bill${bills.length === 1 ? '' : 's'} · ${totalScanned}/${totalExpected} boxes scanned`}
      />

      {/* Scan pallets or boxes into the open bill — both count toward it. */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Package className="h-4 w-4" />
        <BoxIcon className="h-4 w-4" />
        <span>
          Scan a pallet (loads the whole pallet, frees its bin) or a single box —
          mix freely; every scan counts toward the open bill.
        </span>
      </div>

      {/* Bill-wise scanning — open a bill and scan its pallets into it. */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Bills on this truck</h2>
        {bills.map(({ doc, items, expectedBoxes, scannedBoxes }) => {
          const isOpen = openBillId === doc.id;
          const complete = expectedBoxes > 0 && scannedBoxes >= expectedBoxes;
          const feed = feedByBill[doc.id] ?? [];
          return (
            <Card key={doc.id} className={isOpen ? 'ring-1 ring-primary/40' : undefined}>
              <CardContent className="p-0">
                {/* Bill header — click to open for scanning */}
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 p-4 text-left"
                  onClick={() => setOpenBillId(isOpen ? null : doc.id)}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">Bill {doc.sap_doc_num}</p>
                        {entry.company_name && (
                          <Badge className={companyPillClass(entry.company_code)}>
                            {entry.company_name}
                          </Badge>
                        )}
                      </div>
                      {doc.customer_name && (
                        <p className="truncate text-xs text-muted-foreground">
                          {doc.customer_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant={complete ? 'default' : 'secondary'}>
                    {scannedBoxes}/{expectedBoxes || '—'} boxes
                  </Badge>
                </button>

                {isOpen && (
                  <div className="space-y-3 border-t px-4 pb-4 pt-3">
                    {/* Scan input scoped to THIS bill */}
                    <div className="flex gap-2">
                      <Input
                        autoFocus
                        value={barcode}
                        placeholder={`Scan a pallet or box for bill ${doc.sap_doc_num}`}
                        onChange={(e) => setBarcode(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && submit(doc.id)}
                      />
                      <Button onClick={() => submit(doc.id)} disabled={submitting || !barcode.trim()}>
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Scan'}
                      </Button>
                    </div>

                    {/* This bill's scan feed */}
                    {feed.length > 0 && (
                      <div className="space-y-1.5">
                        {feed.map((f) => (
                          <div
                            key={f.key}
                            className="flex items-start gap-2 rounded-md bg-muted/50 p-2 text-sm"
                          >
                            {f.ok ? (
                              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                            ) : (
                              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-medium">
                                {f.title}
                                {f.binFreed ? (
                                  <span className="ml-2 text-xs font-normal text-green-600">
                                    bin freed
                                  </span>
                                ) : null}
                              </p>
                              <p className="text-xs text-muted-foreground">{f.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Bill line items */}
                    <div className="space-y-1">
                      {items.map((it) => (
                        <div
                          key={it.id}
                          className="flex items-center justify-between gap-2 text-xs text-muted-foreground"
                        >
                          <span className="truncate">
                            {it.item_code} · {it.item_name}
                          </span>
                          <span className="shrink-0">
                            {toNum(it.quantity)} {it.uom}
                            {toNum(it.total_boxes) ? ` · ${toNum(it.total_boxes)} box` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
