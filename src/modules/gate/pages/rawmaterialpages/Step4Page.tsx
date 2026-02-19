import { useQueryClient } from '@tanstack/react-query';
import { Scale } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ENTRY_STATUS } from '@/config/constants';
import type { ApiError } from '@/core/api';
import { Card, CardContent, CardHeader, CardTitle, Input, Label } from '@/shared/components/ui';
import { useScrollToError } from '@/shared/hooks';
import { cn } from '@/shared/utils';
import {
  getErrorMessage,
  getServerErrorMessage,
  isNotFoundError as checkNotFoundError,
  isServerError as checkServerError,
} from '@/shared/utils';

import { useVehicleEntry } from '../../api/vehicle/vehicleEntry.queries';
import type { CreateWeighmentRequest } from '../../api/weighment/weighment.api';
import { useCreateWeighment, useWeighment } from '../../api/weighment/weighment.queries';
import { FillDataAlert, StepFooter, StepHeader, StepLoadingSpinner } from '../../components';
import { WIZARD_CONFIG } from '../../constants';
import { useEntryId } from '../../hooks';

export default function Step4Page() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { entryId, entryIdNumber, isEditMode } = useEntryId();
  const currentStep = WIZARD_CONFIG.STEPS.WEIGHMENT;
  const createWeighment = useCreateWeighment(entryIdNumber || 0);
  const {
    data: weighmentData,
    isLoading: isLoadingWeighment,
    error: weighmentError,
  } = useWeighment(isEditMode && entryIdNumber ? entryIdNumber : null);
  const { data: vehicleEntryData } = useVehicleEntry(
    isEditMode && entryIdNumber ? entryIdNumber : null,
  );

  // Form state
  const [formData, setFormData] = useState({
    grossWeight: '0',
    tareWeight: '0',
    weighbridgeTicketNo: '',
    firstWeighmentTime: '',
    secondWeighmentTime: '',
  });

  // Calculate net weight as derived value (not stored in state)
  const netWeight = useMemo(() => {
    const gross = parseFloat(formData.grossWeight) || 0;
    const tare = parseFloat(formData.tareWeight) || 0;
    return Math.max(0, gross - tare).toFixed(3);
  }, [formData.grossWeight, formData.tareWeight]);

  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});

  // Scroll to first error when errors occur
  useScrollToError(apiErrors);

  // State to track if we should behave like create mode (when Fill Data is clicked)
  const [fillDataMode, setFillDataMode] = useState(false);
  // State to track if Update button has been clicked (enables editing)
  const [updateMode, setUpdateMode] = useState(false);
  // State to keep button disabled after API success until navigation completes
  const [isNavigating, setIsNavigating] = useState(false);
  const effectiveEditMode = isEditMode && !fillDataMode;

  // Load weighment data when in edit mode (only if not in fillDataMode)
  useEffect(() => {
    if (effectiveEditMode && weighmentData) {
      // Use first_weighment_time and second_weighment_time from API if available
      // Otherwise, try to parse from remarks (for backward compatibility)
      let firstWeighmentTime = weighmentData.first_weighment_time
        ? weighmentData.first_weighment_time.slice(11, 16)
        : '';
      let secondWeighmentTime = weighmentData.second_weighment_time
        ? weighmentData.second_weighment_time.slice(11, 16)
        : '';

      // If times are not in dedicated fields, try parsing from remarks
      if (!firstWeighmentTime && !secondWeighmentTime && weighmentData.remarks) {
        const firstMatch = weighmentData.remarks.match(/First weighment:\s*([\d:]+)/i);
        const secondMatch = weighmentData.remarks.match(/Second weighment:\s*([\d:]+)/i);
        if (firstMatch) {
          firstWeighmentTime = firstMatch[1];
        }
        if (secondMatch) {
          secondWeighmentTime = secondMatch[1];
        }
      }

      // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing form state with fetched data is a valid pattern
      setFormData({
        grossWeight: weighmentData.gross_weight || '0',
        tareWeight: weighmentData.tare_weight || '0',
        weighbridgeTicketNo: weighmentData.weighbridge_slip_no || '',
        firstWeighmentTime,
        secondWeighmentTime,
      });
    }
  }, [effectiveEditMode, weighmentData]);

  const handleInputChange = (field: string, value: string) => {
    // In edit mode (not fillDataMode and not updateMode), fields are read-only
    if (effectiveEditMode && !updateMode) return;
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (apiErrors[field]) {
      setApiErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleFillData = () => {
    setFillDataMode(true);
    // Clear form data to start fresh
    setFormData({
      grossWeight: '0',
      tareWeight: '0',
      weighbridgeTicketNo: '',
      firstWeighmentTime: '',
      secondWeighmentTime: '',
    });
    setApiErrors({});
  };

  const handlePrevious = () => {
    if (isEditMode && entryId) {
      navigate(`/gate/raw-materials/edit/${entryId}/step4`);
    } else {
      navigate(`/gate/raw-materials/new/step4?entryId=${entryId}`);
    }
  };

  const handleNext = async () => {
    if (!entryId) {
      setApiErrors({ general: 'Entry ID is missing. Please go back to step 1.' });
      return;
    }

    // In edit mode (and not fillDataMode and not updateMode), just navigate without API call
    if (effectiveEditMode && !updateMode) {
      navigate(`/gate/raw-materials/edit/${entryId}/attachments`);
      return;
    }

    setApiErrors({});

    try {
      const requestData: CreateWeighmentRequest = {
        gross_weight: parseFloat(formData.grossWeight) || 0,
        tare_weight: parseFloat(formData.tareWeight) || 0,
        weighbridge_slip_no: formData.weighbridgeTicketNo || '',
        first_weighment_time: formData.firstWeighmentTime
          ? `${new Date().toISOString().slice(0, 10)}T${formData.firstWeighmentTime}:00`
          : undefined,
        second_weighment_time: formData.secondWeighmentTime
          ? `${new Date().toISOString().slice(0, 10)}T${formData.secondWeighmentTime}:00`
          : undefined,
      };

      await createWeighment.mutateAsync(requestData);

      // Navigate to attachments
      setIsNavigating(true);
      if (isEditMode) {
        navigate(`/gate/raw-materials/edit/${entryId}/attachments`);
      } else {
        navigate(`/gate/raw-materials/new/attachments?entryId=${entryId}`);
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
        setApiErrors({ general: apiError.message || 'Failed to save weighment details' });
      }
    }
  };

  // Check if error is "not found" error
  const isNotFoundError = checkNotFoundError(weighmentError);
  // Check if error is a server error (5xx)
  const hasServerError = checkServerError(weighmentError);

  // Check if weighment data doesn't exist (null means empty array was returned, or error means not found)
  const hasNoWeighmentData =
    effectiveEditMode && !isLoadingWeighment && (!weighmentData || isNotFoundError);

  // Fields are read-only when in edit mode and data exists (unless fillDataMode or updateMode is active)
  // Also read-only if there's a not found error and fillDataMode is not active
  const isReadOnly =
    (effectiveEditMode && !!weighmentData && !fillDataMode && !updateMode) ||
    (isNotFoundError && !fillDataMode);
  const canUpdate =
    effectiveEditMode && vehicleEntryData?.status !== ENTRY_STATUS.COMPLETED && !!weighmentData;

  const handleUpdate = () => {
    setUpdateMode(true);
  };

  // Show loading state while fetching weighment data
  if (isEditMode && isLoadingWeighment) {
    return <StepLoadingSpinner />;
  }

  return (
    <div className="space-y-6 pb-6">
      <StepHeader
        currentStep={currentStep}
        error={
          hasServerError
            ? getServerErrorMessage()
            : apiErrors.general ||
              (weighmentError && !isNotFoundError
                ? getErrorMessage(weighmentError, 'Failed to load weighment data')
                : null)
        }
      />

      {/* Show Fill Data button when weighment doesn't exist yet (empty array or not found error) */}
      {hasNoWeighmentData && !fillDataMode && (
        <FillDataAlert
          message={
            isNotFoundError
              ? getErrorMessage(weighmentError, 'Weighment not found')
              : 'No weighment data found for this entry.'
          }
          onFillData={handleFillData}
        />
      )}

      <div className="space-y-6">
        {/* Weighment Details Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Weighment Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {/* First Row */}
              <div className="space-y-2">
                <Label htmlFor="grossWeight">
                  Gross Weight
                </Label>
                <Input
                  id="grossWeight"
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0"
                  value={formData.grossWeight}
                  onChange={(e) => handleInputChange('grossWeight', e.target.value)}
                  disabled={isReadOnly || createWeighment.isPending}
                  className={cn(
                    apiErrors.grossWeight && 'border-destructive',
                    isReadOnly && 'cursor-not-allowed opacity-50',
                  )}
                />
                {apiErrors.grossWeight && (
                  <p className="text-sm text-destructive">{apiErrors.grossWeight}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tareWeight">
                  Tare Weight
                </Label>
                <Input
                  id="tareWeight"
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0"
                  value={formData.tareWeight}
                  onChange={(e) => handleInputChange('tareWeight', e.target.value)}
                  disabled={isReadOnly || createWeighment.isPending}
                  className={cn(
                    apiErrors.tareWeight && 'border-destructive',
                    isReadOnly && 'cursor-not-allowed opacity-50',
                  )}
                />
                {apiErrors.tareWeight && (
                  <p className="text-sm text-destructive">{apiErrors.tareWeight}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="netWeight">Net Weight</Label>
                <Input
                  id="netWeight"
                  type="text"
                  placeholder="Auto-calculated"
                  value={netWeight === '0.000' ? '' : netWeight}
                  readOnly
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">Auto-calculated</p>
              </div>

              {/* Second Row */}
              <div className="space-y-2">
                <Label htmlFor="weighbridgeTicketNo">
                  Weighbridge Ticket No.
                </Label>
                <Input
                  id="weighbridgeTicketNo"
                  placeholder="WB-2026-001"
                  value={formData.weighbridgeTicketNo}
                  onChange={(e) => handleInputChange('weighbridgeTicketNo', e.target.value)}
                  disabled={isReadOnly || createWeighment.isPending}
                  className={cn(
                    apiErrors.weighbridgeTicketNo && 'border-destructive',
                    isReadOnly && 'cursor-not-allowed opacity-50',
                  )}
                />
                {apiErrors.weighbridgeTicketNo && (
                  <p className="text-sm text-destructive">{apiErrors.weighbridgeTicketNo}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="firstWeighmentTime">
                  First Weighment Time
                </Label>
                <Input
                  id="firstWeighmentTime"
                  type="time"
                  placeholder="--:--"
                  value={formData.firstWeighmentTime}
                  onChange={(e) => handleInputChange('firstWeighmentTime', e.target.value)}
                  disabled={isReadOnly || createWeighment.isPending}
                  className={cn(
                    apiErrors.firstWeighmentTime && 'border-destructive',
                    isReadOnly && 'cursor-not-allowed opacity-50',
                  )}
                />
                {apiErrors.firstWeighmentTime && (
                  <p className="text-sm text-destructive">{apiErrors.firstWeighmentTime}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondWeighmentTime">
                  Second Weighment Time
                </Label>
                <Input
                  id="secondWeighmentTime"
                  type="time"
                  placeholder="--:--"
                  value={formData.secondWeighmentTime}
                  onChange={(e) => handleInputChange('secondWeighmentTime', e.target.value)}
                  disabled={isReadOnly || createWeighment.isPending}
                  className={cn(
                    apiErrors.secondWeighmentTime && 'border-destructive',
                    isReadOnly && 'cursor-not-allowed opacity-50',
                  )}
                />
                {apiErrors.secondWeighmentTime && (
                  <p className="text-sm text-destructive">{apiErrors.secondWeighmentTime}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer Actions */}
      <StepFooter
        onPrevious={handlePrevious}
        onCancel={() => {
          queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
          navigate('/gate/raw-materials');
        }}
        onNext={handleNext}
        showUpdate={effectiveEditMode && canUpdate && !updateMode}
        onUpdate={handleUpdate}
        isSaving={createWeighment.isPending || isNavigating}
        isEditMode={effectiveEditMode}
        isUpdateMode={updateMode}
      />
    </div>
  );
}
