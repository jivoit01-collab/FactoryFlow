import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Layers,
  Package,
  Paperclip,
  RefreshCw,
  ShieldX,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { FINAL_STATUS } from '@/config/constants';
import type { ApiError } from '@/core/api/types';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@/shared/components/ui';

import { useGRPOPreview, usePostGRPO } from '../api';
import { ExtraChargesSection, WarehouseSelect } from '../components';
import { DEFAULT_BRANCH_ID, GRPO_STATUS } from '../constants';
import type { ExtraCharge, PostGRPOResponse, PreviewPOReceipt } from '../types';

// Per-item form state
interface ItemFormState {
  accepted_qty: number;
  unit_price?: number;
  tax_code?: string;
  gl_account?: string;
  variety?: string;
}

// Merged form state (shared across all selected POs)
interface MergedFormState {
  items: Record<number, ItemFormState>; // keyed by po_item_receipt_id
  warehouseCode: string;
  comments: string;
  vendorRef: string;
  extraCharges: ExtraCharge[];
  attachments: File[];
  docDate: string;
  docDueDate: string;
  taxDate: string;
  shouldRoundoff: boolean;
}

// Group POs by supplier
interface SupplierGroup {
  supplier_code: string;
  supplier_name: string;
  pos: PreviewPOReceipt[];
}

