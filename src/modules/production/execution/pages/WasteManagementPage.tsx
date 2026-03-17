import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent, Dialog, DialogContent, DialogHeader, DialogTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from '@/shared/components/ui';

import { useWasteLogs, useCreateWasteLog, useApproveWasteEngineer, useApproveWasteAM, useApproveWasteStore, useApproveWasteHOD, useRuns } from '../api';
import { WasteLogTable } from '../components/WasteLogTable';
import { SignatureBlock } from '../components/SignatureBlock';
import { WasteApprovalBadge } from '../components/WasteApprovalBadge';
import { createWasteSchema, type CreateWasteFormData } from '../schemas';
import type { WasteLog } from '../types';

function WasteManagementPage() {
  const { data: wasteLogs = [], isLoading } = useWasteLogs();
  const { data: runs = [] } = useRuns();
  const createWaste = useCreateWasteLog();
  const approveEngineer = useApproveWasteEngineer();
  const approveAM = useApproveWasteAM();
  const approveStore = useApproveWasteStore();
  const approveHOD = useApproveWasteHOD();

  const [showCreate, setShowCreate] = useState(false);
  const [selectedWaste, setSelectedWaste] = useState<WasteLog | null>(null);
  const [signName, setSignName] = useState('');

  const form = useForm<CreateWasteFormData>({
    resolver: zodResolver(createWasteSchema),
  });

  const onSubmit = async (data: CreateWasteFormData) => {
    try {
      await createWaste.mutateAsync(data);
      toast.success('Waste log created');
      setShowCreate(false);
      form.reset();
    } catch { toast.error('Failed to create waste log'); }
  };

  const handleApprove = async (wasteId: number, level: 'engineer' | 'am' | 'store' | 'hod') => {
    if (!signName.trim()) { toast.error('Please enter your name'); return; }
    const data = { wasteId, data: { sign: signName } };
    try {
      if (level === 'engineer') await approveEngineer.mutateAsync(data);
      else if (level === 'am') await approveAM.mutateAsync(data);
      else if (level === 'store') await approveStore.mutateAsync(data);
      else await approveHOD.mutateAsync(data);
      toast.success(`${level.toUpperCase()} approval recorded`);
      setSelectedWaste(null);
      setSignName('');
    } catch { toast.error('Approval failed'); }
  };

  const getNextApprovalLevel = (w: WasteLog): 'engineer' | 'am' | 'store' | 'hod' | null => {
    if (!w.engineer_sign) return 'engineer';
    if (!w.am_sign) return 'am';
    if (!w.store_sign) return 'store';
    if (!w.hod_sign) return 'hod';
    return null;
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Waste Management"
        description="Waste logs and multi-level approval workflow"
        primaryAction={{
          label: 'Log Waste',
          icon: <Plus className="h-4 w-4 mr-2" />,
          onClick: () => setShowCreate(true),
        }}
      />

      {isLoading ? (
        <Card><CardContent className="p-8 animate-pulse bg-muted/50" /></Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <WasteLogTable wasteLogs={wasteLogs} onView={setSelectedWaste} />
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Waste</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label>Production Run</Label>
              <Select onValueChange={(v) => form.setValue('production_run_id', Number(v))}>
                <SelectTrigger><SelectValue placeholder="Select run" /></SelectTrigger>
                <SelectContent>{runs.map((r) => (<SelectItem key={r.id} value={String(r.id)}>#{r.run_number} - {r.brand} ({r.date})</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Material Code</Label><Input {...form.register('material_code')} /></div>
              <div><Label>Material Name</Label><Input {...form.register('material_name')} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Wastage Qty</Label><Input {...form.register('wastage_qty')} /></div>
              <div><Label>UoM</Label><Input {...form.register('uom')} /></div>
            </div>
            <div><Label>Reason</Label><Textarea {...form.register('reason')} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={createWaste.isPending}>{createWaste.isPending ? 'Saving...' : 'Create'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail/Approve Dialog */}
      <Dialog open={!!selectedWaste} onOpenChange={() => setSelectedWaste(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Waste Log Detail</DialogTitle></DialogHeader>
          {selectedWaste && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Material:</span> {selectedWaste.material_name}</div>
                <div><span className="text-muted-foreground">Code:</span> {selectedWaste.material_code}</div>
                <div><span className="text-muted-foreground">Quantity:</span> {selectedWaste.wastage_qty} {selectedWaste.uom}</div>
                <div><span className="text-muted-foreground">Status:</span> <WasteApprovalBadge status={selectedWaste.wastage_approval_status} /></div>
              </div>
              <p className="text-sm"><span className="text-muted-foreground">Reason:</span> {selectedWaste.reason}</p>

              <div className="grid grid-cols-2 gap-3">
                <SignatureBlock label="Engineer" sign={selectedWaste.engineer_sign} signedAt={selectedWaste.engineer_signed_at} />
                <SignatureBlock label="AM" sign={selectedWaste.am_sign} signedAt={selectedWaste.am_signed_at} />
                <SignatureBlock label="Store" sign={selectedWaste.store_sign} signedAt={selectedWaste.store_signed_at} />
                <SignatureBlock label="HOD" sign={selectedWaste.hod_sign} signedAt={selectedWaste.hod_signed_at} />
              </div>

              {getNextApprovalLevel(selectedWaste) && (
                <div className="border-t pt-4 space-y-3">
                  <p className="text-sm font-medium">Approve as {getNextApprovalLevel(selectedWaste)!.toUpperCase()}</p>
                  <Input placeholder="Your name / designation" value={signName} onChange={(e) => setSignName(e.target.value)} />
                  <Button onClick={() => handleApprove(selectedWaste.id, getNextApprovalLevel(selectedWaste)!)} className="w-full">
                    Sign & Approve
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default WasteManagementPage;
