import { useState } from 'react';
import { Pencil, Plus, Users } from 'lucide-react';

import {
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
} from '@/shared/components/ui';

import { SHIFT_LABELS, SHIFT_ICONS } from '../constants';
import type { CreateManpowerRequest, ProductionManpower, Shift } from '../types';

const SHIFTS: Shift[] = ['MORNING', 'AFTERNOON', 'NIGHT'];

interface ManpowerSectionProps {
  manpower: ProductionManpower[];
  disabled?: boolean;
  onAdd: (data: CreateManpowerRequest) => void;
  onUpdate: (manpowerId: number, data: Partial<CreateManpowerRequest>) => void;
}

interface ManpowerFormState {
  shift: Shift;
  worker_count: number;
  supervisor: string;
  engineer: string;
  remarks: string;
}

const emptyForm = (shift: Shift): ManpowerFormState => ({
  shift,
  worker_count: 0,
  supervisor: '',
  engineer: '',
  remarks: '',
});

export function ManpowerSection({
  manpower,
  disabled = false,
  onAdd,
  onUpdate,
}: ManpowerSectionProps) {
  const existingShifts = new Set(manpower.map((m) => m.shift));
  const missingShifts = SHIFTS.filter((s) => !existingShifts.has(s));

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ManpowerFormState>(emptyForm('MORNING'));

  const openAdd = () => {
    const shift = missingShifts[0] ?? 'MORNING';
    setForm(emptyForm(shift));
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (entry: ProductionManpower) => {
    setForm({
      shift: entry.shift,
      worker_count: entry.worker_count,
      supervisor: entry.supervisor,
      engineer: entry.engineer,
      remarks: entry.remarks,
    });
    setEditingId(entry.id);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editingId) {
      onUpdate(editingId, {
        worker_count: form.worker_count,
        supervisor: form.supervisor,
        engineer: form.engineer,
        remarks: form.remarks,
      });
    } else {
      onAdd({
        shift: form.shift,
        worker_count: form.worker_count,
        supervisor: form.supervisor,
        engineer: form.engineer,
        remarks: form.remarks,
      });
    }
    setDialogOpen(false);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Manpower
            </CardTitle>
            {!disabled && missingShifts.length > 0 && (
              <Button size="sm" variant="outline" onClick={openAdd}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Shift
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {manpower.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No manpower entries yet. Click "Add Shift" to add one.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {manpower.map((entry) => {
                const ShiftIcon = SHIFT_ICONS[entry.shift];
                return (
                  <Card key={entry.id} className="bg-muted/30">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-medium text-sm">
                          <ShiftIcon className="h-4 w-4" />
                          {SHIFT_LABELS[entry.shift]}
                        </div>
                        {!disabled && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => openEdit(entry)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      <div className="text-xs space-y-1 text-muted-foreground">
                        <p>Workers: <span className="text-foreground font-medium">{entry.worker_count}</span></p>
                        {entry.supervisor && (
                          <p>Supervisor: <span className="text-foreground font-medium">{entry.supervisor}</span></p>
                        )}
                        {entry.engineer && (
                          <p>Engineer: <span className="text-foreground font-medium">{entry.engineer}</span></p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Shift' : 'Add Shift'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Shift *</Label>
              <select
                value={form.shift}
                disabled={!!editingId}
                onChange={(e) => setForm({ ...form, shift: e.target.value as Shift })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {editingId ? (
                  <option value={form.shift}>{SHIFT_LABELS[form.shift]}</option>
                ) : (
                  missingShifts.map((s) => (
                    <option key={s} value={s}>{SHIFT_LABELS[s]}</option>
                  ))
                )}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Number of Workers</Label>
              <Input
                type="number"
                min={0}
                value={form.worker_count || ''}
                placeholder="0"
                onChange={(e) => setForm({ ...form, worker_count: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Supervisor</Label>
              <Input
                value={form.supervisor}
                placeholder="Supervisor name"
                onChange={(e) => setForm({ ...form, supervisor: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Engineer</Label>
              <Input
                value={form.engineer}
                placeholder="Engineer name"
                onChange={(e) => setForm({ ...form, engineer: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Input
                value={form.remarks}
                placeholder="Optional remarks"
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingId ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
