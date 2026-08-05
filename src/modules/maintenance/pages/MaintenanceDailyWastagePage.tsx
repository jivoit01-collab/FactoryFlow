import { Camera, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { MAINTENANCE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from '@/shared/components/ui';

import {
  useCreateDailyWastageLog,
  useDailyWastageLogs,
  useDeleteDailyWastageLog,
  useUpdateDailyWastageLog,
} from '../api';
import type { DailyWastageLog } from '../types';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonthISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

const EMPTY_FORM = {
  date: todayISO(),
  material_name: '',
  qty: '',
  uom: '',
  reason: '',
};

export default function MaintenanceDailyWastagePage() {
  const { hasPermission } = usePermission();
  const canManage = hasPermission(MAINTENANCE_PERMISSIONS.MANAGE_DAILY_WASTAGE);

  const [dateFrom, setDateFrom] = useState(firstOfMonthISO());
  const [dateTo, setDateTo] = useState(todayISO());
  const [search, setSearch] = useState('');

  const { data: logs = [], isLoading } = useDailyWastageLogs({
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    search: search || undefined,
  });

  const createLog = useCreateDailyWastageLog();
  const updateLog = useUpdateDailyWastageLog();
  const deleteLog = useDeleteDailyWastageLog();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<DailyWastageLog | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const openAdd = () => {
    setEditingLog(null);
    setForm({ ...EMPTY_FORM, date: todayISO() });
    setPhotoFile(null);
    setPhotoPreview(null);
    setDialogOpen(true);
  };

  const openEdit = (log: DailyWastageLog) => {
    setEditingLog(log);
    setForm({
      date: log.date,
      material_name: log.material_name,
      qty: log.qty,
      uom: log.uom,
      reason: log.reason,
    });
    setPhotoFile(null);
    setPhotoPreview(log.photo);
    setDialogOpen(true);
  };

  const onPhotoChange = (file: File | null) => {
    setPhotoFile(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : editingLog?.photo ?? null);
  };

  const submit = async () => {
    if (!form.date || !form.material_name.trim() || form.qty === '') {
      toast.error('Enter the date, material and quantity');
      return;
    }
    const payload = {
      date: form.date,
      material_name: form.material_name.trim(),
      qty: form.qty,
      uom: form.uom,
      reason: form.reason,
      photoFile,
    };
    try {
      if (editingLog) {
        await updateLog.mutateAsync({ logId: editingLog.id, payload });
        toast.success('Wastage entry updated');
      } else {
        await createLog.mutateAsync(payload);
        toast.success('Wastage recorded');
      }
      setDialogOpen(false);
    } catch {
      /* interceptor surfaces backend detail */
    }
  };

  const remove = async (log: DailyWastageLog) => {
    if (!window.confirm(`Delete the ${log.date} entry for ${log.material_name}?`)) return;
    try {
      await deleteLog.mutateAsync(log.id);
      toast.success('Wastage entry deleted');
    } catch {
      toast.error('Failed to delete entry');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Daily Wastage"
        description="Factory-wide daily wastage register — record what was wasted and why"
      >
        {canManage && (
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" /> Add Wastage
          </Button>
        )}
      </DashboardHeader>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 p-4">
          <div>
            <Label htmlFor="waste-date-from">From</Label>
            <Input
              id="waste-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="waste-date-to">To</Label>
            <Input
              id="waste-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div className="min-w-[220px] flex-1">
            <Label htmlFor="waste-search">Search</Label>
            <Input
              id="waste-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Material or reason..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Log table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading wastage log...</div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 text-muted-foreground">
              <Trash2 className="mb-2 h-8 w-8" />
              <p>No wastage entries in this period.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Material</th>
                    <th className="px-3 py-2 font-medium text-right">Qty</th>
                    <th className="px-3 py-2 font-medium">UoM</th>
                    <th className="px-3 py-2 font-medium">Reason</th>
                    <th className="px-3 py-2 font-medium">Photo</th>
                    <th className="px-3 py-2 font-medium">Entered By</th>
                    {canManage && <th className="px-3 py-2" />}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="whitespace-nowrap px-3 py-2">{log.date}</td>
                      <td className="px-3 py-2">{log.material_name}</td>
                      <td className="px-3 py-2 text-right font-medium">{log.qty}</td>
                      <td className="px-3 py-2">{log.uom}</td>
                      <td className="max-w-[320px] truncate px-3 py-2" title={log.reason}>
                        {log.reason}
                      </td>
                      <td className="px-3 py-2">
                        {log.photo ? (
                          <a
                            href={log.photo}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <Camera className="h-4 w-4" /> View
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">{log.created_by_name}</td>
                      {canManage && (
                        <td className="whitespace-nowrap px-3 py-2 text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(log)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(log)}
                            disabled={deleteLog.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLog ? 'Edit Wastage Entry' : 'Add Wastage Entry'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="waste-date">Date</Label>
                <Input
                  id="waste-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="waste-material">Material</Label>
                <Input
                  id="waste-material"
                  value={form.material_name}
                  onChange={(e) => setForm((p) => ({ ...p, material_name: e.target.value }))}
                  placeholder="What was wasted?"
                />
              </div>
              <div>
                <Label htmlFor="waste-qty">Quantity</Label>
                <Input
                  id="waste-qty"
                  type="number"
                  step="0.001"
                  min="0"
                  value={form.qty}
                  onChange={(e) => setForm((p) => ({ ...p, qty: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="waste-uom">UoM</Label>
                <Input
                  id="waste-uom"
                  value={form.uom}
                  onChange={(e) => setForm((p) => ({ ...p, uom: e.target.value }))}
                  placeholder="KG / LTR / PCS..."
                />
              </div>
            </div>
            <div>
              <Label htmlFor="waste-reason">Reason</Label>
              <Textarea
                id="waste-reason"
                value={form.reason}
                onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                placeholder="Why did the wastage happen?"
              />
            </div>
            <div>
              <Label htmlFor="waste-photo">Photo (optional)</Label>
              <Input
                id="waste-photo"
                type="file"
                accept="image/*"
                onChange={(e) => onPhotoChange(e.target.files?.[0] ?? null)}
              />
              {photoPreview && (
                <img
                  src={photoPreview}
                  alt="Wastage proof"
                  className="mt-2 max-h-40 rounded-md border object-contain"
                />
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={createLog.isPending || updateLog.isPending}>
                {(createLog.isPending || updateLog.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                )}
                {editingLog ? 'Save Entry' : 'Add Entry'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
