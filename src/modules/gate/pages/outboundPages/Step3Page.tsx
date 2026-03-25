import { useQueryClient } from '@tanstack/react-query';
import { MapPin, Package, Truck as TruckIcon, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { ENTRY_STATUS } from '@/config/constants';
import type { ApiError } from '@/core/api';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Textarea,
} from '@/shared/components/ui';
import { useScrollToError } from '@/shared/hooks';
import {
  getErrorMessage,
  getServerErrorMessage,
  isNotFoundError as checkNotFoundError,
  isServerError as checkServerError,
} from '@/shared/utils';

import {
  useCreateOutboundEntry,
  useOutboundEntry,
  useOutboundPurposes,
  useUpdateOutboundEntry,
} from '../../api/outbound';
import { useVehicleEntry } from '../../api/vehicle/vehicleEntry.queries';
import { FillDataAlert, StepFooter, StepHeader } from '../../components';
import { useEntryId } from '../../hooks';

interface FormData {
  purpose: string;
  salesOrderRef: string;
  customerName: string;
  customerCode: string;
  transporterName: string;
  transporterContact: string;
  lrNumber: string;
  vehicleEmptyConfirmed: boolean;
  trailerType: string;
  trailerLengthFt: string;
  assignedZone: string;
  assignedBay: string;
  expectedLoadingTime: string;
  remarks: string;
}

const INITIAL_FORM: FormData = {
  purpose: '',
  salesOrderRef: '',
  customerName: '',
  customerCode: '',
  transporterName: '',
  transporterContact: '',
  lrNumber: '',
  vehicleEmptyConfirmed: false,
  trailerType: '',
  trailerLengthFt: '',
  assignedZone: 'YARD',
  assignedBay: '',
  expectedLoadingTime: '',
  remarks: '',
};

const currentStep = 3;
const totalSteps = 4;

