import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui';

import {
  useCompressedAir,
  useCreateCompressedAir,
  useCreateElectricity,
  useCreateGas,
  useCreateLabour,
  useCreateMachineCost,
  useCreateOverhead,
  useCreateWater,
  useDeleteCompressedAir,
  useDeleteElectricity,
  useDeleteGas,
  useDeleteLabour,
  useDeleteMachineCost,
  useDeleteOverhead,
  useDeleteWater,
  useElectricity,
  useGas,
  useLabour,
  useMachineCosts,
  useOverhead,
  useRunCost,
  useRunDetail,
  useUpdateCompressedAir,
  useUpdateElectricity,
  useUpdateGas,
  useUpdateLabour,
  useUpdateMachineCost,
  useUpdateOverhead,
  useUpdateWater,
  useWater,
} from '../api';
import {
  type CreateCompressedAirFormData,
  createCompressedAirSchema,
  type CreateElectricityFormData,
  createElectricitySchema,
  type CreateGasFormData,
  createGasSchema,
  type CreateLabourFormData,
  createLabourSchema,
  type CreateMachineCostFormData,
  createMachineCostSchema,
  type CreateOverheadFormData,
  createOverheadSchema,
  type CreateWaterFormData,
  createWaterSchema,
} from '../schemas';

function ResourceTrackingPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const numRunId = Number(runId);

  const { data: run } = useRunDetail(numRunId || null);
  const { data: cost } = useRunCost(numRunId);

  const { data: labour = [] } = useLabour(numRunId);
  const { data: electricity = [] } = useElectricity(numRunId);
  const { data: water = [] } = useWater(numRunId);
  const { data: gas = [] } = useGas(numRunId);
  const { data: compressedAir = [] } = useCompressedAir(numRunId);
  const { data: machineCosts = [] } = useMachineCosts(numRunId);
  const { data: overhead = [] } = useOverhead(numRunId);

  const addLabour = useCreateLabour(numRunId);
  const updateLabour = useUpdateLabour(numRunId);
  const removeLabour = useDeleteLabour(numRunId);
  const addElectricity = useCreateElectricity(numRunId);
  const updateElectricity = useUpdateElectricity(numRunId);
  const removeElectricity = useDeleteElectricity(numRunId);
  const addWater = useCreateWater(numRunId);
  const updateWater = useUpdateWater(numRunId);
  const removeWater = useDeleteWater(numRunId);
  const addGas = useCreateGas(numRunId);
  const updateGas = useUpdateGas(numRunId);
  const removeGas = useDeleteGas(numRunId);
  const addAir = useCreateCompressedAir(numRunId);
  const updateAir = useUpdateCompressedAir(numRunId);
  const removeAir = useDeleteCompressedAir(numRunId);
  const addMachineCost = useCreateMachineCost(numRunId);
  const updateMachineCostMut = useUpdateMachineCost(numRunId);
  const removeMachineCost = useDeleteMachineCost(numRunId);
  const addOverhead = useCreateOverhead(numRunId);
  const updateOverheadMut = useUpdateOverhead(numRunId);
  const removeOverhead = useDeleteOverhead(numRunId);

  const [dialog, setDialog] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<{ type: string; id: number } | null>(null);

  const labourForm = useForm<CreateLabourFormData>({ resolver: zodResolver(createLabourSchema), defaultValues: { worker_count: 1 } });
  const elecForm = useForm<CreateElectricityFormData>({ resolver: zodResolver(createElectricitySchema) });
  const waterForm = useForm<CreateWaterFormData>({ resolver: zodResolver(createWaterSchema) });
  const gasForm = useForm<CreateGasFormData>({ resolver: zodResolver(createGasSchema) });
  const airForm = useForm<CreateCompressedAirFormData>({ resolver: zodResolver(createCompressedAirSchema) });
  const machCostForm = useForm<CreateMachineCostFormData>({ resolver: zodResolver(createMachineCostSchema) });
  const overheadForm = useForm<CreateOverheadFormData>({ resolver: zodResolver(createOverheadSchema) });

  const handleDelete = async (type: string, id: number) => {
    if (!confirm('Delete this entry?')) return;
    try {
      if (type === 'labour') await removeLabour.mutateAsync(id);
      else if (type === 'electricity') await removeElectricity.mutateAsync(id);
      else if (type === 'water') await removeWater.mutateAsync(id);
      else if (type === 'gas') await removeGas.mutateAsync(id);
      else if (type === 'air') await removeAir.mutateAsync(id);
      else if (type === 'machine') await removeMachineCost.mutateAsync(id);
      else if (type === 'overhead') await removeOverhead.mutateAsync(id);
      toast.success('Deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  const closeDialog = () => {
    setDialog(null);
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      <DashboardHeader
        title={`Resource Tracking — Run #${run?.run_number || ''}`}
        description={run ? `${run.date} · ${run.line_name} · ${run.product}` : ''}
      />

      {(() => {
        const c = cost ?? { labour_cost: '0.00', machine_cost: '0.00', electricity_cost: '0.00', water_cost: '0.00', gas_cost: '0.00', compressed_air_cost: '0.00', overhead_cost: '0.00', total_cost: '0.00', per_unit_cost: '0.0000' };
        const isCompleted = run?.status === 'COMPLETED';
        const totalCost = parseFloat(c.total_cost || '0');

        let estimatedPerUnit: number | null = null;
        if (!isCompleted && run?.segments) {
          const segmentProduction = run.segments.reduce(
            (sum, s) => sum + parseFloat(s.produced_cases || '0'), 0
          );
          if (segmentProduction > 0 && totalCost > 0) {
            estimatedPerUnit = totalCost / segmentProduction;
          }
        }

        const backendPerUnit = parseFloat(c.per_unit_cost || '0');
        const perUnitDisplay = isCompleted
          ? c.per_unit_cost
          : estimatedPerUnit != null
            ? `~${estimatedPerUnit.toFixed(2)} (estimated)`
            : backendPerUnit > 0
              ? c.per_unit_cost
              : '-';

        return (
          <Card>
            <CardHeader><CardTitle>Cost Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><p className="text-muted-foreground">Labour</p><p className="font-bold">{c.labour_cost}</p></div>
                <div><p className="text-muted-foreground">Machine</p><p className="font-bold">{c.machine_cost}</p></div>
                <div><p className="text-muted-foreground">Electricity</p><p className="font-bold">{c.electricity_cost}</p></div>
                <div><p className="text-muted-foreground">Water</p><p className="font-bold">{c.water_cost}</p></div>
                <div><p className="text-muted-foreground">Gas</p><p className="font-bold">{c.gas_cost}</p></div>
                <div><p className="text-muted-foreground">Compressed Air</p><p className="font-bold">{c.compressed_air_cost}</p></div>
                <div><p className="text-muted-foreground">Overhead</p><p className="font-bold">{c.overhead_cost}</p></div>
                <div className="border-l pl-4"><p className="text-muted-foreground">Total Cost</p><p className="text-xl font-bold text-green-600">{c.total_cost}</p><p className="text-xs text-muted-foreground">Per unit: {perUnitDisplay}</p></div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      <Tabs defaultValue="labour" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-auto min-w-full">
            <TabsTrigger value="labour">Labour ({labour.length})</TabsTrigger>
            <TabsTrigger value="electricity">Electricity ({electricity.length})</TabsTrigger>
            <TabsTrigger value="water">Water ({water.length})</TabsTrigger>
            <TabsTrigger value="gas">Gas ({gas.length})</TabsTrigger>
            <TabsTrigger value="air">Compressed Air ({compressedAir.length})</TabsTrigger>
            <TabsTrigger value="machine">Machine Cost ({machineCosts.length})</TabsTrigger>
            <TabsTrigger value="overhead">Overhead ({overhead.length})</TabsTrigger>
          </TabsList>
        </div>

        {/* Labour */}
        <TabsContent value="labour">
          <Card><CardContent className="p-4">
            <div className="flex justify-between mb-4"><h3 className="font-semibold">Labour</h3><Button size="sm" onClick={() => { labourForm.reset({ worker_count: 1 }); setEditingId(null); setDialog('labour'); }}><Plus className="h-4 w-4 mr-1" /> Add</Button></div>
            <div className="overflow-x-auto"><table className="w-full text-sm min-w-[500px]">
              <thead><tr className="border-b bg-muted/50"><th className="text-left p-2">Description</th><th className="text-right p-2">Workers</th><th className="text-right p-2">Hours</th><th className="text-right p-2">Rate/hr</th><th className="text-right p-2">Total</th><th className="p-2" /></tr></thead>
              <tbody>{labour.map((e) => (<tr key={e.id} className="border-b"><td className="p-2">{e.description}</td><td className="p-2 text-right">{e.worker_count}</td><td className="p-2 text-right">{e.hours_worked}</td><td className="p-2 text-right">{e.rate_per_hour}</td><td className="p-2 text-right font-medium">{e.total_cost}</td><td className="p-2 flex gap-1 justify-end"><Button variant="ghost" size="sm" onClick={() => { labourForm.reset({ description: e.description, worker_count: e.worker_count, hours_worked: e.hours_worked, rate_per_hour: e.rate_per_hour }); setEditingId({ type: 'labour', id: e.id }); setDialog('labour'); }}><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm" onClick={() => handleDelete('labour', e.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button></td></tr>))}</tbody>
            </table></div>
          </CardContent></Card>
        </TabsContent>

        {/* Electricity */}
        <TabsContent value="electricity">
          <Card><CardContent className="p-4">
            <div className="flex justify-between mb-4"><h3 className="font-semibold">Electricity</h3><Button size="sm" onClick={() => { elecForm.reset(); setEditingId(null); setDialog('electricity'); }}><Plus className="h-4 w-4 mr-1" /> Add</Button></div>
            <div className="overflow-x-auto"><table className="w-full text-sm min-w-[500px]">
              <thead><tr className="border-b bg-muted/50"><th className="text-left p-2">Description</th><th className="text-right p-2">Units</th><th className="text-right p-2">Rate</th><th className="text-right p-2">Total</th><th className="p-2" /></tr></thead>
              <tbody>{electricity.map((e) => (<tr key={e.id} className="border-b"><td className="p-2">{e.description}</td><td className="p-2 text-right">{e.units_consumed}</td><td className="p-2 text-right">{e.rate_per_unit}</td><td className="p-2 text-right font-medium">{e.total_cost}</td><td className="p-2 flex gap-1 justify-end"><Button variant="ghost" size="sm" onClick={() => { elecForm.reset({ description: e.description, units_consumed: e.units_consumed, rate_per_unit: e.rate_per_unit }); setEditingId({ type: 'electricity', id: e.id }); setDialog('electricity'); }}><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm" onClick={() => handleDelete('electricity', e.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button></td></tr>))}</tbody>
            </table></div>
          </CardContent></Card>
        </TabsContent>

        {/* Water */}
        <TabsContent value="water">
          <Card><CardContent className="p-4">
            <div className="flex justify-between mb-4"><h3 className="font-semibold">Water</h3><Button size="sm" onClick={() => { waterForm.reset(); setEditingId(null); setDialog('water'); }}><Plus className="h-4 w-4 mr-1" /> Add</Button></div>
            <div className="overflow-x-auto"><table className="w-full text-sm min-w-[500px]">
              <thead><tr className="border-b bg-muted/50"><th className="text-left p-2">Description</th><th className="text-right p-2">Volume</th><th className="text-right p-2">Rate</th><th className="text-right p-2">Total</th><th className="p-2" /></tr></thead>
              <tbody>{water.map((e) => (<tr key={e.id} className="border-b"><td className="p-2">{e.description}</td><td className="p-2 text-right">{e.volume_consumed}</td><td className="p-2 text-right">{e.rate_per_unit}</td><td className="p-2 text-right font-medium">{e.total_cost}</td><td className="p-2 flex gap-1 justify-end"><Button variant="ghost" size="sm" onClick={() => { waterForm.reset({ description: e.description, volume_consumed: e.volume_consumed, rate_per_unit: e.rate_per_unit }); setEditingId({ type: 'water', id: e.id }); setDialog('water'); }}><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm" onClick={() => handleDelete('water', e.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button></td></tr>))}</tbody>
            </table></div>
          </CardContent></Card>
        </TabsContent>

        {/* Gas */}
        <TabsContent value="gas">
          <Card><CardContent className="p-4">
            <div className="flex justify-between mb-4"><h3 className="font-semibold">Gas</h3><Button size="sm" onClick={() => { gasForm.reset(); setEditingId(null); setDialog('gas'); }}><Plus className="h-4 w-4 mr-1" /> Add</Button></div>
            <div className="overflow-x-auto"><table className="w-full text-sm min-w-[500px]">
              <thead><tr className="border-b bg-muted/50"><th className="text-left p-2">Description</th><th className="text-right p-2">Qty</th><th className="text-right p-2">Rate</th><th className="text-right p-2">Total</th><th className="p-2" /></tr></thead>
              <tbody>{gas.map((e) => (<tr key={e.id} className="border-b"><td className="p-2">{e.description}</td><td className="p-2 text-right">{e.qty_consumed}</td><td className="p-2 text-right">{e.rate_per_unit}</td><td className="p-2 text-right font-medium">{e.total_cost}</td><td className="p-2 flex gap-1 justify-end"><Button variant="ghost" size="sm" onClick={() => { gasForm.reset({ description: e.description, qty_consumed: e.qty_consumed, rate_per_unit: e.rate_per_unit }); setEditingId({ type: 'gas', id: e.id }); setDialog('gas'); }}><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm" onClick={() => handleDelete('gas', e.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button></td></tr>))}</tbody>
            </table></div>
          </CardContent></Card>
        </TabsContent>

        {/* Compressed Air */}
        <TabsContent value="air">
          <Card><CardContent className="p-4">
            <div className="flex justify-between mb-4"><h3 className="font-semibold">Compressed Air</h3><Button size="sm" onClick={() => { airForm.reset(); setEditingId(null); setDialog('air'); }}><Plus className="h-4 w-4 mr-1" /> Add</Button></div>
            <div className="overflow-x-auto"><table className="w-full text-sm min-w-[500px]">
              <thead><tr className="border-b bg-muted/50"><th className="text-left p-2">Description</th><th className="text-right p-2">Units</th><th className="text-right p-2">Rate</th><th className="text-right p-2">Total</th><th className="p-2" /></tr></thead>
              <tbody>{compressedAir.map((e) => (<tr key={e.id} className="border-b"><td className="p-2">{e.description}</td><td className="p-2 text-right">{e.units_consumed}</td><td className="p-2 text-right">{e.rate_per_unit}</td><td className="p-2 text-right font-medium">{e.total_cost}</td><td className="p-2 flex gap-1 justify-end"><Button variant="ghost" size="sm" onClick={() => { airForm.reset({ description: e.description, units_consumed: e.units_consumed, rate_per_unit: e.rate_per_unit }); setEditingId({ type: 'air', id: e.id }); setDialog('air'); }}><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm" onClick={() => handleDelete('air', e.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button></td></tr>))}</tbody>
            </table></div>
          </CardContent></Card>
        </TabsContent>

        {/* Machine Cost */}
        <TabsContent value="machine">
          <Card><CardContent className="p-4">
            <div className="flex justify-between mb-4"><h3 className="font-semibold">Machine Cost</h3><Button size="sm" onClick={() => { machCostForm.reset(); setEditingId(null); setDialog('machine'); }}><Plus className="h-4 w-4 mr-1" /> Add</Button></div>
            <div className="overflow-x-auto"><table className="w-full text-sm min-w-[500px]">
              <thead><tr className="border-b bg-muted/50"><th className="text-left p-2">Machine</th><th className="text-right p-2">Hours</th><th className="text-right p-2">Rate/hr</th><th className="text-right p-2">Total</th><th className="p-2" /></tr></thead>
              <tbody>{machineCosts.map((e) => (<tr key={e.id} className="border-b"><td className="p-2">{e.machine_name}</td><td className="p-2 text-right">{e.hours_used}</td><td className="p-2 text-right">{e.rate_per_hour}</td><td className="p-2 text-right font-medium">{e.total_cost}</td><td className="p-2 flex gap-1 justify-end"><Button variant="ghost" size="sm" onClick={() => { machCostForm.reset({ machine_name: e.machine_name, hours_used: e.hours_used, rate_per_hour: e.rate_per_hour }); setEditingId({ type: 'machine', id: e.id }); setDialog('machine'); }}><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm" onClick={() => handleDelete('machine', e.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button></td></tr>))}</tbody>
            </table></div>
          </CardContent></Card>
        </TabsContent>

        {/* Overhead */}
        <TabsContent value="overhead">
          <Card><CardContent className="p-4">
            <div className="flex justify-between mb-4"><h3 className="font-semibold">Overhead</h3><Button size="sm" onClick={() => { overheadForm.reset(); setEditingId(null); setDialog('overhead'); }}><Plus className="h-4 w-4 mr-1" /> Add</Button></div>
            <div className="overflow-x-auto"><table className="w-full text-sm min-w-[500px]">
              <thead><tr className="border-b bg-muted/50"><th className="text-left p-2">Expense</th><th className="text-right p-2">Amount</th><th className="p-2" /></tr></thead>
              <tbody>{overhead.map((e) => (<tr key={e.id} className="border-b"><td className="p-2">{e.expense_name}</td><td className="p-2 text-right font-medium">{e.amount}</td><td className="p-2 flex gap-1 justify-end"><Button variant="ghost" size="sm" onClick={() => { overheadForm.reset({ expense_name: e.expense_name, amount: e.amount }); setEditingId({ type: 'overhead', id: e.id }); setDialog('overhead'); }}><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm" onClick={() => handleDelete('overhead', e.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button></td></tr>))}</tbody>
            </table></div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Labour Dialog */}
      <Dialog open={dialog === 'labour'} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent><DialogHeader><DialogTitle>{editingId?.type === 'labour' ? 'Edit Labour' : 'Add Labour'}</DialogTitle></DialogHeader>
          <form onSubmit={labourForm.handleSubmit(async (d) => { try { if (editingId?.type === 'labour') { await updateLabour.mutateAsync({ entryId: editingId.id, data: d }); toast.success('Updated'); } else { await addLabour.mutateAsync(d); toast.success('Added'); } closeDialog(); labourForm.reset({ worker_count: 1 }); } catch { toast.error('Failed'); } })} className="space-y-4">
            <div><Label>Description</Label><Input {...labourForm.register('description')} /></div>
            <div className="grid grid-cols-3 gap-4"><div><Label>Worker Count</Label><Input type="number" {...labourForm.register('worker_count', { valueAsNumber: true })} /></div><div><Label>Hours Worked</Label><Input {...labourForm.register('hours_worked')} /></div><div><Label>Rate/hr</Label><Input {...labourForm.register('rate_per_hour')} /></div></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button><Button type="submit">{editingId ? 'Save' : 'Add'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Electricity Dialog */}
      <Dialog open={dialog === 'electricity'} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent><DialogHeader><DialogTitle>{editingId?.type === 'electricity' ? 'Edit Electricity' : 'Add Electricity'}</DialogTitle></DialogHeader>
          <form onSubmit={elecForm.handleSubmit(async (d) => { try { if (editingId?.type === 'electricity') { await updateElectricity.mutateAsync({ entryId: editingId.id, data: d }); toast.success('Updated'); } else { await addElectricity.mutateAsync(d); toast.success('Added'); } closeDialog(); elecForm.reset(); } catch { toast.error('Failed'); } })} className="space-y-4">
            <div><Label>Description</Label><Input {...elecForm.register('description')} /></div>
            <div className="grid grid-cols-2 gap-4"><div><Label>Units Consumed</Label><Input {...elecForm.register('units_consumed')} /></div><div><Label>Rate/Unit</Label><Input {...elecForm.register('rate_per_unit')} /></div></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button><Button type="submit">{editingId ? 'Save' : 'Add'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Water Dialog */}
      <Dialog open={dialog === 'water'} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent><DialogHeader><DialogTitle>{editingId?.type === 'water' ? 'Edit Water' : 'Add Water'}</DialogTitle></DialogHeader>
          <form onSubmit={waterForm.handleSubmit(async (d) => { try { if (editingId?.type === 'water') { await updateWater.mutateAsync({ entryId: editingId.id, data: d }); toast.success('Updated'); } else { await addWater.mutateAsync(d); toast.success('Added'); } closeDialog(); waterForm.reset(); } catch { toast.error('Failed'); } })} className="space-y-4">
            <div><Label>Description</Label><Input {...waterForm.register('description')} /></div>
            <div className="grid grid-cols-2 gap-4"><div><Label>Volume Consumed</Label><Input {...waterForm.register('volume_consumed')} /></div><div><Label>Rate/Unit</Label><Input {...waterForm.register('rate_per_unit')} /></div></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button><Button type="submit">{editingId ? 'Save' : 'Add'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Gas Dialog */}
      <Dialog open={dialog === 'gas'} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent><DialogHeader><DialogTitle>{editingId?.type === 'gas' ? 'Edit Gas' : 'Add Gas'}</DialogTitle></DialogHeader>
          <form onSubmit={gasForm.handleSubmit(async (d) => { try { if (editingId?.type === 'gas') { await updateGas.mutateAsync({ entryId: editingId.id, data: d }); toast.success('Updated'); } else { await addGas.mutateAsync(d); toast.success('Added'); } closeDialog(); gasForm.reset(); } catch { toast.error('Failed'); } })} className="space-y-4">
            <div><Label>Description</Label><Input {...gasForm.register('description')} /></div>
            <div className="grid grid-cols-2 gap-4"><div><Label>Qty Consumed</Label><Input {...gasForm.register('qty_consumed')} /></div><div><Label>Rate/Unit</Label><Input {...gasForm.register('rate_per_unit')} /></div></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button><Button type="submit">{editingId ? 'Save' : 'Add'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Compressed Air Dialog */}
      <Dialog open={dialog === 'air'} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent><DialogHeader><DialogTitle>{editingId?.type === 'air' ? 'Edit Compressed Air' : 'Add Compressed Air'}</DialogTitle></DialogHeader>
          <form onSubmit={airForm.handleSubmit(async (d) => { try { if (editingId?.type === 'air') { await updateAir.mutateAsync({ entryId: editingId.id, data: d }); toast.success('Updated'); } else { await addAir.mutateAsync(d); toast.success('Added'); } closeDialog(); airForm.reset(); } catch { toast.error('Failed'); } })} className="space-y-4">
            <div><Label>Description</Label><Input {...airForm.register('description')} /></div>
            <div className="grid grid-cols-2 gap-4"><div><Label>Units Consumed</Label><Input {...airForm.register('units_consumed')} /></div><div><Label>Rate/Unit</Label><Input {...airForm.register('rate_per_unit')} /></div></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button><Button type="submit">{editingId ? 'Save' : 'Add'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Machine Cost Dialog */}
      <Dialog open={dialog === 'machine'} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent><DialogHeader><DialogTitle>{editingId?.type === 'machine' ? 'Edit Machine Cost' : 'Add Machine Cost'}</DialogTitle></DialogHeader>
          <form onSubmit={machCostForm.handleSubmit(async (d) => { try { if (editingId?.type === 'machine') { await updateMachineCostMut.mutateAsync({ entryId: editingId.id, data: d }); toast.success('Updated'); } else { await addMachineCost.mutateAsync(d); toast.success('Added'); } closeDialog(); machCostForm.reset(); } catch { toast.error('Failed'); } })} className="space-y-4">
            <div><Label>Machine Name</Label><Input {...machCostForm.register('machine_name')} /></div>
            <div className="grid grid-cols-2 gap-4"><div><Label>Hours Used</Label><Input {...machCostForm.register('hours_used')} /></div><div><Label>Rate/Hour</Label><Input {...machCostForm.register('rate_per_hour')} /></div></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button><Button type="submit">{editingId ? 'Save' : 'Add'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Overhead Dialog */}
      <Dialog open={dialog === 'overhead'} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent><DialogHeader><DialogTitle>{editingId?.type === 'overhead' ? 'Edit Overhead' : 'Add Overhead'}</DialogTitle></DialogHeader>
          <form onSubmit={overheadForm.handleSubmit(async (d) => { try { if (editingId?.type === 'overhead') { await updateOverheadMut.mutateAsync({ entryId: editingId.id, data: d }); toast.success('Updated'); } else { await addOverhead.mutateAsync(d); toast.success('Added'); } closeDialog(); overheadForm.reset(); } catch { toast.error('Failed'); } })} className="space-y-4">
            <div><Label>Expense Name</Label><Input {...overheadForm.register('expense_name')} /></div>
            <div><Label>Amount</Label><Input {...overheadForm.register('amount')} /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button><Button type="submit">{editingId ? 'Save' : 'Add'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ResourceTrackingPage;
