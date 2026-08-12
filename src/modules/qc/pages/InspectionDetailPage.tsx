import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileText,
  FlaskConical,
  History,
  Link2,
  Paperclip,
  Pencil,
  Printer,
  Save,
  Send,
  Undo2,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import type { ApiError } from '@/core/api/types';
import { VendorSelect } from '@/modules/gate/components/VendorSelect';
import { DocumentCodeBadge, RecordTimestamps, SearchableSelect } from '@/shared/components';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from '@/shared/components/ui';
import { useScrollToError } from '@/shared/hooks';
import { cn } from '@/shared/utils';

import { useArrivalSlipById, useSendBackArrivalSlip } from '../api/arrivalSlip/arrivalSlip.queries';
import {
  useApproveAsChemist,
  useApproveAsQAM,
  useCreateInspection,
  useInspectionForSlip,
  useSubmitInspection,
  useUpdateInspection,
  useUpdateParameterResults,
} from '../api/inspection/inspection.queries';
import {
  useLinkMaterialTypeSAPItem,
  useMaterialTypeBySapItem,
  useMaterialTypes,
} from '../api/materialType';
import { useQCParametersByMaterialType } from '../api/qcParameter/qcParameter.queries';
import { QCSuccessScreen, useInspectionReportPrint } from '../components';
import {
  DECISION_STATUS_CONFIG,
  WORKFLOW_STATUS,
  WORKFLOW_STATUS_CONFIG,
} from '../constants';
import { useArrivalSlipPermissions, useInspectionPermissions } from '../hooks';
import type {
  CreateInspectionRequest,
  InspectionDecision,
  InspectionDecisionInfo,
  MaterialType,
  ParameterResult,
  UpdateParameterResultRequest,
} from '../types';
function DecisionPill({
  label,
  decision,
}: {
  label: string;
  decision?: InspectionDecisionInfo | null;
}) {
  const decisionKey = decision?.decision ?? 'PENDING';
  const config = DECISION_STATUS_CONFIG[decisionKey];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
        config.bgColor,
        config.color,
      )}
    >
      {label}: {decision?.label || config.label}
    </span>
  );
}

const getMaterialTypeLabel = (type: MaterialType) => `${type.name} (${type.code})`;

