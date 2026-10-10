import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Loader2,
  Lock,
  OctagonX,
  Pencil,
  RefreshCw,
  RotateCcw,
  Send,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { usePermission } from '@/core/auth/hooks/usePermission';
import { confirmDialog, confirmSapPost, promptDialog } from '@/shared/components';
import { Badge, Button, Card, CardContent } from '@/shared/components/ui';
import { formatDateTimeShort, getErrorMessage } from '@/shared/utils';

import {
  CASH_SAP_QUERY_KEYS,
  cashSapApi,
  useAcceptBunchChanges,
  useBunchSapPlan,
  useCashSapOptions,
  useClosePO,
  useLeaveOutVoucher,
  useRecheckBunch,
  useResetBunch,
  useStopBunch,
} from '../api';
import { GrpoRedateDialog } from '../components/GrpoRedateDialog';
import { ProblemList } from '../components/ProblemList';
import { BunchSapStateBadge, SapDocStatusBadge } from '../components/SapDocStatusBadge';
import { VoucherBillUpload } from '../components/VoucherBillUpload';
import { VoucherIssues } from '../components/VoucherIssues';
import { VoucherSapDialog } from '../components/VoucherSapDialog';
import { CASH_SAP_PERMISSIONS, CASH_SAP_VOUCHER_INFO_WRITE_ACCESS } from '../constants/permissions';
import type { BunchSapPlan, GroupSapPlan, GrpoSapPlan, SendResult, VoucherSapPlan } from '../types';
import { describeSendLoop, runSendLoop } from '../utils/sendLoop';
import {
  canChangeBills,
  canClosePO,
  canEditForSap,
  canLeaveOut,
  canRedateGrpo,
  errorCode,
  errorDetail,
  grpoForVoucher,
  money,
  nothingInSap,
  planHasBatches,
  planHasFailedWork,
  planHasLiveWork,
  serviceDraft,
  TREATMENT_LABELS,
} from '../utils/status';
import { fmt } from '../utils/voucherDates';

const BUNCH_CHANGED = 'BUNCH_CHANGED';
const PLAN_UNREADABLE = "This bunch's SAP plan could not be read.";

const day = (value: string | null | undefined) => (value ? fmt(value) : '—');

/**
 * One bunch's SAP page: `/accounts/bunches/:bunchId/sap`.
 *
 * The page IS the plan (`GET cash-sap/bunches/<id>/`): every voucher resolved
 * to goods (a PO line and a GRPO), a service line, not posted, or not routed;
 * grouped by SAP company; with every reason something cannot post yet. What
 * is shown is exactly what Post freezes.
 *
 * POSTING. "Post to SAP" asks first (`confirmSapPost`), then `post/` freezes
 * the bunch and sends ONE document, and the browser loops `send-next/` -- one
 * SAP write per request, five-minute timeout each -- until nothing is left to
 * send now (`runSendLoop`: refused documents are skipped and the loop goes
 * on; it stops when SAP is not answering, when a document is being sent
 * elsewhere, after 250 calls, or on Stop). The worker sends whatever the
 * browser leaves. Retry runs the same loop with `include_failed`.
 *
 * WHILE ANYTHING WAITS (QUEUED, IN_APPROVAL) the plan is fetched again every
 * 15 s, so a document the worker or an approver moves on shows up by itself.
 *
 * DRIFT. The cash book cannot be locked from here; if the bunch changed there
 * after it was frozen, the plan carries `BUNCH_CHANGED` and nothing more is
 * sent. That is the red panel at the top, with its two ways out: accept the
 * change, or reset (while nothing is in SAP).
 */
