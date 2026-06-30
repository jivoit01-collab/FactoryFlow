import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, FileText, Package, Plus, Trash2, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ENTRY_STATUS } from '@/config/constants';
import type { ApiError } from '@/core/api';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@/shared/components/ui';
import { useScrollToError } from '@/shared/hooks';
import {
  getErrorMessage,
  getServerErrorMessage,
  isNotFoundError as checkNotFoundError,
  isServerError as checkServerError,
} from '@/shared/utils';
import { cn } from '@/shared/utils';

import {
  useCreateFixedAssetEntry,
  useFixedAssetEntry,
  useUpdateFixedAssetEntry,
} from '../../api/fixedAssets/fixedAssets.queries';
import { useVehicleEntry } from '../../api/vehicle/vehicleEntry.queries';
import { AssetCategorySelect, FillDataAlert, UnitSelect } from '../../components';
import { useEntryId } from '../../hooks';

interface AssetRow {
  key: string;
  assetCategory: string;
  assetCategoryName: string;
  assetName: string;
  serialNumber: string;
  quantity: string;
  unit: string;
  unitName: string;
}

let rowSeq = 0;
function emptyRow(): AssetRow {
  rowSeq += 1;
  return {
    key: `row-${rowSeq}`,
    assetCategory: '',
    assetCategoryName: '',
    assetName: '',
    serialNumber: '',
    quantity: '',
    unit: '',
    unitName: '',
  };
}

