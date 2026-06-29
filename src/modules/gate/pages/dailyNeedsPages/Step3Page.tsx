import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, FileText, Package, Plus, Trash2 } from 'lucide-react';
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

import { useCreateDailyNeed, useDailyNeed } from '../../api/dailyNeed/dailyNeed.queries';
import { useVehicleEntry } from '../../api/vehicle/vehicleEntry.queries';
import { CategorySelect, DepartmentSelect, FillDataAlert, UnitSelect } from '../../components';
import { useEntryId } from '../../hooks';

interface DailyNeedsMaterialItem {
  id: string;
  materialName: string;
  quantity: string;
  unit: string;
  unitName: string;
}

interface DailyNeedsFormData {
  itemCategory: number | '';
  supplierName: string;
  materials: DailyNeedsMaterialItem[];
  receivingDepartment: number | '';
  billNumber: string;
  deliveryChallanNumber: string;
  canteenSupervisor: string;
  remarks: string;
}

const createEmptyMaterialItem = (): DailyNeedsMaterialItem => ({
  id: `${Date.now()}-${Math.random()}`,
  materialName: '',
  quantity: '',
  unit: '',
  unitName: '',
});

export default function Step3Page() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { entryId, entryIdNumber, isEditMode } = useEntryId();
  const currentStep = 2;
  const totalSteps = 3;
  const progressPercentage = (currentStep / totalSteps) * 100;

  const { data: vehicleEntryData } = useVehicleEntry(
    isEditMode && entryIdNumber ? entryIdNumber : null,
  );

  // Fetch existing daily need data
  const {
    data: dailyNeedData,
    isLoading: isLoadingDailyNeed,
    error: dailyNeedError,
  } = useDailyNeed(isEditMode && entryIdNumber ? entryIdNumber : null);

  const createDailyNeed = useCreateDailyNeed(entryIdNumber || 0);

  // State to track if we should behave like create mode (when Fill Data is clicked)
  const [fillDataMode, setFillDataMode] = useState(false);
  // State to track if Update button has been clicked (enables editing)
  const [updateMode, setUpdateMode] = useState(false);
  // State to keep button disabled after API success until navigation completes
  const [isNavigating, setIsNavigating] = useState(false);

  const effectiveEditMode = isEditMode && !fillDataMode;

  // Check if error is "not found" error
  const isNotFoundError = checkNotFoundError(dailyNeedError);
  // Check if error is a server error (5xx)
  const hasServerError = checkServerError(dailyNeedError);

  // Form state
  const [formData, setFormData] = useState<DailyNeedsFormData>({
    itemCategory: '',
    supplierName: '',
    materials: [createEmptyMaterialItem()],
    receivingDepartment: '',
    billNumber: '',
    deliveryChallanNumber: '',
    canteenSupervisor: '',
    remarks: '',
  });

  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});

  // Scroll to first error when errors occur
  useScrollToError(apiErrors);

  // Fields are read-only when:
  // 1. In edit mode AND update mode is not active AND there's no not found error, OR
  // 2. There's a not found error AND fill data mode is not active
  const isReadOnly =
    (effectiveEditMode && !updateMode && !isNotFoundError) || (isNotFoundError && !fillDataMode);
  const canUpdate = effectiveEditMode && vehicleEntryData?.status !== ENTRY_STATUS.COMPLETED;

  // Load existing data in edit mode
  useEffect(() => {
    if (effectiveEditMode && dailyNeedData) {
      // Extract IDs from nested objects
      const categoryId = dailyNeedData.item_category?.id || '';
      const departmentId = dailyNeedData.receiving_department?.id || '';
      const materials =
        dailyNeedData.items && dailyNeedData.items.length > 0
          ? dailyNeedData.items.map((item, index) => ({
              id: item.id?.toString() || `${index}-${item.material_name}`,
              materialName: item.material_name || '',
              quantity: item.quantity?.toString() || '',
              unit:
                typeof item.unit === 'object'
                  ? item.unit?.id?.toString() || ''
                  : item.unit?.toString() || '',
              unitName: typeof item.unit === 'object' ? item.unit?.name || '' : '',
            }))
          : [
              {
                id: 'legacy-1',
                materialName: dailyNeedData.material_name || '',
                quantity: dailyNeedData.quantity?.toString() || '',
                unit:
                  typeof dailyNeedData.unit === 'object'
                    ? dailyNeedData.unit?.id?.toString() || ''
                    : dailyNeedData.unit?.toString() || '',
                unitName:
                  typeof dailyNeedData.unit === 'object' ? dailyNeedData.unit?.name || '' : '',
              },
            ];

      // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing form state with fetched data is a valid pattern
      setFormData({
        itemCategory: categoryId,
        supplierName: dailyNeedData.supplier_name || '',
        materials,
        receivingDepartment: departmentId,
        billNumber: dailyNeedData.bill_number || '',
        deliveryChallanNumber: dailyNeedData.delivery_challan_number || '',
        canteenSupervisor: dailyNeedData.canteen_supervisor || '',
        remarks: dailyNeedData.remarks || '',
      });
    }
  }, [effectiveEditMode, dailyNeedData]);

  const handleInputChange = (field: string, value: string | number) => {
    if (isReadOnly) return;
    setFormData((prev: DailyNeedsFormData) => ({ ...prev, [field]: value }));
    if (apiErrors[field]) {
      setApiErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleMaterialChange = (
    index: number,
    field: keyof Omit<DailyNeedsMaterialItem, 'id'>,
    value: string,
  ) => {
    if (isReadOnly) return;
    setFormData((prev) => ({
      ...prev,
      materials: prev.materials.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));

    const errorKey = `materials.${index}.${field}`;
    if (apiErrors[errorKey]) {
      setApiErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  const handleAddMaterial = () => {
    if (isReadOnly) return;
    setFormData((prev) => ({
      ...prev,
      materials: [...prev.materials, createEmptyMaterialItem()],
    }));
  };

  const handleRemoveMaterial = (index: number) => {
    if (isReadOnly || formData.materials.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      materials: prev.materials.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handlePrevious = () => {
    if (isEditMode && entryId) {
      navigate(`/gate/daily-needs/edit/${entryId}/step1`);
    } else {
      navigate(`/gate/daily-needs/new`);
    }
  };

  const handleCancel = () => {
    queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
    navigate('/gate/daily-needs');
  };

  const handleFillData = () => {
    setFillDataMode(true);
  };

  const handleUpdate = () => {
    setUpdateMode(true);
  };

  const handleSubmit = async () => {
    if (!entryId || !entryIdNumber) {
      setApiErrors({ general: 'Entry ID is missing. Please go back to step 1.' });
      return;
    }

    // In edit mode (and not fill data mode and not update mode), just navigate to attachments page
    if (effectiveEditMode && !updateMode) {
      navigate(`/gate/daily-needs/edit/${entryId}/attachments`);
      return;
    }

    setApiErrors({});

    // Validation
    const errors: Record<string, string> = {};

    if (!formData.itemCategory) {
      errors.itemCategory = 'Please select an item category';
    }
    if (!formData.supplierName) {
      errors.supplierName = 'Please enter supplier/vendor name';
    }
    formData.materials.forEach((item, index) => {
      if (!item.materialName.trim()) {
        errors[`materials.${index}.materialName`] = 'Please enter material name';
      }
      if (!item.quantity || parseFloat(item.quantity) <= 0) {
        errors[`materials.${index}.quantity`] = 'Please enter a valid quantity';
      }
      if (!item.unit) {
        errors[`materials.${index}.unit`] = 'Please select unit';
      }
    });
    if (!formData.receivingDepartment) {
      errors.receivingDepartment = 'Please select receiving department';
    }
    if (!formData.billNumber) {
      errors.billNumber = 'Please enter bill / challan number';
    }
    if (!formData.deliveryChallanNumber) {
      errors.deliveryChallanNumber = 'Please enter delivery challan number';
    }

    if (Object.keys(errors).length > 0) {
      setApiErrors(errors);
      return;
    }

    try {
      const items = formData.materials.map((item) => ({
        material_name: item.materialName.trim(),
        quantity: parseFloat(item.quantity),
        unit: parseInt(item.unit),
      }));
      const firstItem = items[0];

      await createDailyNeed.mutateAsync({
        item_category: formData.itemCategory as number,
        supplier_name: formData.supplierName,
        material_name: firstItem.material_name,
        quantity: firstItem.quantity,
        unit: firstItem.unit,
        items,
        receiving_department: (formData.receivingDepartment as number).toString(),
        bill_number: formData.billNumber,
        delivery_challan_number: formData.deliveryChallanNumber,
        canteen_supervisor: formData.canteenSupervisor || undefined,
        remarks: formData.remarks || undefined,
      });

      // Navigate to attachments page
      setIsNavigating(true);
      if (isEditMode && entryId) {
        navigate(`/gate/daily-needs/edit/${entryId}/attachments`);
      } else {
        navigate(`/gate/daily-needs/new/attachments?entryId=${entryId}`);
      }
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.errors) {
        const fieldErrors: Record<string, string> = {};
        Object.entries(apiError.errors).forEach(([field, messages]) => {
          if (field === 'items' && Array.isArray(messages)) {
            messages.forEach((itemError, index) => {
              if (typeof itemError === 'object' && itemError !== null) {
                Object.entries(itemError as Record<string, string[]>).forEach(
                  ([nestedField, nestedMessages]) => {
                    const uiField =
                      nestedField === 'material_name' ? 'materialName' : nestedField;
                    if (Array.isArray(nestedMessages) && nestedMessages.length > 0) {
                      fieldErrors[`materials.${index}.${uiField}`] = nestedMessages[0];
                    }
                  },
                );
              }
            });
            return;
          }
          if (Array.isArray(messages) && messages.length > 0) {
            const firstMessage = messages[0];
            if (typeof firstMessage === 'string') {
              fieldErrors[field] = firstMessage;
            } else if (typeof firstMessage === 'object' && firstMessage !== null) {
              Object.entries(firstMessage as Record<string, string[]>).forEach(
                ([nestedField, nestedMessages]) => {
                  const uiField = nestedField === 'material_name' ? 'materialName' : nestedField;
                  if (Array.isArray(nestedMessages) && nestedMessages.length > 0) {
                    fieldErrors[`materials.0.${uiField}`] = nestedMessages[0];
                  }
                },
              );
            }
          }
        });
        setApiErrors(fieldErrors);
      } else {
        setApiErrors({ general: apiError.message || 'Failed to save daily needs entry' });
      }
    }
  };

  // Loading state
  if (effectiveEditMode && isLoadingDailyNeed) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Daily Needs Entry - Step {currentStep} of {totalSteps}
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

      {(hasServerError || apiErrors.general) && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {hasServerError ? getServerErrorMessage() : apiErrors.general}
        </div>
      )}

      {/* Show not found error with Fill Data button */}
      {effectiveEditMode && isNotFoundError && !fillDataMode && !hasServerError && (
        <FillDataAlert
          message={getErrorMessage(dailyNeedError, 'Daily need entry does not exist')}
          onFillData={handleFillData}
        />
      )}

      <div className="space-y-6">
        {/* Item Category Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Item Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CategorySelect
              value={formData.itemCategory}
              onChange={(categoryId) => {
                handleInputChange('itemCategory', categoryId);
              }}
              placeholder="Select category"
              disabled={isReadOnly || createDailyNeed.isPending}
              error={apiErrors.itemCategory || apiErrors.item_category}
              label="Item Category"
              required
              initialDisplayText={dailyNeedData?.item_category?.category_name}
            />
          </CardContent>
        </Card>

        {/* Material Details Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Material Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="supplierName">
                  Supplier / Vendor Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="supplierName"
                  placeholder="Supplier / Vendor name"
                  value={formData.supplierName}
                  onChange={(e) => handleInputChange('supplierName', e.target.value)}
                  disabled={isReadOnly || createDailyNeed.isPending}
                  className={cn(
                    'border-2 font-medium',
                    (apiErrors.supplierName || apiErrors.supplier_name) && 'border-destructive',
                  )}
                />
                {apiErrors.supplierName && (
                  <p className="text-sm text-destructive">{apiErrors.supplierName}</p>
                )}
                {apiErrors.supplier_name && (
                  <p className="text-sm text-destructive">{apiErrors.supplier_name}</p>
                )}
              </div>

              <DepartmentSelect
                value={formData.receivingDepartment}
                onChange={(departmentId) => {
                  handleInputChange('receivingDepartment', departmentId);
                }}
                placeholder="Select Department"
                disabled={isReadOnly || createDailyNeed.isPending}
                error={apiErrors.receivingDepartment || apiErrors.receiving_department}
                label="Receiving Department"
                required
                initialDisplayText={dailyNeedData?.receiving_department?.name}
              />
            </div>
          </CardContent>
        </Card>

        {/* Material Items Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Material Items
            </CardTitle>
            {!isReadOnly && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddMaterial}
                disabled={createDailyNeed.isPending}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Material
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.materials.map((item, index) => (
              <div key={item.id} className="rounded-md border p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h4 className="text-sm font-medium">Material {index + 1}</h4>
                  {!isReadOnly && formData.materials.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMaterial(index)}
                      disabled={createDailyNeed.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor={`materialName-${item.id}`}>
                      Material Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id={`materialName-${item.id}`}
                      placeholder="Item description"
                      value={item.materialName}
                      onChange={(e) => handleMaterialChange(index, 'materialName', e.target.value)}
                      disabled={isReadOnly || createDailyNeed.isPending}
                      className={cn(
                        'border-2 font-medium',
                        apiErrors[`materials.${index}.materialName`] && 'border-destructive',
                      )}
                    />
                    {apiErrors[`materials.${index}.materialName`] && (
                      <p className="text-sm text-destructive">
                        {apiErrors[`materials.${index}.materialName`]}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`quantity-${item.id}`}>
                      Quantity <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id={`quantity-${item.id}`}
                      type="number"
                      min="0"
                      placeholder="0"
                      value={item.quantity}
                      onChange={(e) => handleMaterialChange(index, 'quantity', e.target.value)}
                      disabled={isReadOnly || createDailyNeed.isPending}
                      className={cn(
                        'border-2 font-medium',
                        apiErrors[`materials.${index}.quantity`] && 'border-destructive',
                      )}
                    />
                    {apiErrors[`materials.${index}.quantity`] && (
                      <p className="text-sm text-destructive">
                        {apiErrors[`materials.${index}.quantity`]}
                      </p>
                    )}
                  </div>

                  <UnitSelect
                    value={item.unit || undefined}
                    onChange={(unitId, unitName) => {
                      handleMaterialChange(index, 'unit', unitId.toString());
                      handleMaterialChange(index, 'unitName', unitName);
                    }}
                    placeholder="Select unit"
                    disabled={isReadOnly || createDailyNeed.isPending}
                    error={apiErrors[`materials.${index}.unit`]}
                    label="Unit"
                    required
                    initialDisplayText={item.unitName || undefined}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Documentation Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documentation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="billNumber">
                  Bill / Challan Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="billNumber"
                  placeholder="Bill or Challan no."
                  value={formData.billNumber}
                  onChange={(e) => handleInputChange('billNumber', e.target.value)}
                  disabled={isReadOnly || createDailyNeed.isPending}
                  className={cn(
                    'border-2 font-medium',
                    (apiErrors.billNumber || apiErrors.bill_number) && 'border-destructive',
                  )}
                />
                {apiErrors.billNumber && (
                  <p className="text-sm text-destructive">{apiErrors.billNumber}</p>
                )}
                {apiErrors.bill_number && (
                  <p className="text-sm text-destructive">{apiErrors.bill_number}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliveryChallanNumber">
                  Delivery Challan Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="deliveryChallanNumber"
                  placeholder="Delivery challan"
                  value={formData.deliveryChallanNumber}
                  onChange={(e) => handleInputChange('deliveryChallanNumber', e.target.value)}
                  disabled={isReadOnly || createDailyNeed.isPending}
                  className={cn(
                    'border-2 font-medium',
                    (apiErrors.deliveryChallanNumber || apiErrors.delivery_challan_number) &&
                      'border-destructive',
                  )}
                />
                {apiErrors.deliveryChallanNumber && (
                  <p className="text-sm text-destructive">{apiErrors.deliveryChallanNumber}</p>
                )}
                {apiErrors.delivery_challan_number && (
                  <p className="text-sm text-destructive">{apiErrors.delivery_challan_number}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="canteenSupervisor">Supervisor Name (if applicable)</Label>
                <Input
                  id="canteenSupervisor"
                  placeholder="Supervisor name"
                  value={formData.canteenSupervisor}
                  onChange={(e) => handleInputChange('canteenSupervisor', e.target.value)}
                  disabled={isReadOnly || createDailyNeed.isPending}
                  className="border-2 font-medium"
                />
              </div>

            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor="remarks">Remarks / Notes</Label>
              <textarea
                id="remarks"
                rows={4}
                className={cn(
                  'flex w-full rounded-md border-2 border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                )}
                placeholder="Additional information..."
                value={formData.remarks}
                onChange={(e) => handleInputChange('remarks', e.target.value)}
                disabled={isReadOnly || createDailyNeed.isPending}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer Actions */}
      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={handlePrevious}>
          ← Previous
        </Button>
        <Button type="button" variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        {effectiveEditMode ? (
          <>
            {canUpdate && !updateMode && (
              <Button type="button" onClick={handleUpdate}>
                Update
              </Button>
            )}
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={createDailyNeed.isPending || isNavigating}
            >
              {updateMode
                ? createDailyNeed.isPending || isNavigating
                  ? 'Saving...'
                  : 'Save and Next →'
                : 'Next →'}
            </Button>
          </>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={createDailyNeed.isPending || isNavigating}
          >
            {createDailyNeed.isPending || isNavigating ? 'Saving...' : 'Save and Next →'}
          </Button>
        )}
      </div>
    </div>
  );
}
