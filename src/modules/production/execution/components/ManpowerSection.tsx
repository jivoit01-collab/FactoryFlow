import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button, Card, CardContent, Dialog, DialogContent, DialogHeader, DialogTitle, Input, Label } from '@/shared/components/ui';

import { type CreateLabourFormData,createLabourSchema } from '../schemas';
import type { ProductionRunDetail, ResourceLabour } from '../types';

interface ManpowerSectionProps {
  run: ProductionRunDetail;
  labourEntries: ResourceLabour[];
  totalRunningMinutes: number;
  readOnly?: boolean;
  onAddLabour: (data: CreateLabourFormData) => Promise<void>;
  onUpdateLabour: (id: number, data: CreateLabourFormData) => Promise<void>;
  onDeleteLabour: (id: number) => Promise<void>;
}

export function ManpowerSection({
  run,
  labourEntries,
  totalRunningMinutes,
  readOnly,
  onAddLabour,
  onUpdateLabour,
  onDeleteLabour,
}: ManpowerSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ResourceLabour | null>(null);
  const totalManpower = run.labour_count + run.other_manpower_count;
  const totalLabourCost = labourEntries.reduce((sum, e) => sum + parseFloat(e.total_cost || '0'), 0);
  const totalHours = (totalRunningMinutes / 60).toFixed(1);

  const form = useForm<CreateLabourFormData>({
    resolver: zodResolver(createLabourSchema),
    defaultValues: { description: '', worker_count: 1, hours_worked: totalHours, rate_per_hour: '' },
  });

  const openAdd = () => {
    setEditingEntry(null);
    form.reset({ description: '', worker_count: 1, hours_worked: totalHours, rate_per_hour: '' });
    setDialogOpen(true);
  };

  const openEdit = (entry: ResourceLabour) => {
    setEditingEntry(entry);
    form.reset({
      description: entry.description || '',
      worker_count: entry.worker_count,
      hours_worked: entry.hours_worked,
      rate_per_hour: entry.rate_per_hour,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (data: CreateLabourFormData) => {
    try {
      if (editingEntry) {
        await onUpdateLabour(editingEntry.id, data);
      } else {
        await onAddLabour(data);
      }
      setDialogOpen(false);
      setEditingEntry(null);
    } catch { /* error handled by parent */ }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Users className="h-3.5 w-3.5" /> Total Manpower
            </div>
            <p className="text-xl font-bold">{totalManpower}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground mb-1">Labour</div>
            <p className="text-xl font-bold">{run.labour_count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground mb-1">Other Manpower</div>
            <p className="text-xl font-bold">{run.other_manpower_count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground mb-1">Total Labour Cost</div>
            <p className="text-xl font-bold">{totalLabourCost > 0 ? `₹${totalLabourCost.toLocaleString()}` : '-'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Personnel Info */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Supervisor</span>
          <p className="font-medium">{run.supervisor || '-'}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Engineer / Operators</span>
          <p className="font-medium">{run.operators || '-'}</p>
        </div>
      </div>

      {/* Labour Cost Breakdown */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-sm">Labour Cost Breakdown</h4>
          {!readOnly && (
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4 mr-1" /> Add Rate Entry
            </Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th scope="col" className="text-left p-2 font-medium">Description</th>
                <th scope="col" className="text-right p-2 font-medium">Workers</th>
                <th scope="col" className="text-right p-2 font-medium">Hours</th>
                <th scope="col" className="text-right p-2 font-medium">Rate/hr</th>
                <th scope="col" className="text-right p-2 font-medium">Total</th>
                {!readOnly && <th scope="col" className="p-2 w-20" />}
              </tr>
            </thead>
            <tbody>
              {labourEntries.map((e) => (
                <tr key={e.id} className="border-b hover:bg-muted/30">
                  <td className="p-2">{e.description || 'Workers'}</td>
                  <td className="p-2 text-right">{e.worker_count}</td>
                  <td className="p-2 text-right">{e.hours_worked}</td>
                  <td className="p-2 text-right">₹{e.rate_per_hour}</td>
                  <td className="p-2 text-right font-medium">₹{parseFloat(e.total_cost).toLocaleString()}</td>
                  {!readOnly && (
                    <td className="p-2">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(e)} className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => onDeleteLabour(e.id)} className="rounded p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {labourEntries.length === 0 && (
                <tr><td colSpan={readOnly ? 5 : 6} className="p-4 text-center text-muted-foreground">No labour cost entries yet</td></tr>
              )}
            </tbody>
            {labourEntries.length > 0 && (
              <tfoot>
                <tr className="border-t-2 font-semibold bg-muted/30">
                  <td colSpan={4} className="p-2">Total Labour Cost</td>
                  <td className="p-2 text-right">₹{totalLabourCost.toLocaleString()}</td>
                  {!readOnly && <td />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Add/Edit Labour Entry Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingEntry(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEntry ? 'Edit Labour Rate Entry' : 'Add Labour Rate Entry'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div>
              <Label>Description</Label>
              <Input {...form.register('description')} placeholder="e.g., Skilled labourers, Helpers" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Workers</Label>
                <Input type="number" {...form.register('worker_count', { valueAsNumber: true })} />
              </div>
              <div>
                <Label>Hours Worked</Label>
                <Input {...form.register('hours_worked')} placeholder={totalHours} />
              </div>
              <div>
                <Label>Rate/hr (₹)</Label>
                <Input {...form.register('rate_per_hour')} placeholder="e.g., 150" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editingEntry ? 'Save Changes' : 'Add Entry'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
