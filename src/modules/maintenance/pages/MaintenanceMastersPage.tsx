import { Building2, MapPin, Plus, RefreshCw, Tags } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { MAINTENANCE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

import {
  useCreateAssetCategory,
  useCreateAssetLocation,
  useCreateOrgDepartment,
  useMaintenanceOptions,
} from '../api';
import {
  type MaintenanceMasterKind,
  type MaintenanceMasterPayload,
  MasterDataDialog,
} from '../components';
import type {
  AssetCategory,
  AssetCategoryPayload,
  AssetLocation,
  AssetLocationPayload,
  OrgDepartmentOption,
  OrgDepartmentPayload,
} from '../types';

function MasterTable<TItem extends { id: number; name: string; description: string; assets_count?: number }>({
  title,
  icon: Icon,
  items,
  columns,
  onAdd,
  canAdd,
}: {
  title: string;
  icon: typeof Tags;
  items: TItem[];
  columns: Array<{ label: string; render: (item: TItem) => string | number }>;
  onAdd: () => void;
  canAdd: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <Button size="sm" variant="outline" onClick={onAdd} disabled={!canAdd}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                {columns.map((column) => (
                  <th key={column.label} className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {column.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Assets</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 2}
                    className="h-20 px-4 py-3 text-center text-muted-foreground"
                  >
                    No records found.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.description || '-'}</div>
                    </td>
                    {columns.map((column) => (
                      <td key={column.label} className="px-4 py-3">
                        {column.render(item) || '-'}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right tabular-nums">{item.assets_count ?? 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MaintenanceMastersPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogKind, setDialogKind] = useState<MaintenanceMasterKind>('category');
  const optionsQuery = useMaintenanceOptions();
  const createCategory = useCreateAssetCategory();
  const createLocation = useCreateAssetLocation();
  const createDepartment = useCreateOrgDepartment();
  const { hasAnyPermission } = usePermission();
  const canAdd = hasAnyPermission([
    MAINTENANCE_PERMISSIONS.CREATE_ASSET_CATEGORY,
    MAINTENANCE_PERMISSIONS.CREATE_ASSET_LOCATION,
    MAINTENANCE_PERMISSIONS.CREATE_ASSET_DEPARTMENT,
    MAINTENANCE_PERMISSIONS.MANAGE_SETTINGS,
  ]);

  const openDialog = (kind: MaintenanceMasterKind) => {
    setDialogKind(kind);
    setDialogOpen(true);
  };

  const handleSubmit = async (kind: MaintenanceMasterKind, payload: MaintenanceMasterPayload) => {
    if (kind === 'category') {
      await createCategory.mutateAsync(payload as AssetCategoryPayload);
      toast.success('Category created');
    } else if (kind === 'location') {
      await createLocation.mutateAsync(payload as AssetLocationPayload);
      toast.success('Location created');
    } else {
      await createDepartment.mutateAsync(payload as OrgDepartmentPayload);
      toast.success('Department created');
    }
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader title="Maintenance Masters" description="Asset category, location, and department">
        <Button
          variant="outline"
          size="sm"
          onClick={() => void optionsQuery.refetch()}
          disabled={optionsQuery.isFetching}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </DashboardHeader>

      <div className="grid gap-6 xl:grid-cols-3">
        <MasterTable<AssetCategory>
          title="Categories"
          icon={Tags}
          items={optionsQuery.data?.categories ?? []}
          columns={[]}
          onAdd={() => openDialog('category')}
          canAdd={canAdd}
        />
        <MasterTable<AssetLocation>
          title="Locations"
          icon={MapPin}
          items={optionsQuery.data?.locations ?? []}
          columns={[
            { label: 'Area', render: (item) => item.area },
            { label: 'Line', render: (item) => item.line },
          ]}
          onAdd={() => openDialog('location')}
          canAdd={canAdd}
        />
        <MasterTable<OrgDepartmentOption>
          title="Departments"
          icon={Building2}
          items={optionsQuery.data?.org_departments ?? []}
          columns={[]}
          onAdd={() => openDialog('department')}
          canAdd={canAdd}
        />
      </div>

      {dialogOpen && (
        <MasterDataDialog
          open={dialogOpen}
          kind={dialogKind}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          isSubmitting={
            createCategory.isPending || createLocation.isPending || createDepartment.isPending
          }
        />
      )}
    </div>
  );
}
