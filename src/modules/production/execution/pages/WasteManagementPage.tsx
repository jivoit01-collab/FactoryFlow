import { Loader2, Plus, Search, Trash2, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useGlobalDateRange } from '@/core/store/hooks';
import { DateRangePicker } from '@/modules/gate/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/shared/components/ui';

import {
  useApproveWasteAM,
  useApproveWasteEngineer,
  useApproveWasteHOD,
  useApproveWasteStore,
  useCreateWasteLog,
  useMaterials,
  useRuns,
  useSearchSAPItems,
  useWasteLogs,
} from '../api';
import { SignatureBlock } from '../components/SignatureBlock';
import { WasteApprovalBadge } from '../components/WasteApprovalBadge';
import { WasteLogTable } from '../components/WasteLogTable';
import type { CreateWasteItemRequest, MaterialUsage, SAPItem, WasteLog } from '../types';

type WasteDraftSource = 'bom' | 'manual';

interface WasteDraftRow {
  key: string;
  source: WasteDraftSource;
  material_code: string;
  material_name: string;
  uom: string;
  bom_qty: string;
  wastage_qty: string;
}

function toBomWasteRow(material: MaterialUsage): WasteDraftRow {
  return {
    key: `bom-${material.id}`,
    source: 'bom',
    material_code: material.material_code,
    material_name: material.material_name,
    uom: material.uom,
    bom_qty: material.opening_qty || '0',
    wastage_qty: '',
  };
}

