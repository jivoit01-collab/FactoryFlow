import { Save } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NativeSelect,
  SelectOption,
  Textarea,
} from '@/shared/components/ui';

import type {
  AssetHierarchyLevel,
  AssetStatus,
  MaintenanceAsset,
  MaintenanceAssetPayload,
  MaintenanceOptions,
  StagedAssetDocument,
} from '../types';
import { AssetAttachmentsField } from './AssetAttachmentsField';

interface AssetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset?: MaintenanceAsset | null;
  options?: MaintenanceOptions;
  isSubmitting?: boolean;
  /** Hides the attachments field when the user cannot add asset documents. */
  canAttachDocuments?: boolean;
  onSubmit: (
    payload: MaintenanceAssetPayload,
    attachments: StagedAssetDocument[],
  ) => Promise<void> | void;
}

interface AssetFormState {
  asset_code: string;
  name: string;
  location: string;
  department: string;
  hierarchy_level: AssetHierarchyLevel;
  area: string;
  status: AssetStatus;
  make: string;
  model: string;
  serial_number: string;
  purchase_date: string;
  warranty_start_date: string;
  warranty_end_date: string;
  amc_vendor: string;
  amc_start_date: string;
  amc_end_date: string;
  qr_code: string;
  description: string;
}

const EMPTY_FORM: AssetFormState = {
  asset_code: '',
  name: '',
  location: '',
  department: '',
  hierarchy_level: 'MACHINE',
  area: '',
  status: 'RUNNING',
  make: '',
  model: '',
  serial_number: '',
  purchase_date: '',
  warranty_start_date: '',
  warranty_end_date: '',
  amc_vendor: '',
  amc_start_date: '',
  amc_end_date: '',
  qr_code: '',
  description: '',
};

function formFromAsset(asset?: MaintenanceAsset | null): AssetFormState {
  if (!asset) return EMPTY_FORM;
  return {
    asset_code: asset.asset_code,
    name: asset.name,
    location: String(asset.location),
    department: String(asset.department),
    hierarchy_level: asset.hierarchy_level,
    area: asset.area,
    status: asset.status,
    make: asset.make,
    model: asset.model,
    serial_number: asset.serial_number,
    purchase_date: asset.purchase_date ?? '',
    warranty_start_date: asset.warranty_start_date ?? '',
    warranty_end_date: asset.warranty_end_date ?? '',
    amc_vendor: asset.amc_vendor,
    amc_start_date: asset.amc_start_date ?? '',
    amc_end_date: asset.amc_end_date ?? '',
    qr_code: asset.qr_code,
    description: asset.description,
  };
}

function nullableDate(value: string) {
  return value || null;
}

