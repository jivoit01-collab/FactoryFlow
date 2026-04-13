import { Edit, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Button, Card, CardContent, CardHeader, CardTitle,
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
  Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/components/ui';

import {
  useChecklistTemplates, useCreateChecklistTemplate, useDeleteChecklistTemplate,
useUpdateChecklistTemplate, } from '../api';
import { FREQUENCY_LABELS,MACHINE_TYPE_LABELS } from '../constants';
import type { ChecklistFrequency,ChecklistTemplate, MachineType } from '../types';

const machineTypes = Object.keys(MACHINE_TYPE_LABELS) as MachineType[];
const frequencies = Object.keys(FREQUENCY_LABELS) as ChecklistFrequency[];

function MasterDataPage() {
  // Checklist templates — filtered by selected machine type
  const [selectedMachineType, setSelectedMachineType] = useState<MachineType | null>(null);
  const { data: templates = [], isLoading: loadingTemplates } = useChecklistTemplates(selectedMachineType || undefined);
  const createTemplate = useCreateChecklistTemplate();
  const updateTemplate = useUpdateChecklistTemplate();
  const deleteTemplate = useDeleteChecklistTemplate();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ChecklistTemplate | null>(null);

  // Template form
  const [templateTask, setTemplateTask] = useState('');
  const [templateFrequency, setTemplateFrequency] = useState<ChecklistFrequency>('DAILY');
  const [templateSortOrder, setTemplateSortOrder] = useState(1);

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
    setDialogOpen(true);
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
      setDialogOpen(false);
    } catch { toast.error('Failed to save template'); }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm('Delete this template?')) return;
    try { await deleteTemplate.mutateAsync(id); toast.success('Template deleted'); } catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-6">
      <DashboardHeader title="Master Data" description="Manage checklist templates" />

      {/* Machine Type Selector */}
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

      {selectedMachineType ? (
        <Card>
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
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Select a machine type above to view and manage its checklist templates.
          </CardContent>
        </Card>
      )}

      {/* Template Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
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
