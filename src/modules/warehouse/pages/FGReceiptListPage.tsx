import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PackageCheck,
  Clock,
  CheckCircle2,
  CloudUpload,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';

import { useFGReceipts, useReceiveFG, usePostFGToSAP } from '../api';
import type { FGReceipt, FGReceiptStatus } from '../types';

function FGStatusBadge({ status }: { status: FGReceiptStatus }) {
  const config: Record<FGReceiptStatus, { label: string; cls: string; icon: typeof Clock }> = {
    PENDING: { label: 'Pending', cls: 'bg-amber-100 text-amber-800', icon: Clock },
    RECEIVED: { label: 'Received', cls: 'bg-blue-100 text-blue-800', icon: CheckCircle2 },
    SAP_POSTED: { label: 'SAP Posted', cls: 'bg-green-100 text-green-800', icon: CloudUpload },
    FAILED: { label: 'Failed', cls: 'bg-red-100 text-red-800', icon: AlertTriangle },
  };
  const c = config[status];
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.cls}`}>
      <Icon className="h-3 w-3" />
      {c.label}
    </span>
  );
}

export default function FGReceiptListPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [actionTarget, setActionTarget] = useState<FGReceipt | null>(null);
  const [actionType, setActionType] = useState<'receive' | 'post-sap' | null>(null);

  const { data: receipts = [], isLoading } = useFGReceipts(
    statusFilter === 'ALL' ? undefined : statusFilter,
  );
  const receiveMut = useReceiveFG();
  const postSAPMut = usePostFGToSAP();

  const handleAction = async () => {
    if (!actionTarget || !actionType) return;
    try {
      if (actionType === 'receive') {
        await receiveMut.mutateAsync(actionTarget.id);
        toast.success('Finished goods received');
      } else {
        await postSAPMut.mutateAsync(actionTarget.id);
        toast.success('Posted to SAP successfully');
      }
      setActionTarget(null);
      setActionType(null);
    } catch {
      // Error handled by interceptor
    }
  };

  const isActing = receiveMut.isPending || postSAPMut.isPending;

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Finished Goods Receipts"
        subtitle="Receive produced goods and post to SAP"
      />

      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="RECEIVED">Received</SelectItem>
            <SelectItem value="SAP_POSTED">SAP Posted</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <PackageCheck className="h-5 w-5 animate-pulse mr-2 text-muted-foreground" />
          <span className="text-muted-foreground">Loading receipts...</span>
        </div>
      ) : receipts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <PackageCheck className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No finished goods receipts</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 px-3">ID</th>
                <th className="py-2 px-3">Run</th>
                <th className="py-2 px-3">Product</th>
                <th className="py-2 px-3 text-right">Good Qty</th>
                <th className="py-2 px-3 text-right">Rejected</th>
                <th className="py-2 px-3">Warehouse</th>
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((r) => (
                <tr key={r.id} className="border-b hover:bg-muted/50">
                  <td className="py-2 px-3 font-medium">#{r.id}</td>
                  <td className="py-2 px-3">#{r.run_number}</td>
                  <td className="py-2 px-3">
                    <p className="font-medium">{r.item_code}</p>
                    <p className="text-xs text-muted-foreground">{r.item_name}</p>
                  </td>
                  <td className="py-2 px-3 text-right font-medium">{r.good_qty}</td>
                  <td className="py-2 px-3 text-right text-red-600">{r.rejected_qty}</td>
                  <td className="py-2 px-3">{r.warehouse}</td>
                  <td className="py-2 px-3">{r.posting_date}</td>
                  <td className="py-2 px-3">
                    <FGStatusBadge status={r.status} />
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex gap-1">
                      {r.status === 'PENDING' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => {
                            setActionTarget(r);
                            setActionType('receive');
                          }}
                        >
                          Receive
                        </Button>
                      )}
                      {(r.status === 'RECEIVED' || r.status === 'FAILED') && (
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            setActionTarget(r);
                            setActionType('post-sap');
                          }}
                        >
                          Post to SAP
                        </Button>
                      )}
                      {r.status === 'SAP_POSTED' && r.sap_receipt_doc_entry && (
                        <Badge variant="outline" className="text-xs">
                          SAP #{r.sap_receipt_doc_entry}
                        </Badge>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Action Dialog */}
      <Dialog
        open={!!actionTarget}
        onOpenChange={() => {
          setActionTarget(null);
          setActionType(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'receive' ? 'Receive Finished Goods' : 'Post to SAP'}
            </DialogTitle>
          </DialogHeader>
          {actionTarget && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Product:</span>
                <span className="font-medium">{actionTarget.item_code}</span>
                <span className="text-muted-foreground">Good Qty:</span>
                <span className="font-medium">{actionTarget.good_qty}</span>
                <span className="text-muted-foreground">Warehouse:</span>
                <span className="font-medium">{actionTarget.warehouse}</span>
              </div>

              {actionType === 'post-sap' && (
                <p className="text-sm text-muted-foreground">
                  This will create an SAP Goods Receipt (InventoryGenEntries) linked to the
                  production order. Finished goods stock will increase in the warehouse.
                </p>
              )}

              {actionTarget.sap_error && (
                <div className="p-2 bg-red-50 rounded text-sm text-red-700">
                  Previous error: {actionTarget.sap_error}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setActionTarget(null);
                    setActionType(null);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleAction} disabled={isActing}>
                  {isActing && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  {actionType === 'receive' ? 'Confirm Receipt' : 'Post to SAP'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
