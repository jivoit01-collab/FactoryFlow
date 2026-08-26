import { ArrowLeft, Edit, ExternalLink, FileText, Image, RefreshCw, Trash2, Upload } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { MAINTENANCE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui';
import { resolveFileUrl } from '@/shared/utils/media';

import {
  useAssetDocuments,
  useAssetPhotos,
  useDeactivateMaintenanceAsset,
  useMaintenanceAsset,
  useMaintenanceOptions,
  useMaintenanceWorkOrders,
  useUpdateMaintenanceAsset,
  useUploadAssetDocument,
  useUploadAssetDocuments,
  useUploadAssetPhoto,
} from '../api';
import {
  AssetDocumentUploadDialog,
  AssetFormDialog,
  AssetPhotoUploadDialog,
  AssetStatusBadge,
  WorkOrderStatusBadge,
} from '../components';
import type {
  AssetDocument,
  AssetDocumentType,
  AssetDocumentUploadPayload,
  AssetPhoto,
  AssetPhotoUploadPayload,
  MaintenanceAssetPayload,
  MaintenanceOptions,
  MaintenanceWorkOrder,
  StagedAssetDocument,
} from '../types';

function valueOrDash(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '-';
  return value;
}

function DetailItem({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{valueOrDash(value)}</div>
    </div>
  );
}

function fileNameFromUrl(fileUrl: string) {
  const cleanUrl = fileUrl.split('?')[0] ?? fileUrl;
  const fileName = cleanUrl.split('/').pop();
  return fileName ? decodeURIComponent(fileName) : 'Attachment';
}

function getDocumentTypeLabel(type: AssetDocumentType, options?: MaintenanceOptions) {
  return options?.document_types.find((item) => item.value === type)?.label ?? type.replaceAll('_', ' ');
}

function AssetPhotoList({
  photos,
  isLoading,
}: {
  photos: AssetPhoto[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return <div className="rounded-md border p-4 text-sm text-muted-foreground">Loading photos...</div>;
  }

  if (photos.length === 0) {
    return <div className="rounded-md border p-4 text-sm text-muted-foreground">No photos uploaded yet.</div>;
  }

  return (
    <div className="space-y-2">
      {photos.map((photo) => (
        <div key={photo.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">
              {photo.caption || fileNameFromUrl(photo.photo)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {photo.taken_on}
              {photo.is_monthly_photo ? ' - Monthly photo' : ''}
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href={resolveFileUrl(photo.photo)} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              Open
            </a>
          </Button>
        </div>
      ))}
    </div>
  );
}

function AssetDocumentList({
  documents,
  isLoading,
  options,
}: {
  documents: AssetDocument[];
  isLoading: boolean;
  options?: MaintenanceOptions;
}) {
  if (isLoading) {
    return <div className="rounded-md border p-4 text-sm text-muted-foreground">Loading documents...</div>;
  }

  if (documents.length === 0) {
    return <div className="rounded-md border p-4 text-sm text-muted-foreground">No documents uploaded yet.</div>;
  }

  return (
    <div className="space-y-2">
      {documents.map((document) => (
        <div key={document.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{document.title}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {getDocumentTypeLabel(document.document_type, options)}
              {document.document_date ? ` - ${document.document_date}` : ''}
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href={resolveFileUrl(document.document)} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              Open
            </a>
          </Button>
        </div>
      ))}
    </div>
  );
}

function AssetWorkOrderHistory({
  workOrders,
  isLoading,
  onOpen,
}: {
  workOrders: MaintenanceWorkOrder[];
  isLoading: boolean;
  onOpen: (workOrderId: number) => void;
}) {
  if (isLoading) {
    return <div className="rounded-md border p-4 text-sm text-muted-foreground">Loading work history...</div>;
  }

  if (workOrders.length === 0) {
    return <div className="rounded-md border p-4 text-sm text-muted-foreground">No work orders linked yet.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Work</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Priority</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Assignee</th>
          </tr>
        </thead>
        <tbody>
          {workOrders.map((workOrder) => (
            <tr
              key={workOrder.id}
              className="cursor-pointer border-b last:border-b-0 hover:bg-muted/50"
              onClick={() => onOpen(workOrder.id)}
            >
              <td className="px-4 py-3">
                <div className="font-semibold text-primary">{workOrder.work_order_no}</div>
                <div className="max-w-[260px] truncate text-xs text-muted-foreground">
                  {workOrder.title}
                </div>
              </td>
              <td className="px-4 py-3">{workOrder.work_type.replaceAll('_', ' ')}</td>
              <td className="px-4 py-3">{workOrder.priority}</td>
              <td className="px-4 py-3">
                <WorkOrderStatusBadge status={workOrder.status} />
              </td>
              <td className="px-4 py-3">{workOrder.assigned_to_name || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MaintenanceAssetDetailPage() {
  const navigate = useNavigate();
  const { assetId } = useParams<{ assetId: string }>();
  const numericAssetId = assetId ? Number(assetId) : null;
  const validAssetId =
    numericAssetId !== null && Number.isFinite(numericAssetId) ? numericAssetId : null;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const { hasPermission } = usePermission();
  const canEdit = hasPermission(MAINTENANCE_PERMISSIONS.EDIT_ASSET);
  const canDeactivate = hasPermission(MAINTENANCE_PERMISSIONS.DEACTIVATE_ASSET);
  const canUploadPhoto = hasPermission(MAINTENANCE_PERMISSIONS.CREATE_ASSET_PHOTO);
  const canUploadDocument = hasPermission(MAINTENANCE_PERMISSIONS.CREATE_ASSET_DOCUMENT);

  const assetQuery = useMaintenanceAsset(validAssetId);
  const photosQuery = useAssetPhotos(validAssetId);
  const documentsQuery = useAssetDocuments(validAssetId);
  const workOrdersQuery = useMaintenanceWorkOrders(
    validAssetId !== null ? { asset: validAssetId, is_active: true } : undefined,
    validAssetId !== null,
  );
  const optionsQuery = useMaintenanceOptions();
  const updateAsset = useUpdateMaintenanceAsset();
  const deactivateAsset = useDeactivateMaintenanceAsset();
  const uploadPhoto = useUploadAssetPhoto();
  const uploadDocument = useUploadAssetDocument();
  const uploadDocuments = useUploadAssetDocuments();
  const asset = assetQuery.data;
  const photos = photosQuery.data ?? [];
  const documents = documentsQuery.data ?? [];
  const workOrders = workOrdersQuery.data ?? [];

  const handleSubmit = async (
    payload: MaintenanceAssetPayload,
    attachments: StagedAssetDocument[],
  ) => {
    if (!asset) return;
    await updateAsset.mutateAsync({ assetId: asset.id, payload });
    toast.success('Asset updated');

    if (attachments.length) {
      try {
        await uploadDocuments.mutateAsync({ assetId: asset.id, staged: attachments });
        toast.success(
          attachments.length === 1
            ? 'Attachment uploaded'
            : `${attachments.length} attachments uploaded`,
        );
      } catch {
        toast.warning(
          'Some attachments failed to upload. Add them again from the documents section.',
        );
      }
    }
    setDialogOpen(false);
  };

  const handleDeactivate = async () => {
    if (!asset || !window.confirm(`Deactivate ${asset.asset_code}?`)) return;
    await deactivateAsset.mutateAsync(asset.id);
    toast.success('Asset deactivated');
  };

  const handleRefresh = () => {
    void assetQuery.refetch();
    void photosQuery.refetch();
    void documentsQuery.refetch();
    void workOrdersQuery.refetch();
  };

  const handlePhotoUpload = async (payload: AssetPhotoUploadPayload) => {
    await uploadPhoto.mutateAsync(payload);
    toast.success('Asset photo uploaded');
    setPhotoDialogOpen(false);
  };

  const handleDocumentUpload = async (payload: AssetDocumentUploadPayload) => {
    await uploadDocument.mutateAsync(payload);
    toast.success('Asset document uploaded');
    setDocumentDialogOpen(false);
  };

  if (validAssetId === null) {
    return (
      <div className="p-6">
        <Button variant="outline" onClick={() => navigate('/maintenance/assets')}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader title={asset?.asset_code ?? 'Asset'} description={asset?.name ?? 'Asset detail'}>
        <Button variant="outline" size="sm" asChild>
          <Link to="/maintenance/assets">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={
            assetQuery.isFetching ||
            photosQuery.isFetching ||
            documentsQuery.isFetching ||
            workOrdersQuery.isFetching
          }
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
        <Button
          size="sm"
          onClick={() => setDialogOpen(true)}
          disabled={!asset || !canEdit || !asset.is_active}
        >
          <Edit className="h-4 w-4" />
          Edit
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => void handleDeactivate()}
          disabled={!asset || !canDeactivate || !asset.is_active}
        >
          <Trash2 className="h-4 w-4" />
          Deactivate
        </Button>
      </DashboardHeader>

      {assetQuery.isLoading ? (
        <div className="flex h-48 items-center justify-center rounded-md border text-sm text-muted-foreground">
          Loading asset...
        </div>
      ) : !asset ? (
        <div className="flex h-48 items-center justify-center rounded-md border text-sm text-muted-foreground">
          Asset not found.
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Asset</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <DetailItem label="Code" value={asset.asset_code} />
                <div>
                  <div className="text-xs font-medium uppercase text-muted-foreground">Status</div>
                  <div className="mt-1">
                    <AssetStatusBadge status={asset.status} />
                  </div>
                </div>
                <DetailItem label="Name" value={asset.name} />
                <DetailItem label="Hierarchy" value={asset.hierarchy_level} />
                <DetailItem label="Category" value={asset.category_name} />
                <DetailItem label="Parent" value={asset.parent_asset_code} />
                <DetailItem label="Location" value={asset.location_name} />
                <DetailItem label="Department" value={asset.department_name} />
                <DetailItem label="Area" value={asset.area} />
                <DetailItem label="Line" value={asset.line} />
                <DetailItem label="Production Machine" value={asset.production_machine_name} />
                <DetailItem label="Production Line" value={asset.production_line_name} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg">Photos</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPhotoDialogOpen(true)}
                  disabled={!asset.is_active || !canUploadPhoto}
                >
                  <Upload className="h-4 w-4" />
                  Upload
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Image className="h-5 w-5 text-muted-foreground" />
                  <span className="text-3xl font-bold">{photos.length || asset.photos_count}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg">Documents</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDocumentDialogOpen(true)}
                  disabled={!asset.is_active || !canUploadDocument}
                >
                  <Upload className="h-4 w-4" />
                  Upload
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span className="text-3xl font-bold">{documents.length || asset.documents_count}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-lg">Asset Photos</CardTitle>
                  <CardDescription>{photos.length || asset.photos_count} uploaded</CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setPhotoDialogOpen(true)}
                  disabled={!asset.is_active || !canUploadPhoto}
                >
                  <Upload className="h-4 w-4" />
                  Upload
                </Button>
              </CardHeader>
              <CardContent>
                <AssetPhotoList photos={photos} isLoading={photosQuery.isLoading} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-lg">Asset Documents</CardTitle>
                  <CardDescription>{documents.length || asset.documents_count} uploaded</CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setDocumentDialogOpen(true)}
                  disabled={!asset.is_active || !canUploadDocument}
                >
                  <Upload className="h-4 w-4" />
                  Upload
                </Button>
              </CardHeader>
              <CardContent>
                <AssetDocumentList
                  documents={documents}
                  isLoading={documentsQuery.isLoading}
                  options={optionsQuery.data}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Machine Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <DetailItem label="Make" value={asset.make} />
              <DetailItem label="Model" value={asset.model} />
              <DetailItem label="Serial Number" value={asset.serial_number} />
              <DetailItem label="QR Code" value={asset.qr_code} />
              <DetailItem label="Purchase Date" value={asset.purchase_date} />
              <DetailItem label="Production Type" value={asset.production_machine_type} />
              <DetailItem label="Responsible" value={asset.responsible_person_name} />
              <DetailItem label="Active" value={asset.is_active ? 'Yes' : 'No'} />
              <DetailItem label="Deactivated At" value={asset.deactivated_at} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Work History</CardTitle>
            </CardHeader>
            <CardContent>
              <AssetWorkOrderHistory
                workOrders={workOrders}
                isLoading={workOrdersQuery.isLoading}
                onOpen={(id) => navigate(`/maintenance/work-orders/${id}`)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Warranty / AMC</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <DetailItem label="Warranty Start" value={asset.warranty_start_date} />
              <DetailItem label="Warranty End" value={asset.warranty_end_date} />
              <DetailItem label="AMC Vendor" value={asset.amc_vendor} />
              <DetailItem label="AMC Start" value={asset.amc_start_date} />
              <DetailItem label="AMC End" value={asset.amc_end_date} />
            </CardContent>
          </Card>

          {asset.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Description</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">{asset.description}</CardContent>
            </Card>
          )}
        </>
      )}

      {dialogOpen && (
        <AssetFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          asset={asset}
          options={optionsQuery.data}
          isSubmitting={updateAsset.isPending || uploadDocuments.isPending}
          canAttachDocuments={canUploadDocument}
          onSubmit={handleSubmit}
        />
      )}
      {asset && (
        <>
          {photoDialogOpen && (
            <AssetPhotoUploadDialog
              open={photoDialogOpen}
              assetId={asset.id}
              isSubmitting={uploadPhoto.isPending}
              onOpenChange={setPhotoDialogOpen}
              onSubmit={handlePhotoUpload}
            />
          )}
          {documentDialogOpen && (
            <AssetDocumentUploadDialog
              open={documentDialogOpen}
              assetId={asset.id}
              documentTypes={optionsQuery.data?.document_types}
              isSubmitting={uploadDocument.isPending}
              onOpenChange={setDocumentDialogOpen}
              onSubmit={handleDocumentUpload}
            />
          )}
        </>
      )}
    </div>
  );
}
