import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  FlaskConical,
  Link2,
  Lock,
  Paperclip,
  Trash2,
} from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { usePermission } from '@/core/auth';
import { DEFAULT_BRANCH_ID } from '@/modules/warehouse/grpo/constants/grpo.constants';
import { confirmDialog, confirmSapPost } from '@/shared/components';
import { Button, Card, Input, Label, Textarea } from '@/shared/components/ui';
import { formatDateTimeShort, formatDateToISOString, getErrorMessage } from '@/shared/utils';
import { toastSuccessMark } from '@/shared/utils/toasts';

import {
  useDiscardFADraft,
  useFAEntry,
  useFAGRPOPreview,
  usePostFAGRPO,
} from '../api/faGrpo.queries';
import { FAGRPOPrintButton } from '../components/FAGRPOPrintButton';
import { FAPOLinkDialog } from '../components/FAPOLinkDialog';
import { FAPostingStatusBadge } from '../components/FAPostingStatusBadge';
import { FASapModeBadges } from '../components/FASapModeBadges';
import { FA_GRPO_LINK_ACCESS, FA_GRPO_POST_ACCESS } from '../constants/permissions';
import { faGrpoPaths } from '../constants/routes';
import type { FAPostResponse, PostGRPOItemRequest } from '../types';
import {
  draftLineValues,
  postBlockReason,
  postingWarehouses,
  reusableDraftId,
  sapQueuedConflict,
  toNumber,
} from '../utils/faGrpo.utils';

interface ItemForm {
  accepted_qty: string;
  unit_price: string;
  tax_code: string;
  gl_account: string;
  batch_number: string;
}

type Outcome =
  | { kind: 'posted'; response: FAPostResponse }
  | { kind: 'simulated'; response: FAPostResponse }
  | { kind: 'queued'; message: string; postingId: number | null };

/**
 * Review and post one fixed-asset GRPO. Modelled on the Finished Goods
 * preview: same line table, same inline file input, the same post-and-report.
 *
 * What is different, and why:
 *
 * - **Warehouse per line.** Each line shows the warehouse its PO line sits in.
 *   The engine sends one header warehouse, so lines in two warehouses are
 *   refused by the backend (`FA_GRPO_MIXED_WAREHOUSES`); the screen warns first
 *   and shows the backend's own message if it comes to that.
 * - **Posting date** defaults to today in the browser's own time zone and may
 *   not be later (the backend refuses a future date too).
 * - **Files are optional.** With none chosen the backend sends the gate's
 *   invoice photo, which is what accounts usually want.
 * - **Saved draft.** A refused or waiting attempt leaves a draft; the page
 *   loads its values, re-sends it as `grpo_posting_id` (so a retry never saves
 *   a second one), and offers to discard it.
 * - **SIMULATE / TEST SAP.** The server's switches are shown, and Post is
 *   disabled -- with the reason on screen -- whenever the backend would refuse
 *   to send: switched off, or a live database with live posting not allowed.
 * - **Answers.** 201 posted (or simulated), 202 waiting for SAP, 409 already on
 *   its way; anything else is shown inline with the backend's reason.
 */
