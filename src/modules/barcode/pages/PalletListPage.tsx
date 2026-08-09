import { PackageOpen, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useWMSWarehouses } from '@/modules/warehouse/api';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { PaginationControls } from '@/shared/components/PaginationControls';
import { Badge, Button, Card, CardContent } from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';

import { useCreatePallet, useDeleteEmptyPallet, usePalletsPage } from '../api';
import ScanSearchButton from '../components/ScanSearchButton';
import type { PalletStatus } from '../types';
import { toastBarcodeError } from '../utils/errors';

const STATUS_COLORS: Record<PalletStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  PARTIAL: 'bg-amber-100 text-amber-800',
  INSIDE_VEHICLE: 'bg-indigo-100 text-indigo-800',
  DISPATCHED: 'bg-blue-100 text-blue-800',
  EMPTY: 'bg-gray-100 text-gray-800',
  INACTIVE: 'bg-gray-100 text-gray-800',
  CLEARED: 'bg-gray-100 text-gray-800',
  SPLIT: 'bg-blue-100 text-blue-800',
  VOID: 'bg-red-100 text-red-800',
};

const formatBoxCapacity = (boxCount: number, maxBoxCount: number) => {
  if (!maxBoxCount) return boxCount === 0 ? 'Not set' : String(boxCount);
  return `${boxCount}/${maxBoxCount}`;
};

export default function PalletListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || '';
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const createPalletMutation = useCreatePallet();
  const deleteEmptyPalletMutation = useDeleteEmptyPallet();
  const {
    data: whList,
    isError: warehouseLoadFailed,
    isLoading: loadingWarehouses,
  } = useWMSWarehouses();
  const [form, setForm] = useState({
    warehouse: '',
  });

  useEffect(() => {
    setPage(1);
  }, [statusFilter, debouncedSearch, pageSize]);

  const { data: palletPage, isLoading } = usePalletsPage({
    status: statusFilter || undefined,
    search: debouncedSearch || undefined,
    page,
    page_size: pageSize,
  });
  const pallets = palletPage?.results ?? [];

  const updateForm = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleCreateEmptyPallet = async () => {
    const warehouse = form.warehouse.trim();

    if (!warehouse) {
      toast.error('Warehouse name is required.');
      return;
    }

    try {
      const pallet = await createPalletMutation.mutateAsync({
        box_ids: [],
        warehouse,
      });
      toast.success(`Created pallet ${pallet.pallet_id}`);
      navigate(`/barcode/pallets/${pallet.id}`);
    } catch (err: unknown) {
      toastBarcodeError(err, 'Unable to create pallet. Please check the warehouse.');
    }
  };

  const handleDeleteEmptyPallet = async (palletId: number, palletCode: string) => {
    if (!confirm(`Delete empty pallet ${palletCode}? This cannot be undone.`)) return;

    try {
      await deleteEmptyPalletMutation.mutateAsync(palletId);
      toast.success(`Deleted empty pallet ${palletCode}`);
    } catch (err: unknown) {
      toastBarcodeError(err, 'Unable to delete pallet. Only empty pallets can be deleted.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DashboardHeader title="Pallets" description="All pallets with barcode tracking" />
        <Button size="sm" onClick={() => setShowCreate((prev) => !prev)}>
          <Plus className="h-4 w-4 mr-1" /> New Pallet
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="max-w-sm">
              <label className="text-xs font-medium text-muted-foreground">Warehouse</label>
              <select
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                value={form.warehouse}
                onChange={(e) => updateForm('warehouse', e.target.value)}
                disabled={loadingWarehouses}
              >
                <option value="">
                  {loadingWarehouses ? 'Loading warehouses...' : 'Select warehouse'}
                </option>
                {whList?.warehouses.map((warehouse) => (
                  <option key={warehouse.code} value={warehouse.code}>
                    {warehouse.name ? `${warehouse.code} - ${warehouse.name}` : warehouse.code}
                  </option>
                ))}
              </select>
            </div>
            {warehouseLoadFailed && (
              <p className="text-sm text-destructive">
                Could not load warehouses from SAP HANA. Please refresh and try again.
              </p>
            )}
            <Button onClick={handleCreateEmptyPallet} disabled={createPalletMutation.isPending}>
              {createPalletMutation.isPending ? 'Creating...' : 'Create Empty Pallet'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            aria-label="Search by pallet ID"
            placeholder="Search by pallet ID..."
            className="w-full pl-9 pr-3 py-2 border rounded-md text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <ScanSearchButton onScan={setSearch} expectedType="PALLET" />
        <select
          className="border rounded-md px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PARTIAL">Partial</option>
          <option value="INSIDE_VEHICLE">Inside Vehicle</option>
          <option value="DISPATCHED">Dispatched</option>
          <option value="CLEARED">Cleared</option>
          <option value="SPLIT">Split</option>
          <option value="VOID">Void</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : pallets.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No pallets found</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Pallet ID</th>
                    <th className="text-right p-3 font-medium">Boxes</th>
                    <th className="text-right p-3 font-medium">Total Qty</th>
                    <th className="text-left p-3 font-medium">Warehouse</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Created</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pallets.map((p) => {
                    const isEmpty = p.box_count === 0;
                    return (
                      <tr
                        key={p.id}
                        className={`border-b cursor-pointer hover:bg-muted/30 ${
                          isEmpty ? 'bg-amber-50/80' : ''
                        }`}
                        onClick={() => navigate(`/barcode/pallets/${p.id}`)}
                      >
                        <td className="p-3 font-mono text-xs">
                          <div className="flex items-center gap-2">
                            {isEmpty && <PackageOpen className="h-4 w-4 text-amber-600" />}
                            {p.pallet_id}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          {formatBoxCapacity(p.box_count, p.max_box_count)}
                        </td>
                        <td className="p-3 text-right">
                          {p.total_qty} {p.uom}
                        </td>
                        <td className="p-3">{p.current_warehouse}</td>
                        <td className="p-3">
                          <Badge className={STATUS_COLORS[p.status]}>{p.status}</Badge>
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-right">
                          {isEmpty ? (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleDeleteEmptyPallet(p.id, p.pallet_id);
                              }}
                              disabled={deleteEmptyPalletMutation.isPending}
                              title="Delete empty pallet"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">In use</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationControls
              page={palletPage?.page ?? page}
              pageSize={palletPage?.page_size ?? pageSize}
              total={palletPage?.count ?? 0}
              totalPages={palletPage?.total_pages ?? 1}
              isLoading={isLoading}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
