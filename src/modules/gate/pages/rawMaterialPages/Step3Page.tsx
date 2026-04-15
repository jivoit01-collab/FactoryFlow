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
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { RecordTimestamps } from '@/shared/components';
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
import { useDebounce } from '@/shared/hooks';
import { cn } from '@/shared/utils';
import {
  getErrorMessage,
  getServerErrorMessage,
  isApiError,
  isNotFoundError as checkNotFoundError,
  isServerError as checkServerError,
} from '@/shared/utils';

import type { PurchaseOrder, Vendor } from '../../api/po/po.api';
import { useOpenPOs } from '../../api/po/po.queries';
import { useCreatePOReceipt, usePOReceipts } from '../../api/po/poReceipt.queries';
import { FillDataAlert, StepFooter, StepHeader, StepLoadingSpinner, VendorSelect } from '../../components';
import { WIZARD_CONFIG } from '../../constants';
import { useEntryId, useEntryStepTracker } from '../../hooks';

interface POItemFormData {
  line_num: number; // SAP PO LineNum (POR1.LineNum) — unique identifier for this row
  po_item_code: string;
  item_name: string;
  ordered_qty: number;
  received_qty: number; // Previously received from other gate entries
  received_qty_now: number; // What user is entering now
  remaining_qty_initial: number; // Initial remaining from PO (ordered - previously received)
  remaining_qty: number; // Auto-calculated: remaining_qty_initial - received_qty_now
  uom: string;
  rate: number;
}