export default function Step2Page() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { entryId, entryIdNumber, isEditMode } = useEntryId();
  const currentStep = 2;
  const totalSteps = 3;
  const progressPercentage = (currentStep / totalSteps) * 100;

  const createFixedAssetEntry = useCreateFixedAssetEntry(entryIdNumber || 0);
  const updateFixedAssetEntry = useUpdateFixedAssetEntry(entryIdNumber || 0);
  const {
    data: assetData,
    isLoading: isLoadingAsset,
    error: assetError,
  } = useFixedAssetEntry(isEditMode && entryIdNumber ? entryIdNumber : null);
  const { data: vehicleEntryData } = useVehicleEntry(
    isEditMode && entryIdNumber ? entryIdNumber : null,
  );

  const [fillDataMode, setFillDataMode] = useState(false);
  const [updateMode, setUpdateMode] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const effectiveEditMode = isEditMode && !fillDataMode;

  const isNotFoundError = checkNotFoundError(assetError);
  const hasServerError = checkServerError(assetError);

  // Header state
  const [supplierName, setSupplierName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  // Asset line items
  const [rows, setRows] = useState<AssetRow[]>([emptyRow()]);

  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});

  useScrollToError(apiErrors);

  const isReadOnly =
    (effectiveEditMode && !updateMode && !isNotFoundError) || (isNotFoundError && !fillDataMode);
  const canUpdate = effectiveEditMode && vehicleEntryData?.status !== ENTRY_STATUS.COMPLETED;

  // Load asset data when in edit mode
  useEffect(() => {
    if (effectiveEditMode && assetData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing form state with fetched data is a valid pattern
      setSupplierName(assetData.supplier_name || '');
      setInvoiceNumber(assetData.invoice_number || '');
      setRemarks(assetData.remarks || '');
      const loadedRows: AssetRow[] = (assetData.items || []).map((item) => {
        rowSeq += 1;
        const category = item.asset_category;
        const unit = item.unit;
        return {
          key: `row-${rowSeq}`,
          assetCategory:
            typeof category === 'object' ? category.id.toString() : category?.toString() || '',
          assetCategoryName: typeof category === 'object' ? category.category_name : '',
          assetName: item.asset_name || '',
          serialNumber: item.serial_number || '',
          quantity: item.quantity?.toString() || '',
          unit: typeof unit === 'object' ? unit.id.toString() : unit?.toString() || '',
          unitName: typeof unit === 'object' ? unit.name : '',
        };
      });
      setRows(loadedRows.length > 0 ? loadedRows : [emptyRow()]);
    }
  }, [effectiveEditMode, assetData]);

  const clearError = (field: string) => {
    if (apiErrors[field]) {
      setApiErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const updateRow = (key: string, patch: Partial<AssetRow>) => {
    if (isReadOnly) return;
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    if (isReadOnly) return;
    setRows((prev) => [...prev, emptyRow()]);
  };

  const removeRow = (key: string) => {
    if (isReadOnly) return;
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  };

  const handlePrevious = () => {
    if (isEditMode && entryId) {
      navigate(`/gate/fixed-assets/edit/${entryId}/step1`);
    } else {
      navigate(`/gate/fixed-assets/new?entryId=${entryId}`);
    }
  };

  const handleCancel = () => {
    queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
    navigate('/gate/fixed-assets');
  };

  const handleFillData = () => setFillDataMode(true);
  const handleUpdate = () => setUpdateMode(true);

  const handleNext = async () => {
    if (!entryId || !entryIdNumber) {
      setApiErrors({ general: 'Entry ID is missing. Please go back to step 1.' });
      return;
    }

    if (effectiveEditMode && !updateMode) {
      navigate(`/gate/fixed-assets/edit/${entryId}/attachments`);
      return;
    }

    const errors: Record<string, string> = {};
    if (!supplierName.trim()) {
      errors.supplierName = 'Please enter the supplier name';
    }
    rows.forEach((row) => {
      if (!row.assetCategory) errors[`${row.key}:assetCategory`] = 'Select a category';
      if (!row.assetName.trim()) errors[`${row.key}:assetName`] = 'Enter asset name';
      if (!row.quantity || parseFloat(row.quantity) <= 0)
        errors[`${row.key}:quantity`] = 'Enter quantity';
      if (!row.unit) errors[`${row.key}:unit`] = 'Select unit';
    });

    if (Object.keys(errors).length > 0) {
      setApiErrors(errors);
      return;
    }

    setApiErrors({});

    try {
      const requestData = {
        supplier_name: supplierName.trim(),
        invoice_number: invoiceNumber.trim() || undefined,
        remarks: remarks.trim() || undefined,
        items: rows.map((row) => ({
          asset_category: parseInt(row.assetCategory, 10),
          asset_name: row.assetName.trim(),
          serial_number: row.serialNumber.trim() || undefined,
          quantity: parseFloat(row.quantity),
          unit: parseInt(row.unit, 10),
        })),
      };

      if (isEditMode && updateMode) {
        await updateFixedAssetEntry.mutateAsync(requestData);
      } else {
        await createFixedAssetEntry.mutateAsync(requestData);
      }

      setIsNavigating(true);
      if (isEditMode) {
        navigate(`/gate/fixed-assets/edit/${entryId}/attachments`);
      } else {
        navigate(`/gate/fixed-assets/new/attachments?entryId=${entryId}`);
      }
    } catch (error) {
      const apiError = error as ApiError;
      setApiErrors({ general: apiError.message || 'Failed to save fixed asset entry' });
    }
  };

  const isLoading = effectiveEditMode && isLoadingAsset;
  const isSaving =
    createFixedAssetEntry.isPending || updateFixedAssetEntry.isPending || isNavigating;

  const textareaClassName =
    'flex w-full rounded-md border-2 border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Fixed Asset Entry - Step {currentStep} of {totalSteps}
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <span className="text-sm font-medium text-muted-foreground min-w-[3rem]">
            {Math.round(progressPercentage)}%
          </span>
        </div>
      </div>

      {hasServerError && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {getServerErrorMessage()}
        </div>
      )}

      {!hasServerError && apiErrors.general && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {apiErrors.general}
        </div>
      )}

      {effectiveEditMode && isNotFoundError && !fillDataMode && (
        <FillDataAlert
          message={getErrorMessage(assetError, 'Fixed asset entry not found')}
          onFillData={handleFillData}
        />
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Supplier Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Supplier Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="supplierName">
                    Supplier Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="supplierName"
                    value={supplierName}
                    onChange={(e) => {
                      setSupplierName(e.target.value);
                      clearError('supplierName');
                    }}
                    placeholder="Enter supplier / vendor name"
                    disabled={isReadOnly}
                    className={cn('border-2 font-medium', apiErrors.supplierName && 'border-destructive')}
                  />
                  {apiErrors.supplierName && (
                    <p className="text-sm text-destructive">{apiErrors.supplierName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoiceNumber">Invoice / Bill Number</Label>
                  <Input
                    id="invoiceNumber"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="Enter invoice or bill number"
                    disabled={isReadOnly}
                    className="border-2 font-medium"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assets */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Assets <span className="text-destructive">*</span>
                </span>
                {!isReadOnly && (
                  <Button type="button" variant="outline" size="sm" onClick={addRow}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Asset
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {rows.map((row, idx) => (
                <div key={row.key} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Asset {idx + 1}
                    </span>
                    {!isReadOnly && rows.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRow(row.key)}
                        className="text-destructive hover:text-destructive h-8 px-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <AssetCategorySelect
                      value={row.assetCategory || undefined}
                      onChange={(categoryId, categoryName) => {
                        updateRow(row.key, {
                          assetCategory: categoryId,
                          assetCategoryName: categoryName,
                        });
                        clearError(`${row.key}:assetCategory`);
                      }}
                      placeholder="Select category"
                      disabled={isReadOnly}
                      error={apiErrors[`${row.key}:assetCategory`]}
                      label="Category"
                      required
                      initialDisplayText={row.assetCategoryName || undefined}
                    />

                    <div className="space-y-2">
                      <Label htmlFor={`assetName-${row.key}`}>
                        Asset Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id={`assetName-${row.key}`}
                        value={row.assetName}
                        onChange={(e) => {
                          updateRow(row.key, { assetName: e.target.value });
                          clearError(`${row.key}:assetName`);
                        }}
                        placeholder="e.g., Forklift, Laptop"
                        disabled={isReadOnly}
                        className={cn(
                          'border-2 font-medium',
                          apiErrors[`${row.key}:assetName`] && 'border-destructive',
                        )}
                      />
                      {apiErrors[`${row.key}:assetName`] && (
                        <p className="text-sm text-destructive">
                          {apiErrors[`${row.key}:assetName`]}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`serial-${row.key}`}>Serial Number</Label>
                      <Input
                        id={`serial-${row.key}`}
                        value={row.serialNumber}
                        onChange={(e) => updateRow(row.key, { serialNumber: e.target.value })}
                        placeholder="Enter serial / asset number"
                        disabled={isReadOnly}
                        className="border-2 font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor={`qty-${row.key}`}>
                          Quantity <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id={`qty-${row.key}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.quantity}
                          onChange={(e) => {
                            updateRow(row.key, { quantity: e.target.value });
                            clearError(`${row.key}:quantity`);
                          }}
                          placeholder="0"
                          disabled={isReadOnly}
                          className={cn(
                            'border-2 font-medium',
                            apiErrors[`${row.key}:quantity`] && 'border-destructive',
                          )}
                        />
                        {apiErrors[`${row.key}:quantity`] && (
                          <p className="text-sm text-destructive">
                            {apiErrors[`${row.key}:quantity`]}
                          </p>
                        )}
                      </div>

                      <UnitSelect
                        value={row.unit || undefined}
                        onChange={(unitId, unitName) => {
                          updateRow(row.key, { unit: unitId, unitName });
                          clearError(`${row.key}:unit`);
                        }}
                        placeholder="Unit"
                        disabled={isReadOnly}
                        error={apiErrors[`${row.key}:unit`]}
                        label="Unit"
                        required
                        initialDisplayText={row.unitName || undefined}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Remarks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Additional Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks</Label>
                <textarea
                  id="remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter any additional remarks or notes"
                  disabled={isReadOnly}
                  rows={3}
                  className={textareaClassName}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button type="button" variant="outline" onClick={handlePrevious}>
          Previous
        </Button>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          {effectiveEditMode && canUpdate && !updateMode && (
            <Button type="button" variant="secondary" onClick={handleUpdate}>
              Update
            </Button>
          )}
          <Button type="button" onClick={handleNext} disabled={isSaving}>
            {isSaving ? (
              <>
                <span className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Saving...
              </>
            ) : effectiveEditMode && !updateMode ? (
              'Next'
            ) : (
              'Save & Next'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