export default function GRPOPreviewPage() {
  const navigate = useNavigate();
  const { vehicleEntryId } = useParams<{ vehicleEntryId: string }>();
  const entryId = vehicleEntryId ? parseInt(vehicleEntryId, 10) : null;

  const { data: previewData = [], isLoading, error, refetch } = useGRPOPreview(entryId);
  const postGRPO = usePostGRPO();

  // Selected PO receipt IDs for merged posting
  const [selectedPOIds, setSelectedPOIds] = useState<Set<number>>(new Set());
  // Merged form state
  const [mergedForm, setMergedForm] = useState<MergedFormState | null>(null);
  // Expanded PO cards (to show/hide item details)
  const [expandedPOs, setExpandedPOs] = useState<Set<number>>(new Set());

  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [successResult, setSuccessResult] = useState<PostGRPOResponse | null>(null);

  const apiError = error as ApiError | null;
  const isPermissionError = apiError?.status === 403;

  // Separate posted and unposted POs
  const unpostedPOs = useMemo(
    () => previewData.filter((po) => po.grpo_status !== GRPO_STATUS.POSTED),
    [previewData],
  );
  const postedPOs = useMemo(
    () => previewData.filter((po) => po.grpo_status === GRPO_STATUS.POSTED),
    [previewData],
  );

  // Group unposted POs by supplier
  const supplierGroups = useMemo((): SupplierGroup[] => {
    const map = new Map<string, SupplierGroup>();
    unpostedPOs.forEach((po) => {
      const key = po.supplier_code;
      if (!map.has(key)) {
        map.set(key, {
          supplier_code: po.supplier_code,
          supplier_name: po.supplier_name,
          pos: [],
        });
      }
      map.get(key)!.pos.push(po);
    });
    return Array.from(map.values());
  }, [unpostedPOs]);

  // Selected POs (resolved from IDs)
  const selectedPOs = useMemo(
    () => unpostedPOs.filter((po) => selectedPOIds.has(po.po_receipt_id)),
    [unpostedPOs, selectedPOIds],
  );

  // Check if all selected POs share the same supplier
  const selectedSupplier = useMemo(() => {
    if (selectedPOs.length === 0) return null;
    const codes = new Set(selectedPOs.map((po) => po.supplier_code));
    if (codes.size > 1) return null; // mixed suppliers
    return {
      supplier_code: selectedPOs[0].supplier_code,
      supplier_name: selectedPOs[0].supplier_name,
    };
  }, [selectedPOs]);

  const hasMixedSuppliers = selectedPOs.length > 1 && !selectedSupplier;

  // Initialize / update merged form when selection changes
  useEffect(() => {
    if (selectedPOs.length === 0) {
      setMergedForm(null);
      return;
    }

    setMergedForm((prev) => {
      // Build items map from all selected POs, keeping existing edits
      const items: Record<number, ItemFormState> = {};
      selectedPOs.forEach((po) => {
        po.items.forEach((item) => {
          items[item.po_item_receipt_id] = prev?.items[item.po_item_receipt_id] || {
            accepted_qty: item.received_qty,
            unit_price: item.unit_price ? parseFloat(item.unit_price) : undefined,
            tax_code: item.tax_code || undefined,
            gl_account: item.gl_account || undefined,
            variety: item.variety || undefined,
          };
        });
      });

      // Use first PO for default values if no previous form
      const firstPO = selectedPOs[0];
      const entryDate = firstPO.entry_date ? firstPO.entry_date.slice(0, 10) : '';

      return {
        items,
        warehouseCode: prev?.warehouseCode ?? firstPO.items[0]?.warehouse_code ?? '',
        comments: prev?.comments ?? '',
        vendorRef: prev?.vendorRef ?? firstPO.vendor_ref ?? '',
        extraCharges: prev?.extraCharges ?? [],
        attachments: prev?.attachments ?? [],
        docDate: prev?.docDate ?? entryDate,
        docDueDate: prev?.docDueDate ?? entryDate,
        taxDate: prev?.taxDate ?? entryDate,
        shouldRoundoff: prev?.shouldRoundoff ?? true,
      };
    });
  }, [selectedPOs]);

  // Toggle PO selection
  const togglePOSelection = (poReceiptId: number) => {
    setSelectedPOIds((prev) => {
      const next = new Set(prev);
      if (next.has(poReceiptId)) {
        next.delete(poReceiptId);
      } else {
        next.add(poReceiptId);
      }
      return next;
    });
    setApiErrors({});
  };

  // Select all POs in a supplier group
  const selectAllInGroup = (group: SupplierGroup) => {
    setSelectedPOIds((prev) => {
      const next = new Set(prev);
      const allSelected = group.pos.every((po) => next.has(po.po_receipt_id));
      if (allSelected) {
        // Deselect all in group
        group.pos.forEach((po) => next.delete(po.po_receipt_id));
      } else {
        // Select all in group (and deselect POs from other suppliers)
        // Clear any POs from different suppliers
        const otherSupplierIds = unpostedPOs
          .filter((po) => po.supplier_code !== group.supplier_code)
          .map((po) => po.po_receipt_id);
        otherSupplierIds.forEach((id) => next.delete(id));
        group.pos.forEach((po) => next.add(po.po_receipt_id));
      }
      return next;
    });
    setApiErrors({});
  };

  // Toggle expand/collapse PO card
  const toggleExpanded = (poReceiptId: number) => {
    setExpandedPOs((prev) => {
      const next = new Set(prev);
      if (next.has(poReceiptId)) {
        next.delete(poReceiptId);
      } else {
        next.add(poReceiptId);
      }
      return next;
    });
  };

  // --- Merged form update helpers ---
  const updateItemQty = (poItemReceiptId: number, value: string) => {
    const qty = value === '' ? 0 : parseFloat(value);
    setMergedForm((prev) => {
      if (!prev) return prev;
      const currentItem = prev.items[poItemReceiptId] || { accepted_qty: 0 };
      return {
        ...prev,
        items: {
          ...prev.items,
          [poItemReceiptId]: { ...currentItem, accepted_qty: isNaN(qty) ? 0 : qty },
        },
      };
    });
    const errorKey = `item_${poItemReceiptId}`;
    if (apiErrors[errorKey]) {
      setApiErrors((prev) => {
        const next = { ...prev };
        delete next[errorKey];
        return next;
      });
    }
  };

  const updateItemField = (
    poItemReceiptId: number,
    field: keyof ItemFormState,
    value: string | number | undefined,
  ) => {
    setMergedForm((prev) => {
      if (!prev) return prev;
      const currentItem = prev.items[poItemReceiptId] || { accepted_qty: 0 };
      return {
        ...prev,
        items: {
          ...prev.items,
          [poItemReceiptId]: { ...currentItem, [field]: value },
        },
      };
    });
  };

  const updateFormField = useCallback(
    <K extends keyof MergedFormState>(field: K, value: MergedFormState[K]) => {
      setMergedForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    },
    [],
  );

  const addAttachments = (files: FileList) => {
    setMergedForm((prev) => {
      if (!prev) return prev;
      return { ...prev, attachments: [...prev.attachments, ...Array.from(files)] };
    });
    if (apiErrors.attachments) {
      setApiErrors((prev) => {
        const next = { ...prev };
        delete next.attachments;
        return next;
      });
    }
  };

  const removeAttachment = (index: number) => {
    setMergedForm((prev) => {
      if (!prev) return prev;
      return { ...prev, attachments: prev.attachments.filter((_, i) => i !== index) };
    });
  };

  // Extract GST percentage from tax code (e.g. "CG+SG@18" → 18)
  const parseTaxPercent = (taxCode?: string | null): number => {
    if (!taxCode) return 0;
    const match = taxCode.match(/@(\d+(?:\.\d+)?)$/);
    return match ? parseFloat(match[1]) : 0;
  };

  // Calculate estimated total across all selected POs
  const calcMergedTotal = useCallback((): number => {
    if (!mergedForm) return 0;
    const itemsTotal = selectedPOs.reduce((sum, po) => {
      return (
        sum +
        po.items.reduce((poSum, item) => {
          const itemForm = mergedForm.items[item.po_item_receipt_id];
          const qty = itemForm?.accepted_qty ?? item.received_qty;
          const price =
            itemForm?.unit_price ?? (item.unit_price ? parseFloat(item.unit_price) : 0);
          const lineTotal = qty * price;
          const taxPercent = parseTaxPercent(itemForm?.tax_code ?? item.tax_code);
          return poSum + lineTotal + (lineTotal * taxPercent) / 100;
        }, 0)
      );
    }, 0);
    const chargesTotal = mergedForm.extraCharges.reduce((sum, c) => {
      const amount = c.amount || 0;
      const taxPercent = parseTaxPercent(c.tax_code);
      return sum + amount + (amount * taxPercent) / 100;
    }, 0);
    return itemsTotal + chargesTotal;
  }, [mergedForm, selectedPOs]);

  // Validate before posting
  const validateMergedPost = (): boolean => {
    if (!mergedForm || selectedPOs.length === 0) return false;
    const errors: Record<string, string> = {};

    if (hasMixedSuppliers) {
      errors.general = 'All selected POs must belong to the same supplier';
      setApiErrors(errors);
      return false;
    }

    // Validate items
    selectedPOs.forEach((po) => {
      po.items.forEach((item) => {
        const itemForm = mergedForm.items[item.po_item_receipt_id];
        const accepted = itemForm?.accepted_qty ?? item.received_qty;
        if (accepted < 0) {
          errors[`item_${item.po_item_receipt_id}`] = 'Cannot be negative';
        }
        if (accepted > item.received_qty) {
          errors[`item_${item.po_item_receipt_id}`] =
            `Cannot exceed received qty (${item.received_qty})`;
        }
      });
    });

    const hasValidQty = selectedPOs.some((po) =>
      po.items.some((item) => {
        const itemForm = mergedForm.items[item.po_item_receipt_id];
        return (itemForm?.accepted_qty ?? item.received_qty) > 0;
      }),
    );
    if (!hasValidQty) {
      errors.general = 'At least one item must have accepted quantity greater than 0';
    }

    if (!mergedForm.vendorRef.trim()) {
      errors.vendorRef = 'Vendor reference is required';
    }

    if (mergedForm.attachments.length === 0) {
      errors.attachments = 'At least one attachment is required';
    }

    setApiErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle post click
  const handlePostClick = () => {
    if (validateMergedPost()) {
      setShowConfirm(true);
    }
  };

  // Confirm and submit
  const handleConfirmPost = async () => {
    if (!mergedForm || !entryId || selectedPOs.length === 0) return;

    const items = selectedPOs.flatMap((po) =>
      po.items.map((item) => {
        const itemForm = mergedForm.items[item.po_item_receipt_id];
        return {
          po_item_receipt_id: item.po_item_receipt_id,
          accepted_qty: itemForm?.accepted_qty ?? item.received_qty,
          unit_price: itemForm?.unit_price,
          tax_code: itemForm?.tax_code || undefined,
          gl_account: itemForm?.gl_account || undefined,
          variety: itemForm?.variety || undefined,
        };
      }),
    );

    try {
      setApiErrors({});
      const result = await postGRPO.mutateAsync({
        vehicle_entry_id: entryId,
        po_receipt_ids: selectedPOs.map((po) => po.po_receipt_id),
        items,
        branch_id: selectedPOs[0].branch_id || DEFAULT_BRANCH_ID,
        warehouse_code: mergedForm.warehouseCode || undefined,
        comments: mergedForm.comments || undefined,
        vendor_ref: mergedForm.vendorRef || undefined,
        extra_charges: mergedForm.extraCharges.length > 0 ? mergedForm.extraCharges : undefined,
        attachments: mergedForm.attachments.length > 0 ? mergedForm.attachments : undefined,
        doc_date: mergedForm.docDate || undefined,
        doc_due_date: mergedForm.docDueDate || undefined,
        tax_date: mergedForm.taxDate || undefined,
        should_roundoff: mergedForm.shouldRoundoff || undefined,
      });
      setShowConfirm(false);
      setSuccessResult(result);
      setSelectedPOIds(new Set());
      setMergedForm(null);
    } catch (err) {
      setShowConfirm(false);
      const postError = err as ApiError;
      setApiErrors({ general: postError.message || 'Failed to post GRPO' });
    }
  };

  // Get entry number from first PO receipt
  const entryNo = previewData.length > 0 ? previewData[0].entry_no : '';

  return (
    <div className="space-y-6 pb-32">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => navigate('/grpo/pending')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-3xl font-bold tracking-tight">{entryNo || 'GRPO Preview'}</h2>
          </div>
          <p className="text-muted-foreground">
            Select one or more POs from the same supplier to post as a single merged GRPO
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="w-full sm:w-auto">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Permission Error */}
      {isPermissionError && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/5">
          <ShieldX className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-destructive">Permission Denied</p>
            <p className="text-sm text-muted-foreground mt-1">
              {apiError?.message || 'You do not have permission to preview GRPO data.'}
            </p>
          </div>
        </div>
      )}

      {/* General Error */}
      {error && !isPermissionError && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/10">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-yellow-800 dark:text-yellow-400">Failed to Load</p>
            <p className="text-sm text-muted-foreground mt-1">
              {apiError?.message || 'An error occurred while loading preview data.'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* General form error */}
      {apiErrors.general && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/5">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{apiErrors.general}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-48">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && previewData.length === 0 && (
        <div className="flex items-center justify-center h-24 text-sm text-muted-foreground border rounded-lg">
          No purchase orders found for this entry.
        </div>
      )}

      {/* Selection Summary Bar */}
      {selectedPOs.length > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-primary/5 border-primary/20">
          <Layers className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="text-sm font-medium flex-1">
            {selectedPOs.length} PO{selectedPOs.length > 1 ? 's' : ''} selected
            {selectedPOs.length > 1 && selectedSupplier && ' for merged GRPO'}
            {selectedSupplier && (
              <span className="text-muted-foreground font-normal">
                {' '}
                &mdash; {selectedSupplier.supplier_name}
              </span>
            )}
          </span>
          {hasMixedSuppliers && (
            <span className="text-xs text-destructive font-medium">
              Cannot merge POs from different suppliers
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              setSelectedPOIds(new Set());
              setMergedForm(null);
            }}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Unposted POs grouped by supplier */}
      {!isLoading &&
        !error &&
        supplierGroups.map((group) => {
          const allInGroupSelected = group.pos.every((po) => selectedPOIds.has(po.po_receipt_id));
          const someInGroupSelected = group.pos.some((po) => selectedPOIds.has(po.po_receipt_id));

          return (
            <div key={group.supplier_code} className="space-y-2">
              {/* Supplier Group Header */}
              <div className="flex items-center gap-3 px-1">
                <Checkbox
                  checked={allInGroupSelected}
                  className={someInGroupSelected && !allInGroupSelected ? 'opacity-50' : ''}
                  onCheckedChange={() => selectAllInGroup(group)}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold">{group.supplier_name}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({group.supplier_code})
                  </span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {group.pos.length} PO{group.pos.length > 1 ? 's' : ''}
                </Badge>
              </div>

              {/* PO Cards in this group */}
              {group.pos.map((po) => {
                const isSelected = selectedPOIds.has(po.po_receipt_id);
                const isExpanded = expandedPOs.has(po.po_receipt_id);

                return (
                  <Card
                    key={po.po_receipt_id}
                    className={`transition-colors ${isSelected ? 'border-primary/50 bg-primary/5' : ''}`}
                  >
                    <CardContent className="p-4 space-y-3">
                      {/* PO Header with checkbox */}
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => togglePOSelection(po.po_receipt_id)}
                          className="mt-1"
                        />
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => toggleExpanded(po.po_receipt_id)}
                        >
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold text-sm">{po.po_number}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {po.items.length} item{po.items.length > 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Invoice: {po.invoice_no || '-'} | Challan: {po.challan_no || '-'}
                            {po.branch_id != null && ` | Branch: ${po.branch_id}`}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => toggleExpanded(po.po_receipt_id)}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      {/* Item summary (always visible) */}
                      {!isExpanded && (
                        <div className="flex flex-wrap gap-2 ml-8">
                          {po.items.map((item) => (
                            <span
                              key={item.po_item_receipt_id}
                              className="text-xs px-2 py-1 bg-muted rounded-md"
                            >
                              {item.item_code}: {item.received_qty} {item.uom}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Expanded item details */}
                      {isExpanded && (
                        <div className="ml-8 space-y-2">
                          {po.items.map((item) => (
                            <div
                              key={item.po_item_receipt_id}
                              className="flex items-center justify-between p-2 rounded-md border bg-muted/30 text-sm"
                            >
                              <div>
                                <p className="font-medium">
                                  {item.item_code} - {item.item_name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Ordered: {item.ordered_qty} | Received: {item.received_qty}{' '}
                                  {item.uom}
                                  {item.unit_price && ` | Price: ${item.unit_price}`}
                                </p>
                              </div>
                              <span
                                className={`text-[10px] rounded-full px-1.5 py-0.5 font-medium ${
                                  item.qc_status === FINAL_STATUS.ACCEPTED
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                    : item.qc_status === FINAL_STATUS.REJECTED
                                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                                }`}
                              >
                                {item.qc_status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          );
        })}

      {/* Posted POs */}
      {postedPOs.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground px-1">Already Posted</h3>
          {postedPOs.map((po) => (
            <Card key={po.po_receipt_id} className="opacity-60">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold text-sm">{po.po_number}</span>
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Posted (SAP #{po.sap_doc_num})
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{po.supplier_name}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ============ MERGED FORM PANEL ============ */}
      {mergedForm && selectedPOs.length > 0 && !hasMixedSuppliers && (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">
                {selectedPOs.length > 1 ? 'Merged GRPO' : 'GRPO'} &mdash;{' '}
                {selectedSupplier?.supplier_name}
              </h3>
              <Badge variant="secondary" className="text-xs">
                {selectedPOs.length} PO{selectedPOs.length > 1 ? 's' : ''}
              </Badge>
            </div>

            {/* Items from all selected POs */}
            <div className="space-y-4">
              {selectedPOs.map((po) => (
                <div key={po.po_receipt_id} className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Package className="h-3.5 w-3.5" />
                    {po.po_number}
                  </h4>
                  {po.items.map((item) => {
                    const itemForm = mergedForm.items[item.po_item_receipt_id] || {
                      accepted_qty: item.received_qty,
                    };
                    const acceptedQty = itemForm.accepted_qty;
                    const rejectedQty = Math.max(0, item.received_qty - acceptedQty);
                    const errorKey = `item_${item.po_item_receipt_id}`;

                    return (
                      <div
                        key={item.po_item_receipt_id}
                        className="p-3 rounded-md border bg-muted/30 space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium">
                              {item.item_code} - {item.item_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Received: {item.received_qty} {item.uom}
                            </p>
                          </div>
                          <span
                            className={`text-[10px] rounded-full px-1.5 py-0.5 font-medium ${
                              item.qc_status === FINAL_STATUS.ACCEPTED
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : item.qc_status === FINAL_STATUS.REJECTED
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                            }`}
                          >
                            {item.qc_status}
                          </span>
                        </div>

                        {/* Quantity Row */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Accepted Qty</Label>
                            <Input
                              type="number"
                              min={0}
                              max={item.received_qty}
                              step="any"
                              value={acceptedQty}
                              onChange={(e) =>
                                updateItemQty(item.po_item_receipt_id, e.target.value)
                              }
                              className="h-8 text-sm"
                            />
                            {apiErrors[errorKey] && (
                              <p className="text-xs text-destructive">{apiErrors[errorKey]}</p>
                            )}
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Rejected Qty</Label>
                            <Input
                              type="number"
                              value={rejectedQty.toFixed(3)}
                              readOnly
                              disabled
                              className="h-8 text-sm bg-muted"
                            />
                          </div>
                        </div>

                        {/* Item Detail Fields */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          <div className="space-y-1">
                            <Label className="text-xs">Unit Price</Label>
                            <Input
                              type="number"
                              min={0}
                              step="any"
                              value={itemForm.unit_price ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateItemField(
                                  item.po_item_receipt_id,
                                  'unit_price',
                                  val === '' ? undefined : parseFloat(val) || 0,
                                );
                              }}
                              placeholder="0.00"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Tax Code</Label>
                            <Input
                              value={itemForm.tax_code ?? ''}
                              onChange={(e) =>
                                updateItemField(
                                  item.po_item_receipt_id,
                                  'tax_code',
                                  e.target.value || undefined,
                                )
                              }
                              placeholder="e.g. GST18"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">G/L Account</Label>
                            <Input
                              value={itemForm.gl_account ?? ''}
                              onChange={(e) =>
                                updateItemField(
                                  item.po_item_receipt_id,
                                  'gl_account',
                                  e.target.value || undefined,
                                )
                              }
                              placeholder="Account code"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Variety</Label>
                            <Input
                              value={itemForm.variety ?? ''}
                              onChange={(e) =>
                                updateItemField(
                                  item.po_item_receipt_id,
                                  'variety',
                                  e.target.value || undefined,
                                )
                              }
                              placeholder="e.g. TMT-500D"
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Shared Form Fields */}
            <div className="border-t pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">
                  Vendor Reference <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={mergedForm.vendorRef}
                  onChange={(e) => {
                    updateFormField('vendorRef', e.target.value);
                    if (apiErrors.vendorRef) {
                      setApiErrors((prev) => {
                        const next = { ...prev };
                        delete next.vendorRef;
                        return next;
                      });
                    }
                  }}
                  placeholder="Invoice / challan number"
                  className={`h-8 text-sm${apiErrors.vendorRef ? ' border-destructive' : ''}`}
                />
                {apiErrors.vendorRef && (
                  <p className="text-xs text-destructive">{apiErrors.vendorRef}</p>
                )}
              </div>
              <WarehouseSelect
                label="Warehouse Code"
                value={mergedForm.warehouseCode}
                onChange={(code) => updateFormField('warehouseCode', code)}
                placeholder="Select warehouse"
              />
              <div className="space-y-1">
                <Label className="text-xs">Posting Date</Label>
                <Input
                  type="date"
                  value={mergedForm.docDate}
                  onChange={(e) => updateFormField('docDate', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Due Date</Label>
                <Input
                  type="date"
                  value={mergedForm.docDueDate}
                  onChange={(e) => updateFormField('docDueDate', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tax Date</Label>
                <Input
                  type="date"
                  value={mergedForm.taxDate}
                  onChange={(e) => updateFormField('taxDate', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Comments</Label>
                <Input
                  value={mergedForm.comments}
                  onChange={(e) => updateFormField('comments', e.target.value)}
                  placeholder="Optional remarks"
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* Extra Charges */}
            <div className="border-t pt-4">
              <ExtraChargesSection
                charges={mergedForm.extraCharges}
                onChange={(charges) => updateFormField('extraCharges', charges)}
              />
            </div>

            {/* Attachments */}
            <div className="border-t pt-4 space-y-2">
              <Label className="text-sm font-medium">
                Attachments <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.multiple = true;
                    input.accept = '.pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx';
                    input.onchange = (e) => {
                      const files = (e.target as HTMLInputElement).files;
                      if (files && files.length > 0) {
                        addAttachments(files);
                      }
                    };
                    input.click();
                  }}
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  Choose Files
                </Button>
                <span className="text-xs text-muted-foreground">
                  PDF, PNG, JPG, DOC, XLS accepted
                </span>
              </div>
              {mergedForm.attachments.length > 0 && (
                <div className="space-y-1">
                  {mergedForm.attachments.map((file, idx) => (
                    <div
                      key={`${file.name}-${idx}`}
                      className="flex items-center gap-2 text-sm p-1.5 rounded bg-muted/40 border"
                    >
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="truncate flex-1">{file.name}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {(file.size / 1024).toFixed(0)} KB
                      </span>
                      <button
                        type="button"
                        className="p-0.5 hover:bg-muted rounded"
                        onClick={() => removeAttachment(idx)}
                      >
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {apiErrors.attachments && (
                <p className="text-xs text-destructive">{apiErrors.attachments}</p>
              )}
            </div>

            {/* Total Amount + Round Off */}
            {(() => {
              const total = calcMergedTotal();
              if (total === 0) return null;
              return (
                <div className="border-t pt-4 flex items-center justify-between">
                  <span className="text-sm font-medium">Estimated Total</span>
                  <div className="flex items-center gap-2">
                    <input
                      id="roundoff-merged"
                      type="checkbox"
                      checked={mergedForm.shouldRoundoff}
                      onChange={(e) => updateFormField('shouldRoundoff', e.target.checked)}
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                    <Label htmlFor="roundoff-merged" className="text-sm cursor-pointer">
                      Auto Round Off
                    </Label>
                    <span className="text-sm font-semibold">
                      {total.toLocaleString('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                      })}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Post Button */}
            <div className="border-t pt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedPOIds(new Set());
                  setMergedForm(null);
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handlePostClick} disabled={postGRPO.isPending}>
                {postGRPO.isPending
                  ? 'Posting...'
                  : selectedPOs.length > 1
                    ? `Post Merged GRPO (${selectedPOs.length} POs)`
                    : 'Post GRPO'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={() => setShowConfirm(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedPOs.length > 1 ? 'Confirm Merged GRPO Posting' : 'Confirm GRPO Posting'}
            </DialogTitle>
            <DialogDescription>
              {selectedPOs.length > 1
                ? `You are about to post a merged GRPO combining ${selectedPOs.length} POs into a single SAP document.`
                : 'Review the details below before posting to SAP.'}
            </DialogDescription>
          </DialogHeader>
          {mergedForm && (
            <div className="space-y-3">
              <div className="text-sm">
                <span className="text-muted-foreground">PO{selectedPOs.length > 1 ? 's' : ''}:</span>{' '}
                <span className="font-medium">
                  {selectedPOs.map((po) => po.po_number).join(', ')}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Supplier:</span>{' '}
                <span className="font-medium">{selectedSupplier?.supplier_name}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Branch ID:</span>{' '}
                <span className="font-medium">
                  {selectedPOs[0]?.branch_id || DEFAULT_BRANCH_ID}
                </span>
              </div>
              {mergedForm.vendorRef && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Vendor Ref:</span>{' '}
                  <span className="font-medium">{mergedForm.vendorRef}</span>
                </div>
              )}
              {mergedForm.warehouseCode && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Warehouse:</span>{' '}
                  <span className="font-medium">{mergedForm.warehouseCode}</span>
                </div>
              )}
              {mergedForm.docDate && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Posting Date:</span>{' '}
                  <span className="font-medium">{mergedForm.docDate}</span>
                </div>
              )}
              {mergedForm.shouldRoundoff && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Round Off:</span>{' '}
                  <span className="font-medium">Auto (backend calculated)</span>
                </div>
              )}

              {/* Items summary */}
              <div className="border-t pt-3 space-y-2">
                {selectedPOs.map((po) => (
                  <div key={po.po_receipt_id}>
                    {selectedPOs.length > 1 && (
                      <p className="text-xs text-muted-foreground font-medium mb-1">
                        {po.po_number}
                      </p>
                    )}
                    {po.items.map((item) => {
                      const itemForm = mergedForm.items[item.po_item_receipt_id];
                      const accepted = itemForm?.accepted_qty ?? item.received_qty;
                      return (
                        <div
                          key={item.po_item_receipt_id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-muted-foreground">{item.item_name}</span>
                          <span className="font-medium">
                            {accepted} {item.uom}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="text-sm">
                <span className="text-muted-foreground">Attachments:</span>{' '}
                <span className="font-medium">{mergedForm.attachments.length} file(s)</span>
              </div>

              {mergedForm.extraCharges.length > 0 && (
                <div className="border-t pt-3 text-sm">
                  <span className="text-muted-foreground">Extra Charges:</span>{' '}
                  <span className="font-medium">
                    {mergedForm.extraCharges.length} charge(s), total{' '}
                    {mergedForm.extraCharges
                      .reduce((sum, c) => sum + (c.amount || 0), 0)
                      .toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                  </span>
                </div>
              )}

              {(() => {
                const total = calcMergedTotal();
                if (total === 0) return null;
                return (
                  <div className="border-t pt-3 flex items-center justify-between">
                    <span className="text-sm font-semibold">Estimated Total</span>
                    <span className="text-sm font-semibold">
                      {total.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                    </span>
                  </div>
                );
              })()}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPost} disabled={postGRPO.isPending}>
              {postGRPO.isPending ? 'Posting...' : 'Confirm Post'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={!!successResult} onOpenChange={() => setSuccessResult(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Success
            </DialogTitle>
            <DialogDescription>GRPO posted successfully to SAP.</DialogDescription>
          </DialogHeader>
          {successResult && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">SAP Document Number</span>
                <span className="font-semibold">{successResult.sap_doc_num}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Value</span>
                <span className="font-semibold">
                  {successResult.sap_doc_total?.toLocaleString('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                  })}
                </span>
              </div>
              {successResult.attachments &&
                successResult.attachments.length > 0 &&
                (() => {
                  const linked = successResult.attachments.filter(
                    (a) => a.sap_attachment_status === 'LINKED',
                  );
                  const failed = successResult.attachments.filter(
                    (a) => a.sap_attachment_status === 'FAILED',
                  );
                  return (
                    <div className="border-t pt-2 space-y-1.5">
                      {linked.length > 0 && (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>{linked.length} attachment(s) uploaded successfully</span>
                        </div>
                      )}
                      {failed.length > 0 && (
                        <div className="flex items-center gap-2 text-yellow-600">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span>
                            {failed.length} attachment(s) failed to upload to SAP. Files saved
                            locally — retry from detail page.
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
            </div>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setSuccessResult(null);
                navigate('/grpo/history');
              }}
            >
              View History
            </Button>
            <Button
              className="w-full"
              onClick={() => {
                setSuccessResult(null);
                refetch();
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
