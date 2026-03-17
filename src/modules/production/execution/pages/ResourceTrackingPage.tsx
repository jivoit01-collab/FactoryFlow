import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
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
  useElectricity,
  useCreateElectricity,
  useDeleteElectricity,
  useWater,
  useCreateWater,
  useDeleteWater,
  useGas,
  useCreateGas,
  useDeleteGas,
  useCompressedAir,
  useCreateCompressedAir,
  useDeleteCompressedAir,
  useLabour,
  useCreateLabour,
  useDeleteLabour,
  useMachineCosts,
  useCreateMachineCost,
  useDeleteMachineCost,
  useOverhead,
  useCreateOverhead,
  useDeleteOverhead,
  useRunCost,
  useRunDetail,
} from '../api';
import {
  createElectricitySchema,
  type CreateElectricityFormData,
  createWaterSchema,
  type CreateWaterFormData,
  createGasSchema,
  type CreateGasFormData,
  createCompressedAirSchema,
  type CreateCompressedAirFormData,
  createLabourSchema,
  type CreateLabourFormData,
  createMachineCostSchema,
  type CreateMachineCostFormData,
  createOverheadSchema,
  type CreateOverheadFormData,
} from '../schemas';

function ResourceTrackingPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const numRunId = Number(runId);

  const { data: run } = useRunDetail(numRunId || null);
  const { data: cost } = useRunCost(numRunId);

  const { data: electricity = [] } = useElectricity(numRunId);
  const { data: water = [] } = useWater(numRunId);
  const { data: gas = [] } = useGas(numRunId);
  const { data: compressedAir = [] } = useCompressedAir(numRunId);
  const { data: labour = [] } = useLabour(numRunId);
  const { data: machineCosts = [] } = useMachineCosts(numRunId);
  const { data: overhead = [] } = useOverhead(numRunId);

  const addElectricity = useCreateElectricity(numRunId);
  const removeElectricity = useDeleteElectricity(numRunId);
  const addWater = useCreateWater(numRunId);
  const removeWater = useDeleteWater(numRunId);
  const addGas = useCreateGas(numRunId);
  const removeGas = useDeleteGas(numRunId);
  const addAir = useCreateCompressedAir(numRunId);
  const removeAir = useDeleteCompressedAir(numRunId);
  const addLabour = useCreateLabour(numRunId);
  const removeLabour = useDeleteLabour(numRunId);
  const addMachineCost = useCreateMachineCost(numRunId);
  const removeMachineCost = useDeleteMachineCost(numRunId);
  const addOverhead = useCreateOverhead(numRunId);
  const removeOverhead = useDeleteOverhead(numRunId);

  const [dialog, setDialog] = useState<string | null>(null);

  const elecForm = useForm<CreateElectricityFormData>({ resolver: zodResolver(createElectricitySchema) });
  const waterForm = useForm<CreateWaterFormData>({ resolver: zodResolver(createWaterSchema) });
  const gasForm = useForm<CreateGasFormData>({ resolver: zodResolver(createGasSchema) });
  const airForm = useForm<CreateCompressedAirFormData>({ resolver: zodResolver(createCompressedAirSchema) });
  const labourForm = useForm<CreateLabourFormData>({ resolver: zodResolver(createLabourSchema) });
  const machCostForm = useForm<CreateMachineCostFormData>({ resolver: zodResolver(createMachineCostSchema) });
  const overheadForm = useForm<CreateOverheadFormData>({ resolver: zodResolver(createOverheadSchema) });

  const handleDelete = async (type: string, id: number) => {
    if (!confirm('Delete this entry?')) return;
    try {
      if (type === 'electricity') await removeElectricity.mutateAsync(id);
      else if (type === 'water') await removeWater.mutateAsync(id);
      else if (type === 'gas') await removeGas.mutateAsync(id);
      else if (type === 'air') await removeAir.mutateAsync(id);
      else if (type === 'labour') await removeLabour.mutateAsync(id);
      else if (type === 'machine') await removeMachineCost.mutateAsync(id);
      else if (type === 'overhead') await removeOverhead.mutateAsync(id);
      toast.success('Deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      <DashboardHeader
        title={`Resource Tracking — Run #${run?.run_number || ''}`}
        description={run ? `${run.date} · ${run.line_name} · ${run.brand}` : ''}
      />

      {cost && (
        <Card>
          <CardHeader><CardTitle>Cost Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><p className="text-muted-foreground">Labour</p><p className="font-bold">{cost.labour_cost}</p></div>
              <div><p className="text-muted-foreground">Machine</p><p className="font-bold">{cost.machine_cost}</p></div>
              <div><p className="text-muted-foreground">Electricity</p><p className="font-bold">{cost.electricity_cost}</p></div>
              <div><p className="text-muted-foreground">Water</p><p className="font-bold">{cost.water_cost}</p></div>
              <div><p className="text-muted-foreground">Gas</p><p className="font-bold">{cost.gas_cost}</p></div>
              <div><p className="text-muted-foreground">Compressed Air</p><p className="font-bold">{cost.compressed_air_cost}</p></div>
              <div><p className="text-muted-foreground">Overhead</p><p className="font-bold">{cost.overhead_cost}</p></div>
              <div className="border-l pl-4"><p className="text-muted-foreground">Total Cost</p><p className="text-xl font-bold text-green-600">{cost.total_cost}</p><p className="text-xs text-muted-foreground">Per unit: {cost.per_unit_cost}</p></div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="electricity" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="electricity">Electricity ({electricity.length})</TabsTrigger>
          <TabsTrigger value="water">Water ({water.length})</TabsTrigger>
          <TabsTrigger value="gas">Gas ({gas.length})</TabsTrigger>
          <TabsTrigger value="air">Compressed Air ({compressedAir.length})</TabsTrigger>
          <TabsTrigger value="labour">Labour ({labour.length})</TabsTrigger>
          <TabsTrigger value="machine">Machine Cost ({machineCosts.length})</TabsTrigger>
          <TabsTrigger value="overhead">Overhead ({overhead.length})</TabsTrigger>
        </TabsList>

        {/* Electricity */}
        <TabsContent value="electricity">
          <Card><CardContent className="p-4">
            <div className="flex justify-between mb-4"><h3 className="font-semibold">Electricity</h3><Button size="sm" onClick={() => setDialog('electricity')}><Plus className="h-4 w-4 mr-1" /> Add</Button></div>
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50"><th className="text-left p-2">Description</th><th className="text-right p-2">Units</th><th className="text-right p-2">Rate</th><th className="text-right p-2">Total</th><th className="p-2" /></tr></thead>
              <tbody>{electricity.map((e) => (<tr key={e.id} className="border-b"><td className="p-2">{e.description}</td><td className="p-2 text-right">{e.units_consumed}</td><td className="p-2 text-right">{e.rate_per_unit}</td><td className="p-2 text-right font-medium">{e.total_cost}</td><td className="p-2"><Button variant="ghost" size="sm" onClick={() => handleDelete('electricity', e.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button></td></tr>))}</tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        {/* Water */}
        <TabsContent value="water">
          <Card><CardContent className="p-4">
            <div className="flex justify-between mb-4"><h3 className="font-semibold">Water</h3><Button size="sm" onClick={() => setDialog('water')}><Plus className="h-4 w-4 mr-1" /> Add</Button></div>
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50"><th className="text-left p-2">Description</th><th className="text-right p-2">Volume</th><th className="text-right p-2">Rate</th><th className="text-right p-2">Total</th><th className="p-2" /></tr></thead>
              <tbody>{water.map((e) => (<tr key={e.id} className="border-b"><td className="p-2">{e.description}</td><td className="p-2 text-right">{e.volume_consumed}</td><td className="p-2 text-right">{e.rate_per_unit}</td><td className="p-2 text-right font-medium">{e.total_cost}</td><td className="p-2"><Button variant="ghost" size="sm" onClick={() => handleDelete('water', e.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button></td></tr>))}</tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        {/* Gas */}
        <TabsContent value="gas">
          <Card><CardContent className="p-4">
            <div className="flex justify-between mb-4"><h3 className="font-semibold">Gas</h3><Button size="sm" onClick={() => setDialog('gas')}><Plus className="h-4 w-4 mr-1" /> Add</Button></div>
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50"><th className="text-left p-2">Description</th><th className="text-right p-2">Qty</th><th className="text-right p-2">Rate</th><th className="text-right p-2">Total</th><th className="p-2" /></tr></thead>
              <tbody>{gas.map((e) => (<tr key={e.id} className="border-b"><td className="p-2">{e.description}</td><td className="p-2 text-right">{e.qty_consumed}</td><td className="p-2 text-right">{e.rate_per_unit}</td><td className="p-2 text-right font-medium">{e.total_cost}</td><td className="p-2"><Button variant="ghost" size="sm" onClick={() => handleDelete('gas', e.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button></td></tr>))}</tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        {/* Compressed Air */}
        <TabsContent value="air">
          <Card><CardContent className="p-4">
            <div className="flex justify-between mb-4"><h3 className="font-semibold">Compressed Air</h3><Button size="sm" onClick={() => setDialog('air')}><Plus className="h-4 w-4 mr-1" /> Add</Button></div>
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50"><th className="text-left p-2">Description</th><th className="text-right p-2">Units</th><th className="text-right p-2">Rate</th><th className="text-right p-2">Total</th><th className="p-2" /></tr></thead>
              <tbody>{compressedAir.map((e) => (<tr key={e.id} className="border-b"><td className="p-2">{e.description}</td><td className="p-2 text-right">{e.units_consumed}</td><td className="p-2 text-right">{e.rate_per_unit}</td><td className="p-2 text-right font-medium">{e.total_cost}</td><td className="p-2"><Button variant="ghost" size="sm" onClick={() => handleDelete('air', e.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button></td></tr>))}</tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        {/* Labour */}
        <TabsContent value="labour">
          <Card><CardContent className="p-4">
            <div className="flex justify-between mb-4"><h3 className="font-semibold">Labour</h3><Button size="sm" onClick={() => setDialog('labour')}><Plus className="h-4 w-4 mr-1" /> Add</Button></div>
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50"><th className="text-left p-2">Worker</th><th className="text-right p-2">Hours</th><th className="text-right p-2">Rate/hr</th><th className="text-right p-2">Total</th><th className="p-2" /></tr></thead>
              <tbody>{labour.map((e) => (<tr key={e.id} className="border-b"><td className="p-2">{e.worker_name}</td><td className="p-2 text-right">{e.hours_worked}</td><td className="p-2 text-right">{e.rate_per_hour}</td><td className="p-2 text-right font-medium">{e.total_cost}</td><td className="p-2"><Button variant="ghost" size="sm" onClick={() => handleDelete('labour', e.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button></td></tr>))}</tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        {/* Machine Cost */}
        <TabsContent value="machine">
          <Card><CardContent className="p-4">
            <div className="flex justify-between mb-4"><h3 className="font-semibold">Machine Cost</h3><Button size="sm" onClick={() => setDialog('machine')}><Plus className="h-4 w-4 mr-1" /> Add</Button></div>
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50"><th className="text-left p-2">Machine</th><th className="text-right p-2">Hours</th><th className="text-right p-2">Rate/hr</th><th className="text-right p-2">Total</th><th className="p-2" /></tr></thead>
              <tbody>{machineCosts.map((e) => (<tr key={e.id} className="border-b"><td className="p-2">{e.machine_name}</td><td className="p-2 text-right">{e.hours_used}</td><td className="p-2 text-right">{e.rate_per_hour}</td><td className="p-2 text-right font-medium">{e.total_cost}</td><td className="p-2"><Button variant="ghost" size="sm" onClick={() => handleDelete('machine', e.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button></td></tr>))}</tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        {/* Overhead */}
        <TabsContent value="overhead">
          <Card><CardContent className="p-4">
            <div className="flex justify-between mb-4"><h3 className="font-semibold">Overhead</h3><Button size="sm" onClick={() => setDialog('overhead')}><Plus className="h-4 w-4 mr-1" /> Add</Button></div>
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50"><th className="text-left p-2">Expense</th><th className="text-right p-2">Amount</th><th className="p-2" /></tr></thead>
              <tbody>{overhead.map((e) => (<tr key={e.id} className="border-b"><td className="p-2">{e.expense_name}</td><td className="p-2 text-right font-medium">{e.amount}</td><td className="p-2"><Button variant="ghost" size="sm" onClick={() => handleDelete('overhead', e.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button></td></tr>))}</tbody>
            </table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Electricity Dialog */}
      <Dialog open={dialog === 'electricity'} onOpenChange={() => setDialog(null)}>
        <DialogContent><DialogHeader><DialogTitle>Add Electricity</DialogTitle></DialogHeader>
          <form onSubmit={elecForm.handleSubmit(async (d) => { try { await addElectricity.mutateAsync(d); toast.success('Added'); setDialog(null); elecForm.reset(); } catch { toast.error('Failed'); } })} className="space-y-4">
            <div><Label>Description</Label><Input {...elecForm.register('description')} /></div>
            <div className="grid grid-cols-2 gap-4"><div><Label>Units Consumed</Label><Input {...elecForm.register('units_consumed')} /></div><div><Label>Rate/Unit</Label><Input {...elecForm.register('rate_per_unit')} /></div></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setDialog(null)}>Cancel</Button><Button type="submit">Add</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Water Dialog */}
      <Dialog open={dialog === 'water'} onOpenChange={() => setDialog(null)}>
        <DialogContent><DialogHeader><DialogTitle>Add Water</DialogTitle></DialogHeader>
          <form onSubmit={waterForm.handleSubmit(async (d) => { try { await addWater.mutateAsync(d); toast.success('Added'); setDialog(null); waterForm.reset(); } catch { toast.error('Failed'); } })} className="space-y-4">
            <div><Label>Description</Label><Input {...waterForm.register('description')} /></div>
            <div className="grid grid-cols-2 gap-4"><div><Label>Volume Consumed</Label><Input {...waterForm.register('volume_consumed')} /></div><div><Label>Rate/Unit</Label><Input {...waterForm.register('rate_per_unit')} /></div></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setDialog(null)}>Cancel</Button><Button type="submit">Add</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Gas Dialog */}
      <Dialog open={dialog === 'gas'} onOpenChange={() => setDialog(null)}>
        <DialogContent><DialogHeader><DialogTitle>Add Gas</DialogTitle></DialogHeader>
          <form onSubmit={gasForm.handleSubmit(async (d) => { try { await addGas.mutateAsync(d); toast.success('Added'); setDialog(null); gasForm.reset(); } catch { toast.error('Failed'); } })} className="space-y-4">
            <div><Label>Description</Label><Input {...gasForm.register('description')} /></div>
            <div className="grid grid-cols-2 gap-4"><div><Label>Qty Consumed</Label><Input {...gasForm.register('qty_consumed')} /></div><div><Label>Rate/Unit</Label><Input {...gasForm.register('rate_per_unit')} /></div></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setDialog(null)}>Cancel</Button><Button type="submit">Add</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Compressed Air Dialog */}
      <Dialog open={dialog === 'air'} onOpenChange={() => setDialog(null)}>
        <DialogContent><DialogHeader><DialogTitle>Add Compressed Air</DialogTitle></DialogHeader>
          <form onSubmit={airForm.handleSubmit(async (d) => { try { await addAir.mutateAsync(d); toast.success('Added'); setDialog(null); airForm.reset(); } catch { toast.error('Failed'); } })} className="space-y-4">
            <div><Label>Description</Label><Input {...airForm.register('description')} /></div>
            <div className="grid grid-cols-2 gap-4"><div><Label>Units Consumed</Label><Input {...airForm.register('units_consumed')} /></div><div><Label>Rate/Unit</Label><Input {...airForm.register('rate_per_unit')} /></div></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setDialog(null)}>Cancel</Button><Button type="submit">Add</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Labour Dialog */}
      <Dialog open={dialog === 'labour'} onOpenChange={() => setDialog(null)}>
        <DialogContent><DialogHeader><DialogTitle>Add Labour</DialogTitle></DialogHeader>
          <form onSubmit={labourForm.handleSubmit(async (d) => { try { await addLabour.mutateAsync(d); toast.success('Added'); setDialog(null); labourForm.reset(); } catch { toast.error('Failed'); } })} className="space-y-4">
            <div><Label>Worker Name</Label><Input {...labourForm.register('worker_name')} /></div>
            <div className="grid grid-cols-2 gap-4"><div><Label>Hours Worked</Label><Input {...labourForm.register('hours_worked')} /></div><div><Label>Rate/Hour</Label><Input {...labourForm.register('rate_per_hour')} /></div></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setDialog(null)}>Cancel</Button><Button type="submit">Add</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Machine Cost Dialog */}
      <Dialog open={dialog === 'machine'} onOpenChange={() => setDialog(null)}>
        <DialogContent><DialogHeader><DialogTitle>Add Machine Cost</DialogTitle></DialogHeader>
          <form onSubmit={machCostForm.handleSubmit(async (d) => { try { await addMachineCost.mutateAsync(d); toast.success('Added'); setDialog(null); machCostForm.reset(); } catch { toast.error('Failed'); } })} className="space-y-4">
            <div><Label>Machine Name</Label><Input {...machCostForm.register('machine_name')} /></div>
            <div className="grid grid-cols-2 gap-4"><div><Label>Hours Used</Label><Input {...machCostForm.register('hours_used')} /></div><div><Label>Rate/Hour</Label><Input {...machCostForm.register('rate_per_hour')} /></div></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setDialog(null)}>Cancel</Button><Button type="submit">Add</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Overhead Dialog */}
      <Dialog open={dialog === 'overhead'} onOpenChange={() => setDialog(null)}>
        <DialogContent><DialogHeader><DialogTitle>Add Overhead</DialogTitle></DialogHeader>
          <form onSubmit={overheadForm.handleSubmit(async (d) => { try { await addOverhead.mutateAsync(d); toast.success('Added'); setDialog(null); overheadForm.reset(); } catch { toast.error('Failed'); } })} className="space-y-4">
            <div><Label>Expense Name</Label><Input {...overheadForm.register('expense_name')} /></div>
            <div><Label>Amount</Label><Input {...overheadForm.register('amount')} /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setDialog(null)}>Cancel</Button><Button type="submit">Add</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ResourceTrackingPage;
