import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, FileText, Link, Loader2, Pencil, Play, Plus, Send, Shield, Trash2, Warehouse } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Button, Card, CardContent, CardHeader, CardTitle,
  Dialog, DialogContent, DialogHeader, DialogTitle,
  Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Tabs, TabsContent, TabsList, TabsTrigger, Textarea,
} from '@/shared/components/ui';

import {
  useRunDetail, useRunCost, useLabour, useCreateLabour, useUpdateLabour, useDeleteLabour,
  useMaterials, useCreateMaterial, useUpdateMaterial,
  useStartProduction, useStopProduction, useAddBreakdown, useResolveBreakdown,
  useUpdateSegment, useUpdateBreakdownRemarks,
  useBreakdownCategories,
  useLineClearances, useWasteLogs,
} from '../api';
import { useProductionQCRunSessions } from '@/modules/qc/api/productionQC';
import { ProductionStatusBadge } from '../components/ProductionStatusBadge';
import { RunSummaryCards } from '../components/RunSummaryCards';
import { ProductionTimeline } from '../components/ProductionTimeline';
import { MaterialConsumptionTable } from '../components/MaterialConsumptionTable';
import {
  addBreakdownSchema, type AddBreakdownFormData,
  stopProductionSchema, type StopProductionFormData,
  createMaterialSchema, type CreateMaterialFormData,
  createLabourSchema, type CreateLabourFormData,
} from '../schemas';
import type { MachineBreakdown, ProductionSegment, ResourceLabour } from '../types';
import { useCreateBOMRequest, useCreateFGReceipt } from '@/modules/warehouse/api';

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

function RunDetailPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const numRunId = Number(runId);

  // ---------------------------------------------------------------------------
  // Data hooks
  // ---------------------------------------------------------------------------
  const { data: run, isLoading } = useRunDetail(numRunId || null);
  const { data: materials = [] } = useMaterials(numRunId);
  const { data: cost } = useRunCost(numRunId);
  const { data: labourEntries = [] } = useLabour(numRunId);
  const { data: breakdownCategories = [] } = useBreakdownCategories();
  const { data: clearances = [] } = useLineClearances(run?.line);
  const { data: wasteLogs = [] } = useWasteLogs(numRunId);

  const { data: qcSessions = [] } = useProductionQCRunSessions(numRunId || null);

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
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [dialog, setDialog] = useState<'breakdown' | 'stop' | 'material' | 'segment-detail' | 'breakdown-detail' | 'labour' | null>(null);
  const [editingLabour, setEditingLabour] = useState<ResourceLabour | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<ProductionSegment | null>(null);
  const [selectedBreakdown, setSelectedBreakdown] = useState<MachineBreakdown | null>(null);
  const [editRemarks, setEditRemarks] = useState('');
  const [editProducedCases, setEditProducedCases] = useState('');
  const isCompleted = run?.status === 'COMPLETED';
  const hasActiveSegment = run?.segments?.some((s) => s.is_active) ?? false;
  const hasActiveBreakdown = run?.breakdowns?.some((b) => b.is_active) ?? false;
  const canComplete = !hasActiveSegment && !hasActiveBreakdown && run?.status === 'IN_PROGRESS';

  // ---------------------------------------------------------------------------
  // Breakdown form
  // ---------------------------------------------------------------------------
  const breakdownForm = useForm<AddBreakdownFormData>({
    resolver: zodResolver(addBreakdownSchema),
    defaultValues: { produced_cases: '0', remarks: '' },
  });
  const onSubmitBreakdown = async (data: AddBreakdownFormData) => {
    try {
      await addBreakdown.mutateAsync(data);
      toast.success('Breakdown added');
      setDialog(null);
      breakdownForm.reset();
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
      await stopProduction.mutateAsync({ produced_cases: data.produced_cases });
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
  const openLabourDialog = () => { setEditingLabour(null); labourForm.reset({ worker_count: 1 }); setDialog('labour'); };
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
    setEditProducedCases(segment.produced_cases || '0');
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
          {!isCompleted && run.warehouse_approval_status === 'NOT_REQUESTED' && (
            <Button
              variant="outline" size="sm"
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
              Submit BOM to Warehouse
            </Button>
          )}
          {!isCompleted && !hasActiveSegment && !hasActiveBreakdown && (
            <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleStartProduction} disabled={startProduction.isPending || run.warehouse_approval_status === 'PENDING' || run.warehouse_approval_status === 'REJECTED'}>
              <Play className="h-4 w-4 mr-1" /> Start Production
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate(`/production/execution/runs/${run.id}/yield`)}>
            <FileText className="h-4 w-4 mr-1" /> Yield
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/production/execution/runs/${run.id}/resources`)}>
            <Link className="h-4 w-4 mr-1" /> Resources
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/qc/production/runs/${run.id}`)}>
            <CheckCircle2 className="h-4 w-4 mr-1" /> QC
          </Button>
          {!isCompleted && (
            <Button onClick={() => navigate(`/production/execution/runs/${run.id}/yield?complete=true`)} disabled={!canComplete} title={!canComplete ? 'Stop all running segments and resolve all breakdowns first' : undefined}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Complete Run
            </Button>
          )}
          {isCompleted && (
            <Button
              variant="outline" size="sm"
              disabled={createFGReceipt.isPending}
              onClick={async () => {
                try {
                  await createFGReceipt.mutateAsync({
                    production_run_id: run.id,
                    posting_date: run.date,
                  });
                  toast.success('FG receipt created — warehouse notified');
                } catch { /* interceptor handles */ }
              }}
            >
              {createFGReceipt.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Warehouse className="h-4 w-4 mr-1" />}
              Create FG Receipt
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <RunSummaryCards run={run} />

      {/* Manpower & Cost Summary */}
      {(() => {
        const actualLabourCount = labourEntries.reduce((sum, e) => sum + e.worker_count, 0);
        const plannedLabour = run.labour_count;
        const c = cost ? { labour: parseFloat(cost.labour_cost), total: parseFloat(cost.total_cost), perUnit: parseFloat(cost.per_unit_cost) } : null;
        return (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={openLabourDialog}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Labour</span>
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                {actualLabourCount > 0 ? (
                  <>
                    <p className="text-lg font-bold">{actualLabourCount}</p>
                    <p className="text-xs text-muted-foreground">planned: {plannedLabour}</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-bold text-muted-foreground">{plannedLabour}</p>
                    <p className="text-xs text-amber-600">planned (no actual added)</p>
                  </>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground mb-1">Other Manpower</div>
                <p className="text-lg font-bold">{run.other_manpower_count}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground mb-1">Supervisor</div>
                <p className="text-sm font-medium truncate">{run.supervisor || '-'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground mb-1">Labour Cost</div>
                <p className="text-lg font-bold">{c ? `₹${c.labour.toLocaleString()}` : '₹0'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground mb-1">Total Cost</div>
                <p className="text-lg font-bold text-green-600">{c ? `₹${c.total.toLocaleString()}` : '₹0'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground mb-1">Per Unit Cost</div>
                <p className="text-lg font-bold">{c && c.perUnit > 0 ? `₹${c.perUnit.toFixed(2)}` : '-'}</p>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* Status Indicators */}
      <div className="flex flex-wrap gap-3">
        {/* Line Clearance Status */}
        {(() => {
          const runClearance = clearances.find(
            (c) => c.production_run === run.id
          );
          if (!runClearance) {
            return (
              <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-3 py-2 text-sm">
                <Shield className="h-4 w-4 text-amber-600" />
                <span className="text-amber-800 dark:text-amber-200">Line Clearance: <span className="font-medium">Not Done</span></span>
                <Button variant="link" size="sm" className="h-auto p-0 text-amber-700" onClick={() => navigate(`/production/execution/line-clearance/create?run_id=${run.id}`)}>Create</Button>
              </div>
            );
          }
          const statusColors = {
            DRAFT: 'border-gray-300 bg-gray-50 dark:bg-gray-950/20 dark:border-gray-800',
            SUBMITTED: 'border-blue-300 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800',
            CLEARED: 'border-green-300 bg-green-50 dark:bg-green-950/20 dark:border-green-800',
            NOT_CLEARED: 'border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-800',
          };
          const statusText = { DRAFT: 'Draft', SUBMITTED: 'Submitted', CLEARED: 'Cleared', NOT_CLEARED: 'Not Cleared' };
          return (
            <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${statusColors[runClearance.status]}`}>
              <Shield className="h-4 w-4" />
              <span>Line Clearance: <span className="font-medium">{statusText[runClearance.status]}</span></span>
              <Button variant="link" size="sm" className="h-auto p-0" onClick={() => navigate(`/production/execution/line-clearance/${runClearance.id}`)}>View</Button>
            </div>
          );
        })()}

        {/* Waste Logs */}
        <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
          <Trash2 className="h-4 w-4 text-muted-foreground" />
          <span>Waste Logs: <span className="font-medium">{wasteLogs.length}</span></span>
          <Button variant="link" size="sm" className="h-auto p-0" onClick={() => navigate(`/production/execution/waste?run_id=${run.id}`)}>
            {wasteLogs.length > 0 ? 'View' : 'Log Waste'}
          </Button>
        </div>

      </div>

      {/* Tabs */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="materials">Materials ({materials.length})</TabsTrigger>
          <TabsTrigger value="qc">QC ({qcSessions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <Card>
            <CardContent className="p-4">
              <ProductionTimeline
                segments={run.segments}
                breakdowns={run.breakdowns}
                isCompleted={isCompleted}
                ratedSpeed={run.rated_speed ? parseFloat(run.rated_speed) : null}
                onAddBreakdown={() => setDialog('breakdown')}
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
              <MaterialConsumptionTable materials={materials} onUpdateClosingQty={handleUpdateClosingQty} readOnly={isCompleted} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qc">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Quality Control Sessions</h3>
                <Button size="sm" variant="outline" onClick={() => navigate(`/qc/production/runs/${run.id}`)}>
                  Open QC Page
                </Button>
              </div>
              {qcSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No QC sessions recorded for this run
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2 font-medium">Round</th>
                      <th className="text-left p-2 font-medium">Type</th>
                      <th className="text-left p-2 font-medium">Material Type</th>
                      <th className="text-left p-2 font-medium">Checked At</th>
                      <th className="text-center p-2 font-medium">Parameters</th>
                      <th className="text-left p-2 font-medium">Status</th>
                      <th className="text-left p-2 font-medium">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {qcSessions.map((s) => (
                      <tr
                        key={s.id}
                        className="border-b cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/qc/production/sessions/${s.id}`)}
                      >
                        <td className="p-2 font-medium">#{s.session_number}</td>
                        <td className="p-2">
                          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                            s.session_type === 'FINAL'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                              : 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400'
                          }`}>
                            {s.session_type === 'FINAL' ? 'Final' : 'In-Process'}
                          </span>
                        </td>
                        <td className="p-2 text-muted-foreground">{s.material_type_name}</td>
                        <td className="p-2 text-muted-foreground text-xs">{new Date(s.checked_at).toLocaleString()}</td>
                        <td className="p-2 text-center">{s.pass_count}/{s.total_params}</td>
                        <td className="p-2">
                          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                            s.workflow_status === 'SUBMITTED'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                          }`}>
                            {s.workflow_status === 'SUBMITTED' ? 'Submitted' : 'Draft'}
                          </span>
                        </td>
                        <td className="p-2">
                          {s.overall_result ? (
                            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                              s.overall_result === 'PASS'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {s.overall_result}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
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
              </div>
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
