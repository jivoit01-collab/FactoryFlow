import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Package, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Textarea,
} from '@/shared/components/ui';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';

import { WasteLogTable } from '../components/WasteLogTable';
import { WasteApprovalTimeline } from '../components/WasteApprovalTimeline';
import { WasteApprovalDialog } from '../components/WasteApprovalDialog';
import { WASTE_APPROVAL_COLORS, WASTE_APPROVAL_LABELS } from '../constants';
import {
  useWasteLogs,
  useCreateWasteLog,
  useWasteDetail,
  useApproveWaste,
} from '../api/execution.queries';
import type { WasteApprovalStatus, WasteLog } from '../types';

export default function WasteManagementPage() {
  const [statusFilter, setStatusFilter] = useState<WasteApprovalStatus | 'ALL'>('ALL');
  const [selectedWaste, setSelectedWaste] = useState<WasteLog | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalRole, setApprovalRole] = useState<'engineer' | 'am' | 'store' | 'hod'>('engineer');

  // Create form state
  const [newWaste, setNewWaste] = useState({
    production_run_id: '',
    material_name: '',
    wastage_qty: '',
    uom: 'pcs',
    reason: '',
  });

  const { data: wasteLogs = [], isLoading } = useWasteLogs(
    statusFilter !== 'ALL' ? { approval_status: statusFilter } : undefined,
  );
  const { data: wasteDetail } = useWasteDetail(selectedWaste?.id ?? null);
  const createWaste = useCreateWasteLog();

  const wasteId = selectedWaste?.id ?? 0;
  const approvals = useApproveWaste(wasteId);

  const pendingCount = wasteLogs.filter((w) => w.wastage_approval_status === 'PENDING').length;
  const approvedCount = wasteLogs.filter(
    (w) => w.wastage_approval_status === 'FULLY_APPROVED',
  ).length;

  const handleCreate = async () => {
    try {
      await createWaste.mutateAsync({
        production_run_id: Number(newWaste.production_run_id),
        material_name: newWaste.material_name,
        wastage_qty: Number(newWaste.wastage_qty),
        uom: newWaste.uom,
        reason: newWaste.reason,
      });
      toast.success('Waste log created');
      setCreateDialogOpen(false);
      setNewWaste({
        production_run_id: '',
        material_name: '',
        wastage_qty: '',
        uom: 'pcs',
        reason: '',
      });
    } catch {
      toast.error('Failed to create waste log');
    }
  };

  const handleApprove = (role: 'engineer' | 'am' | 'store' | 'hod') => {
    setApprovalRole(role);
    setApprovalDialogOpen(true);
  };

  const handleApprovalConfirm = async (remarks: string) => {
    try {
      const mutation = approvals[approvalRole];
      await mutation.mutateAsync({ sign: 'approved', remarks });
      toast.success('Waste log approved');
      setApprovalDialogOpen(false);
    } catch {
      toast.error('Failed to approve waste log');
    }
  };

  const STATUS_TABS: { label: string; value: WasteApprovalStatus | 'ALL' }[] = [
    { label: 'All', value: 'ALL' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Partially Approved', value: 'PARTIALLY_APPROVED' },
    { label: 'Fully Approved', value: 'FULLY_APPROVED' },
  ];

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Waste Management"
        description="Track waste logs and manage approval workflow"
        primaryAction={{
          label: 'New Waste Log',
          icon: <Plus className="h-4 w-4 mr-2" />,
          onClick: () => setCreateDialogOpen(true),
        }}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Waste Logs</p>
                <p className="text-lg font-bold text-blue-600">{wasteLogs.length}</p>
              </div>
              <Package className="h-5 w-5 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="p-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pending Approval</p>
                <p className="text-lg font-bold text-amber-600">{pendingCount}</p>
              </div>
              <AlertTriangle className="h-5 w-5 text-amber-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="p-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Fully Approved</p>
                <p className="text-lg font-bold text-green-600">{approvedCount}</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-2">
        {STATUS_TABS.map((tab) => (
          <Badge
            key={tab.value}
            variant={statusFilter === tab.value ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setStatusFilter(tab.value)}
          >
            {tab.label}
          </Badge>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Waste Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <WasteLogTable
              wasteLogs={wasteLogs}
              onRowClick={(log) => setSelectedWaste(log)}
            />
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={!!selectedWaste} onOpenChange={(open) => !open && setSelectedWaste(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Waste Log Detail</SheetTitle>
          </SheetHeader>

          {(() => {
            const detail = wasteDetail || selectedWaste;
            if (!detail) return null;
            const colors = WASTE_APPROVAL_COLORS[detail.wastage_approval_status];
            const label = WASTE_APPROVAL_LABELS[detail.wastage_approval_status];
            return (
              <div className="space-y-6 mt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Material</span>
                    <span className="text-sm font-medium">{detail.material_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Wastage Qty</span>
                    <span className="text-sm font-bold">
                      {Number(detail.wastage_qty).toLocaleString()} {detail.uom}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText}`}
                    >
                      {label}
                    </span>
                  </div>
                  {detail.reason && (
                    <div>
                      <span className="text-sm text-muted-foreground">Reason</span>
                      <p className="text-sm mt-0.5">{detail.reason}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Created</span>
                    <span className="text-sm">
                      {new Date(detail.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold mb-3">Approval Timeline</h4>
                  <WasteApprovalTimeline wasteLog={detail} onApprove={handleApprove} />
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Waste Log</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Production Run ID *</Label>
              <Input
                type="number"
                placeholder="Enter run ID"
                value={newWaste.production_run_id}
                onChange={(e) => setNewWaste({ ...newWaste, production_run_id: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Material *</Label>
                <Input
                  placeholder="e.g., Bottle"
                  value={newWaste.material_name}
                  onChange={(e) => setNewWaste({ ...newWaste, material_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Wastage Qty *</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={newWaste.wastage_qty}
                  onChange={(e) => setNewWaste({ ...newWaste, wastage_qty: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>UoM</Label>
              <Input
                placeholder="pcs"
                value={newWaste.uom}
                onChange={(e) => setNewWaste({ ...newWaste, uom: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                placeholder="Describe the reason for wastage..."
                value={newWaste.reason}
                onChange={(e) => setNewWaste({ ...newWaste, reason: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                createWaste.isPending ||
                !newWaste.production_run_id ||
                !newWaste.material_name ||
                !newWaste.wastage_qty
              }
            >
              {createWaste.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Confirmation Dialog */}
      {selectedWaste && (
        <WasteApprovalDialog
          open={approvalDialogOpen}
          onOpenChange={setApprovalDialogOpen}
          materialName={selectedWaste.material_name}
          wastageQty={`${Number(selectedWaste.wastage_qty).toLocaleString()} ${selectedWaste.uom}`}
          role={approvalRole.toUpperCase()}
          isPending={approvals[approvalRole].isPending}
          onConfirm={handleApprovalConfirm}
        />
      )}
    </div>
  );
}