function getEnteredQty(value: string) {
  const qty = Number(value);
  return Number.isFinite(qty) ? qty : 0;
}

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
  const [selectedRunId, setSelectedRunId] = useState<number | undefined>(runIdFilter);
  const [manualRows, setManualRows] = useState<WasteDraftRow[]>([]);
  const [wasteQtyByKey, setWasteQtyByKey] = useState<Record<string, string>>({});
  const [commonReason, setCommonReason] = useState('');
  const [showManualPicker, setShowManualPicker] = useState(false);
  const [selectedWaste, setSelectedWaste] = useState<WasteLog | null>(null);
  const [signName, setSignName] = useState('');

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const { dateRange, dateRangeAsDateObjects, setDateRange, resetDateRange } = useGlobalDateRange();

  const selectedRun = selectedRunId ? runs.find((r) => r.id === selectedRunId) : undefined;
  const filteredRun = runIdFilter ? runs.find((r) => r.id === runIdFilter) : null;
  const { data: bomMaterials = [], isLoading: loadingBOMItems } = useMaterials(selectedRunId ?? 0);

  const [materialSearch, setMaterialSearch] = useState('');
  const { data: sapItems = [], isLoading: loadingItems } = useSearchSAPItems(materialSearch);
  const handleMaterialSearch = useCallback((s: string) => setMaterialSearch(s), []);

  const wasteRows = useMemo(() => {
    const bomRows = selectedRunId ? bomMaterials.map(toBomWasteRow) : [];
    return [...bomRows, ...manualRows].map((row) => ({
      ...row,
      wastage_qty: wasteQtyByKey[row.key] ?? '',
    }));
  }, [bomMaterials, manualRows, selectedRunId, wasteQtyByKey]);

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

  const enteredRows = useMemo(
    () => wasteRows.filter((row) => getEnteredQty(row.wastage_qty) > 0),
    [wasteRows],
  );
  const hasFilters = searchText || statusFilter !== 'ALL';

  const resetCreateState = () => {
    setSelectedRunId(runIdFilter);
    setManualRows([]);
    setWasteQtyByKey({});
    setCommonReason('');
    setShowManualPicker(false);
    setMaterialSearch('');
  };

  const openCreate = () => {
    resetCreateState();
    setShowCreate(true);
  };

  const handleCreateOpenChange = (open: boolean) => {
    setShowCreate(open);
    if (!open) resetCreateState();
  };

  const handleRunChange = (runId: number) => {
    setSelectedRunId(runId);
    setManualRows([]);
    setWasteQtyByKey({});
    setShowManualPicker(false);
    setMaterialSearch('');
  };

  const updateWasteQty = (rowKey: string, wastageQty: string) => {
    setWasteQtyByKey((qtyByKey) => ({ ...qtyByKey, [rowKey]: wastageQty }));
  };

  const addManualItem = (item: SAPItem) => {
    if (wasteRows.some((row) => row.material_code === item.ItemCode)) {
      toast.error('Item already added');
      return;
    }

    setManualRows((rows) => [
      ...rows,
      {
        key: `manual-${item.ItemCode}-${Date.now()}`,
        source: 'manual',
        material_code: item.ItemCode,
        material_name: item.ItemName,
        uom: item.UomCode || '',
        bom_qty: '',
        wastage_qty: '',
      },
    ]);
    setShowManualPicker(false);
    setMaterialSearch('');
  };

  const removeManualItem = (rowKey: string) => {
    setManualRows((rows) => rows.filter((row) => row.key !== rowKey));
    setWasteQtyByKey((qtyByKey) => {
      const next = { ...qtyByKey };
      delete next[rowKey];
      return next;
    });
  };

  const onSubmit = async () => {
    if (!selectedRunId) {
      toast.error('Select a production run');
      return;
    }

    const items: CreateWasteItemRequest[] = enteredRows.map((row) => ({
      material_code: row.material_code,
      material_name: row.material_name,
      wastage_qty: row.wastage_qty,
      uom: row.uom,
      reason: commonReason.trim(),
    }));

    if (items.length === 0) {
      toast.error('Enter waste quantity for at least one item');
      return;
    }

    try {
      await createWaste.mutateAsync({
        production_run_id: selectedRunId,
        reason: commonReason.trim(),
        items,
      });
      toast.success(`${items.length} waste item${items.length === 1 ? '' : 's'} created`);
      handleCreateOpenChange(false);
      refetchWaste();
    } catch {
      toast.error('Failed to create waste logs');
    }
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

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Waste Management"
        description={filteredRun ? `Run #${filteredRun.run_number} - ${filteredRun.product} (${filteredRun.date})` : 'Waste logs and multi-level approval workflow'}
        primaryAction={{
          label: 'Log Waste',
          icon: <Plus className="h-4 w-4 mr-2" />,
          onClick: openCreate,
        }}
      />

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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchText('');
              setStatusFilter('ALL');
              resetDateRange();
            }}
          >
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

      <Dialog open={showCreate} onOpenChange={handleCreateOpenChange}>
        <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Log Waste</DialogTitle></DialogHeader>
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,320px)]">
              <div>
                <Label>BOM / Production Run</Label>
                {runIdFilter && filteredRun ? (
                  <p className="text-sm font-medium mt-2">Run #{filteredRun.run_number} - {filteredRun.product}</p>
                ) : (
                  <Select
                    value={selectedRunId ? String(selectedRunId) : undefined}
                    onValueChange={(value) => handleRunChange(Number(value))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select run" />
                    </SelectTrigger>
                    <SelectContent>
                      {runs.map((run) => (
                        <SelectItem key={run.id} value={String(run.id)}>
                          #{run.run_number} - {run.product} ({run.date})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <Label>Rows With Waste Qty</Label>
                <div className="mt-2 h-10 rounded-md border bg-muted/40 px-3 flex items-center text-sm font-medium">
                  {enteredRows.length} of {wasteRows.length}
                </div>
              </div>
            </div>

            <div>
              <Label>Reason</Label>
              <Textarea
                value={commonReason}
                onChange={(e) => setCommonReason(e.target.value)}
                placeholder="Reason for waste"
                className="mt-2"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">
                  {selectedRun ? `BOM Items - Run #${selectedRun.run_number}` : 'BOM Items'}
                </p>
                {loadingBOMItems && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading BOM items
                  </p>
                )}
              </div>
              <Button type="button" variant="outline" onClick={() => setShowManualPicker((open) => !open)}>
                <Plus className="h-4 w-4 mr-2" /> Add Item Manually
              </Button>
            </div>

            {showManualPicker && (
              <SearchableSelect<SAPItem>
                items={sapItems}
                isLoading={loadingItems && materialSearch.length >= 2}
                getItemKey={(item) => item.ItemCode}
                getItemLabel={(item) => `${item.ItemCode} - ${item.ItemName}`}
                filterFn={() => true}
                renderItem={(item) => (
                  <div className="flex items-center justify-between w-full gap-3">
                    <div className="min-w-0">
                      <span className="font-mono text-xs">{item.ItemCode}</span>
                      <span className="ml-2">{item.ItemName}</span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{item.UomCode}</span>
                  </div>
                )}
                placeholder="Search material by code or name..."
                label="Manual Item"
                inputId="manual-waste-material"
                loadingText="Searching..."
                emptyText="Type at least 2 characters to search"
                notFoundText="No materials found"
                onSearchChange={handleMaterialSearch}
                onItemSelect={addManualItem}
                onClear={() => setMaterialSearch('')}
              />
            )}

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-muted/60 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Source</th>
                    <th className="px-3 py-2 text-left font-medium">Item Code</th>
                    <th className="px-3 py-2 text-left font-medium">Item Name</th>
                    <th className="px-3 py-2 text-left font-medium">Unit</th>
                    <th className="px-3 py-2 text-right font-medium">BOM Qty</th>
                    <th className="px-3 py-2 text-right font-medium">Waste Qty</th>
                    <th className="px-3 py-2 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {wasteRows.map((row) => (
                    <tr key={row.key} className="border-t">
                      <td className="px-3 py-2">
                        <Badge variant={row.source === 'bom' ? 'secondary' : 'outline'}>
                          {row.source === 'bom' ? 'BOM' : 'Manual'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{row.material_code || '-'}</td>
                      <td className="px-3 py-2">{row.material_name}</td>
                      <td className="px-3 py-2">{row.uom || '-'}</td>
                      <td className="px-3 py-2 text-right">{row.bom_qty || '-'}</td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.001"
                          inputMode="decimal"
                          value={row.wastage_qty}
                          onChange={(e) => updateWasteQty(row.key, e.target.value)}
                          className="ml-auto w-32 text-right"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        {row.source === 'manual' ? (
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeManualItem(row.key)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!loadingBOMItems && wasteRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                        {selectedRunId ? 'No BOM items found for this run' : 'Select a run to load BOM items'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => handleCreateOpenChange(false)}>Cancel</Button>
              <Button type="button" onClick={onSubmit} disabled={createWaste.isPending || enteredRows.length === 0}>
                {createWaste.isPending ? 'Saving...' : 'Submit'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
