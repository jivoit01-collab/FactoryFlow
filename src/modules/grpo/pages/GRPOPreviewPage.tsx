import { useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  AlertCircle,
  ShieldX,
  RefreshCw,
  CheckCircle2,
  Package,
} from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/shared/components/ui'
import { useGRPOPreview, usePostGRPO } from '../api'
import { WarehouseSelect } from '../components'
import { DEFAULT_BRANCH_ID, GRPO_STATUS } from '../constants'
import { FINAL_STATUS } from '@/config/constants'
import type { PreviewPOReceipt, PostGRPOResponse } from '../types'
import type { ApiError } from '@/core/api/types'

// Per-PO form state
interface POFormState {
  items: Record<number, number> // po_item_receipt_id -> accepted_qty
  warehouseCode: string
  comments: string
}

export default function GRPOPreviewPage() {
  const navigate = useNavigate()
  const { vehicleEntryId } = useParams<{ vehicleEntryId: string }>()
  const entryId = vehicleEntryId ? parseInt(vehicleEntryId, 10) : null

  const { data: previewData = [], isLoading, error, refetch } = useGRPOPreview(entryId)
  const postGRPO = usePostGRPO()

  // Form state per PO (keyed by po_receipt_id)
  const [formStates, setFormStates] = useState<Record<number, POFormState>>({})
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({})
  const [confirmPO, setConfirmPO] = useState<PreviewPOReceipt | null>(null)
  const [successResult, setSuccessResult] = useState<PostGRPOResponse | null>(null)

  const apiError = error as ApiError | null
  const isPermissionError = apiError?.status === 403

  // Get or initialize form state for a PO
  const getFormState = useCallback(
    (po: PreviewPOReceipt): POFormState => {
      if (formStates[po.po_receipt_id]) {
        return formStates[po.po_receipt_id]
      }
      // Initialize with received_qty as default
      const items: Record<number, number> = {}
      po.items.forEach((item) => {
        items[item.po_item_receipt_id] = item.received_qty
      })
      return { items, warehouseCode: '', comments: '' }
    },
    [formStates]
  )

  // Update item quantity
  const updateItemQty = (poReceiptId: number, poItemReceiptId: number, value: string) => {
    const qty = value === '' ? 0 : parseFloat(value)
    setFormStates((prev) => {
      const current = prev[poReceiptId] || { items: {}, warehouseCode: '', comments: '' }
      return {
        ...prev,
        [poReceiptId]: {
          ...current,
          items: { ...current.items, [poItemReceiptId]: isNaN(qty) ? 0 : qty },
        },
      }
    })
    // Clear error for this item
    const errorKey = `item_${poItemReceiptId}`
    if (apiErrors[errorKey]) {
      setApiErrors((prev) => {
        const next = { ...prev }
        delete next[errorKey]
        return next
      })
    }
  }

  // Update warehouse code
  const updateWarehouseCode = (poReceiptId: number, value: string) => {
    setFormStates((prev) => {
      const current = prev[poReceiptId] || { items: {}, warehouseCode: '', comments: '' }
      return { ...prev, [poReceiptId]: { ...current, warehouseCode: value } }
    })
  }

  // Update comments
  const updateComments = (poReceiptId: number, value: string) => {
    setFormStates((prev) => {
      const current = prev[poReceiptId] || { items: {}, warehouseCode: '', comments: '' }
      return { ...prev, [poReceiptId]: { ...current, comments: value } }
    })
  }

  // Validate before posting
  const validatePO = (po: PreviewPOReceipt): boolean => {
    const form = getFormState(po)
    const errors: Record<string, string> = {}

    po.items.forEach((item) => {
      const accepted = form.items[item.po_item_receipt_id] ?? item.received_qty
      if (accepted < 0) {
        errors[`item_${item.po_item_receipt_id}`] = 'Cannot be negative'
      }
      if (accepted > item.received_qty) {
        errors[`item_${item.po_item_receipt_id}`] =
          `Cannot exceed received qty (${item.received_qty})`
      }
    })

    const hasValidQty = po.items.some((item) => {
      const accepted = form.items[item.po_item_receipt_id] ?? item.received_qty
      return accepted > 0
    })
    if (!hasValidQty) {
      errors.general = 'At least one item must have accepted quantity greater than 0'
    }

    setApiErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle post click (show confirmation)
  const handlePostClick = (po: PreviewPOReceipt) => {
    if (validatePO(po)) {
      setConfirmPO(po)
    }
  }

  // Confirm and submit
  const handleConfirmPost = async () => {
    if (!confirmPO || !entryId) return

    const form = getFormState(confirmPO)
    const items = confirmPO.items.map((item) => ({
      po_item_receipt_id: item.po_item_receipt_id,
      accepted_qty: form.items[item.po_item_receipt_id] ?? item.received_qty,
    }))

    try {
      setApiErrors({})
      const result = await postGRPO.mutateAsync({
        vehicle_entry_id: entryId,
        po_receipt_id: confirmPO.po_receipt_id,
        items,
        branch_id: DEFAULT_BRANCH_ID,
        warehouse_code: form.warehouseCode || undefined,
        comments: form.comments || undefined,
      })
      setConfirmPO(null)
      setSuccessResult(result)
    } catch (err) {
      setConfirmPO(null)
      const postError = err as ApiError
      setApiErrors({ general: postError.message || 'Failed to post GRPO' })
    }
  }

  // Get entry number from first PO receipt
  const entryNo = previewData.length > 0 ? previewData[0].entry_no : ''

  return (
    <div className="space-y-6">
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
            <h2 className="text-3xl font-bold tracking-tight">
              {entryNo || 'GRPO Preview'}
            </h2>
          </div>
          <p className="text-muted-foreground">
            Review and post goods receipt for each purchase order
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

      {/* PO Cards */}
      {!isLoading &&
        !error &&
        previewData.map((po) => {
          const isPosted = po.grpo_status === GRPO_STATUS.POSTED
          const form = getFormState(po)

          return (
            <Card
              key={po.po_receipt_id}
              className={isPosted ? 'opacity-60' : ''}
            >
              <CardContent className="p-4 space-y-4">
                {/* PO Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">{po.po_number}</span>
                      {isPosted && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Posted (SAP #{po.sap_doc_num})
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{po.supplier_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Invoice: {po.invoice_no} | Challan: {po.challan_no}
                    </p>
                  </div>
                </div>

                {/* Items */}
                {!isPosted && (
                  <>
                    <div className="border-t pt-4 space-y-3">
                      <h4 className="text-sm font-medium">Items</h4>
                      {po.items.map((item) => {
                        const acceptedQty =
                          form.items[item.po_item_receipt_id] ?? item.received_qty
                        const rejectedQty = Math.max(0, item.received_qty - acceptedQty)
                        const errorKey = `item_${item.po_item_receipt_id}`

                        return (
                          <div
                            key={item.po_item_receipt_id}
                            className="p-3 rounded-md border bg-muted/30 space-y-2"
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
                                    updateItemQty(
                                      po.po_receipt_id,
                                      item.po_item_receipt_id,
                                      e.target.value
                                    )
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
                          </div>
                        )
                      })}
                    </div>

                    {/* PO Form Fields */}
                    <div className="border-t pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <WarehouseSelect
                        label="Warehouse Code"
                        value={form.warehouseCode}
                        onChange={(code) => updateWarehouseCode(po.po_receipt_id, code)}
                        placeholder="Select warehouse"
                      />
                      <div className="space-y-1">
                        <Label className="text-xs">Comments</Label>
                        <Input
                          value={form.comments}
                          onChange={(e) => updateComments(po.po_receipt_id, e.target.value)}
                          placeholder="Optional remarks"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>

                    {/* Post Button */}
                    <div className="border-t pt-4 flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/grpo/pending')}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handlePostClick(po)}
                        disabled={postGRPO.isPending}
                      >
                        {postGRPO.isPending ? 'Posting...' : 'Post GRPO'}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )
        })}

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmPO} onOpenChange={() => setConfirmPO(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm GRPO Posting</DialogTitle>
            <DialogDescription>
              Review the quantities below before posting to SAP.
            </DialogDescription>
          </DialogHeader>
          {confirmPO && (
            <div className="space-y-3">
              <div className="text-sm">
                <span className="text-muted-foreground">PO:</span>{' '}
                <span className="font-medium">{confirmPO.po_number}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Supplier:</span>{' '}
                <span className="font-medium">{confirmPO.supplier_name}</span>
              </div>
              <div className="border-t pt-3 space-y-2">
                {confirmPO.items.map((item) => {
                  const form = getFormState(confirmPO)
                  const accepted = form.items[item.po_item_receipt_id] ?? item.received_qty
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
                  )
                })}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmPO(null)}>
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
            </div>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setSuccessResult(null)
                navigate('/grpo/history')
              }}
            >
              View History
            </Button>
            <Button
              className="w-full"
              onClick={() => {
                setSuccessResult(null)
                refetch()
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