interface POFormData {
  id: string; // Unique ID for this PO form
  supplierName: string;
  supplierCode: string;
  poNumber: string;
  items: POItemFormData[];
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
  } = usePOReceipts(isEditMode && entryIdNumber ? entryIdNumber : null);

  // State to track if we should behave like create mode (when Fill Data is clicked)
  const [fillDataMode, setFillDataMode] = useState(false);
  // State to track if Update button has been clicked (enables editing)
  const [updateMode, _setUpdateMode] = useState(false);
  // State to keep button disabled after API success until navigation completes
  const [isNavigating, setIsNavigating] = useState(false);
  const effectiveEditMode = isEditMode && !fillDataMode;

  // State for multiple PO forms - start with one empty form
  // Note: We use baseId with initial counter of 1 for stable initial ID
  const [poForms, setPoForms] = useState<POFormData[]>([
    {
      id: 'po-initial-1',
      supplierName: '',
      supplierCode: '',
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

  const handleSupplierNameChange = (poFormId: string, value: string) => {
    if (effectiveEditMode && !updateMode) return;
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
    if (effectiveEditMode && !fillDataModeForPO[poFormId] && !updateMode) return;
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
    if (effectiveEditMode && !fillDataModeForPO[poFormId] && !updateMode) return;
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
    if (effectiveEditMode && !fillDataModeForPO[poFormId] && !updateMode) return;
    const form = poForms.find((f) => f.id === poFormId);
    if (form?.supplierCode) {
      setOpenPODropdown(poFormId);
    }
  };

  const handlePOSelect = (poFormId: string, po: PurchaseOrder) => {
    if (effectiveEditMode && !fillDataModeForPO[poFormId] && !updateMode) return;

    setPoForms((prev) =>
      prev.map((form) => {
        if (form.id === poFormId) {
          return {
            ...form,
            poNumber: po.po_number,
            supplierName: po.supplier_name,
            supplierCode: po.supplier_code,
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

  const handleReceivedQtyChange = (poFormId: string, lineNum: number, value: string) => {
    if (effectiveEditMode && !fillDataModeForPO[poFormId] && !updateMode) return;

    const receivedQtyNow = parseFloat(value) || 0;
    setPoForms((prev) =>
      prev.map((form) => {
        if (form.id === poFormId) {
          return {
            ...form,
            items: form.items.map((item) => {
              if (item.line_num === lineNum) {
                // Calculate remaining: remaining_qty_initial - received_qty_now
                const newRemainingQty = Math.max(0, item.remaining_qty_initial - receivedQtyNow);
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
    // Don't allow adding in edit mode unless fillDataMode is active or any PO has fill data mode
    const hasAnyFillDataMode = Object.values(fillDataModeForPO).some((mode) => mode === true);
    if (effectiveEditMode && !fillDataMode && !hasAnyFillDataMode) return;

    // Generate unique ID using counter
    poFormCounterRef.current += 1;
    const newId = `${baseId}-po-${poFormCounterRef.current}`;

    setPoForms((prev) => [
      ...prev,
      {
        id: newId,
        supplierName: '',
        supplierCode: '',
        poNumber: '',
        items: [],
      },
    ]);

    // Clear any errors when adding new PO
    setApiErrors({});
  };

  const handleRemovePO = (poFormId: string) => {
    // Don't allow removing in edit mode unless fillDataMode is active or this PO has fill data mode
    const hasAnyFillDataMode = Object.values(fillDataModeForPO).some((mode) => mode === true);
    const thisPOFillDataMode = fillDataModeForPO[poFormId] || false;

    if (
      effectiveEditMode &&
      !fillDataMode &&
      !hasAnyFillDataMode &&
      !thisPOFillDataMode &&
      !updateMode
    )
      return;
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
              supplierName: '',
              supplierCode: '',
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
    if (effectiveEditMode && existingPOReceipts.length > 0) {
      const forms: POFormData[] = existingPOReceipts.map((receipt, index) => ({
        id: `po-${receipt.po_number}-${index}`,
        supplierName: receipt.supplier_name,
        supplierCode: receipt.supplier_code,
        poNumber: receipt.po_number,
        items: receipt.items.map((item) => {
          // In edit mode, we need to reconstruct the data
          // The received_qty in the receipt is what was received in this entry
          // We'd need to fetch the PO to get the initial remaining_qty
          // For now, we'll use a placeholder
          const orderedQty = item.ordered_qty;
          const receivedQtyNow = item.received_qty;
          return {
            line_num: item.sap_line_num,
            po_item_code: item.po_item_code,
            item_name: item.item_name,
            ordered_qty: orderedQty,
            received_qty: 0, // Previously received - would need to fetch from PO
            received_qty_now: receivedQtyNow, // What was received in this entry
            remaining_qty_initial: orderedQty, // Placeholder - would need PO data
            remaining_qty: orderedQty - receivedQtyNow,
            uom: item.uom,
            rate: 0,
          };
        }),
      }));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing form state with fetched data is a valid pattern
      setPoForms(forms);
    }
  }, [effectiveEditMode, existingPOReceipts]);

  const handlePrevious = () => {
    if (isEditMode && entryId) {
      navigate(`/gate/raw-materials/edit/${entryId}/step2`);
    } else {
      navigate(`/gate/raw-materials/new/step2?entryId=${entryId}`);
    }
  };

  const handleCancel = () => {
    queryClient.invalidateQueries({ queryKey: ['vehicleEntries'] });
    navigate('/gate/raw-materials');
  };

  const createPOReceipt = useCreatePOReceipt(entryIdNumber || 0);

  const handleNext = async () => {
    if (!entryId) {
      setApiErrors({ general: 'Entry ID is missing. Please go back to step 1.' });
      return;
    }

    // In edit mode (and not fill data mode and not update mode), just navigate without API call
    if (effectiveEditMode && !updateMode) {
      navigate(`/gate/raw-materials/edit/${entryId}/step4`);
      return;
    }

    // Validation
    for (const form of poForms) {
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
      // Check that received quantity does not exceed remaining PO quantity + 10% tolerance
      const overReceivedItems = form.items.filter(
        (item) => item.received_qty_now > (item.ordered_qty * 1.1 - item.received_qty),
      );
      if (overReceivedItems.length > 0) {
        const itemErrors: Record<string, string> = {};
        overReceivedItems.forEach((item) => {
          const maxAllowed = (item.ordered_qty * 1.1 - item.received_qty).toFixed(3);
          itemErrors[`${form.id}_item_${item.line_num}`] =
            `Cannot exceed ${maxAllowed} ${item.uom} (remaining + 10% tolerance)`;
        });
        setApiErrors(itemErrors);
        return;
      }
    }

    setApiErrors({});

    try {
      // Submit all PO receipts
      for (const poForm of poForms) {
        await createPOReceipt.mutateAsync({
          po_number: poForm.poNumber,
          supplier_code: poForm.supplierCode,
          supplier_name: poForm.supplierName,
          items: poForm.items
            .filter((item) => item.received_qty_now > 0)
            .map((item) => ({
              line_num: item.line_num,
              po_item_code: item.po_item_code,
              item_name: item.item_name,
              ordered_qty: item.ordered_qty,
              received_qty: item.received_qty_now, // Send the new received quantity
              uom: item.uom,
            })),
        });
      }

      // Navigate to step 4
      setIsNavigating(true);
      if (isEditMode) {
        navigate(`/gate/raw-materials/edit/${entryId}/step4`);
      } else {
        navigate(`/gate/raw-materials/new/step4?entryId=${entryId}`);
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

  // Fields are read-only when in edit mode and there's an error and fill data mode is not active
  // OR when data exists and updateMode is not active
  const isReadOnly =
    (effectiveEditMode && hasPOReceiptsData && !updateMode && !fillDataMode) ||
    (effectiveEditMode && hasNoPOReceiptsData && !fillDataMode);
  // PO receipts are immutable once submitted — no update allowed

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
            isReadOnly={isReadOnly}
            fillDataMode={fillDataModeForPO[poForm.id] || false}
            onSupplierNameChange={(value) => handleSupplierNameChange(poForm.id, value)}
            onSupplierCodeChange={(value) => handleSupplierCodeChange(poForm.id, value)}
            onVendorSelect={(vendor) => handleVendorSelect(poForm.id, vendor)}
            onPOFocus={() => handlePOFocus(poForm.id)}
            onPOSelect={(po) => handlePOSelect(poForm.id, po)}
            onReceivedQtyChange={(lineNum, value) =>
              handleReceivedQtyChange(poForm.id, lineNum, value)
            }
            onRemove={() => handleRemovePO(poForm.id)}
            canRemove={poForms.length > 1}
            apiErrors={apiErrors}
            openPODropdown={openPODropdown === poForm.id}
            onClosePODropdown={() => setOpenPODropdown(null)}
            poSearchTerm={poSearchTerms[poForm.id] || ''}
            onPOSearchChange={(value) =>
              setPOSearchTerms((prev) => ({ ...prev, [poForm.id]: value }))
            }
            onFillData={() => handleFillDataForPO(poForm.id)}
          />
        ))}

        {/* Add New PO Button */}
        {(() => {
          // Show button if:
          // 1. Not in edit mode (create mode)
          // 2. Page-level fill data mode is active
          // 3. Any PO form has fill data mode enabled
          const hasAnyFillDataMode = Object.values(fillDataModeForPO).some((mode) => mode === true);
          return !effectiveEditMode || fillDataMode || hasAnyFillDataMode;
        })() && (
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
        isSaving={createPOReceipt.isPending || isNavigating}
        isEditMode={effectiveEditMode}
        isUpdateMode={updateMode}
        nextLabel={
          effectiveEditMode && !updateMode && !fillDataMode
            ? 'Next →'
            : undefined
        }
      />
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
  onRemove: () => void;
  canRemove: boolean;
  apiErrors: Record<string, string>;
  openPODropdown: boolean;
  onClosePODropdown: () => void;
  poSearchTerm: string;
  onPOSearchChange: (value: string) => void;
  onFillData: () => void;
}

function POCard({
  poForm,
  isReadOnly,
  fillDataMode,
  onSupplierNameChange: _onSupplierNameChange,
  onSupplierCodeChange: _onSupplierCodeChange,
  onVendorSelect,
  onPOFocus,
  onPOSelect,
  onReceivedQtyChange,
  onRemove,
  canRemove,
  apiErrors,
  openPODropdown,
  onClosePODropdown,
  poSearchTerm,
  onPOSearchChange,
  onFillData,
}: POCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedPOSearch = useDebounce(poSearchTerm, 100);

  // Fetch POs only when dropdown is opened and supplier code exists
  const shouldFetchPOs = openPODropdown && !!poForm.supplierCode;
  const {
    data: purchaseOrders = [],
    isLoading: isLoadingPOs,
    error: poError,
  } = useOpenPOs(poForm.supplierCode || undefined, shouldFetchPOs);

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
  // Also check updateMode from parent
  const effectiveReadOnly = isReadOnly || (isPOError && !fillDataMode);

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
    <Card>
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
                              max={item.ordered_qty * 1.1 - item.received_qty}
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
                            {apiErrors[`${poForm.id}_item_${item.line_num}`] && (
                              <p className="text-xs text-destructive mt-1">
                                {apiErrors[`${poForm.id}_item_${item.line_num}`]}
                              </p>
                            )}
                          </td>
                          <td className="p-3 text-sm font-medium">{item.remaining_qty}</td>
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
