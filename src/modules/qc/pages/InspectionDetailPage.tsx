import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  FlaskConical,
  Pencil,
  Save,
  Send,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import type { ApiError } from '@/core/api/types';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
} from '@/shared/components/ui';
import { useScrollToError } from '@/shared/hooks';
import { cn } from '@/shared/utils';

import { useArrivalSlipById } from '../api/arrivalSlip/arrivalSlip.queries';
import {
  useApproveAsChemist,
  useApproveAsQAM,
  useCreateInspection,
  useInspectionForSlip,
  useRejectInspection,
  useSubmitInspection,
  useUpdateParameterResults,
} from '../api/inspection/inspection.queries';
import { useQCParametersByMaterialType } from '../api/qcParameter/qcParameter.queries';
import { MaterialTypeSelect } from '../components';
import {
  FINAL_STATUS,
  FINAL_STATUS_CONFIG,
  WORKFLOW_STATUS,
  WORKFLOW_STATUS_CONFIG,
} from '../constants';
import { useInspectionPermissions } from '../hooks';
import type {
  CreateInspectionRequest,
  InspectionFinalStatus,
  ParameterResult,
  UpdateParameterResultRequest,
} from '../types';

export default function InspectionDetailPage() {
  const navigate = useNavigate();
  const { slipId, inspectionId } = useParams<{ slipId?: string; inspectionId?: string }>();
  const isNewInspection = window.location.pathname.includes('/new');

  const arrivalSlipId = slipId ? parseInt(slipId) : inspectionId ? parseInt(inspectionId) : null;

  // Edit mode state - controls whether form fields are editable
  const [isEditing, setIsEditing] = useState(false);

  // Fetch existing inspection
  const { data: inspection, isLoading: isLoadingInspection } = useInspectionForSlip(arrivalSlipId);

  // Fetch arrival slip data for prefilling (only needed when creating new inspection)
  const { data: arrivalSlip, isLoading: isLoadingArrivalSlip } = useArrivalSlipById(
    isNewInspection && !inspection ? arrivalSlipId : null,
  );

  // Form state
  const [formData, setFormData] = useState<Partial<CreateInspectionRequest>>({
    inspection_date: new Date().toISOString().split('T')[0],
    description_of_material: '',
    sap_code: '',
    supplier_name: '',
    manufacturer_name: '',
    supplier_batch_lot_no: '',
    unit_packing: '',
    purchase_order_no: '',
    invoice_bill_no: '',
    vehicle_no: '',
    material_type_id: 0,
    remarks: '',
  });

  // Parameter results state
  const [parameterResults, setParameterResults] = useState<
    Record<
      number,
      { result_value: string; result_numeric?: number; is_within_spec?: boolean; remarks: string }
    >
  >({});

  // Approval remarks
  const [approvalRemarks, setApprovalRemarks] = useState('');
  const [finalStatus, setFinalStatus] = useState<InspectionFinalStatus>(FINAL_STATUS.ACCEPTED);

  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});

  // Scroll to first error when errors occur
  useScrollToError(apiErrors);

  // Fetch parameters when material type changes
  const { data: qcParameters = [] } = useQCParametersByMaterialType(
    formData.material_type_id || null,
  );

  // Mutations
  const createInspection = useCreateInspection();
  const updateParameters = useUpdateParameterResults();
  const submitInspection = useSubmitInspection();
  const approveAsChemist = useApproveAsChemist();
  const approveAsQAM = useApproveAsQAM();
  const rejectInspection = useRejectInspection();

  // Load existing inspection data
  useEffect(() => {
    if (inspection) {
      setFormData({
        inspection_date: inspection.inspection_date,
        description_of_material: inspection.description_of_material,
        sap_code: inspection.sap_code,
        supplier_name: inspection.supplier_name,
        manufacturer_name: inspection.manufacturer_name,
        supplier_batch_lot_no: inspection.supplier_batch_lot_no,
        unit_packing: inspection.unit_packing,
        purchase_order_no: inspection.purchase_order_no,
        invoice_bill_no: inspection.invoice_bill_no,
        vehicle_no: inspection.vehicle_no,
        material_type_id: inspection.material_type,
        remarks: inspection.remarks,
      });

      // Load parameter results
      const resultsMap: Record<
        number,
        { result_value: string; result_numeric?: number; is_within_spec?: boolean; remarks: string }
      > = {};
      inspection.parameter_results?.forEach((result: ParameterResult) => {
        resultsMap[result.parameter_master] = {
          result_value: result.result_value,
          result_numeric: result.result_numeric || undefined,
          is_within_spec: result.is_within_spec ?? undefined,
          remarks: result.remarks,
        };
      });
      setParameterResults(resultsMap);
    }
  }, [inspection]);

  // Prefill form from arrival slip data when creating new inspection
  useEffect(() => {
    if (arrivalSlip && !inspection && isNewInspection) {
      setFormData((prev) => ({
        ...prev,
        // Material/Item details
        description_of_material: arrivalSlip.item_name || prev.description_of_material,
        sap_code: arrivalSlip.po_item_code || prev.sap_code,
        // Supplier/Party details
        supplier_name: arrivalSlip.party_name || prev.supplier_name,
        // Packing details - combine quantity and UOM
        unit_packing:
          arrivalSlip.billing_qty && arrivalSlip.billing_uom
            ? `${arrivalSlip.billing_qty} ${arrivalSlip.billing_uom}`
            : prev.unit_packing,
        // Vehicle details
        vehicle_no: arrivalSlip.truck_no_as_per_bill || prev.vehicle_no,
        // Invoice details
        invoice_bill_no: arrivalSlip.commercial_invoice_no || prev.invoice_bill_no,
        // Remarks from arrival slip
        remarks: arrivalSlip.remarks || prev.remarks,
      }));
    }
  }, [arrivalSlip, inspection, isNewInspection]);

  const handleInputChange = (field: keyof CreateInspectionRequest, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (apiErrors[field]) {
      setApiErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleParameterChange = (
    parameterId: number,
    field: 'result_value' | 'result_numeric' | 'is_within_spec' | 'remarks',
    value: string | number | boolean,
  ) => {
    setParameterResults((prev) => ({
      ...prev,
      [parameterId]: {
        ...prev[parameterId],
        result_value: prev[parameterId]?.result_value || '',
        remarks: prev[parameterId]?.remarks || '',
        [field]: value,
      },
    }));
    // Clear parameter error when user fills in a value
    const errorKey = `param_${parameterId}`;
    if (apiErrors[errorKey]) {
      setApiErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  // Type-aware result change handler: auto-sets result_numeric and is_within_spec
  const handleResultValueChange = (
    parameterId: number,
    value: string,
    paramType: string,
    minValue?: number | string | null,
    maxValue?: number | string | null,
  ) => {
    handleParameterChange(parameterId, 'result_value', value);

    if (paramType === 'NUMERIC' || paramType === 'RANGE') {
      const numericVal = parseFloat(value);
      if (!isNaN(numericVal)) {
        handleParameterChange(parameterId, 'result_numeric', numericVal);
        if (paramType === 'RANGE' && minValue != null && maxValue != null) {
          const min = typeof minValue === 'string' ? parseFloat(minValue) : minValue;
          const max = typeof maxValue === 'string' ? parseFloat(maxValue) : maxValue;
          if (!isNaN(min) && !isNaN(max)) {
            handleParameterChange(parameterId, 'is_within_spec', numericVal >= min && numericVal <= max);
          }
        }
      }
    } else if (paramType === 'BOOLEAN') {
      handleParameterChange(parameterId, 'is_within_spec', value === 'Pass');
    }
  };

  const getResultPlaceholder = (paramType: string) => {
    switch (paramType) {
      case 'NUMERIC': return 'Enter numeric value';
      case 'RANGE': return 'Enter numeric value';
      case 'BOOLEAN': return 'Select Pass or Fail';
      case 'TEXT': default: return 'Enter text value';
    }
  };

  const handleSave = async () => {
    if (!arrivalSlipId) return;

    try {
      setApiErrors({});

      // Validate required fields
      const errors: Record<string, string> = {};
      if (!formData.material_type_id) {
        errors.material_type_id = 'Please select a material type';
      }
      if (!formData.supplier_batch_lot_no?.trim()) {
        errors.supplier_batch_lot_no = 'Supplier Batch/Lot No. is required';
      }
      if (!formData.purchase_order_no?.trim()) {
        errors.purchase_order_no = 'Purchase Order No. is required';
      }

      // Validate mandatory parameters have result values
      const mandatoryParams = qcParameters.filter((p) => p.is_mandatory);
      for (const param of mandatoryParams) {
        const result = parameterResults[param.id];
        if (!result?.result_value?.trim()) {
          errors[`param_${param.id}`] = `${param.parameter_name} result is required`;
        }
      }

      if (Object.keys(errors).length > 0) {
        setApiErrors(errors);
        return;
      }

      let currentInspectionId = inspection?.id;

      // If no inspection exists, create one
      if (!inspection) {
        const newInspection = await createInspection.mutateAsync({
          slipId: arrivalSlipId,
          data: formData as CreateInspectionRequest,
        });
        currentInspectionId = newInspection.id;
      }

      // Update parameter results if we have an inspection and parameter results
      if (currentInspectionId && Object.keys(parameterResults).length > 0) {
        const results: UpdateParameterResultRequest[] = Object.entries(parameterResults).map(
          ([parameterId, values]) => ({
            parameter_master_id: parseInt(parameterId),
            result_value: values.result_value || '',
            result_numeric: values.result_numeric,
            is_within_spec: values.is_within_spec ?? true,
            remarks: values.remarks || '',
          }),
        );

        await updateParameters.mutateAsync({
          inspectionId: currentInspectionId,
          results,
        });
      }

      // Exit edit mode after successful save
      setIsEditing(false);
    } catch (error) {
      const apiError = error as ApiError;
      setApiErrors({ general: apiError.message || 'Failed to save inspection' });
    }
  };

  const handleSubmit = async () => {
    if (!inspection) {
      setApiErrors({ general: 'Please save the inspection first' });
      return;
    }

    try {
      setApiErrors({});
      await submitInspection.mutateAsync(inspection.id);
    } catch (error) {
      const apiError = error as ApiError;
      setApiErrors({ general: apiError.message || 'Failed to submit inspection' });
    }
  };

  const handleApproveChemist = async () => {
    if (!inspection) return;

    try {
      setApiErrors({});
      await approveAsChemist.mutateAsync({
        id: inspection.id,
        data: { remarks: approvalRemarks },
      });
    } catch (error) {
      const apiError = error as ApiError;
      setApiErrors({ general: apiError.message || 'Failed to approve' });
    }
  };

  const handleApproveQAM = async () => {
    if (!inspection) return;

    try {
      setApiErrors({});
      await approveAsQAM.mutateAsync({
        id: inspection.id,
        data: { remarks: approvalRemarks, final_status: finalStatus },
      });
    } catch (error) {
      const apiError = error as ApiError;
      setApiErrors({ general: apiError.message || 'Failed to approve' });
    }
  };

  const handleReject = async () => {
    if (!inspection) return;
    if (!approvalRemarks.trim()) {
      setApiErrors({ approval_remarks: 'Please provide a reason for rejection' });
      return;
    }

    try {
      setApiErrors({});
      await rejectInspection.mutateAsync({
        id: inspection.id,
        data: { remarks: approvalRemarks },
      });
    } catch (error) {
      const apiError = error as ApiError;
      setApiErrors({ general: apiError.message || 'Failed to reject' });
    }
  };

  // Permission checks using the centralized permission hook
  const {
    canEditInspection,
    showSubmitButton,
    showChemistApproval,
    showQAMApproval,
    showRejectButton,
    canEditFields,
    isLocked,
  } = useInspectionPermissions(inspection);

  const isDraft = !inspection || inspection.workflow_status === WORKFLOW_STATUS.DRAFT;

  // Can edit if: permission allows and either no inspection yet or in edit mode
  const canEdit = canEditFields && (!inspection || isEditing);

  // Can update (show Update button) if: has inspection, is draft, has permission, not currently editing
  const canUpdate = inspection && isDraft && canEditInspection && !isEditing && !isLocked;

  const canSubmit = showSubmitButton && !isEditing;
  const canApproveChemist = showChemistApproval;
  const canApproveQAM = showQAMApproval;
  const canReject = showRejectButton;

  const isSaving =
    createInspection.isPending ||
    updateParameters.isPending ||
    submitInspection.isPending ||
    approveAsChemist.isPending ||
    approveAsQAM.isPending ||
    rejectInspection.isPending;

  if (isLoadingInspection || isLoadingArrivalSlip) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/qc/pending')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <FlaskConical className="h-8 w-8" />
              {isNewInspection ? 'New Inspection' : 'Inspection Details'}
            </h2>
          </div>
          {inspection && (
            <div className="flex items-center gap-4 ml-10">
              <span className="text-muted-foreground">Report No: {inspection.report_no}</span>
              <span
                className={cn(
                  'px-2 py-1 rounded-full text-xs font-medium',
                  WORKFLOW_STATUS_CONFIG[inspection.workflow_status].bgColor,
                  WORKFLOW_STATUS_CONFIG[inspection.workflow_status].color,
                )}
              >
                {WORKFLOW_STATUS_CONFIG[inspection.workflow_status].label}
              </span>
              {inspection.final_status !== FINAL_STATUS.PENDING && (
                <span
                  className={cn(
                    'px-2 py-1 rounded-full text-xs font-medium',
                    FINAL_STATUS_CONFIG[inspection.final_status].bgColor,
                    FINAL_STATUS_CONFIG[inspection.final_status].color,
                  )}
                >
                  {FINAL_STATUS_CONFIG[inspection.final_status].label}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {apiErrors.general && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {apiErrors.general}
        </div>
      )}

      {/* Inspection Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Inspection Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Prefilled fields from arrival slip - shown first */}
            <div className="space-y-2">
              <Label>Description of Material</Label>
              <Input
                value={formData.description_of_material || ''}
                onChange={(e) => handleInputChange('description_of_material', e.target.value)}
                disabled={!canEdit || isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label>SAP Code</Label>
              <Input
                value={formData.sap_code || ''}
                onChange={(e) => handleInputChange('sap_code', e.target.value)}
                disabled={!canEdit || isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label>Supplier Name</Label>
              <Input
                value={formData.supplier_name || ''}
                onChange={(e) => handleInputChange('supplier_name', e.target.value)}
                disabled={!canEdit || isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label>Unit Packing</Label>
              <Input
                value={formData.unit_packing || ''}
                onChange={(e) => handleInputChange('unit_packing', e.target.value)}
                disabled={!canEdit || isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label>Vehicle No.</Label>
              <Input
                value={formData.vehicle_no || ''}
                onChange={(e) => handleInputChange('vehicle_no', e.target.value)}
                disabled={!canEdit || isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label>Invoice/Bill No.</Label>
              <Input
                value={formData.invoice_bill_no || ''}
                onChange={(e) => handleInputChange('invoice_bill_no', e.target.value)}
                disabled={!canEdit || isSaving}
              />
            </div>

            {/* User input fields */}
            <MaterialTypeSelect
              label="Material Type"
              required
              value={formData.material_type_id || undefined}
              onChange={(type) => handleInputChange('material_type_id', type?.id || 0)}
              disabled={!canEdit || isSaving || !!inspection}
              error={apiErrors.material_type_id}
            />

            <div className="space-y-2">
              <Label>Inspection Date</Label>
              <Input
                type="date"
                value={formData.inspection_date || ''}
                onChange={(e) => handleInputChange('inspection_date', e.target.value)}
                disabled={!canEdit || isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label>Manufacturer Name</Label>
              <Input
                value={formData.manufacturer_name || ''}
                onChange={(e) => handleInputChange('manufacturer_name', e.target.value)}
                disabled={!canEdit || isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label>
                Supplier Batch/Lot No. <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.supplier_batch_lot_no || ''}
                onChange={(e) => handleInputChange('supplier_batch_lot_no', e.target.value)}
                disabled={!canEdit || isSaving}
                className={apiErrors.supplier_batch_lot_no ? 'border-destructive' : ''}
              />
              {apiErrors.supplier_batch_lot_no && (
                <p className="text-sm text-destructive">{apiErrors.supplier_batch_lot_no}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                Purchase Order No. <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.purchase_order_no || ''}
                onChange={(e) => handleInputChange('purchase_order_no', e.target.value)}
                disabled={!canEdit || isSaving}
                className={apiErrors.purchase_order_no ? 'border-destructive' : ''}
              />
              {apiErrors.purchase_order_no && (
                <p className="text-sm text-destructive">{apiErrors.purchase_order_no}</p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2 lg:col-span-3">
              <Label>Remarks</Label>
              <Textarea
                value={formData.remarks || ''}
                onChange={(e) => handleInputChange('remarks', e.target.value)}
                disabled={!canEdit || isSaving}
                rows={2}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parameter Results */}
      {((inspection?.parameter_results?.length ?? 0) > 0 || qcParameters.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>QC Parameters</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Mobile: stacked card layout */}
            <div className="md:hidden space-y-4">
              {(inspection?.parameter_results || qcParameters).map((param) => {
                const parameterId = 'parameter_master' in param ? param.parameter_master : param.id;
                const paramName = param.parameter_name;
                const standardValue = param.standard_value;
                const paramType = param.parameter_type;
                const minValue = param.min_value;
                const maxValue = param.max_value;
                const isMandatory =
                  'is_mandatory' in param
                    ? param.is_mandatory
                    : (qcParameters.find((p) => p.id === parameterId)?.is_mandatory ?? false);
                const paramError = apiErrors[`param_${parameterId}`];
                const currentValue = parameterResults[parameterId] || {
                  result_value: '',
                  is_within_spec: true,
                  remarks: '',
                };

                return (
                  <div
                    key={parameterId}
                    className={cn(
                      'border rounded-lg p-3 space-y-3',
                      paramError && 'border-destructive',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">
                        {paramName}
                        {isMandatory && <span className="text-destructive"> *</span>}
                      </span>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={currentValue.is_within_spec ?? true}
                          onChange={(e) =>
                            handleParameterChange(parameterId, 'is_within_spec', e.target.checked)
                          }
                          disabled={!canEdit || isSaving || paramType === 'BOOLEAN' || paramType === 'RANGE'}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <span className="text-muted-foreground">Within Spec</span>
                      </label>
                    </div>
                    <div className="text-sm text-muted-foreground">Standard: {standardValue}</div>
                    <div className="space-y-1">
                      <Label className="text-xs">
                        Result{isMandatory && <span className="text-destructive"> *</span>}
                      </Label>
                      {paramType === 'BOOLEAN' ? (
                        <select
                          value={currentValue.result_value}
                          onChange={(e) =>
                            handleResultValueChange(parameterId, e.target.value, paramType)
                          }
                          disabled={!canEdit || isSaving}
                          className={cn(
                            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
                            paramError && 'border-destructive',
                          )}
                        >
                          <option value="">Select Pass or Fail</option>
                          <option value="Pass">Pass</option>
                          <option value="Fail">Fail</option>
                        </select>
                      ) : (
                        <Input
                          type={paramType === 'NUMERIC' || paramType === 'RANGE' ? 'number' : 'text'}
                          step={paramType === 'NUMERIC' || paramType === 'RANGE' ? 'any' : undefined}
                          value={currentValue.result_value}
                          onChange={(e) =>
                            handleResultValueChange(parameterId, e.target.value, paramType, minValue, maxValue)
                          }
                          disabled={!canEdit || isSaving}
                          className={cn('w-full', paramError && 'border-destructive')}
                          placeholder={getResultPlaceholder(paramType)}
                        />
                      )}
                      {paramError && <p className="text-xs text-destructive">{paramError}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Remarks</Label>
                      <Input
                        value={currentValue.remarks}
                        onChange={(e) =>
                          handleParameterChange(parameterId, 'remarks', e.target.value)
                        }
                        disabled={!canEdit || isSaving}
                        className="w-full"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: table layout */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Parameter</th>
                    <th className="text-left p-3 font-medium">Standard Value</th>
                    <th className="text-left p-3 font-medium">Result</th>
                    <th className="text-center p-3 font-medium">Within Spec</th>
                    <th className="text-left p-3 font-medium">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {(inspection?.parameter_results || qcParameters).map((param) => {
                    const parameterId =
                      'parameter_master' in param ? param.parameter_master : param.id;
                    const paramName = param.parameter_name;
                    const standardValue = param.standard_value;
                    const paramType = param.parameter_type;
                    const minValue = param.min_value;
                    const maxValue = param.max_value;
                    const isMandatory =
                      'is_mandatory' in param
                        ? param.is_mandatory
                        : (qcParameters.find((p) => p.id === parameterId)?.is_mandatory ?? false);
                    const paramError = apiErrors[`param_${parameterId}`];
                    const currentValue = parameterResults[parameterId] || {
                      result_value: '',
                      is_within_spec: true,
                      remarks: '',
                    };

                    return (
                      <tr key={parameterId} className="border-b">
                        <td className="p-3">
                          <span className="font-medium">
                            {paramName}
                            {isMandatory && <span className="text-destructive"> *</span>}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">{standardValue}</td>
                        <td className="p-3">
                          {paramType === 'BOOLEAN' ? (
                            <select
                              value={currentValue.result_value}
                              onChange={(e) =>
                                handleResultValueChange(parameterId, e.target.value, paramType)
                              }
                              disabled={!canEdit || isSaving}
                              className={cn(
                                'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
                                paramError && 'border-destructive',
                              )}
                            >
                              <option value="">Select Pass or Fail</option>
                              <option value="Pass">Pass</option>
                              <option value="Fail">Fail</option>
                            </select>
                          ) : (
                            <Input
                              type={paramType === 'NUMERIC' || paramType === 'RANGE' ? 'number' : 'text'}
                              step={paramType === 'NUMERIC' || paramType === 'RANGE' ? 'any' : undefined}
                              value={currentValue.result_value}
                              onChange={(e) =>
                                handleResultValueChange(parameterId, e.target.value, paramType, minValue, maxValue)
                              }
                              disabled={!canEdit || isSaving}
                              className={cn('w-full', paramError && 'border-destructive')}
                              placeholder={getResultPlaceholder(paramType)}
                            />
                          )}
                          {paramError && (
                            <p className="text-xs text-destructive mt-1">{paramError}</p>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={currentValue.is_within_spec ?? true}
                            onChange={(e) =>
                              handleParameterChange(parameterId, 'is_within_spec', e.target.checked)
                            }
                            disabled={!canEdit || isSaving || paramType === 'BOOLEAN' || paramType === 'RANGE'}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            value={currentValue.remarks}
                            onChange={(e) =>
                              handleParameterChange(parameterId, 'remarks', e.target.value)
                            }
                            disabled={!canEdit || isSaving}
                            className="w-full"
                            placeholder="Optional"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approval Section */}
      {(canApproveChemist || canApproveQAM || canReject) && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle>Approval</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                value={approvalRemarks}
                onChange={(e) => setApprovalRemarks(e.target.value)}
                placeholder="Enter approval/rejection remarks"
                rows={3}
              />
              {apiErrors.approval_remarks && (
                <p className="text-sm text-destructive">{apiErrors.approval_remarks}</p>
              )}
            </div>

            {canApproveQAM && (
              <div className="space-y-2">
                <Label>Final Status</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={finalStatus}
                  onChange={(e) => setFinalStatus(e.target.value as InspectionFinalStatus)}
                >
                  <option value={FINAL_STATUS.ACCEPTED}>Accepted</option>
                  <option value={FINAL_STATUS.REJECTED}>Rejected</option>
                  <option value={FINAL_STATUS.HOLD}>Hold</option>
                </select>
              </div>
            )}

            <div className="flex flex-wrap gap-4">
              {canApproveChemist && (
                <Button onClick={handleApproveChemist} disabled={isSaving}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve as Chemist
                </Button>
              )}
              {canApproveQAM && (
                <Button onClick={handleApproveQAM} disabled={isSaving}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve as Manager
                </Button>
              )}
              {canReject && (
                <Button variant="destructive" onClick={handleReject} disabled={isSaving}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer Actions */}
      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:justify-between">
        <Button variant="outline" onClick={() => navigate('/qc/pending')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex gap-4">
          {canUpdate && (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Update
            </Button>
          )}
          {canEdit && (
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          )}
          {canSubmit && !isEditing && (
            <Button onClick={handleSubmit} disabled={isSaving}>
              <Send className="h-4 w-4 mr-2" />
              Submit for Approval
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
