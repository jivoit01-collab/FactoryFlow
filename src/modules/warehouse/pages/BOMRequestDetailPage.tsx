import {
  ArrowLeft,
  Check,
  Loader2,
  Package,
  RotateCcw,
  Send,
  Warehouse,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Textarea,
} from '@/shared/components/ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';

import {
  useApproveBOMRequest,
  useBOMRequestDetail,
  useIssueMaterials,
  useRejectBOMRequest,
  useReRequestBOMShortfall,
} from '../api';
import { BOMSourcePickerDialog } from '../components/BOMSourcePickerDialog';
import type { BOMLineApproval, BOMRequestLine } from '../types';
import { toStorableQty } from '../utils/qty';

// ============================================================================
// Line Row Component
// ============================================================================

/** The godowns an approved quantity was drawn from, as one readable line. */
function SourceSummary({ sources }: { sources: { warehouse: string; qty: number }[] }) {
  if (sources.length === 0) {
    return <span className="text-xs text-muted-foreground">not chosen yet</span>;
  }
  return (
    <span className="text-xs">
      {sources.map((s) => `${s.warehouse} ${s.qty}`).join(' · ')}
    </span>
  );
}

function LineRow({
  line,
  editable,
  approval,
  sources,
  onPickSources,
  onApprovalChange,
}: {
  line: BOMRequestLine;
  editable: boolean;
  approval?: BOMLineApproval;
  sources: { warehouse: string; qty: number }[];
  onPickSources?: () => void;
  onApprovalChange?: (a: BOMLineApproval) => void;
}) {
  // What the store can actually hand over: every godown holding the item bar
  // the one production already consumes it from, less what other live
  // approvals hold. The server enforces the same figure.
  const stock = line.available_stock ?? 0;
  const required = parseFloat(line.required_qty);
  const canApproveLine = stock > 0;
  const stockColor =
    stock >= required ? 'text-green-600' : stock > 0 ? 'text-amber-600' : 'text-red-600';

  return (
    <tr className="border-b last:border-0">
      <td className="py-2 px-2">
        <p className="font-medium text-sm">{line.item_code}</p>
        <p className="text-xs text-muted-foreground">{line.item_name}</p>
      </td>
      <td className="py-2 px-2 text-right text-sm">
        {line.required_qty} {line.uom}
      </td>
      <td className={`py-2 px-2 text-right text-sm font-medium ${stockColor}`}>
        {stock.toFixed(3)}
        {(line.at_consumption ?? 0) > 0 && (
          <span className="block text-xs font-normal text-muted-foreground">
            {line.at_consumption} at {line.consumption_warehouse}
          </span>
        )}
      </td>
      {editable && approval && onApprovalChange ? (
        <>
          <td className="py-2 px-2">
            <div className="flex flex-col gap-1">
              <Button
                size="sm"
                variant={approval.status === 'APPROVED' ? 'default' : 'outline'}
                className="h-7 px-2 justify-start"
                disabled={!canApproveLine}
                title={
                  !canApproveLine
                    ? `No godown outside ${line.consumption_warehouse || 'the line'} holds this material`
                    : undefined
                }
                onClick={onPickSources}
              >
                <Warehouse className="h-3 w-3 mr-1" />
                {approval.status === 'APPROVED' && approval.approved_qty > 0
                  ? `${approval.approved_qty} ${line.uom}`
                  : 'Choose godowns'}
              </Button>
              {approval.status === 'APPROVED' && <SourceSummary sources={sources} />}
            </div>
          </td>
          <td className="py-2 px-2">
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={approval.status === 'REJECTED' ? 'destructive' : 'outline'}
                className="h-7 px-2"
                onClick={() =>
                  onApprovalChange({
                    ...approval, status: 'REJECTED', approved_qty: 0, sources: [],
                  })
                }
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </td>
        </>
      ) : (
        <>
          <td className="py-2 px-2 text-right text-sm">
            {line.approved_qty}
            {(line.sources?.length ?? 0) > 0 && (
              <span className="block text-xs font-normal text-muted-foreground">
                {line.sources!.map((s) => `${s.warehouse_code} ${s.qty}`).join(' · ')}
              </span>
            )}
          </td>
          <td className="py-2 px-2 text-right text-sm">{line.issued_qty}</td>
          <td className="py-2 px-2">
            <Badge
              variant="outline"
              className={
                line.status === 'APPROVED'
                  ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30'
                  : line.status === 'REJECTED'
                    ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30'
                    : ''
              }
            >
              {line.status}
            </Badge>
          </td>
        </>
      )}
      <td className="py-2 px-2 text-sm">{line.warehouse}</td>
    </tr>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function BOMRequestDetailPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const id = requestId ? parseInt(requestId) : null;

  const { data: detail, isLoading } = useBOMRequestDetail(id);
  const approveMut = useApproveBOMRequest();
  const rejectMut = useRejectBOMRequest();
  const issueMut = useIssueMaterials();
  const reRequestMut = useReRequestBOMShortfall();

  const [approvals, setApprovals] = useState<Record<number, BOMLineApproval>>({});
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [issueOpen, setIssueOpen] = useState(false);
  const [sourceLineId, setSourceLineId] = useState<number | null>(null);

  const isPending = detail?.status === 'PENDING';
  const isApproved = detail?.status === 'APPROVED' || detail?.status === 'PARTIALLY_APPROVED';
  const isShort = detail?.status === 'PARTIALLY_APPROVED' || detail?.status === 'REJECTED';

  /**
   * The godowns are pre-filled from the fullest down, so the common case is one
   * click — but they are shown, and the approver can redistribute them. Nothing
   * is assumed about which godowns the store is willing to pick from; that is
   * the approver's knowledge, not a list in a config file.
   */
  const getApproval = (line: BOMRequestLine): BOMLineApproval => {
    if (approvals[line.id]) return approvals[line.id];
    const required = parseFloat(line.required_qty);
    let outstanding = required;
    const sources: { warehouse: string; qty: number }[] = [];
    for (const option of line.source_options ?? []) {
      if (outstanding <= 0) break;
      const take = toStorableQty(Math.min(outstanding, option.available));
      if (take > 0) {
        sources.push({ warehouse: option.warehouse, qty: take });
        outstanding -= take;
      }
    }
    const approvedQty = toStorableQty(
      sources.reduce((sum, s) => sum + s.qty, 0),
    );
    return {
      line_id: line.id,
      approved_qty: approvedQty,
      status: approvedQty > 0 ? 'APPROVED' : 'REJECTED',
      sources,
    };
  };

  const updateApproval = (lineId: number, a: BOMLineApproval) => {
    setApprovals((prev) => ({ ...prev, [lineId]: a }));
  };

  const pendingApprovalLines = detail?.lines.map((line) => getApproval(line)) ?? [];
  // Name the register the figures come from. The approval is checked against
  // the same one, so an approver who reads a number here can trust it will be
  // accepted — a SAP figure shown against an RM gate used to offer quantities
  // the approval then refused.
  const stockSources = new Set(
    (detail?.lines ?? []).map((line) => line.stock_source).filter(Boolean),
  );
  const stockSourceLabel =
    stockSources.size === 1
      ? stockSources.has('RM_REGISTER')
        ? 'Raw Material register'
        : 'SAP stock'
      : null;

  const hasApprovedLine = pendingApprovalLines.some((line) =>
    line.status === 'APPROVED' && line.approved_qty > 0
  );

  // What a short approval left unanswered, summed across the lines.
  const shortfallQty = (detail?.lines ?? []).reduce(
    (sum, line) =>
      sum + Math.max(0, parseFloat(line.required_qty) - parseFloat(line.approved_qty)),
    0,
  );

  const sourceLine = detail?.lines.find((l) => l.id === sourceLineId) ?? null;

  const handleApprove = async () => {
    if (!detail) return;
    if (!hasApprovedLine) {
      toast.error('No materials have stock available to approve');
      return;
    }
    try {
      const result = await approveMut.mutateAsync({
        requestId: detail.id,
        data: {
          lines: pendingApprovalLines.map((line) => ({
            ...line,
            approved_qty: toStorableQty(line.approved_qty),
            // Only an approved line names godowns; a rejected one holds none.
            sources: line.status === 'APPROVED' ? (line.sources ?? []) : undefined,
          })),
        },
      });
      toast.success(
        result.status === 'PARTIALLY_APPROVED'
          ? 'BOM request partially approved'
          : 'BOM request approved',
      );
    } catch {
      // Error handled by interceptor
    }
  };

  const handleReRequest = async () => {
    if (!detail) return;
    try {
      const followUp = await reRequestMut.mutateAsync({ requestId: detail.id });
      toast.success(`Shortfall raised as BOM request #${followUp.id}`);
      navigate(`/warehouse/bom-requests/${followUp.id}`);
    } catch {
      // Error handled by interceptor
    }
  };

  const handleReject = async () => {
    if (!detail || !rejectReason.trim()) return;
    try {
      await rejectMut.mutateAsync({
        requestId: detail.id,
        data: { reason: rejectReason },
      });
      toast.success('BOM request rejected');
      setRejectOpen(false);
    } catch {
      // Error handled by interceptor
    }
  };

  const handleIssue = async () => {
    if (!detail) return;
    try {
      await issueMut.mutateAsync({ requestId: detail.id });
      toast.success('Materials issued to SAP');
      setIssueOpen(false);
    } catch {
      // Error handled by interceptor
    }
  };

  if (isLoading || !detail) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title={`BOM Request #${detail.id}`}
        subtitle={`Run #${detail.run_number} — ${detail.run_date} — ${detail.product || 'N/A'}`}
      />

      <Button variant="ghost" size="sm" onClick={() => navigate('/warehouse/bom-requests')}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to list
      </Button>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Required FG Qty</p>
            <p className="text-xl font-bold">{detail.required_qty}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="text-lg font-semibold">{detail.status.replace('_', ' ')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Line</p>
            <p className="text-lg font-semibold">{detail.line_name}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Issue Status</p>
            <p className="text-lg font-semibold">{detail.material_issue_status.replace(/_/g, ' ')}</p>
          </CardContent>
        </Card>
      </div>

      {detail.rejection_reason && (
        <Card className="border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-red-800 dark:text-red-400">Rejection Reason</p>
            <p className="text-sm text-red-700 dark:text-red-400">{detail.rejection_reason}</p>
          </CardContent>
        </Card>
      )}

      {/* Materials Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" /> Materials ({detail.lines.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 px-2">Material</th>
                  <th className="py-2 px-2 text-right">Required</th>
                  <th className="py-2 px-2 text-right">
                    Can be fetched
                    <span className="block text-xs font-normal text-muted-foreground">
                      {stockSourceLabel ?? 'across godowns'}
                    </span>
                  </th>
                  {isPending ? (
                    <>
                      <th className="py-2 px-2">Approve &amp; draw from</th>
                      <th className="py-2 px-2">Reject</th>
                    </>
                  ) : (
                    <>
                      <th className="py-2 px-2 text-right">Approved</th>
                      <th className="py-2 px-2 text-right">Issued</th>
                      <th className="py-2 px-2">Status</th>
                    </>
                  )}
                  <th className="py-2 px-2">Consume at</th>
                </tr>
              </thead>
              <tbody>
                {detail.lines.map((line) => (
                  <LineRow
                    key={line.id}
                    line={line}
                    editable={isPending}
                    approval={isPending ? getApproval(line) : undefined}
                    sources={isPending ? (getApproval(line).sources ?? []) : []}
                    onPickSources={isPending ? () => setSourceLineId(line.id) : undefined}
                    onApprovalChange={
                      isPending ? (a) => updateApproval(line.id, a) : undefined
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {isPending && (
          <>
            <Button onClick={handleApprove} disabled={approveMut.isPending || !hasApprovedLine}>
              {approveMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              <Check className="h-4 w-4 mr-1" /> Approve
            </Button>
            <Button variant="destructive" onClick={() => setRejectOpen(true)}>
              <X className="h-4 w-4 mr-1" /> Reject
            </Button>
          </>
        )}

        {isApproved && detail.material_issue_status !== 'FULLY_ISSUED' && (
          <Button onClick={() => setIssueOpen(true)}>
            <Send className="h-4 w-4 mr-1" /> Issue Materials to SAP
          </Button>
        )}

        {/* The balance of a short approval. Without this the un-approved
            remainder had nowhere to go: raising a fresh request is refused
            while this one is open, so the quantity was simply lost. */}
        {isShort && shortfallQty > 0 && (
          <Button
            variant="outline"
            onClick={handleReRequest}
            disabled={reRequestMut.isPending}
          >
            {reRequestMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            <RotateCcw className="h-4 w-4 mr-1" />
            Request shortfall ({shortfallQty.toFixed(3)})
          </Button>
        )}
      </div>

      {/* SAP Issue History */}
      {detail.sap_issue_doc_entries && detail.sap_issue_doc_entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">SAP Issue Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {detail.sap_issue_doc_entries.map((doc, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                >
                  <span>
                    DocEntry: <strong>{doc.doc_entry}</strong> | DocNum: {doc.doc_num}
                  </span>
                  <span className="text-muted-foreground">
                    {doc.date} &middot; {doc.lines_count} lines
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Which godowns this line's quantity comes out of */}
      <BOMSourcePickerDialog
        line={sourceLine}
        open={sourceLineId !== null}
        initial={sourceLine ? (getApproval(sourceLine).sources ?? []) : []}
        onOpenChange={(open) => !open && setSourceLineId(null)}
        onConfirm={(picked) => {
          if (!sourceLine) return;
          updateApproval(sourceLine.id, {
            ...getApproval(sourceLine),
            approved_qty: picked.reduce((sum, s) => sum + s.qty, 0),
            status: 'APPROVED',
            sources: picked,
          });
          setSourceLineId(null);
        }}
      />

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject BOM Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reason</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setRejectOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={!rejectReason.trim() || rejectMut.isPending}
              >
                {rejectMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Issue Confirmation Dialog */}
      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Materials to SAP</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will create an SAP Goods Issue document (InventoryGenExits) for all approved
              materials with remaining quantity. Stock will be deducted from the respective
              warehouses.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIssueOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleIssue} disabled={issueMut.isPending}>
                {issueMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Confirm Issue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
