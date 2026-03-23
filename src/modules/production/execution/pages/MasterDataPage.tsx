import { useState } from 'react';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Button, Card, CardContent, CardHeader, CardTitle,
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
  Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/shared/components/ui';

import {
  useMachines, useCreateMachine, useUpdateMachine, useDeleteMachine,
  useLines,
  useChecklistTemplates, useCreateChecklistTemplate, useUpdateChecklistTemplate, useDeleteChecklistTemplate,
} from '../api';
import { MACHINE_TYPE_LABELS, FREQUENCY_LABELS } from '../constants';
import type { Machine, ChecklistTemplate, MachineType, ChecklistFrequency } from '../types';

const machineTypes = Object.keys(MACHINE_TYPE_LABELS) as MachineType[];
const frequencies = Object.keys(FREQUENCY_LABELS) as ChecklistFrequency[];

function MasterDataPage() {
  const { data: machines = [] } = useMachines();
  const { data: lines = [] } = useLines(true);
  const createMachine = useCreateMachine();
  const updateMachine = useUpdateMachine();
  const deleteMachine = useDeleteMachine();

  // Checklist templates — filtered by selected machine type
  const [selectedMachineType, setSelectedMachineType] = useState<MachineType | null>(null);
  const { data: templates = [], isLoading: loadingTemplates } = useChecklistTemplates(selectedMachineType || undefined);
  const createTemplate = useCreateChecklistTemplate();
  const updateTemplate = useUpdateChecklistTemplate();
  const deleteTemplate = useDeleteChecklistTemplate();

  // Dialog state
  const [dialog, setDialog] = useState<'machine' | 'template' | null>(null);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<ChecklistTemplate | null>(null);

  // Machine form
  const [machineName, setMachineName] = useState('');
  const [machineType, setMachineType] = useState<MachineType>('FILLER');
  const [machineLineId, setMachineLineId] = useState<number>(0);

  // Template form
  const [templateTask, setTemplateTask] = useState('');
  const [templateFrequency, setTemplateFrequency] = useState<ChecklistFrequency>('DAILY');
  const [templateSortOrder, setTemplateSortOrder] = useState(1);

  const openMachineDialog = (machine?: Machine) => {
    if (machine) {
      setEditingMachine(machine);
      setMachineName(machine.name);
      setMachineType(machine.machine_type);
      setMachineLineId(machine.line);
    } else {
      setEditingMachine(null);
      setMachineName('');
      setMachineType('FILLER');
      setMachineLineId(lines[0]?.id || 0);
    }
    setDialog('machine');
  };

  const openTemplateDialog = (template?: ChecklistTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateTask(template.task);
      setTemplateFrequency(template.frequency);
      setTemplateSortOrder(template.sort_order);
    } else {
      setEditingTemplate(null);
      setTemplateTask('');
      setTemplateFrequency('DAILY');
      const nextOrder = templates.length > 0 ? Math.max(...templates.map((t) => t.sort_order)) + 1 : 1;
      setTemplateSortOrder(nextOrder);
    }
    setDialog('template');
  };

  const handleSaveMachine = async () => {
    if (!machineName.trim()) { toast.error('Name is required'); return; }
    if (!machineLineId) { toast.error('Line is required'); return; }
    try {
      if (editingMachine) {
        await updateMachine.mutateAsync({ machineId: editingMachine.id, data: { name: machineName, machine_type: machineType, line_id: machineLineId } });
        toast.success('Machine updated');
      } else {
        await createMachine.mutateAsync({ name: machineName, machine_type: machineType, line_id: machineLineId });
        toast.success('Machine created');
      }
      setDialog(null);
    } catch { toast.error('Failed to save machine'); }
  };

  const handleSaveTemplate = async () => {
    if (!templateTask.trim()) { toast.error('Task is required'); return; }
    if (!selectedMachineType && !editingTemplate) { toast.error('Select a machine type first'); return; }
    try {
      if (editingTemplate) {
        await updateTemplate.mutateAsync({ templateId: editingTemplate.id, data: { task: templateTask, frequency: templateFrequency, sort_order: templateSortOrder } });
        toast.success('Template updated');
      } else {
        await createTemplate.mutateAsync({ machine_type: selectedMachineType!, task: templateTask, frequency: templateFrequency, sort_order: templateSortOrder });
        toast.success('Template created');
      }
      setDialog(null);
    } catch { toast.error('Failed to save template'); }
  };

  const handleDeleteMachine = async (id: number) => {
    if (!confirm('Deactivate this machine?')) return;
    try { await deleteMachine.mutateAsync(id); toast.success('Machine deactivated'); } catch { toast.error('Failed'); }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm('Delete this template?')) return;
    try { await deleteTemplate.mutateAsync(id); toast.success('Template deleted'); } catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-6">
      <DashboardHeader title="Master Data" description="Manage machines and checklist templates" />

      <Tabs defaultValue="machines" className="space-y-4">
        <TabsList>
          <TabsTrigger value="machines">Machines ({machines.length})</TabsTrigger>
          <TabsTrigger value="templates">Checklist Templates</TabsTrigger>
        </TabsList>

        {/* Machines Tab */}
        <TabsContent value="machines">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Machines</CardTitle>
              <Button size="sm" onClick={() => openMachineDialog()}>
                <Plus className="h-4 w-4 mr-1" /> Add Machine
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium">Type</th>
                      <th className="text-left p-3 font-medium">Line</th>
                      <th className="text-center p-3 font-medium">Status</th>
                      <th className="text-center p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {machines.map((m) => (
                      <tr key={m.id} className={`border-b hover:bg-muted/30 ${!m.is_active ? 'opacity-50' : ''}`}>
                        <td className="p-3 font-medium">{m.name}</td>
                        <td className="p-3">{MACHINE_TYPE_LABELS[m.machine_type]}</td>
                        <td className="p-3">{m.line_name}</td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${m.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                            {m.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => openMachineDialog(m)}><Edit className="h-4 w-4" /></Button>
                            {m.is_active && <Button size="sm" variant="outline" onClick={() => handleDeleteMachine(m.id)}><Trash2 className="h-4 w-4" /></Button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {machines.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No machines found</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Checklist Templates Tab — QC Parameters pattern */}
        <TabsContent value="templates">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Label className="min-w-fit">Machine Type:</Label>
                <Select value={selectedMachineType || ''} onValueChange={(v) => setSelectedMachineType(v as MachineType)}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Select Machine Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {machineTypes.map((mt) => (
                      <SelectItem key={mt} value={mt}>{MACHINE_TYPE_LABELS[mt]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedMachineType && (
                  <Button onClick={() => openTemplateDialog()}>
                    <Plus className="h-4 w-4 mr-2" /> Add Template
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {selectedMachineType && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Templates for {MACHINE_TYPE_LABELS[selectedMachineType]} ({templates.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingTemplates ? (
                  <div className="py-8 flex justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
                ) : templates.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">No templates found. Click "Add Template" to create one.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium">#</th>
                          <th className="text-left p-3 font-medium">Task</th>
                          <th className="text-left p-3 font-medium">Frequency</th>
                          <th className="text-center p-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {templates.map((t) => (
                          <tr key={t.id} className="border-b hover:bg-muted/30">
                            <td className="p-3">{t.sort_order}</td>
                            <td className="p-3">{t.task}</td>
                            <td className="p-3">{FREQUENCY_LABELS[t.frequency]}</td>
                            <td className="p-3 text-center">
                              <div className="flex justify-center gap-2">
                                <Button size="sm" variant="outline" onClick={() => openTemplateDialog(t)}><Edit className="h-4 w-4" /></Button>
                                <Button size="sm" variant="outline" onClick={() => handleDeleteTemplate(t.id)}><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!selectedMachineType && (
            <Card className="mt-4">
              <CardContent className="py-12 text-center text-muted-foreground">
                Select a machine type above to view and manage its checklist templates.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Machine Dialog */}
      <Dialog open={dialog === 'machine'} onOpenChange={(open) => { if (!open) setDialog(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingMachine ? 'Edit Machine' : 'Add Machine'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input value={machineName} onChange={(e) => setMachineName(e.target.value)} placeholder="e.g., 10-Head Filler" />
            </div>
            <div className="space-y-2">
              <Label>Machine Type</Label>
              <Select value={machineType} onValueChange={(v) => setMachineType(v as MachineType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{machineTypes.map((mt) => (<SelectItem key={mt} value={mt}>{MACHINE_TYPE_LABELS[mt]}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Production Line <span className="text-destructive">*</span></Label>
              <Select value={machineLineId ? String(machineLineId) : ''} onValueChange={(v) => setMachineLineId(Number(v))}>
                <SelectTrigger><SelectValue placeholder="Select line" /></SelectTrigger>
                <SelectContent>{lines.map((l) => (<SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button onClick={handleSaveMachine} disabled={createMachine.isPending || updateMachine.isPending}>
              {(createMachine.isPending || updateMachine.isPending) ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={dialog === 'template'} onOpenChange={(open) => { if (!open) setDialog(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingTemplate ? 'Edit Template' : 'Add Template'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Machine Type</Label>
              <p className="text-sm font-medium">{selectedMachineType ? MACHINE_TYPE_LABELS[selectedMachineType] : '-'}</p>
            </div>
            <div className="space-y-2">
              <Label>Task <span className="text-destructive">*</span></Label>
              <Input value={templateTask} onChange={(e) => setTemplateTask(e.target.value)} placeholder="e.g., Check oil level" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select value={templateFrequency} onValueChange={(v) => setTemplateFrequency(v as ChecklistFrequency)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{frequencies.map((f) => (<SelectItem key={f} value={f}>{FREQUENCY_LABELS[f]}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input type="number" value={templateSortOrder} onChange={(e) => setTemplateSortOrder(parseInt(e.target.value) || 1)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button onClick={handleSaveTemplate} disabled={createTemplate.isPending || updateTemplate.isPending}>
              {(createTemplate.isPending || updateTemplate.isPending) ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MasterDataPage;
