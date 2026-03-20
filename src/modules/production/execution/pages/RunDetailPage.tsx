import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, FileText, Link } from 'lucide-react';
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
  useRunDetail, useCompleteRun,
  useCreateLog, useLogs,
  useBreakdowns, useCreateBreakdown,
  useMaterials, useCreateMaterial,
  useMachineRuntime, useCreateMachineRuntime,
  useManpower, useCreateManpower,
  useMachines,
} from '../api';
import { ProductionStatusBadge } from '../components/ProductionStatusBadge';
import { RunSummaryCards } from '../components/RunSummaryCards';
import { HourlyProductionGrid } from '../components/HourlyProductionGrid';
import { BreakdownTable } from '../components/BreakdownTable';
import { MaterialConsumptionTable } from '../components/MaterialConsumptionTable';
import { MachineTimeTable } from '../components/MachineTimeTable';
import { ManpowerSection } from '../components/ManpowerSection';
import { TIME_SLOTS, MACHINE_STATUS_LABELS, MACHINE_TYPE_LABELS, SHIFT_LABELS, BREAKDOWN_TYPE_LABELS } from '../constants';
import { createLogSchema, type CreateLogFormData, createBreakdownSchema, type CreateBreakdownFormData, createMaterialSchema, type CreateMaterialFormData, createRuntimeSchema, type CreateRuntimeFormData, createManpowerSchema, type CreateManpowerFormData } from '../schemas';
import type { MachineStatus, MachineType, BreakdownType, Shift } from '../types';

function RunDetailPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const numRunId = Number(runId);

  const { data: run, isLoading } = useRunDetail(numRunId || null);
  const { data: logs = [] } = useLogs(numRunId);
  const { data: breakdowns = [] } = useBreakdowns(numRunId);
  const { data: materials = [] } = useMaterials(numRunId);
  const { data: runtimes = [] } = useMachineRuntime(numRunId);
  const { data: manpowerEntries = [] } = useManpower(numRunId);
  const { data: machines = [] } = useMachines(run?.line);

  const completeRun = useCompleteRun(numRunId);
  const createLog = useCreateLog(numRunId);
  const createBreakdown = useCreateBreakdown(numRunId);
  const createMaterial = useCreateMaterial(numRunId);
  const createRuntime = useCreateMachineRuntime(numRunId);
  const createManpower = useCreateManpower(numRunId);

  const [dialog, setDialog] = useState<string | null>(null);
  const isCompleted = run?.status === 'COMPLETED';

  // Log form
  const logForm = useForm<CreateLogFormData>({ resolver: zodResolver(createLogSchema), defaultValues: { produced_cases: 0, recd_minutes: 60, machine_status: 'RUNNING' } });
  const onSubmitLog = async (data: CreateLogFormData) => {
    try { await createLog.mutateAsync(data); toast.success('Log entry added'); setDialog(null); logForm.reset(); } catch { toast.error('Failed to add log'); }
  };

  // Breakdown form
  const breakdownForm = useForm<CreateBreakdownFormData>({ resolver: zodResolver(createBreakdownSchema), defaultValues: { breakdown_minutes: 0, type: 'LINE', is_unrecovered: false } });
  const onSubmitBreakdown = async (data: CreateBreakdownFormData) => {
    try { await createBreakdown.mutateAsync(data); toast.success('Breakdown logged'); setDialog(null); breakdownForm.reset(); } catch { toast.error('Failed to log breakdown'); }
  };

  // Material form
  const materialForm = useForm<CreateMaterialFormData>({ resolver: zodResolver(createMaterialSchema), defaultValues: { batch_number: 1 } });
  const onSubmitMaterial = async (data: CreateMaterialFormData) => {
    try { await createMaterial.mutateAsync(data); toast.success('Material added'); setDialog(null); materialForm.reset(); } catch { toast.error('Failed to add material'); }
  };

  // Runtime form
  const runtimeForm = useForm<CreateRuntimeFormData>({ resolver: zodResolver(createRuntimeSchema), defaultValues: { runtime_minutes: 0, downtime_minutes: 0 } });
  const onSubmitRuntime = async (data: CreateRuntimeFormData) => {
    try { await createRuntime.mutateAsync(data); toast.success('Runtime entry added'); setDialog(null); runtimeForm.reset(); } catch { toast.error('Failed to add runtime'); }
  };

  // Manpower form
  const manpowerForm = useForm<CreateManpowerFormData>({ resolver: zodResolver(createManpowerSchema), defaultValues: { worker_count: 1, shift: 'MORNING' } });
  const onSubmitManpower = async (data: CreateManpowerFormData) => {
    try { await createManpower.mutateAsync(data); toast.success('Manpower entry added'); setDialog(null); manpowerForm.reset(); } catch { toast.error('Failed to add manpower'); }
  };

  const handleComplete = async () => {
    if (!confirm('Complete this production run? This action cannot be undone.')) return;
    try { await completeRun.mutateAsync(); toast.success('Run completed'); } catch { toast.error('Failed to complete run'); }
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading run details...</div>;
  if (!run) return <div className="p-8 text-center text-muted-foreground">Run not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/production/execution')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">Run #{run.run_number}</h2>
            <ProductionStatusBadge status={run.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {run.date} &middot; {run.line_name} &middot; {run.brand} - {run.pack}
            {run.sap_order_no && <> &middot; SAP: {run.sap_order_no}</>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/production/execution/runs/${run.id}/yield`)}>
            <FileText className="h-4 w-4 mr-1" /> Yield
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/production/execution/runs/${run.id}/resources`)}>
            <Link className="h-4 w-4 mr-1" /> Resources
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/production/execution/runs/${run.id}/qc`)}>
            <CheckCircle2 className="h-4 w-4 mr-1" /> QC
          </Button>
          {!isCompleted && (
            <Button onClick={handleComplete} disabled={completeRun.isPending}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Complete Run
            </Button>
          )}
        </div>
      </div>

      <RunSummaryCards run={run} />

      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs">Hourly Logs ({logs.length})</TabsTrigger>
          <TabsTrigger value="breakdowns">Breakdowns ({breakdowns.length})</TabsTrigger>
          <TabsTrigger value="materials">Materials ({materials.length})</TabsTrigger>
          <TabsTrigger value="runtime">Machine Runtime ({runtimes.length})</TabsTrigger>
          <TabsTrigger value="manpower">Manpower ({manpowerEntries.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="logs">
          <Card>
            <CardContent className="p-4">
              <HourlyProductionGrid logs={logs} onAdd={() => setDialog('log')} readOnly={isCompleted} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdowns">
          <Card>
            <CardContent className="p-4">
              <BreakdownTable breakdowns={breakdowns} onAdd={() => setDialog('breakdown')} readOnly={isCompleted} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials">
          <Card>
            <CardContent className="p-4">
              <MaterialConsumptionTable materials={materials} onAdd={() => setDialog('material')} readOnly={isCompleted} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="runtime">
          <Card>
            <CardContent className="p-4">
              <MachineTimeTable runtimes={runtimes} onAdd={() => setDialog('runtime')} readOnly={isCompleted} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manpower">
          <Card>
            <CardContent className="p-4">
              <ManpowerSection entries={manpowerEntries} onAdd={() => setDialog('manpower')} readOnly={isCompleted} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Log Dialog */}
      <Dialog open={dialog === 'log'} onOpenChange={() => setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Hourly Log</DialogTitle></DialogHeader>
          <form onSubmit={logForm.handleSubmit(onSubmitLog)} className="space-y-4">
            <div>
              <Label>Time Slot</Label>
              <Select onValueChange={(v) => { const slot = TIME_SLOTS.find(s => s.slot === v); if (slot) { logForm.setValue('time_slot', slot.slot); logForm.setValue('time_start', slot.start); logForm.setValue('time_end', slot.end); } }}>
                <SelectTrigger><SelectValue placeholder="Select time slot" /></SelectTrigger>
                <SelectContent>{TIME_SLOTS.map((s) => (<SelectItem key={s.slot} value={s.slot}>{s.slot}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Produced Cases</Label><Input type="number" {...logForm.register('produced_cases', { valueAsNumber: true })} /></div>
              <div><Label>Recd Minutes</Label><Input type="number" {...logForm.register('recd_minutes', { valueAsNumber: true })} /></div>
            </div>
            <div>
              <Label>Machine Status</Label>
              <Select onValueChange={(v) => logForm.setValue('machine_status', v as MachineStatus)}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>{(Object.keys(MACHINE_STATUS_LABELS) as MachineStatus[]).map((s) => (<SelectItem key={s} value={s}>{MACHINE_STATUS_LABELS[s]}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div><Label>Remarks</Label><Textarea {...logForm.register('remarks')} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
              <Button type="submit" disabled={createLog.isPending}>{createLog.isPending ? 'Saving...' : 'Add Entry'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Breakdown Dialog */}
      <Dialog open={dialog === 'breakdown'} onOpenChange={() => setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Breakdown</DialogTitle></DialogHeader>
          <form onSubmit={breakdownForm.handleSubmit(onSubmitBreakdown)} className="space-y-4">
            <div>
              <Label>Machine</Label>
              <Select onValueChange={(v) => breakdownForm.setValue('machine_id', Number(v))}>
                <SelectTrigger><SelectValue placeholder="Select machine" /></SelectTrigger>
                <SelectContent>{machines?.map((m) => (<SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Start Time</Label><Input type="datetime-local" {...breakdownForm.register('start_time')} /></div>
              <div><Label>End Time</Label><Input type="datetime-local" {...breakdownForm.register('end_time')} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Minutes</Label><Input type="number" {...breakdownForm.register('breakdown_minutes', { valueAsNumber: true })} /></div>
              <div>
                <Label>Type</Label>
                <Select onValueChange={(v) => breakdownForm.setValue('type', v as BreakdownType)}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>{(Object.keys(BREAKDOWN_TYPE_LABELS) as BreakdownType[]).map((t) => (<SelectItem key={t} value={t}>{BREAKDOWN_TYPE_LABELS[t]}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Reason</Label><Input {...breakdownForm.register('reason')} /></div>
            <div><Label>Remarks</Label><Textarea {...breakdownForm.register('remarks')} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
              <Button type="submit" disabled={createBreakdown.isPending}>{createBreakdown.isPending ? 'Saving...' : 'Log Breakdown'}</Button>
            </div>
          </form>
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
              <div><Label>Closing Qty</Label><Input {...materialForm.register('closing_qty')} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>UoM</Label><Input {...materialForm.register('uom')} /></div>
              <div><Label>Batch Number</Label><Input type="number" {...materialForm.register('batch_number', { valueAsNumber: true })} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
              <Button type="submit" disabled={createMaterial.isPending}>{createMaterial.isPending ? 'Saving...' : 'Add Material'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Runtime Dialog */}
      <Dialog open={dialog === 'runtime'} onOpenChange={() => setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Machine Runtime</DialogTitle></DialogHeader>
          <form onSubmit={runtimeForm.handleSubmit(onSubmitRuntime)} className="space-y-4">
            <div>
              <Label>Machine</Label>
              <Select onValueChange={(v) => { const m = machines?.find(x => x.id === Number(v)); if (m) { runtimeForm.setValue('machine_id', m.id); runtimeForm.setValue('machine_type', m.machine_type); } }}>
                <SelectTrigger><SelectValue placeholder="Select machine" /></SelectTrigger>
                <SelectContent>{machines?.map((m) => (<SelectItem key={m.id} value={String(m.id)}>{m.name} ({MACHINE_TYPE_LABELS[m.machine_type]})</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Runtime (min)</Label><Input type="number" {...runtimeForm.register('runtime_minutes', { valueAsNumber: true })} /></div>
              <div><Label>Downtime (min)</Label><Input type="number" {...runtimeForm.register('downtime_minutes', { valueAsNumber: true })} /></div>
            </div>
            <div><Label>Remarks</Label><Textarea {...runtimeForm.register('remarks')} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
              <Button type="submit" disabled={createRuntime.isPending}>{createRuntime.isPending ? 'Saving...' : 'Add Entry'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manpower Dialog */}
      <Dialog open={dialog === 'manpower'} onOpenChange={() => setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Manpower</DialogTitle></DialogHeader>
          <form onSubmit={manpowerForm.handleSubmit(onSubmitManpower)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Shift</Label>
                <Select onValueChange={(v) => manpowerForm.setValue('shift', v as Shift)} defaultValue="MORNING">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.keys(SHIFT_LABELS) as Shift[]).map((s) => (<SelectItem key={s} value={s}>{SHIFT_LABELS[s]}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div><Label>Worker Count</Label><Input type="number" {...manpowerForm.register('worker_count', { valueAsNumber: true })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Supervisor</Label><Input {...manpowerForm.register('supervisor')} /></div>
              <div><Label>Engineer</Label><Input {...manpowerForm.register('engineer')} /></div>
            </div>
            <div><Label>Remarks</Label><Textarea {...manpowerForm.register('remarks')} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
              <Button type="submit" disabled={createManpower.isPending}>{createManpower.isPending ? 'Saving...' : 'Add Entry'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default RunDetailPage;