export default function FAGRPOPreviewPage() {
  const { vehicleEntryId } = useParams<{ vehicleEntryId: string }>();
  const entryId = vehicleEntryId ? parseInt(vehicleEntryId, 10) : null;
  const [searchParams] = useSearchParams();
  const linkedDraftId = Number(searchParams.get('draft')) || null;
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermission();
  const canPost = hasAnyPermission(FA_GRPO_POST_ACCESS);
  const canLink = hasAnyPermission(FA_GRPO_LINK_ACCESS);

  const {
    data: entry,
    isLoading: entryLoading,
    error: entryError,
    refetch: refetchEntry,
  } = useFAEntry(entryId);
  const hasPO = (entry?.po_receipts.length ?? 0) > 0;
  const {
    data: preview = [],
    isLoading: previewLoading,
    error: previewError,
  } = useFAGRPOPreview(entryId, hasPO);
  const postGRPO = usePostFAGRPO();
  const discardDraft = useDiscardFADraft();

  const today = formatDateToISOString(new Date());
  const [itemForms, setItemForms] = useState<Record<number, ItemForm>>({});
  const [docDate, setDocDate] = useState(() => formatDateToISOString(new Date()));
  const [vendorRef, setVendorRef] = useState('');
  const [comments, setComments] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);

  const draft = entry?.open_draft ?? null;
  const sap = entry?.sap;
  const postablePOs = useMemo(() => preview.filter((po) => po.grpo_status !== 'POSTED'), [preview]);
  const simulatedPosts = entry?.posted_grpos.filter((p) => p.simulated) ?? [];
  const realPosts = entry?.posted_grpos.filter((p) => !p.simulated) ?? [];
  const linkedPO = entry?.po_receipts[0] ?? null;

  // Seed the form from the saved draft when there is one, else from the PO.
  // Re-seeds when the POs or the draft change (a refused post leaves a FAILED
  // draft holding exactly what was sent, so nothing typed is lost).
  const seedKey = `${postablePOs.map((po) => po.po_receipt_id).join(',')}|${draft?.id ?? ''}`;
  useEffect(() => {
    if (postablePOs.length === 0) return;
    const saved = draftLineValues(draft?.request_payload);
    const seed: Record<number, ItemForm> = {};
    for (const po of postablePOs) {
      for (const it of po.items) {
        const s = saved[it.po_item_receipt_id] ?? {};
        seed[it.po_item_receipt_id] = {
          accepted_qty: String(s.accepted_qty ?? toNumber(it.received_qty)),
          unit_price: String(s.unit_price ?? toNumber(it.unit_price)),
          tax_code: s.tax_code ?? it.tax_code ?? '',
          gl_account: s.gl_account ?? it.gl_account ?? '',
          batch_number:
            s.batch_number ?? (it.is_batch_managed ? (it.suggested_batch_number ?? '') : ''),
        };
      }
    }
    setItemForms(seed);
    const payload = draft?.request_payload;
    setVendorRef(payload?.vendor_ref || entry?.invoice_number || postablePOs[0]?.invoice_no || '');
    setComments(payload?.comments ?? '');
    const savedDate = payload?.doc_date;
    setDocDate(savedDate && savedDate <= today ? savedDate : today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey]);

  const updateItem = (id: number, field: keyof ItemForm, value: string) => {
    setItemForms((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const lines = postablePOs.flatMap((po) => po.items);
  const warehouses = postingWarehouses(
    lines.map((it) => ({
      warehouse_code: it.warehouse_code,
      qty: itemForms[it.po_item_receipt_id]?.accepted_qty,
    })),
  );
  const blockReason = postBlockReason({
    canPost,
    sap,
    closed: !!entry?.closure,
    beforeCutover: !!entry?.is_before_cutover,
    cutover: sap?.cutover,
    draftOnItsWay: !!draft?.on_its_way,
    hasPO,
    previewLoading: hasPO && previewLoading,
    previewFailed: hasPO && !!previewError,
    simulatedExists: simulatedPosts.length > 0,
    postableCount: postablePOs.length,
  });
  const branchId = postablePOs[0]?.branch_id ?? linkedPO?.branch_id ?? DEFAULT_BRANCH_ID;
  const gateHasPhoto = (entry?.gate_attachments.length ?? 0) > 0;
  const draftFiles = draft?.attachments ?? [];
  const changePOLock = entry?.link_lock_reason || linkedPO?.lock_reason || null;

  const handleDiscardDraft = async () => {
    if (!draft) return;
    const ok = await confirmDialog({
      title: 'Discard the saved GRPO?',
      description:
        'Its values and files are deleted. Nothing was posted to SAP for it. The form goes back to the PO’s own values.',
      confirmLabel: 'Discard',
      destructive: true,
    });
    if (!ok) return;
    try {
      await discardDraft.mutateAsync(draft.id);
      toast.success('Saved GRPO discarded.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not discard the saved GRPO.'));
    }
  };

  const handlePost = async () => {
    setError(null);
    if (!entryId || !entry || blockReason) return;

    if (!docDate) {
      setError('Enter the posting date.');
      return;
    }
    if (docDate > today) {
      setError('The posting date cannot be in the future.');
      return;
    }

    // Every line is sent, zero ones included: the engine posts a line the
    // request leaves out at its stored quantity, so "not this one" is a 0.
    const items: PostGRPOItemRequest[] = [];
    const problems: string[] = [];
    for (const it of lines) {
      const form = itemForms[it.po_item_receipt_id];
      if (!form) continue;
      const accepted = Number(form.accepted_qty);
      if (!Number.isFinite(accepted) || accepted < 0) {
        problems.push(`${it.item_code}: enter an accepted quantity of zero or more.`);
        continue;
      }
      if (accepted > toNumber(it.received_qty) + 1e-9) {
        problems.push(
          `${it.item_code}: accepted ${accepted} is more than the ${toNumber(it.received_qty)} received.`,
        );
        continue;
      }
      const batch = form.batch_number.trim();
      if (accepted > 0 && it.is_batch_managed && !batch) {
        problems.push(`${it.item_code}: SAP manages this item by batch — enter the batch number.`);
        continue;
      }
      items.push({
        po_item_receipt_id: it.po_item_receipt_id,
        accepted_qty: accepted,
        unit_price: form.unit_price !== '' ? toNumber(form.unit_price) : undefined,
        tax_code: form.tax_code || undefined,
        gl_account: form.gl_account || undefined,
        batches: accepted > 0 && batch ? [{ batch_number: batch, quantity: accepted }] : undefined,
      });
    }
    if (problems.length > 0) {
      setError(problems.join(' '));
      return;
    }
    if (!items.some((item) => item.accepted_qty > 0)) {
      setError('Enter an accepted quantity for at least one line.');
      return;
    }

    const simulate = !!sap?.simulate;
    const files =
      attachments.length > 0
        ? attachments.map((f) => f.name).join(', ')
        : draftFiles.length > 0
          ? `the saved GRPO's ${draftFiles.length} file(s)`
          : "the gate's invoice photo";
    const confirmed = await confirmSapPost({
      title: simulate ? 'Simulate this fixed-asset GRPO?' : 'Post this fixed-asset GRPO to SAP?',
      description: simulate
        ? 'Every check runs and SAP is read, but nothing is written to SAP. The result is kept in history as a simulated post.'
        : undefined,
      confirmLabel: simulate ? 'Simulate' : 'Confirm Post',
      details: [
        { label: 'Creates', value: 'Goods Receipt PO (fixed asset)' },
        {
          label: postablePOs.length > 1 ? 'POs' : 'PO',
          value: postablePOs.map((po) => po.po_number).join(', '),
        },
        {
          label: 'Supplier',
          value: `${postablePOs[0]?.supplier_name ?? ''} (${postablePOs[0]?.supplier_code ?? ''})`,
        },
        { label: 'Warehouse', value: warehouses.join(', ') || 'from the PO' },
        { label: 'Posting date', value: docDate },
        { label: 'Lines received', value: items.filter((i) => i.accepted_qty > 0).length },
        { label: 'Files', value: files },
        sap?.is_test_db === true && { label: 'SAP', value: 'TEST database' },
      ],
    });
    if (!confirmed) return;

    try {
      const response = await postGRPO.mutateAsync({
        vehicle_entry_id: entryId,
        po_receipt_ids: postablePOs.map((po) => po.po_receipt_id),
        items,
        branch_id: branchId,
        warehouse_code: warehouses.length === 1 ? warehouses[0] : undefined,
        doc_date: docDate,
        vendor_ref: vendorRef.trim() || undefined,
        comments: comments.trim() || undefined,
        attachments,
        grpo_posting_id: reusableDraftId(draft),
      });
      setAttachments([]);
      setFileInputKey((k) => k + 1);
      if (response.queued) {
        setOutcome({
          kind: 'queued',
          message: response.message || response.detail || 'Saved. Waiting for SAP.',
          postingId: response.grpo_posting_id ?? null,
        });
        toast.info(response.message || 'Waiting for SAP.');
      } else if (response.simulated) {
        setOutcome({ kind: 'simulated', response });
        toast.info('Simulated: nothing was sent to SAP.');
      } else {
        setOutcome({ kind: 'posted', response });
        toastSuccessMark('GRPO posted', { description: `SAP Doc ${response.sap_doc_num}` });
      }
    } catch (err) {
      const conflict = sapQueuedConflict(err);
      if (conflict) {
        setOutcome({
          kind: 'queued',
          message: conflict.message,
          postingId: conflict.grpoPostingId,
        });
        return;
      }
      setError(getErrorMessage(err, 'Failed to post the GRPO to SAP.'));
      // A refusal from SAP (it names the draft) means the draft was saved with
      // its files: keep them out of the box, or the retry would add them twice.
      const savedId = (err as { response?: { data?: Record<string, unknown> } })?.response?.data
        ?.grpo_posting_id;
      if (typeof savedId === 'number') {
        setAttachments([]);
        setFileInputKey((k) => k + 1);
      }
      void refetchEntry();
    }
  };

  // ─── outcomes ─────────────────────────────────────────────────

  const backToList = () => navigate(faGrpoPaths.list());

  if (outcome?.kind === 'queued') {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <Card className="p-6 text-center">
          <Clock className="mx-auto mb-2 h-8 w-8 text-violet-600" />
          <h2 className="mb-2 text-xl font-bold text-violet-600">Waiting for SAP</h2>
          <p className="text-sm text-muted-foreground">{outcome.message}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Nothing is in SAP yet, so there is no SAP number. It posts by itself once SAP answers;
            it is on the SAP Postings page meanwhile.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button onClick={backToList}>Back to Fixed Asset GRPO</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (outcome?.kind === 'simulated') {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <Card className="p-6 text-center">
          <FlaskConical className="mx-auto mb-2 h-8 w-8 text-amber-600" />
          <h2 className="mb-2 text-xl font-bold text-amber-600">Simulated — nothing went to SAP</h2>
          <p className="text-sm text-muted-foreground">{outcome.response.message}</p>
          <div className="mt-6 flex justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(faGrpoPaths.historyDetail(outcome.response.grpo_posting_id))}
            >
              Open in history
            </Button>
            <Button onClick={backToList}>Back to Fixed Asset GRPO</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (outcome?.kind === 'posted') {
    const r = outcome.response;
    return (
      <div className="mx-auto max-w-2xl p-4">
        <Card className="p-6 text-center">
          <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-600" />
          <h2 className="mb-2 text-xl font-bold text-green-600">GRPO Posted to SAP</h2>
          <p className="text-sm text-muted-foreground">SAP Doc Number</p>
          <p className="mb-4 text-2xl font-bold">{r.sap_doc_num}</p>
          <p className="text-sm text-muted-foreground">Total: {r.sap_doc_total}</p>
          <div className="mt-6 flex justify-center gap-2">
            <FAGRPOPrintButton
              posting={{
                id: r.grpo_posting_id,
                sap_doc_entry: r.sap_doc_entry,
                sap_doc_num: r.sap_doc_num,
              }}
              size="default"
            />
            <Button
              variant="outline"
              onClick={() => navigate(faGrpoPaths.historyDetail(r.grpo_posting_id))}
            >
              Open in history
            </Button>
            <Button onClick={backToList}>Back to Fixed Asset GRPO</Button>
          </div>
        </Card>
      </div>
    );
  }

  // ─── loading / errors ─────────────────────────────────────────

  if (entryLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  }
  if (entryError || !entry) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <Card className="p-6 text-center">
          <p className="text-red-600">
            {getErrorMessage(entryError, 'This is not a fixed-asset gate entry of this company.')}
          </p>
          <Button className="mt-4" variant="outline" onClick={backToList}>
            Back to Fixed Asset GRPO
          </Button>
        </Card>
      </div>
    );
  }

  // ─── the page ────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={backToList}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-2xl font-bold tracking-tight">
              Fixed Asset GRPO — {entry.entry_no}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Review what arrived and post the goods receipt to SAP.
          </p>
        </div>
        <FASapModeBadges sap={sap} />
      </div>

      {/* The entry as the gate recorded it */}
      <Card className="space-y-4 p-4">
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <span className="text-muted-foreground">Supplier (gate)</span>
            <p className="font-medium">{entry.supplier_name || '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Bill no.</span>
            <p className="font-medium">{entry.invoice_number || '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Work order</span>
            <p className="font-medium">{entry.work_order_number || '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Arrived</span>
            <p className="font-medium">{formatDateTimeShort(entry.entry_time)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Gate status</span>
            <p className="font-medium">{entry.status}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Gate photos</span>
            <p className="font-medium">
              {entry.gate_attachments.length === 0
                ? 'None'
                : entry.gate_attachments.map((att, i) => (
                    <span key={att.id}>
                      {i > 0 && ', '}
                      {att.url ? (
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
                        >
                          {att.name || `photo ${i + 1}`}
                        </a>
                      ) : (
                        att.name
                      )}
                    </span>
                  ))}
            </p>
          </div>
        </div>
        {(entry.fa_remarks || entry.remarks) && (
          <p className="text-sm text-muted-foreground">{entry.fa_remarks || entry.remarks}</p>
        )}
        {entry.items.length > 0 && (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2 text-left font-medium">#</th>
                  <th className="p-2 text-left font-medium">Asset (gate)</th>
                  <th className="p-2 text-left font-medium">Category</th>
                  <th className="p-2 text-left font-medium">Serial no.</th>
                  <th className="p-2 text-right font-medium">Qty</th>
                </tr>
              </thead>
              <tbody>
                {entry.items.map((item) => (
                  <tr key={item.line_no} className="border-t">
                    <td className="p-2">{item.line_no}</td>
                    <td className="p-2">{item.asset_name}</td>
                    <td className="p-2">{item.asset_category || '—'}</td>
                    <td className="p-2">{item.serial_number || '—'}</td>
                    <td className="p-2 text-right">
                      {toNumber(item.quantity)} {item.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Why this entry cannot post, when the backend has said so already */}
      {entry.closure && (
        <Banner tone="amber" icon={<Lock className="h-4 w-4" />}>
          Done in SAP by hand
          {entry.closure.sap_doc_num ? ` as ${entry.closure.sap_doc_num}` : ''}
          {entry.closure.note ? ` — ${entry.closure.note}` : ''}. Reopen it from the “Done in SAP by
          hand” tab to post it here.
        </Banner>
      )}
      {entry.is_before_cutover && (
        <Banner tone="amber" icon={<Lock className="h-4 w-4" />}>
          This entry came in before the Fixed Asset GRPO cut-over
          {sap?.cutover ? ` (${sap.cutover})` : ''}; it is posted in SAP by hand.
        </Banner>
      )}
      {realPosts.length > 0 && (
        <Banner tone="green" icon={<CheckCircle2 className="h-4 w-4" />}>
          Posted to SAP as GRPO{' '}
          {realPosts.map((p, i) => (
            <span key={p.id}>
              {i > 0 && ', '}
              <Link className="underline" to={faGrpoPaths.historyDetail(p.id)}>
                {p.sap_doc_num ?? `#${p.id}`}
              </Link>
            </span>
          ))}
          .
        </Banner>
      )}
      {simulatedPosts.length > 0 && (
        <Banner tone="amber" icon={<FlaskConical className="h-4 w-4" />}>
          A simulated GRPO exists (
          {simulatedPosts.map((p, i) => (
            <span key={p.id}>
              {i > 0 && ', '}
              <Link className="underline" to={faGrpoPaths.historyDetail(p.id)}>
                #{p.id}
              </Link>
            </span>
          ))}
          ). Nothing was sent to SAP for it; discard it in history before posting for real.
        </Banner>
      )}

      {/* The linked PO */}
      {!hasPO ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="text-sm">
            <p className="font-medium">No SAP PO is linked to this entry yet.</p>
            <p className="text-muted-foreground">
              {entry.link_lock_reason ?? 'Link the PO the asset was bought against to post it.'}
            </p>
          </div>
          {canLink && !entry.link_lock_reason && (
            <Button onClick={() => setLinkOpen(true)}>
              <Link2 className="mr-1 h-4 w-4" /> Link PO
            </Button>
          )}
        </Card>
      ) : (
        linkedPO && (
          <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="text-sm">
              <p className="font-medium">
                PO {linkedPO.po_number} — {linkedPO.supplier_name} ({linkedPO.supplier_code})
              </p>
              <p className="text-muted-foreground">
                {linkedPO.items.length} line{linkedPO.items.length === 1 ? '' : 's'} linked
                {linkedPO.invoice_no ? ` · bill ${linkedPO.invoice_no}` : ''}
              </p>
              {changePOLock && (
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{changePOLock}</p>
              )}
            </div>
            {canLink && realPosts.length === 0 && (
              <Button
                variant="outline"
                disabled={!!changePOLock}
                title={changePOLock ?? undefined}
                onClick={() => setLinkOpen(true)}
              >
                <Link2 className="mr-1 h-4 w-4" /> Change PO
              </Button>
            )}
          </Card>
        )
      )}

      {/* The saved draft */}
      {draft && (
        <Card className="space-y-2 p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">Saved GRPO #{draft.id}</span>
              <FAPostingStatusBadge status={draft.status} />
            </div>
            {canPost && !draft.on_its_way && (
              <Button
                size="sm"
                variant="outline"
                className="text-red-600"
                disabled={discardDraft.isPending}
                onClick={() => void handleDiscardDraft()}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Discard saved draft
              </Button>
            )}
          </div>
          <p className="text-muted-foreground">
            {draft.on_its_way
              ? 'It is on its way to SAP and posts by itself once SAP answers.'
              : 'The form below holds its values; posting re-sends this same GRPO.'}
          </p>
          {linkedDraftId && linkedDraftId !== draft.id && (
            <p className="text-xs text-muted-foreground">
              The link you followed named GRPO #{linkedDraftId}; this is the entry’s latest open
              one.
            </p>
          )}
          {draft.error_message && <p className="text-red-600">{draft.error_message}</p>}
          {draftFiles.length > 0 && (
            <p className="flex flex-wrap items-center gap-1 text-muted-foreground">
              <Paperclip className="h-3.5 w-3.5" />
              {draftFiles.map((f) => f.name).join(', ')}
            </p>
          )}
        </Card>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      {/* The lines */}
      {hasPO && previewLoading && (
        <div className="p-4 text-center text-muted-foreground">Loading the PO lines…</div>
      )}
      {hasPO && !!previewError && (
        <div className="p-4 text-center text-red-600">
          {getErrorMessage(previewError, 'Failed to load the preview.')}
        </div>
      )}

      {postablePOs.map((po) => (
        <Card key={po.po_receipt_id} className="p-4">
          <div className="mb-2">
            <h4 className="font-semibold">PO {po.po_number}</h4>
            <p className="text-sm text-muted-foreground">
              {po.supplier_name} ({po.supplier_code}){po.po_date ? ` · PO date ${po.po_date}` : ''}
            </p>
            {!po.is_ready_for_grpo && (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                A line of this PO is held by QC (arrival slip or inspection not accepted); the
                backend will refuse the post.
              </p>
            )}
          </div>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2 text-left font-medium">Item</th>
                  <th className="p-2 text-right font-medium">Received</th>
                  <th className="p-2 text-right font-medium">Accept</th>
                  <th className="p-2 text-right font-medium">Unit price</th>
                  <th className="p-2 text-left font-medium">Tax code</th>
                  <th className="p-2 text-left font-medium">G/L account</th>
                  <th className="p-2 text-left font-medium">Warehouse</th>
                  <th className="p-2 text-left font-medium">UOM</th>
                  <th className="p-2 text-left font-medium">Batch</th>
                </tr>
              </thead>
              <tbody>
                {po.items.map((it) => {
                  const form = itemForms[it.po_item_receipt_id];
                  const over =
                    !!form && Number(form.accepted_qty) > toNumber(it.received_qty) + 1e-9;
                  return (
                    <tr key={it.po_item_receipt_id} className="border-t">
                      <td className="p-2">
                        <div className="font-medium">{it.item_code}</div>
                        <div className="text-xs text-muted-foreground">{it.item_name}</div>
                      </td>
                      <td className="p-2 text-right">{toNumber(it.received_qty)}</td>
                      <td className="p-2 text-right">
                        <Input
                          type="number"
                          step="0.001"
                          min="0"
                          max={toNumber(it.received_qty)}
                          className={`ml-auto w-24 text-right ${over ? 'border-red-500' : ''}`}
                          aria-label={`Accepted quantity, ${it.item_code}`}
                          value={form?.accepted_qty ?? ''}
                          onChange={(e) =>
                            updateItem(it.po_item_receipt_id, 'accepted_qty', e.target.value)
                          }
                        />
                      </td>
                      <td className="p-2 text-right">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="ml-auto w-28 text-right"
                          value={form?.unit_price ?? ''}
                          onChange={(e) =>
                            updateItem(it.po_item_receipt_id, 'unit_price', e.target.value)
                          }
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          className="w-24"
                          value={form?.tax_code ?? ''}
                          onChange={(e) =>
                            updateItem(it.po_item_receipt_id, 'tax_code', e.target.value)
                          }
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          className="w-28"
                          value={form?.gl_account ?? ''}
                          onChange={(e) =>
                            updateItem(it.po_item_receipt_id, 'gl_account', e.target.value)
                          }
                        />
                      </td>
                      <td className="p-2 whitespace-nowrap">{it.warehouse_code || '—'}</td>
                      <td className="p-2 whitespace-nowrap">{it.uom}</td>
                      <td className="p-2">
                        {it.is_batch_managed ? (
                          <Input
                            className="w-36"
                            maxLength={36}
                            placeholder="Batch / lot no."
                            value={form?.batch_number ?? ''}
                            onChange={(e) =>
                              updateItem(it.po_item_receipt_id, 'batch_number', e.target.value)
                            }
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">&mdash;</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ))}

      {warehouses.length > 1 && (
        <Banner tone="amber" icon={<AlertTriangle className="h-4 w-4" />}>
          The lines to post sit in different warehouses ({warehouses.join(', ')}). A GRPO goes to
          one warehouse, so post one warehouse at a time. Use Change PO and link only one
          warehouse&rsquo;s lines. Setting the other warehouse&rsquo;s lines to 0 also lets this
          post go through, but this PO posts once from this entry, so the zeroed lines can then
          never be posted from this entry.
        </Banner>
      )}

      {postablePOs.length > 0 && (
        <Card className="p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="fa-doc-date" className="mb-1 block">
                Posting date
              </Label>
              <Input
                id="fa-doc-date"
                type="date"
                max={today}
                value={docDate}
                onChange={(e) => setDocDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="fa-vendor-ref" className="mb-1 block">
                Vendor reference (bill no.)
              </Label>
              <Input
                id="fa-vendor-ref"
                value={vendorRef}
                onChange={(e) => setVendorRef(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="fa-comments" className="mb-1 block">
                Comments
              </Label>
              <Textarea
                id="fa-comments"
                rows={2}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="fa-attachments" className="mb-1 block">
                Attachments (vendor invoice)
              </Label>
              <input
                key={fileInputKey}
                id="fa-attachments"
                type="file"
                multiple
                className="block w-full text-sm"
                onChange={(e) => setAttachments(Array.from(e.target.files ?? []))}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Leave empty to send the gate&rsquo;s invoice photo.
                {draftFiles.length > 0 &&
                  ' The saved GRPO already has its files; anything chosen here is added to them.'}
              </p>
              {!gateHasPhoto && draftFiles.length === 0 && attachments.length === 0 && (
                <p className="mt-1 text-xs text-red-600">
                  The gate entry has no photo, so attach the invoice here.
                </p>
              )}
              {attachments.length > 1 && (
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                  SAP keeps each file as its own attachment and links only the last one to the GRPO.
                  One file is better.
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" onClick={backToList}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <div className="flex flex-col items-end gap-1">
          <Button
            onClick={() => void handlePost()}
            disabled={!!blockReason || postGRPO.isPending || previewLoading}
          >
            {postGRPO.isPending
              ? sap?.simulate
                ? 'Simulating…'
                : 'Posting to SAP…'
              : sap?.simulate
                ? 'Simulate GRPO'
                : 'Post GRPO to SAP'}
          </Button>
          {blockReason && (
            <p className="max-w-md text-right text-xs text-muted-foreground">{blockReason}</p>
          )}
        </div>
      </div>

      {entryId && linkOpen && (
        <FAPOLinkDialog vehicleEntryId={entryId} open={linkOpen} onOpenChange={setLinkOpen} />
      )}
    </div>
  );
}

function Banner({
  tone,
  icon,
  children,
}: {
  tone: 'amber' | 'green';
  icon: ReactNode;
  children: ReactNode;
}) {
  const classes =
    tone === 'green'
      ? 'border-green-300 bg-green-50 text-green-800 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300'
      : 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300';
  return (
    <div className={`flex items-start gap-2 rounded-md border p-3 text-sm ${classes}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>{children}</div>
    </div>
  );
}
