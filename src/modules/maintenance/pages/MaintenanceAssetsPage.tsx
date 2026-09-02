import { Edit, Eye, Plus, RefreshCw, Search, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { MAINTENANCE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { confirmDialog } from '@/shared/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Input, Label, NativeSelect, SelectOption } from '@/shared/components/ui';

import {
  useCreateMaintenanceAsset,
  useDeactivateMaintenanceAsset,
  useMaintenanceAssets,
  useMaintenanceOptions,
  useUpdateMaintenanceAsset,
  useUploadAssetDocuments,
} from '../api';
import { AssetFormDialog, AssetStatusBadge } from '../components';
import type {
  AssetStatus,
  MaintenanceAsset,
  MaintenanceAssetFilters,
  MaintenanceAssetPayload,
  StagedAssetDocument,
} from '../types';

function useInitialStatus(): AssetStatus | 'ALL' {
  const searchParams = new URLSearchParams(useLocation().search);
  const status = searchParams.get('status');
  if (
    status === 'RUNNING' ||
    status === 'IDLE' ||
    status === 'BREAKDOWN' ||
    status === 'UNDER_PM' ||
    status === 'UNDER_REPAIR' ||
    status === 'RETIRED'
  ) {
    return status;
  }
  return 'ALL';
}

export default function MaintenanceAssetsPage() {
  const navigate = useNavigate();
  const initialStatus = useInitialStatus();
  const { hasPermission } = usePermission();
  const canCreate = hasPermission(MAINTENANCE_PERMISSIONS.CREATE_ASSET);
  const canEdit = hasPermission(MAINTENANCE_PERMISSIONS.EDIT_ASSET);
  const canDeactivate = hasPermission(MAINTENANCE_PERMISSIONS.DEACTIVATE_ASSET);
  const canUploadDocument = hasPermission(MAINTENANCE_PERMISSIONS.CREATE_ASSET_DOCUMENT);

  const [filters, setFilters] = useState<MaintenanceAssetFilters>({
    search: '',
    status: initialStatus,
    category: 'ALL',
    department: 'ALL',
    location: 'ALL',
    line: '',
    is_active: true,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<MaintenanceAsset | null>(null);

  const optionsQuery = useMaintenanceOptions();
  const assetsQuery = useMaintenanceAssets(filters);
  const createAsset = useCreateMaintenanceAsset();
  const updateAsset = useUpdateMaintenanceAsset();
  const deactivateAsset = useDeactivateMaintenanceAsset();
  const uploadDocuments = useUploadAssetDocuments();

  const assets = useMemo(() => assetsQuery.data ?? [], [assetsQuery.data]);
  const lineOptions = useMemo(
    () =>
      Array.from(new Set(assets.map((asset) => asset.line).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [assets],
  );

  const openCreate = () => {
    setEditingAsset(null);
    setDialogOpen(true);
  };

  const openEdit = (asset: MaintenanceAsset) => {
    setEditingAsset(asset);
    setDialogOpen(true);
  };

  const handleSubmit = async (
    payload: MaintenanceAssetPayload,
    attachments: StagedAssetDocument[],
  ) => {
    const saved = editingAsset
      ? await updateAsset.mutateAsync({ assetId: editingAsset.id, payload })
      : await createAsset.mutateAsync(payload);
    toast.success(editingAsset ? 'Asset updated' : 'Asset created');

    // Files need the asset id, so they upload after the save. The asset is
    // already stored — a failed upload is a warning, not a rollback.
    if (attachments.length) {
      try {
        await uploadDocuments.mutateAsync({ assetId: saved.id, staged: attachments });
        toast.success(
          attachments.length === 1
            ? 'Attachment uploaded'
            : `${attachments.length} attachments uploaded`,
        );
      } catch {
        toast.warning(
          `${saved.asset_code} was saved, but some attachments failed to upload. Add them again from the asset.`,
        );
      }
    }
    setDialogOpen(false);
  };

  const handleDeactivate = async (asset: MaintenanceAsset) => {
    const confirmed = await confirmDialog({
      title: `Deactivate ${asset.asset_code}?`,
      confirmLabel: 'Deactivate',
      destructive: true,
    });
    if (!confirmed) return;
    await deactivateAsset.mutateAsync(asset.id);
    toast.success('Asset deactivated');
  };

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader title="Assets" description="Maintenance asset master">
        <Button
          variant="outline"
          size="sm"
          onClick={() => void assetsQuery.refetch()}
          disabled={assetsQuery.isFetching}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
        <Button size="sm" onClick={openCreate} disabled={!canCreate}>
          <Plus className="h-4 w-4" />
          New Asset
        </Button>
      </DashboardHeader>

      <div className="grid gap-3 rounded-md border p-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="space-y-2 xl:col-span-2">
          <Label htmlFor="asset_search">Search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="asset_search"
              value={filters.search ?? ''}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="asset_status">Status</Label>
          <NativeSelect
            id="asset_status"
            value={filters.status ?? 'ALL'}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                status: event.target.value as AssetStatus | 'ALL',
              }))
            }
          >
            <SelectOption value="ALL">All</SelectOption>
            {optionsQuery.data?.statuses.map((item) => (
              <SelectOption key={item.value} value={item.value}>
                {item.label}
              </SelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="asset_category">Category</Label>
          <NativeSelect
            id="asset_category"
            value={filters.category ?? 'ALL'}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                category: event.target.value === 'ALL' ? 'ALL' : Number(event.target.value),
              }))
            }
          >
            <SelectOption value="ALL">All</SelectOption>
            {optionsQuery.data?.categories.map((item) => (
              <SelectOption key={item.id} value={String(item.id)}>
                {item.name}
              </SelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="asset_department">Department</Label>
          <NativeSelect
            id="asset_department"
            value={filters.department ?? 'ALL'}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                department: event.target.value === 'ALL' ? 'ALL' : Number(event.target.value),
              }))
            }
          >
            <SelectOption value="ALL">All</SelectOption>
            {optionsQuery.data?.departments.map((item) => (
              <SelectOption key={item.id} value={String(item.id)}>
                {item.name}
              </SelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="asset_line">Line</Label>
          <NativeSelect
            id="asset_line"
            value={filters.line ?? ''}
            onChange={(event) => setFilters((current) => ({ ...current, line: event.target.value }))}
          >
            <SelectOption value="">All</SelectOption>
            {lineOptions.map((line) => (
              <SelectOption key={line} value={line}>
                {line}
              </SelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[1180px] text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Asset</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Department</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Area / Line</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Production Machine</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Make / Model</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {assetsQuery.isLoading ? (
              <tr>
                <td colSpan={8} className="h-28 px-4 py-3 text-center text-muted-foreground">
                  Loading assets...
                </td>
              </tr>
            ) : assets.length === 0 ? (
              <tr>
                <td colSpan={8} className="h-28 px-4 py-3 text-center text-muted-foreground">
                  <SlidersHorizontal className="mx-auto mb-2 h-5 w-5" />
                  No assets found.
                </td>
              </tr>
            ) : (
              assets.map((asset) => (
                <tr key={asset.id} className="border-b last:border-b-0 hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="text-left font-semibold text-primary hover:underline"
                      onClick={() => navigate(`/maintenance/assets/${asset.id}`)}
                    >
                      {asset.asset_code}
                    </button>
                    <div className="text-xs text-muted-foreground">{asset.name}</div>
                  </td>
                  <td className="px-4 py-3">{asset.category_name}</td>
                  <td className="px-4 py-3">{asset.department_name}</td>
                  <td className="px-4 py-3">
                    <div>{asset.area || '-'}</div>
                    <div className="text-xs text-muted-foreground">{asset.line || '-'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{asset.production_machine_name || '-'}</div>
                    <div className="text-xs text-muted-foreground">
                      {asset.production_line_name || asset.production_machine_type || '-'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <AssetStatusBadge status={asset.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div>{asset.make || '-'}</div>
                    <div className="text-xs text-muted-foreground">{asset.model || '-'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/maintenance/assets/${asset.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(asset)}
                        disabled={!canEdit || !asset.is_active}
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => void handleDeactivate(asset)}
                        disabled={!canDeactivate || !asset.is_active}
                      >
                        <Trash2 className="h-4 w-4" />
                        Deactivate
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {dialogOpen && (
        <AssetFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          asset={editingAsset}
          options={optionsQuery.data}
          isSubmitting={createAsset.isPending || updateAsset.isPending || uploadDocuments.isPending}
          canAttachDocuments={canUploadDocument}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