export default function InspectionDetailPage() {
  const navigate = useNavigate();
  const { slipId, inspectionId } = useParams<{ slipId?: string; inspectionId?: string }>();
  const isNewInspection = window.location.pathname.includes('/new');

  const arrivalSlipId = slipId ? parseInt(slipId) : inspectionId ? parseInt(inspectionId) : null;

  // Edit mode state - controls whether form fields are editable
  const [isEditing, setIsEditing] = useState(false);

  // Fetch existing inspection
  const { data: inspection, isLoading: isLoadingInspection } = useInspectionForSlip(arrivalSlipId);

  // Fetch arrival slip data for prefilling and showing attachments
  const { data: arrivalSlip, isLoading: isLoadingArrivalSlip } = useArrivalSlipById(arrivalSlipId);

  // Print the inspection report using the same format as the GRPO report.
  // Opening the print button shows a dialog to choose which sections to print.
  const { openPrintOptions, printOptionsModal, printPortal } =
    useInspectionReportPrint(inspection);

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
    report_no: '',
    internal_lot_no: '',
    invoice_bill_no: '',
    vehicle_no: '',
    material_type_id: 0,
    remarks: '',
  });
  const [qcAttachmentFiles, setQcAttachmentFiles] = useState<File[]>([]);
  const qcAttachmentInputRef = useRef<HTMLInputElement | null>(null);

  // Parameter results state
  const [parameterResults, setParameterResults] = useState<
    Record<
      number,
      { result_value: string; result_numeric?: number; is_within_spec?: boolean; remarks: string }
    >
  >({});

  // Approval remarks
  const [approvalRemarks, setApprovalRemarks] = useState('');

  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});
  const [successAction, setSuccessAction] = useState<{
    actor: 'chemist' | 'manager';
    decision: InspectionDecision;
  } | null>(null);
  const [manualLinkedMaterialType, setManualLinkedMaterialType] = useState<MaterialType | null>(
    null,
  );
  const [isLinkMaterialTypeDialogOpen, setIsLinkMaterialTypeDialogOpen] = useState(false);
  const [materialTypeLinkSearch, setMaterialTypeLinkSearch] = useState('');
  const [selectedMaterialTypeForLink, setSelectedMaterialTypeForLink] =
    useState<MaterialType | null>(null);
  const [linkMaterialTypeErrors, setLinkMaterialTypeErrors] = useState<Record<string, string>>({});

  // Inspecting against a vendor other than the PO's supplier — rare, permission
  // gated, and the reason is kept on the inspection.
  const [isVendorOverrideDialogOpen, setIsVendorOverrideDialogOpen] = useState(false);
  const [vendorOverrideDraft, setVendorOverrideDraft] = useState<{
    code: string;
    name: string;
    reason: string;
  }>({ code: '', name: '', reason: '' });
  const [vendorOverrideErrors, setVendorOverrideErrors] = useState<Record<string, string>>({});

  // Scroll to first error when errors occur
  useScrollToError(apiErrors);

  const sapItemCode = (formData.sap_code || arrivalSlip?.po_item_code || '').trim().toUpperCase();
  const shouldResolveMaterialType = isNewInspection || isEditing;
  const {
    data: linkedMaterialTypes = [],
    isFetching: isResolvingMaterialType,
    isError: isMaterialTypeLookupError,
  } = useMaterialTypeBySapItem(sapItemCode || null, shouldResolveMaterialType);

  // A SAP code can be linked to several material types. A single candidate is
  // auto-selected; when there are several the user picks one (material_type_id).
  const candidateMaterialTypes = linkedMaterialTypes;
  const hasMultipleMaterialTypes = candidateMaterialTypes.length > 1;
  const chosenCandidate =
    candidateMaterialTypes.find((type) => type.id === formData.material_type_id) ?? null;
  const autoSelectedMaterialType =
    candidateMaterialTypes.length === 1 ? candidateMaterialTypes[0] : null;
  const resolvedMaterialType = chosenCandidate ?? autoSelectedMaterialType ?? manualLinkedMaterialType;

  // "Unmapped" now means the lookup finished with no candidates (or errored) and
  // the user hasn't linked one manually — the empty-list case the backend
  // returns instead of a 404.
  // Only meaningful while we actively resolve from the SAP item (new/edit). In
  // pure view mode the by-SAP lookup is disabled, so its empty candidate list
  // must NOT be read as "unmapped" — the inspection already carries a persisted
  // material type (shown via inspection.material_type_name). Without this guard
  // every saved inspection falsely renders "No material type mapping found".
  const isUnmappedMaterialType =
    shouldResolveMaterialType &&
    !manualLinkedMaterialType &&
    !isResolvingMaterialType &&
    Boolean(sapItemCode) &&
    (isMaterialTypeLookupError || candidateMaterialTypes.length === 0);
  const materialTypeDisplay = resolvedMaterialType
    ? getMaterialTypeLabel(resolvedMaterialType)
    : formData.material_type_id && inspection?.material_type_name
      ? inspection.material_type_name
      : '';
  const selectedMaterialTypeId = resolvedMaterialType?.id || formData.material_type_id || 0;
  const materialTypeMappingError =
    isUnmappedMaterialType && sapItemCode
      ? `No material type mapping found for SAP item ${sapItemCode}`
      : '';
  const materialTypeInlineError = resolvedMaterialType
    ? undefined
    : apiErrors.material_type_id || materialTypeMappingError || undefined;
  const materialTypeLinkSearchTerm = materialTypeLinkSearch.trim();
  const {
    data: materialTypeLinkOptions = [],
    isLoading: isLoadingMaterialTypeLinkOptions,
    isError: isMaterialTypeLinkOptionsError,
  } = useMaterialTypes(
    materialTypeLinkSearchTerm ? { search: materialTypeLinkSearchTerm } : undefined,
    isLinkMaterialTypeDialogOpen,
  );

  // Fetch parameters when material type changes
  const { data: qcParameters = [] } = useQCParametersByMaterialType(
    selectedMaterialTypeId || null,
  );
  const parametersToShow = isEditing ? qcParameters : inspection?.parameter_results || qcParameters;

  // Mutations
  const createInspection = useCreateInspection();
  const updateInspection = useUpdateInspection();
  const updateParameters = useUpdateParameterResults();
  const submitInspection = useSubmitInspection();
  const approveAsChemist = useApproveAsChemist();
  const approveAsQAM = useApproveAsQAM();
  const sendBackArrivalSlip = useSendBackArrivalSlip();
  const linkMaterialTypeSAPItem = useLinkMaterialTypeSAPItem();

  // Send-back state
  const [sendBackRemarks, setSendBackRemarks] = useState('');

  // Out-of-spec remark prompt shown at submit (the backend requires a remark
  // when a parameter is out of spec; a submit-only user has no editable Remarks
  // field, so it is captured inline here).
  const [isSubmitRemarkDialogOpen, setIsSubmitRemarkDialogOpen] = useState(false);
  const [submitRemark, setSubmitRemark] = useState('');
  const [submitRemarkError, setSubmitRemarkError] = useState('');

  // Populate the form (and parameter results) from the persisted inspection.
  // Used both on initial load and to revert unsaved edits when cancelling.
  const populateFormFromInspection = useCallback(() => {
    if (!inspection) return;

    setFormData({
      inspection_date: inspection.inspection_date,
      description_of_material: inspection.description_of_material,
      sap_code: inspection.sap_code,
      supplier_name: inspection.supplier_name,
      manufacturer_name: inspection.manufacturer_name,
      supplier_batch_lot_no: inspection.supplier_batch_lot_no,
      unit_packing: inspection.unit_packing,
      purchase_order_no: inspection.purchase_order_no,
      report_no: inspection.report_no,
      internal_lot_no: inspection.internal_lot_no,
      invoice_bill_no: inspection.invoice_bill_no,
      vehicle_no: inspection.vehicle_no,
      material_type_id: inspection.material_type,
      // Carried forward only while the vendor differs from the PO's supplier.
      // Sending nothing means "use the PO", so an override that isn't echoed
      // back would be silently dropped on the next save.
      ...(inspection.is_vendor_overridden
        ? {
            vendor_code: inspection.vendor_code,
            vendor_override_reason: inspection.vendor_override_reason,
          }
        : {}),
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
  }, [inspection]);

  // Load existing inspection data
  useEffect(() => {
    populateFormFromInspection();
  }, [populateFormFromInspection]);

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
    if (field === 'sap_code') {
      setManualLinkedMaterialType(null);
    }

    setFormData((prev) => {
      if (field === 'sap_code') {
        return { ...prev, [field]: value, material_type_id: 0 };
      }
      return { ...prev, [field]: value };
    });

    if (field === 'material_type_id' || field === 'sap_code') {
      setParameterResults({});
    }

    if (apiErrors[field] || field === 'sap_code') {
      setApiErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        if (field === 'sap_code') {
          delete newErrors.material_type_id;
        }
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
            handleParameterChange(
              parameterId,
              'is_within_spec',
              numericVal >= min && numericVal <= max,
            );
          }
        }
      }
    } else if (paramType === 'BOOLEAN') {
      handleParameterChange(parameterId, 'is_within_spec', value === 'Pass');
    }
  };

  const getResultPlaceholder = (paramType: string) => {
    switch (paramType) {
      case 'NUMERIC':
        return 'Enter numeric value';
      case 'RANGE':
        return 'Enter numeric value';
      case 'BOOLEAN':
        return 'Select Pass or Fail';
      case 'TEXT':
      default:
        return 'Enter text value';
    }
  };

  const buildInspectionPayload = (): CreateInspectionRequest | FormData => {
    const inspectionPayload = {
      ...formData,
      material_type_id: selectedMaterialTypeId,
    } as CreateInspectionRequest;
    if (qcAttachmentFiles.length === 0) return inspectionPayload;

    const payload = new FormData();
    Object.entries(inspectionPayload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        payload.append(key, String(value));
      }
    });
    qcAttachmentFiles.forEach((file) => {
      payload.append('qc_attachments', file);
    });
    return payload;
  };

  const clearSelectedQcAttachments = () => {
    setQcAttachmentFiles([]);
    if (qcAttachmentInputRef.current) {
      qcAttachmentInputRef.current.value = '';
    }
  };

  const removeSelectedQcAttachment = (indexToRemove: number) => {
    setQcAttachmentFiles((files) => files.filter((_, index) => index !== indexToRemove));
    if (qcAttachmentFiles.length === 1 && qcAttachmentInputRef.current) {
      qcAttachmentInputRef.current.value = '';
    }
  };

  const getAttachmentFileName = (fileUrl: string, originalName?: string) => {
    if (originalName?.trim()) return originalName;
    return decodeURIComponent(fileUrl.split('/').pop()?.split('?')[0] || 'Attachment');
  };

  const isImageAttachment = (fileUrl: string) =>
    /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(fileUrl);

  const handleSave = async () => {
    if (!arrivalSlipId) return;

    try {
      setApiErrors({});

      // Validate required fields
      const errors: Record<string, string> = {};
      if (!sapItemCode) {
        errors.sap_code = 'SAP code is required';
      }
      if (!formData.report_no?.trim()) {
        errors.report_no = 'Report number is required';
      }
      if (!formData.internal_lot_no?.trim()) {
        errors.internal_lot_no = 'Internal lot number is required';
      }
      if (isResolvingMaterialType) {
        errors.material_type_id = 'Material type mapping is still loading';
      } else if (!selectedMaterialTypeId || isUnmappedMaterialType) {
        errors.material_type_id = hasMultipleMaterialTypes
          ? 'Select a material type'
          : materialTypeMappingError || 'No linked material type found';
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
      const inspectionPayload = buildInspectionPayload();

      if (!inspection) {
        // Create new inspection
        const newInspection = await createInspection.mutateAsync({
          slipId: arrivalSlipId,
          data: inspectionPayload,
        });
        currentInspectionId = newInspection.id;
      } else {
        // Update existing inspection data
        await updateInspection.mutateAsync({
          slipId: arrivalSlipId,
          data: inspectionPayload,
        });
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
      clearSelectedQcAttachments();
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.errors) {
        const fieldErrors: Record<string, string> = {};
        Object.entries(apiError.errors).forEach(([field, messages]) => {
          fieldErrors[field] = messages[0];
        });
        setApiErrors(fieldErrors);
      } else {
        setApiErrors({ general: apiError.message || 'Failed to save inspection' });
      }
    }
  };

  // Cancel an in-progress edit: discard unsaved changes and return to the
  // read-only view (which restores the approval decision buttons).
  const handleCancelEdit = () => {
    setApiErrors({});
    populateFormFromInspection();
    clearSelectedQcAttachments();
    setIsEditing(false);
  };

  const handleMaterialTypeLinkDialogOpenChange = (open: boolean) => {
    setIsLinkMaterialTypeDialogOpen(open);
    if (!open) {
      setSelectedMaterialTypeForLink(null);
      setMaterialTypeLinkSearch('');
      setLinkMaterialTypeErrors({});
    }
  };

  const handleOpenMaterialTypeLinkDialog = () => {
    if (!sapItemCode) {
      setApiErrors((prev) => ({ ...prev, sap_code: 'SAP code is required' }));
      return;
    }
    setSelectedMaterialTypeForLink(null);
    setMaterialTypeLinkSearch('');
    setLinkMaterialTypeErrors({});
    setIsLinkMaterialTypeDialogOpen(true);
  };

  const handleLinkMaterialType = async () => {
    if (!sapItemCode) {
      setLinkMaterialTypeErrors({ item_code: 'SAP code is required' });
      return;
    }
    if (!selectedMaterialTypeForLink) {
      setLinkMaterialTypeErrors({ material_type_id: 'Select a material type' });
      return;
    }

    try {
      setLinkMaterialTypeErrors({});
      const materialType = await linkMaterialTypeSAPItem.mutateAsync({
        material_type_id: selectedMaterialTypeForLink.id,
        item_code: sapItemCode,
        item_name: formData.description_of_material || arrivalSlip?.item_name || '',
      });
      setManualLinkedMaterialType(materialType);
      setFormData((prev) => ({ ...prev, material_type_id: materialType.id }));
      setParameterResults({});
      setApiErrors((prev) => {
        const next = { ...prev };
        delete next.material_type_id;
        delete next.sap_code;
        return next;
      });
      handleMaterialTypeLinkDialogOpenChange(false);
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.errors) {
        const fieldErrors: Record<string, string> = {};
        Object.entries(apiError.errors).forEach(([field, messages]) => {
          fieldErrors[field] = messages[0];
        });
        setLinkMaterialTypeErrors(fieldErrors);
      } else {
        setLinkMaterialTypeErrors({
          general: apiError.message || 'Failed to link SAP item',
        });
      }
    }
  };

  const runSubmit = async (remarks?: string): Promise<boolean> => {
    if (!inspection) {
      setApiErrors({ general: 'Please save the inspection first' });
      return false;
    }
    if (qcAttachmentFiles.length > 0) {
      setApiErrors({ general: 'Please save selected QC attachments before submitting' });
      return false;
    }

    try {
      setApiErrors({});
      await submitInspection.mutateAsync({ id: inspection.id, remarks });
      return true;
    } catch (error) {
      const apiError = error as ApiError;
      // Out-of-spec parameters need a remark. A submit-only user can't edit the
      // Remarks field, so prompt for it inline and resubmit with it.
      const remarkError = apiError.errors?.remarks?.[0];
      if (remarkError) {
        setSubmitRemark((prev) => prev || formData.remarks || '');
        setSubmitRemarkError(remarkError);
        setIsSubmitRemarkDialogOpen(true);
        return false;
      }
      if (apiError.errors) {
        const fieldErrors: Record<string, string> = {};
        Object.entries(apiError.errors).forEach(([field, messages]) => {
          fieldErrors[field] = messages[0];
        });
        setApiErrors(fieldErrors);
      } else {
        setApiErrors({ general: apiError.message || 'Failed to submit inspection' });
      }
      return false;
    }
  };

  const handleSubmit = () => runSubmit();

  const handleConfirmSubmitRemark = async () => {
    if (!submitRemark.trim()) {
      setSubmitRemarkError('A remark is required when any parameter is out of spec.');
      return;
    }
    const ok = await runSubmit(submitRemark.trim());
    if (ok) {
      setIsSubmitRemarkDialogOpen(false);
      setSubmitRemark('');
      setSubmitRemarkError('');
    }
  };

  const handleApprovalDecision = async (
    actor: 'chemist' | 'manager',
    decision: InspectionDecision,
  ) => {
    if (!inspection) return;
    if (decision === 'REJECTED' && !approvalRemarks.trim()) {
      setApiErrors({ approval_remarks: 'Please provide a reason for rejection' });
      return;
    }

    const mutation = actor === 'chemist' ? approveAsChemist : approveAsQAM;

    try {
      setApiErrors({});
      await mutation.mutateAsync({
        id: inspection.id,
        data: { remarks: approvalRemarks, decision },
      });
      setSuccessAction({ actor, decision });
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.errors) {
        const fieldErrors: Record<string, string> = {};
        Object.entries(apiError.errors).forEach(([field, messages]) => {
          fieldErrors[field] = messages[0];
        });
        setApiErrors(fieldErrors);
      } else {
        setApiErrors({ general: apiError.message || 'Failed to approve' });
      }
    }
  };

  const handleSendBack = async () => {
    if (!arrivalSlipId) return;

    try {
      setApiErrors({});
      await sendBackArrivalSlip.mutateAsync({
        slipId: arrivalSlipId,
        data: sendBackRemarks.trim() ? { remarks: sendBackRemarks.trim() } : undefined,
      });
      navigate('/qc/pending');
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.errors) {
        const fieldErrors: Record<string, string> = {};
        Object.entries(apiError.errors).forEach(([field, messages]) => {
          fieldErrors[field] = messages[0];
        });
        setApiErrors(fieldErrors);
      } else {
        setApiErrors({ general: apiError.message || 'Failed to send back arrival slip' });
      }
    }
  };

  // Permission checks using the centralized permission hook
  const {
    canEditInspection,
    canOverrideVendor,
    showSubmitButton,
    showChemistApproval,
    showQAMApproval,
    canEditFields,
    isLocked,
  } = useInspectionPermissions(inspection);

  const { canSendBack: hasSendBackPermission } = useArrivalSlipPermissions();

  // Show Send Back button when: arrival slip is SUBMITTED, no inspection or inspection still in DRAFT, user has permission
  const showSendBack =
    hasSendBackPermission &&
    arrivalSlip?.status === 'SUBMITTED' &&
    (!inspection || inspection.workflow_status === WORKFLOW_STATUS.DRAFT);

  const isDraft = !inspection || inspection.workflow_status === WORKFLOW_STATUS.DRAFT;

  const canApproveChemist = showChemistApproval;
  const canApproveQAM = showQAMApproval;
  // An approver (chemist/manager) is reviewing this inspection for accept/reject.
  const isApprover = canApproveChemist || canApproveQAM;

  // Can edit if: permission allows (draft) OR an approver chose to edit before
  // deciding. The backend allows updates until the inspection is locked (QAM approval).
  const canEdit =
    (canEditFields && (!inspection || isEditing)) || (isApprover && isEditing && !isLocked);

  // Can update (show Update button) if: has inspection, is draft, has permission, not currently editing
  const canUpdate = inspection && isDraft && canEditInspection && !isEditing && !isLocked;

  const canSubmit = showSubmitButton && !isEditing;

  const isSaving =
    createInspection.isPending ||
    updateInspection.isPending ||
    updateParameters.isPending ||
    submitInspection.isPending ||
    approveAsChemist.isPending ||
    approveAsQAM.isPending ||
    sendBackArrivalSlip.isPending ||
    linkMaterialTypeSAPItem.isPending;

  const canOpenMaterialTypeLink =
    canEdit &&
    shouldResolveMaterialType &&
    Boolean(sapItemCode) &&
    isUnmappedMaterialType &&
    !isResolvingMaterialType &&
    !isSaving;

  // Show a picker (instead of the read-only field) when the SAP code maps to
  // more than one material type, so the user can choose which one applies.
  const showMaterialTypePicker = hasMultipleMaterialTypes && canEdit && !canOpenMaterialTypeLink;


  // Show animated success screen after approval
  if (successAction) {
    return (
      <QCSuccessScreen
        type={successAction.actor}
        decision={successAction.decision}
        onNavigateToDashboard={() => navigate('/qc')}
        onNavigateToHome={() => navigate('/')}
      />
    );
  }

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print-no-break">
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
              <DecisionPill label="Chemist" decision={inspection.chemist_decision} />
              <DecisionPill label="Manager" decision={inspection.manager_decision} />
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {(() => {
        const messages: string[] = [];
        if (apiErrors.general) messages.push(apiErrors.general);
        // Show field-level errors that aren't rendered inline (e.g. internal_lot_no)
        Object.entries(apiErrors).forEach(([key, msg]) => {
          if (
            key !== 'general' &&
            key !== 'sap_code' &&
            key !== 'material_type_id' &&
            key !== 'report_no' &&
            key !== 'internal_lot_no' &&
            !key.startsWith('param_') &&
            key !== 'approval_remarks'
          ) {
            messages.push(msg);
          }
        });
        return messages.length > 0 ? (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <div>{messages.join('. ')}</div>
          </div>
        ) : null;
      })()}

      <Dialog
        open={isVendorOverrideDialogOpen}
        onOpenChange={(open) => { if (!open) setIsVendorOverrideDialogOpen(false) }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Inspect against a different vendor</DialogTitle>
            <DialogDescription>
              QC parameters normally follow the supplier on the purchase order
              {inspection?.po_vendor_code ? ` (${inspection.po_vendor_code})` : ''}. Change this
              only when the material was actually made by someone else — for example when it
              was bought through a trader.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>
                Vendor <span className="text-destructive">*</span>
              </Label>
              <VendorSelect
                value={vendorOverrideDraft.code || undefined}
                onChange={(vendor) =>
                  setVendorOverrideDraft((prev) => ({
                    ...prev,
                    code: vendor?.vendor_code ?? '',
                    name: vendor?.vendor_name ?? '',
                  }))
                }
                error={vendorOverrideErrors.vendor_code}
              />
            </div>

            <div className="space-y-2">
              <Label>
                Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={vendorOverrideDraft.reason}
                onChange={(e) =>
                  setVendorOverrideDraft((prev) => ({ ...prev, reason: e.target.value }))
                }
                placeholder="Why these parameters apply instead of the PO supplier's"
                rows={3}
              />
              {vendorOverrideErrors.vendor_override_reason && (
                <p className="text-sm text-destructive">
                  {vendorOverrideErrors.vendor_override_reason}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Kept on the inspection and shown on the report.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVendorOverrideDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const errors: Record<string, string> = {};
                if (!vendorOverrideDraft.code.trim()) {
                  errors.vendor_code = 'Pick a vendor';
                }
                if (!vendorOverrideDraft.reason.trim()) {
                  errors.vendor_override_reason = 'A reason is required';
                }
                if (Object.keys(errors).length > 0) {
                  setVendorOverrideErrors(errors);
                  return;
                }
                setFormData((prev) => ({
                  ...prev,
                  vendor_code: vendorOverrideDraft.code,
                  vendor_override_reason: vendorOverrideDraft.reason,
                }));
                setIsVendorOverrideDialogOpen(false);
              }}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isLinkMaterialTypeDialogOpen}
        onOpenChange={handleMaterialTypeLinkDialogOpenChange}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Link Material Type</DialogTitle>
            <DialogDescription>
              Select the QC material type for this SAP item.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">SAP Item</span>
                <Badge variant="secondary" className="font-mono">
                  {sapItemCode || '-'}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {formData.description_of_material || arrivalSlip?.item_name || 'Material name unavailable'}
              </p>
            </div>

            <SearchableSelect<MaterialType>
              value={selectedMaterialTypeForLink ? String(selectedMaterialTypeForLink.id) : undefined}
              defaultDisplayText={
                selectedMaterialTypeForLink ? getMaterialTypeLabel(selectedMaterialTypeForLink) : ''
              }
              items={materialTypeLinkOptions}
              isLoading={isLoadingMaterialTypeLinkOptions}
              isError={isMaterialTypeLinkOptionsError}
              label="Material Type"
              required
              inputId="qc-link-sap-item-material-type"
              placeholder="Search material type..."
              getItemKey={(type) => type.id}
              getItemLabel={getMaterialTypeLabel}
              renderItem={(type) => (
                <div className="min-w-0">
                  <div className="font-mono text-xs font-medium">{type.code}</div>
                  <div className="truncate text-sm">{type.name}</div>
                  {type.sap_items && type.sap_items.length > 0 && (
                    <div className="truncate text-xs text-muted-foreground">
                      Linked SAP items: {type.sap_items.map((item) => item.item_code).join(', ')}
                    </div>
                  )}
                </div>
              )}
              filterFn={(type, search) => {
                const term = search.toLowerCase();
                return [
                  type.code,
                  type.name,
                  type.description,
                  ...(type.sap_items || []).flatMap((item) => [item.item_code, item.item_name]),
                ]
                  .filter(Boolean)
                  .some((value) => String(value).toLowerCase().includes(term));
              }}
              loadingText="Loading material types..."
              emptyText="No material types available"
              notFoundText="No matching material type"
              errorText="Unable to load material types"
              error={linkMaterialTypeErrors.material_type_id}
              onSearchChange={setMaterialTypeLinkSearch}
              onItemSelect={(type) => {
                setSelectedMaterialTypeForLink(type);
                setLinkMaterialTypeErrors((prev) => {
                  const next = { ...prev };
                  delete next.material_type_id;
                  return next;
                });
              }}
              onClear={() => setSelectedMaterialTypeForLink(null)}
            />

            {linkMaterialTypeErrors.general && (
              <p className="text-sm text-destructive">{linkMaterialTypeErrors.general}</p>
            )}
            {linkMaterialTypeErrors.item_code && (
              <p className="text-sm text-destructive">{linkMaterialTypeErrors.item_code}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleMaterialTypeLinkDialogOpenChange(false)}
              disabled={linkMaterialTypeSAPItem.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleLinkMaterialType}
              disabled={!selectedMaterialTypeForLink || linkMaterialTypeSAPItem.isPending}
            >
              {linkMaterialTypeSAPItem.isPending ? 'Linking...' : 'Link Material Type'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Out-of-spec remark prompt (shown when submit is blocked for a remark) */}
      <Dialog open={isSubmitRemarkDialogOpen} onOpenChange={setIsSubmitRemarkDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Remark required</DialogTitle>
            <DialogDescription>
              A parameter is out of spec. Add a remark explaining it before submitting.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>
              Remarks <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={submitRemark}
              onChange={(e) => {
                setSubmitRemark(e.target.value);
                if (submitRemarkError) setSubmitRemarkError('');
              }}
              placeholder="Explain the out-of-spec result..."
              rows={4}
            />
            {submitRemarkError && (
              <p className="text-sm text-destructive">{submitRemarkError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSubmitRemarkDialogOpen(false)}
              disabled={submitInspection.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmSubmitRemark}
              disabled={submitInspection.isPending}
            >
              {submitInspection.isPending ? 'Submitting...' : 'Submit with Remark'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                className={
                  apiErrors.sap_code ? 'border-destructive focus-visible:ring-destructive' : ''
                }
              />
              {apiErrors.sap_code && (
                <p className="text-sm text-destructive">{apiErrors.sap_code}</p>
              )}
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
              <Label>Commercial Invoice No.</Label>
              <Input
                value={formData.invoice_bill_no || ''}
                onChange={(e) => handleInputChange('invoice_bill_no', e.target.value)}
                disabled={!canEdit || isSaving}
              />
            </div>

            {/* User input fields */}
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
              <Label>
                Material Type <span className="text-destructive">*</span>
              </Label>
              {canOpenMaterialTypeLink ? (
                <button
                  type="button"
                  onClick={handleOpenMaterialTypeLinkDialog}
                  className={cn(
                    'flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm ring-offset-background transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    materialTypeInlineError && 'border-destructive focus-visible:ring-destructive',
                  )}
                >
                  <span className="truncate text-muted-foreground">
                    Link SAP item {sapItemCode} to a material type
                  </span>
                  <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ) : showMaterialTypePicker ? (
                <SearchableSelect<MaterialType>
                  inputId="inspection-material-type"
                  value={selectedMaterialTypeId ? String(selectedMaterialTypeId) : undefined}
                  items={candidateMaterialTypes}
                  isLoading={false}
                  disabled={isSaving}
                  placeholder="Select material type..."
                  getItemKey={(type) => type.id}
                  getItemLabel={getMaterialTypeLabel}
                  loadingText="Loading..."
                  emptyText="No linked material types"
                  notFoundText="No matching material type"
                  error={materialTypeInlineError}
                  onItemSelect={(type) => handleInputChange('material_type_id', type.id)}
                  onClear={() => handleInputChange('material_type_id', 0)}
                />
              ) : (
                <Input
                  value={materialTypeDisplay}
                  readOnly
                  disabled
                  placeholder="Auto-loaded from SAP item"
                  className={
                    materialTypeInlineError
                      ? 'border-destructive focus-visible:ring-destructive'
                      : ''
                  }
                />
              )}
              {materialTypeInlineError && !showMaterialTypePicker && (
                <p className="text-sm text-destructive">{materialTypeInlineError}</p>
              )}
              {isResolvingMaterialType ? (
                <p className="text-xs text-muted-foreground">Resolving from SAP item...</p>
              ) : showMaterialTypePicker ? (
                <p className="text-xs text-muted-foreground">
                  SAP item {sapItemCode} is linked to multiple material types — select one.
                </p>
              ) : resolvedMaterialType && shouldResolveMaterialType ? (
                <p className="text-xs text-muted-foreground">
                  Auto-loaded from SAP item {sapItemCode}
                </p>
              ) : canOpenMaterialTypeLink ? (
                <p className="text-xs text-muted-foreground">
                  Click the field to create the SAP item mapping.
                </p>
              ) : null}
            </div>

            {/* Which vendor's limits these readings are judged against. Resolved
                from the PO's supplier, so it is shown rather than chosen. */}
            {(inspection?.parameter_set_label || formData.vendor_code) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>QC Parameters Applied</Label>
                  {canOverrideVendor && canEdit && (
                    <button
                      type="button"
                      className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                      onClick={() => {
                        setVendorOverrideDraft({
                          code: formData.vendor_code || inspection?.vendor_code || '',
                          name: inspection?.vendor_name || '',
                          reason: formData.vendor_override_reason || '',
                        });
                        setVendorOverrideErrors({});
                        setIsVendorOverrideDialogOpen(true);
                      }}
                    >
                      Change vendor
                    </button>
                  )}
                </div>
                <Input
                  value={
                    formData.vendor_code && formData.vendor_code !== inspection?.vendor_code
                      ? `${formData.vendor_code} (pending save)`
                      : inspection?.parameter_set_label || ''
                  }
                  readOnly
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  {inspection?.is_vendor_overridden
                    ? `Overridden — the PO supplier is ${inspection.po_vendor_code}. ${inspection.vendor_override_reason}`
                    : inspection?.vendor_code
                      ? `Matched to the PO supplier ${inspection.vendor_name || inspection.vendor_code}.`
                      : 'Default parameters — this vendor has no set of their own.'}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>
                Report No. <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.report_no || ''}
                onChange={(e) => handleInputChange('report_no', e.target.value)}
                disabled={!canEdit || isSaving}
                className={
                  apiErrors.report_no ? 'border-destructive focus-visible:ring-destructive' : ''
                }
              />
              {apiErrors.report_no && (
                <p className="text-sm text-destructive">{apiErrors.report_no}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                Internal Lot No. <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.internal_lot_no || ''}
                onChange={(e) => handleInputChange('internal_lot_no', e.target.value)}
                disabled={!canEdit || isSaving}
                className={
                  apiErrors.internal_lot_no ? 'border-destructive focus-visible:ring-destructive' : ''
                }
              />
              {apiErrors.internal_lot_no && (
                <p className="text-sm text-destructive">{apiErrors.internal_lot_no}</p>
              )}
            </div>

            {/* NOTE: Manufacturer Name field is currently in discussion and can become usable anytime in the future.
            <div className="space-y-2">
              <Label>Manufacturer Name</Label>
              <Input
                value={formData.manufacturer_name || ''}
                onChange={(e) => handleInputChange('manufacturer_name', e.target.value)}
                disabled={!canEdit || isSaving}
              />
            </div>
            */}

            <div className="space-y-2">
              <Label>Supplier Batch/Lot No.</Label>
              <Input
                value={formData.supplier_batch_lot_no || ''}
                onChange={(e) => handleInputChange('supplier_batch_lot_no', e.target.value)}
                disabled={!canEdit || isSaving}
              />
            </div>

            {/* NOTE: Purchase Order No. field is currently in discussion and can become usable anytime in the future.
            <div className="space-y-2">
              <Label>Purchase Order No.</Label>
              <Input
                value={formData.purchase_order_no || ''}
                onChange={(e) => handleInputChange('purchase_order_no', e.target.value)}
                disabled={!canEdit || isSaving}
              />
            </div>
            */}

            <div className="space-y-2 md:col-span-2 lg:col-span-3">
              <Label>Remarks</Label>
              <Textarea
                value={formData.remarks || ''}
                onChange={(e) => handleInputChange('remarks', e.target.value)}
                disabled={!canEdit || isSaving}
                rows={2}
              />
            </div>

            <div className="space-y-2 md:col-span-2 lg:col-span-3 print-hide">
              <Label htmlFor="qc_attachments">QC Attachments</Label>
              <Input
                ref={qcAttachmentInputRef}
                id="qc_attachments"
                type="file"
                multiple
                onChange={(event) => {
                  setQcAttachmentFiles(Array.from(event.target.files ?? []));
                }}
                disabled={!canEdit || isSaving}
              />
              {qcAttachmentFiles.length > 0 && (
                <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                  {qcAttachmentFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-md bg-background px-3 py-2 text-sm"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate font-medium">{file.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => removeSelectedQcAttachment(index)}
                        disabled={isSaving}
                        aria-label={`Remove ${file.name}`}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {inspection?.qc_attachments?.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Paperclip className="h-5 w-5" />
              QC Attachments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {inspection.qc_attachments.map((attachment) => {
                const fileName = getAttachmentFileName(attachment.file, attachment.original_name);
                return (
                  <a
                    key={attachment.id}
                    href={attachment.file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block border rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                  >
                    {isImageAttachment(attachment.file) ? (
                      <>
                        <img
                          src={attachment.file}
                          alt={fileName}
                          className="w-full max-h-80 object-contain bg-muted/20 print-attachment-img"
                        />
                        <div className="flex items-center justify-between gap-3 border-t px-3 py-2 text-sm">
                          <span className="truncate font-medium">{fileName}</span>
                          <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-48 flex flex-col items-center justify-center gap-2 bg-muted/30 text-muted-foreground px-4 text-center">
                        <FileText className="h-8 w-8" />
                        <span className="max-w-full truncate text-sm font-medium text-foreground">
                          {fileName}
                        </span>
                        <ExternalLink className="h-3 w-3" />
                      </div>
                    )}
                    {(attachment.uploaded_at || attachment.document_code) && (
                      <div className="border-t px-3 py-2 text-xs text-muted-foreground space-y-1">
                        {attachment.uploaded_at && (
                          <div>Uploaded {new Date(attachment.uploaded_at).toLocaleString()}</div>
                        )}
                        <DocumentCodeBadge
                          inline
                          document_code={attachment.document_code}
                          document_revision={attachment.document_revision}
                          document_issue_date={attachment.document_issue_date}
                        />
                      </div>
                    )}
                  </a>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Certificate of Analysis (COA) - separate page when printing */}
      {arrivalSlip &&
        arrivalSlip.attachments?.some((a) => a.attachment_type === 'CERTIFICATE_OF_ANALYSIS') && (
          <Card className="print-page-break">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                Certificate of Analysis (COA)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {arrivalSlip.attachments
                  .filter((a) => a.attachment_type === 'CERTIFICATE_OF_ANALYSIS')
                  .map((attachment) => {
                    const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(
                      attachment.file,
                    );
                    return (
                      <a
                        key={attachment.id}
                        href={attachment.file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block border rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                      >
                        {isImage ? (
                          <img
                            src={attachment.file}
                            alt="Certificate of Analysis"
                            className="w-full print-attachment-img"
                          />
                        ) : (
                          <div className="w-full h-48 flex flex-col items-center justify-center gap-2 bg-muted/30 text-muted-foreground">
                            <FileText className="h-8 w-8" />
                            <span className="text-xs">View File</span>
                            <ExternalLink className="h-3 w-3" />
                          </div>
                        )}
                      </a>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Certificate of Quantity (COQ) - separate page when printing */}
      {arrivalSlip &&
        arrivalSlip.attachments?.some((a) => a.attachment_type === 'CERTIFICATE_OF_QUANTITY') && (
          <Card className="print-page-break">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                Certificate of Quantity (COQ)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {arrivalSlip.attachments
                  .filter((a) => a.attachment_type === 'CERTIFICATE_OF_QUANTITY')
                  .map((attachment) => {
                    const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(
                      attachment.file,
                    );
                    return (
                      <a
                        key={attachment.id}
                        href={attachment.file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block border rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                      >
                        {isImage ? (
                          <img
                            src={attachment.file}
                            alt="Certificate of Quantity"
                            className="w-full print-attachment-img"
                          />
                        ) : (
                          <div className="w-full h-48 flex flex-col items-center justify-center gap-2 bg-muted/30 text-muted-foreground">
                            <FileText className="h-8 w-8" />
                            <span className="text-xs">View File</span>
                            <ExternalLink className="h-3 w-3" />
                          </div>
                        )}
                      </a>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Parameter Results */}
      {((inspection?.parameter_results?.length ?? 0) > 0 || qcParameters.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>QC Parameters</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Mobile: stacked card layout */}
            <div className="md:hidden space-y-4">
              {(isEditing ? qcParameters : inspection?.parameter_results || qcParameters).map(
                (param) => {
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
                            disabled={
                              !canEdit ||
                              isSaving ||
                              paramType === 'BOOLEAN' ||
                              paramType === 'RANGE'
                            }
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
                            type={
                              paramType === 'NUMERIC' || paramType === 'RANGE' ? 'number' : 'text'
                            }
                            step={
                              paramType === 'NUMERIC' || paramType === 'RANGE' ? 'any' : undefined
                            }
                            value={currentValue.result_value}
                            onChange={(e) =>
                              handleResultValueChange(
                                parameterId,
                                e.target.value,
                                paramType,
                                minValue,
                                maxValue,
                              )
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
                },
              )}
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
                  {parametersToShow.map((param) => {
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
                              type={
                                paramType === 'NUMERIC' || paramType === 'RANGE' ? 'number' : 'text'
                              }
                              step={
                                paramType === 'NUMERIC' || paramType === 'RANGE' ? 'any' : undefined
                              }
                              value={currentValue.result_value}
                              onChange={(e) =>
                                handleResultValueChange(
                                  parameterId,
                                  e.target.value,
                                  paramType,
                                  minValue,
                                  maxValue,
                                )
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
                            disabled={
                              !canEdit ||
                              isSaving ||
                              paramType === 'BOOLEAN' ||
                              paramType === 'RANGE'
                            }
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

      {/* Approval Section — hidden while editing so the approver sees Save/Cancel instead */}
      {isApprover && !isEditing && (
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

            {canApproveChemist && (
              <div className="space-y-2">
                <Label>Chemist Decision</Label>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => handleApprovalDecision('chemist', 'APPROVED')}
                    disabled={isSaving}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approved
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleApprovalDecision('chemist', 'HOLD')}
                    disabled={isSaving}
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Hold
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleApprovalDecision('chemist', 'REJECTED')}
                    disabled={isSaving}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </div>
            )}

            {canApproveQAM && (
              <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Label>Manager Decision</Label>
                  <DecisionPill label="Chemist" decision={inspection?.chemist_decision} />
                  {inspection?.manager_decision?.decision && (
                    <DecisionPill label="Current" decision={inspection?.manager_decision} />
                  )}
                </div>
                {inspection?.manager_decision?.decision && (
                  <p className="text-sm text-muted-foreground">
                    You already recorded a decision. Selecting again updates it — the
                    previous decision is kept in the history below.
                  </p>
                )}
                {(inspection?.chemist_decision?.by ||
                  inspection?.chemist_decision?.remarks ||
                  inspection?.chemist_decision?.decided_at) && (
                  <p className="text-sm text-muted-foreground">
                    {inspection.chemist_decision.by && (
                      <span>By {inspection.chemist_decision.by}</span>
                    )}
                    {inspection.chemist_decision.decided_at && (
                      <span>
                        {inspection.chemist_decision.by ? ' · ' : ''}
                        {new Date(inspection.chemist_decision.decided_at).toLocaleString()}
                      </span>
                    )}
                    {inspection.chemist_decision.remarks && (
                      <span>
                        {inspection.chemist_decision.by || inspection.chemist_decision.decided_at
                          ? ' · '
                          : ''}
                        {inspection.chemist_decision.remarks}
                      </span>
                    )}
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => handleApprovalDecision('manager', 'APPROVED')}
                    disabled={isSaving}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approved
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleApprovalDecision('manager', 'HOLD')}
                    disabled={isSaving}
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Hold
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleApprovalDecision('manager', 'REJECTED')}
                    disabled={isSaving}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}


      {/* Send Back to Gate */}
      {showSendBack && (
        <Card className="border-orange-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
              <Undo2 className="h-5 w-5" />
              Send Back to Gate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Send this arrival slip back to the gate person for correction. They will be notified
              and can edit and resubmit the slip.
            </p>
            <div className="space-y-2">
              <Label>Remarks (optional)</Label>
              <Textarea
                value={sendBackRemarks}
                onChange={(e) => setSendBackRemarks(e.target.value)}
                placeholder="Explain what needs to be corrected..."
                rows={3}
              />
            </div>
            <Button
              variant="outline"
              className="border-orange-500 text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950"
              onClick={handleSendBack}
              disabled={isSaving}
            >
              <Undo2 className="h-4 w-4 mr-2" />
              {sendBackArrivalSlip.isPending ? 'Sending Back...' : 'Send Back to Gate'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Manager Decision Audit Trail */}
      {inspection?.manager_decision_logs && inspection.manager_decision_logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" />
              Manager Decision History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {inspection.manager_decision_logs.map((log, idx) => (
                <li
                  key={`${log.decided_at ?? 'log'}-${idx}`}
                  className="space-y-1 border-l-2 border-border pl-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <DecisionPill label="Decision" decision={log} />
                    {idx === 0 && (
                      <span className="text-xs font-medium text-emerald-600">Current</span>
                    )}
                  </div>
                  {(log.by || log.decided_at) && (
                    <p className="text-sm text-muted-foreground">
                      {log.by && <span>By {log.by}</span>}
                      {log.decided_at && (
                        <span>
                          {log.by ? ' · ' : ''}
                          {new Date(log.decided_at).toLocaleString()}
                        </span>
                      )}
                    </p>
                  )}
                  {log.remarks && <p className="text-sm">{log.remarks}</p>}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Record Timestamps */}
      {inspection && (
        <RecordTimestamps createdAt={inspection.created_at} updatedAt={inspection.updated_at} />
      )}
      {!inspection && arrivalSlip && (
        <RecordTimestamps createdAt={arrivalSlip.created_at} updatedAt={arrivalSlip.updated_at} />
      )}

      {/* Footer Actions */}
      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:justify-between print-hide">
        <Button variant="outline" onClick={() => navigate('/qc/pending')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex gap-4">
          {inspection && (
            <Button variant="outline" onClick={openPrintOptions}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          )}
          {canUpdate && (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Update
            </Button>
          )}
          {isApprover && !isEditing && !isLocked && (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {isApprover && isEditing && (
            <Button variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
              <XCircle className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          )}
          {canEdit && (
            <Button
              onClick={handleSave}
              disabled={isSaving || (shouldResolveMaterialType && isResolvingMaterialType)}
            >
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

      {printOptionsModal}
      {printPortal}
    </div>
  );
}
