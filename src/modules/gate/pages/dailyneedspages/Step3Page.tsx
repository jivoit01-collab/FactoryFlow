import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, FileText, Package, Scale } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ENTRY_STATUS, VALIDATION_PATTERNS } from '@/config/constants';
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

interface DailyNeedsFormData {
  itemCategory: number | '';
  supplierName: string;
  materialName: string;
  quantity: string;
  unit: string;
  unitName: string;
  receivingDepartment: number | '';
  billNumber: string;
  deliveryChallanNumber: string;
  canteenSupervisor: string;
  vehicleOrPersonName: string;
  contactNumber: string;
  remarks: string;
}

export default function Step3Page() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { entryId, entryIdNumber, isEditMode } = useEntryId();
  const currentStep = 3;
  const totalSteps = 4;
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
    materialName: '',
    quantity: '0',
    unit: '',
    unitName: '',
    receivingDepartment: '',
    billNumber: '',
    deliveryChallanNumber: '',
    canteenSupervisor: '',
    vehicleOrPersonName: '',
    contactNumber: '',
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

      // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing form state with fetched data is a valid pattern
      setFormData({
        itemCategory: categoryId,
        supplierName: dailyNeedData.supplier_name || '',
        materialName: dailyNeedData.material_name || '',
        quantity: dailyNeedData.quantity?.toString() || '0',
        unit:
          typeof dailyNeedData.unit === 'object'
            ? dailyNeedData.unit?.id?.toString() || ''
            : dailyNeedData.unit?.toString() || '',
        unitName: typeof dailyNeedData.unit === 'object' ? dailyNeedData.unit?.name || '' : '',
        receivingDepartment: departmentId,
        billNumber: dailyNeedData.bill_number || '',
        deliveryChallanNumber: dailyNeedData.delivery_challan_number || '',
        canteenSupervisor: dailyNeedData.canteen_supervisor || '',
        vehicleOrPersonName: dailyNeedData.vehicle_or_person_name || '',
        contactNumber: dailyNeedData.contact_number || '',
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

  const handlePrevious = () => {
    if (isEditMode && entryId) {
      navigate(`/gate/daily-needs/edit/${entryId}/step2`);
    } else {
      navigate(`/gate/daily-needs/new/step2?entryId=${entryId}`);
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
    if (!formData.materialName) {
      errors.materialName = 'Please enter material name';
    }
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      errors.quantity = 'Please enter a valid quantity';
    }
    if (!formData.unit) {
      errors.unit = 'Please select unit';
    }
    if (!formData.receivingDepartment) {
      errors.receivingDepartment = 'Please select receiving department';
    }
    if (!formData.billNumber) {
      errors.billNumber = 'Please enter bill / challan number';
    }
    if (!formData.deliveryChallanNumber) {
      errors.deliveryChallanNumber = 'Please enter delivery challan number';
    }
    if (!formData.vehicleOrPersonName) {
      errors.vehicleOrPersonName = 'Please enter vehicle / person name';
    }
    if (!formData.contactNumber) {
      errors.contactNumber = 'Please enter contact number';
    } else if (!VALIDATION_PATTERNS.phone.test(formData.contactNumber)) {
      errors.contactNumber = 'Please enter a valid 10-digit phone number';
    }

    if (Object.keys(errors).length > 0) {
      setApiErrors(errors);
      return;
    }

    try {
      await createDailyNeed.mutateAsync({
        item_category: formData.itemCategory as number,
        supplier_name: formData.supplierName,
        material_name: formData.materialName,
        quantity: parseFloat(formData.quantity),
        unit: parseInt(formData.unit),
        receiving_department: (formData.receivingDepartment as number).toString(),
        bill_number: formData.billNumber,
        delivery_challan_number: formData.deliveryChallanNumber,
        canteen_supervisor: formData.canteenSupervisor || undefined,
        vehicle_or_person_name: formData.vehicleOrPersonName,
        contact_number: formData.contactNumber,
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
          if (Array.isArray(messages) && messages.length > 0) {
            fieldErrors[field] = messages[0];
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

              <div className="space-y-2">
                <Label htmlFor="materialName">
                  Material Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="materialName"
                  placeholder="Item description"
                  value={formData.materialName}
                  onChange={(e) => handleInputChange('materialName', e.target.value)}
                  disabled={isReadOnly || createDailyNeed.isPending}
                  className={cn(
                    'border-2 font-medium',
                    (apiErrors.materialName || apiErrors.material_name) && 'border-destructive',
                  )}
                />
                {apiErrors.materialName && (
                  <p className="text-sm text-destructive">{apiErrors.materialName}</p>
                )}
                {apiErrors.material_name && (
                  <p className="text-sm text-destructive">{apiErrors.material_name}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quantity & Unit Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Quantity & Unit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="quantity">
                  Quantity <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange('quantity', e.target.value)}
                  disabled={isReadOnly || createDailyNeed.isPending}
                  className={cn('border-2 font-medium', apiErrors.quantity && 'border-destructive')}
                />
                {apiErrors.quantity && (
                  <p className="text-sm text-destructive">{apiErrors.quantity}</p>
                )}
              </div>

              <UnitSelect
                value={formData.unit || undefined}
                onChange={(unitId, unitName) => {
                  handleInputChange('unit', unitId);
                  setFormData((prev: DailyNeedsFormData) => ({ ...prev, unitName }));
                }}
                placeholder="Select unit"
                disabled={isReadOnly || createDailyNeed.isPending}
                error={apiErrors.unit}
                label="Unit"
                required
                initialDisplayText={formData.unitName || undefined}
              />

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

        {/* Documentation & Contact Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documentation & Contact
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

              <div className="space-y-2">
                <Label htmlFor="vehicleOrPersonName">
                  Vehicle / Person Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="vehicleOrPersonName"
                  placeholder="eg: Tempo DL01AB2236"
                  value={formData.vehicleOrPersonName}
                  onChange={(e) => handleInputChange('vehicleOrPersonName', e.target.value)}
                  disabled={isReadOnly || createDailyNeed.isPending}
                  className={cn(
                    'border-2 font-medium',
                    (apiErrors.vehicleOrPersonName || apiErrors.vehicle_or_person_name) &&
                      'border-destructive',
                  )}
                />
                {apiErrors.vehicleOrPersonName && (
                  <p className="text-sm text-destructive">{apiErrors.vehicleOrPersonName}</p>
                )}
                {apiErrors.vehicle_or_person_name && (
                  <p className="text-sm text-destructive">{apiErrors.vehicle_or_person_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactNumber">
                  Contact Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="contactNumber"
                  placeholder="9876543210"
                  value={formData.contactNumber}
                  onChange={(e) => {
                    // Only allow digits
                    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                    handleInputChange('contactNumber', value);
                  }}
                  maxLength={10}
                  disabled={isReadOnly || createDailyNeed.isPending}
                  className={cn(
                    'border-2 font-medium',
                    (apiErrors.contactNumber || apiErrors.contact_number) && 'border-destructive',
                  )}
                />
                {apiErrors.contactNumber && (
                  <p className="text-sm text-destructive">{apiErrors.contactNumber}</p>
                )}
                {apiErrors.contact_number && (
                  <p className="text-sm text-destructive">{apiErrors.contact_number}</p>
                )}
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
