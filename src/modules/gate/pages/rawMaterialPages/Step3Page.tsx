import { useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Check,
  ChevronDown,
  Loader2,
  Package,
  Plus,
  Trash2,
} from 'lucide-react';
import type { PointerEvent } from 'react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { RecordTimestamps } from '@/shared/components';
import {
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
import { useDebounce } from '@/shared/hooks';
import { cn } from '@/shared/utils';
import {
  getErrorMessage,
  getServerErrorMessage,
  isApiError,
  isNotFoundError as checkNotFoundError,
  isServerError as checkServerError,
} from '@/shared/utils';

import type { CreatePOReceiptRequest, PurchaseOrder, Vendor } from '../../api/po/po.api';
import { useOpenPOs } from '../../api/po/po.queries';
import {
  useCreatePOReceipt,
  usePOReceipts,
  useReplacePOReceipt,
  useUpdatePOReceipt,
} from '../../api/po/poReceipt.queries';
import { FillDataAlert, StepFooter, StepHeader, StepLoadingSpinner, VendorSelect } from '../../components';
import { WIZARD_CONFIG } from '../../constants';
import { useEntryId, useEntryStepTracker } from '../../hooks';

// SAP refuses a receipt above 110% of the PO line's OPEN quantity — it checks
// PDN1."Quantity" > PDN1."BaseOpnQty" * 1.10 (error 200017), not 110% of the
// quantity originally ordered. This must stay in step with
// raw_material_gatein/services/validations.py on the server.
const OVER_RECEIPT_TOLERANCE = 1.1;

/**
 * Most that may be received against a PO line — null when there is no cap to show,
 * either because this company does not enforce the rule (the server says so per PO)
 * or because the line's open qty has not been read yet.
 */
const overReceiptCeiling = (openQty: number | null, enforced: boolean): number | null =>
  !enforced || openQty === null ? null : openQty * OVER_RECEIPT_TOLERANCE;

interface POItemFormData {
  line_num: number; // SAP PO LineNum (POR1.LineNum) — unique identifier for this row
  po_item_code: string;
  item_name: string;
  ordered_qty: number;
  received_qty: number; // Previously received from other gate entries
  received_qty_now: number; // What user is entering now
  // SAP's POR1.OpenQty for this line — the basis for the over-receipt ceiling.
  // null when it has not been read yet (edit mode, before the PO is re-fetched);
  // the client-side cap is skipped then and the server stays the authority.
  remaining_qty_initial: number | null;
  remaining_qty: number; // Auto-calculated: remaining_qty_initial - received_qty_now
  uom: string;
  rate: number;
}

interface POFormData {
  id: string; // Unique ID for this PO form
  // From the PO lookup. Defaults false so a stale client never blocks a receipt the
  // server would accept.
  overReceiptEnforced: boolean;
  receiptId?: number;
  isEditable?: boolean;
  lockReason?: string | null;
  supplierName: string;
  supplierCode: string;
  poNumber: string;
  items: POItemFormData[];
  // Set when correcting a wrong PO that QC sent back: the form is unlocked for a
  // fresh PO selection and saved via the audited replace endpoint with a reason.
  isReplacing?: boolean;
  replaceReason?: string;
  originalSupplierCode?: string;
}

export default function Step3Page() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { entryId, entryIdNumber, isEditMode } = useEntryId();
  useEntryStepTracker();
  const currentStep = WIZARD_CONFIG.STEPS.PO_RECEIPT;

  // Stable ID generation using useId
  const baseId = useId();
  const poFormCounterRef = useRef(1);

  // Fetch existing PO receipts in edit mode
  const {
    data: existingPOReceipts = [],
    isLoading: isLoadingPOReceipts,
    error: poReceiptsError,
  } = usePOReceipts(entryIdNumber);

  // State to track if we should behave like create mode (when Fill Data is clicked)
  const [fillDataMode, setFillDataMode] = useState(false);
  // State to keep button disabled after API success until navigation completes
  const [isNavigating, setIsNavigating] = useState(false);
  const effectiveEditMode = isEditMode && !fillDataMode;
  const initialFormPayloadsRef = useRef<Record<string, string>>({});

  // State for multiple PO forms - start with one empty form
  // Note: We use baseId with initial counter of 1 for stable initial ID
  const [poForms, setPoForms] = useState<POFormData[]>([
    {
      id: 'po-initial-1',
      supplierName: '',
      supplierCode: '',
      overReceiptEnforced: false,
      poNumber: '',
      items: [],
    },
  ]);

  // Track which PO dropdown is open and its search term
  const [openPODropdown, setOpenPODropdown] = useState<string | null>(null);
  const [poSearchTerms, setPOSearchTerms] = useState<Record<string, string>>({});

  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});

  // Scroll to first error when errors occur
  useScrollToError(apiErrors);

  // Track which PO forms have fill data mode enabled (for handling API errors)
  const [fillDataModeForPO, setFillDataModeForPO] = useState<Record<string, boolean>>({});

  const buildPOReceiptPayload = (form: POFormData): CreatePOReceiptRequest => ({
    po_number: form.poNumber,
    supplier_code: form.supplierCode,
    supplier_name: form.supplierName,
    items: form.items
      .filter((item) => item.received_qty_now > 0)
      .map((item) => ({
        line_num: item.line_num,
        po_item_code: item.po_item_code,
        item_name: item.item_name,
        ordered_qty: item.ordered_qty,
        received_qty: item.received_qty_now,
        uom: item.uom,
      })),
  });

  const getPayloadSnapshot = (form: POFormData) => JSON.stringify(buildPOReceiptPayload(form));

  const getPOFormLockReason = (poFormId: string) =>
    poForms.find((form) => form.id === poFormId)?.lockReason ||
    'This PO cannot be edited after its arrival slip is submitted to QC.';

  const isPOFormLocked = (poFormId: string) => {
    const form = poForms.find((item) => item.id === poFormId);
    return effectiveEditMode && Boolean(form?.receiptId) && form?.isEditable === false;
  };

  const notifyLockedPO = (poFormId: string) => {
    toast.warning(getPOFormLockReason(poFormId));
  };

  const handleSupplierNameChange = (poFormId: string, value: string) => {
    if (isPOFormLocked(poFormId)) {
      notifyLockedPO(poFormId);
      return;
    }
    setPoForms((prev) =>
      prev.map((form) => (form.id === poFormId ? { ...form, supplierName: value } : form)),
    );
    // Clear errors
    if (apiErrors[`${poFormId}_supplierName`]) {
      setApiErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`${poFormId}_supplierName`];
        return newErrors;
      });
    }
  };

  const handleSupplierCodeChange = (poFormId: string, value: string) => {
    if (isPOFormLocked(poFormId)) {
      notifyLockedPO(poFormId);
      return;
    }
    setPoForms((prev) =>
      prev.map((form) => (form.id === poFormId ? { ...form, supplierCode: value } : form)),
    );
    // Clear errors
    if (apiErrors[`${poFormId}_supplierCode`]) {
      setApiErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`${poFormId}_supplierCode`];
        return newErrors;
      });
    }
  };

  const handleVendorSelect = (poFormId: string, vendor: Vendor | null) => {
    if (isPOFormLocked(poFormId)) {
      notifyLockedPO(poFormId);
      return;
    }
    setPoForms((prev) =>
      prev.map((form) =>
        form.id === poFormId
          ? {
              ...form,
              supplierCode: vendor?.vendor_code || '',
              supplierName: vendor?.vendor_name || '',
              // Clear PO selection when vendor changes
              poNumber: '',
              items: [],
            }
          : form,
      ),
    );
    // Clear errors
    const errorKeys = [
      `${poFormId}_supplierCode`,
      `${poFormId}_supplierName`,
      `${poFormId}_poNumber`,
    ];
    setApiErrors((prev) => {
      const newErrors = { ...prev };
      errorKeys.forEach((key) => delete newErrors[key]);
      return newErrors;
    });
  };

  const handlePOFocus = (poFormId: string) => {
    if (isPOFormLocked(poFormId)) {
      notifyLockedPO(poFormId);
      return;
    }
    const form = poForms.find((f) => f.id === poFormId);
    if (form?.supplierCode) {
      setOpenPODropdown(poFormId);
    }
  };

  const handlePOSelect = (poFormId: string, po: PurchaseOrder) => {
    if (isPOFormLocked(poFormId)) {
      notifyLockedPO(poFormId);
      return;
    }

    setPoForms((prev) =>
      prev.map((form) => {
        if (form.id === poFormId) {
          return {
            ...form,
            poNumber: po.po_number,
            supplierName: po.supplier_name,
            supplierCode: po.supplier_code,
            overReceiptEnforced: po.over_receipt_enforced ?? false,
            items: po.items.map((item) => {
              const orderedQty = parseFloat(item.ordered_qty);
              const receivedQty = parseFloat(item.received_qty || '0'); // Previously received
              const remainingQtyFromPO = parseFloat(item.remaining_qty); // Remaining from PO
              return {
                line_num: item.line_num,
                po_item_code: item.po_item_code,
                item_name: item.item_name,
                ordered_qty: orderedQty,
                received_qty: receivedQty, // Previously received
                received_qty_now: 0, // User will enter this
                remaining_qty_initial: remainingQtyFromPO, // Store initial remaining
                remaining_qty: remainingQtyFromPO, // Will be recalculated when user enters received_qty_now
                uom: item.uom,
                rate: parseFloat(item.rate || '0'),
              };
            }),
          };
        }
        return form;
      }),
    );
    setOpenPODropdown(null);
    setPOSearchTerms((prev) => ({ ...prev, [poFormId]: '' }));
  };

  // Backfill SAP's open quantities onto an edit-mode form once its PO has been
  // re-read, so the ceiling stops being unknown. Only ever fills gaps — a row that
  // already has an open qty is left alone, so this cannot fight the fresh path.
  const handleOpenQtysLoaded = useCallback((poFormId: string, po: PurchaseOrder | null) => {
    const openByLine = new Map(
      (po?.items ?? []).map((item) => [
        item.line_num,
        {
          open: parseFloat(item.remaining_qty) || 0,
          received: parseFloat(item.received_qty || '0') || 0,
        },
      ]),
    );

    setPoForms((prev) =>
      prev.map((form) => {
        if (form.id !== poFormId) return form;
        return {
          ...form,
          overReceiptEnforced: po?.over_receipt_enforced ?? false,
          items: form.items.map((item) => {
            if (item.remaining_qty_initial !== null) return item;
            const fromPO = openByLine.get(item.line_num);
            // A line that has dropped off the open PO has nothing left open.
            const open = fromPO?.open ?? 0;
            return {
              ...item,
              received_qty: fromPO?.received ?? item.received_qty,
              remaining_qty_initial: open,
              remaining_qty: Math.max(0, open - item.received_qty_now),
            };
          }),
        };
      }),
    );
  }, []);

  const handleReceivedQtyChange = (poFormId: string, lineNum: number, value: string) => {
    if (isPOFormLocked(poFormId)) {
      notifyLockedPO(poFormId);
      return;
    }

    const receivedQtyNow = parseFloat(value) || 0;
    setPoForms((prev) =>
      prev.map((form) => {
        if (form.id === poFormId) {
          return {
            ...form,
            items: form.items.map((item) => {
              if (item.line_num === lineNum) {
                // Calculate remaining: remaining_qty_initial - received_qty_now
                const newRemainingQty =
                  item.remaining_qty_initial === null
                    ? item.remaining_qty
                    : Math.max(0, item.remaining_qty_initial - receivedQtyNow);
                return {
                  ...item,
                  received_qty_now: receivedQtyNow,
                  remaining_qty: newRemainingQty,
                };
              }
              return item;
            }),
          };
        }
        return form;
      }),
    );
    // Clear error for this field and general error if user starts entering value
    if (receivedQtyNow > 0) {
      setApiErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`${poFormId}_item_${lineNum}`];
        delete newErrors[`${poFormId}_received`];
        return newErrors;
      });
    } else if (apiErrors[`${poFormId}_item_${lineNum}`]) {
      setApiErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`${poFormId}_item_${lineNum}`];
        return newErrors;
      });
    }
  };

  const handleAddPO = () => {
    // Generate unique ID using counter
    poFormCounterRef.current += 1;
    const newId = `${baseId}-po-${poFormCounterRef.current}`;

    setPoForms((prev) => [
      ...prev,
      {
        id: newId,
        supplierName: '',
        supplierCode: '',
        overReceiptEnforced: false,
        poNumber: '',
        items: [],
      },
    ]);

    // Clear any errors when adding new PO
    setApiErrors({});
  };

  const handleRemovePO = (poFormId: string) => {
    const form = poForms.find((item) => item.id === poFormId);
    if (form?.receiptId) {
      toast.info('Existing PO receipts cannot be removed here. Add a new PO for extra material.');
      return;
    }
    if (poForms.length === 1) return; // Don't allow removing the last one

    setPoForms((prev) => prev.filter((form) => form.id !== poFormId));

    // Clean up fill data mode for removed PO
    if (fillDataModeForPO[poFormId]) {
      setFillDataModeForPO((prev) => {
        const newState = { ...prev };
        delete newState[poFormId];
        return newState;
      });
    }

    // Clean up PO search terms for removed PO
    setPOSearchTerms((prev) => {
      const newState = { ...prev };
      delete newState[poFormId];
      return newState;
    });
  };

  const handleFillData = () => {
    setFillDataMode(true);
    poFormCounterRef.current += 1;
    setPoForms([
      {
        id: `${baseId}-po-${poFormCounterRef.current}`,
        supplierName: '',
        supplierCode: '',
        overReceiptEnforced: false,
        poNumber: '',
        items: [],
      },
    ]);
    setApiErrors({});
  };

  const handleFillDataForPO = (poFormId: string) => {
    setFillDataModeForPO((prev) => ({ ...prev, [poFormId]: true }));
    // Clear the PO form data to allow fresh entry
    setPoForms((prev) =>
      prev.map((form) =>
        form.id === poFormId
          ? {
              ...form,
              receiptId: undefined,
              isEditable: true,
              lockReason: null,
              supplierName: '',
              supplierCode: '',
              overReceiptEnforced: false,
              poNumber: '',
              items: [],
            }
          : form,
      ),
    );
    setApiErrors({});
  };

  // Load existing PO receipts when in edit mode
  useEffect(() => {
    if (existingPOReceipts.length > 0) {
      const forms: POFormData[] = existingPOReceipts.map((receipt, index) => ({
        id: `po-${receipt.po_number}-${index}`,
        receiptId: receipt.id,
        isEditable: receipt.is_editable ?? true,
        lockReason: receipt.lock_reason,
        supplierName: receipt.supplier_name,
        supplierCode: receipt.supplier_code,
        overReceiptEnforced: false, // Backfilled with the open quantities below
        poNumber: receipt.po_number,
        items: receipt.items.map((item) => {
          // The saved receipt carries no open quantity, and standing in the ordered
          // quantity for it (as this used to) hands the operator a ceiling of
          // ordered x 1.1 on a line that may have almost nothing left open. Leave it
          // unknown; POCard re-fetches the PO and backfills the real OpenQty.
          const receivedQtyNow = item.received_qty;
          return {
            line_num: item.sap_line_num,
            po_item_code: item.po_item_code,
            item_name: item.item_name,
            ordered_qty: item.ordered_qty,
            received_qty: 0, // Backfilled from the PO alongside the open qty
            received_qty_now: receivedQtyNow, // What was received in this entry
            remaining_qty_initial: null, // Unknown until the PO is re-read
            remaining_qty: 0,
            uom: item.uom,
            rate: item.unit_price || 0,
          };
        }),
      }));
      initialFormPayloadsRef.current = Object.fromEntries(
        forms.map((form) => [form.id, getPayloadSnapshot(form)]),
      );
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing form state with fetched data is a valid pattern
      setPoForms(forms);
    }
  }, [existingPOReceipts]);

  const handlePrevious = () => {
    if (isEditMode && entryId) {
      navigate(`/gate/raw-materials/edit/${entryId}/step1`);
    } else {
      navigate(`/gate/raw-materials/new`);
    }
  };

  const handleCancel = () => {
    queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
    navigate('/gate/raw-materials');
  };

  const createPOReceipt = useCreatePOReceipt(entryIdNumber || 0);
  const updatePOReceipt = useUpdatePOReceipt(entryIdNumber || 0);
  const replacePOReceipt = useReplacePOReceipt(entryIdNumber || 0);

  // Replace-PO (wrong PO sent back by QC): which form is being replaced + reason.
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);
  const [replaceReason, setReplaceReason] = useState('');
  const [replaceError, setReplaceError] = useState('');

  const handleStartReplace = (formId: string) => {
    setReplaceTargetId(formId);
    setReplaceReason('');
    setReplaceError('');
  };

  const handleConfirmReplace = () => {
    const reason = replaceReason.trim();
    if (!reason) {
      setReplaceError('Please enter why this PO is being replaced.');
      return;
    }
    setPoForms((prev) =>
      prev.map((form) =>
        form.id === replaceTargetId
          ? {
              ...form,
              isEditable: true,
              isReplacing: true,
              replaceReason: reason,
              lockReason: null,
              originalSupplierCode: form.supplierCode,
              // Clear the wrong PO so the user re-selects the correct one.
              poNumber: '',
              items: [],
            }
          : form,
      ),
    );
    setReplaceTargetId(null);
    setReplaceReason('');
    setReplaceError('');
    toast.info('Select the correct PO, then save to replace it.');
  };

  const handleNext = async () => {
    if (!entryId) {
      setApiErrors({ general: 'Entry ID is missing. Please go back to step 1.' });
      return;
    }

    const formsToSave = poForms.filter((form) => {
      if (form.receiptId && form.isEditable === false) return false;
      if (!form.receiptId) return true;
      return initialFormPayloadsRef.current[form.id] !== getPayloadSnapshot(form);
    });

    if (effectiveEditMode && formsToSave.length === 0) {
      navigate(`/gate/raw-materials/edit/${entryId}/step3`);
      return;
    }

    // Validation
    for (const form of formsToSave) {
      if (!form.supplierName.trim()) {
        setApiErrors({ [`${form.id}_supplierName`]: 'Please enter supplier name' });
        return;
      }
      if (!form.supplierCode.trim()) {
        setApiErrors({ [`${form.id}_supplierCode`]: 'Please enter supplier code' });
        return;
      }
      if (!form.poNumber) {
        setApiErrors({ [`${form.id}_poNumber`]: 'Please select a PO' });
        return;
      }
      if (form.items.length === 0) {
        setApiErrors({ [`${form.id}_items`]: 'Please select a PO to load items' });
        return;
      }
      // Check if at least one item has received quantity > 0
      const hasReceivedQty = form.items.some((item) => item.received_qty_now > 0);
      if (!hasReceivedQty) {
        const itemErrors: Record<string, string> = {
          [`${form.id}_received`]: 'Please enter received quantities for at least one item',
        };
        form.items.forEach((item) => {
          if (!item.received_qty_now || item.received_qty_now <= 0) {
            itemErrors[`${form.id}_item_${item.line_num}`] = 'Please enter received quantity';
          }
        });
        setApiErrors(itemErrors);
        return;
      }
      // Received quantity must stay within 110% of what is still OPEN on the PO
      // line. Rows whose open qty has not been read yet are left to the server.
      const overReceivedItems = form.items.filter((item) => {
        const ceiling = overReceiptCeiling(
          item.remaining_qty_initial,
          form.overReceiptEnforced,
        );
        return ceiling !== null && item.received_qty_now > ceiling;
      });
      if (overReceivedItems.length > 0) {
        const itemErrors: Record<string, string> = {};
        overReceivedItems.forEach((item) => {
          const ceiling =
            overReceiptCeiling(item.remaining_qty_initial, form.overReceiptEnforced) ?? 0;
          itemErrors[`${form.id}_item_${item.line_num}`] =
            `Only ${(item.remaining_qty_initial ?? 0).toFixed(3)} ${item.uom} is open on this ` +
            `PO line, so SAP will accept at most ${ceiling.toFixed(3)} ${item.uom} ` +
            `(open + 10% tolerance)`;
        });
        setApiErrors(itemErrors);
        return;
      }
    }

    setApiErrors({});

    try {
      // Submit all PO receipts
      for (const poForm of formsToSave) {
        const payload = buildPOReceiptPayload(poForm);
        if (poForm.receiptId && poForm.isReplacing) {
          const result = await replacePOReceipt.mutateAsync({
            poReceiptId: poForm.receiptId,
            data: { ...payload, reason: poForm.replaceReason || '' },
          });
          if (result.supplier_changed) {
            toast.warning('Heads up: the corrected PO is from a different supplier.');
          }
        } else if (poForm.receiptId) {
          await updatePOReceipt.mutateAsync({
            poReceiptId: poForm.receiptId,
            data: payload,
          });
        } else {
          await createPOReceipt.mutateAsync(payload);
        }
      }

      // Navigate to step 4
      if (formsToSave.length > 0) {
        toast.success('Purchase order details saved');
      }
      setIsNavigating(true);
      if (isEditMode) {
        navigate(`/gate/raw-materials/edit/${entryId}/step3`);
      } else {
        navigate(`/gate/raw-materials/new/step3?entryId=${entryId}`);
      }
    } catch (error) {
      if (isApiError(error) && error.errors) {
        const fieldErrors: Record<string, string> = {};
        Object.entries(error.errors).forEach(([field, messages]) => {
          if (Array.isArray(messages) && messages.length > 0) {
            fieldErrors[field] = messages[0];
          }
        });
        setApiErrors(fieldErrors);
      } else {
        setApiErrors({ general: isApiError(error) ? error.message : 'Failed to save PO receipts' });
      }
    }
  };

  // Check if error is "not found" error
  const isNotFoundError = checkNotFoundError(poReceiptsError);

  // Check if error is a server error (5xx)
  const hasServerError = checkServerError(poReceiptsError);

  // Check if PO receipts data exists
  const hasPOReceiptsData = existingPOReceipts.length > 0;
  // Check if there's no data (empty array or not found error)
  const hasNoPOReceiptsData =
    effectiveEditMode && !isLoadingPOReceipts && (!hasPOReceiptsData || isNotFoundError);

  // Page-level read-only applies only when edit mode has no PO receipt data to load.
  const isPageReadOnly = effectiveEditMode && hasNoPOReceiptsData && !fillDataMode;
  const hasWritableForms = poForms.some(
    (form) => !isPageReadOnly && (!form.receiptId || form.isEditable !== false),
  );

  if (effectiveEditMode && isLoadingPOReceipts) {
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
              (poReceiptsError && !isNotFoundError
                ? getErrorMessage(poReceiptsError, 'Failed to load PO receipts')
                : null)
        }
      />

      {/* Show Fill Data button when no PO receipts data exists */}
      {hasNoPOReceiptsData && !fillDataMode && !hasServerError && (
        <FillDataAlert
          message={
            isNotFoundError
              ? getErrorMessage(poReceiptsError, 'PO receipts not found')
              : 'No PO receipts found for this entry.'
          }
          onFillData={handleFillData}
        />
      )}

      <div className="space-y-6">
        {/* PO Forms */}
        {poForms.map((poForm) => (
          <POCard
            key={poForm.id}
            poForm={poForm}
            isReadOnly={
              isPageReadOnly || (Boolean(poForm.receiptId) && poForm.isEditable === false)
            }
            fillDataMode={fillDataModeForPO[poForm.id] || false}
            onSupplierNameChange={(value) => handleSupplierNameChange(poForm.id, value)}
            onSupplierCodeChange={(value) => handleSupplierCodeChange(poForm.id, value)}
            onVendorSelect={(vendor) => handleVendorSelect(poForm.id, vendor)}
            onPOFocus={() => handlePOFocus(poForm.id)}
            onPOSelect={(po) => handlePOSelect(poForm.id, po)}
            onReceivedQtyChange={(lineNum, value) =>
              handleReceivedQtyChange(poForm.id, lineNum, value)
            }
            onOpenQtysLoaded={(po) => handleOpenQtysLoaded(poForm.id, po)}
            onRemove={() => handleRemovePO(poForm.id)}
            canRemove={poForms.length > 1 && !poForm.receiptId}
            apiErrors={apiErrors}
            openPODropdown={openPODropdown === poForm.id}
            onClosePODropdown={() => setOpenPODropdown(null)}
            poSearchTerm={poSearchTerms[poForm.id] || ''}
            onPOSearchChange={(value) =>
              setPOSearchTerms((prev) => ({ ...prev, [poForm.id]: value }))
            }
            onFillData={() => handleFillDataForPO(poForm.id)}
            lockReason={poForm.lockReason}
            onLockedAttempt={() => notifyLockedPO(poForm.id)}
            onReplace={() => handleStartReplace(poForm.id)}
          />
        ))}

        {/* Add New PO Button */}
        {(!hasNoPOReceiptsData || fillDataMode) && !hasServerError && (
          <div className="flex justify-center">
            <Button type="button" variant="outline" onClick={handleAddPO}>
              <Plus className="h-4 w-4 mr-2" />
              Add New PO
            </Button>
          </div>
        )}
      </div>

      {/* Record Timestamps */}
      {isEditMode && existingPOReceipts.length > 0 && existingPOReceipts[0].created_at && (
        <RecordTimestamps
          createdAt={existingPOReceipts[0].created_at}
          updatedAt={existingPOReceipts[0].updated_at}
        />
      )}

      <StepFooter
        onPrevious={handlePrevious}
        onCancel={handleCancel}
        onNext={handleNext}
        isSaving={createPOReceipt.isPending || updatePOReceipt.isPending || isNavigating}
        isEditMode={effectiveEditMode}
        isUpdateMode={hasWritableForms}
        nextLabel={
          effectiveEditMode && !hasWritableForms && !fillDataMode ? 'Next ->' : undefined
        }
      />
      <Dialog
        open={replaceTargetId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setReplaceTargetId(null);
            setReplaceError('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace Purchase Order</DialogTitle>
            <DialogDescription>
              Use this only if the wrong PO was entered. The current PO and its items will be
              replaced, and you&apos;ll select the correct PO next. If the correct PO is from a
              different supplier, the supplier on this gate entry will change.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="replace-po-reason">Reason</Label>
            <Textarea
              id="replace-po-reason"
              value={replaceReason}
              onChange={(event) => {
                setReplaceReason(event.target.value);
                setReplaceError('');
              }}
              placeholder="e.g. Wrong PO number entered at gate"
            />
            {replaceError ? <p className="text-sm text-destructive">{replaceError}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReplaceTargetId(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleConfirmReplace}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface POCardProps {
  poForm: POFormData;
  isReadOnly: boolean;
  fillDataMode: boolean;
  onSupplierNameChange: (value: string) => void;
  onSupplierCodeChange: (value: string) => void;
  onVendorSelect: (vendor: Vendor | null) => void;
  onPOFocus: () => void;
  onPOSelect: (po: PurchaseOrder) => void;
  onReceivedQtyChange: (lineNum: number, value: string) => void;
  onOpenQtysLoaded: (po: PurchaseOrder | null) => void;
  onRemove: () => void;
  canRemove: boolean;
  apiErrors: Record<string, string>;
  openPODropdown: boolean;
  onClosePODropdown: () => void;
  poSearchTerm: string;
  onPOSearchChange: (value: string) => void;
  onFillData: () => void;
  lockReason?: string | null;
  onLockedAttempt: () => void;
  onReplace: () => void;
}

function POCard({
  poForm,
  isReadOnly,
  fillDataMode,
  onVendorSelect,
  onPOFocus,
  onPOSelect,
  onReceivedQtyChange,
  onOpenQtysLoaded,
  onRemove,
  canRemove,
  apiErrors,
  openPODropdown,
  onClosePODropdown,
  poSearchTerm,
  onPOSearchChange,
  onFillData,
  lockReason,
  onLockedAttempt,
  onReplace,
}: POCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedPOSearch = useDebounce(poSearchTerm, 100);

  // A saved receipt stores no open quantity, so an edit-mode card has to re-read
  // the PO before it can show a ceiling — without this the row would be capped by
  // the server alone, with nothing on screen to warn the operator first.
  const needsOpenQtys =
    !!poForm.poNumber &&
    !!poForm.supplierCode &&
    poForm.items.some((item) => item.remaining_qty_initial === null);

  // Fetch POs when the dropdown is opened, or to backfill missing open quantities
  const shouldFetchPOs = (openPODropdown || needsOpenQtys) && !!poForm.supplierCode;
  const {
    data: purchaseOrders = [],
    isLoading: isLoadingPOs,
    error: poError,
  } = useOpenPOs(poForm.supplierCode || undefined, shouldFetchPOs);

  useEffect(() => {
    if (!needsOpenQtys || isLoadingPOs) return;
    // A failed read leaves the ceiling unknown rather than guessing at it — the
    // server re-checks against SAP regardless.
    if (poError) return;
    const matchingPO = purchaseOrders.find((po) => po.po_number === poForm.poNumber);
    // Not in the open-PO list means nothing is open against it, which is a real
    // answer (and passing null here also stops this effect re-running forever).
    onOpenQtysLoaded(matchingPO ?? null);
  }, [
    needsOpenQtys,
    isLoadingPOs,
    poError,
    purchaseOrders,
    poForm.poNumber,
    onOpenQtysLoaded,
  ]);

  // Check if error is an API error that should show Fill Data button
  const isPOError = Boolean(
    poError &&
    isApiError(poError) &&
    (() => {
      const errorMessage = poError.message?.toLowerCase() || '';
      const errorDetail = poError.response?.data?.detail?.toLowerCase() || '';
      return (
        poError.status === 400 ||
        errorMessage.includes('required') ||
        errorMessage.includes('invalid') ||
        errorDetail.includes('required') ||
        errorDetail.includes('invalid')
      );
    })(),
  );

  // Effective read-only: true if isReadOnly OR (there's a PO error and fillDataMode is false)
  const effectiveReadOnly = isReadOnly || (isPOError && !fillDataMode);
  const isLockedPO = Boolean(isReadOnly && lockReason);

  const handleLockedPointerDownCapture = (event: PointerEvent<HTMLDivElement>) => {
    if (!isLockedPO) return;
    const target = event.target as HTMLElement;
    if (target.closest('input, button, [role="combobox"], [role="button"], select, textarea')) {
      onLockedAttempt();
    }
  };

  // Filter POs based on search
  const filteredPOs = useMemo(() => {
    if (!debouncedPOSearch.trim()) return purchaseOrders;
    const searchLower = debouncedPOSearch.toLowerCase();
    return purchaseOrders.filter(
      (po) =>
        po.po_number.toLowerCase().includes(searchLower) ||
        po.supplier_name.toLowerCase().includes(searchLower),
    );
  }, [purchaseOrders, debouncedPOSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!openPODropdown) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClosePODropdown();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openPODropdown, onClosePODropdown]);

  return (
    <Card onPointerDownCapture={handleLockedPointerDownCapture}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Supplier & Purchase Order
          </CardTitle>
          {canRemove && (
            <Button type="button" variant="outline" size="sm" onClick={onRemove}>
              <Trash2 className="h-4 w-4 mr-2" />
              Remove
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Show locked PO message */}
          {isLockedPO && (
            <div className="rounded-md bg-amber-50 p-4 text-sm text-amber-800 border border-amber-200">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{lockReason}</span>
                </div>
                {/* Wrong PO entered? Allow an audited replace while QC has only a
                    draft inspection (backend enforces the sent-back guard). */}
                {lockReason && /qc/i.test(lockReason) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                    onClick={onReplace}
                  >
                    Replace PO
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Show PO API error with Fill Data button */}
          {isPOError && !fillDataMode && (
            <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>
                    {(() => {
                      if (isApiError(poError)) {
                        const detail = poError.response?.data?.detail;
                        return detail || poError.message || 'Error loading purchase orders';
                      }
                      return 'Error loading purchase orders';
                    })()}
                  </span>
                </div>
                <Button onClick={onFillData} size="sm">
                  Fill Data
                </Button>
              </div>
            </div>
          )}

          {/* Supplier Details */}
          <div className="grid gap-4 md:grid-cols-2">
            <VendorSelect
              label="Supplier"
              required
              value={poForm.supplierCode}
              onChange={onVendorSelect}
              disabled={effectiveReadOnly}
              error={apiErrors[`${poForm.id}_supplierCode`]}
            />

            {/* PO Number */}
            <div className="space-y-2">
              <Label htmlFor={`po-number-${poForm.id}`}>
                PO Number <span className="text-destructive">*</span>
              </Label>
              <div ref={containerRef} className="relative">
                <div className="relative">
                  <Input
                    id={`po-number-${poForm.id}`}
                    placeholder="Click to select PO"
                    value={poForm.poNumber}
                    onFocus={onPOFocus}
                    onChange={(e) => {
                      onPOSearchChange(e.target.value);
                      if (e.target.value) {
                        onPOFocus();
                      }
                    }}
                    disabled={effectiveReadOnly || !poForm.supplierCode}
                    className={cn(
                      'pr-10',
                      apiErrors[`${poForm.id}_poNumber`] && 'border-destructive',
                      (!poForm.supplierCode || effectiveReadOnly) &&
                        'cursor-not-allowed opacity-50',
                    )}
                  />
                  <ChevronDown
                    className={cn(
                      'absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none transition-transform',
                      openPODropdown && 'rotate-180',
                    )}
                  />
                </div>

                {openPODropdown && poForm.supplierCode && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                    {isLoadingPOs ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredPOs.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        {poSearchTerm
                          ? 'No POs found'
                          : 'Enter supplier code and click to load POs'}
                      </div>
                    ) : (
                      <div className="py-1">
                        {filteredPOs.map((po) => (
                          <button
                            key={po.po_number}
                            type="button"
                            className={cn(
                              'w-full text-left px-4 py-2 hover:bg-accent focus:bg-accent focus:outline-none flex items-center justify-between',
                              poForm.poNumber === po.po_number && 'bg-accent',
                            )}
                            onClick={() => onPOSelect(po)}
                          >
                            <div>
                              <div className="font-medium">{po.po_number}</div>
                              <div className="text-sm text-muted-foreground">
                                {po.supplier_name}
                              </div>
                            </div>
                            {poForm.poNumber === po.po_number && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {apiErrors[`${poForm.id}_poNumber`] && (
                <p className="text-sm text-destructive">{apiErrors[`${poForm.id}_poNumber`]}</p>
              )}
              {!poForm.supplierCode && (
                <p className="text-sm text-muted-foreground">
                  Please select a supplier first to load POs
                </p>
              )}
            </div>
          </div>

          {/* Supplier Name (auto-filled from vendor selection) */}
          <div className="space-y-2">
            <Label htmlFor={`supplier-name-${poForm.id}`}>Supplier Name</Label>
            <Input
              id={`supplier-name-${poForm.id}`}
              placeholder="Auto-filled from supplier selection"
              value={poForm.supplierName}
              readOnly
              disabled
              className="bg-muted"
            />
            {apiErrors[`${poForm.id}_supplierName`] && (
              <p className="text-sm text-destructive">{apiErrors[`${poForm.id}_supplierName`]}</p>
            )}
          </div>

          {/* Items Section */}
          {poForm.items.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Items</Label>
                {apiErrors[`${poForm.id}_received`] && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {apiErrors[`${poForm.id}_received`]}
                  </p>
                )}
              </div>
              <div className="rounded-md border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-3 text-left text-sm font-medium">PO Item Code</th>
                        <th className="p-3 text-left text-sm font-medium">Item Name</th>
                        <th className="p-3 text-right text-sm font-medium">Rate</th>
                        <th className="p-3 text-left text-sm font-medium">Ordered Qty</th>
                        <th className="p-3 text-left text-sm font-medium">Received Qty</th>
                        <th className="p-3 text-left text-sm font-medium">Received Now</th>
                        <th className="p-3 text-left text-sm font-medium">Remaining Qty</th>
                        <th className="p-3 text-left text-sm font-medium">Unit of Measurement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {poForm.items.map((item) => (
                        <tr key={item.line_num} className="border-t">
                          <td className="p-3 text-sm">{item.po_item_code}</td>
                          <td className="p-3 text-sm">{item.item_name}</td>
                          <td className="p-3 text-sm text-right">{item.rate > 0 ? item.rate.toFixed(2) : '-'}</td>
                          <td className="p-3 text-sm">{item.ordered_qty}</td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {item.received_qty > 0 ? item.received_qty : '-'}
                          </td>
                          <td className="p-3 text-sm">
                            <Input
                              type="number"
                              step="0.001"
                              min="0"
                              max={
                                overReceiptCeiling(
                                  item.remaining_qty_initial,
                                  poForm.overReceiptEnforced,
                                ) ?? undefined
                              }
                              placeholder="0.000"
                              value={item.received_qty_now || ''}
                              onChange={(e) =>
                                onReceivedQtyChange(item.line_num, e.target.value)
                              }
                              disabled={effectiveReadOnly}
                              className={cn(
                                'w-24',
                                apiErrors[`${poForm.id}_item_${item.line_num}`] &&
                                  'border-destructive',
                                effectiveReadOnly && 'cursor-not-allowed opacity-50',
                              )}
                            />
                            {apiErrors[`${poForm.id}_item_${item.line_num}`] ? (
                              <p className="text-xs text-destructive mt-1">
                                {apiErrors[`${poForm.id}_item_${item.line_num}`]}
                              </p>
                            ) : (
                              (() => {
                                const ceiling = overReceiptCeiling(
                                  item.remaining_qty_initial,
                                  poForm.overReceiptEnforced,
                                );
                                if (ceiling === null) return null;
                                return (
                                  <p className="text-xs text-muted-foreground mt-1 whitespace-nowrap">
                                    {item.remaining_qty_initial} open, max{' '}
                                    {ceiling.toFixed(3)}
                                  </p>
                                );
                              })()
                            )}
                          </td>
                          <td className="p-3 text-sm font-medium">
                            {item.remaining_qty_initial === null ? '—' : item.remaining_qty}
                          </td>
                          <td className="p-3 text-sm">{item.uom}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
