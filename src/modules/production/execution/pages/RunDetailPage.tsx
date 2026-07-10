import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Link,
  Loader2,
  Pencil,
  Play,
  Plus,
  Send,
  Shield,
  Trash2,
  Warehouse,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useWarehouses } from '@/modules/grpo/api';
import type { Warehouse as SAPWarehouse } from '@/modules/grpo/types';
import { useProductionQCRunSessions, useRequestFinalProductionQC } from '@/modules/qc/api/productionQC';
import { useCreateBOMRequest, useCreateFGReceipt, useFGReceipts } from '@/modules/warehouse/api';
import type { FGReceipt } from '@/modules/warehouse/types';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import {
  Button, Card, CardContent, Checkbox,
  Dialog, DialogContent, DialogHeader, DialogTitle,
  Input, Label, NativeSelect, Select, SelectContent, SelectItem, SelectOption, SelectTrigger, SelectValue,
  Tabs, TabsContent, TabsList, TabsTrigger, Textarea,
} from '@/shared/components/ui';

import {
  useAddBreakdown,
  useBreakdownCategories,
  useCreateLabour,
  useCreateMaterial,
  useDeleteLabour,
  useLabour,
  useLineClearances,
  useMachines,
  useMaterials,
  useResolveBreakdown,
  useRunDetail,
  useStartProduction,
  useStopProduction,
  useUpdateBreakdownRemarks,
  useUpdateLabour,
  useUpdateMaterial,
  useUpdateSegment,
  useWasteLogs,
} from '../api';
import { MaterialConsumptionTable } from '../components/MaterialConsumptionTable';
import { ProductionStatusBadge } from '../components/ProductionStatusBadge';
import { ProductionTimeline } from '../components/ProductionTimeline';
import {
  type AddBreakdownFormData,
  addBreakdownSchema,
  type CreateLabourFormData,
  createLabourSchema,
  type CreateMaterialFormData,
  createMaterialSchema,
  type StopProductionFormData,
  stopProductionSchema,
} from '../schemas';
import type { MachineBreakdown, ProductionSegment, ResourceLabour } from '../types';

function WarehouseApprovalBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    NOT_REQUESTED: { label: 'Not Requested', cls: 'bg-gray-100 text-gray-600' },
    PENDING: { label: 'WH Pending', cls: 'bg-amber-100 text-amber-800' },
    APPROVED: { label: 'WH Approved', cls: 'bg-green-100 text-green-800' },
    PARTIALLY_APPROVED: { label: 'WH Partial', cls: 'bg-blue-100 text-blue-800' },
    REJECTED: { label: 'WH Rejected', cls: 'bg-red-100 text-red-800' },
  };
  const c = config[status] ?? config.NOT_REQUESTED;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.cls}`}>
      <Warehouse className="h-3 w-3" />
      {c.label}
    </span>
  );
}

function getFGReceiptButtonLabel(receipt?: FGReceipt) {
  if (!receipt) return 'Create FG Receipt';
  if (receipt.status === 'PENDING') return 'Edit FG Receipt';
  if (receipt.status === 'RECEIVED') return 'FG Receipt Received';
  if (receipt.status === 'SAP_POSTED') return 'FG Posted to SAP';
  return 'FG Receipt Locked';
}

type FinalQCGateSession = {
  workflow_status: string;
  overall_result?: string;
};

function getFinalQCGate(session?: FinalQCGateSession) {
  if (!session) {
    return {
      canSendFG: false,
      actionLabel: 'Send FG to QC',
      reason: 'Create an FG QC approval request before sending FG to warehouse.',
    };
  }

  if (session.workflow_status === 'APPROVED' && session.overall_result === 'PASS') {
    return { canSendFG: true, actionLabel: 'Create FG Receipt', reason: undefined };
  }

  if (session.workflow_status === 'APPROVED') {
    return {
      canSendFG: false,
      actionLabel: 'Final QC Failed',
      reason: 'Final QC is approved, but the result is not PASS.',
    };
  }

  if (session.workflow_status === 'REJECTED') {
    return {
      canSendFG: false,
      actionLabel: 'Final QC Rejected',
      reason: 'Final QC was rejected. Resolve QC before sending FG to warehouse.',
    };
  }

  if (session.workflow_status === 'SUBMITTED') {
    return {
      canSendFG: false,
      actionLabel: 'Awaiting QC Approval',
      reason: 'Final QC is submitted and waiting for QA approval.',
    };
  }

  return {
    canSendFG: false,
    actionLabel: 'FG QC Requested',
    reason: 'FG QC request is with QC. QC will select parameters, submit, and approve it.',
  };
}

function RunDetailPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const numRunId = Number(runId);

  // ---------------------------------------------------------------------------
  // Data hooks
  // ---------------------------------------------------------------------------
  const { data: run, isLoading } = useRunDetail(numRunId || null);
  const { data: materials = [], refetch: refetchMaterials } = useMaterials(numRunId);
  const { data: labourEntries = [] } = useLabour(numRunId);
  const { data: breakdownCategories = [] } = useBreakdownCategories();
  const { data: clearances = [] } = useLineClearances(run?.line);
  const { data: wasteLogs = [] } = useWasteLogs(numRunId);
  const { data: lineMachines = [] } = useMachines(run?.line);

  const { data: qcSessions = [] } = useProductionQCRunSessions(numRunId || null);
  const { data: fgReceipts = [], isLoading: fgReceiptsLoading } = useFGReceipts(
    undefined,
    numRunId || undefined,
    !!numRunId && run?.status === 'COMPLETED',
  );

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------
  const startProduction = useStartProduction(numRunId);
  const stopProduction = useStopProduction(numRunId);
  const addBreakdown = useAddBreakdown(numRunId);
  const resolveBreakdown = useResolveBreakdown(numRunId);
  const updateSegment = useUpdateSegment(numRunId);
  const updateBreakdownRemarks = useUpdateBreakdownRemarks(numRunId);
  const createMaterial = useCreateMaterial(numRunId);
  const updateMaterial = useUpdateMaterial(numRunId);
  const addLabour = useCreateLabour(numRunId);
  const updateLabourMut = useUpdateLabour(numRunId);
  const removeLabour = useDeleteLabour(numRunId);
  const createBOMRequest = useCreateBOMRequest();
  const createFGReceipt = useCreateFGReceipt();
  const requestFinalQC = useRequestFinalProductionQC(numRunId);

  useEffect(() => {
    if (
      run?.warehouse_approval_status &&
      run.warehouse_approval_status !== 'NOT_REQUESTED'
    ) {
      void refetchMaterials();
    }
  }, [refetchMaterials, run?.warehouse_approval_status]);
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [dialog, setDialog] = useState<'breakdown' | 'stop' | 'material' | 'segment-detail' | 'breakdown-detail' | 'labour' | 'fg-receipt' | null>(null);
  const [editingLabour, setEditingLabour] = useState<ResourceLabour | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<ProductionSegment | null>(null);
  const [selectedBreakdown, setSelectedBreakdown] = useState<MachineBreakdown | null>(null);
  const [editRemarks, setEditRemarks] = useState('');
  const [selectedFGWarehouse, setSelectedFGWarehouse] = useState('');
  const [fgWarehouseError, setFGWarehouseError] = useState('');
  const { data: fgWarehouses = [], isLoading: fgWarehousesLoading, isError: fgWarehousesError } = useWarehouses(dialog === 'fg-receipt');
  const isCompleted = run?.status === 'COMPLETED';
  const lockedFGReceipt = fgReceipts.find((receipt) =>
    receipt.status !== 'PENDING' || Boolean(receipt.received_at)
  );
  const editableFGReceipt = fgReceipts.find((receipt) =>
    receipt.status === 'PENDING' && !receipt.received_at
  );
  const existingFGReceipt = lockedFGReceipt || editableFGReceipt;
  const canEditFGReceipt = !lockedFGReceipt;
  const latestFinalQC = [...qcSessions]
    .filter((session) => session.session_type === 'FINAL')
    .sort((a, b) => {
      const checkedAtDiff = new Date(b.checked_at).getTime() - new Date(a.checked_at).getTime();
      return checkedAtDiff || b.id - a.id;
    })[0];
  const finalQCGate = getFinalQCGate(latestFinalQC);
  const hasActiveSegment = run?.segments?.some((s) => s.is_active) ?? false;
  const hasActiveBreakdown = run?.breakdowns?.some((b) => b.is_active) ?? false;
  const canComplete = !hasActiveSegment && !hasActiveBreakdown && run?.status === 'IN_PROGRESS';
  const runClearance = clearances.find((c) => c.production_run === run?.id);
  const machineOptions = useMemo(() => {
    if (!run?.machine_ids?.length) return lineMachines;
    const runMachineIds = new Set(run.machine_ids);
    const runMachines = lineMachines.filter((machine) => runMachineIds.has(machine.id));
    return runMachines.length > 0 ? runMachines : lineMachines;
  }, [lineMachines, run?.machine_ids]);
  const hasClearedClearance = runClearance?.status === 'CLEARED';
  const startProductionBlockReason =
    run?.warehouse_approval_status === 'NOT_REQUESTED'
      ? 'Submit the BOM request to warehouse before starting production.'
      : run?.warehouse_approval_status === 'PENDING'
        ? 'Cannot start production while warehouse approval is pending.'
        : run?.warehouse_approval_status === 'REJECTED'
          ? 'Cannot start production because warehouse approval was rejected.'
          : !hasClearedClearance
            ? 'Cannot start production — line clearance has not been approved by QA.'
            : undefined;

  // ---------------------------------------------------------------------------
  // Breakdown form
  // ---------------------------------------------------------------------------
  const breakdownForm = useForm<AddBreakdownFormData>({
    resolver: zodResolver(addBreakdownSchema),
    defaultValues: {
      produced_cases: '0',
      remarks: '',
      create_maintenance_work_order: true,
      maintenance_priority: 'CRITICAL',
    },
  });
  const selectedBreakdownMachineId = breakdownForm.watch('machine_id');
  const createMaintenanceWork = breakdownForm.watch('create_maintenance_work_order') ?? true;

  const openBreakdownDialog = () => {
    const defaultMachineId = machineOptions.length === 1 ? machineOptions[0].id : undefined;
    breakdownForm.reset({
      machine_id: defaultMachineId,
      create_maintenance_work_order: true,
      maintenance_priority: 'CRITICAL',
      produced_cases: '0',
      remarks: '',
    });
    setDialog('breakdown');
  };
  const onSubmitBreakdown = async (data: AddBreakdownFormData) => {
    try {
      await addBreakdown.mutateAsync(data);
      toast.success(
        data.create_maintenance_work_order === false
          ? 'Breakdown added'
          : 'Breakdown added and maintenance work created',
      );
      setDialog(null);
      breakdownForm.reset({
        produced_cases: '0',
        remarks: '',
        create_maintenance_work_order: true,
        maintenance_priority: 'CRITICAL',
      });
    } catch {
      toast.error('Failed to add breakdown');
    }
  };

  // ---------------------------------------------------------------------------
  // Stop Production form
  // ---------------------------------------------------------------------------
  const stopForm = useForm<StopProductionFormData>({
    resolver: zodResolver(stopProductionSchema),
    defaultValues: { produced_cases: '0' },
  });
  const onSubmitStop = async (data: StopProductionFormData) => {
    try {
      await stopProduction.mutateAsync({
        produced_cases: data.produced_cases,
        remarks: data.remarks,
      });
      toast.success('Production stopped');
      setDialog(null);
      stopForm.reset();
    } catch {
      toast.error('Failed to stop production');
    }
  };

  // ---------------------------------------------------------------------------
  // Material form
  // ---------------------------------------------------------------------------
  const materialForm = useForm<CreateMaterialFormData>({ resolver: zodResolver(createMaterialSchema) });
  const onSubmitMaterial = async (data: CreateMaterialFormData) => {
    try { await createMaterial.mutateAsync(data); toast.success('Material added'); setDialog(null); materialForm.reset(); } catch { toast.error('Failed to add material'); }
  };

  // ---------------------------------------------------------------------------
  // Labour form
  // ---------------------------------------------------------------------------
  const labourForm = useForm<CreateLabourFormData>({ resolver: zodResolver(createLabourSchema), defaultValues: { worker_count: 1 } });
  const openEditLabour = (entry: ResourceLabour) => {
    setEditingLabour(entry);
    labourForm.reset({ description: entry.description, worker_count: entry.worker_count, hours_worked: entry.hours_worked, rate_per_hour: entry.rate_per_hour });
    setDialog('labour');
  };
  const handleDeleteLabour = async (id: number) => {
    if (!confirm('Delete this labour entry?')) return;
    try { await removeLabour.mutateAsync(id); toast.success('Deleted'); } catch { toast.error('Delete failed'); }
  };

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleStartProduction = async () => {
    if (startProductionBlockReason) {
      toast.error(startProductionBlockReason);
      return;
    }
    try {
      await startProduction.mutateAsync();
      toast.success('Production started');
    } catch {
      toast.error('Failed to start production');
    }
  };

  const handleResolveBreakdown = async (breakdownId: number, action: 'start_production' | 'stop_production' | 'stop_unrecovered') => {
    try {
      await resolveBreakdown.mutateAsync({ breakdownId, data: { action } });
      toast.success('Breakdown resolved');
    } catch {
      toast.error('Failed to resolve breakdown');
    }
  };

  const handleSegmentClick = (segment: ProductionSegment) => {
    setSelectedSegment(segment);
    setEditRemarks(segment.remarks || '');
    setDialog('segment-detail');
  };

  const handleBreakdownClick = (breakdown: MachineBreakdown) => {
    setSelectedBreakdown(breakdown);
    setEditRemarks(breakdown.remarks || '');
    setDialog('breakdown-detail');
  };

  const handleSaveSegmentRemarks = async () => {
    if (!selectedSegment) return;
    try {
      await updateSegment.mutateAsync({
        segmentId: selectedSegment.id,
        data: { remarks: editRemarks },
      });
      toast.success('Segment updated');
      setDialog(null);
    } catch { toast.error('Failed to update segment'); }
  };

  const handleUpdateClosingQty = async (materialId: number, closingQty: string) => {
    try {
      await updateMaterial.mutateAsync({ materialId, data: { closing_qty: closingQty } });
      toast.success('Closing qty updated');
    } catch { toast.error('Failed to update closing qty'); }
  };

  const handleCreateFGReceipt = async () => {
    if (!run) return;
    if (!finalQCGate.canSendFG) {
      toast.error(finalQCGate.reason || 'Final QC approval is required');
      return;
    }
    if (!selectedFGWarehouse) {
      setFGWarehouseError('Select a warehouse');
      return;
    }
    try {
      const wasEditing = Boolean(editableFGReceipt);
      await createFGReceipt.mutateAsync({
        production_run_id: run.id,
        posting_date: run.date,
        warehouse: selectedFGWarehouse,
      });
      toast.success(wasEditing ? 'FG receipt updated' : 'FG receipt created - warehouse notified');
      setDialog(null);
      setSelectedFGWarehouse('');
      setFGWarehouseError('');
    } catch { /* interceptor handles */ }
  };

  const handleSaveBreakdownRemarks = async () => {
    if (!selectedBreakdown) return;
    try {
      await updateBreakdownRemarks.mutateAsync({
        breakdownId: selectedBreakdown.id,
        data: { remarks: editRemarks },
      });
      toast.success('Breakdown updated');
      setDialog(null);
    } catch { toast.error('Failed to update breakdown'); }
  };

  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // Loading / Error states
  // ---------------------------------------------------------------------------
  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading run details...</div>;
  if (!run) return <div className="p-8 text-center text-muted-foreground">Run not found</div>;

  const clearanceStatusText = runClearance
    ? {
        DRAFT: 'Draft',
        SUBMITTED: 'Submitted',
        CLEARED: 'Cleared',
        NOT_CLEARED: 'Not Cleared',
      }[runClearance.status] ?? runClearance.status
    : 'Not Done';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/production/execution')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold">Run #{run.run_number}</h2>
            <ProductionStatusBadge status={
              isCompleted ? 'COMPLETED' :
              hasActiveBreakdown ? 'BREAKDOWN' :
              hasActiveSegment ? 'RUNNING' :
              run.status === 'IN_PROGRESS' ? 'STOPPED' :
              run.status
            } />
            <WarehouseApprovalBadge status={run.warehouse_approval_status ?? 'NOT_REQUESTED'} />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {run.date} &middot; {run.line_name} &middot; {run.product}
          {run.required_qty && <> &middot; Qty: {run.required_qty}</>}
          {run.sap_doc_entry && <> &middot; SAP DocEntry: {run.sap_doc_entry}</>}
        </p>
        <div className="flex flex-wrap gap-2">
          {!isCompleted && !hasActiveSegment && !hasActiveBreakdown && (
            <Button
              variant="default"
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              onClick={handleStartProduction}
              disabled={startProduction.isPending || Boolean(startProductionBlockReason)}
              title={startProductionBlockReason}
            >
              <Play className="h-4 w-4 mr-1" /> Start Production
            </Button>
          )}
          {!isCompleted && run.warehouse_approval_status === 'NOT_REQUESTED' && (
            <Button
              variant="outline" size="sm"
              className="border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 hover:text-orange-800"
              disabled={createBOMRequest.isPending}
              onClick={async () => {
                const qty = parseFloat(run.required_qty || '0');
                if (!qty) {
                  toast.error('Set required quantity on the run first');
                  return;
                }
                try {
                  await createBOMRequest.mutateAsync({
                    production_run_id: run.id,
                    required_qty: qty,
                  });
                  toast.success('BOM request submitted to warehouse');
                } catch { /* interceptor handles */ }
              }}
            >
              {createBOMRequest.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
              Submit BOM to WH
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className={
              hasClearedClearance
                ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800'
                : 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800'
            }
            title={`Line Clearance: ${clearanceStatusText}`}
            onClick={() =>
              navigate(
                runClearance
                  ? `/production/execution/line-clearance/${runClearance.id}`
                  : `/production/execution/line-clearance/create?run_id=${run.id}`,
              )
            }
          >
            <Shield className="h-4 w-4 mr-1" /> Line Clearance
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/production/execution/runs/${run.id}/yield`)}>
            <FileText className="h-4 w-4 mr-1" /> Yield
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/production/execution/runs/${run.id}/resources`)}>
            <Link className="h-4 w-4 mr-1" /> Resources
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/production/execution/waste?run_id=${run.id}`)}>
            <Trash2 className="h-4 w-4 mr-1" /> Waste Logs: {wasteLogs.length}
          </Button>
          {!isCompleted && (
            <Button onClick={() => navigate(`/production/execution/runs/${run.id}/yield?complete=true`)} disabled={!canComplete} title={!canComplete ? 'Stop all running segments and resolve all breakdowns first' : undefined}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Complete Run
            </Button>
          )}
          {isCompleted && (
            <Button
              variant="outline" size="sm"
              disabled={
                fgReceiptsLoading ||
                createFGReceipt.isPending ||
                requestFinalQC.isPending ||
                !canEditFGReceipt ||
                Boolean(latestFinalQC && !finalQCGate.canSendFG)
              }
              title={
                !canEditFGReceipt
                  ? 'Warehouse has already received this FG receipt'
                  : finalQCGate.reason
              }
              onClick={async () => {
                if (!finalQCGate.canSendFG) {
                  if (latestFinalQC) {
                    toast.info(finalQCGate.reason || 'Final QC approval is required');
                    return;
                  }
                  try {
                    await requestFinalQC.mutateAsync();
                    toast.success('FG QC approval request sent to QC');
                  } catch {
                    toast.error('Failed to send FG QC request');
                  }
                  return;
                }
                setSelectedFGWarehouse(editableFGReceipt?.warehouse || '');
                setFGWarehouseError('');
                setDialog('fg-receipt');
              }}
            >
              {fgReceiptsLoading || createFGReceipt.isPending || requestFinalQC.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Warehouse className="h-4 w-4 mr-1" />}
              {fgReceiptsLoading
                ? 'Loading FG Receipt...'
                : requestFinalQC.isPending
                  ? 'Sending FG to QC...'
                : finalQCGate.canSendFG
                  ? getFGReceiptButtonLabel(existingFGReceipt)
                  : finalQCGate.actionLabel}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="materials">Materials ({materials.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <Card>
            <CardContent className="p-4">
              <ProductionTimeline
                segments={run.segments}
                breakdowns={run.breakdowns}
                isCompleted={isCompleted}
                ratedSpeed={run.rated_speed ? parseFloat(run.rated_speed) : null}
                onAddBreakdown={openBreakdownDialog}
                onStopProduction={() => setDialog('stop')}
                onResolveBreakdown={handleResolveBreakdown}
                onSegmentClick={handleSegmentClick}
                onBreakdownClick={handleBreakdownClick}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials">
          <Card>
            <CardContent className="p-4">
              <MaterialConsumptionTable
                materials={materials}
                onUpdateClosingQty={handleUpdateClosingQty}
                readOnly={isCompleted}
                actualProduction={isCompleted ? parseFloat(run.total_production || '0') : run.segments.reduce((sum, s) => sum + parseFloat(s.produced_cases || '0'), 0)}
                requiredQty={run.required_qty ? parseFloat(run.required_qty) : undefined}
              />
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Add Breakdown Dialog */}
      <Dialog open={dialog === 'breakdown'} onOpenChange={() => setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Breakdown</DialogTitle></DialogHeader>
          <form onSubmit={breakdownForm.handleSubmit(onSubmitBreakdown)} className="space-y-4">
            <div>
              <Label>Breakdown Type</Label>
              <Select onValueChange={(v) => breakdownForm.setValue('breakdown_category_id', Number(v))}>
                <SelectTrigger><SelectValue placeholder="Select breakdown type" /></SelectTrigger>
                <SelectContent>
                  {breakdownCategories.length === 0 ? (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">No breakdown categories found.</div>
                  ) : (
                    breakdownCategories.map((c) => (<SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="breakdown_machine">Machine</Label>
              <NativeSelect
                id="breakdown_machine"
                value={selectedBreakdownMachineId ? String(selectedBreakdownMachineId) : ''}
                onChange={(event) => {
                  const machineId = event.target.value ? Number(event.target.value) : null;
                  breakdownForm.setValue('machine_id', machineId);
                }}
              >
                <SelectOption value="">Line-level breakdown</SelectOption>
                {machineOptions.map((machine) => (
                  <SelectOption key={machine.id} value={String(machine.id)}>
                    {machine.name} - {machine.machine_type}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="rounded-md border p-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="create_maintenance_work_order"
                  checked={createMaintenanceWork}
                  onCheckedChange={(checked) =>
                    breakdownForm.setValue('create_maintenance_work_order', checked)
                  }
                />
                <Label htmlFor="create_maintenance_work_order">Create maintenance work</Label>
              </div>
              {createMaintenanceWork && (
                <div className="mt-3">
                  <div>
                    <Label htmlFor="breakdown_priority">Maintenance Priority</Label>
                    <NativeSelect
                      id="breakdown_priority"
                      value={breakdownForm.watch('maintenance_priority') ?? 'CRITICAL'}
                      onChange={(event) =>
                        breakdownForm.setValue(
                          'maintenance_priority',
                          event.target.value as AddBreakdownFormData['maintenance_priority'],
                        )
                      }
                    >
                      <SelectOption value="CRITICAL">Critical</SelectOption>
                      <SelectOption value="HIGH">High</SelectOption>
                      <SelectOption value="NORMAL">Normal</SelectOption>
                    </NativeSelect>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    The work order links to the selected machine&apos;s maintenance asset automatically.
                  </p>
                </div>
              )}
            </div>
            <div><Label>Reason</Label><Input {...breakdownForm.register('reason')} /></div>
            <div><Label>Cases Produced</Label><Input type="number" {...breakdownForm.register('produced_cases')} /></div>
            <div><Label>Remarks</Label><Textarea {...breakdownForm.register('remarks')} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
              <Button type="submit" disabled={addBreakdown.isPending}>{addBreakdown.isPending ? 'Saving...' : 'Add Breakdown'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stop Production Dialog */}
      <Dialog open={dialog === 'stop'} onOpenChange={() => setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Stop Production</DialogTitle></DialogHeader>
          <form onSubmit={stopForm.handleSubmit(onSubmitStop)} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              How many cases were produced in this running period?
            </p>
            <div>
              <Label>Cases Produced</Label>
              <Input type="number" step="0.1" {...stopForm.register('produced_cases')} placeholder="0" />
            </div>
            <div>
              <Label>Remarks</Label>
              <Textarea {...stopForm.register('remarks')} placeholder="Optional remarks..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
              <Button type="submit" disabled={stopProduction.isPending}>{stopProduction.isPending ? 'Stopping...' : 'Stop Production'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Segment Detail Dialog */}
      <Dialog open={dialog === 'segment-detail'} onOpenChange={() => setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Running Segment</DialogTitle></DialogHeader>
          {selectedSegment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Start Time</span>
                  <p className="font-medium">{new Date(selectedSegment.start_time).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">End Time</span>
                  <p className="font-medium">{selectedSegment.end_time ? new Date(selectedSegment.end_time).toLocaleString() : 'Running...'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Duration</span>
                  <p className="font-medium">{selectedSegment.duration_minutes} min</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <p className="font-medium">{selectedSegment.is_active ? 'Active' : 'Stopped'}</p>
                </div>
              </div>
              {!selectedSegment.is_active && (
                <div>
                  <span className="text-sm text-muted-foreground">Cases Produced</span>
                  <p className="font-medium">{selectedSegment.produced_cases}</p>
                </div>
              )}
              <div>
                <Label>Remarks</Label>
                <Textarea value={editRemarks} onChange={(e) => setEditRemarks(e.target.value)} placeholder="Add remarks..." />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
                <Button onClick={handleSaveSegmentRemarks} disabled={updateSegment.isPending}>
                  {updateSegment.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Breakdown Detail Dialog */}
      <Dialog open={dialog === 'breakdown-detail'} onOpenChange={() => setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Breakdown Details</DialogTitle></DialogHeader>
          {selectedBreakdown && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Type</span>
                  <p className="font-medium">{selectedBreakdown.breakdown_category_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Start Time</span>
                  <p className="font-medium">{new Date(selectedBreakdown.start_time).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">End Time</span>
                  <p className="font-medium">{selectedBreakdown.end_time ? new Date(selectedBreakdown.end_time).toLocaleString() : 'Ongoing...'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Duration</span>
                  <p className="font-medium">{selectedBreakdown.breakdown_minutes} min</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Machine</span>
                  <p className="font-medium">{selectedBreakdown.machine_name || 'Line-level'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Maintenance Work</span>
                  <p className="font-medium">
                    {selectedBreakdown.maintenance_work_order_no || 'Not created'}
                  </p>
                </div>
              </div>
              {selectedBreakdown.maintenance_work_order_id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    navigate(`/maintenance/work-orders/${selectedBreakdown.maintenance_work_order_id}`)
                  }
                >
                  Open Maintenance Work
                </Button>
              )}
              <div>
                <span className="text-sm text-muted-foreground">Reason</span>
                <p className="text-sm font-medium">{selectedBreakdown.reason}</p>
              </div>
              <div>
                <Label>Remarks</Label>
                <Textarea value={editRemarks} onChange={(e) => setEditRemarks(e.target.value)} placeholder="Add remarks..." />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
                <Button onClick={handleSaveBreakdownRemarks} disabled={updateBreakdownRemarks.isPending}>
                  {updateBreakdownRemarks.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Material Dialog */}
      <Dialog open={dialog === 'material'} onOpenChange={() => setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Material</DialogTitle></DialogHeader>
          <form onSubmit={materialForm.handleSubmit(onSubmitMaterial)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Material Code</Label><Input {...materialForm.register('material_code')} /></div>
              <div><Label>Material Name</Label><Input {...materialForm.register('material_name')} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Opening Qty</Label><Input {...materialForm.register('opening_qty')} /></div>
              <div><Label>Issued Qty</Label><Input {...materialForm.register('issued_qty')} /></div>
              <div><Label>Closing Qty</Label><Input {...materialForm.register('closing_qty')} placeholder="Optional" /></div>
            </div>
            <div>
              <Label>UoM</Label><Input {...materialForm.register('uom')} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
              <Button type="submit" disabled={createMaterial.isPending}>{createMaterial.isPending ? 'Saving...' : 'Add Material'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* FG Receipt Dialog */}
      <Dialog open={dialog === 'fg-receipt'} onOpenChange={(open) => { if (!open) setDialog(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editableFGReceipt ? 'Edit FG Receipt' : 'Create FG Receipt'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Run</span>
                <p className="font-medium">#{run.run_number}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Posting Date</span>
                <p className="font-medium">{run.date}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Product</span>
                <p className="font-medium">{run.product}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Good Qty</span>
                <p className="font-medium">
                  {(parseFloat(run.total_production || '0') - parseFloat(run.rejected_qty || '0')).toLocaleString()}
                </p>
              </div>
            </div>

            <SearchableSelect<SAPWarehouse>
              value={selectedFGWarehouse}
              items={fgWarehouses}
              isLoading={fgWarehousesLoading}
              isError={fgWarehousesError}
              label="Warehouse"
              required
              inputId="fg-receipt-warehouse"
              placeholder="Select warehouse..."
              getItemKey={(wh) => wh.warehouse_code}
              getItemLabel={(wh) => `${wh.warehouse_code} - ${wh.warehouse_name}`}
              filterFn={(wh, search) => {
                const term = search.toLowerCase();
                return (
                  wh.warehouse_code.toLowerCase().includes(term) ||
                  wh.warehouse_name.toLowerCase().includes(term)
                );
              }}
              renderItem={(wh) => (
                <div>
                  <span className="text-sm font-medium">{wh.warehouse_code}</span>
                  <span className="text-xs text-muted-foreground ml-2">{wh.warehouse_name}</span>
                </div>
              )}
              onItemSelect={(wh) => {
                setSelectedFGWarehouse(wh.warehouse_code);
                setFGWarehouseError('');
              }}
              onClear={() => {
                setSelectedFGWarehouse('');
                setFGWarehouseError('');
              }}
              loadingText="Loading warehouses..."
              emptyText="No warehouses found"
              notFoundText="No matching warehouses"
              errorText="Failed to load warehouses"
              error={fgWarehouseError}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
              <Button type="button" onClick={handleCreateFGReceipt} disabled={createFGReceipt.isPending || fgWarehousesLoading}>
                {createFGReceipt.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                {editableFGReceipt ? 'Save Receipt' : 'Create Receipt'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Labour Dialog */}
      <Dialog open={dialog === 'labour'} onOpenChange={(open) => { if (!open) { setDialog(null); setEditingLabour(null); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingLabour ? 'Edit Labour' : 'Labour'}</DialogTitle></DialogHeader>
          {!editingLabour && (
            <>
              {labourEntries.length > 0 && (
                <div className="overflow-x-auto max-h-60 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2 font-medium">Description</th>
                        <th className="text-right p-2 font-medium">Workers</th>
                        <th className="text-right p-2 font-medium">Hours</th>
                        <th className="text-right p-2 font-medium">Rate/hr</th>
                        <th className="text-right p-2 font-medium">Total</th>
                        {!isCompleted && <th className="p-2 w-20" />}
                      </tr>
                    </thead>
                    <tbody>
                      {labourEntries.map((e) => (
                        <tr key={e.id} className="border-b">
                          <td className="p-2">{e.description || 'Workers'}</td>
                          <td className="p-2 text-right">{e.worker_count}</td>
                          <td className="p-2 text-right">{e.hours_worked}</td>
                          <td className="p-2 text-right">₹{e.rate_per_hour}</td>
                          <td className="p-2 text-right font-medium">₹{parseFloat(e.total_cost).toLocaleString()}</td>
                          {!isCompleted && (
                            <td className="p-2">
                              <div className="flex items-center gap-1 justify-end">
                                <Button variant="ghost" size="sm" onClick={() => openEditLabour(e)}><Pencil className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteLabour(e.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {!isCompleted && (
                <Button size="sm" onClick={() => { setEditingLabour(null); labourForm.reset({ worker_count: 1, description: '', hours_worked: '', rate_per_hour: '' }); setEditingLabour({ id: -1 } as ResourceLabour); }}>
                  <Plus className="h-4 w-4 mr-1" /> Add Labour Entry
                </Button>
              )}
              {labourEntries.length === 0 && isCompleted && (
                <p className="text-sm text-muted-foreground text-center py-4">No labour entries</p>
              )}
            </>
          )}
          {editingLabour && (
            <form onSubmit={labourForm.handleSubmit(async (d) => {
              try {
                if (editingLabour.id !== -1) {
                  await updateLabourMut.mutateAsync({ entryId: editingLabour.id, data: d });
                  toast.success('Updated');
                } else {
                  await addLabour.mutateAsync(d);
                  toast.success('Added');
                }
                setEditingLabour(null);
                labourForm.reset({ worker_count: 1 });
              } catch { toast.error('Failed'); }
            })} className="space-y-4">
              <div><Label>Description</Label><Input {...labourForm.register('description')} placeholder="e.g., Skilled labourers, Helpers" /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Workers</Label><Input type="number" {...labourForm.register('worker_count', { valueAsNumber: true })} /></div>
                <div><Label>Hours Worked</Label><Input {...labourForm.register('hours_worked')} /></div>
                <div><Label>Rate/hr (₹)</Label><Input {...labourForm.register('rate_per_hour')} /></div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingLabour(null)}>Cancel</Button>
                <Button type="submit">{editingLabour.id !== -1 ? 'Save' : 'Add'}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default RunDetailPage;
