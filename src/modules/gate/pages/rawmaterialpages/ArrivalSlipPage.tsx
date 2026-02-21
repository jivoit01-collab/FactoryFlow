import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Check, FileText, Paperclip, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { VALIDATION_PATTERNS } from '@/config/constants';
import { ARRIVAL_SLIP_STATUS } from '@/config/constants';
import type { ApiError } from '@/core/api';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
} from '@/shared/components/ui';
import { useScrollToError } from '@/shared/hooks';
import { cn } from '@/shared/utils';
import {
  getErrorMessage,
  getServerErrorMessage,
  isNotFoundError as checkNotFoundError,
  isServerError as checkServerError,
} from '@/shared/utils';

import {
  type ArrivalSlip,
  arrivalSlipApi,
  type CreateArrivalSlipRequest,
} from '../../api/arrivalSlip/arrivalSlip.api';
import {
  useCreateArrivalSlip,
  useSubmitArrivalSlip,
} from '../../api/arrivalSlip/arrivalSlip.queries';
import { usePOReceipts } from '../../api/po/poReceipt.queries';
import { useVehicleEntry } from '../../api/vehicle/vehicleEntry.queries';
import { FillDataAlert, StepFooter, StepHeader, StepLoadingSpinner } from '../../components';
import { WIZARD_CONFIG } from '../../constants';
import { useEntryId } from '../../hooks';

interface ArrivalSlipFormData {
  particulars: string;
  arrival_datetime: string;
  party_name: string;
  billing_qty: string;
  billing_uom: string;
  truck_no_as_per_bill: string;
  commercial_invoice_no: string;
  eway_bill_no: string;
  bilty_no: string;
  has_certificate_of_analysis: boolean;
  has_certificate_of_quantity: boolean;
  remarks: string;
}

interface POItemReceiptWithSlip {
  id: number;
  po_item_code: string;
  item_name: string;
  ordered_qty: number;
  received_qty: number;
  uom: string;
  supplier_name: string;
  po_number: string;
  formData: ArrivalSlipFormData;
  existingSlip: ArrivalSlip | null;
  isSubmitted: boolean;
  slipId: number | null;
  certificateOfAnalysisFile: File | null;
  certificateOfQuantityFile: File | null;
}

