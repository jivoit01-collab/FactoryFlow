import { ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  useDecidePartialApproval,
  useRemoveDispatchDocument,
  useRequestPartialApproval,
} from '@/modules/gate/api/partialDispatch/partialDispatch.queries';
import { confirmDialog } from '@/shared/components';
import { Badge, Button, Input, Label } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

export interface PartialDispatchItem {
  id: number;
  item_code?: string;
  item_name?: string;
  quantity: string | number;
  dispatched_quantity?: string | number | null;
}

export interface PartialDispatchDocument {
  id: number;
  label: string;
  items: PartialDispatchItem[];
  approval?: {
    id: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    credit_note_no: string;
  } | null;
}

interface PartialDispatchActionsProps {
  salesDispatchId: number;
  documents: PartialDispatchDocument[];
  /** Whether the current user holds gate_core.can_approve_partial_sales_dispatch. */
  canApprove?: boolean;
}

/**
 * Per-bill partial-dispatch controls for a docking: drop a whole bill (it
 * reschedules), or request approval to ship a bill short. Once approved, a credit
 * note is required before the gatepass can print (enforced server-side).
 */
export function PartialDispatchActions({
  salesDispatchId,
  documents,
  canApprove = false,
}: PartialDispatchActionsProps) {
  const removeDoc = useRemoveDispatchDocument();
  const requestApproval = useRequestPartialApproval();
  const decide = useDecidePartialApproval();

  const [shipped, setShipped] = useState<Record<number, string>>({});
  const [reason, setReason] = useState<Record<number, string>>({});
  const [creditNo, setCreditNo] = useState<Record<number, string>>({});

  const handleRemove = async (documentId: number) => {
    const confirmed = await confirmDialog({
      title: 'Remove this bill from the load?',
      description: 'It returns to Expected Dispatch.',
      confirmLabel: 'Remove bill',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await removeDoc.mutateAsync({ salesDispatchId, documentId });
      toast.success('Bill removed; it will reschedule onto a future trip.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleRequest = async (doc: PartialDispatchDocument) => {
    const items = doc.items
      .filter((it) => (shipped[it.id] ?? '') !== '')
      .map((it) => ({ item_id: it.id, dispatched_quantity: shipped[it.id] }));
    if (items.length === 0) {
      toast.error('Enter the shipped quantity for at least one held item.');
      return;
    }
    try {
      await requestApproval.mutateAsync({
        salesDispatchId,
        payload: { document_id: doc.id, reason: reason[doc.id] ?? '', items },
      });
      toast.success('Partial-dispatch approval requested.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleDecide = async (
    approvalId: number,
    documentId: number,
    decision: 'APPROVED' | 'REJECTED',
  ) => {
    try {
      await decide.mutateAsync({
        approvalId,
        payload: { decision, credit_note_no: creditNo[documentId] },
      });
      toast.success(`Partial dispatch ${decision.toLowerCase()}.`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <div key={doc.id} className="rounded-md border p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="font-medium">{doc.label}</span>
            <div className="flex items-center gap-2">
              {doc.approval ? <Badge>{doc.approval.status}</Badge> : null}
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRemove(doc.id)}
                disabled={removeDoc.isPending}
              >
                <Trash2 className="mr-1 h-3 w-3" /> Remove bill
              </Button>
            </div>
          </div>

          {!doc.approval ? (
            <div className="space-y-2">
              <div className="space-y-1">
                {doc.items.map((it) => (
                  <div key={it.id} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 truncate">{it.item_name || it.item_code}</span>
                    <span className="text-muted-foreground">of {String(it.quantity)}</span>
                    <Input
                      className="w-24"
                      type="number"
                      step="0.001"
                      placeholder="shipped"
                      value={shipped[it.id] ?? ''}
                      onChange={(e) =>
                        setShipped((prev) => ({ ...prev, [it.id]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
              <Input
                placeholder="Reason for holding items"
                value={reason[doc.id] ?? ''}
                onChange={(e) => setReason((prev) => ({ ...prev, [doc.id]: e.target.value }))}
              />
              <Button
                size="sm"
                onClick={() => handleRequest(doc)}
                disabled={requestApproval.isPending}
              >
                Request partial approval
              </Button>
            </div>
          ) : doc.approval.status === 'PENDING' && canApprove ? (
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label>Credit note no.</Label>
                <Input
                  className="w-48"
                  value={creditNo[doc.id] ?? doc.approval.credit_note_no}
                  onChange={(e) => setCreditNo((prev) => ({ ...prev, [doc.id]: e.target.value }))}
                />
              </div>
              <Button
                size="sm"
                onClick={() => handleDecide(doc.approval!.id, doc.id, 'APPROVED')}
                disabled={decide.isPending}
              >
                <ShieldCheck className="mr-1 h-3 w-3" /> Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDecide(doc.approval!.id, doc.id, 'REJECTED')}
                disabled={decide.isPending}
              >
                Reject
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {doc.approval.status === 'APPROVED'
                ? `Approved${
                    doc.approval.credit_note_no
                      ? ` · credit note ${doc.approval.credit_note_no}`
                      : ' · credit note required before gatepass'
                  }`
                : `Partial dispatch ${doc.approval.status.toLowerCase()}`}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export default PartialDispatchActions;