export default function BunchSapPage() {
  const { bunchId: rawId } = useParams<{ bunchId: string }>();
  const bunchId = Number(rawId);
  const validId = Number.isInteger(bunchId) && bunchId > 0;

  const { hasPermission, hasAnyPermission } = usePermission();
  const canPostRight = hasPermission(CASH_SAP_PERMISSIONS.POST);
  const canWriteInfo = hasAnyPermission(CASH_SAP_VOUCHER_INFO_WRITE_ACCESS);

  const queryClient = useQueryClient();
  const { data: options } = useCashSapOptions();
  const {
    data: plan,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useBunchSapPlan(validId ? bunchId : null);

  const stopMutation = useStopBunch(bunchId);
  const recheck = useRecheckBunch(bunchId);
  const accept = useAcceptBunchChanges(bunchId);
  const closePO = useClosePO(bunchId);
  const reset = useResetBunch(bunchId);
  const leaveOut = useLeaveOutVoucher(bunchId);

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const stopLoop = useRef(false);
  const [changedError, setChangedError] = useState<string | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [editing, setEditing] = useState<VoucherSapPlan | null>(null);
  const [redating, setRedating] = useState<{ grpo: GrpoSapPlan; poDocDate: string | null } | null>(
    null,
  );

  const busy =
    running ||
    stopMutation.isPending ||
    recheck.isPending ||
    accept.isPending ||
    closePO.isPending ||
    reset.isPending ||
    leaveOut.isPending;

  const serials = useMemo(() => {
    const out = new Map<number, string>();
    if (!plan) return out;
    const all = [...plan.groups.flatMap((g) => g.vouchers), ...plan.unrouted, ...plan.skipped];
    for (const v of all) out.set(v.entry_id, String(v.serial_number ?? v.entry_id));
    return out;
  }, [plan]);

  if (!validId) {
    return <p className="p-6 text-muted-foreground">That is not a bunch.</p>;
  }

  function showPlan(next: BunchSapPlan | undefined | null) {
    if (next) queryClient.setQueryData(CASH_SAP_QUERY_KEYS.plan(bunchId), next);
  }

  function refreshEverything() {
    void queryClient.invalidateQueries({ queryKey: CASH_SAP_QUERY_KEYS.all });
    void queryClient.invalidateQueries({ queryKey: ['cash-book'] });
  }

  /** An error from a cash_sap write: BUNCH_CHANGED goes to the red panel, the rest to a toast. */
  function reportError(err: unknown, fallback: string) {
    if (errorCode(err) === BUNCH_CHANGED) {
      setChangedError(errorDetail(err) ?? getErrorMessage(err, fallback));
      void refetch();
      return;
    }
    toast.error(getErrorMessage(err, fallback));
  }

  function keepNotes(next: BunchSapPlan | undefined) {
    const list = next?.notes ?? [];
    setNotes(list);
    for (const note of list) toast.info(note);
  }

  /** Post (freeze + send one, then loop) or Retry (loop with include_failed). */
  async function send({ company, retry }: { company?: string; retry: boolean }) {
    if (!plan || running) return;
    if (!retry) {
      const groups = company
        ? plan.groups.filter((g) => g.sap_company_code === company)
        : plan.groups;
      const vouchers = groups.flatMap((g) => g.vouchers.filter((v) => !v.frozen));
      const goods = vouchers.filter((v) => v.treatment === 'ITEM');
      const services = vouchers.filter((v) => v.treatment === 'SERVICE');
      const ok = await confirmSapPost({
        title: company
          ? `Post the ${company} part of bunch ${plan.bunch.number} to SAP?`
          : `Post bunch ${plan.bunch.number} to SAP?`,
        details: [
          plan.simulate && { label: 'Mode', value: 'SIMULATE — nothing goes to SAP' },
          {
            label: 'SAP companies',
            value: groups.map((g) => g.sap_company_code).join(', ') || '—',
          },
          {
            label: 'Goods vouchers',
            value: `${goods.length} (one imprest PO per company, then a GRPO each)`,
          },
          services.length > 0 && {
            label: 'Service vouchers',
            value: `${services.length}${groups.some((g) => g.ap_drafts_enabled) ? ' (A/P service draft)' : ' (not sent; drafts are off)'}`,
          },
          {
            label: 'Value',
            value: money(groups.reduce((sum, g) => sum + Number(g.total), 0)),
          },
          {
            label: 'Then',
            value: 'One document at a time; keep this page open, or the worker sends the rest.',
          },
        ],
        confirmLabel: 'Post to SAP',
      });
      if (!ok) return;
    }

    await whileRunning(async () => {
      let first: SendResult | null = null;
      if (!retry) {
        try {
          first = await cashSapApi.post(bunchId, company);
        } catch (err) {
          reportError(err, 'The bunch could not be posted.');
          return;
        }
      }
      await drive(first, retry);
    });
  }

  /** Mark the page as sending (buttons off, progress shown) for the length of `work`. */
  async function whileRunning(work: () => Promise<void>) {
    stopLoop.current = false;
    setChangedError(null);
    setRunning(true);
    setProgress('Posting 1…');
    try {
      await work();
    } finally {
      setRunning(false);
      setProgress(null);
      refreshEverything();
    }
  }

  /** Loop `send-next/` on from `first` (the answer that started the run) and say how it went. */
  async function drive(first: SendResult | null, includeFailed: boolean) {
    const result = await runSendLoop({
      first,
      includeFailed,
      sendNext: (payload) => cashSapApi.sendNext(bunchId, payload),
      shouldStop: () => stopLoop.current,
      onProgress: (p) => setProgress(p.text),
      onResult: (answer) => showPlan(answer.plan),
    });
    const line = describeSendLoop(result);
    if (result.reason === 'error') {
      reportError(result.error, 'Sending stopped on an error.');
      if (result.calls > 0) toast.warning(line);
    } else if (result.rejected.length > 0 || result.reason !== 'done') {
      toast.warning(line, {
        description:
          result.rejected.map((r) => `${r.label}: ${r.message}`).join(' · ') || undefined,
      });
    } else {
      toast.success(line);
    }
  }

  async function stopSending() {
    stopLoop.current = true;
    const reason = await promptDialog({
      title: 'Stop sending this bunch to SAP?',
      description:
        'Every document still waiting is cancelled and marked refused, with your reason. Anything already in SAP stays. Press Retry later to send the rest.',
      label: 'Reason',
      multiline: true,
      confirmLabel: 'Stop sending',
      destructive: true,
    });
    if (reason === null) return;
    try {
      const next = await stopMutation.mutateAsync(reason);
      toast.success(`${next.stopped ?? 0} document(s) stopped`);
      keepNotes(next);
    } catch (err) {
      reportError(err, 'Sending could not be stopped.');
    }
  }

  async function doRecheck() {
    try {
      const next = await recheck.mutateAsync();
      keepNotes(next);
      if (!next.notes?.length) toast.success('SAP agrees with the app.');
    } catch (err) {
      reportError(err, 'SAP could not be re-checked.');
    }
  }

  async function doAccept() {
    const note = await promptDialog({
      title: 'Accept what changed in the cash book?',
      description:
        'A voucher taken out is dropped (or left out after the PO, when its PO is in SAP). A changed or added voucher is accepted only while nothing of it is committed. Then the bunch is snapshotted again.',
      label: 'Why',
      multiline: true,
      confirmLabel: 'Accept the change',
    });
    if (note === null) return;
    try {
      await accept.mutateAsync(note);
      setChangedError(null);
      toast.success('Change accepted. Post again to carry on.');
    } catch (err) {
      reportError(err, 'The change could not be accepted.');
    }
  }

  async function doReset() {
    const ok = await confirmDialog({
      title: `Reset bunch ${plan?.bunch.number ?? ''} for SAP?`,
      description:
        'Its SAP plan is thrown away: the PO, GRPO and draft rows, and the freeze. Nothing is in SAP yet, so nothing is lost there. Overrides, bills and bill details are kept.',
      confirmLabel: 'Reset',
      destructive: true,
    });
    if (!ok) return;
    try {
      await reset.mutateAsync();
      setChangedError(null);
      toast.success('Bunch reset. It can be posted afresh.');
    } catch (err) {
      reportError(err, 'The bunch could not be reset.');
    }
  }

  async function doClosePO(group: GroupSapPlan) {
    if (!group.batch) return;
    const ok = await confirmSapPost({
      title: `Close PO ${group.batch.po_doc_num ?? ''} in SAP?`,
      details: [
        { label: 'SAP company', value: group.sap_company_code },
        {
          label: 'Why',
          value: 'A voucher was left out after the PO; its line stays open until closed.',
        },
        group.batch.simulated && { label: 'Mode', value: 'Simulated — nothing goes to SAP' },
      ],
      confirmLabel: 'Close the PO',
      destructive: true,
    });
    if (!ok) return;
    const batchId = group.batch.id;
    const result = await closePO.mutateAsync(batchId).catch((err: unknown) => {
      reportError(err, 'The PO could not be closed.');
      return null;
    });
    if (!result) return;
    // `request_po_close` queues the close, then runs `send_next` for the whole
    // bunch -- which sends POs, drafts and GRPOs before PO closes. Only claim
    // the close when it is what was sent.
    const sent = result.sent;
    if (sent?.kind === 'cash_sap.po_close' && sent.source_id === batchId) {
      const outcome = String(sent.outcome ?? '').toLowerCase();
      if (outcome === 'rejected') toast.error(`${sent.label}: ${sent.message}`);
      else if (outcome === 'waiting' || outcome === 'in_progress')
        toast.warning(`${sent.label}: ${sent.message || 'waiting for SAP'}`);
      else toast.success('PO close sent.');
      return;
    }
    if (sent == null) {
      toast.info('PO close queued; the worker sends it.');
      return;
    }
    // Something else of this bunch went first: carry on sending, the close goes last.
    toast.info('PO close queued behind other documents of this bunch; sending them now.');
    await whileRunning(() => drive(result, false));
  }

  async function doLeaveOut(voucher: VoucherSapPlan) {
    const reason = await promptDialog({
      title: `Leave voucher ${voucher.serial_number ?? voucher.entry_id} out of SAP?`,
      description:
        'Its PO line stays open in SAP and its GRPO is not sent. Close the PO once the rest are in.',
      label: 'Reason',
      multiline: true,
      confirmLabel: 'Leave it out',
      destructive: true,
    });
    if (reason === null) return;
    try {
      const next = await leaveOut.mutateAsync({ entryId: voucher.entry_id, reason });
      keepNotes(next);
    } catch (err) {
      reportError(err, 'The voucher could not be left out.');
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Working out what goes to SAP…
      </div>
    );
  }
  if (!plan) {
    // The plan read keeps the global toast off (it is polled), so say why here.
    return (
      <div className="space-y-4 p-2">
        <BackLink />
        <p className="text-muted-foreground">
          {isError ? getErrorMessage(error, PLAN_UNREADABLE) : PLAN_UNREADABLE}
        </p>
        <Button variant="outline" onClick={() => void refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Try again
        </Button>
      </div>
    );
  }

  const changedProblem = plan.problems.find((p) => p.code === BUNCH_CHANGED);
  const otherProblems = plan.problems.filter((p) => p.code !== BUNCH_CHANGED);
  const hasBatches = planHasBatches(plan);
  const canWrite = canPostRight && !busy;
  const testCodes = plan.groups.filter((g) => g.is_test_target).map((g) => g.sap_company_code);
  const realBatches = plan.groups.some((g) => g.batch && !g.batch.simulated);

  return (
    <div className="space-y-6">
      <BackLink />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Bunch {plan.bunch.number} → SAP</h1>
          <p className="text-sm text-muted-foreground">
            {plan.bunch.entry_count} vouchers · {money(plan.bunch.total)}
            {plan.bunch.remarks ? ` · ${plan.bunch.remarks}` : ''}
            {plan.bunch.sent_at ? ` · sent to HO ${formatDateTimeShort(plan.bunch.sent_at)}` : ''}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <BunchSapStateBadge state={plan.summary.state} label={plan.summary.label} />
            {plan.bunch.frozen_at && (
              <Badge variant="outline" className="text-[10px]">
                <Lock className="mr-1 h-3 w-3" /> Frozen {formatDateTimeShort(plan.bunch.frozen_at)}
              </Badge>
            )}
            {!plan.enabled && (
              <Badge variant="destructive" className="text-[10px]">
                Switched off — nothing is sent
              </Badge>
            )}
            {plan.simulate && (
              <Badge
                variant="outline"
                className="border-dashed bg-amber-50 text-[10px] text-amber-900 dark:bg-amber-500/10 dark:text-amber-300"
              >
                SIMULATE — nothing goes to SAP
              </Badge>
            )}
            {testCodes.length > 0 && (
              <Badge variant="outline" className="text-[10px]">
                TEST SAP: {testCodes.join(', ')}
              </Badge>
            )}
            {planHasLiveWork(plan) && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
                Checking every 15 s
              </span>
            )}
            {isError && (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-3 w-3" />
                Could not refresh: {getErrorMessage(error, 'no answer')}. Showing the last plan
                read.
              </span>
            )}
          </div>
        </div>

        {canPostRight && (
          <div className="flex flex-wrap items-center gap-2">
            {running ? (
              <>
                <span className="inline-flex items-center gap-2 text-sm font-medium">
                  <Loader2 className="h-4 w-4 animate-spin" /> {progress}
                </span>
                <Button variant="outline" size="sm" onClick={() => (stopLoop.current = true)}>
                  <X className="mr-2 h-4 w-4" /> Stop after this one
                </Button>
              </>
            ) : (
              <>
                {plan.can_post && (
                  <Button
                    size="sm"
                    onClick={() => void send({ retry: false })}
                    disabled={!canWrite}
                  >
                    <Send className="mr-2 h-4 w-4" /> Post to SAP
                  </Button>
                )}
                {plan.enabled && planHasFailedWork(plan) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void send({ retry: true })}
                    disabled={!canWrite}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" /> Retry
                  </Button>
                )}
                {realBatches && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void doRecheck()}
                    disabled={!canWrite}
                  >
                    {recheck.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Re-check SAP
                  </Button>
                )}
                {hasBatches && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void stopSending()}
                    disabled={!canWrite}
                  >
                    <OctagonX className="mr-2 h-4 w-4" /> Stop sending
                  </Button>
                )}
                {hasBatches && nothingInSap(plan) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void doReset()}
                    disabled={!canWrite}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Reset
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* BUNCH_CHANGED: prominent, with its ways out. */}
      {(changedProblem || changedError) && (
        <div className="rounded-md border-2 border-red-500 bg-red-50 p-4 text-red-900 dark:bg-red-500/10 dark:text-red-300">
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-5 w-5" /> This bunch changed in the cash book after it was
            frozen. Nothing more is sent.
          </p>
          <p className="mt-1 text-sm">{changedProblem?.message ?? changedError}</p>
          <DriftDetail plan={plan} />
          {canPostRight && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => void doAccept()}
                disabled={!canWrite}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" /> Accept the change
              </Button>
              {nothingInSap(plan) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void doReset()}
                  disabled={!canWrite}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Reset the bunch
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      <ProblemList problems={otherProblems} />

      {notes.length > 0 && (
        <div className="flex items-start justify-between gap-2 rounded-md border bg-muted/40 p-3 text-sm">
          <ul className="list-disc space-y-1 pl-5">
            {notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
          <Button variant="ghost" size="sm" onClick={() => setNotes([])} aria-label="Dismiss notes">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {plan.groups.map((group) => (
        <GroupCard
          key={group.sap_company_code}
          plan={plan}
          group={group}
          serials={serials}
          canPost={canPostRight}
          canWrite={canWrite}
          canWriteInfo={canWriteInfo}
          onPost={() => void send({ company: group.sap_company_code, retry: false })}
          onClosePO={() => void doClosePO(group)}
          onEdit={setEditing}
          onRedate={(grpo) => setRedating({ grpo, poDocDate: group.po_doc_date })}
          onLeaveOut={(v) => void doLeaveOut(v)}
        />
      ))}

      {plan.unrouted.length > 0 && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <h2 className="font-semibold">Not routed ({plan.unrouted.length})</h2>
            <p className="text-sm text-muted-foreground">
              No SAP company for these yet. Give their branch a routing in Cash → SAP settings,
              choose a company for the voucher, or leave it out.
            </p>
            <VoucherTable
              vouchers={plan.unrouted}
              canPost={canPostRight}
              canWrite={canWrite}
              canWriteInfo={canWriteInfo}
              onEdit={setEditing}
            />
          </CardContent>
        </Card>
      )}

      {plan.skipped.length > 0 && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <h2 className="font-semibold">Not posted ({plan.skipped.length})</h2>
            <VoucherTable
              vouchers={plan.skipped}
              canPost={canPostRight}
              canWrite={canWrite}
              canWriteInfo={canWriteInfo}
              onEdit={setEditing}
              showSkipReason
            />
          </CardContent>
        </Card>
      )}

      <VoucherSapDialog
        open={editing != null}
        onOpenChange={(open) => !open && setEditing(null)}
        bunchId={bunchId}
        voucher={editing}
        options={options}
        mode={canPostRight ? 'full' : 'info'}
      />
      <GrpoRedateDialog
        open={redating != null}
        onOpenChange={(open) => !open && setRedating(null)}
        bunchId={bunchId}
        grpo={redating?.grpo ?? null}
        poDocDate={redating?.poDocDate ?? null}
      />
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/accounts/cash-sap"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
    >
      <ArrowLeft className="h-4 w-4" /> Cash → SAP
    </Link>
  );
}

function DriftDetail({ plan }: { plan: BunchSapPlan }) {
  const drift = plan.bunch.drift ?? {};
  const removed = drift.removed ?? [];
  const added = drift.added ?? [];
  const changed = Object.entries(drift.changed ?? {});
  if (!removed.length && !added.length && !changed.length) return null;
  return (
    <ul className="mt-2 space-y-0.5 text-xs">
      {removed.length > 0 && <li>Taken out (entry ids): {removed.join(', ')}</li>}
      {added.length > 0 && <li>Added (entry ids): {added.join(', ')}</li>}
      {changed.map(([id, fields]) => (
        <li key={id}>
          Entry {id}:{' '}
          {Object.entries(fields)
            .map(([field, [then, now]]) => `${field} ${String(then)} → ${String(now)}`)
            .join('; ')}
        </li>
      ))}
    </ul>
  );
}

interface GroupCardProps {
  plan: BunchSapPlan;
  group: GroupSapPlan;
  serials: Map<number, string>;
  canPost: boolean;
  canWrite: boolean;
  canWriteInfo: boolean;
  onPost: () => void;
  onClosePO: () => void;
  onEdit: (voucher: VoucherSapPlan) => void;
  onRedate: (grpo: GrpoSapPlan) => void;
  onLeaveOut: (voucher: VoucherSapPlan) => void;
}

function GroupCard({
  plan,
  group,
  serials,
  canPost,
  canWrite,
  canWriteInfo,
  onPost,
  onClosePO,
  onEdit,
  onRedate,
  onLeaveOut,
}: GroupCardProps) {
  const batch = group.batch;
  const frozenGrpos = group.grpos.filter((g) => g.id != null);
  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-lg font-semibold">
              {group.sap_company_code}
              {group.is_test_target && (
                <Badge variant="outline" className="text-[10px]">
                  TEST SAP
                </Badge>
              )}
              {group.mode === 'AP_DRAFT_ONLY' && (
                <Badge variant="outline" className="text-[10px]">
                  A/P drafts only
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Vendor {group.vendor_code || '—'} · SAP branch {group.bpl_id ?? '—'} · warehouse{' '}
              {group.warehouse_code || '—'} · GRPO grouping {group.grpo_grouping}
            </p>
            <p className="text-sm text-muted-foreground">
              PO dated {day(group.po_doc_date)}, due {day(group.po_due_date)} · goods{' '}
              {money(group.item_total)} · services {money(group.service_total)} ·{' '}
              <span className="font-medium text-foreground">total {money(group.total)}</span>
            </p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span>Imprest PO:</span>
              {group.po ? (
                <>
                  <SapDocStatusBadge
                    status={group.po.status}
                    stopped={group.po.stopped}
                    simulated={group.po.simulated}
                  />
                  {group.po.doc_num != null && (
                    <span className="font-mono">#{group.po.doc_num}</span>
                  )}
                  {group.po.draft_entry != null && group.po.doc_num == null && (
                    <span className="text-xs text-muted-foreground">
                      draft {group.po.draft_entry}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-xs text-muted-foreground">not raised yet</span>
              )}
              {group.po_close && group.po_close.status !== 'NOT_NEEDED' && (
                <>
                  <span className="ml-2">Close:</span>
                  <SapDocStatusBadge
                    status={group.po_close.status}
                    stopped={group.po_close.stopped}
                  />
                </>
              )}
            </div>
            {group.po?.error && <p className="text-xs text-destructive">{group.po.error}</p>}
            {batch?.po_close_error && (
              <p className="text-xs text-destructive">{batch.po_close_error}</p>
            )}
            {batch?.last_sent_by_name && (
              <p className="text-[11px] text-muted-foreground">
                Last sent by {batch.last_sent_by_name}
                {batch.last_sent_at ? ` · ${formatDateTimeShort(batch.last_sent_at)}` : ''}
              </p>
            )}
          </div>
          {canPost && (
            <div className="flex flex-wrap gap-2">
              {group.can_post && plan.groups.length > 1 && (
                <Button size="sm" variant="outline" onClick={onPost} disabled={!canWrite}>
                  <Send className="mr-2 h-4 w-4" /> Post {group.sap_company_code}
                </Button>
              )}
              {canClosePO(plan, group) && (
                <Button size="sm" variant="outline" onClick={onClosePO} disabled={!canWrite}>
                  <Lock className="mr-2 h-4 w-4" /> Close the PO in SAP
                </Button>
              )}
            </div>
          )}
        </div>

        <ProblemList problems={group.problems} compact />
        {group.notes.length > 0 && (
          <ul className="list-disc pl-5 text-xs text-muted-foreground">
            {group.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        )}

        {group.grpos.length > 0 && (
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">
              GRPOs ({group.grpos.length}){frozenGrpos.length === 0 && ' — preview'}
            </h3>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-2 py-1">Vendor ref</th>
                    <th className="px-2 py-1">Vouchers</th>
                    <th className="px-2 py-1">Bill date</th>
                    <th className="px-2 py-1">Posting date</th>
                    <th className="px-2 py-1">G.no.</th>
                    <th className="px-2 py-1 text-right">Amount</th>
                    <th className="px-2 py-1">Status</th>
                    <th className="px-2 py-1">SAP doc</th>
                    <th className="px-2 py-1" />
                  </tr>
                </thead>
                <tbody>
                  {group.grpos.map((g) => (
                    <tr key={g.id ?? g.group_key} className="border-b align-top">
                      <td className="px-2 py-1 font-mono">{g.num_at_card || '—'}</td>
                      <td className="px-2 py-1">
                        {g.voucher_ids.map((id) => serials.get(id) ?? id).join(', ') || '—'}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1">{day(g.bill_date)}</td>
                      <td className="whitespace-nowrap px-2 py-1">{day(g.posting_date)}</td>
                      <td className="px-2 py-1">{g.gate_entry_no || '—'}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{money(g.amount)}</td>
                      <td className="px-2 py-1">
                        <SapDocStatusBadge
                          status={g.status}
                          stopped={g.stopped}
                          simulated={g.simulated}
                        />
                        {g.error && (
                          <p className="mt-1 max-w-[260px] text-destructive">{g.error}</p>
                        )}
                      </td>
                      <td className="px-2 py-1 font-mono">{g.doc_num ?? '—'}</td>
                      <td className="px-2 py-1">
                        {canPost && canRedateGrpo(group, g) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2"
                            onClick={() => onRedate(g)}
                            disabled={!canWrite}
                          >
                            <CalendarClock className="mr-1 h-3.5 w-3.5" /> Date / G.no.
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {group.ap_drafts.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold">A/P drafts:</span>
            {group.ap_drafts.map((d) => (
              <span key={d.source_id} className="inline-flex items-center gap-1">
                <span className="text-xs">{d.label}</span>
                <SapDocStatusBadge status={d.status} stopped={d.stopped} simulated={d.simulated} />
                {d.draft_entry != null && (
                  <span className="text-xs text-muted-foreground">draft {d.draft_entry}</span>
                )}
                {d.doc_num != null && <span className="font-mono text-xs">#{d.doc_num}</span>}
                {d.error && <span className="text-xs text-destructive">{d.error}</span>}
              </span>
            ))}
          </div>
        )}

        <VoucherTable
          vouchers={group.vouchers}
          group={group}
          canPost={canPost}
          canWrite={canWrite}
          canWriteInfo={canWriteInfo}
          onEdit={onEdit}
          onLeaveOut={onLeaveOut}
        />
      </CardContent>
    </Card>
  );
}

interface VoucherTableProps {
  vouchers: VoucherSapPlan[];
  group?: GroupSapPlan;
  canPost: boolean;
  canWrite: boolean;
  canWriteInfo: boolean;
  onEdit: (voucher: VoucherSapPlan) => void;
  onLeaveOut?: (voucher: VoucherSapPlan) => void;
  showSkipReason?: boolean;
}

function VoucherTable({
  vouchers,
  group,
  canPost,
  canWrite,
  canWriteInfo,
  onEdit,
  onLeaveOut,
  showSkipReason,
}: VoucherTableProps) {
  if (vouchers.length === 0) return null;
  const draft = group ? serviceDraft(group) : undefined;
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b bg-muted/40 text-left">
            <th className="px-2 py-1">Sr</th>
            <th className="px-2 py-1">Voucher date</th>
            <th className="px-2 py-1">Bill date</th>
            <th className="px-2 py-1">G.no.</th>
            <th className="px-2 py-1">Head</th>
            <th className="px-2 py-1">SAP account</th>
            <th className="px-2 py-1">Item</th>
            <th className="px-2 py-1 text-right">Amount</th>
            <th className="px-2 py-1">Treatment</th>
            <th className="px-2 py-1">Dim1</th>
            <th className="px-2 py-1">Dim3</th>
            <th className="px-2 py-1">Bill</th>
            <th className="px-2 py-1">GRPO</th>
            <th className="px-2 py-1">Status</th>
            <th className="px-2 py-1">SAP doc</th>
            <th className="px-2 py-1">Warnings</th>
            <th className="px-2 py-1" />
          </tr>
        </thead>
        <tbody>
          {vouchers.map((v) => {
            const grpo = group && v.treatment === 'ITEM' ? grpoForVoucher(group, v) : undefined;
            const unit = v.treatment === 'SERVICE' ? draft : undefined;
            const mayEdit = canEditForSap(v) && (canPost || canWriteInfo);
            const mayLeaveOut = !!group && canPost && !!onLeaveOut && canLeaveOut(group, v);
            return (
              <tr key={v.entry_id} className="border-b align-top">
                <td className="px-2 py-1 font-mono">{v.serial_number ?? v.entry_id}</td>
                <td className="whitespace-nowrap px-2 py-1">{day(v.entry_date)}</td>
                <td className="whitespace-nowrap px-2 py-1">{day(v.bill_date)}</td>
                <td className="px-2 py-1">{v.gate_entry_no || '—'}</td>
                <td className="max-w-[180px] px-2 py-1">
                  <span className="font-mono">{v.gl_account_code}</span>{' '}
                  <span className="text-muted-foreground">{v.gl_account_name}</span>
                  {v.detail && <p className="truncate text-muted-foreground">{v.detail}</p>}
                </td>
                <td className="px-2 py-1 font-mono">{v.account_code || '—'}</td>
                <td className="max-w-[160px] px-2 py-1">
                  {v.item_code ? (
                    <>
                      <span className="font-mono">{v.item_code}</span>{' '}
                      <span className="text-muted-foreground">{v.item_name}</span>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-2 py-1 text-right tabular-nums">{money(v.amount)}</td>
                <td className="px-2 py-1">
                  {TREATMENT_LABELS[v.treatment] ?? v.treatment}
                  {v.overridden && (
                    <span className="ml-1 text-amber-700 dark:text-amber-400">(changed)</span>
                  )}
                  {v.frozen && <Lock className="ml-1 inline h-3 w-3 text-muted-foreground" />}
                  {showSkipReason && v.skip_reason && (
                    <p className="text-muted-foreground">{v.skip_reason}</p>
                  )}
                  {v.left_out_after_po && (
                    <p className="text-muted-foreground">Left out after the PO</p>
                  )}
                </td>
                <td className="px-2 py-1">{v.ocr_code || '—'}</td>
                <td className="px-2 py-1">{v.ocr_code3 || '—'}</td>
                <td className="px-2 py-1">
                  <VoucherBillUpload
                    entryId={v.entry_id}
                    hasBill={v.has_bill}
                    billCount={v.bill_count}
                    disabled={!canPost || !canWrite || !canChangeBills(group, v)}
                  />
                </td>
                <td className="px-2 py-1 font-mono">
                  {grpo?.num_at_card || (grpo ? grpo.group_key : '—')}
                </td>
                <td className="px-2 py-1">
                  {grpo ? (
                    <SapDocStatusBadge
                      status={grpo.status}
                      stopped={grpo.stopped}
                      simulated={grpo.simulated}
                    />
                  ) : unit ? (
                    <SapDocStatusBadge
                      status={unit.status}
                      stopped={unit.stopped}
                      simulated={unit.simulated}
                    />
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-2 py-1 font-mono">
                  {grpo?.doc_num ?? unit?.doc_num ?? unit?.draft_entry ?? '—'}
                </td>
                <td className="min-w-[200px] max-w-[280px] px-2 py-1">
                  <VoucherIssues voucher={v} />
                </td>
                <td className="whitespace-nowrap px-2 py-1">
                  {mayEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2"
                      onClick={() => onEdit(v)}
                      disabled={!canWrite && canPost}
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Edit for SAP
                    </Button>
                  )}
                  {mayLeaveOut && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2"
                      onClick={() => onLeaveOut?.(v)}
                      disabled={!canWrite}
                    >
                      <Undo2 className="mr-1 h-3.5 w-3.5" /> Leave out
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
