import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Search, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useGlobalDateRange } from '@/core/store/hooks';
import { DateRangePicker } from '@/modules/gate/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import { Button, Card, CardContent, Dialog, DialogContent, DialogHeader, DialogTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from '@/shared/components/ui';

import { useApproveWasteAM, useApproveWasteEngineer, useApproveWasteHOD, useApproveWasteStore, useCreateWasteLog, useRuns, useSearchSAPItems,useWasteLogs } from '../api';
import { SignatureBlock } from '../components/SignatureBlock';
import { WasteApprovalBadge } from '../components/WasteApprovalBadge';
import { WasteLogTable } from '../components/WasteLogTable';
import { type CreateWasteFormData,createWasteSchema } from '../schemas';
import type { SAPItem } from '../types';
import type { WasteLog } from '../types';

function WasteManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const runIdFilter = searchParams.get('run_id') ? Number(searchParams.get('run_id')) : undefined;

  const { data: wasteLogs = [], isLoading, refetch: refetchWaste } = useWasteLogs(runIdFilter);
  const { data: runs = [] } = useRuns();
  const createWaste = useCreateWasteLog();
  const approveEngineer = useApproveWasteEngineer();
  const approveAM = useApproveWasteAM();
  const approveStore = useApproveWasteStore();
  const approveHOD = useApproveWasteHOD();

  const [showCreate, setShowCreate] = useState(false);
  const [selectedWaste, setSelectedWaste] = useState<WasteLog | null>(null);
  const [signName, setSignName] = useState('');

  // Filters (client-side)
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const { dateRange, dateRangeAsDateObjects, setDateRange } = useGlobalDateRange();

  const filteredWasteLogs = useMemo(() => {
    let result = wasteLogs;
    if (searchText.trim()) {
      const s = searchText.toLowerCase();
      result = result.filter((w) =>
        w.material_name.toLowerCase().includes(s) ||
        w.material_code.toLowerCase().includes(s) ||
        w.reason.toLowerCase().includes(s) ||
        String(w.run_number).includes(s) ||
        (w.run_product || '').toLowerCase().includes(s)
      );
    }
    if (statusFilter !== 'ALL') {
      result = result.filter((w) => w.wastage_approval_status === statusFilter);
    }
    if (dateRange.from) {
      result = result.filter((w) => (w.run_date || '') >= dateRange.from);
    }
    if (dateRange.to) {
      result = result.filter((w) => (w.run_date || '') <= dateRange.to);
    }
    return result;
  }, [wasteLogs, searchText, statusFilter, dateRange]);

  const hasFilters = searchText || statusFilter !== 'ALL';
  const [materialSearch, setMaterialSearch] = useState('');
  const { data: sapItems = [], isLoading: loadingItems } = useSearchSAPItems(materialSearch);
  const handleMaterialSearch = useCallback((s: string) => setMaterialSearch(s), []);

  const form = useForm<CreateWasteFormData>({
    resolver: zodResolver(createWasteSchema),
    defaultValues: runIdFilter ? { production_run_id: runIdFilter } : undefined,
  });

  const openCreate = () => {
    if (runIdFilter) {
      form.reset({ production_run_id: runIdFilter });
    } else {
      form.reset();
    }
    setShowCreate(true);
  };

  const onSubmit = async (data: CreateWasteFormData) => {
    try {
      await createWaste.mutateAsync(data);
      toast.success('Waste log created');
      setShowCreate(false);
      form.reset();
      refetchWaste();
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
      refetchWaste();
    } catch { toast.error('Approval failed'); }
  };

  const getNextApprovalLevel = (w: WasteLog): 'engineer' | 'am' | 'store' | 'hod' | null => {
    if (!w.engineer_sign) return 'engineer';
    if (!w.am_sign) return 'am';
    if (!w.store_sign) return 'store';
    if (!w.hod_sign) return 'hod';
    return null;
  };

  const filteredRun = runIdFilter ? runs.find((r) => r.id === runIdFilter) : null;

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Waste Management"
        description={filteredRun ? `Run #${filteredRun.run_number} — ${filteredRun.product} (${filteredRun.date})` : 'Waste logs and multi-level approval workflow'}
        primaryAction={{
          label: 'Log Waste',
          icon: <Plus className="h-4 w-4 mr-2" />,
          onClick: openCreate,
        }}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search material, reason, run..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PARTIALLY_APPROVED">Partially Approved</SelectItem>
            <SelectItem value="FULLY_APPROVED">Fully Approved</SelectItem>
          </SelectContent>
        </Select>
        <DateRangePicker
          date={dateRangeAsDateObjects}
          onDateChange={(d) => {
            if (d && 'from' in d) setDateRange(d);
          }}
        />
        {runIdFilter && (
          <div className="flex items-center gap-1 text-sm">
            <span className="text-muted-foreground">Run:</span>
            <span className="font-medium">#{filteredRun?.run_number || runIdFilter}</span>
            <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => setSearchParams({})}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setSearchText(''); setStatusFilter('ALL'); setDateFrom(''); setDateTo(''); }}>
            <X className="h-4 w-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      {isLoading ? (
        <Card><CardContent className="p-8 animate-pulse bg-muted/50" /></Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <WasteLogTable wasteLogs={filteredWasteLogs} onView={setSelectedWaste} showRunNumber={!runIdFilter} />
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
              {runIdFilter && filteredRun ? (
                <p className="text-sm font-medium mt-1">Run #{filteredRun.run_number} — {filteredRun.product}</p>
              ) : (
                <Select onValueChange={(v) => form.setValue('production_run_id', Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Select run" /></SelectTrigger>
                  <SelectContent>{runs.map((r) => (<SelectItem key={r.id} value={String(r.id)}>#{r.run_number} - {r.product} ({r.date})</SelectItem>))}</SelectContent>
                </Select>
              )}
            </div>
            <SearchableSelect<SAPItem>
              items={sapItems}
              isLoading={loadingItems && materialSearch.length >= 2}
              getItemKey={(item) => item.ItemCode}
              getItemLabel={(item) => `${item.ItemCode} - ${item.ItemName}`}
              filterFn={() => true}
              renderItem={(item) => (
                <div className="flex items-center justify-between w-full">
                  <div>
                    <span className="font-mono text-xs">{item.ItemCode}</span>
                    <span className="ml-2">{item.ItemName}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{item.UomCode}</span>
                </div>
              )}
              placeholder="Search material by code or name..."
              label="Material"
              required
              inputId="waste-material"
              loadingText="Searching..."
              emptyText="Type at least 2 characters to search"
              notFoundText="No materials found"
              onSearchChange={handleMaterialSearch}
              onItemSelect={(item) => {
                form.setValue('material_code', item.ItemCode);
                form.setValue('material_name', item.ItemName);
                form.setValue('uom', item.UomCode || '');
              }}
              onClear={() => {
                form.setValue('material_code', '');
                form.setValue('material_name', '');
                form.setValue('uom', '');
              }}
            />
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Wastage Qty</Label><Input {...form.register('wastage_qty')} /></div>
              <div><Label>UoM</Label><Input {...form.register('uom')} readOnly className="bg-muted" /></div>
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
                <div><span className="text-muted-foreground">Run:</span> #{selectedWaste.run_number || selectedWaste.production_run}</div>
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