export default function ArrivalSlipPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { entryId, entryIdNumber, isEditMode } = useEntryId();
  const currentStep = WIZARD_CONFIG.STEPS.ARRIVAL_SLIP;

  // Fetch PO receipts
  const {
    data: poReceipts = [],
    isLoading: isLoadingPOReceipts,
    error: poReceiptsError,
  } = usePOReceipts(entryIdNumber || null);

  // Fetch vehicle entry for auto-filling truck number
  const { data: vehicleEntryData, isLoading: isLoadingVehicleEntry } = useVehicleEntry(
    entryIdNumber || null,
  );

  const createArrivalSlip = useCreateArrivalSlip();
  const submitArrivalSlip = useSubmitArrivalSlip();

  // State for all PO item receipt forms
  const [itemForms, setItemForms] = useState<POItemReceiptWithSlip[]>([]);
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});

  // Scroll to first error when errors occur
  useScrollToError(apiErrors);

  const [isNavigating, setIsNavigating] = useState(false);
  const [fillDataMode, setFillDataMode] = useState(false);
  const [arrivalSlipsNotFound, setArrivalSlipsNotFound] = useState(false);
  // Tracks whether the second async fetch (existing slips) has completed
  const [slipsFetched, setSlipsFetched] = useState(!isEditMode);

  const effectiveEditMode = isEditMode && !fillDataMode;

  // Initialize forms when PO receipts are loaded
  useEffect(() => {
    if (poReceipts.length > 0 && vehicleEntryData) {
      const currentDateTime = new Date().toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm

      const forms: POItemReceiptWithSlip[] = [];

      for (const receipt of poReceipts) {
        for (const item of receipt.items) {
          if (item.id) {
            forms.push({
              id: item.id,
              po_item_code: item.po_item_code,
              item_name: item.item_name,
              ordered_qty: item.ordered_qty,
              received_qty: item.received_qty,
              uom: item.uom,
              supplier_name: receipt.supplier_name,
              po_number: receipt.po_number,
              existingSlip: null,
              isSubmitted: false,
              slipId: null,
              certificateOfAnalysisFile: null,
              certificateOfQuantityFile: null,
              formData: {
                particulars: `${item.item_name}`,
                arrival_datetime: currentDateTime,
                party_name: receipt.supplier_name,
                billing_qty: item.received_qty.toString(),
                billing_uom: item.uom,
                truck_no_as_per_bill: vehicleEntryData.vehicle?.vehicle_number || '',
                commercial_invoice_no: '',
                eway_bill_no: '',
                bilty_no: '',
                has_certificate_of_analysis: false,
                has_certificate_of_quantity: false,
                remarks: '',
              },
            });
          }
        }
      }

      setItemForms(forms);
    }
  }, [poReceipts, vehicleEntryData]);

  // Fetch existing arrival slips for each PO item receipt
  useEffect(() => {
    const fetchExistingSlips = async () => {
      if (itemForms.length === 0 || !effectiveEditMode) return;

      const updatedForms = [...itemForms];
      let hasChanges = false;

      for (let i = 0; i < updatedForms.length; i++) {
        const form = updatedForms[i];
        if (!form.existingSlip) {
          try {
            const slip = await arrivalSlipApi.get(form.id);
            if (slip) {
              updatedForms[i] = {
                ...form,
                existingSlip: slip,
                isSubmitted: slip.status === ARRIVAL_SLIP_STATUS.SUBMITTED,
                slipId: slip.id,
                formData: {
                  particulars: slip.particulars,
                  arrival_datetime: slip.arrival_datetime?.slice(0, 16) || '',
                  party_name: slip.party_name,
                  billing_qty: slip.billing_qty,
                  billing_uom: slip.billing_uom,
                  truck_no_as_per_bill: slip.truck_no_as_per_bill,
                  commercial_invoice_no: slip.commercial_invoice_no || '',
                  eway_bill_no: slip.eway_bill_no || '',
                  bilty_no: slip.bilty_no || '',
                  has_certificate_of_analysis: slip.has_certificate_of_analysis,
                  has_certificate_of_quantity: slip.has_certificate_of_quantity,
                  remarks: slip.remarks || '',
                },
              };
              hasChanges = true;
            }
          } catch {
            // Slip doesn't exist yet, continue with default form
          }
        }
      }

      if (hasChanges) {
        setItemForms(updatedForms);
      } else if (updatedForms.length > 0) {
        setArrivalSlipsNotFound(true);
      }

      setSlipsFetched(true);
    };

    fetchExistingSlips();
  }, [itemForms.length, effectiveEditMode]);

  const handleFormChange = (
    itemId: number,
    field: keyof ArrivalSlipFormData,
    value: string | boolean,
  ) => {
    setItemForms((prev) =>
      prev.map((form) => {
        if (form.id !== itemId) return form;
        const updated: POItemReceiptWithSlip = {
          ...form,
          formData: { ...form.formData, [field]: value },
        };
        // Clear file when certificate checkbox is unchecked
        if (field === 'has_certificate_of_analysis' && value === false) {
          updated.certificateOfAnalysisFile = null;
          const ref = coaFileInputRefs.current[itemId];
          if (ref) ref.value = '';
        }
        if (field === 'has_certificate_of_quantity' && value === false) {
          updated.certificateOfQuantityFile = null;
          const ref = coqFileInputRefs.current[itemId];
          if (ref) ref.value = '';
        }
        return updated;
      }),
    );
    // Clear error for this field
    if (apiErrors[`${itemId}_${field}`]) {
      setApiErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`${itemId}_${field}`];
        return newErrors;
      });
    }
  };

  // Refs for certificate file inputs (keyed by form item id)
  const coaFileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const coqFileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const handleFileChange = (
    itemId: number,
    type: 'certificateOfAnalysisFile' | 'certificateOfQuantityFile',
    file: File | null,
  ) => {
    setItemForms((prev) =>
      prev.map((form) => (form.id === itemId ? { ...form, [type]: file } : form)),
    );
    // Clear error for this field
    const errorKey = `${itemId}_${type}`;
    if (apiErrors[errorKey]) {
      setApiErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  const handleFillData = () => {
    setFillDataMode(true);
    setArrivalSlipsNotFound(false);
    setApiErrors({});
  };

  const handlePrevious = () => {
    if (isEditMode && entryId) {
      navigate(`/gate/raw-materials/edit/${entryId}/step3`);
    } else {
      navigate(`/gate/raw-materials/new/step3?entryId=${entryId}`);
    }
  };

  const validateForm = (form: POItemReceiptWithSlip): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!form.formData.particulars.trim()) {
      errors[`${form.id}_particulars`] = 'Particulars is required';
    }
    if (!form.formData.arrival_datetime) {
      errors[`${form.id}_arrival_datetime`] = 'Arrival date/time is required';
    }
    if (!form.formData.party_name.trim()) {
      errors[`${form.id}_party_name`] = 'Party name is required';
    }
    if (!form.formData.billing_qty || parseFloat(form.formData.billing_qty) <= 0) {
      errors[`${form.id}_billing_qty`] = 'Billing quantity is required';
    }
    if (!form.formData.billing_uom.trim()) {
      errors[`${form.id}_billing_uom`] = 'Billing UOM is required';
    }
    if (!form.formData.truck_no_as_per_bill.trim()) {
      errors[`${form.id}_truck_no_as_per_bill`] = 'Truck number is required';
    } else if (
      !VALIDATION_PATTERNS.vehicleNumber.test(
        form.formData.truck_no_as_per_bill.trim().toUpperCase(),
      )
    ) {
      errors[`${form.id}_truck_no_as_per_bill`] =
        'Please enter a valid vehicle number (e.g., MH12AB1234)';
    }

    // Validate certificate files are provided when checkboxes are checked
    const hasExistingCoa = form.existingSlip?.attachments?.some(
      (a) => a.attachment_type === 'certificate_of_analysis',
    );
    if (form.formData.has_certificate_of_analysis && !form.certificateOfAnalysisFile && !hasExistingCoa) {
      errors[`${form.id}_certificateOfAnalysisFile`] =
        'Please upload Certificate of Analysis file';
    }

    const hasExistingCoq = form.existingSlip?.attachments?.some(
      (a) => a.attachment_type === 'certificate_of_quantity',
    );
    if (form.formData.has_certificate_of_quantity && !form.certificateOfQuantityFile && !hasExistingCoq) {
      errors[`${form.id}_certificateOfQuantityFile`] =
        'Please upload Certificate of Quantity file';
    }

    return errors;
  };

  const handleNext = async () => {
    if (!entryId) {
      setApiErrors({ general: 'Entry ID is missing. Please go back to step 1.' });
      return;
    }

    // In edit mode with all items already submitted, just navigate
    if (effectiveEditMode && itemForms.every((form) => form.isSubmitted)) {
      navigate(`/gate/raw-materials/edit/${entryId}/step5`);
      return;
    }

    // Validate all forms
    let allErrors: Record<string, string> = {};
    for (const form of itemForms) {
      if (!form.isSubmitted) {
        const errors = validateForm(form);
        allErrors = { ...allErrors, ...errors };
      }
    }

    if (Object.keys(allErrors).length > 0) {
      setApiErrors(allErrors);
      return;
    }

    setApiErrors({});

    try {
      // Create/update and submit all arrival slips
      for (const form of itemForms) {
        if (!form.isSubmitted) {
          const requestData: CreateArrivalSlipRequest = {
            particulars: form.formData.particulars,
            arrival_datetime: new Date(form.formData.arrival_datetime).toISOString(),
            weighing_required: true, // Always true
            party_name: form.formData.party_name,
            billing_qty: parseFloat(form.formData.billing_qty),
            billing_uom: form.formData.billing_uom,
            truck_no_as_per_bill: form.formData.truck_no_as_per_bill,
            commercial_invoice_no: form.formData.commercial_invoice_no,
            eway_bill_no: form.formData.eway_bill_no,
            bilty_no: form.formData.bilty_no,
            has_certificate_of_analysis: form.formData.has_certificate_of_analysis,
            has_certificate_of_quantity: form.formData.has_certificate_of_quantity,
            remarks: form.formData.remarks,
          };

          // Create or update the arrival slip
          const slip = await createArrivalSlip.mutateAsync({
            poItemReceiptId: form.id,
            data: requestData,
          });

          // Submit the arrival slip to QA (with certificate files if selected)
          await submitArrivalSlip.mutateAsync({
            slipId: slip.id,
            certificateOfAnalysis: form.certificateOfAnalysisFile || undefined,
            certificateOfQuantity: form.certificateOfQuantityFile || undefined,
          });
        }
      }

      // Navigate to next step (Weighment)
      setIsNavigating(true);
      if (isEditMode) {
        navigate(`/gate/raw-materials/edit/${entryId}/step5`);
      } else {
        navigate(`/gate/raw-materials/new/step5?entryId=${entryId}`);
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
        setApiErrors({ general: apiError.message || 'Failed to save arrival slips' });
      }
    }
  };

  // Check for errors
  const isNotFoundError = checkNotFoundError(poReceiptsError);
  const hasServerError = checkServerError(poReceiptsError);

  // Check if PO receipts don't exist
  const hasNoPOReceipts =
    effectiveEditMode && !isLoadingPOReceipts && (poReceipts.length === 0 || isNotFoundError);

  // Show loading state — covers 3 phases:
  // 1. PO receipts loading, 2. vehicle entry loading, 3. existing slips being fetched
  if (isLoadingPOReceipts || isLoadingVehicleEntry || (effectiveEditMode && itemForms.length > 0 && !slipsFetched)) {
    return <StepLoadingSpinner />;
  }

  const isSaving = createArrivalSlip.isPending || submitArrivalSlip.isPending;

  // Forms are read-only when arrival slips are not found and fill data mode is not active
  const isReadOnly = arrivalSlipsNotFound && !fillDataMode;

  return (
    <div className="space-y-6 pb-6">
      <StepHeader
        currentStep={currentStep}
        error={
          hasServerError
            ? getServerErrorMessage()
            : apiErrors.general ||
              (poReceiptsError && !isNotFoundError
                ? getErrorMessage(poReceiptsError, 'Failed to load PO receipts')
                : null)
        }
      />

      {/* Show error if no PO receipts */}
      {hasNoPOReceipts && !fillDataMode && (
        <FillDataAlert
          message={
            isNotFoundError
              ? getErrorMessage(poReceiptsError, 'PO receipts not found')
              : 'No PO receipts found. Please go back to Step 3 to add PO receipts.'
          }
          onFillData={handleFillData}
        />
      )}

      {/* Show error if arrival slips not found */}
      {arrivalSlipsNotFound && !fillDataMode && (
        <FillDataAlert
          message="Arrival slip not found"
          onFillData={handleFillData}
        />
      )}

      {/* Show info message if all slips are submitted */}
      {itemForms.length > 0 && itemForms.every((form) => form.isSubmitted) && (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-800 flex items-center gap-2">
          <Check className="h-5 w-5" />
          All arrival slips have been submitted to QA. Click Next to proceed to Weighment.
        </div>
      )}

      <div className="space-y-6">
        {/* Arrival Slip Forms for each PO Item Receipt */}
        {itemForms.map((form, index) => (
          <Card key={form.id} className={(form.isSubmitted || isReadOnly) ? 'opacity-75' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <span>
                    Arrival Slip {index + 1}: {form.item_name}
                  </span>
                </CardTitle>
                {form.isSubmitted && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                    <Check className="h-3 w-3" />
                    Submitted
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                PO: {form.po_number} | Item Code: {form.po_item_code} | Received Qty:{' '}
                {form.received_qty} {form.uom}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Particulars */}
                <div className="space-y-2">
                  <Label htmlFor={`particulars-${form.id}`}>
                    Particulars <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`particulars-${form.id}`}
                    placeholder="Material description"
                    value={form.formData.particulars}
                    onChange={(e) => handleFormChange(form.id, 'particulars', e.target.value)}
                    disabled={form.isSubmitted || isSaving || isReadOnly}
                    className={cn(
                      apiErrors[`${form.id}_particulars`] && 'border-destructive',
                      (form.isSubmitted || isReadOnly) && 'cursor-not-allowed opacity-50',
                    )}
                  />
                  {apiErrors[`${form.id}_particulars`] && (
                    <p className="text-sm text-destructive">
                      {apiErrors[`${form.id}_particulars`]}
                    </p>
                  )}
                </div>

                {/* Arrival Date/Time */}
                <div className="space-y-2">
                  <Label htmlFor={`arrival_datetime-${form.id}`}>
                    Arrival Date/Time <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`arrival_datetime-${form.id}`}
                    type="datetime-local"
                    value={form.formData.arrival_datetime}
                    onChange={(e) => handleFormChange(form.id, 'arrival_datetime', e.target.value)}
                    disabled={form.isSubmitted || isSaving || isReadOnly}
                    className={cn(
                      apiErrors[`${form.id}_arrival_datetime`] && 'border-destructive',
                      (form.isSubmitted || isReadOnly) && 'cursor-not-allowed opacity-50',
                    )}
                  />
                  {apiErrors[`${form.id}_arrival_datetime`] && (
                    <p className="text-sm text-destructive">
                      {apiErrors[`${form.id}_arrival_datetime`]}
                    </p>
                  )}
                </div>

                {/* Party Name */}
                <div className="space-y-2">
                  <Label htmlFor={`party_name-${form.id}`}>
                    Party Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`party_name-${form.id}`}
                    placeholder="Supplier name"
                    value={form.formData.party_name}
                    onChange={(e) => handleFormChange(form.id, 'party_name', e.target.value)}
                    disabled={form.isSubmitted || isSaving || isReadOnly}
                    className={cn(
                      apiErrors[`${form.id}_party_name`] && 'border-destructive',
                      (form.isSubmitted || isReadOnly) && 'cursor-not-allowed opacity-50',
                    )}
                  />
                  {apiErrors[`${form.id}_party_name`] && (
                    <p className="text-sm text-destructive">{apiErrors[`${form.id}_party_name`]}</p>
                  )}
                </div>

                {/* Billing Qty */}
                <div className="space-y-2">
                  <Label htmlFor={`billing_qty-${form.id}`}>
                    Billing Quantity <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`billing_qty-${form.id}`}
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="0"
                    value={form.formData.billing_qty}
                    onChange={(e) => handleFormChange(form.id, 'billing_qty', e.target.value)}
                    disabled={form.isSubmitted || isSaving || isReadOnly}
                    className={cn(
                      apiErrors[`${form.id}_billing_qty`] && 'border-destructive',
                      (form.isSubmitted || isReadOnly) && 'cursor-not-allowed opacity-50',
                    )}
                  />
                  {apiErrors[`${form.id}_billing_qty`] && (
                    <p className="text-sm text-destructive">
                      {apiErrors[`${form.id}_billing_qty`]}
                    </p>
                  )}
                </div>

                {/* Billing UOM */}
                <div className="space-y-2">
                  <Label htmlFor={`billing_uom-${form.id}`}>
                    Billing UOM <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`billing_uom-${form.id}`}
                    placeholder="Pcs, Kg, etc."
                    value={form.formData.billing_uom}
                    onChange={(e) => handleFormChange(form.id, 'billing_uom', e.target.value)}
                    disabled={form.isSubmitted || isSaving || isReadOnly}
                    className={cn(
                      apiErrors[`${form.id}_billing_uom`] && 'border-destructive',
                      (form.isSubmitted || isReadOnly) && 'cursor-not-allowed opacity-50',
                    )}
                  />
                  {apiErrors[`${form.id}_billing_uom`] && (
                    <p className="text-sm text-destructive">
                      {apiErrors[`${form.id}_billing_uom`]}
                    </p>
                  )}
                </div>

                {/* Truck No */}
                <div className="space-y-2">
                  <Label htmlFor={`truck_no_as_per_bill-${form.id}`}>
                    Truck No. (as per Bill) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`truck_no_as_per_bill-${form.id}`}
                    placeholder="MH12AB1234"
                    value={form.formData.truck_no_as_per_bill}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase().replace(/\s/g, '');
                      handleFormChange(form.id, 'truck_no_as_per_bill', value);
                    }}
                    disabled={form.isSubmitted || isSaving || isReadOnly}
                    className={cn(
                      apiErrors[`${form.id}_truck_no_as_per_bill`] && 'border-destructive',
                      (form.isSubmitted || isReadOnly) && 'cursor-not-allowed opacity-50',
                    )}
                  />
                  {apiErrors[`${form.id}_truck_no_as_per_bill`] && (
                    <p className="text-sm text-destructive">
                      {apiErrors[`${form.id}_truck_no_as_per_bill`]}
                    </p>
                  )}
                </div>

                {/* Commercial Invoice No */}
                <div className="space-y-2">
                  <Label htmlFor={`commercial_invoice_no-${form.id}`}>Commercial Invoice No.</Label>
                  <Input
                    id={`commercial_invoice_no-${form.id}`}
                    placeholder="Invoice number"
                    value={form.formData.commercial_invoice_no}
                    onChange={(e) =>
                      handleFormChange(form.id, 'commercial_invoice_no', e.target.value)
                    }
                    disabled={form.isSubmitted || isSaving || isReadOnly}
                    className={(form.isSubmitted || isReadOnly) ? 'cursor-not-allowed opacity-50' : ''}
                  />
                </div>

                {/* E-way Bill No */}
                <div className="space-y-2">
                  <Label htmlFor={`eway_bill_no-${form.id}`}>E-way Bill No.</Label>
                  <Input
                    id={`eway_bill_no-${form.id}`}
                    placeholder="E-way bill number"
                    value={form.formData.eway_bill_no}
                    onChange={(e) => handleFormChange(form.id, 'eway_bill_no', e.target.value)}
                    disabled={form.isSubmitted || isSaving || isReadOnly}
                    className={(form.isSubmitted || isReadOnly) ? 'cursor-not-allowed opacity-50' : ''}
                  />
                </div>

                {/* Bilty No */}
                <div className="space-y-2">
                  <Label htmlFor={`bilty_no-${form.id}`}>Bilty No.</Label>
                  <Input
                    id={`bilty_no-${form.id}`}
                    placeholder="Bilty/LR number"
                    value={form.formData.bilty_no}
                    onChange={(e) => handleFormChange(form.id, 'bilty_no', e.target.value)}
                    disabled={form.isSubmitted || isSaving || isReadOnly}
                    className={(form.isSubmitted || isReadOnly) ? 'cursor-not-allowed opacity-50' : ''}
                  />
                </div>

                {/* Remarks */}
                <div className="space-y-2 md:col-span-2 lg:col-span-3">
                  <Label htmlFor={`remarks-${form.id}`}>Remarks</Label>
                  <Input
                    id={`remarks-${form.id}`}
                    placeholder="Any additional remarks"
                    value={form.formData.remarks}
                    onChange={(e) => handleFormChange(form.id, 'remarks', e.target.value)}
                    disabled={form.isSubmitted || isSaving || isReadOnly}
                    className={(form.isSubmitted || isReadOnly) ? 'cursor-not-allowed opacity-50' : ''}
                  />
                </div>

                {/* Certificates */}
                <div className="space-y-4 md:col-span-2 lg:col-span-3">
                  <Label>Certificates</Label>
                  <div className="space-y-4">
                    {/* COA */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`has_certificate_of_analysis-${form.id}`}
                          checked={form.formData.has_certificate_of_analysis}
                          onCheckedChange={(checked) =>
                            handleFormChange(form.id, 'has_certificate_of_analysis', checked === true)
                          }
                          disabled={form.isSubmitted || isSaving || isReadOnly}
                        />
                        <Label
                          htmlFor={`has_certificate_of_analysis-${form.id}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          Certificate of Analysis (COA)
                        </Label>
                      </div>
                      {form.formData.has_certificate_of_analysis && (
                        <div className="ml-6">
                          {form.certificateOfAnalysisFile ? (
                            <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
                              <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <span className="truncate">{form.certificateOfAnalysisFile.name}</span>
                              {!form.isSubmitted && !isReadOnly && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="ml-auto h-6 w-6 p-0"
                                  onClick={() => {
                                    handleFileChange(form.id, 'certificateOfAnalysisFile', null);
                                    const ref = coaFileInputRefs.current[form.id];
                                    if (ref) ref.value = '';
                                  }}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          ) : form.existingSlip?.attachments?.find(
                              (a) => a.attachment_type === 'certificate_of_analysis',
                            ) ? (
                            <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
                              <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <span className="truncate">
                                {form.existingSlip.attachments.find(
                                  (a) => a.attachment_type === 'certificate_of_analysis',
                                )?.file_name || 'COA uploaded'}
                              </span>
                              {!form.isSubmitted && !isReadOnly && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="ml-auto h-7 text-xs"
                                  onClick={() => coaFileInputRefs.current[form.id]?.click()}
                                >
                                  Replace
                                </Button>
                              )}
                            </div>
                          ) : (
                            <div
                              className={cn(
                                'flex items-center gap-3 rounded-md border-2 border-dashed px-3 py-3 cursor-pointer transition-colors',
                                apiErrors[`${form.id}_certificateOfAnalysisFile`]
                                  ? 'border-destructive/50 hover:border-destructive'
                                  : 'border-muted-foreground/25 hover:border-primary/50',
                                (form.isSubmitted || isReadOnly) && 'cursor-not-allowed opacity-50',
                              )}
                              onClick={() => {
                                if (!form.isSubmitted && !isReadOnly) {
                                  coaFileInputRefs.current[form.id]?.click();
                                }
                              }}
                            >
                              <Upload className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                Click to upload COA file
                              </span>
                            </div>
                          )}
                          <input
                            ref={(el) => { coaFileInputRefs.current[form.id] = el; }}
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              handleFileChange(form.id, 'certificateOfAnalysisFile', file);
                            }}
                            disabled={form.isSubmitted || isSaving || isReadOnly}
                          />
                          {apiErrors[`${form.id}_certificateOfAnalysisFile`] && (
                            <p className="text-sm text-destructive">
                              {apiErrors[`${form.id}_certificateOfAnalysisFile`]}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* COQ */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`has_certificate_of_quantity-${form.id}`}
                          checked={form.formData.has_certificate_of_quantity}
                          onCheckedChange={(checked) =>
                            handleFormChange(form.id, 'has_certificate_of_quantity', checked === true)
                          }
                          disabled={form.isSubmitted || isSaving || isReadOnly}
                        />
                        <Label
                          htmlFor={`has_certificate_of_quantity-${form.id}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          Certificate of Quantity (COQ)
                        </Label>
                      </div>
                      {form.formData.has_certificate_of_quantity && (
                        <div className="ml-6">
                          {form.certificateOfQuantityFile ? (
                            <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
                              <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <span className="truncate">{form.certificateOfQuantityFile.name}</span>
                              {!form.isSubmitted && !isReadOnly && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="ml-auto h-6 w-6 p-0"
                                  onClick={() => {
                                    handleFileChange(form.id, 'certificateOfQuantityFile', null);
                                    const ref = coqFileInputRefs.current[form.id];
                                    if (ref) ref.value = '';
                                  }}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          ) : form.existingSlip?.attachments?.find(
                              (a) => a.attachment_type === 'certificate_of_quantity',
                            ) ? (
                            <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
                              <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <span className="truncate">
                                {form.existingSlip.attachments.find(
                                  (a) => a.attachment_type === 'certificate_of_quantity',
                                )?.file_name || 'COQ uploaded'}
                              </span>
                              {!form.isSubmitted && !isReadOnly && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="ml-auto h-7 text-xs"
                                  onClick={() => coqFileInputRefs.current[form.id]?.click()}
                                >
                                  Replace
                                </Button>
                              )}
                            </div>
                          ) : (
                            <div
                              className={cn(
                                'flex items-center gap-3 rounded-md border-2 border-dashed px-3 py-3 cursor-pointer transition-colors',
                                apiErrors[`${form.id}_certificateOfQuantityFile`]
                                  ? 'border-destructive/50 hover:border-destructive'
                                  : 'border-muted-foreground/25 hover:border-primary/50',
                                (form.isSubmitted || isReadOnly) && 'cursor-not-allowed opacity-50',
                              )}
                              onClick={() => {
                                if (!form.isSubmitted && !isReadOnly) {
                                  coqFileInputRefs.current[form.id]?.click();
                                }
                              }}
                            >
                              <Upload className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                Click to upload COQ file
                              </span>
                            </div>
                          )}
                          <input
                            ref={(el) => { coqFileInputRefs.current[form.id] = el; }}
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              handleFileChange(form.id, 'certificateOfQuantityFile', file);
                            }}
                            disabled={form.isSubmitted || isSaving || isReadOnly}
                          />
                          {apiErrors[`${form.id}_certificateOfQuantityFile`] && (
                            <p className="text-sm text-destructive">
                              {apiErrors[`${form.id}_certificateOfQuantityFile`]}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* No items message */}
        {itemForms.length === 0 && !hasNoPOReceipts && (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No PO item receipts found to create arrival slips.</p>
                <p className="text-sm mt-2">Please go back to Step 3 to add PO receipts first.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer Actions */}
      <StepFooter
        onPrevious={handlePrevious}
        onCancel={() => {
          queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
          navigate('/gate/raw-materials');
        }}
        onNext={handleNext}
        showUpdate={false}
        isSaving={isSaving || isNavigating}
        isEditMode={effectiveEditMode}
        isUpdateMode={false}
        nextLabel={
          itemForms.every((form) => form.isSubmitted) ? 'Next' : 'Submit to QA and Continue'
        }
      />
    </div>
  );
}
