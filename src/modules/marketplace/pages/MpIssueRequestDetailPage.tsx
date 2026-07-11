/**
 * Step 4 detail — warehouse review (per-line approve / partial / reject), then
 * issue to packing and confirm receipt. Modelled on the warehouse BOM-Request
 * screen. Approve quantity is capped at the required quantity.
 */
import { ArrowLeft, CheckCircle2, Download, PackageCheck, Send, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui';

import { marketplaceApi } from '../api/marketplace.api';
import {
  useIssueMaterials,
  useIssueRequest,
  useReceiveIssue,
  useRejectIssue,
  useReviewIssue,
} from '../api/marketplace.queries';
import { MpFlowSteps } from '../components/MpFlowSteps';
import type { MarketplaceIssueRequest } from '../types/marketplace.types';

type Draft = Record<number, { approved: string; rejected: boolean }>;

const EDITABLE = new Set(['SENT', 'APPROVED', 'PARTIALLY_APPROVED']);

export default function MpIssueRequestDetailPage() {
  const { issueId } = useParams();
  const id = Number(issueId);
  const { data: req } = useIssueRequest(id);

  const reviewMut = useReviewIssue(id);
  const rejectMut = useRejectIssue(id);
  const issueMut = useIssueMaterials(id);
  const receiveMut = useReceiveIssue(id);

  const [draft, setDraft] = useState<Draft>({});

  useEffect(() => {
    if (!req?.lines) return;
    setDraft(
      Object.fromEntries(
        req.lines.map((l) => [
          l.id,
          {
            approved: String(Number(l.approved_qty) || Number(l.required_qty)),
            rejected: l.status === 'REJECTED',
          },
        ]),
      ),
    );
  }, [req?.id, req?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!req) {
    return <div className="p-6 text-muted-foreground">Loading…</div>;
  }

  const editable = EDITABLE.has(req.status);
  const canIssue = req.status === 'APPROVED' || req.status === 'PARTIALLY_APPROVED';
  const canReceive = req.status === 'ISSUED';

  function saveReview() {
    const lines = (req!.lines ?? []).map((l) => {
      const d = draft[l.id];
      if (d?.rejected) {
        return { line_id: l.id, status: 'REJECTED' as const, reason: l.reject_reason || 'Rejected' };
      }
      return { line_id: l.id, status: 'APPROVED' as const, approved_qty: d?.approved ?? l.required_qty };
    });
    reviewMut.mutate(
      { lines },
      {
        onSuccess: () => toast.success('Review saved.'),
        onError: (e: unknown) => toast.error((e as { message?: string })?.message ?? 'Review failed.'),
      },
    );
  }

  function rejectAll() {
    rejectMut.mutate('Rejected by warehouse', {
      onSuccess: () => toast.success('Request rejected.'),
    });
  }

  function issue() {
    issueMut.mutate(undefined, {
      onSuccess: () => toast.success('Materials issued to packing.'),
      onError: (e: unknown) => toast.error((e as { message?: string })?.message ?? 'Issue failed.'),
    });
  }

  function receive() {
    receiveMut.mutate({}, { onSuccess: () => toast.success('Receipt confirmed.') });
  }

  async function download() {
    const blob = await marketplaceApi.exportBatchCsv(req!.batch);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `issuance-batch-${req!.batch}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <header className="space-y-2">
        <Link to="/marketplace/issues" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Issue requests
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">MPIR-{req.id}</h1>
          <Badge variant={req.status === 'REJECTED' ? 'destructive' : 'default'}>{req.status}</Badge>
          <span className="text-sm text-muted-foreground">
            {req.batch_filename} · warehouse {req.sap_warehouse_code || '—'}
          </span>
        </div>
        <MpFlowSteps current={4} />
      </header>

      {(() => {
        const lines = req.lines ?? [];
        const sum = (k: keyof (typeof lines)[number]) =>
          lines.reduce((a, l) => a + Number(l[k] || 0), 0);
        const fg = lines.filter((l) => l.component_type === 'FG').length;
        const pm = lines.filter((l) => l.component_type === 'PM').length;
        const cards: { label: string; value: number | string }[] = [
          { label: 'Lines', value: `${lines.length} (${fg} FG · ${pm} PM)` },
          { label: 'Required', value: sum('required_qty') },
          { label: 'Approved', value: sum('approved_qty') },
          { label: 'Issued', value: sum('issued_qty') },
          { label: 'Received', value: sum('received_qty') },
        ];
        return (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {cards.map((c) => (
              <div key={c.label} className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">{c.label}</div>
                <div className="text-lg font-semibold">{c.value}</div>
              </div>
            ))}
          </div>
        );
      })()}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Stock lines</CardTitle>
          <Button size="sm" variant="outline" onClick={download}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-3">Item</th>
                  <th className="p-3">Type</th>
                  <th className="p-3 text-right">Required</th>
                  <th className="p-3 text-right">On hand</th>
                  <th className="p-3 text-right">Approve</th>
                  <th className="p-3 text-right">Issued</th>
                  <th className="p-3 text-right">Received</th>
                  <th className="p-3">Line</th>
                </tr>
              </thead>
              <tbody>
                {(req.lines ?? []).map((l) => {
                  const d = draft[l.id] ?? { approved: String(l.required_qty), rejected: false };
                  return (
                    <tr key={l.id} className="border-b last:border-0">
                      <td className="p-3">
                        <div className="font-mono">{l.item_code}</div>
                        <div className="text-xs text-muted-foreground">{l.item_name}</div>
                      </td>
                      <td className="p-3">
                        <Badge variant={l.component_type === 'FG' ? 'default' : 'outline'}>
                          {l.component_type}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-semibold">{Number(l.required_qty)}</td>
                      <td className="p-3 text-right text-muted-foreground">{Number(l.available_stock)}</td>
                      <td className="p-3 text-right">
                        {editable ? (
                          <input
                            type="number"
                            min={0}
                            max={Number(l.required_qty)}
                            value={d.rejected ? '' : d.approved}
                            disabled={d.rejected}
                            onChange={(e) =>
                              setDraft((prev) => ({
                                ...prev,
                                [l.id]: { ...d, approved: e.target.value },
                              }))
                            }
                            className="h-8 w-20 rounded-md border bg-background px-2 text-right text-sm disabled:opacity-50"
                          />
                        ) : (
                          <span>{Number(l.approved_qty)}</span>
                        )}
                      </td>
                      <td className="p-3 text-right">{Number(l.issued_qty)}</td>
                      <td className="p-3 text-right">{Number(l.received_qty)}</td>
                      <td className="p-3">
                        {editable ? (
                          <Button
                            size="sm"
                            variant={d.rejected ? 'destructive' : 'ghost'}
                            onClick={() =>
                              setDraft((prev) => ({
                                ...prev,
                                [l.id]: { ...d, rejected: !d.rejected },
                              }))
                            }
                          >
                            {d.rejected ? (
                              <>
                                <XCircle className="mr-1 h-3 w-3" /> Rejected
                              </>
                            ) : (
                              'Reject'
                            )}
                          </Button>
                        ) : (
                          <Badge
                            variant={l.status === 'REJECTED' ? 'destructive' : 'outline'}
                          >
                            {l.status}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {editable && (
          <>
            <Button onClick={saveReview} disabled={reviewMut.isPending}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Save review
            </Button>
            <Button variant="outline" onClick={rejectAll} disabled={rejectMut.isPending}>
              <XCircle className="mr-2 h-4 w-4" /> Reject all
            </Button>
          </>
        )}
        {canIssue && (
          <Button onClick={issue} disabled={issueMut.isPending}>
            <Send className="mr-2 h-4 w-4" /> Issue materials
          </Button>
        )}
        {canReceive && (
          <Button onClick={receive} disabled={receiveMut.isPending}>
            <PackageCheck className="mr-2 h-4 w-4" /> Confirm receipt
          </Button>
        )}
        {req.status === 'RECEIVED' && (
          <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" /> Received — ready to dispatch orders (Outward).
          </span>
        )}
      </div>
    </div>
  );
}

export type { MarketplaceIssueRequest };