export default function Step3Page() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { entryId, entryIdNumber, isEditMode } = useEntryId();

  // API hooks
  const { data: purposes = [] } = useOutboundPurposes();
  const {
    data: outboundData,
    isLoading: isLoadingOutbound,
    error: outboundError,
  } = useOutboundEntry(isEditMode && entryIdNumber ? entryIdNumber : null);
  const { data: vehicleEntryData } = useVehicleEntry(
    isEditMode && entryIdNumber ? entryIdNumber : null,
  );

  const createOutbound = useCreateOutboundEntry(entryIdNumber || 0);
  const updateOutbound = useUpdateOutboundEntry(entryIdNumber || 0);

  // State
  const [fillDataMode, setFillDataMode] = useState(false);
  const [updateMode, setUpdateMode] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const effectiveEditMode = isEditMode && !fillDataMode;

  const isNotFoundError = checkNotFoundError(outboundError);
  const hasServerError = checkServerError(outboundError);

  const isReadOnly =
    (effectiveEditMode && !updateMode && !isNotFoundError) ||
    (isNotFoundError && !fillDataMode);
  const canUpdate = effectiveEditMode && vehicleEntryData?.status !== ENTRY_STATUS.COMPLETED;

  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});

  useScrollToError(apiErrors);

  // Hydrate form from API data
  useEffect(() => {
    if (outboundData && isEditMode) {
      const purposeId =
        typeof outboundData.purpose === 'object' && outboundData.purpose
          ? String(outboundData.purpose.id)
          : outboundData.purpose
            ? String(outboundData.purpose)
            : '';

      setFormData({
        purpose: purposeId,
        salesOrderRef: outboundData.sales_order_ref || '',
        customerName: outboundData.customer_name || '',
        customerCode: outboundData.customer_code || '',
        transporterName: outboundData.transporter_name || '',
        transporterContact: outboundData.transporter_contact || '',
        lrNumber: outboundData.lr_number || '',
        vehicleEmptyConfirmed: outboundData.vehicle_empty_confirmed || false,
        trailerType: outboundData.trailer_type || '',
        trailerLengthFt: outboundData.trailer_length_ft || '',
        assignedZone: outboundData.assigned_zone || 'YARD',
        assignedBay: outboundData.assigned_bay || '',
        expectedLoadingTime: outboundData.expected_loading_time
          ? outboundData.expected_loading_time.slice(0, 16)
          : '',
        remarks: outboundData.remarks || '',
      });
    }
  }, [outboundData, isEditMode]);

  const handleInputChange = (key: keyof FormData, value: FormData[keyof FormData]) => {
    if (isReadOnly) return;
    setFormData((prev) => ({ ...prev, [key]: value }));
    setApiErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      delete next.general;
      return next;
    });
  };

  const handleFillData = () => setFillDataMode(true);
  const handleUpdate = () => setUpdateMode(true);

  const handlePrevious = () => {
    if (isEditMode && entryId) {
      navigate(`/gate/outbound/edit/${entryId}/step2`);
    } else {
      navigate(`/gate/outbound/new/step2?entryId=${entryId}`);
    }
  };

  const handleCancel = () => navigate('/gate/outbound');

  const handleNext = async () => {
    if (isReadOnly) {
      if (isEditMode && entryId) {
        navigate(`/gate/outbound/edit/${entryId}/attachments`);
      } else {
        navigate(`/gate/outbound/new/attachments?entryId=${entryId}`);
      }
      return;
    }

    setApiErrors({});

    const requestData = {
      purpose: formData.purpose ? parseInt(formData.purpose) : null,
      sales_order_ref: formData.salesOrderRef.trim(),
      customer_name: formData.customerName.trim(),
      customer_code: formData.customerCode.trim(),
      transporter_name: formData.transporterName.trim(),
      transporter_contact: formData.transporterContact.trim(),
      lr_number: formData.lrNumber.trim(),
      vehicle_empty_confirmed: formData.vehicleEmptyConfirmed,
      trailer_type: formData.trailerType.trim(),
      trailer_length_ft: formData.trailerLengthFt
        ? parseFloat(formData.trailerLengthFt)
        : null,
      assigned_zone: formData.assignedZone,
      assigned_bay: formData.assignedBay.trim(),
      expected_loading_time: formData.expectedLoadingTime
        ? new Date(formData.expectedLoadingTime).toISOString()
        : null,
      remarks: formData.remarks.trim(),
    };

    try {
      setIsNavigating(true);
      if (effectiveEditMode && updateMode) {
        await updateOutbound.mutateAsync(requestData as never);
        toast.success('Outbound entry updated');
      } else {
        await createOutbound.mutateAsync(requestData as never);
        toast.success('Outbound entry created');
      }

      queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });

      if (isEditMode && entryId) {
        navigate(`/gate/outbound/edit/${entryId}/attachments`);
      } else {
        navigate(`/gate/outbound/new/attachments?entryId=${entryId}`);
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
        setApiErrors({ general: apiError.message || 'Failed to save outbound entry' });
      }
    } finally {
      setIsNavigating(false);
    }
  };

  const isLoading = effectiveEditMode && isLoadingOutbound;

  const selectClassName =
    'flex h-10 w-full rounded-md border-2 border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className="space-y-6 pb-6">
      <StepHeader
        currentStep={currentStep}
        totalSteps={totalSteps}
        title="Outbound Entry"
        error={hasServerError ? getServerErrorMessage() : apiErrors.general}
      />

      {/* Fill Data Alert */}
      {effectiveEditMode && isNotFoundError && !fillDataMode && (
        <FillDataAlert
          message={getErrorMessage(outboundError, 'Outbound entry not found')}
          onFillData={handleFillData}
        />
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Purpose & Customer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Purpose & Customer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Purpose</Label>
                  <select
                    value={formData.purpose}
                    onChange={(e) => handleInputChange('purpose', e.target.value)}
                    disabled={isReadOnly}
                    className={selectClassName}
                  >
                    <option value="">Select purpose...</option>
                    {purposes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {apiErrors.purpose && (
                    <p className="text-xs text-destructive">{apiErrors.purpose}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Sales Order Ref</Label>
                  <Input
                    value={formData.salesOrderRef}
                    onChange={(e) => handleInputChange('salesOrderRef', e.target.value)}
                    placeholder="SAP Sales Order number"
                    disabled={isReadOnly}
                  />
                  {apiErrors.sales_order_ref && (
                    <p className="text-xs text-destructive">{apiErrors.sales_order_ref}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Customer Name</Label>
                  <Input
                    value={formData.customerName}
                    onChange={(e) => handleInputChange('customerName', e.target.value)}
                    disabled={isReadOnly}
                  />
                  {apiErrors.customer_name && (
                    <p className="text-xs text-destructive">{apiErrors.customer_name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Customer Code</Label>
                  <Input
                    value={formData.customerCode}
                    onChange={(e) => handleInputChange('customerCode', e.target.value)}
                    disabled={isReadOnly}
                  />
                  {apiErrors.customer_code && (
                    <p className="text-xs text-destructive">{apiErrors.customer_code}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transport Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TruckIcon className="h-5 w-5" />
                Transport Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Transporter Name</Label>
                  <Input
                    value={formData.transporterName}
                    onChange={(e) => handleInputChange('transporterName', e.target.value)}
                    disabled={isReadOnly}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Transporter Contact</Label>
                  <Input
                    value={formData.transporterContact}
                    onChange={(e) => handleInputChange('transporterContact', e.target.value)}
                    placeholder="Phone number"
                    disabled={isReadOnly}
                  />
                </div>
                <div className="space-y-2">
                  <Label>LR Number</Label>
                  <Input
                    value={formData.lrNumber}
                    onChange={(e) => handleInputChange('lrNumber', e.target.value)}
                    placeholder="Lorry Receipt number"
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trailer & Vehicle Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Trailer Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Trailer Type</Label>
                  <Input
                    value={formData.trailerType}
                    onChange={(e) => handleInputChange('trailerType', e.target.value)}
                    placeholder="e.g. 20ft Container, Open Body"
                    disabled={isReadOnly}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Trailer Length (ft)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.trailerLengthFt}
                    onChange={(e) => handleInputChange('trailerLengthFt', e.target.value)}
                    disabled={isReadOnly}
                  />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Checkbox
                    checked={formData.vehicleEmptyConfirmed}
                    onCheckedChange={(checked) =>
                      handleInputChange('vehicleEmptyConfirmed', checked === true)
                    }
                    disabled={isReadOnly}
                  />
                  <div>
                    <Label className="text-sm font-medium">Vehicle Empty Confirmed</Label>
                    <p className="text-xs text-muted-foreground">Required for completion</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Zone & Bay Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Zone & Bay Assignment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Assigned Zone</Label>
                  <select
                    value={formData.assignedZone}
                    onChange={(e) => handleInputChange('assignedZone', e.target.value)}
                    disabled={isReadOnly}
                    className={selectClassName}
                  >
                    <option value="YARD">Yard / Holding Area</option>
                    <option value="ZONE_C">Zone C (Outbound Bays 19-30)</option>
                  </select>
                </div>
                {formData.assignedZone === 'ZONE_C' && (
                  <div className="space-y-2">
                    <Label>Assigned Bay</Label>
                    <Input
                      value={formData.assignedBay}
                      onChange={(e) => handleInputChange('assignedBay', e.target.value)}
                      placeholder="Bay number (19-30)"
                      disabled={isReadOnly}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Expected Loading Time</Label>
                  <Input
                    type="datetime-local"
                    value={formData.expectedLoadingTime}
                    onChange={(e) => handleInputChange('expectedLoadingTime', e.target.value)}
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Remarks */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label>Remarks / Notes</Label>
                <Textarea
                  value={formData.remarks}
                  onChange={(e) => handleInputChange('remarks', e.target.value)}
                  placeholder="Additional notes..."
                  rows={3}
                  disabled={isReadOnly}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <StepFooter
        onPrevious={handlePrevious}
        onCancel={handleCancel}
        onNext={handleNext}
        showUpdate={effectiveEditMode && canUpdate && !updateMode}
        onUpdate={handleUpdate}
        isSaving={createOutbound.isPending || updateOutbound.isPending || isNavigating}
        isEditMode={effectiveEditMode}
        isUpdateMode={updateMode}
        nextLabel={effectiveEditMode && !updateMode ? 'Next' : 'Save & Next'}
      />
    </div>
  );
}
