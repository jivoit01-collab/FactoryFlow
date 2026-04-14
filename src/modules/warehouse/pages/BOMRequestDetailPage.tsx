import { ArrowLeft, Check, Loader2, Package, Send, X } from 'lucide-react';
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
  Input,
  Label,
  Textarea,
} from '@/shared/components/ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { logSwallowedError } from '@/shared/utils';

import {
  useApproveBOMRequest,
  useBOMRequestDetail,
  useIssueMaterials,
  useRejectBOMRequest,
} from '../api';
import type { BOMLineApproval, BOMRequestLine } from '../types';

// ============================================================================
// Line Row Component
// ============================================================================

function LineRow({
  line,
  editable,
  approval,
  onApprovalChange,
}: {
  line: BOMRequestLine;
  editable: boolean;
  approval?: BOMLineApproval;
  onApprovalChange?: (a: BOMLineApproval) => void;
}) {
  const stock = line.available_stock ?? 0;
  const required = parseFloat(line.required_qty);
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
        {stock.toFixed(1)}
      </td>
      {editable && approval && onApprovalChange ? (
        <>
          <td className="py-2 px-2">
            <Input
              type="number"
              className="w-24 h-8 text-sm"
              value={approval.approved_qty}
              onChange={(e) =>
                onApprovalChange({ ...approval, approved_qty: parseFloat(e.target.value) || 0 })
              }
            />
          </td>
          <td className="py-2 px-2">
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={approval.status === 'APPROVED' ? 'default' : 'outline'}
                className="h-7 px-2"
                onClick={() => onApprovalChange({ ...approval, status: 'APPROVED' })}
              >
                <Check className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant={approval.status === 'REJECTED' ? 'destructive' : 'outline'}
                className="h-7 px-2"
                onClick={() =>
                  onApprovalChange({ ...approval, status: 'REJECTED', approved_qty: 0 })
                }
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </td>
        </>
      ) : (
        <>
          <td className="py-2 px-2 text-right text-sm">{line.approved_qty}</td>
          <td className="py-2 px-2 text-right text-sm">{line.issued_qty}</td>
          <td className="py-2 px-2">
            <Badge
              variant="outline"
              className={
                line.status === 'APPROVED'
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : line.status === 'REJECTED'
                    ? 'bg-red-50 text-red-700 border-red-200'
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

  const [approvals, setApprovals] = useState<Record<number, BOMLineApproval>>({});
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [issueOpen, setIssueOpen] = useState(false);

  const isPending = detail?.status === 'PENDING';
  const isApproved = detail?.status === 'APPROVED' || detail?.status === 'PARTIALLY_APPROVED';

  // Initialize approvals from lines
  const getApproval = (line: BOMRequestLine): BOMLineApproval => {
    if (approvals[line.id]) return approvals[line.id];
    return {
      line_id: line.id,
      approved_qty: parseFloat(line.required_qty),
      status: 'APPROVED',
    };
  };

  const updateApproval = (lineId: number, a: BOMLineApproval) => {
    setApprovals((prev) => ({ ...prev, [lineId]: a }));
  };

  const handleApprove = async () => {
    if (!detail) return;
    const lines = detail.lines.map((l) => getApproval(l));
    try {
      await approveMut.mutateAsync({ requestId: detail.id, data: { lines } });
      toast.success('BOM request approved');
    } catch (err) {
      logSwallowedError(err, 'approve BOM request');
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
    } catch (err) {
      logSwallowedError(err, 'reject BOM request');
    }
  };

  const handleIssue = async () => {
    if (!detail) return;
    try {
      await issueMut.mutateAsync({ requestId: detail.id });
      toast.success('Materials issued to SAP');
      setIssueOpen(false);
    } catch (err) {
      logSwallowedError(err, 'issue BOM materials');
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
            <p className="text-xs text-muted-foreground">Required Qty</p>
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
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-red-800">Rejection Reason</p>
            <p className="text-sm text-red-700">{detail.rejection_reason}</p>
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
                  <th scope="col" className="py-2 px-2">Material</th>
                  <th scope="col" className="py-2 px-2 text-right">Required</th>
                  <th scope="col" className="py-2 px-2 text-right">In Stock</th>
                  {isPending ? (
                    <>
                      <th scope="col" className="py-2 px-2">Approve Qty</th>
                      <th scope="col" className="py-2 px-2">Action</th>
                    </>
                  ) : (
                    <>
                      <th scope="col" className="py-2 px-2 text-right">Approved</th>
                      <th scope="col" className="py-2 px-2 text-right">Issued</th>
                      <th scope="col" className="py-2 px-2">Status</th>
                    </>
                  )}
                  <th scope="col" className="py-2 px-2">Warehouse</th>
                </tr>
              </thead>
              <tbody>
                {detail.lines.map((line) => (
                  <LineRow
                    key={line.id}
                    line={line}
                    editable={isPending}
                    approval={isPending ? getApproval(line) : undefined}
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
            <Button onClick={handleApprove} disabled={approveMut.isPending}>
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