export function AssetFormDialog({
  open,
  onOpenChange,
  asset,
  options,
  isSubmitting,
  canAttachDocuments = true,
  onSubmit,
}: AssetFormDialogProps) {
  const [form, setForm] = useState<AssetFormState>(() => formFromAsset(asset));
  const [attachments, setAttachments] = useState<StagedAssetDocument[]>([]);

  const setField = <TKey extends keyof AssetFormState>(key: TKey, value: AssetFormState[TKey]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Category, parent asset, production machine and line are not collected
    // here — the backend files assets saved without a category under "General".
    const payload: MaintenanceAssetPayload = {
      asset_code: form.asset_code.trim(),
      name: form.name.trim(),
      location: Number(form.location),
      department: Number(form.department),
      hierarchy_level: form.hierarchy_level,
      area: form.area.trim(),
      status: form.status,
      make: form.make.trim(),
      model: form.model.trim(),
      serial_number: form.serial_number.trim(),
      purchase_date: nullableDate(form.purchase_date),
      warranty_start_date: nullableDate(form.warranty_start_date),
      warranty_end_date: nullableDate(form.warranty_end_date),
      amc_vendor: form.amc_vendor.trim(),
      amc_start_date: nullableDate(form.amc_start_date),
      amc_end_date: nullableDate(form.amc_end_date),
      qr_code: form.qr_code.trim(),
      description: form.description.trim(),
    };
    await onSubmit(payload, attachments);
  };

  const mastersReady =
    (options?.locations.length ?? 0) > 0 && (options?.org_departments.length ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{asset ? 'Edit Asset' : 'New Asset'}</DialogTitle>
          <DialogDescription>Asset master</DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="asset_code">Asset Code</Label>
              <Input
                id="asset_code"
                value={form.asset_code}
                onChange={(event) => setField('asset_code', event.target.value)}
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Asset Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(event) => setField('name', event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <NativeSelect
                id="location"
                value={form.location}
                onChange={(event) => setField('location', event.target.value)}
                required
              >
                <SelectOption value="">Select location</SelectOption>
                {options?.locations.map((location) => (
                  <SelectOption key={location.id} value={String(location.id)}>
                    {location.name}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <NativeSelect
                id="department"
                value={form.department}
                onChange={(event) => setField('department', event.target.value)}
                required
              >
                <SelectOption value="">Select department</SelectOption>
                {options?.org_departments.map((department) => (
                  <SelectOption key={department.id} value={String(department.id)}>
                    {department.name}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hierarchy_level">Hierarchy</Label>
              <NativeSelect
                id="hierarchy_level"
                value={form.hierarchy_level}
                onChange={(event) =>
                  setField('hierarchy_level', event.target.value as AssetHierarchyLevel)
                }
              >
                {options?.hierarchy_levels.map((item) => (
                  <SelectOption key={item.value} value={item.value}>
                    {item.label}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <NativeSelect
                id="status"
                value={form.status}
                onChange={(event) => setField('status', event.target.value as AssetStatus)}
              >
                {options?.statuses.map((item) => (
                  <SelectOption key={item.value} value={item.value}>
                    {item.label}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="area">Area</Label>
              <Input
                id="area"
                value={form.area}
                onChange={(event) => setField('area', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="make">Make</Label>
              <Input
                id="make"
                value={form.make}
                onChange={(event) => setField('make', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={form.model}
                onChange={(event) => setField('model', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serial_number">Serial Number</Label>
              <Input
                id="serial_number"
                value={form.serial_number}
                onChange={(event) => setField('serial_number', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qr_code">QR Code</Label>
              <Input
                id="qr_code"
                value={form.qr_code}
                onChange={(event) => setField('qr_code', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase_date">Purchase Date</Label>
              <Input
                id="purchase_date"
                type="date"
                value={form.purchase_date}
                onChange={(event) => setField('purchase_date', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warranty_start_date">Warranty Start</Label>
              <Input
                id="warranty_start_date"
                type="date"
                value={form.warranty_start_date}
                onChange={(event) => setField('warranty_start_date', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warranty_end_date">Warranty End</Label>
              <Input
                id="warranty_end_date"
                type="date"
                value={form.warranty_end_date}
                onChange={(event) => setField('warranty_end_date', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amc_vendor">AMC Vendor</Label>
              <Input
                id="amc_vendor"
                value={form.amc_vendor}
                onChange={(event) => setField('amc_vendor', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amc_start_date">AMC Start</Label>
              <Input
                id="amc_start_date"
                type="date"
                value={form.amc_start_date}
                onChange={(event) => setField('amc_start_date', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amc_end_date">AMC End</Label>
              <Input
                id="amc_end_date"
                type="date"
                value={form.amc_end_date}
                onChange={(event) => setField('amc_end_date', event.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(event) => setField('description', event.target.value)}
              />
            </div>
          </div>

          {canAttachDocuments && (
            <AssetAttachmentsField
              value={attachments}
              onChange={setAttachments}
              documentTypes={options?.document_types}
              disabled={isSubmitting}
            />
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !mastersReady}>
              <Save className="h-4 w-4" />
              {asset ? 'Save Asset' : 'Create Asset'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
